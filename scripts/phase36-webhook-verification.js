const crypto = require("crypto");
const admin = require("../functions/node_modules/firebase-admin");
const { deleteApp, initializeApp } = require("firebase/app");
const {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
} = require("firebase/auth");
const {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} = require("firebase/firestore");

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "";
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || "";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "";
const functionsHost = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST
  || process.env.FUNCTIONS_EMULATOR_HOST
  || "";
const paypalApiBase = process.env.PAYPAL_API_BASE_URL || "";
const webhookUrl = `http://127.0.0.1:5001/${projectId}/us-central1/paypalWebhook`;
const adminAppName = "phase36-webhook-verification";
const adminUid = "phase36-qa-admin";
const adminEmail = "phase36-admin@local.test";
const adminPassword = "phase36-emulator-only-password";
const fixturePrefix = "phase36-";
const webhookPrefix = "WH-PHASE36-";
const timestamp = admin.firestore.Timestamp;
let identitySequence = 0;
let transmissionSequence = 0;

const productIds = {
  mismatch: "phase36-product-mismatch",
  noReservation: "phase36-product-no-reservation",
  recovery: "phase36-product-recovery",
  retry: "phase36-product-retry",
};
const eventIds = {
  recovery: "phase36-event-recovery",
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertIsolatedEmulators = () => {
  assert(projectId === "demo-calabash-gardens", "Phase 36 requires the exact demo project ID.");
  assert(firestoreHost === "127.0.0.1:8080", "Phase 36 requires the local Firestore emulator.");
  assert(authHost === "127.0.0.1:9099", "Phase 36 requires the local Auth emulator.");
  assert(functionsHost === "127.0.0.1:5001", "Phase 36 requires the local Functions emulator.");
  assert(paypalApiBase === "http://127.0.0.1:8787", "Phase 36 requires the loopback PayPal mock.");
};

assertIsolatedEmulators();

const adminApp = admin.initializeApp({ projectId }, adminAppName);
const adminAuth = adminApp.auth();
const adminDb = adminApp.firestore();

const daysFromNow = (days) => timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000);

const productVariant = (productId, overrides = {}) => ({
  active: true,
  id: "jar",
  inventoryTracked: true,
  label: "Jar",
  lowStockThreshold: 2,
  price: "15.00",
  priceOptionIndex: 0,
  sku: `${productId.toUpperCase()}-JAR`,
  sortOrder: 0,
  stockOnHand: 5,
  ...overrides,
});

const productFixture = (productId, overrides = {}) => ({
  category: "culinary",
  createdAt: timestamp.now(),
  inStock: true,
  isActive: true,
  photos: [],
  priceOptions: [{ option: "Jar", price: "15.00" }],
  published: true,
  shipping: "17.00",
  title: productId.replace(/-/g, " "),
  updatedAt: timestamp.now(),
  variants: [productVariant(productId)],
  ...overrides,
});

const eventFixture = (eventId) => ({
  capacity: 30,
  category: "Experience",
  createdAt: timestamp.now(),
  date: daysFromNow(30),
  eventDates: ["Phase 36 Session"],
  info: ["Emulator-only webhook fixture."],
  inStock: true,
  isActive: true,
  manualSeatsReserved: 2,
  photos: [],
  priceOptions: ["60.00"],
  published: true,
  shipping: "0.00",
  ticketsSold: 5,
  title: eventId.replace(/-/g, " "),
  updatedAt: timestamp.now(),
  waitlistEnabled: false,
});

const deleteMatchingDocuments = async (collectionName, matches) => {
  const snapshot = await adminDb.collection(collectionName).get();
  const matching = snapshot.docs.filter(matches);

  for (let index = 0; index < matching.length; index += 400) {
    const batch = adminDb.batch();
    matching.slice(index, index + 400).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
};

const clearFixtures = async () => {
  const checkoutSnapshot = await adminDb.collection("paypalCheckouts").get();
  const phase36Checkouts = checkoutSnapshot.docs.filter((document) => (
    String(document.data()?.checkoutAttemptId || "").startsWith(fixturePrefix)
  ));
  const sourceOrderIds = new Set(phase36Checkouts
    .map((document) => String(document.data()?.sourceOrderId || ""))
    .filter(Boolean));
  const batch = adminDb.batch();
  phase36Checkouts.forEach((document) => batch.delete(document.ref));
  await batch.commit();

  await deleteMatchingDocuments("products", (document) => document.id.startsWith(fixturePrefix));
  await deleteMatchingDocuments("events", (document) => document.id.startsWith(fixturePrefix));
  await deleteMatchingDocuments("orders", (document) => (
    sourceOrderIds.has(String(document.data()?.sourceOrderId || ""))
    || (document.data()?.items || []).some((item) => String(item.linkedId || "").startsWith(fixturePrefix))
  ));
  await deleteMatchingDocuments("inventoryMovements", (document) => (
    document.id.startsWith(fixturePrefix)
    || String(document.data()?.linkedId || "").startsWith(fixturePrefix)
  ));
  await deleteMatchingDocuments("paymentReferences", (document) => (
    sourceOrderIds.has(String(document.data()?.providerOrderId || ""))
  ));
  await deleteMatchingDocuments("paypalWebhookEvents", (document) => (
    document.id.startsWith(webhookPrefix)
    || document.id.startsWith(fixturePrefix)
  ));
  await adminDb.doc(`adminUsers/${adminUid}`).delete();

  try {
    await adminAuth.deleteUser(adminUid);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }
  }
};

const seedFixtures = async () => {
  await clearFixtures();
  await adminAuth.createUser({
    displayName: "Phase 36 QA Admin",
    email: adminEmail,
    emailVerified: true,
    password: adminPassword,
    uid: adminUid,
  });

  const batch = adminDb.batch();
  batch.set(adminDb.doc(`adminUsers/${adminUid}`), {
    active: true,
    createdAt: timestamp.now(),
    displayName: "Phase 36 QA Admin",
    email: adminEmail,
    role: "admin",
    updatedAt: timestamp.now(),
  });
  batch.set(adminDb.doc(`products/${productIds.recovery}`), productFixture(productIds.recovery));
  batch.set(adminDb.doc(`products/${productIds.mismatch}`), productFixture(productIds.mismatch, {
    variants: [productVariant(productIds.mismatch, { stockOnHand: 3 })],
  }));
  batch.set(adminDb.doc(`products/${productIds.noReservation}`), productFixture(productIds.noReservation, {
    variants: [productVariant(productIds.noReservation, { stockOnHand: 4 })],
  }));
  batch.set(adminDb.doc(`products/${productIds.retry}`), productFixture(productIds.retry, {
    variants: [productVariant(productIds.retry, { stockOnHand: 2 })],
  }));
  batch.set(adminDb.doc(`events/${eventIds.recovery}`), eventFixture(eventIds.recovery));
  await batch.commit();
};

const opaqueValue = (label) => {
  identitySequence += 1;
  return `${fixturePrefix}${label}-${crypto.createHash("sha256")
    .update(`${label}-${identitySequence}`)
    .digest("hex")}`.slice(0, 150);
};

const productItem = (productId) => ({
  category: "culinary",
  key: `${productId}-0`,
  price: "15.00",
  productId,
  quantity: 1,
  shipping: "17.00",
  sku: `${productId.toUpperCase()}-JAR`,
  title: productId.replace(/-/g, " "),
  variantId: "jar",
});

const eventItem = (eventId) => ({
  adultTickets: 2,
  capacityGroupKey: `${eventId} Phase 36 Session`,
  category: "Experience",
  childTickets: 0,
  eventId,
  key: `${eventId}-tickets`,
  price: "120.00",
  quantity: 1,
  seatsPerCartUnit: 2,
  shipping: "0.00",
  title: eventId.replace(/-/g, " "),
});

const payloadFor = (cartItems) => {
  const subtotal = cartItems.reduce(
    (total, item) => total + Number(item.price) * Number(item.quantity || 1),
    0,
  );
  const shipping = Math.min(
    17,
    cartItems.reduce((total, item) => total + Number(item.shipping || 0), 0),
  );

  return {
    cartItems,
    shipping: shipping.toFixed(2),
    shippingPreference: shipping > 0 ? "GET_FROM_FILE" : "NO_SHIPPING",
    subtotal: subtotal.toFixed(2),
    total: (subtotal + shipping).toFixed(2),
  };
};

const mockRequest = async (path, options = {}) => {
  const response = await fetch(`${paypalApiBase}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal mock request failed: ${response.status}`);
  }

  return payload;
};

const resetMock = () => mockRequest("/__reset", { method: "POST" });
const mockState = () => mockRequest("/__state");
const configureMock = (payload) => mockRequest("/__control", {
  body: JSON.stringify(payload),
  method: "POST",
});
const mockOrder = (orderID) => mockRequest(`/v2/checkout/orders/${encodeURIComponent(orderID)}`);

const invokeCallable = async (name, data) => {
  const response = await fetch(
    `http://127.0.0.1:5001/${projectId}/us-central1/${name}`,
    {
      body: JSON.stringify({ data }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `Callable ${name} failed.`);
  }

  return payload.result ?? payload.data;
};

const createCheckout = async (cartItems, label) => {
  const checkoutAttemptId = opaqueValue(`${label}-attempt`);
  const checkoutToken = opaqueValue(`${label}-token`);
  const result = await invokeCallable("createPayPalOrder", {
    ...payloadFor(cartItems),
    checkoutAttemptId,
    checkoutToken,
  });

  return { checkoutAttemptId, checkoutToken, orderID: result.orderID };
};

const createInterruptedCapture = async (cartItems, label) => {
  const checkout = await createCheckout(cartItems, label);
  const sessionRef = adminDb.doc(`paypalCheckouts/paypal_${checkout.orderID}`);
  await sessionRef.update({ testFailureMode: "finalize_once" });
  const result = await invokeCallable("capturePayPalOrder", {
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
  });
  const sessionSnapshot = await sessionRef.get();
  const captureId = String(sessionSnapshot.data()?.paypal?.captureId || "");

  assert(result.status === "processing", "Injected capture must remain pending finalization.");
  assert(captureId, "Injected capture must persist the PayPal capture ID.");

  return { ...checkout, captureId, sessionRef };
};

const webhookEvent = ({ captureId = "", eventId, eventType, orderID = "", resourceId = "" }) => {
  const relatedIds = {};

  if (orderID) {
    relatedIds.order_id = orderID;
  }

  if (captureId && !eventType.startsWith("PAYMENT.CAPTURE.")) {
    relatedIds.capture_id = captureId;
  }

  return {
    create_time: "2026-08-26T12:00:00.000Z",
    event_type: eventType,
    event_version: "1.0",
    id: eventId,
    resource: {
      id: resourceId || captureId || "PHASE36RESOURCE",
      status: eventType.endsWith("COMPLETED") ? "COMPLETED" : "PENDING",
      supplementary_data: { related_ids: relatedIds },
    },
    resource_type: eventType.startsWith("PAYMENT.REFUND.") ? "refund" : "capture",
    resource_version: "2.0",
    summary: "Phase 36 emulator-only webhook.",
  };
};

const sendWebhook = async (event, options = {}) => {
  transmissionSequence += 1;
  const body = options.pretty ? JSON.stringify(event, null, 2) : JSON.stringify(event);
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex");
  const signature = options.validSignature === false
    ? "invalid-signature"
    : `valid-signature-${bodyHash}`;
  const response = await fetch(webhookUrl, {
    body,
    headers: {
      "Content-Type": "application/json",
      "PayPal-Auth-Algo": "SHA256withRSA",
      "PayPal-Cert-Url": "https://api.paypal.com/certs/phase36-test.pem",
      "PayPal-Transmission-Id": `phase36-transmission-${transmissionSequence}`,
      "PayPal-Transmission-Sig": signature,
      "PayPal-Transmission-Time": "2026-08-26T12:00:00Z",
    },
    method: "POST",
  });
  const payload = await response.json();

  return { payload, status: response.status };
};

const sessionFor = (orderID) => adminDb.doc(`paypalCheckouts/paypal_${orderID}`).get();
const orderFor = (orderID) => adminDb.doc(`orders/paypal_${orderID}`).get();
const webhookRecordFor = (eventId) => adminDb.doc(`paypalWebhookEvents/${eventId}`).get();
const stockFor = async (productId) => (
  (await adminDb.doc(`products/${productId}`).get()).data()?.variants?.[0]?.stockOnHand
);
const movementCountFor = async (orderID) => {
  const snapshot = await adminDb.collection("inventoryMovements").get();
  return snapshot.docs.filter((document) => document.data()?.orderId === `paypal_${orderID}`).length;
};

const waitFor = async (label, predicate, timeoutMs = 8000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }

  throw new Error(`${label} timed out.`);
};

const verifySignatureAndUnknownEvent = async () => {
  const invalidEvent = webhookEvent({
    eventId: `${webhookPrefix}INVALID`,
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    orderID: "PHASE36MISSINGORDER",
    resourceId: "PHASE36MISSINGCAPTURE",
  });
  const invalid = await sendWebhook(invalidEvent, { validSignature: false });
  assert(invalid.status === 401, "An invalid webhook signature must be rejected.");
  assert(!(await webhookRecordFor(invalidEvent.id)).exists, "Invalid webhooks must not write an event record.");

  const unknownEvent = webhookEvent({
    eventId: `${webhookPrefix}UNKNOWN`,
    eventType: "CHECKOUT.ORDER.APPROVED",
    orderID: "PHASE36UNKNOWNORDER",
    resourceId: "PHASE36UNKNOWNRESOURCE",
  });
  const first = await sendWebhook(unknownEvent, { pretty: true });
  const second = await sendWebhook(unknownEvent, { pretty: true });
  const saved = await webhookRecordFor(unknownEvent.id);
  assert(first.status === 200 && first.payload.state === "ignored", "Unknown verified events must be ignored durably.");
  assert(second.status === 200 && second.payload.duplicate === true, "Duplicate ignored events must be idempotent.");
  assert(saved.data()?.processingState === "ignored", "Unknown event must remain recorded as ignored.");
  assert(saved.data()?.attemptCount === 1, "A terminal duplicate must not be processed twice.");

  return { exactRawBodyVerified: true, invalidRejected: true, unknownIgnoredOnce: true };
};

const verifyConcurrentCaptureRecovery = async () => {
  const checkout = await createInterruptedCapture([
    productItem(productIds.recovery),
    eventItem(eventIds.recovery),
  ], "concurrent-recovery");
  assert(await stockFor(productIds.recovery) === 4, "Capture reservation must decrement product stock once.");
  assert(!(await orderFor(checkout.orderID)).exists, "Interrupted capture must initially omit the order ledger.");

  const event = webhookEvent({
    captureId: checkout.captureId,
    eventId: `${webhookPrefix}RECOVERY`,
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    orderID: checkout.orderID,
  });
  const responses = await Promise.all(Array.from({ length: 4 }, () => sendWebhook(event)));
  assert(responses.every((result) => [200, 409].includes(result.status)), "Concurrent deliveries must complete or retry safely.");
  await waitFor("webhook order finalization", async () => (await orderFor(checkout.orderID)).exists);
  const duplicate = await sendWebhook(event);
  const session = await sessionFor(checkout.orderID);
  const savedEvent = await webhookRecordFor(event.id);
  const savedOrder = await orderFor(checkout.orderID);
  const paymentReference = await adminDb.doc(`paymentReferences/paypal_capture_${checkout.captureId}`).get();
  const savedCapacity = (await adminDb.doc(`events/${eventIds.recovery}`).get()).data();

  assert(duplicate.status === 200 && duplicate.payload.duplicate === true, "A completed webhook duplicate must be acknowledged.");
  assert(savedEvent.data()?.processingState === "processed", "Capture webhook must finish as processed.");
  assert(session.data()?.status === "paid" && session.data()?.inventoryState === "committed", "Recovered checkout must commit.");
  assert(savedOrder.data()?.sourcePaymentId === checkout.captureId, "Recovered order must retain the capture ID.");
  assert(paymentReference.data()?.orderId === `paypal_${checkout.orderID}`, "Capture reference must point to the order.");
  assert(await stockFor(productIds.recovery) === 4, "Concurrent webhooks must not decrement stock again.");
  assert(savedCapacity.ticketsSold === 7, "Concurrent webhooks must not add event seats again.");
  assert(await movementCountFor(checkout.orderID) === 2, "Recovery must write one movement per line.");

  return {
    captureId: checkout.captureId,
    checkout,
    concurrentDeliveries: responses.length,
    orderID: checkout.orderID,
  };
};

const verifyMismatchAndNoReservation = async () => {
  const mismatchCheckout = await createInterruptedCapture(
    [productItem(productIds.mismatch)],
    "capture-mismatch",
  );
  const beforeMismatch = await stockFor(productIds.mismatch);
  const mismatchEvent = webhookEvent({
    captureId: "WRONGCAPTURE123",
    eventId: `${webhookPrefix}MISMATCH`,
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    orderID: mismatchCheckout.orderID,
  });
  const mismatch = await sendWebhook(mismatchEvent);
  const mismatchRecord = await webhookRecordFor(mismatchEvent.id);
  assert(mismatch.status === 200 && mismatch.payload.state === "review", "Capture mismatch must enter review.");
  assert(mismatchRecord.data()?.reviewCode === "capture_reference_mismatch", "Mismatch review needs a precise reason.");
  assert(await stockFor(productIds.mismatch) === beforeMismatch, "Mismatch review must not change reserved inventory.");
  assert(!(await orderFor(mismatchCheckout.orderID)).exists, "Mismatch review must not write an order.");

  const noReservationCheckout = await createCheckout(
    [productItem(productIds.noReservation)],
    "no-reservation",
  );
  await configureMock({ completeOrderId: noReservationCheckout.orderID });
  const completedProviderOrder = await mockOrder(noReservationCheckout.orderID);
  const noReservationCaptureId = completedProviderOrder.purchase_units[0].payments.captures[0].id;
  const noReservationEvent = webhookEvent({
    captureId: noReservationCaptureId,
    eventId: `${webhookPrefix}NO-RESERVATION`,
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    orderID: noReservationCheckout.orderID,
  });
  const noReservation = await sendWebhook(noReservationEvent);
  const noReservationSession = await sessionFor(noReservationCheckout.orderID);
  assert(noReservation.status === 200 && noReservation.payload.state === "review", "Paid-without-reservation must enter review.");
  assert(await stockFor(productIds.noReservation) === 4, "A webhook must not invent a late inventory decrement.");
  assert(noReservationSession.data()?.status === "needs_review", "The checkout must remain visible for payment review.");
  assert(!(await orderFor(noReservationCheckout.orderID)).exists, "Paid-without-reservation must not write an order.");

  const missingSessionEvent = webhookEvent({
    captureId: "PHASE36ORPHANCAPTURE",
    eventId: `${webhookPrefix}NO-SESSION`,
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    orderID: "PHASE36ORPHANORDER",
  });
  const missingSession = await sendWebhook(missingSessionEvent);
  assert(missingSession.status === 200 && missingSession.payload.state === "review", "Orphan captures must enter review.");

  return {
    mismatchReview: mismatchRecord.data()?.reviewCode,
    noLateDecrement: true,
    orphanReview: true,
  };
};

const verifyRetryAfterProviderFailure = async () => {
  const checkout = await createInterruptedCapture(
    [productItem(productIds.retry)],
    "provider-retry",
  );
  await configureMock({
    retrieveFailureOrderId: checkout.orderID,
    retrieveFailuresRemaining: 1,
  });
  const event = webhookEvent({
    captureId: checkout.captureId,
    eventId: `${webhookPrefix}RETRY`,
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    orderID: checkout.orderID,
  });
  const first = await sendWebhook(event);
  const failedRecord = await webhookRecordFor(event.id);
  const failedSession = await sessionFor(checkout.orderID);
  assert(first.status === 503, "Transient PayPal failure must request webhook retry.");
  assert(failedRecord.data()?.processingState === "failed", "Transient failure must remain retryable.");
  assert(!failedSession.data()?.captureLeaseId, "Transient failure must release only its own checkout lease.");
  assert(await stockFor(productIds.retry) === 1, "Transient failure must retain the reservation.");
  assert(!(await orderFor(checkout.orderID)).exists, "Transient failure must not synthesize an order.");

  const second = await sendWebhook(event);
  const processedRecord = await webhookRecordFor(event.id);
  assert(second.status === 200 && second.payload.state === "processed", "PayPal retry must recover the order.");
  assert(processedRecord.data()?.attemptCount === 2, "Retry must increment the processing attempt count once.");
  assert((await orderFor(checkout.orderID)).exists, "Retry must finalize the order.");
  assert(await stockFor(productIds.retry) === 1, "Retry must not decrement stock twice.");
  assert(await movementCountFor(checkout.orderID) === 1, "Retry must write one sale movement.");

  return { attempts: 2, orderID: checkout.orderID, recovered: true };
};

const verifyPaymentChangeReview = async (paidCheckout) => {
  const productStockBefore = await stockFor(productIds.recovery);
  const eventBefore = (await adminDb.doc(`events/${eventIds.recovery}`).get()).data();
  const refundedEvent = webhookEvent({
    captureId: paidCheckout.captureId,
    eventId: `${webhookPrefix}REFUNDED-A`,
    eventType: "PAYMENT.CAPTURE.REFUNDED",
  });
  const sameResourceEvent = webhookEvent({
    captureId: paidCheckout.captureId,
    eventId: `${webhookPrefix}REFUNDED-B`,
    eventType: "PAYMENT.CAPTURE.REFUNDED",
  });
  const reversedEvent = webhookEvent({
    captureId: paidCheckout.captureId,
    eventId: `${webhookPrefix}REVERSED`,
    eventType: "PAYMENT.CAPTURE.REVERSED",
  });
  const pendingRefundEvent = webhookEvent({
    captureId: paidCheckout.captureId,
    eventId: `${webhookPrefix}REFUND-PENDING`,
    eventType: "PAYMENT.REFUND.PENDING",
    resourceId: "PHASE36REFUND0001",
  });

  const first = await sendWebhook(refundedEvent);
  const duplicate = await sendWebhook(refundedEvent);
  const sameResource = await sendWebhook(sameResourceEvent);
  const reversed = await sendWebhook(reversedEvent);
  const pending = await sendWebhook(pendingRefundEvent);
  const firstRecord = await webhookRecordFor(refundedEvent.id);
  const sameResourceRecord = await webhookRecordFor(sameResourceEvent.id);
  const pendingRecord = await webhookRecordFor(pendingRefundEvent.id);
  const eventAfter = (await adminDb.doc(`events/${eventIds.recovery}`).get()).data();

  assert([first, sameResource, reversed, pending].every((result) => (
    result.status === 200 && result.payload.state === "review"
  )), "Payment-change events must enter review.");
  assert(duplicate.status === 200 && duplicate.payload.duplicate === true, "Duplicate refund delivery must be idempotent.");
  assert(firstRecord.data()?.sourceOrderId === paidCheckout.orderID, "Capture mapping must resolve refund review to its order.");
  assert(pendingRecord.data()?.sourceOrderId === paidCheckout.orderID, "Refund resource must resolve through its capture mapping.");
  assert(firstRecord.data()?.reviewKey === sameResourceRecord.data()?.reviewKey, "Same resource events need a stable UI review key.");
  assert(await stockFor(productIds.recovery) === productStockBefore, "Refund review must not restock products.");
  assert(eventAfter.ticketsSold === eventBefore.ticketsSold, "Refund review must not release event seats.");
  assert(await movementCountFor(paidCheckout.orderID) === 2, "Refund review must not write reversing movements.");

  return {
    duplicateRefundIgnored: true,
    inventoryUnchanged: true,
    reviewEvents: 4,
    sourceOrderId: firstRecord.data()?.sourceOrderId,
  };
};

const expectPermissionDenied = async (label, operation) => {
  let denied = false;

  try {
    await operation();
  } catch (error) {
    denied = error.code === "permission-denied";
  }

  assert(denied, `${label} must be denied by Firestore rules.`);
};

const verifyClientWriteRules = async () => {
  const clientApp = initializeApp({
    apiKey: "phase36-demo-key",
    appId: "1:123456789:web:phase36",
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
  }, `phase36-rules-${Date.now()}`);
  const clientAuth = getAuth(clientApp);
  const clientDb = getFirestore(clientApp);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);
  await signInWithEmailAndPassword(clientAuth, adminEmail, adminPassword);
  const movement = {
    capacityGroupKey: "",
    createdAt: serverTimestamp(),
    createdBy: "admin_inventory",
    lineItemId: "",
    linkedId: productIds.recovery,
    linkedType: "product",
    orderId: "",
    quantityDelta: 1,
    reason: "manual_adjustment",
    sku: `${productIds.recovery.toUpperCase()}-JAR`,
    source: "manual",
    sourcePaymentId: "",
    title: "Phase 36 manual rule check",
    variantId: "jar",
  };

  try {
    await setDoc(doc(clientDb, "inventoryMovements", `${fixturePrefix}manual-rule-check`), movement);
    await expectPermissionDenied("provider-looking inventory movement", () => setDoc(
      doc(clientDb, "inventoryMovements", `${fixturePrefix}provider-rule-check`),
      { ...movement, reason: "sale", source: "paypal_web" },
    ));
    await expectPermissionDenied("webhook event client write", () => setDoc(
      doc(clientDb, "paypalWebhookEvents", `${fixturePrefix}client-write`),
      { processingState: "processed" },
    ));
    await expectPermissionDenied("payment reference client write", () => setDoc(
      doc(clientDb, "paymentReferences", `${fixturePrefix}client-write`),
      { provider: "paypal" },
    ));
  } finally {
    await deleteApp(clientApp);
  }

  return { manualMovementAllowed: true, providerCollectionsServerOnly: true };
};

const runCheck = async (label, operation) => {
  process.stdout.write(`Phase 36: ${label}... `);
  const result = await operation();
  process.stdout.write("passed\n");
  return result;
};

const verify = async () => {
  await resetMock();
  await seedFixtures();

  try {
    const results = {};
    results.signature = await runCheck("signature and ignored-event handling", verifySignatureAndUnknownEvent);
    const captureRecovery = await runCheck("concurrent capture recovery", verifyConcurrentCaptureRecovery);
    const { checkout: paidCheckout, ...captureRecoveryReport } = captureRecovery;
    results.captureRecovery = captureRecoveryReport;
    results.mismatchAndReservation = await runCheck("mismatch and no-late-reservation review", verifyMismatchAndNoReservation);
    results.retry = await runCheck("transient provider retry", verifyRetryAfterProviderFailure);
    results.paymentChanges = await runCheck("refund and reversal review", () => verifyPaymentChangeReview(
      paidCheckout,
    ));
    results.rules = await runCheck("server-owned Firestore rules", verifyClientWriteRules);
    const state = await mockState();
    assert(state.verifyAttempts >= 12, "The matrix must exercise repeated signature verification.");
    return { mock: state, results };
  } finally {
    await clearFixtures();
  }
};

const seedManualReview = async () => {
  await resetMock();
  await seedFixtures();
  const paidCheckout = await createInterruptedCapture([
    productItem(productIds.recovery),
    eventItem(eventIds.recovery),
  ], "manual-paid-recovery");
  const completedEvent = webhookEvent({
    captureId: paidCheckout.captureId,
    eventId: `${webhookPrefix}MANUAL-PAID`,
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    orderID: paidCheckout.orderID,
  });
  const completed = await sendWebhook(completedEvent);
  assert(completed.status === 200 && completed.payload.state === "processed", "Manual paid fixture must recover.");

  const refundEvent = webhookEvent({
    captureId: paidCheckout.captureId,
    eventId: `${webhookPrefix}MANUAL-REFUND`,
    eventType: "PAYMENT.CAPTURE.REFUNDED",
  });
  const refund = await sendWebhook(refundEvent);
  assert(refund.status === 200 && refund.payload.state === "review", "Manual refund fixture must enter review.");

  const noReservationCheckout = await createCheckout(
    [productItem(productIds.noReservation)],
    "manual-no-reservation",
  );
  await configureMock({ completeOrderId: noReservationCheckout.orderID });
  const providerOrder = await mockOrder(noReservationCheckout.orderID);
  const noReservationEvent = webhookEvent({
    captureId: providerOrder.purchase_units[0].payments.captures[0].id,
    eventId: `${webhookPrefix}MANUAL-NO-RESERVATION`,
    eventType: "PAYMENT.CAPTURE.COMPLETED",
    orderID: noReservationCheckout.orderID,
  });
  const noReservation = await sendWebhook(noReservationEvent);
  assert(noReservation.status === 200 && noReservation.payload.state === "review", "Manual no-reservation fixture must enter review.");

  return {
    adminEmail,
    adminPassword,
    eventAvailability: 30 - 7 - 2,
    paidOrderID: paidCheckout.orderID,
    paidProductStock: await stockFor(productIds.recovery),
    refundEventId: refundEvent.id,
    reviewedOrderID: noReservationCheckout.orderID,
  };
};

const commands = {
  cleanup: async () => {
    await clearFixtures();
    await resetMock();
    return { cleaned: true };
  },
  "seed-manual": seedManualReview,
  verify,
};

const run = async () => {
  const command = process.argv[2];

  if (!commands[command]) {
    throw new Error(`Unknown command: ${command || "(missing)"}`);
  }

  const result = await commands[command]();
  process.stdout.write(`${JSON.stringify({ command, result }, null, 2)}\n`);
};

run()
  .catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await adminApp.delete();
  });
