const logger = require("firebase-functions/logger");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

const paypalApiBase = () => (
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"
);

const centsFromAmount = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new HttpsError("invalid-argument", "Amounts must be non-negative numbers.");
  }

  return Math.round(number * 100);
};

const amountFromCents = (value) => (value / 100).toFixed(2);

const cleanText = (value, fallback = "") => String(value || fallback).trim();

const truncate = (value, maxLength) => cleanText(value).slice(0, maxLength);

const safeDocId = (value) => cleanText(value)
  .replace(/[^a-zA-Z0-9_-]/g, "_")
  .slice(0, 140);

const SHIPPING_MAX_CENTS = 1700;

const assertPaypalEnabled = () => {
  if (process.env.PAYPAL_CHECKOUT_ENABLED !== "true") {
    throw new HttpsError("failed-precondition", "Server PayPal checkout is not enabled.");
  }

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new HttpsError("failed-precondition", "PayPal server credentials are not configured.");
  }
};

const getPayPalAccessToken = async () => {
  assertPaypalEnabled();

  const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    logger.error("PayPal access token request failed", {
      status: response.status,
      text: await response.text(),
    });
    throw new HttpsError("internal", "PayPal credentials could not be verified.");
  }

  const tokenResponse = await response.json();

  if (!tokenResponse.access_token) {
    throw new HttpsError("internal", "PayPal did not return an access token.");
  }

  return tokenResponse.access_token;
};

const paypalRequest = async (path, options = {}) => {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${paypalApiBase()}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      logger.error("PayPal returned a non-JSON response", {
        path,
        status: response.status,
        text,
      });
      throw new HttpsError("internal", "PayPal returned an unexpected response.");
    }
  }

  if (!response.ok) {
    logger.error("PayPal request failed", {
      path,
      status: response.status,
      payload,
    });
    throw new HttpsError("internal", "PayPal request failed.");
  }

  return payload;
};

const normalizeCartItem = (item, index) => {
  const title = truncate(item.title || item.name || `Item ${index + 1}`, 127);
  const quantity = Number.parseInt(item.quantity, 10);
  const unitPriceCents = centsFromAmount(item.price);

  if (!title || !Number.isInteger(quantity) || quantity <= 0) {
    throw new HttpsError("invalid-argument", "Cart items need a title and positive quantity.");
  }

  return {
    capacityGroupKey: cleanText(item.capacityGroupKey),
    category: cleanText(item.category),
    adultTickets: Number.parseInt(item.adultTickets, 10) || 0,
    childTickets: Number.parseInt(item.childTickets, 10) || 0,
    glutenFree: item.glutenFree === true,
    key: cleanText(item.key),
    linkedId: cleanText(item.productId || item.eventId || item.linkedId || item.id || item.slug),
    lineItemId: cleanText(item.lineItemId || `line-${index + 1}`),
    quantity,
    seatCount: Number(item.seatsPerCartUnit || item.ticketCount || 0) || 0,
    shippingCents: item.shipping === undefined || item.shipping === null ? 0 : centsFromAmount(item.shipping),
    sku: truncate(item.sku || item.variantId || item.key || `item-${index + 1}`, 127),
    title,
    type: item.category === "Experience" ? "event" : "product",
    unitPriceCents,
    vegetarian: item.vegetarian === true,
    variantId: cleanText(item.variantId),
  };
};

const normalizeCheckoutPayload = (data = {}) => {
  const cartItems = Array.isArray(data.cartItems) ? data.cartItems : [];

  if (!cartItems.length) {
    throw new HttpsError("invalid-argument", "Cart is empty.");
  }

  const items = cartItems.map(normalizeCartItem);
  const subtotalCents = items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);
  const shippingCents = centsFromAmount(data.shipping);
  const totalCents = centsFromAmount(data.total);
  const submittedSubtotalCents = centsFromAmount(data.subtotal);

  if (subtotalCents !== submittedSubtotalCents || subtotalCents + shippingCents !== totalCents) {
    throw new HttpsError("invalid-argument", "Cart totals do not match line items.");
  }

  return {
    items,
    shippingPreference: data.shippingPreference === "NO_SHIPPING" ? "NO_SHIPPING" : "GET_FROM_FILE",
    subtotalCents,
    shippingCents,
    totalCents,
  };
};

const visibleRecord = (record) => (
  record
  && record.isActive !== false
  && record.published !== false
);

const priceOptionForVariant = (product, variant, index) => {
  const priceOptions = Array.isArray(product.priceOptions) ? product.priceOptions : [];
  const priceOptionIndex = Number.isInteger(variant.priceOptionIndex) ? variant.priceOptionIndex : index;

  return priceOptions[priceOptionIndex] || {};
};

const validateProductItemFromSnapshot = (item, productSnapshot) => {
  if (!item.linkedId) {
    throw new HttpsError("invalid-argument", "Product cart items need a product ID.");
  }

  if (!item.variantId) {
    throw new HttpsError("invalid-argument", "Product cart items need a variant ID.");
  }

  if (!productSnapshot.exists) {
    throw new HttpsError("failed-precondition", "A product in your cart is no longer available.");
  }

  const product = productSnapshot.data() || {};

  if (!visibleRecord(product) || product.inStock === false) {
    throw new HttpsError("failed-precondition", "A product in your cart is not available.");
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const variantIndex = variants.findIndex((variant) => variant.id === item.variantId);
  const variant = variantIndex >= 0 ? variants[variantIndex] : null;

  if (!variant || variant.active === false) {
    throw new HttpsError("failed-precondition", "A product option in your cart is not available.");
  }

  const inventoryTracked = variant.inventoryTracked !== false;
  const stockOnHand = Number(variant.stockOnHand || 0);

  if (inventoryTracked && stockOnHand < item.quantity) {
    throw new HttpsError("resource-exhausted", "A product option in your cart does not have enough stock.");
  }

  const priceOption = priceOptionForVariant(product, variant, variantIndex);
  const unitPriceCents = centsFromAmount(variant.price || priceOption.price);
  const shippingCents = product.shipping === undefined || product.shipping === null ? 0 : centsFromAmount(product.shipping);
  const label = cleanText(variant.label || priceOption.option);

  return {
    ...item,
    inventoryTracked,
    linkedId: productSnapshot.id,
    shippingCents,
    sku: truncate(variant.sku || item.sku || `${productSnapshot.id}-${variant.id}`, 127),
    title: truncate(`${cleanText(product.title, productSnapshot.id)}${label ? ` ${label}` : ""}`, 127),
    unitPriceCents,
    variantId: variant.id,
  };
};

const validateProductItem = async (item) => {
  const productSnapshot = await db.collection("products").doc(item.linkedId).get();

  return validateProductItemFromSnapshot(item, productSnapshot);
};

const validateEventItemFromSnapshot = (item, eventSnapshot) => {
  if (!item.linkedId) {
    throw new HttpsError("invalid-argument", "Event cart items need an event ID.");
  }

  if (!eventSnapshot.exists) {
    throw new HttpsError("failed-precondition", "An event in your cart is no longer available.");
  }

  const event = eventSnapshot.data() || {};

  if (!visibleRecord(event) || event.inStock === false) {
    throw new HttpsError("failed-precondition", "An event in your cart is not available.");
  }

  const adultTickets = item.adultTickets || item.seatCount || item.quantity;
  const childTickets = item.childTickets || 0;
  const seatCount = adultTickets + childTickets;

  if (!Number.isInteger(adultTickets) || adultTickets <= 0 || !Number.isInteger(childTickets) || childTickets < 0) {
    throw new HttpsError("invalid-argument", "Event cart items need valid ticket counts.");
  }

  const capacity = Number.isInteger(event.capacity) ? event.capacity : null;
  const ticketsSold = Number.isInteger(event.ticketsSold) ? event.ticketsSold : 0;
  const manualSeatsReserved = Number.isInteger(event.manualSeatsReserved) ? event.manualSeatsReserved : 0;

  if (capacity !== null && capacity - ticketsSold - manualSeatsReserved < seatCount) {
    throw new HttpsError("resource-exhausted", "An event in your cart does not have enough seats available.");
  }

  const basePriceCents = centsFromAmount(Array.isArray(event.priceOptions) ? event.priceOptions[0] : 0);
  const dietaryFeeCents = item.vegetarian || item.glutenFree ? 1000 : 0;
  const childPriceCents = 1000;
  const unitPriceCents = (basePriceCents + dietaryFeeCents) * adultTickets + childPriceCents * childTickets;

  return {
    ...item,
    adultTickets,
    childTickets,
    linkedId: eventSnapshot.id,
    quantity: 1,
    seatCount,
    shippingCents: 0,
    sku: truncate(item.sku || eventSnapshot.id, 127),
    title: truncate(item.title || event.title || eventSnapshot.id, 127),
    unitPriceCents,
    variantId: "",
  };
};

const validateEventItem = async (item) => {
  const eventSnapshot = await db.collection("events").doc(item.linkedId).get();

  return validateEventItemFromSnapshot(item, eventSnapshot);
};

const trustedCheckoutFromItems = (checkout, trustedItems) => {
  const subtotalCents = trustedItems.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);
  const rawShippingCents = trustedItems.reduce((total, item) => total + item.shippingCents, 0);
  const shippingCents = Math.min(rawShippingCents, SHIPPING_MAX_CENTS);
  const totalCents = subtotalCents + shippingCents;

  if (
    checkout.subtotalCents !== subtotalCents
    || checkout.shippingCents !== shippingCents
    || checkout.totalCents !== totalCents
  ) {
    throw new HttpsError("invalid-argument", "Cart totals are out of date. Please refresh your cart.");
  }

  return {
    ...checkout,
    items: trustedItems,
    shippingCents,
    shippingPreference: shippingCents > 0 ? "GET_FROM_FILE" : "NO_SHIPPING",
    subtotalCents,
    totalCents,
  };
};

const validateCheckoutAgainstFirestore = async (checkout) => {
  const trustedItems = await Promise.all(checkout.items.map((item) => (
    item.type === "event" ? validateEventItem(item) : validateProductItem(item)
  )));

  return trustedCheckoutFromItems(checkout, trustedItems);
};

const uniqueIdsForType = (items, type) => Array.from(new Set(items
  .filter((item) => item.type === type)
  .map((item) => item.linkedId)
  .filter(Boolean)));

const loadCheckoutSnapshotsForTransaction = async (transaction, checkout) => {
  const productIds = uniqueIdsForType(checkout.items, "product");
  const eventIds = uniqueIdsForType(checkout.items, "event");
  const productEntries = await Promise.all(productIds.map(async (productId) => ([
    productId,
    await transaction.get(db.collection("products").doc(productId)),
  ])));
  const eventEntries = await Promise.all(eventIds.map(async (eventId) => ([
    eventId,
    await transaction.get(db.collection("events").doc(eventId)),
  ])));

  return {
    eventSnapshots: new Map(eventEntries),
    productSnapshots: new Map(productEntries),
  };
};

const trustedCheckoutForTransaction = async (transaction, checkout) => {
  const { eventSnapshots, productSnapshots } = await loadCheckoutSnapshotsForTransaction(transaction, checkout);
  const trustedItems = checkout.items.map((item) => (
    item.type === "event"
      ? validateEventItemFromSnapshot(item, eventSnapshots.get(item.linkedId))
      : validateProductItemFromSnapshot(item, productSnapshots.get(item.linkedId))
  ));

  return {
    checkout: trustedCheckoutFromItems(checkout, trustedItems),
    eventSnapshots,
    productSnapshots,
  };
};

const aggregateSeatsByEvent = (items) => items.reduce((totals, item) => {
  if (item.type !== "event") {
    return totals;
  }

  totals.set(item.linkedId, (totals.get(item.linkedId) || 0) + item.seatCount);

  return totals;
}, new Map());

const applyProductInventoryUpdates = ({ productSnapshots, transaction, trustedItems }) => {
  const productItems = trustedItems.filter((item) => item.type === "product" && item.inventoryTracked !== false);
  const quantityByProduct = productItems.reduce((productTotals, item) => {
    const variantTotals = productTotals.get(item.linkedId) || new Map();
    variantTotals.set(item.variantId, (variantTotals.get(item.variantId) || 0) + item.quantity);
    productTotals.set(item.linkedId, variantTotals);

    return productTotals;
  }, new Map());

  quantityByProduct.forEach((quantityByVariant, productId) => {
    const productSnapshot = productSnapshots.get(productId);
    const product = productSnapshot?.data() || {};
    const variants = Array.isArray(product.variants) ? product.variants.map((variant) => ({ ...variant })) : [];

    quantityByVariant.forEach((quantityToRemove, variantId) => {
      const variantIndex = variants.findIndex((variant) => variant.id === variantId);

      if (variantIndex < 0) {
        throw new HttpsError("failed-precondition", "A product option in your cart is not available.");
      }

      const variant = variants[variantIndex];
      const stockOnHand = Number(variant.stockOnHand || 0);

      if (stockOnHand < quantityToRemove) {
        throw new HttpsError("resource-exhausted", "A product option in your cart does not have enough stock.");
      }

      variants[variantIndex] = {
        ...variant,
        stockOnHand: stockOnHand - quantityToRemove,
      };
    });

    transaction.update(productSnapshot.ref, {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      variants,
    });
  });
};

const applyEventCapacityUpdates = ({ eventSnapshots, transaction, trustedItems }) => {
  const seatsByEvent = aggregateSeatsByEvent(trustedItems);

  seatsByEvent.forEach((seatsToAdd, eventId) => {
    const eventSnapshot = eventSnapshots.get(eventId);
    const event = eventSnapshot?.data() || {};
    const capacity = Number.isInteger(event.capacity) ? event.capacity : null;

    if (capacity === null) {
      return;
    }

    const ticketsSold = Number.isInteger(event.ticketsSold) ? event.ticketsSold : 0;
    const manualSeatsReserved = Number.isInteger(event.manualSeatsReserved) ? event.manualSeatsReserved : 0;

    if (capacity - ticketsSold - manualSeatsReserved < seatsToAdd) {
      throw new HttpsError("resource-exhausted", "An event in your cart does not have enough seats available.");
    }

    transaction.update(eventSnapshot.ref, {
      ticketsSold: ticketsSold + seatsToAdd,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
};

const movementDocumentForSale = ({ capture, index, item, orderDocId }) => {
  const purchaseUnit = capture.purchase_units?.[0] || {};
  const capturePayment = purchaseUnit.payments?.captures?.[0] || {};
  const isEvent = item.type === "event";

  return {
    capacityGroupKey: item.capacityGroupKey,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: "paypal_server",
    lineItemId: item.lineItemId || `line-${index + 1}`,
    linkedId: item.linkedId,
    linkedType: item.type,
    orderId: orderDocId,
    quantityDelta: isEvent ? -item.seatCount : -item.quantity,
    reason: "sale",
    sku: item.sku,
    source: "paypal_web",
    sourcePaymentId: cleanText(capturePayment.id),
    title: item.title,
    variantId: item.variantId,
  };
};

const saveCapturedOrderAndInventory = async ({ capture, checkout, orderDocId, orderRef }) => {
  let savedOrderData = null;

  await db.runTransaction(async (transaction) => {
    const existingOrder = await transaction.get(orderRef);

    if (existingOrder.exists) {
      savedOrderData = existingOrder.data() || {};
      return;
    }

    const transactionState = await trustedCheckoutForTransaction(transaction, checkout);
    const trustedCheckout = transactionState.checkout;

    applyProductInventoryUpdates({
      productSnapshots: transactionState.productSnapshots,
      transaction,
      trustedItems: trustedCheckout.items,
    });
    applyEventCapacityUpdates({
      eventSnapshots: transactionState.eventSnapshots,
      transaction,
      trustedItems: trustedCheckout.items,
    });

    const orderDocument = orderDocumentForCapture({ capture, checkout: trustedCheckout });
    transaction.set(orderRef, orderDocument);
    trustedCheckout.items.forEach((item, index) => {
      const movementRef = db.collection("inventoryMovements").doc(`${orderDocId}_${index}_${safeDocId(item.linkedId)}_${safeDocId(item.variantId || item.capacityGroupKey || "event")}`);
      transaction.set(movementRef, movementDocumentForSale({
        capture,
        index,
        item,
        orderDocId,
      }));
    });
    savedOrderData = orderDocument;
  });

  return savedOrderData;
};

const paypalItemsFor = (items) => items.map((item) => ({
  name: item.title,
  quantity: String(item.quantity),
  sku: item.sku,
  unit_amount: {
    currency_code: "USD",
    value: amountFromCents(item.unitPriceCents),
  },
}));

const orderDocumentForCapture = ({ capture, checkout }) => {
  const purchaseUnit = capture.purchase_units?.[0] || {};
  const capturePayment = purchaseUnit.payments?.captures?.[0] || {};
  const payer = capture.payer || {};
  const payerName = payer.name || {};
  const shipping = purchaseUnit.shipping || {};
  const orderItems = checkout.items.map((item) => ({
    adultTickets: item.adultTickets || 0,
    capacityGroupKey: item.capacityGroupKey,
    childTickets: item.childTickets || 0,
    lineItemId: item.lineItemId,
    linkedId: item.linkedId,
    quantity: item.quantity,
    seatCount: item.seatCount,
    sku: item.sku,
    sourceLineItemId: "",
    title: item.title,
    total: Number(amountFromCents(item.unitPriceCents * item.quantity)),
    type: item.type,
    unitPrice: Number(amountFromCents(item.unitPriceCents)),
    variantId: item.variantId,
  }));

  return {
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    customer: {
      email: cleanText(payer.email_address),
      name: cleanText(`${cleanText(payerName.given_name)} ${cleanText(payerName.surname)}`),
      phone: "",
      sourcePayerId: cleanText(payer.payer_id),
    },
    fulfillmentStatus: "new",
    items: orderItems,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    paymentStatus: cleanText(capturePayment.status || capture.status || "unknown").toLowerCase(),
    rawSource: {
      orderId: cleanText(capture.id),
      payerId: cleanText(payer.payer_id),
      purchaseUnitReference: cleanText(purchaseUnit.reference_id),
    },
    shipping: {
      address: shipping.address || null,
      amount: Number(amountFromCents(checkout.shippingCents)),
      name: shipping.name?.full_name || "",
    },
    source: "paypal_web",
    sourceOrderId: cleanText(capture.id),
    sourcePaymentId: cleanText(capturePayment.id),
    status: capture.status === "COMPLETED" || capturePayment.status === "COMPLETED" ? "paid" : "needs_review",
    totals: {
      currency: "USD",
      discount: 0,
      shipping: Number(amountFromCents(checkout.shippingCents)),
      subtotal: Number(amountFromCents(checkout.subtotalCents)),
      tax: 0,
      total: Number(amountFromCents(checkout.totalCents)),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
};

exports.createPayPalOrder = onCall(async (request) => {
  assertPaypalEnabled();

  const checkout = await validateCheckoutAgainstFirestore(normalizeCheckoutPayload(request.data));
  const order = await paypalRequest("/v2/checkout/orders", {
    body: {
      intent: "CAPTURE",
      payment_source: {
        paypal: {
          experience_context: {
            shipping_preference: checkout.shippingPreference,
          },
        },
      },
      purchase_units: [
        {
          amount: {
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: amountFromCents(checkout.subtotalCents),
              },
              shipping: {
                currency_code: "USD",
                value: amountFromCents(checkout.shippingCents),
              },
            },
            currency_code: "USD",
            value: amountFromCents(checkout.totalCents),
          },
          description: "Calabash Gardens Online Order",
          items: paypalItemsFor(checkout.items),
          reference_id: "calabash-online-order",
        },
      ],
    },
    method: "POST",
  });

  if (!order.id) {
    throw new HttpsError("internal", "PayPal did not return an order ID.");
  }

  return { orderID: order.id };
});

exports.capturePayPalOrder = onCall(async (request) => {
  assertPaypalEnabled();

  const orderID = cleanText(request.data?.orderID);

  if (!orderID) {
    throw new HttpsError("invalid-argument", "PayPal order ID is required.");
  }

  const orderDocId = `paypal_${safeDocId(orderID)}`;
  const orderRef = db.collection("orders").doc(orderDocId);
  const existingOrder = await orderRef.get();

  if (existingOrder.exists) {
    const orderData = existingOrder.data() || {};

    return {
      orderId: orderDocId,
      payer: {
        email_address: orderData.customer?.email || "",
        name: { full_name: orderData.customer?.name || "" },
      },
      sourceOrderId: orderData.sourceOrderId || orderID,
      status: orderData.status || "paid",
    };
  }

  const checkout = await validateCheckoutAgainstFirestore(normalizeCheckoutPayload(request.data));
  const capture = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
    body: {},
    headers: {
      "PayPal-Request-Id": `capture-${safeDocId(orderID).slice(0, 80)}`,
    },
    method: "POST",
  });

  await saveCapturedOrderAndInventory({
    capture,
    checkout,
    orderDocId,
    orderRef,
  });

  return {
    orderId: orderDocId,
    payer: capture.payer || {},
    sourceOrderId: capture.id || orderID,
    status: capture.status || "unknown",
  };
});
