import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  auth as firebaseAuth,
  functions as firebaseFunctions,
} from "../../firebase-config";
import {
  assertFulfillmentUnchanged,
  FulfillmentConflictError,
  fulfillmentFor,
  fulfillmentHasChanges,
  fulfillmentStatuses,
  MAX_FULFILLMENT_NOTES_LENGTH,
  ordersToCsv,
  validatedFulfillmentDraft,
} from "./ordersAdminModel";

const defaultFilters = {
  fulfillmentStatus: "all",
  paymentStatus: "all",
  search: "",
  source: "all",
};

const toDate = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value) => {
  const date = toDate(value);

  if (!date) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatCurrency = (value, currency = "USD") => {
  const amount = Number(value);
  const safeCurrency = /^[A-Z]{3}$/.test(String(currency || "")) ? currency : "USD";

  if (!Number.isFinite(amount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    currency: safeCurrency,
    style: "currency",
  }).format(amount);
};

const normalizeCustomer = (customer = {}) => ({
  email: String(customer.email || ""),
  name: String(customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || ""),
  phone: String(customer.phone || ""),
});

const normalizeTotals = (totals = {}) => ({
  currency: String(totals.currency || "USD").toUpperCase(),
  discount: Number(totals.discount || 0),
  shipping: Number(totals.shipping || 0),
  subtotal: Number(totals.subtotal || 0),
  tax: Number(totals.tax || 0),
  total: Number(totals.total || 0),
});

const normalizeItems = (items) => (
  Array.isArray(items) ? items : []
).map((item, index) => ({
  capacityGroupKey: String(item.capacityGroupKey || ""),
  linkedId: String(item.linkedId || ""),
  lineItemId: String(item.lineItemId || `item-${index + 1}`),
  quantity: Number(item.quantity || 0),
  seatCount: Number(item.seatCount || 0),
  sku: String(item.sku || ""),
  title: String(item.title || "Untitled item"),
  total: Number(item.total || 0),
  type: String(item.type || "unknown"),
  unitPrice: Number(item.unitPrice || 0),
  variantId: String(item.variantId || ""),
}));

const normalizeOrder = (snapshot) => {
  const data = snapshot.data();
  const customer = normalizeCustomer(data.customer);
  const totals = normalizeTotals(data.totals);
  const items = normalizeItems(data.items);

  return {
    id: snapshot.id,
    createdAt: data.createdAt || null,
    customer,
    fulfillmentNotes: String(data.fulfillmentNotes || ""),
    fulfillmentRevision: Number.isInteger(data.fulfillmentRevision) ? data.fulfillmentRevision : 0,
    fulfillmentStatus: String(data.fulfillmentStatus || "new"),
    fulfillmentUpdatedAt: data.fulfillmentUpdatedAt || null,
    fulfillmentUpdatedBy: String(data.fulfillmentUpdatedBy || ""),
    items,
    paidAt: data.paidAt || null,
    paymentStatus: String(data.paymentStatus || data.status || "unknown"),
    rawSource: data.rawSource || null,
    shipping: data.shipping || {},
    source: String(data.source || "unknown"),
    sourceOrderId: String(data.sourceOrderId || ""),
    sourcePaymentId: String(data.sourcePaymentId || ""),
    status: String(data.status || "unknown"),
    totals,
  };
};

const labelFor = (value) => String(value || "unknown")
  .replace(/[._]/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const uniqueValues = (orders, field) => Array.from(new Set(orders
  .map((order) => order[field])
  .filter(Boolean)))
  .sort((first, second) => first.localeCompare(second));

const sortOrdersByCreatedAt = (orders) => [...orders].sort((firstOrder, secondOrder) => {
  const firstDate = toDate(firstOrder.createdAt)?.getTime() || 0;
  const secondDate = toDate(secondOrder.createdAt)?.getTime() || 0;

  return secondDate - firstDate;
});

const recoveryStatuses = new Set([
  "capture_pending",
  "capture_unknown",
  "captured_pending_finalize",
  "needs_review",
]);

const normalizeCheckoutRecovery = (snapshot) => {
  const data = snapshot.data() || {};
  const recovery = data.recovery || {};

  return {
    canCheckStatus: Boolean(data.sourceOrderId),
    id: snapshot.id,
    kind: "checkout",
    reason: String(recovery.reason || "Payment status needs confirmation."),
    required: recovery.required === true || recoveryStatuses.has(data.status),
    reviewKey: `checkout:${String(data.sourceOrderId || snapshot.id)}`,
    sourceOrderId: String(data.sourceOrderId || ""),
    status: String(data.status || "unknown"),
    updatedAt: data.updatedAt || data.createdAt || null,
  };
};

const normalizeWebhookRecovery = (snapshot) => {
  const data = snapshot.data() || {};
  const eventType = String(data.eventType || "paypal_webhook");
  const sourceOrderId = String(data.sourceOrderId || "");
  const canCheckStatus = [
    "PAYMENT.CAPTURE.COMPLETED",
    "PAYMENT.CAPTURE.DECLINED",
    "PAYMENT.CAPTURE.PENDING",
  ].includes(eventType) && Boolean(sourceOrderId);

  return {
    canCheckStatus,
    id: snapshot.id,
    kind: "webhook",
    reason: String(data.reviewReason || "A verified PayPal event needs manual review."),
    required: data.processingState === "review" && data.reviewRequired === true,
    reviewKey: String(data.reviewKey || `${eventType}:${data.resourceId || snapshot.id}`),
    sourceOrderId,
    status: eventType,
    updatedAt: data.updatedAt || data.processedAt || data.receivedAt || null,
  };
};

const sortRecoveries = (recoveries) => [...recoveries].sort((first, second) => (
  (toDate(second.updatedAt)?.getTime() || 0) - (toDate(first.updatedAt)?.getTime() || 0)
));

const dedupeRecoveries = (recoveries) => {
  const byReviewKey = new Map();

  sortRecoveries(recoveries).forEach((recovery) => {
    if (!byReviewKey.has(recovery.reviewKey)) {
      byReviewKey.set(recovery.reviewKey, recovery);
    }
  });

  return Array.from(byReviewKey.values());
};

const draftHasUnsavedChanges = (draft) => Boolean(
  draft?.baseline
  && (
    draft.notes !== draft.baseline.notes
    || draft.status !== draft.baseline.status
  )
);

export default function OrdersAdmin({ db }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState([]);
  const [fulfillmentDrafts, setFulfillmentDrafts] = useState({});
  const [reconcilingOrderId, setReconcilingOrderId] = useState("");
  const [recoveries, setRecoveries] = useState([]);
  const [savingOrderId, setSavingOrderId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const serverCheckoutEnabled = process.env.REACT_APP_PAYPAL_SERVER_CHECKOUT === "enabled";
  const webhookReviewEnabled = process.env.REACT_APP_PAYPAL_WEBHOOK_REVIEW === "enabled";

  const loadOrders = useCallback(async ({ resetDraftIds = [] } = {}) => {
    setIsLoading(true);
    setMessage("");

    try {
      const snapshot = await getDocs(collection(db, "orders"));
      const nextOrders = sortOrdersByCreatedAt(snapshot.docs.map(normalizeOrder));
      const finalizedSourceOrderIds = new Set(nextOrders
        .map((order) => order.sourceOrderId)
        .filter(Boolean));
      let nextRecoveries = [];

      if (serverCheckoutEnabled || webhookReviewEnabled) {
        try {
          const [checkoutSnapshot, webhookSnapshot] = await Promise.all([
            serverCheckoutEnabled
              ? getDocs(collection(db, "paypalCheckouts"))
              : Promise.resolve({ docs: [] }),
            webhookReviewEnabled
              ? getDocs(query(
                collection(db, "paypalWebhookEvents"),
                where("reviewRequired", "==", true),
              ))
              : Promise.resolve({ docs: [] }),
          ]);
          const checkoutRecoveries = checkoutSnapshot.docs
            .map(normalizeCheckoutRecovery)
            .filter((checkout) => checkout.required);
          const checkoutRecoveryOrderIds = new Set(checkoutRecoveries
            .map((checkout) => checkout.sourceOrderId)
            .filter(Boolean));
          const webhookRecoveries = webhookSnapshot.docs
            .map(normalizeWebhookRecovery)
            .filter((webhook) => (
              webhook.required
              && !(
                webhook.canCheckStatus
                && (
                  checkoutRecoveryOrderIds.has(webhook.sourceOrderId)
                  || finalizedSourceOrderIds.has(webhook.sourceOrderId)
                )
              )
            ))
            .map((webhook) => ({
              ...webhook,
              canCheckStatus: serverCheckoutEnabled && webhook.canCheckStatus,
            }));
          nextRecoveries = dedupeRecoveries([
            ...checkoutRecoveries,
            ...webhookRecoveries,
          ]);
        } catch (error) {
          setMessage("Orders loaded, but payment review records could not be loaded.");
        }
      }

      setOrders(nextOrders);
      setFulfillmentDrafts((currentDrafts) => {
        const resetIds = new Set(resetDraftIds);

        return Object.fromEntries(nextOrders.map((order) => {
          const fulfillment = fulfillmentFor(order);
          const savedDraft = {
            baseline: fulfillment,
            notes: fulfillment.notes,
            status: fulfillment.status,
          };
          const currentDraft = currentDrafts[order.id];
          const currentMatchesSaved = currentDraft
            && currentDraft.notes === fulfillment.notes
            && currentDraft.status === fulfillment.status;

          if (
            currentDraft
            && draftHasUnsavedChanges(currentDraft)
            && !currentMatchesSaved
            && !resetIds.has(order.id)
          ) {
            return [order.id, currentDraft];
          }

          return [order.id, savedDraft];
        }));
      });
      setRecoveries(nextRecoveries);
      setSelectedOrderId((currentSelectedOrderId) => (
        nextOrders.some((order) => order.id === currentSelectedOrderId)
          ? currentSelectedOrderId
          : nextOrders[0]?.id || ""
      ));
      return true;
    } catch (error) {
      setMessage("Orders could not be loaded.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [db, serverCheckoutEnabled, webhookReviewEnabled]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateFilter = (field, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const reconcileOrder = async (sourceOrderId) => {
    if (!firebaseFunctions || !sourceOrderId) {
      setMessage("Payment status checking is not configured.");
      return;
    }

    setReconcilingOrderId(sourceOrderId);
    setMessage("");

    try {
      const reconcilePayPalOrder = httpsCallable(firebaseFunctions, "reconcilePayPalOrder");
      const result = await reconcilePayPalOrder({ orderID: sourceOrderId });
      const status = result.data?.status;
      let resultMessage;

      if (status === "paid") {
        resultMessage = "Payment confirmed and order finalized.";
      } else if (status === "not_paid") {
        resultMessage = "PayPal confirms this order was not paid.";
      } else {
        resultMessage = "Payment still needs review. No second payment should be requested.";
      }

      const refreshed = await loadOrders();
      setMessage(refreshed
        ? resultMessage
        : `${resultMessage} Orders could not be refreshed; use Refresh before continuing.`);
    } catch (error) {
      setMessage("Payment status could not be confirmed. Keep this order under review.");
    } finally {
      setReconcilingOrderId("");
    }
  };

  const filteredOrders = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return orders.filter((order) => {
      const searchableText = [
        order.id,
        order.sourceOrderId,
        order.sourcePaymentId,
        order.customer.name,
        order.customer.email,
        ...order.items.map((item) => [item.title, item.linkedId, item.variantId, item.sku].join(" ")),
      ].join(" ").toLowerCase();
      const matchesSearch = !search || searchableText.includes(search);
      const matchesSource = filters.source === "all" || order.source === filters.source;
      const matchesPayment = filters.paymentStatus === "all" || order.paymentStatus === filters.paymentStatus;
      const matchesFulfillment = filters.fulfillmentStatus === "all" || order.fulfillmentStatus === filters.fulfillmentStatus;

      return matchesSearch && matchesSource && matchesPayment && matchesFulfillment;
    });
  }, [filters, orders]);

  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId)
    || filteredOrders[0]
    || null;
  const sourceOptions = uniqueValues(orders, "source");
  const paymentStatusOptions = uniqueValues(orders, "paymentStatus");
  const fulfillmentStatusOptions = uniqueValues(orders, "fulfillmentStatus");
  const selectedFulfillmentDraft = selectedOrder
    ? fulfillmentDrafts[selectedOrder.id] || (() => {
      const fulfillment = fulfillmentFor(selectedOrder);
      return { baseline: fulfillment, notes: fulfillment.notes, status: fulfillment.status };
    })()
    : null;
  let selectedFulfillmentChanged = false;
  let selectedFulfillmentValid = false;

  if (selectedOrder && selectedFulfillmentDraft) {
    try {
      selectedFulfillmentChanged = fulfillmentHasChanges(selectedOrder, selectedFulfillmentDraft);
      validatedFulfillmentDraft(selectedFulfillmentDraft);
      selectedFulfillmentValid = true;
    } catch (error) {
      selectedFulfillmentValid = false;
    }
  }

  const updateFulfillmentDraft = (field, value) => {
    if (!selectedOrder) {
      return;
    }

    setFulfillmentDrafts((currentDrafts) => {
      const fulfillment = fulfillmentFor(selectedOrder);
      const current = currentDrafts[selectedOrder.id] || {
        baseline: fulfillment,
        notes: fulfillment.notes,
        status: fulfillment.status,
      };

      return {
        ...currentDrafts,
        [selectedOrder.id]: { ...current, [field]: value },
      };
    });
  };

  const resetFulfillmentDraft = () => {
    if (!selectedOrder) {
      return;
    }

    const fulfillment = fulfillmentFor(selectedOrder);
    setFulfillmentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [selectedOrder.id]: {
        baseline: fulfillment,
        notes: fulfillment.notes,
        status: fulfillment.status,
      },
    }));
  };

  const saveFulfillment = async () => {
    if (!selectedOrder || !selectedFulfillmentDraft) {
      return;
    }

    const adminUid = firebaseAuth?.currentUser?.uid || "";

    if (!adminUid) {
      setMessage("Your admin session is no longer available. Sign in again before saving.");
      return;
    }

    let nextFulfillment;

    try {
      nextFulfillment = validatedFulfillmentDraft(selectedFulfillmentDraft);
    } catch (error) {
      setMessage(error.message);
      return;
    }

    setSavingOrderId(selectedOrder.id);
    setMessage("");

    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "orders", selectedOrder.id);
        const currentSnapshot = await transaction.get(orderRef);

        if (!currentSnapshot.exists()) {
          throw new Error("This order no longer exists.");
        }

        assertFulfillmentUnchanged({
          baseline: selectedFulfillmentDraft.baseline,
          current: currentSnapshot.data(),
        });
        transaction.update(orderRef, {
          fulfillmentNotes: nextFulfillment.notes,
          fulfillmentRevision: selectedFulfillmentDraft.baseline.revision + 1,
          fulfillmentStatus: nextFulfillment.status,
          fulfillmentUpdatedAt: serverTimestamp(),
          fulfillmentUpdatedBy: adminUid,
        });
      });

      const refreshed = await loadOrders({ resetDraftIds: [selectedOrder.id] });
      setMessage(refreshed
        ? "Fulfillment changes saved."
        : "Fulfillment changes saved, but orders could not be refreshed. Use Refresh before editing again.");
    } catch (error) {
      if (error instanceof FulfillmentConflictError || error.name === "FulfillmentConflictError") {
        const refreshed = await loadOrders({ resetDraftIds: [selectedOrder.id] });
        setMessage(refreshed
          ? "Fulfillment changed elsewhere. The latest saved values are now shown; review them before editing again."
          : "Fulfillment changed elsewhere, but the latest values could not be loaded. Use Refresh before editing again.");
      } else {
        setMessage(error.message || "Fulfillment changes could not be saved.");
      }
    } finally {
      setSavingOrderId("");
    }
  };

  const downloadFilteredOrders = () => {
    if (!filteredOrders.length) {
      return;
    }

    const csv = ordersToCsv(filteredOrders);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `calabash-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`${filteredOrders.length} order${filteredOrders.length === 1 ? "" : "s"} exported.`);
  };

  return (
    <section className="admin_panel admin_full_width">
      <div className="admin_button_row admin_orders_actions">
        <button
          className="admin_secondary_button"
          disabled={!filteredOrders.length || isLoading}
          onClick={downloadFilteredOrders}
          title="Download the filtered orders as CSV"
          type="button"
        >
          <FontAwesomeIcon icon={faDownload} /> Export CSV
        </button>
        <button
          className="admin_secondary_button"
          disabled={isLoading}
          onClick={() => loadOrders()}
          type="button"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="admin_filter_grid admin_orders_filters">
        <label>
          Search
          <input
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Customer, order ID, product, SKU"
            value={filters.search}
          />
        </label>
        <label>
          Source
          <select onChange={(event) => updateFilter("source", event.target.value)} value={filters.source}>
            <option value="all">All Sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>{labelFor(source)}</option>
            ))}
          </select>
        </label>
        <label>
          Payment
          <select onChange={(event) => updateFilter("paymentStatus", event.target.value)} value={filters.paymentStatus}>
            <option value="all">All Payment Statuses</option>
            {paymentStatusOptions.map((status) => (
              <option key={status} value={status}>{labelFor(status)}</option>
            ))}
          </select>
        </label>
        <label>
          Fulfillment
          <select onChange={(event) => updateFilter("fulfillmentStatus", event.target.value)} value={filters.fulfillmentStatus}>
            <option value="all">All Fulfillment Statuses</option>
            {fulfillmentStatusOptions.map((status) => (
              <option key={status} value={status}>{labelFor(status)}</option>
            ))}
          </select>
        </label>
      </div>

      {message ? <p className="admin_message">{message}</p> : null}
      {isLoading ? <p className="admin_status">Loading orders...</p> : null}

      {recoveries.length ? (
        <section className="admin_payment_review" aria-labelledby="payment-review-title">
          <h4 id="payment-review-title">Payment Review</h4>
          <div className="admin_payment_review_list">
            {recoveries.map((recovery) => (
              <div className="admin_payment_review_row" key={`${recovery.kind}:${recovery.id}`}>
                <span>
                  <strong>{recovery.sourceOrderId || recovery.id}</strong>
                  <small>{labelFor(recovery.status)} / {formatDateTime(recovery.updatedAt)}</small>
                  <small>{recovery.reason}</small>
                </span>
                {recovery.canCheckStatus ? (
                  <button
                    className="admin_secondary_button"
                    disabled={reconcilingOrderId === recovery.sourceOrderId}
                    onClick={() => reconcileOrder(recovery.sourceOrderId)}
                    type="button"
                  >
                    {reconcilingOrderId === recovery.sourceOrderId ? "Checking..." : "Check Status"}
                  </button>
                ) : <small>Manual review only</small>}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className="admin_status">{filteredOrders.length} of {orders.length} orders shown.</p>

      {orders.length ? (
        <div className="admin_orders_layout">
          <div className="admin_orders_list" aria-label="Orders">
            {filteredOrders.map((order) => (
              <button
                className={selectedOrder?.id === order.id ? "admin_order_row admin_order_row_selected" : "admin_order_row"}
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                type="button"
              >
                <span>
                  <strong>{order.customer.name || order.customer.email || "Unknown customer"}</strong>
                  <small>{formatDateTime(order.createdAt)}</small>
                </span>
                <span>
                  <strong>{formatCurrency(order.totals.total, order.totals.currency)}</strong>
                  <small>{labelFor(order.source)} / {labelFor(order.paymentStatus)}</small>
                </span>
              </button>
            ))}
          </div>

          {selectedOrder ? (
            <article className="admin_order_detail">
              <header className="admin_order_detail_header">
                <div>
                  <h4>{selectedOrder.customer.name || "Unknown customer"}</h4>
                  <p>{selectedOrder.customer.email || "No email on order"}</p>
                </div>
                <div className="admin_order_badges" aria-label="Order status">
                  <span>{labelFor(selectedOrder.source)}</span>
                  <span>{labelFor(selectedOrder.paymentStatus)}</span>
                  <span>{labelFor(selectedOrder.fulfillmentStatus)}</span>
                </div>
              </header>

              <dl className="admin_order_meta">
                <div>
                  <dt>Order ID</dt>
                  <dd>{selectedOrder.id}</dd>
                </div>
                <div>
                  <dt>Source Order</dt>
                  <dd>{selectedOrder.sourceOrderId || "Not saved yet"}</dd>
                </div>
                <div>
                  <dt>Paid</dt>
                  <dd>{selectedOrder.paidAt ? formatDateTime(selectedOrder.paidAt) : "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{selectedOrder.customer.phone || "None"}</dd>
                </div>
              </dl>

              <section className="admin_order_block admin_order_fulfillment">
                <h5>Fulfillment</h5>
                <div className="admin_order_fulfillment_fields">
                  <label>
                    Status
                    <select
                      disabled={savingOrderId === selectedOrder.id}
                      onChange={(event) => updateFulfillmentDraft("status", event.target.value)}
                      value={selectedFulfillmentDraft?.status || "new"}
                    >
                      {fulfillmentStatuses.map((status) => (
                        <option key={status} value={status}>{labelFor(status)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Internal notes
                    <textarea
                      disabled={savingOrderId === selectedOrder.id}
                      maxLength={MAX_FULFILLMENT_NOTES_LENGTH}
                      onChange={(event) => updateFulfillmentDraft("notes", event.target.value)}
                      placeholder="Packing, pickup, or shipping notes"
                      rows="4"
                      value={selectedFulfillmentDraft?.notes || ""}
                    />
                  </label>
                </div>
                <div className="admin_order_fulfillment_footer">
                  <small>
                    {(selectedFulfillmentDraft?.notes || "").length} / {MAX_FULFILLMENT_NOTES_LENGTH}
                  </small>
                  <div className="admin_button_row">
                    <button
                      className="admin_secondary_button"
                      disabled={!selectedFulfillmentChanged || savingOrderId === selectedOrder.id}
                      onClick={resetFulfillmentDraft}
                      type="button"
                    >
                      Reset
                    </button>
                    <button
                      className="admin_primary_button"
                      disabled={
                        !selectedFulfillmentChanged
                        || !selectedFulfillmentValid
                        || savingOrderId === selectedOrder.id
                      }
                      onClick={saveFulfillment}
                      type="button"
                    >
                      {savingOrderId === selectedOrder.id ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
                {selectedOrder.fulfillmentUpdatedAt ? (
                  <small className="admin_help_text">
                    Last updated {formatDateTime(selectedOrder.fulfillmentUpdatedAt)}
                  </small>
                ) : null}
              </section>

              <section className="admin_order_block">
                <h5>Items</h5>
                <div className="admin_order_items">
                  {selectedOrder.items.length ? selectedOrder.items.map((item) => (
                    <div className="admin_order_item" key={item.lineItemId}>
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {labelFor(item.type)}
                          {item.linkedId ? ` / ${item.linkedId}` : ""}
                          {item.variantId ? ` / ${item.variantId}` : ""}
                          {item.sku ? ` / ${item.sku}` : ""}
                        </small>
                      </span>
                      <span>
                        <strong>{formatCurrency(item.total, selectedOrder.totals.currency)}</strong>
                        <small>Qty {item.quantity || 0}{item.seatCount ? ` / Seats ${item.seatCount}` : ""}</small>
                      </span>
                    </div>
                  )) : <p className="admin_status">No line items saved on this order.</p>}
                </div>
              </section>

              <section className="admin_order_block">
                <h5>Totals</h5>
                <dl className="admin_order_totals">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{formatCurrency(selectedOrder.totals.subtotal, selectedOrder.totals.currency)}</dd>
                  </div>
                  <div>
                    <dt>Shipping</dt>
                    <dd>{formatCurrency(selectedOrder.totals.shipping, selectedOrder.totals.currency)}</dd>
                  </div>
                  <div>
                    <dt>Tax</dt>
                    <dd>{formatCurrency(selectedOrder.totals.tax, selectedOrder.totals.currency)}</dd>
                  </div>
                  <div>
                    <dt>Discount</dt>
                    <dd>{formatCurrency(selectedOrder.totals.discount, selectedOrder.totals.currency)}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{formatCurrency(selectedOrder.totals.total, selectedOrder.totals.currency)}</dd>
                  </div>
                </dl>
              </section>
            </article>
          ) : null}
        </div>
      ) : (
        <p className="admin_status">
          No orders have been saved yet. This is expected until server-side PayPal capture or manual/Square import writes order records.
        </p>
      )}
    </section>
  );
}
