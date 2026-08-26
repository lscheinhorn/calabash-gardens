const crypto = require("crypto");
const logger = require("firebase-functions/logger");
const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { createPayPalGateway, PayPalGatewayError } = require("./paypalGateway");

admin.initializeApp();

const db = admin.firestore();
const paypalGateway = createPayPalGateway({
  env: process.env,
  fetchImpl: fetch,
  HttpsError,
  logger,
});

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
const MAX_CART_ITEMS = 40;
const MAX_ITEM_QUANTITY = 100;
const CHECKOUT_SESSION_TTL_MS = 3 * 60 * 60 * 1000;
const CAPTURE_LEASE_MS = 2 * 60 * 1000;
const WEBHOOK_PROCESSING_LEASE_MS = 2 * 60 * 1000;
const CHECKOUT_COLLECTION = "paypalCheckouts";
const WEBHOOK_COLLECTION = "paypalWebhookEvents";
const assertPaypalEnabled = paypalGateway.assertEnabled;
const assertPaypalWebhookEnabled = paypalGateway.assertWebhookEnabled;
const paypalRequest = paypalGateway.request;
const paypalWebhookRequest = paypalGateway.requestForWebhook;
const verifyPayPalWebhook = paypalGateway.verifyWebhook;

const PAYPAL_CAPTURE_COMPLETED = "PAYMENT.CAPTURE.COMPLETED";
const PAYPAL_REVIEW_EVENT_TYPES = new Set([
  "PAYMENT.CAPTURE.DECLINED",
  "PAYMENT.CAPTURE.PENDING",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.CAPTURE.REVERSED",
  "PAYMENT.REFUND.FAILED",
  "PAYMENT.REFUND.PENDING",
]);
const FINALIZED_PAYPAL_ORDER_STATUSES = new Set([
  "paid",
  "partially_refunded",
  "refunded",
  "reversed",
]);

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const canonicalize = (value) => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }

  return value;
};

const snapshotHashFor = (checkout) => sha256(JSON.stringify(canonicalize(checkout)));

const assertOpaqueValue = (value, label) => {
  const text = cleanText(value);

  if (!/^[a-zA-Z0-9_-]{32,160}$/.test(text)) {
    throw new HttpsError("invalid-argument", `${label} is invalid.`);
  }

  return text;
};

const assertCheckoutToken = (session, checkoutToken) => {
  const submittedHash = Buffer.from(sha256(assertOpaqueValue(checkoutToken, "Checkout token")), "hex");
  const storedHash = Buffer.from(cleanText(session.checkoutTokenHash), "hex");

  if (storedHash.length !== submittedHash.length || !crypto.timingSafeEqual(storedHash, submittedHash)) {
    throw new HttpsError("permission-denied", "Checkout authorization is invalid.");
  }
};

const checkoutDocIdFor = (orderID) => `paypal_${safeDocId(orderID)}`;
const checkoutSessionRefFor = (orderID) => db.collection(CHECKOUT_COLLECTION).doc(checkoutDocIdFor(orderID));
const isFinalizedPayPalOrder = (order, orderID) => (
  order?.source === "paypal_web"
  && order.sourceOrderId === orderID
  && FINALIZED_PAYPAL_ORDER_STATUSES.has(order.status)
);

const isSafeFunctionsEmulator = () => {
  const projectId = cleanText(process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT);
  return process.env.FUNCTIONS_EMULATOR === "true" && projectId === "demo-calabash-gardens";
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const pauseEmulatorReconciliation = async ({ session, sessionRef }) => {
  if (!isSafeFunctionsEmulator() || session.testFailureMode !== "pause_reconcile_once") {
    return;
  }

  await sessionRef.update({
    testFailureMode: FieldValue.delete(),
    testReconcilePausedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    const latestSession = await sessionRef.get();

    if (latestSession.data()?.testContinueReconcile === true) {
      await sessionRef.update({
        testContinueReconcile: FieldValue.delete(),
        testReconcilePausedAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    await wait(25);
  }

  throw new HttpsError("deadline-exceeded", "Emulator reconciliation pause timed out.");
};

const millisFromTimestamp = (value) => {
  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  const millis = new Date(value).getTime();
  return Number.isFinite(millis) ? millis : null;
};

const hasActiveCaptureLease = (session) => (
  Boolean(session.captureLeaseId)
  && millisFromTimestamp(session.captureLeaseExpiresAt) > Date.now()
);

const normalizeCartItem = (item, index) => {
  item = item && typeof item === "object" ? item : {};
  const title = truncate(item.title || item.name || `Item ${index + 1}`, 127);
  const quantity = Number.parseInt(item.quantity, 10);
  const unitPriceCents = centsFromAmount(item.price);

  if (!title || !Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_ITEM_QUANTITY) {
    throw new HttpsError("invalid-argument", `Cart item quantities must be between 1 and ${MAX_ITEM_QUANTITY}.`);
  }

  return {
    capacityGroupKey: truncate(item.capacityGroupKey, 180),
    category: truncate(item.category, 80),
    adultTickets: Number.parseInt(item.adultTickets, 10) || 0,
    childTickets: Number.parseInt(item.childTickets, 10) || 0,
    glutenFree: item.glutenFree === true,
    key: truncate(item.key, 180),
    linkedId: truncate(item.productId || item.eventId || item.linkedId || item.id || item.slug, 180),
    lineItemId: `line-${index + 1}`,
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

  if (cartItems.length > MAX_CART_ITEMS) {
    throw new HttpsError("invalid-argument", `Cart cannot contain more than ${MAX_CART_ITEMS} line items.`);
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

  const eventDateMillis = millisFromTimestamp(event.date);

  if (eventDateMillis === null || eventDateMillis <= Date.now()) {
    throw new HttpsError("failed-precondition", "An event in your cart has already passed.");
  }

  const eventDates = Array.isArray(event.eventDates) ? event.eventDates.filter(Boolean) : [];

  if (eventDates.length > 1) {
    throw new HttpsError(
      "failed-precondition",
      "Multi-date event checkout needs occurrence-specific capacity before server checkout can be enabled.",
    );
  }

  const submittedAdultTickets = item.adultTickets || 0;
  const childTickets = item.childTickets || 0;
  const adultTickets = submittedAdultTickets + childTickets > 0
    ? submittedAdultTickets
    : item.seatCount || item.quantity;
  const seatCount = adultTickets + childTickets;

  if (
    !Number.isInteger(adultTickets)
    || adultTickets < 0
    || adultTickets > MAX_ITEM_QUANTITY
    || !Number.isInteger(childTickets)
    || childTickets < 0
    || childTickets > MAX_ITEM_QUANTITY
    || seatCount <= 0
    || seatCount > MAX_ITEM_QUANTITY
  ) {
    throw new HttpsError("invalid-argument", "Event cart items need valid ticket counts.");
  }

  const capacityGroupKey = `${eventSnapshot.id}${eventDates[0] ? ` ${eventDates[0]}` : ""}`;

  if (item.capacityGroupKey && item.capacityGroupKey !== capacityGroupKey) {
    throw new HttpsError("invalid-argument", "The selected event date is out of date.");
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
    capacityGroupKey,
    childTickets,
    linkedId: eventSnapshot.id,
    quantity: 1,
    seatCount,
    shippingCents: 0,
    sku: truncate(item.sku || eventSnapshot.id, 127),
    title: truncate(event.title || eventSnapshot.id, 127),
    unitPriceCents,
    variantId: "",
  };
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
  const { eventSnapshots, productSnapshots } = await loadCheckoutSnapshots(checkout);
  const trustedItems = checkout.items.map((item) => (
    item.type === "event"
      ? validateEventItemFromSnapshot(item, eventSnapshots.get(item.linkedId))
      : validateProductItemFromSnapshot(item, productSnapshots.get(item.linkedId))
  ));

  assertAggregatedAvailability({
    eventSnapshots,
    productSnapshots,
    trustedItems,
  });

  return trustedCheckoutFromItems(checkout, trustedItems);
};

const uniqueIdsForType = (items, type) => Array.from(new Set(items
  .filter((item) => item.type === type)
  .map((item) => item.linkedId)
  .filter(Boolean)));

const loadCheckoutSnapshots = async (checkout) => {
  const productIds = uniqueIdsForType(checkout.items, "product");
  const eventIds = uniqueIdsForType(checkout.items, "event");
  const [productEntries, eventEntries] = await Promise.all([
    Promise.all(productIds.map(async (productId) => ([
      productId,
      await db.collection("products").doc(productId).get(),
    ]))),
    Promise.all(eventIds.map(async (eventId) => ([
      eventId,
      await db.collection("events").doc(eventId).get(),
    ]))),
  ]);

  return {
    eventSnapshots: new Map(eventEntries),
    productSnapshots: new Map(productEntries),
  };
};

const assertAggregatedAvailability = ({ eventSnapshots, productSnapshots, trustedItems }) => {
  const productQuantities = new Map();
  const eventSeats = new Map();

  trustedItems.forEach((item) => {
    if (item.type === "event") {
      eventSeats.set(item.linkedId, (eventSeats.get(item.linkedId) || 0) + item.seatCount);
      return;
    }

    if (item.inventoryTracked === false) {
      return;
    }

    const key = `${item.linkedId}:${item.variantId}`;
    productQuantities.set(key, (productQuantities.get(key) || 0) + item.quantity);
  });

  productQuantities.forEach((quantity, key) => {
    const separator = key.indexOf(":");
    const productId = key.slice(0, separator);
    const variantId = key.slice(separator + 1);
    const product = productSnapshots.get(productId)?.data() || {};
    const variant = Array.isArray(product.variants)
      ? product.variants.find((candidate) => candidate.id === variantId)
      : null;

    if (!variant || Number(variant.stockOnHand || 0) < quantity) {
      throw new HttpsError("resource-exhausted", "A product option in your cart does not have enough stock.");
    }
  });

  eventSeats.forEach((seatCount, eventId) => {
    const event = eventSnapshots.get(eventId)?.data() || {};
    const capacity = Number.isInteger(event.capacity) ? event.capacity : null;

    if (capacity === null) {
      return;
    }

    const ticketsSold = Number.isInteger(event.ticketsSold) ? event.ticketsSold : 0;
    const manualSeatsReserved = Number.isInteger(event.manualSeatsReserved) ? event.manualSeatsReserved : 0;

    if (capacity - ticketsSold - manualSeatsReserved < seatCount) {
      throw new HttpsError("resource-exhausted", "An event in your cart does not have enough seats available.");
    }
  });
};

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

  assertAggregatedAvailability({
    eventSnapshots,
    productSnapshots,
    trustedItems,
  });

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
      updatedAt: FieldValue.serverTimestamp(),
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
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

const reservationForCheckout = ({ eventSnapshots, trustedItems }) => {
  const productReservations = new Map();
  const eventReservations = new Map();

  trustedItems.forEach((item) => {
    if (item.type === "event") {
      const event = eventSnapshots.get(item.linkedId)?.data() || {};

      if (Number.isInteger(event.capacity)) {
        eventReservations.set(item.linkedId, {
          capacityGroupKey: item.capacityGroupKey,
          eventId: item.linkedId,
          seatCount: (eventReservations.get(item.linkedId)?.seatCount || 0) + item.seatCount,
        });
      }
      return;
    }

    if (item.inventoryTracked === false) {
      return;
    }

    const key = `${item.linkedId}:${item.variantId}`;
    productReservations.set(key, {
      productId: item.linkedId,
      quantity: (productReservations.get(key)?.quantity || 0) + item.quantity,
      sku: item.sku,
      variantId: item.variantId,
    });
  });

  return {
    events: Array.from(eventReservations.values()),
    products: Array.from(productReservations.values()),
  };
};

const releaseReservedInventory = async ({ expectedLeaseId = "", reason, sessionRef }) => {
  let released = false;

  await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);

    if (!sessionSnapshot.exists) {
      throw new HttpsError("not-found", "Checkout session was not found.");
    }

    const session = sessionSnapshot.data() || {};

    if (
      session.inventoryState !== "reserved"
      || cleanText(session.paypal?.captureId)
      || (expectedLeaseId && session.captureLeaseId !== expectedLeaseId)
      || (!expectedLeaseId && hasActiveCaptureLease(session))
    ) {
      return;
    }

    const reservation = session.reservation || {};
    const productReservations = Array.isArray(reservation.products) ? reservation.products : [];
    const eventReservations = Array.isArray(reservation.events) ? reservation.events : [];
    const reservationsByProduct = productReservations.reduce((reservations, reservedProduct) => {
      reservations.set(
        reservedProduct.productId,
        [...(reservations.get(reservedProduct.productId) || []), reservedProduct],
      );
      return reservations;
    }, new Map());
    const productEntries = await Promise.all(Array.from(reservationsByProduct.keys()).map(async (productId) => ([
      productId,
      await transaction.get(db.collection("products").doc(productId)),
    ])));
    const eventEntries = await Promise.all(eventReservations.map(async (reservedEvent) => ([
      reservedEvent.eventId,
      await transaction.get(db.collection("events").doc(reservedEvent.eventId)),
    ])));
    const productSnapshots = new Map(productEntries);
    const eventSnapshots = new Map(eventEntries);

    reservationsByProduct.forEach((reservedProducts, productId) => {
      const productSnapshot = productSnapshots.get(productId);
      const product = productSnapshot?.data() || {};
      const variants = Array.isArray(product.variants) ? product.variants.map((variant) => ({ ...variant })) : [];

      if (!productSnapshot?.exists) {
        throw new HttpsError("failed-precondition", "Reserved product inventory needs manual review.");
      }

      reservedProducts.forEach((reservedProduct) => {
        const variantIndex = variants.findIndex((variant) => variant.id === reservedProduct.variantId);

        if (variantIndex < 0) {
          throw new HttpsError("failed-precondition", "Reserved product inventory needs manual review.");
        }

        variants[variantIndex].stockOnHand = Number(variants[variantIndex].stockOnHand || 0) + reservedProduct.quantity;
      });
      transaction.update(productSnapshot.ref, {
        updatedAt: FieldValue.serverTimestamp(),
        variants,
      });
    });

    eventReservations.forEach((reservedEvent) => {
      const eventSnapshot = eventSnapshots.get(reservedEvent.eventId);
      const event = eventSnapshot?.data() || {};
      const ticketsSold = Number.isInteger(event.ticketsSold) ? event.ticketsSold : 0;

      if (!eventSnapshot?.exists || ticketsSold < reservedEvent.seatCount) {
        throw new HttpsError("failed-precondition", "Reserved event inventory needs manual review.");
      }

      transaction.update(eventSnapshot.ref, {
        ticketsSold: ticketsSold - reservedEvent.seatCount,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    transaction.update(sessionRef, {
      captureLeaseAcquiredAt: FieldValue.delete(),
      captureLeaseExpiresAt: FieldValue.delete(),
      captureLeaseId: FieldValue.delete(),
      inventoryState: "released",
      recovery: {
        lastErrorCode: "capture_not_completed",
        reason: truncate(reason, 240),
        required: false,
      },
      releasedAt: FieldValue.serverTimestamp(),
      status: "capture_failed_released",
      updatedAt: FieldValue.serverTimestamp(),
    });
    released = true;
  });

  return released;
};

const movementDocumentForSale = ({ capture, index, item, orderDocId }) => {
  const purchaseUnit = capture.purchase_units?.[0] || {};
  const capturePayment = purchaseUnit.payments?.captures?.[0] || {};
  const isEvent = item.type === "event";

  return {
    capacityGroupKey: item.capacityGroupKey,
    createdAt: FieldValue.serverTimestamp(),
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

const reserveCheckoutInventory = async ({ captureLeaseId, checkoutToken, orderID }) => {
  const orderDocId = checkoutDocIdFor(orderID);
  const orderRef = db.collection("orders").doc(orderDocId);
  const sessionRef = checkoutSessionRefFor(orderID);
  const captureLeaseExpiresAt = Timestamp.fromMillis(Date.now() + CAPTURE_LEASE_MS);
  let reservationResult = null;

  await db.runTransaction(async (transaction) => {
    const [sessionSnapshot, existingOrder] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(orderRef),
    ]);

    if (!sessionSnapshot.exists) {
      throw new HttpsError("not-found", "Checkout session was not found.");
    }

    const session = sessionSnapshot.data() || {};
    assertCheckoutToken(session, checkoutToken);

    if (session.sourceOrderId !== orderID || session.provider !== "paypal") {
      throw new HttpsError("failed-precondition", "Checkout session does not match the PayPal order.");
    }

    if (existingOrder.exists) {
      const order = existingOrder.data() || {};

      if (!isFinalizedPayPalOrder(order, orderID)) {
        throw new HttpsError("failed-precondition", "The existing order needs manual review.");
      }

      reservationResult = {
        alreadyPaid: true,
        checkout: session.checkout,
        leaseAcquired: false,
        order,
        orderDocId,
        orderRef,
        session,
        sessionRef,
      };
      return;
    }

    if (millisFromTimestamp(session.expiresAt) <= Date.now() && session.inventoryState !== "reserved") {
      throw new HttpsError("deadline-exceeded", "Checkout session expired. Please restart checkout.");
    }

    if (session.inventoryState === "committed" || session.status === "paid") {
      throw new HttpsError("failed-precondition", "Checkout finalization needs manual review.");
    }

    if (session.inventoryState === "reserved") {
      const leaseExpiresAt = millisFromTimestamp(session.captureLeaseExpiresAt);
      const hasActiveLease = Boolean(session.captureLeaseId) && leaseExpiresAt > Date.now();

      if (hasActiveLease && session.captureLeaseId !== captureLeaseId) {
        reservationResult = {
          alreadyPaid: false,
          checkout: session.checkout,
          leaseAcquired: false,
          orderDocId,
          orderRef,
          session,
          sessionRef,
        };
        return;
      }

      transaction.update(sessionRef, {
        captureLeaseAcquiredAt: FieldValue.serverTimestamp(),
        captureLeaseExpiresAt,
        captureLeaseId,
        status: cleanText(session.paypal?.captureId) ? "captured_pending_finalize" : "capture_pending",
        updatedAt: FieldValue.serverTimestamp(),
      });
      reservationResult = {
        alreadyPaid: false,
        checkout: session.checkout,
        leaseAcquired: true,
        orderDocId,
        orderRef,
        session: {
          ...session,
          captureLeaseExpiresAt,
          captureLeaseId,
        },
        sessionRef,
      };
      return;
    }

    if (!["created", "capture_failed_released"].includes(session.status)) {
      throw new HttpsError("failed-precondition", "Checkout is waiting for payment reconciliation.");
    }

    const transactionState = await trustedCheckoutForTransaction(transaction, session.checkout);
    const trustedCheckout = transactionState.checkout;

    if (snapshotHashFor(trustedCheckout) !== session.snapshotHash) {
      throw new HttpsError(
        "failed-precondition",
        "Product or event details changed after PayPal checkout started. Please restart checkout.",
      );
    }

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

    const reservation = reservationForCheckout({
      eventSnapshots: transactionState.eventSnapshots,
      trustedItems: trustedCheckout.items,
    });
    transaction.update(sessionRef, {
      captureLeaseAcquiredAt: FieldValue.serverTimestamp(),
      captureLeaseExpiresAt,
      captureLeaseId,
      checkout: trustedCheckout,
      inventoryState: "reserved",
      recovery: {
        lastErrorCode: "",
        reason: "",
        required: false,
      },
      reservation,
      reservedAt: FieldValue.serverTimestamp(),
      status: "capture_pending",
      updatedAt: FieldValue.serverTimestamp(),
    });
    reservationResult = {
      alreadyPaid: false,
      checkout: trustedCheckout,
      leaseAcquired: true,
      orderDocId,
      orderRef,
      session: {
        ...session,
        checkout: trustedCheckout,
        captureLeaseExpiresAt,
        captureLeaseId,
        inventoryState: "reserved",
        reservation,
        status: "capture_pending",
      },
      sessionRef,
    };
  });

  return reservationResult;
};

const capturePaymentFor = (capture) => capture.purchase_units?.[0]?.payments?.captures?.[0] || {};

const isCompletedCapture = (capture) => (
  capture?.status === "COMPLETED"
  && capturePaymentFor(capture).status === "COMPLETED"
);

const isDefinitiveFailedCapture = (capture) => (
  capture?.status === "VOIDED"
  || ["DECLINED", "FAILED"].includes(capturePaymentFor(capture).status)
);

const isPendingCapture = (capture) => capturePaymentFor(capture).status === "PENDING";

const verifiedCaptureFor = ({ capture, checkout, orderID, snapshotHash }) => {
  const purchaseUnit = capture.purchase_units?.[0] || {};
  const capturePayment = capturePaymentFor(capture);
  const amount = capturePayment.amount || purchaseUnit.amount || {};
  const expectedMerchantId = cleanText(process.env.PAYPAL_MERCHANT_ID);
  const actualMerchantId = cleanText(
    capturePayment.payee?.merchant_id || purchaseUnit.payee?.merchant_id,
  );

  if (capture.id !== orderID || !isCompletedCapture(capture)) {
    throw new HttpsError("failed-precondition", "PayPal payment is not completed for this order.");
  }

  if (amount.currency_code !== "USD" || centsFromAmount(amount.value) !== checkout.totalCents) {
    throw new HttpsError("data-loss", "PayPal captured amount does not match the trusted checkout total.");
  }

  if (cleanText(purchaseUnit.custom_id || capturePayment.custom_id) !== snapshotHash) {
    throw new HttpsError("data-loss", "PayPal checkout reference does not match the trusted checkout.");
  }

  if (expectedMerchantId && actualMerchantId !== expectedMerchantId) {
    throw new HttpsError("data-loss", "PayPal capture belongs to a different merchant.");
  }

  if (!capturePayment.id) {
    throw new HttpsError("data-loss", "PayPal did not return a capture ID.");
  }

  return {
    amountCents: checkout.totalCents,
    captureId: capturePayment.id,
    captureStatus: capturePayment.status,
    currency: amount.currency_code,
  };
};

const markCheckoutNeedsReview = async ({
  clearLease = false,
  code,
  expectedLeaseId = "",
  reason,
  sessionRef,
  status = "needs_review",
}) => {
  let updated = false;

  await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);

    if (!sessionSnapshot.exists) {
      throw new HttpsError("not-found", "Checkout session was not found.");
    }

    const session = sessionSnapshot.data() || {};

    if (session.status === "paid" || session.inventoryState === "committed") {
      return;
    }

    if (expectedLeaseId && session.captureLeaseId !== expectedLeaseId) {
      return;
    }

    const updates = {
      recovery: {
        lastAttemptAt: FieldValue.serverTimestamp(),
        lastErrorCode: truncate(code, 80),
        reason: truncate(reason, 240),
        required: true,
      },
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (clearLease) {
      updates.captureLeaseAcquiredAt = FieldValue.delete();
      updates.captureLeaseExpiresAt = FieldValue.delete();
      updates.captureLeaseId = FieldValue.delete();
    }

    transaction.update(sessionRef, updates);
    updated = true;
  });

  return updated;
};

const recordVerifiedCapture = async ({ captureFacts, expectedLeaseId = "", sessionRef }) => {
  await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);

    if (!sessionSnapshot.exists) {
      throw new HttpsError("not-found", "Checkout session was not found.");
    }

    const session = sessionSnapshot.data() || {};

    if (session.status === "paid" || session.inventoryState === "committed") {
      return;
    }

    if (expectedLeaseId && session.captureLeaseId !== expectedLeaseId) {
      throw new HttpsError("aborted", "Checkout recovery ownership changed. Please retry.");
    }

    if (
      cleanText(session.paypal?.captureId)
      && session.paypal.captureId !== captureFacts.captureId
    ) {
      throw new HttpsError("data-loss", "Checkout references a different PayPal capture.");
    }

    transaction.update(sessionRef, {
      captureLeaseAcquiredAt: FieldValue.delete(),
      captureLeaseExpiresAt: FieldValue.delete(),
      captureLeaseId: FieldValue.delete(),
      capturedAt: FieldValue.serverTimestamp(),
      paypal: {
        ...(session.paypal || {}),
        amountCents: captureFacts.amountCents,
        captureId: captureFacts.captureId,
        captureStatus: captureFacts.captureStatus,
        currency: captureFacts.currency,
      },
      recovery: {
        lastErrorCode: "",
        reason: "",
        required: false,
      },
      status: "captured_pending_finalize",
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

const paymentReferenceRefForCapture = (captureId) => db.collection("paymentReferences")
  .doc(`paypal_capture_${safeDocId(captureId)}`);

const paymentReferenceDocument = ({ captureId, orderDocId, orderID }) => ({
  orderId: orderDocId,
  provider: "paypal",
  providerCaptureId: captureId,
  providerOrderId: orderID,
  referenceType: "capture",
  updatedAt: FieldValue.serverTimestamp(),
});

const finalizeCapturedCheckout = async ({ capture, orderDocId, orderRef, sessionRef }) => {
  const captureId = assertPayPalResourceId(capturePaymentFor(capture).id, "capture");
  const paymentReferenceRef = paymentReferenceRefForCapture(captureId);
  let savedOrderData = null;

  await db.runTransaction(async (transaction) => {
    const [sessionSnapshot, existingOrder, paymentReferenceSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(orderRef),
      transaction.get(paymentReferenceRef),
    ]);

    if (!sessionSnapshot.exists) {
      throw new HttpsError("not-found", "Checkout session was not found.");
    }

    const session = sessionSnapshot.data() || {};
    const existingPaymentReference = paymentReferenceSnapshot.data() || {};

    if (
      paymentReferenceSnapshot.exists
      && (
        existingPaymentReference.provider !== "paypal"
        || existingPaymentReference.providerCaptureId !== captureId
        || existingPaymentReference.providerOrderId !== session.sourceOrderId
        || existingPaymentReference.orderId !== orderDocId
      )
    ) {
      throw new HttpsError("data-loss", "PayPal capture reference belongs to another order.");
    }

    if (existingOrder.exists) {
      const order = existingOrder.data() || {};

      if (
        !isFinalizedPayPalOrder(order, session.sourceOrderId)
        || cleanText(order.sourcePaymentId) !== captureId
      ) {
        throw new HttpsError("failed-precondition", "The existing order needs manual review.");
      }

      if (session.status !== "paid" || session.inventoryState !== "committed") {
        transaction.update(sessionRef, {
          captureLeaseAcquiredAt: FieldValue.delete(),
          captureLeaseExpiresAt: FieldValue.delete(),
          captureLeaseId: FieldValue.delete(),
          inventoryState: "committed",
          recovery: {
            lastErrorCode: "",
            reason: "",
            required: false,
          },
          status: "paid",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.set(paymentReferenceRef, {
        ...paymentReferenceDocument({
          captureId,
          orderDocId,
          orderID: session.sourceOrderId,
        }),
        createdAt: existingPaymentReference.createdAt || FieldValue.serverTimestamp(),
      });

      savedOrderData = order;
      return;
    }

    if (session.inventoryState !== "reserved") {
      throw new HttpsError("failed-precondition", "Checkout inventory reservation is missing.");
    }

    const checkout = session.checkout;
    verifiedCaptureFor({
      capture,
      checkout,
      orderID: session.sourceOrderId,
      snapshotHash: session.snapshotHash,
    });
    const orderDocument = orderDocumentForCapture({
      capture,
      checkout,
      snapshotHash: session.snapshotHash,
    });
    transaction.set(orderRef, orderDocument);
    transaction.set(paymentReferenceRef, {
      ...paymentReferenceDocument({
        captureId,
        orderDocId,
        orderID: session.sourceOrderId,
      }),
      createdAt: existingPaymentReference.createdAt || FieldValue.serverTimestamp(),
    });
    checkout.items.forEach((item, index) => {
      const movementRef = db.collection("inventoryMovements")
        .doc(`${orderDocId}_${safeDocId(item.lineItemId || `line-${index + 1}`)}`);
      transaction.set(movementRef, movementDocumentForSale({
        capture,
        index,
        item,
        orderDocId,
      }));
    });
    transaction.update(sessionRef, {
      captureLeaseAcquiredAt: FieldValue.delete(),
      captureLeaseExpiresAt: FieldValue.delete(),
      captureLeaseId: FieldValue.delete(),
      finalizedAt: FieldValue.serverTimestamp(),
      inventoryState: "committed",
      recovery: {
        lastErrorCode: "",
        reason: "",
        required: false,
      },
      status: "paid",
      updatedAt: FieldValue.serverTimestamp(),
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

const orderDocumentForCapture = ({ capture, checkout, snapshotHash }) => {
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
    createdAt: FieldValue.serverTimestamp(),
    customer: {
      email: cleanText(payer.email_address),
      name: cleanText(`${cleanText(payerName.given_name)} ${cleanText(payerName.surname)}`),
      phone: "",
      sourcePayerId: cleanText(payer.payer_id),
    },
    fulfillmentStatus: "new",
    items: orderItems,
    paidAt: FieldValue.serverTimestamp(),
    paymentStatus: "completed",
    rawSource: {
      captureStatus: cleanText(capturePayment.status),
      orderId: cleanText(capture.id),
      payerId: cleanText(payer.payer_id),
      purchaseUnitReference: cleanText(purchaseUnit.reference_id),
    },
    schemaVersion: 1,
    shipping: {
      address: shipping.address || null,
      amount: Number(amountFromCents(checkout.shippingCents)),
      name: shipping.name?.full_name || "",
    },
    source: "paypal_web",
    sourceOrderId: cleanText(capture.id),
    sourcePaymentId: cleanText(capturePayment.id),
    snapshotHash,
    status: "paid",
    totals: {
      currency: "USD",
      discount: 0,
      shipping: Number(amountFromCents(checkout.shippingCents)),
      subtotal: Number(amountFromCents(checkout.subtotalCents)),
      tax: 0,
      total: Number(amountFromCents(checkout.totalCents)),
    },
    totalsCents: {
      shipping: checkout.shippingCents,
      subtotal: checkout.subtotalCents,
      total: checkout.totalCents,
    },
    updatedAt: FieldValue.serverTimestamp(),
  };
};

const assertPayPalResourceId = (value, label = "resource") => {
  const resourceId = cleanText(value);

  if (!/^[a-zA-Z0-9-]{6,140}$/.test(resourceId)) {
    throw new HttpsError("invalid-argument", `PayPal ${label} ID is invalid.`);
  }

  return resourceId;
};

const assertPayPalOrderId = (value) => assertPayPalResourceId(value, "order");

const requestIdFor = (prefix, value) => `${prefix}-${sha256(value).slice(0, 30)}`;

const paidCheckoutResponse = ({ order, orderDocId }) => ({
  finalized: true,
  orderId: orderDocId,
  payer: {
    email_address: cleanText(order.customer?.email),
    name: { full_name: cleanText(order.customer?.name) },
  },
  sourceOrderId: cleanText(order.sourceOrderId),
  status: "paid",
});

const processingCheckoutResponse = ({ orderID }) => ({
  finalized: false,
  orderId: checkoutDocIdFor(orderID),
  sourceOrderId: orderID,
  status: "processing",
});

const createCheckoutSession = async ({
  checkout,
  checkoutAttemptId,
  checkoutToken,
  createRequestId,
  orderID,
  snapshotHash,
}) => {
  const sessionRef = checkoutSessionRefFor(orderID);
  const checkoutTokenHash = sha256(checkoutToken);

  await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);

    if (sessionSnapshot.exists) {
      const session = sessionSnapshot.data() || {};

      if (
        session.checkoutAttemptId !== checkoutAttemptId
        || session.checkoutTokenHash !== checkoutTokenHash
        || session.snapshotHash !== snapshotHash
        || session.sourceOrderId !== orderID
      ) {
        throw new HttpsError("already-exists", "PayPal returned an order that belongs to another checkout.");
      }

      return;
    }

    transaction.create(sessionRef, {
      checkout,
      checkoutAttemptId,
      checkoutTokenHash,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + CHECKOUT_SESSION_TTL_MS),
      inventoryState: "none",
      paypal: {
        amountCents: 0,
        captureId: "",
        captureRequestId: requestIdFor("capture", orderID),
        captureStatus: "",
        createRequestId,
        currency: "",
      },
      provider: "paypal",
      recovery: {
        lastErrorCode: "",
        reason: "",
        required: false,
      },
      schemaVersion: 1,
      snapshotHash,
      sourceOrderId: orderID,
      status: "created",
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

const retrievePayPalOrder = (orderID) => paypalRequest(
  `/v2/checkout/orders/${encodeURIComponent(orderID)}`,
  { method: "GET" },
);

const loadAuthorizedCheckoutSession = async ({ checkoutToken, orderID }) => {
  const orderDocId = checkoutDocIdFor(orderID);
  const orderRef = db.collection("orders").doc(orderDocId);
  const sessionRef = checkoutSessionRefFor(orderID);
  const [orderSnapshot, sessionSnapshot] = await Promise.all([
    orderRef.get(),
    sessionRef.get(),
  ]);

  if (!sessionSnapshot.exists) {
    throw new HttpsError("not-found", "Checkout session was not found.");
  }

  const session = sessionSnapshot.data() || {};
  assertCheckoutToken(session, checkoutToken);

  if (session.sourceOrderId !== orderID || session.provider !== "paypal") {
    throw new HttpsError("failed-precondition", "Checkout session does not match the PayPal order.");
  }

  if (orderSnapshot.exists) {
    const order = orderSnapshot.data() || {};

    if (!isFinalizedPayPalOrder(order, orderID)) {
      throw new HttpsError("failed-precondition", "The existing order needs manual review.");
    }

    return {
      alreadyPaid: true,
      order,
      orderDocId,
      orderRef,
      session,
      sessionRef,
    };
  }

  return {
    alreadyPaid: false,
    orderDocId,
    orderRef,
    session,
    sessionRef,
  };
};

const verifyPayPalOrderSnapshot = ({ checkout, order, orderID, snapshotHash }) => {
  const purchaseUnit = order.purchase_units?.[0] || {};
  const amount = purchaseUnit.amount || {};

  if (order.id !== orderID) {
    throw new HttpsError("data-loss", "PayPal returned a different order.");
  }

  if (amount.currency_code !== "USD" || centsFromAmount(amount.value) !== checkout.totalCents) {
    throw new HttpsError("data-loss", "PayPal order amount does not match the trusted checkout total.");
  }

  if (cleanText(purchaseUnit.custom_id) !== snapshotHash) {
    throw new HttpsError("data-loss", "PayPal order reference does not match the trusted checkout.");
  }
};

const capturePayPalPayment = ({ captureRequestId, orderID }) => paypalRequest(
  `/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
  {
    body: {},
    headers: {
      "PayPal-Request-Id": captureRequestId,
      Prefer: "return=representation",
    },
    method: "POST",
  },
);

const resolvePayPalCapture = async ({ currentOrder, orderID, session }) => {
  if (isCompletedCapture(currentOrder)) {
    return { capture: currentOrder, definitiveFailure: false };
  }

  try {
    const capture = await capturePayPalPayment({
      captureRequestId: session.paypal?.captureRequestId || requestIdFor("capture", orderID),
      orderID,
    });
    return { capture, definitiveFailure: isDefinitiveFailedCapture(capture) };
  } catch (error) {
    if (!(error instanceof PayPalGatewayError)) {
      throw error;
    }

    try {
      currentOrder = await retrievePayPalOrder(orderID);
    } catch (retrieveError) {
      if (!(retrieveError instanceof PayPalGatewayError)) {
        throw retrieveError;
      }

      return { capture: null, definitiveFailure: false };
    }

    return {
      capture: currentOrder,
      definitiveFailure: isDefinitiveFailedCapture(currentOrder),
    };
  }
};

const assertActiveAdmin = async (request) => {
  const uid = cleanText(request.auth?.uid);

  if (!uid) {
    throw new HttpsError("unauthenticated", "Admin sign-in is required.");
  }

  const adminSnapshot = await db.collection("adminUsers").doc(uid).get();

  if (!adminSnapshot.exists || adminSnapshot.data()?.active !== true) {
    throw new HttpsError("permission-denied", "Active admin access is required.");
  }
};

const finalizeOrDeferCapture = async ({ capture, reservation }) => {
  let captureFacts;

  try {
    captureFacts = verifiedCaptureFor({
      capture,
      checkout: reservation.checkout,
      orderID: reservation.session.sourceOrderId,
      snapshotHash: reservation.session.snapshotHash,
    });
  } catch (error) {
    await markCheckoutNeedsReview({
      clearLease: true,
      code: error.code || "capture_verification_failed",
      reason: error.message || "PayPal capture verification failed.",
      sessionRef: reservation.sessionRef,
    });
    return processingCheckoutResponse({ orderID: reservation.session.sourceOrderId });
  }

  await recordVerifiedCapture({
    captureFacts,
    sessionRef: reservation.sessionRef,
  });

  if (isSafeFunctionsEmulator() && reservation.session.testFailureMode === "finalize_once") {
    await reservation.sessionRef.update({
      testFailureMode: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await markCheckoutNeedsReview({
      clearLease: true,
      code: "emulator_finalize_once",
      reason: "Emulator-only finalization recovery test.",
      sessionRef: reservation.sessionRef,
      status: "captured_pending_finalize",
    });
    return processingCheckoutResponse({ orderID: reservation.session.sourceOrderId });
  }

  let order;

  try {
    order = await finalizeCapturedCheckout({
      capture,
      orderDocId: reservation.orderDocId,
      orderRef: reservation.orderRef,
      sessionRef: reservation.sessionRef,
    });
  } catch (error) {
    logger.error("Captured PayPal checkout could not be finalized", {
      error: error.message,
      orderID: reservation.session.sourceOrderId,
    });
    await markCheckoutNeedsReview({
      clearLease: true,
      code: error.code || "finalization_failed",
      reason: "Payment was captured, but the order ledger still needs finalization.",
      sessionRef: reservation.sessionRef,
      status: "captured_pending_finalize",
    });
    return processingCheckoutResponse({ orderID: reservation.session.sourceOrderId });
  }

  return paidCheckoutResponse({
    order,
    orderDocId: reservation.orderDocId,
  });
};

exports.createPayPalOrder = onCall(async (request) => {
  assertPaypalEnabled();

  const checkoutAttemptId = assertOpaqueValue(request.data?.checkoutAttemptId, "Checkout attempt ID");
  const checkoutToken = assertOpaqueValue(request.data?.checkoutToken, "Checkout token");
  const checkout = await validateCheckoutAgainstFirestore(normalizeCheckoutPayload(request.data));
  const snapshotHash = snapshotHashFor(checkout);
  const createRequestId = requestIdFor("create", checkoutAttemptId);
  let order;

  try {
    order = await paypalRequest("/v2/checkout/orders", {
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
            custom_id: snapshotHash,
            description: "Calabash Gardens Online Order",
            items: paypalItemsFor(checkout.items),
            reference_id: `calabash-${sha256(checkoutAttemptId).slice(0, 24)}`,
          },
        ],
      },
      headers: {
        "PayPal-Request-Id": createRequestId,
        Prefer: "return=representation",
      },
      method: "POST",
    });
  } catch (error) {
    if (error instanceof PayPalGatewayError) {
      throw new HttpsError("unavailable", "PayPal checkout could not be started. Please try again.");
    }
    throw error;
  }

  const orderID = assertPayPalOrderId(order.id);

  if (!["CREATED", "APPROVED"].includes(order.status)) {
    throw new HttpsError("failed-precondition", "PayPal did not create an approvable order.");
  }

  await createCheckoutSession({
    checkout,
    checkoutAttemptId,
    checkoutToken,
    createRequestId,
    orderID,
    snapshotHash,
  });

  return { orderID };
});

exports.capturePayPalOrder = onCall(async (request) => {
  assertPaypalEnabled();

  const orderID = assertPayPalOrderId(request.data?.orderID);
  const checkoutToken = assertOpaqueValue(request.data?.checkoutToken, "Checkout token");
  const authorized = await loadAuthorizedCheckoutSession({ checkoutToken, orderID });

  if (authorized.alreadyPaid) {
    return paidCheckoutResponse({
      order: authorized.order,
      orderDocId: authorized.orderDocId,
    });
  }

  let currentOrder;

  try {
    currentOrder = await retrievePayPalOrder(orderID);
  } catch (error) {
    if (error instanceof PayPalGatewayError) {
      if (authorized.session.inventoryState === "reserved") {
        await markCheckoutNeedsReview({
          code: "approval_check_unavailable",
          reason: "PayPal could not confirm the order before capture.",
          sessionRef: authorized.sessionRef,
          status: "capture_unknown",
        });
        return processingCheckoutResponse({ orderID });
      }

      throw new HttpsError("unavailable", "PayPal approval could not be confirmed.");
    }
    throw error;
  }

  try {
    verifyPayPalOrderSnapshot({
      checkout: authorized.session.checkout,
      order: currentOrder,
      orderID,
      snapshotHash: authorized.session.snapshotHash,
    });
  } catch (error) {
    await markCheckoutNeedsReview({
      code: error.code || "approval_verification_failed",
      reason: error.message || "PayPal approval verification failed.",
      sessionRef: authorized.sessionRef,
    });
    return processingCheckoutResponse({ orderID });
  }

  if (authorized.session.inventoryState !== "reserved" && currentOrder.status !== "APPROVED") {
    if (currentOrder.status === "COMPLETED") {
      await markCheckoutNeedsReview({
        code: "paid_without_reservation",
        reason: "PayPal reports a completed payment without a matching inventory reservation.",
        sessionRef: authorized.sessionRef,
      });
      return processingCheckoutResponse({ orderID });
    }

    throw new HttpsError("failed-precondition", "PayPal order approval is required before inventory can be reserved.");
  }

  if (
    authorized.session.inventoryState === "reserved"
    && !["APPROVED", "COMPLETED"].includes(currentOrder.status)
  ) {
    await markCheckoutNeedsReview({
      code: "approval_state_changed",
      reason: `PayPal returned order status ${cleanText(currentOrder.status, "unknown")}.`,
      sessionRef: authorized.sessionRef,
      status: "capture_unknown",
    });
    return processingCheckoutResponse({ orderID });
  }

  const captureLeaseId = crypto.randomBytes(24).toString("hex");
  const reservation = await reserveCheckoutInventory({
    captureLeaseId,
    checkoutToken,
    orderID,
  });

  if (reservation.alreadyPaid) {
    return paidCheckoutResponse({
      order: reservation.order,
      orderDocId: reservation.orderDocId,
    });
  }

  if (!reservation.leaseAcquired) {
    return processingCheckoutResponse({ orderID });
  }

  const result = await resolvePayPalCapture({
    currentOrder,
    orderID,
    session: reservation.session,
  });

  if (!result.capture) {
    await markCheckoutNeedsReview({
      code: "capture_state_unknown",
      reason: "PayPal could not confirm whether payment completed.",
      sessionRef: reservation.sessionRef,
      status: "capture_unknown",
    });
    return processingCheckoutResponse({ orderID });
  }

  if (result.definitiveFailure) {
    const released = await releaseReservedInventory({
      expectedLeaseId: captureLeaseId,
      reason: `PayPal order status: ${cleanText(result.capture.status, "unknown")}`,
      sessionRef: reservation.sessionRef,
    });

    if (!released) {
      return processingCheckoutResponse({ orderID });
    }

    return {
      finalized: false,
      orderId: reservation.orderDocId,
      retryAllowed: true,
      sourceOrderId: orderID,
      status: "not_paid",
    };
  }

  if (!isCompletedCapture(result.capture)) {
    await markCheckoutNeedsReview({
      clearLease: true,
      code: "capture_not_completed",
      reason: `PayPal returned payment status ${cleanText(result.capture.status, "unknown")}.`,
      sessionRef: reservation.sessionRef,
      status: "capture_pending",
    });
    return processingCheckoutResponse({ orderID });
  }

  return finalizeOrDeferCapture({
    capture: result.capture,
    reservation,
  });
});

exports.reconcilePayPalOrder = onCall(async (request) => {
  assertPaypalEnabled();
  await assertActiveAdmin(request);

  const orderID = assertPayPalOrderId(request.data?.orderID);
  const orderDocId = checkoutDocIdFor(orderID);
  const orderRef = db.collection("orders").doc(orderDocId);
  const sessionRef = checkoutSessionRefFor(orderID);
  const [orderSnapshot, sessionSnapshot] = await Promise.all([
    orderRef.get(),
    sessionRef.get(),
  ]);

  if (orderSnapshot.exists) {
    return paidCheckoutResponse({
      order: orderSnapshot.data() || {},
      orderDocId,
    });
  }

  if (!sessionSnapshot.exists) {
    throw new HttpsError("not-found", "Checkout session was not found.");
  }

  const session = sessionSnapshot.data() || {};
  await pauseEmulatorReconciliation({ session, sessionRef });
  let capture;

  try {
    capture = await retrievePayPalOrder(orderID);
  } catch (error) {
    if (error instanceof PayPalGatewayError) {
      await markCheckoutNeedsReview({
        code: "reconciliation_unavailable",
        reason: "PayPal could not be reached during reconciliation.",
        sessionRef,
        status: "capture_unknown",
      });
      throw new HttpsError("unavailable", "PayPal reconciliation is temporarily unavailable.");
    }
    throw error;
  }

  if (!isCompletedCapture(capture)) {
    if (isPendingCapture(capture)) {
      await markCheckoutNeedsReview({
        code: "capture_pending",
        reason: "PayPal reports a pending payment during reconciliation.",
        sessionRef,
        status: "capture_pending",
      });
      return processingCheckoutResponse({ orderID });
    }

    if (hasActiveCaptureLease(session) || cleanText(session.paypal?.captureId)) {
      await markCheckoutNeedsReview({
        code: "capture_still_reconciling",
        reason: "Checkout capture is still in progress or already has a provider capture ID.",
        sessionRef,
        status: "capture_unknown",
      });
      return processingCheckoutResponse({ orderID });
    }

    if (isDefinitiveFailedCapture(capture) && session.inventoryState === "reserved") {
      const released = await releaseReservedInventory({
        reason: `Admin reconciliation found PayPal status ${cleanText(capture.status, "unknown")}.`,
        sessionRef,
      });

      if (!released) {
        return processingCheckoutResponse({ orderID });
      }

      return {
        finalized: false,
        orderId: orderDocId,
        retryAllowed: true,
        sourceOrderId: orderID,
        status: "not_paid",
      };
    }

    await markCheckoutNeedsReview({
      code: "provider_not_completed",
      reason: `PayPal returned non-terminal order status ${cleanText(capture.status, "unknown")}.`,
      sessionRef,
      status: "capture_unknown",
    });
    return processingCheckoutResponse({ orderID });
  }

  if (session.inventoryState !== "reserved") {
    await markCheckoutNeedsReview({
      code: "paid_without_reservation",
      reason: "PayPal reports a completed payment without a matching inventory reservation.",
      sessionRef,
    });
    return processingCheckoutResponse({ orderID });
  }

  return finalizeOrDeferCapture({
    capture,
    reservation: {
      checkout: session.checkout,
      orderDocId,
      orderRef,
      session,
      sessionRef,
    },
  });
});

class WebhookRetryError extends Error {
  constructor(message) {
    super(message);
    this.name = "WebhookRetryError";
  }
}

const webhookEventRefFor = (eventId) => db.collection(WEBHOOK_COLLECTION).doc(eventId);

const webhookEventFactsFor = (event, rawBody) => {
  const eventId = assertPayPalResourceId(event?.id, "webhook event");
  const eventType = cleanText(event?.event_type);

  if (!/^[A-Z0-9._-]{3,120}$/.test(eventType)) {
    throw new HttpsError("invalid-argument", "PayPal webhook event type is invalid.");
  }

  const resource = event?.resource && typeof event.resource === "object"
    ? event.resource
    : {};
  const relatedIds = resource.supplementary_data?.related_ids || {};
  const resourceId = cleanText(resource.id);
  const relatedOrderId = cleanText(relatedIds.order_id);
  const relatedCaptureId = cleanText(relatedIds.capture_id);
  const sourcePaymentId = eventType.startsWith("PAYMENT.CAPTURE.")
    ? resourceId
    : relatedCaptureId;

  if (resourceId) {
    assertPayPalResourceId(resourceId, "webhook resource");
  }

  if (relatedOrderId) {
    assertPayPalOrderId(relatedOrderId);
  }

  if (sourcePaymentId) {
    assertPayPalResourceId(sourcePaymentId, "capture");
  }

  return {
    bodyHash: sha256(Buffer.isBuffer(rawBody) ? rawBody : String(rawBody || "")),
    eventCreatedAt: truncate(event?.create_time, 80),
    eventId,
    eventType,
    resourceId,
    sourceOrderId: relatedOrderId,
    sourcePaymentId,
  };
};

const claimPayPalWebhookEvent = async (facts) => {
  const eventRef = webhookEventRefFor(facts.eventId);
  const leaseId = crypto.randomBytes(24).toString("hex");
  const leaseExpiresAt = Timestamp.fromMillis(Date.now() + WEBHOOK_PROCESSING_LEASE_MS);
  let result = null;

  await db.runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    const existing = eventSnapshot.data() || {};

    if (["ignored", "processed", "review"].includes(existing.processingState)) {
      result = {
        claimed: false,
        eventRef,
        state: existing.processingState,
      };
      return;
    }

    if (
      existing.processingState === "processing"
      && millisFromTimestamp(existing.processingLeaseExpiresAt) > Date.now()
    ) {
      result = { claimed: false, eventRef, state: "processing" };
      return;
    }

    transaction.set(eventRef, {
      attemptCount: Number(existing.attemptCount || 0) + 1,
      bodyHash: existing.bodyHash || facts.bodyHash,
      createdAt: existing.createdAt || FieldValue.serverTimestamp(),
      eventCreatedAt: facts.eventCreatedAt,
      eventType: facts.eventType,
      failureReason: "",
      lastAttemptAt: FieldValue.serverTimestamp(),
      processingLeaseExpiresAt: leaseExpiresAt,
      processingLeaseId: leaseId,
      processingState: "processing",
      provider: "paypal",
      receivedAt: existing.receivedAt || FieldValue.serverTimestamp(),
      resourceId: facts.resourceId,
      reviewCode: "",
      reviewReason: "",
      reviewRequired: false,
      sourceOrderId: facts.sourceOrderId,
      sourcePaymentId: facts.sourcePaymentId,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    result = { claimed: true, eventRef, leaseId, state: "processing" };
  });

  return result;
};

const finishPayPalWebhookEvent = async ({ claim, facts, outcome }) => {
  let completed = false;

  await db.runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(claim.eventRef);
    const eventRecord = eventSnapshot.data() || {};

    if (!eventSnapshot.exists || eventRecord.processingLeaseId !== claim.leaseId) {
      return;
    }

    transaction.update(claim.eventRef, {
      failureReason: "",
      processedAt: FieldValue.serverTimestamp(),
      processingLeaseExpiresAt: FieldValue.delete(),
      processingLeaseId: FieldValue.delete(),
      processingState: outcome.state,
      resourceId: outcome.resourceId || facts.resourceId,
      reviewCode: outcome.code || "",
      reviewKey: outcome.reviewKey || "",
      reviewReason: outcome.reason || "",
      reviewRequired: outcome.state === "review",
      sourceOrderId: outcome.sourceOrderId || facts.sourceOrderId,
      sourcePaymentId: outcome.sourcePaymentId || facts.sourcePaymentId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    completed = true;
  });

  return completed;
};

const failPayPalWebhookEvent = async ({ claim, error }) => {
  await db.runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(claim.eventRef);
    const eventRecord = eventSnapshot.data() || {};

    if (!eventSnapshot.exists || eventRecord.processingLeaseId !== claim.leaseId) {
      return;
    }

    transaction.update(claim.eventRef, {
      failureReason: truncate(error.message || "Webhook processing failed.", 240),
      lastFailedAt: FieldValue.serverTimestamp(),
      processingLeaseExpiresAt: FieldValue.delete(),
      processingLeaseId: FieldValue.delete(),
      processingState: "failed",
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

const releaseWebhookCheckoutLease = async ({ leaseId, sessionRef }) => {
  await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);

    if (!sessionSnapshot.exists || sessionSnapshot.data()?.captureLeaseId !== leaseId) {
      return;
    }

    transaction.update(sessionRef, {
      captureLeaseAcquiredAt: FieldValue.delete(),
      captureLeaseExpiresAt: FieldValue.delete(),
      captureLeaseId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

const acquireWebhookCheckoutLease = async ({ captureId, leaseId, orderID }) => {
  const orderDocId = checkoutDocIdFor(orderID);
  const orderRef = db.collection("orders").doc(orderDocId);
  const sessionRef = checkoutSessionRefFor(orderID);
  const leaseExpiresAt = Timestamp.fromMillis(Date.now() + CAPTURE_LEASE_MS);
  let result = null;

  await db.runTransaction(async (transaction) => {
    const [orderSnapshot, sessionSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(sessionRef),
    ]);

    if (orderSnapshot.exists) {
      const order = orderSnapshot.data() || {};

      if (
        isFinalizedPayPalOrder(order, orderID)
        && cleanText(order.sourcePaymentId) === captureId
      ) {
        result = { kind: "processed", orderDocId, orderRef, sessionRef };
      } else {
        result = {
          code: "paid_order_reference_mismatch",
          kind: "review",
          orderDocId,
          orderRef,
          reason: "A paid order exists, but its PayPal identifiers do not match this webhook.",
          sessionRef,
        };
      }
      return;
    }

    if (!sessionSnapshot.exists) {
      result = {
        code: "checkout_session_missing",
        kind: "review",
        orderDocId,
        orderRef,
        reason: "PayPal reports a completed payment without a matching checkout session.",
        sessionRef: null,
      };
      return;
    }

    const session = sessionSnapshot.data() || {};

    if (session.provider !== "paypal" || session.sourceOrderId !== orderID) {
      result = {
        code: "checkout_reference_mismatch",
        kind: "review",
        orderDocId,
        orderRef,
        reason: "The checkout session does not match the PayPal webhook order.",
        sessionRef,
      };
      return;
    }

    if (
      cleanText(session.paypal?.captureId)
      && session.paypal.captureId !== captureId
    ) {
      result = {
        code: "capture_reference_mismatch",
        kind: "review",
        orderDocId,
        orderRef,
        reason: "The checkout session references a different PayPal capture.",
        sessionRef,
      };
      return;
    }

    if (session.inventoryState !== "reserved") {
      result = {
        code: "paid_without_reservation",
        kind: "review",
        orderDocId,
        orderRef,
        reason: "PayPal reports a completed payment without a matching inventory reservation.",
        sessionRef,
      };
      return;
    }

    if (hasActiveCaptureLease(session) && session.captureLeaseId !== leaseId) {
      result = { kind: "busy", orderDocId, orderRef, sessionRef };
      return;
    }

    transaction.update(sessionRef, {
      captureLeaseAcquiredAt: FieldValue.serverTimestamp(),
      captureLeaseExpiresAt: leaseExpiresAt,
      captureLeaseId: leaseId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    result = {
      checkout: session.checkout,
      kind: "acquired",
      orderDocId,
      orderRef,
      session: {
        ...session,
        captureLeaseExpiresAt: leaseExpiresAt,
        captureLeaseId: leaseId,
      },
      sessionRef,
    };
  });

  return result;
};

const completedWebhookReviewOutcome = ({ code, facts, reason }) => ({
  code,
  reason,
  resourceId: facts.resourceId,
  reviewKey: `${facts.eventType}:${facts.sourcePaymentId || facts.resourceId}`,
  sourceOrderId: facts.sourceOrderId,
  sourcePaymentId: facts.sourcePaymentId,
  state: "review",
});

const processCompletedCaptureWebhook = async ({ facts, webhookLeaseId }) => {
  if (!facts.sourceOrderId || !facts.sourcePaymentId) {
    return completedWebhookReviewOutcome({
      code: "completed_identifiers_missing",
      facts,
      reason: "The completed PayPal webhook is missing its order or capture identifier.",
    });
  }

  const checkoutLeaseId = `webhook_${webhookLeaseId}`;
  const context = await acquireWebhookCheckoutLease({
    captureId: facts.sourcePaymentId,
    leaseId: checkoutLeaseId,
    orderID: facts.sourceOrderId,
  });

  if (context.kind === "processed") {
    return {
      code: "already_finalized",
      reason: "",
      resourceId: facts.resourceId,
      reviewKey: "",
      sourceOrderId: facts.sourceOrderId,
      sourcePaymentId: facts.sourcePaymentId,
      state: "processed",
    };
  }

  if (context.kind === "busy") {
    throw new WebhookRetryError("Checkout capture is still owned by another active process.");
  }

  if (context.kind === "review") {
    if (context.sessionRef) {
      await markCheckoutNeedsReview({
        code: context.code,
        reason: context.reason,
        sessionRef: context.sessionRef,
      });
    }

    return completedWebhookReviewOutcome({
      code: context.code,
      facts,
      reason: context.reason,
    });
  }

  let capture;

  try {
    capture = await paypalWebhookRequest(
      `/v2/checkout/orders/${encodeURIComponent(facts.sourceOrderId)}`,
      { method: "GET" },
    );
  } catch (error) {
    await releaseWebhookCheckoutLease({
      leaseId: checkoutLeaseId,
      sessionRef: context.sessionRef,
    });
    throw new WebhookRetryError("PayPal order retrieval failed during webhook recovery.");
  }

  let captureFacts;

  try {
    verifyPayPalOrderSnapshot({
      checkout: context.checkout,
      order: capture,
      orderID: facts.sourceOrderId,
      snapshotHash: context.session.snapshotHash,
    });
    captureFacts = verifiedCaptureFor({
      capture,
      checkout: context.checkout,
      orderID: facts.sourceOrderId,
      snapshotHash: context.session.snapshotHash,
    });

    if (captureFacts.captureId !== facts.sourcePaymentId) {
      throw new HttpsError("data-loss", "PayPal returned a different capture for this webhook.");
    }
  } catch (error) {
    const updated = await markCheckoutNeedsReview({
      clearLease: true,
      code: error.code || "webhook_capture_verification_failed",
      expectedLeaseId: checkoutLeaseId,
      reason: error.message || "Webhook capture verification failed.",
      sessionRef: context.sessionRef,
    });

    if (!updated) {
      throw new WebhookRetryError("Checkout recovery ownership changed during verification.");
    }

    return completedWebhookReviewOutcome({
      code: error.code || "webhook_capture_verification_failed",
      facts,
      reason: error.message || "Webhook capture verification failed.",
    });
  }

  try {
    await recordVerifiedCapture({
      captureFacts,
      expectedLeaseId: checkoutLeaseId,
      sessionRef: context.sessionRef,
    });
    await finalizeCapturedCheckout({
      capture,
      orderDocId: context.orderDocId,
      orderRef: context.orderRef,
      sessionRef: context.sessionRef,
    });
  } catch (error) {
    logger.error("Verified PayPal webhook could not finalize checkout", {
      error: error.message,
      orderID: facts.sourceOrderId,
    });
    await markCheckoutNeedsReview({
      clearLease: true,
      code: error.code || "webhook_finalization_failed",
      reason: "A verified payment still needs order-ledger finalization.",
      sessionRef: context.sessionRef,
      status: "captured_pending_finalize",
    });
    throw new WebhookRetryError("Verified payment could not be finalized.");
  }

  return {
    code: "capture_finalized",
    reason: "",
    resourceId: facts.resourceId,
    reviewKey: "",
    sourceOrderId: facts.sourceOrderId,
    sourcePaymentId: facts.sourcePaymentId,
    state: "processed",
  };
};

const reviewReasonForWebhookEvent = (eventType) => ({
  "PAYMENT.CAPTURE.DECLINED": "PayPal reports a declined capture. Confirm payment status before releasing a reservation.",
  "PAYMENT.CAPTURE.PENDING": "PayPal reports a pending capture. Do not request a second payment.",
  "PAYMENT.CAPTURE.REFUNDED": "PayPal reports a refund. Inventory and event seats were not changed automatically.",
  "PAYMENT.CAPTURE.REVERSED": "PayPal reports a reversed capture. Inventory and event seats were not changed automatically.",
  "PAYMENT.REFUND.FAILED": "PayPal reports a failed refund. Review the payment before changing inventory.",
  "PAYMENT.REFUND.PENDING": "PayPal reports a pending refund. Inventory and event seats were not changed automatically.",
}[eventType] || "This verified PayPal payment event needs manual review.");

const resolveWebhookReviewIdentifiers = async (facts) => {
  let sourceOrderId = facts.sourceOrderId;

  if (!sourceOrderId && facts.sourcePaymentId) {
    const referenceSnapshot = await paymentReferenceRefForCapture(facts.sourcePaymentId).get();
    const reference = referenceSnapshot.data() || {};

    if (
      referenceSnapshot.exists
      && reference.provider === "paypal"
      && reference.providerCaptureId === facts.sourcePaymentId
    ) {
      sourceOrderId = cleanText(reference.providerOrderId);
    }
  }

  return {
    code: facts.eventType.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    reason: reviewReasonForWebhookEvent(facts.eventType),
    resourceId: facts.resourceId,
    reviewKey: `${facts.eventType}:${facts.sourcePaymentId || facts.resourceId}`,
    sourceOrderId,
    sourcePaymentId: facts.sourcePaymentId,
    state: "review",
  };
};

const webhookHeadersFor = (request) => ({
  authAlgo: request.get("paypal-auth-algo"),
  certUrl: request.get("paypal-cert-url"),
  transmissionId: request.get("paypal-transmission-id"),
  transmissionSignature: request.get("paypal-transmission-sig"),
  transmissionTime: request.get("paypal-transmission-time"),
});

const sendWebhookJson = (response, status, payload) => {
  response.set("Cache-Control", "no-store");
  response.status(status).json(payload);
};

exports.paypalWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.set("Allow", "POST");
    sendWebhookJson(response, 405, { received: false });
    return;
  }

  let event;
  let facts;
  let claim;

  try {
    assertPaypalWebhookEnabled();
    event = request.body;

    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throw new HttpsError("invalid-argument", "The PayPal webhook body is invalid.");
    }

    const verified = await verifyPayPalWebhook({
      event,
      headers: webhookHeadersFor(request),
      rawEventBody: request.rawBody,
    });

    if (!verified) {
      sendWebhookJson(response, 401, { received: false });
      return;
    }

    facts = webhookEventFactsFor(event, request.rawBody);
    claim = await claimPayPalWebhookEvent(facts);

    if (!claim.claimed) {
      const status = claim.state === "processing" ? 409 : 200;
      sendWebhookJson(response, status, {
        duplicate: status === 200,
        received: status === 200,
        state: claim.state,
      });
      return;
    }

    let outcome;

    if (facts.eventType === PAYPAL_CAPTURE_COMPLETED) {
      outcome = await processCompletedCaptureWebhook({
        facts,
        webhookLeaseId: claim.leaseId,
      });
    } else if (PAYPAL_REVIEW_EVENT_TYPES.has(facts.eventType)) {
      outcome = await resolveWebhookReviewIdentifiers(facts);
    } else {
      outcome = {
        code: "event_not_subscribed",
        reason: "",
        resourceId: facts.resourceId,
        reviewKey: "",
        sourceOrderId: facts.sourceOrderId,
        sourcePaymentId: facts.sourcePaymentId,
        state: "ignored",
      };
    }

    const completed = await finishPayPalWebhookEvent({ claim, facts, outcome });

    if (!completed) {
      sendWebhookJson(response, 409, { received: false, state: "ownership_changed" });
      return;
    }

    sendWebhookJson(response, 200, {
      received: true,
      state: outcome.state,
    });
  } catch (error) {
    if (claim?.claimed) {
      await failPayPalWebhookEvent({ claim, error });
    }

    logger.error("PayPal webhook processing failed", {
      error: error.message,
      eventId: facts?.eventId || "unverified",
    });

    if (error instanceof WebhookRetryError || error instanceof PayPalGatewayError) {
      sendWebhookJson(response, 503, { received: false });
      return;
    }

    if (error instanceof HttpsError && error.code === "invalid-argument") {
      sendWebhookJson(response, 400, { received: false });
      return;
    }

    if (error instanceof HttpsError && error.code === "failed-precondition") {
      sendWebhookJson(response, 503, { received: false });
      return;
    }

    sendWebhookJson(response, 500, { received: false });
  }
});
