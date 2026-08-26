import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  InventoryConflictError,
  mergeEventInventoryDraft,
  mergeProductInventoryDrafts,
  variantsForProduct,
} from "./inventoryAdminModel";

const defaultFilters = {
  search: "",
  status: "all",
  type: "all",
};

const text = (value, fallback = "") => String(value || fallback).trim();

const numberOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const statusLabel = (value) => String(value || "unknown")
  .replace(/_/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const productVariantRows = (snapshot) => snapshot.docs.flatMap((docSnapshot) => {
  const product = docSnapshot.data();
  const productId = docSnapshot.id;
  const variantRows = variantsForProduct(product);

  return variantRows.map((variant, index) => {
    const stockOnHand = numberOrNull(variant.stockOnHand) || 0;
    const lowStockThreshold = numberOrNull(variant.lowStockThreshold);
    const inventoryTracked = variant.inventoryTracked !== false;
    const variantActive = variant.active !== false;
    const visible = product.isActive !== false && product.published !== false;
    const lowStock = inventoryTracked
      && lowStockThreshold !== null
      && stockOnHand <= lowStockThreshold;
    const status = !visible || !variantActive
      ? "inactive"
      : !inventoryTracked
        ? "untracked"
        : stockOnHand <= 0
          ? "out"
          : lowStock
            ? "low"
            : "available";

    return {
      category: text(product.category),
      id: `product-${productId}-${variant.priceOptionIndex}-${text(variant.id, index)}`,
      inventoryTracked,
      lowStockThreshold,
      priceOptionIndex: variant.priceOptionIndex,
      primary: text(product.title, productId),
      productId,
      secondary: text(variant.label || variant.id || `Option ${index + 1}`),
      sku: text(variant.sku),
      status,
      stockOnHand,
      type: "product",
      value: inventoryTracked ? `${stockOnHand} on hand` : "Not tracked",
      variantId: text(variant.id),
    };
  });
});

const eventRows = (snapshot) => snapshot.docs.map((docSnapshot) => {
  const event = docSnapshot.data();
  const eventId = docSnapshot.id;
  const capacity = numberOrNull(event.capacity);
  const ticketsSold = numberOrNull(event.ticketsSold) || 0;
  const manualSeatsReserved = numberOrNull(event.manualSeatsReserved) || 0;
  const visible = event.isActive !== false && event.published !== false;
  const remainingSeats = capacity === null
    ? null
    : Math.max(0, capacity - ticketsSold - manualSeatsReserved);
  const status = !visible
    ? "inactive"
    : capacity === null
      ? "untracked"
      : remainingSeats <= 0
        ? "out"
        : "available";

  return {
    capacity,
    id: `event-${eventId}`,
    manualSeatsReserved,
    primary: text(event.title, eventId),
    productId: eventId,
    remainingSeats,
    secondary: Array.isArray(event.eventDates) ? event.eventDates.join(", ") : "",
    status,
    ticketsSold,
    type: "event",
    value: capacity === null ? "Capacity not set" : `${remainingSeats} of ${capacity} available`,
    waitlistEnabled: event.waitlistEnabled === true,
  };
});

const draftForRow = (row) => (row.type === "product" ? {
  inventoryTracked: row.inventoryTracked === true,
  lowStockThreshold: row.lowStockThreshold === null ? "" : String(row.lowStockThreshold),
  stockOnHand: String(row.stockOnHand),
} : {
  capacity: row.capacity === null ? "" : String(row.capacity),
  manualSeatsReserved: String(row.manualSeatsReserved || 0),
  waitlistEnabled: row.waitlistEnabled === true,
});

const draftRowsFor = (rows) => rows.reduce((drafts, row) => ({
  ...drafts,
  [row.id]: draftForRow(row),
}), {});

const wholeNumber = (value) => /^\d+$/.test(String(value).trim());

const productDraftChanged = (row, draft) => (
  draft
  && (
    String(row.stockOnHand) !== String(draft.stockOnHand)
    || String(row.lowStockThreshold === null ? "" : row.lowStockThreshold) !== String(draft.lowStockThreshold)
    || row.inventoryTracked !== draft.inventoryTracked
  )
);

const eventDraftChanged = (row, draft) => (
  draft
  && (
    String(row.capacity === null ? "" : row.capacity) !== String(draft.capacity)
    || String(row.manualSeatsReserved || 0) !== String(draft.manualSeatsReserved)
    || row.waitlistEnabled !== draft.waitlistEnabled
  )
);

const rowDraftChanged = (row, draft) => (
  row.type === "product"
    ? productDraftChanged(row, draft)
    : eventDraftChanged(row, draft)
);

export default function InventoryAdmin({ db }) {
  const [draftRows, setDraftRows] = useState({});
  const [filters, setFilters] = useState(defaultFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState([]);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const [productsSnapshot, eventsSnapshot] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "events")),
      ]);

      const nextRows = [
        ...productVariantRows(productsSnapshot),
        ...eventRows(eventsSnapshot),
      ].sort((first, second) => (
        first.type.localeCompare(second.type)
        || first.primary.localeCompare(second.primary)
        || first.secondary.localeCompare(second.secondary)
      ));

      setRows(nextRows);
      setDraftRows(draftRowsFor(nextRows));
    } catch (error) {
      setRows([]);
      setDraftRows({});
      setMessage("Inventory could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return rows.filter((row) => {
      const searchableText = [
        row.primary,
        row.secondary,
        row.productId,
        row.sku,
        row.category,
      ].join(" ").toLowerCase();

      return (!search || searchableText.includes(search))
        && (filters.type === "all" || row.type === filters.type)
        && (filters.status === "all" || row.status === filters.status);
    });
  }, [filters, rows]);

  const dirtyRows = useMemo(() => (
    rows.filter((row) => rowDraftChanged(row, draftRows[row.id]))
  ), [draftRows, rows]);
  const dirtyCount = dirtyRows.length;

  const updateFilter = (field, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const updateDraft = (rowId, field, value) => {
    setMessage("");
    setDraftRows((currentDraftRows) => ({
      ...currentDraftRows,
      [rowId]: {
        ...(currentDraftRows[rowId] || {}),
        [field]: value,
      },
    }));
  };

  const discardChanges = () => {
    setDraftRows(draftRowsFor(rows));
    setMessage("");
  };

  const validateDirtyRows = () => {
    for (const row of dirtyRows) {
      const draft = draftRows[row.id] || {};

      if (row.type === "product") {
        if (!wholeNumber(draft.stockOnHand)) {
          return "Every changed product stock value must be a whole number.";
        }

        if (draft.lowStockThreshold !== "" && !wholeNumber(draft.lowStockThreshold)) {
          return "Every changed low-stock threshold must be blank or a whole number.";
        }
      } else {
        if (!wholeNumber(draft.capacity)) {
          return "Every changed event capacity must be a whole number.";
        }

        if (!wholeNumber(draft.manualSeatsReserved)) {
          return "Every changed event hold value must be a whole number.";
        }

        if (row.ticketsSold + Number(draft.manualSeatsReserved) > Number(draft.capacity)) {
          return "Event capacity cannot be lower than sold tickets plus manual holds.";
        }
      }
    }

    return "";
  };

  const saveInventoryChanges = async () => {
    if (!dirtyRows.length) {
      setMessage("No inventory changes to save.");
      return;
    }

    const validationMessage = validateDirtyRows();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const changedProductRows = dirtyRows.filter((row) => row.type === "product");
      const changedEventRows = dirtyRows.filter((row) => row.type === "event");
      const productRowsById = changedProductRows.reduce((rowsById, row) => {
        rowsById.set(row.productId, [...(rowsById.get(row.productId) || []), row]);
        return rowsById;
      }, new Map());
      const productRefs = new Map(Array.from(productRowsById.keys()).map((productId) => [
        productId,
        doc(db, "products", productId),
      ]));
      const eventRefs = new Map(changedEventRows.map((row) => [
        row.productId,
        doc(db, "events", row.productId),
      ]));
      const movementRefs = new Map(dirtyRows.map((row) => [
        row.id,
        doc(collection(db, "inventoryMovements")),
      ]));

      await runTransaction(db, async (transaction) => {
        const productSnapshots = await Promise.all(Array.from(productRefs.entries())
          .map(async ([productId, productRef]) => [productId, await transaction.get(productRef)]));
        const eventSnapshots = await Promise.all(Array.from(eventRefs.entries())
          .map(async ([eventId, eventRef]) => [eventId, await transaction.get(eventRef)]));
        const productSnapshotsById = new Map(productSnapshots);
        const eventSnapshotsById = new Map(eventSnapshots);

        productRowsById.forEach((productRows, productId) => {
          const productSnapshot = productSnapshotsById.get(productId);
          const firstRow = productRows[0];

          if (!productSnapshot?.exists()) {
            throw new InventoryConflictError(
              `${firstRow.primary} no longer exists in Firestore. Inventory was refreshed; review it and save again.`,
            );
          }

          const { movements, variants } = mergeProductInventoryDrafts({
            changes: productRows.map((row) => ({
              draft: draftRows[row.id] || {},
              row,
            })),
            product: productSnapshot.data(),
          });

          transaction.update(productRefs.get(productId), {
            updatedAt: serverTimestamp(),
            variants,
          });

          movements.forEach(({ quantityDelta, row, variant }) => {
            transaction.set(movementRefs.get(row.id), {
              capacityGroupKey: "",
              createdAt: serverTimestamp(),
              createdBy: "admin_inventory",
              lineItemId: "",
              linkedId: row.productId,
              linkedType: "product",
              orderId: "",
              quantityDelta,
              reason: "manual_adjustment",
              sku: text(variant.sku),
              source: "manual",
              sourcePaymentId: "",
              title: `${row.primary}${row.secondary ? ` ${row.secondary}` : ""}`,
              variantId: text(variant.id),
            });
          });
        });

        changedEventRows.forEach((row) => {
          const eventSnapshot = eventSnapshotsById.get(row.productId);

          if (!eventSnapshot?.exists()) {
            throw new InventoryConflictError(
              `${row.primary} no longer exists in Firestore. Inventory was refreshed; review it and save again.`,
            );
          }

          const { movementDelta, update } = mergeEventInventoryDraft({
            draft: draftRows[row.id] || {},
            event: eventSnapshot.data(),
            row,
          });

          transaction.update(eventRefs.get(row.productId), {
            ...update,
            updatedAt: serverTimestamp(),
          });

          if (movementDelta !== 0) {
            transaction.set(movementRefs.get(row.id), {
              capacityGroupKey: row.productId,
              createdAt: serverTimestamp(),
              createdBy: "admin_inventory",
              lineItemId: "",
              linkedId: row.productId,
              linkedType: "event",
              orderId: "",
              quantityDelta: movementDelta,
              reason: "manual_adjustment",
              sku: "",
              source: "manual",
              sourcePaymentId: "",
              title: row.primary,
              variantId: "",
            });
          }
        });
      });

      await loadInventory();
      setMessage("Inventory changes saved.");
    } catch (error) {
      if (error instanceof InventoryConflictError) {
        await loadInventory();
        setMessage(error.message);
      } else {
        const changedNames = Array.from(new Set(dirtyRows.map((row) => row.primary)));
        const affectedLabel = changedNames.length > 3
          ? `${changedNames.slice(0, 3).join(", ")} and ${changedNames.length - 3} more`
          : changedNames.join(", ");

        setMessage(`Inventory could not be saved for ${affectedLabel}. Check the values and Firestore permissions, then try again.`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin_panel admin_full_width admin_inventory_panel">
      <div className="admin_inventory_toolbar">
        <button className="admin_primary_button" disabled={isSaving || dirtyCount === 0} onClick={saveInventoryChanges} type="button">
          {isSaving ? "Saving..." : `Save Changes${dirtyCount ? ` (${dirtyCount})` : ""}`}
        </button>
        <button className="admin_secondary_button" disabled={isSaving || dirtyCount === 0} onClick={discardChanges} type="button">
          Discard Changes
        </button>
        <button className="admin_secondary_button" disabled={isLoading || isSaving} onClick={loadInventory} type="button">
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="admin_filter_grid admin_inventory_filters">
        <label>
          Search
          <input
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Product, event, SKU, category"
            value={filters.search}
          />
        </label>
        <label>
          Type
          <select onChange={(event) => updateFilter("type", event.target.value)} value={filters.type}>
            <option value="all">All</option>
            <option value="product">Products</option>
            <option value="event">Events</option>
          </select>
        </label>
        <label>
          Status
          <select onChange={(event) => updateFilter("status", event.target.value)} value={filters.status}>
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="low">Low Stock</option>
            <option value="out">Out / Full</option>
            <option value="untracked">Untracked</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      {message ? <p className="admin_message">{message}</p> : null}
      {isLoading ? <p className="admin_status">Loading inventory...</p> : null}

      <div className="admin_inventory_table" role="table" aria-label="Inventory rows">
        <div className="admin_inventory_header" role="row">
          <span>Name</span>
          <span>Type</span>
          <span>Status</span>
          <span>Inventory</span>
          <span>Update</span>
        </div>
        {filteredRows.map((row) => {
          const draft = draftRows[row.id] || draftForRow(row);
          const isDirty = rowDraftChanged(row, draft);

          return (
            <div className={isDirty ? "admin_inventory_row admin_inventory_row_dirty" : "admin_inventory_row"} key={row.id} role="row">
              <span>
                <strong>{row.primary}</strong>
                <small>{row.secondary || row.productId}</small>
                {row.sku ? <small>{row.sku}</small> : null}
              </span>
              <span>{statusLabel(row.type)}</span>
              <span>
                <mark className={`admin_inventory_status admin_inventory_status_${row.status}`}>
                  {statusLabel(row.status)}
                </mark>
                {isDirty ? <small>Unsaved</small> : null}
              </span>
              <span>
                <strong>{row.value}</strong>
                {row.type === "event" ? (
                  <small>{row.ticketsSold || 0} sold / {row.manualSeatsReserved || 0} held</small>
                ) : (
                  <small>{row.lowStockThreshold === null ? "No low-stock threshold" : `Low at ${row.lowStockThreshold}`}</small>
                )}
              </span>
              <span className="admin_inventory_controls">
                {row.type === "product" ? (
                  <>
                    <label>
                      Stock
                      <input
                        inputMode="numeric"
                        onChange={(event) => updateDraft(row.id, "stockOnHand", event.target.value)}
                        value={draft.stockOnHand || ""}
                      />
                    </label>
                    <label>
                      Low
                      <input
                        inputMode="numeric"
                        onChange={(event) => updateDraft(row.id, "lowStockThreshold", event.target.value)}
                        placeholder="Optional"
                        value={draft.lowStockThreshold || ""}
                      />
                    </label>
                    <label className="admin_inline_checkbox">
                      <input
                        checked={draft.inventoryTracked === true}
                        onChange={(event) => updateDraft(row.id, "inventoryTracked", event.target.checked)}
                        type="checkbox"
                      />
                      Track
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      Capacity
                      <input
                        inputMode="numeric"
                        onChange={(event) => updateDraft(row.id, "capacity", event.target.value)}
                        placeholder="Set capacity"
                        value={draft.capacity || ""}
                      />
                    </label>
                    <label>
                      Holds
                      <input
                        inputMode="numeric"
                        onChange={(event) => updateDraft(row.id, "manualSeatsReserved", event.target.value)}
                        value={draft.manualSeatsReserved || "0"}
                      />
                    </label>
                    <label className="admin_inline_checkbox">
                      <input
                        checked={draft.waitlistEnabled === true}
                        onChange={(event) => updateDraft(row.id, "waitlistEnabled", event.target.checked)}
                        type="checkbox"
                      />
                      Waitlist
                    </label>
                  </>
                )}
              </span>
            </div>
          );
        })}
        {!filteredRows.length && !isLoading ? (
          <p className="admin_status">No inventory rows match these filters.</p>
        ) : null}
      </div>
    </section>
  );
}
