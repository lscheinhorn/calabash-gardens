const crypto = require("crypto");
const admin = require("../functions/node_modules/firebase-admin");

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "";
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || "";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "";
const functionsHost = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST
  || process.env.FUNCTIONS_EMULATOR_HOST
  || "";
const paypalApiBase = process.env.PAYPAL_API_BASE_URL || "";
const adminAppName = "phase35-checkout-verification";
const adminUid = "phase35-qa-admin";
const adminEmail = "phase35-admin@local.test";
const adminPassword = "phase35-emulator-only-password";
const fixturePrefix = "phase35-";
const orderPrefix = "paypal_PHASE35ORDER";
const timestamp = admin.firestore.Timestamp;
let identitySequence = 0;

const productIds = {
  aggregate: "phase35-product-aggregate",
  concurrent: "phase35-product-concurrent",
  errorApproved: "phase35-product-error-approved",
  errorCompleted: "phase35-product-error-completed",
  failed: "phase35-product-failed",
  inactive: "phase35-product-inactive",
  leaseRace: "phase35-product-lease-race",
  main: "phase35-product-main",
  pending: "phase35-product-pending",
  race: "phase35-product-race",
  recovery: "phase35-product-recovery",
  snapshotChanged: "phase35-product-snapshot-changed",
  unapproved: "phase35-product-unapproved",
  wrongAmount: "phase35-product-wrong-amount",
  wrongCustom: "phase35-product-wrong-custom",
};

const eventIds = {
  aggregate: "phase35-event-aggregate",
  main: "phase35-event-main",
  multiDate: "phase35-event-multi-date",
  past: "phase35-event-past",
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const waitFor = async (label, predicate, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error(`${label} timed out.`);
};

const assertIsolatedEmulators = () => {
  assert(projectId === "demo-calabash-gardens", "Phase 35 requires the exact demo-calabash-gardens project ID.");
  assert(firestoreHost === "127.0.0.1:8080", "Phase 35 requires the local Firestore emulator.");
  assert(authHost === "127.0.0.1:9099", "Phase 35 requires the local Auth emulator.");
  assert(functionsHost === "127.0.0.1:5001", "Phase 35 requires the local Functions emulator.");
  assert(paypalApiBase === "http://127.0.0.1:8787", "Phase 35 requires the loopback PayPal mock.");
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
  stockOnHand: 10,
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

const eventFixture = (eventId, overrides = {}) => ({
  capacity: 30,
  category: "Experience",
  createdAt: timestamp.now(),
  date: daysFromNow(30),
  eventDates: ["Phase 35 Session"],
  info: ["Emulator-only checkout fixture."],
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
  ...overrides,
});

const deleteMatchingDocuments = async (collectionName, matches) => {
  const snapshot = await adminDb.collection(collectionName).get();
  const matching = snapshot.docs.filter((document) => matches(document));

  for (let index = 0; index < matching.length; index += 400) {
    const batch = adminDb.batch();
    matching.slice(index, index + 400).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
};

const clearFixtures = async () => {
  await deleteMatchingDocuments("products", (document) => document.id.startsWith(fixturePrefix));
  await deleteMatchingDocuments("events", (document) => document.id.startsWith(fixturePrefix));
  await deleteMatchingDocuments("orders", (document) => document.id.startsWith(orderPrefix));
  await deleteMatchingDocuments("paypalCheckouts", (document) => (
    document.id.startsWith(orderPrefix)
    || String(document.data()?.checkoutAttemptId || "").startsWith(fixturePrefix)
  ));
  await deleteMatchingDocuments("inventoryMovements", (document) => (
    String(document.data()?.linkedId || "").startsWith(fixturePrefix)
  ));
  await deleteMatchingDocuments("paymentReferences", (document) => (
    String(document.data()?.providerOrderId || "").startsWith("PHASE35ORDER")
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
    displayName: "Phase 35 QA Admin",
    email: adminEmail,
    emailVerified: true,
    password: adminPassword,
    uid: adminUid,
  });

  const batch = adminDb.batch();
  batch.set(adminDb.doc(`adminUsers/${adminUid}`), {
    active: true,
    createdAt: timestamp.now(),
    displayName: "Phase 35 QA Admin",
    email: adminEmail,
    role: "admin",
    updatedAt: timestamp.now(),
  });
  batch.set(adminDb.doc(`products/${productIds.main}`), productFixture(productIds.main));
  batch.set(adminDb.doc(`products/${productIds.aggregate}`), productFixture(productIds.aggregate, {
    variants: [productVariant(productIds.aggregate, { stockOnHand: 3 })],
  }));
  batch.set(adminDb.doc(`products/${productIds.concurrent}`), productFixture(productIds.concurrent, {
    variants: [productVariant(productIds.concurrent, { stockOnHand: 5 })],
  }));
  batch.set(adminDb.doc(`products/${productIds.inactive}`), productFixture(productIds.inactive, {
    isActive: false,
    published: false,
  }));
  batch.set(adminDb.doc(`products/${productIds.race}`), productFixture(productIds.race, {
    variants: [productVariant(productIds.race, { stockOnHand: 1 })],
  }));
  [
    productIds.errorApproved,
    productIds.errorCompleted,
    productIds.failed,
    productIds.leaseRace,
    productIds.pending,
    productIds.recovery,
    productIds.snapshotChanged,
    productIds.unapproved,
    productIds.wrongAmount,
    productIds.wrongCustom,
  ].forEach((productId) => batch.set(adminDb.doc(`products/${productId}`), productFixture(productId, {
    variants: [productVariant(productId, { stockOnHand: 2 })],
  })));
  batch.set(adminDb.doc(`events/${eventIds.main}`), eventFixture(eventIds.main));
  batch.set(adminDb.doc(`events/${eventIds.aggregate}`), eventFixture(eventIds.aggregate, {
    capacity: 3,
    manualSeatsReserved: 0,
    ticketsSold: 0,
  }));
  batch.set(adminDb.doc(`events/${eventIds.past}`), eventFixture(eventIds.past, {
    date: daysFromNow(-2),
    eventDates: ["Phase 35 Past Session"],
  }));
  batch.set(adminDb.doc(`events/${eventIds.multiDate}`), eventFixture(eventIds.multiDate, {
    eventDates: ["Phase 35 Friday", "Phase 35 Saturday"],
  }));
  await batch.commit();
};

const opaqueValue = (label) => {
  identitySequence += 1;
  return `${fixturePrefix}${label}-${crypto.createHash("sha256")
    .update(`${label}-${identitySequence}`)
    .digest("hex")}`.slice(0, 150);
};

const productItem = (productId, overrides = {}) => ({
  category: "culinary",
  key: `${productId}-0`,
  price: "15.00",
  productId,
  quantity: 1,
  shipping: "17.00",
  sku: `${productId.toUpperCase()}-JAR`,
  title: productId.replace(/-/g, " "),
  variantId: "jar",
  ...overrides,
});

const eventItem = (eventId, overrides = {}) => ({
  adultTickets: 1,
  capacityGroupKey: `${eventId} Phase 35 Session`,
  category: "Experience",
  childTickets: 0,
  eventId,
  key: `${eventId}-tickets`,
  price: "60.00",
  quantity: 1,
  seatsPerCartUnit: 1,
  shipping: "0.00",
  title: eventId.replace(/-/g, " "),
  ...overrides,
});

const payloadFor = (cartItems, overrides = {}) => {
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
    ...overrides,
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

const setMockCaptureMode = (nextCaptureMode) => mockRequest("/__control", {
  body: JSON.stringify({ nextCaptureMode }),
  method: "POST",
});

const resetMock = () => mockRequest("/__reset", { method: "POST" });
const mockState = () => mockRequest("/__state");

const invokeCallable = async (name, data, idToken = "") => {
  const headers = { "Content-Type": "application/json" };

  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  const response = await fetch(
    `http://127.0.0.1:5001/${projectId}/us-central1/${name}`,
    {
      body: JSON.stringify({ data }),
      headers,
      method: "POST",
    },
  );
  const payload = await response.json();

  if (!response.ok || payload.error) {
    const error = new Error(payload.error?.message || `Callable ${name} failed.`);
    const status = String(payload.error?.status || "internal").toLowerCase().replace(/_/g, "-");
    error.code = `functions/${status}`;
    throw error;
  }

  return { data: payload.result ?? payload.data };
};

const signInAdmin = async () => {
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=phase35-demo-key",
    {
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        returnSecureToken: true,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const payload = await response.json();

  if (!response.ok || !payload.idToken) {
    throw new Error("Phase 35 admin could not sign into the Auth emulator.");
  }

  return payload.idToken;
};

const createClient = () => {
  let idToken = "";

  return {
    capturePayPalOrder: (data) => invokeCallable("capturePayPalOrder", data),
    createPayPalOrder: (data) => invokeCallable("createPayPalOrder", data),
    reconcilePayPalOrder: (data) => invokeCallable("reconcilePayPalOrder", data, idToken),
    signIn: async () => {
      idToken = await signInAdmin();
    },
  };
};

const expectCallableError = async (label, operation, expectedCode) => {
  let error = null;

  try {
    await operation();
  } catch (caught) {
    error = caught;
  }

  assert(error, `${label} unexpectedly succeeded.`);
  assert(
    String(error.code || "").endsWith(expectedCode),
    `${label} returned ${error.code || error.message}, expected ${expectedCode}.`,
  );
};

const stockFor = async (productId) => {
  const snapshot = await adminDb.doc(`products/${productId}`).get();
  return snapshot.data()?.variants?.[0]?.stockOnHand;
};

const createCheckout = async (client, cartItems, label, captureMode = "complete", payloadOverrides = {}) => {
  await setMockCaptureMode(captureMode);
  const checkoutAttemptId = opaqueValue(`${label}-attempt`);
  const checkoutToken = opaqueValue(`${label}-token`);
  const result = await client.createPayPalOrder({
    ...payloadFor(cartItems, payloadOverrides),
    checkoutAttemptId,
    checkoutToken,
  });

  return {
    checkoutAttemptId,
    checkoutToken,
    orderID: result.data.orderID,
  };
};

const sessionFor = async (orderID) => (
  adminDb.doc(`paypalCheckouts/paypal_${orderID}`).get()
);

const orderFor = async (orderID) => adminDb.doc(`orders/paypal_${orderID}`).get();

const movementCountFor = async (orderID) => {
  const snapshot = await adminDb.collection("inventoryMovements").get();
  return snapshot.docs.filter((document) => document.data()?.orderId === `paypal_${orderID}`).length;
};

const verifyValidation = async (client) => {
  const before = await mockState();

  await expectCallableError(
    "stale product total",
    () => client.createPayPalOrder({
      ...payloadFor([productItem(productIds.main, { price: "14.00" })]),
      checkoutAttemptId: opaqueValue("stale-attempt"),
      checkoutToken: opaqueValue("stale-token"),
    }),
    "invalid-argument",
  );
  await expectCallableError(
    "inactive product",
    () => client.createPayPalOrder({
      ...payloadFor([productItem(productIds.inactive)]),
      checkoutAttemptId: opaqueValue("inactive-attempt"),
      checkoutToken: opaqueValue("inactive-token"),
    }),
    "failed-precondition",
  );
  await expectCallableError(
    "aggregate duplicate product stock",
    () => client.createPayPalOrder({
      ...payloadFor([
        productItem(productIds.aggregate, { quantity: 2 }),
        productItem(productIds.aggregate, { key: `${productIds.aggregate}-duplicate`, quantity: 2 }),
      ]),
      checkoutAttemptId: opaqueValue("aggregate-product-attempt"),
      checkoutToken: opaqueValue("aggregate-product-token"),
    }),
    "resource-exhausted",
  );
  await expectCallableError(
    "aggregate duplicate event capacity",
    () => client.createPayPalOrder({
      ...payloadFor([
        eventItem(eventIds.aggregate, { adultTickets: 2, price: "120.00", seatsPerCartUnit: 2 }),
        eventItem(eventIds.aggregate, {
          adultTickets: 2,
          key: `${eventIds.aggregate}-duplicate`,
          price: "120.00",
          seatsPerCartUnit: 2,
        }),
      ]),
      checkoutAttemptId: opaqueValue("aggregate-event-attempt"),
      checkoutToken: opaqueValue("aggregate-event-token"),
    }),
    "resource-exhausted",
  );
  await expectCallableError(
    "past event",
    () => client.createPayPalOrder({
      ...payloadFor([eventItem(eventIds.past, {
        capacityGroupKey: `${eventIds.past} Phase 35 Past Session`,
      })]),
      checkoutAttemptId: opaqueValue("past-attempt"),
      checkoutToken: opaqueValue("past-token"),
    }),
    "failed-precondition",
  );
  await expectCallableError(
    "multi-date event",
    () => client.createPayPalOrder({
      ...payloadFor([eventItem(eventIds.multiDate, {
        capacityGroupKey: `${eventIds.multiDate} Phase 35 Friday`,
      })]),
      checkoutAttemptId: opaqueValue("multi-attempt"),
      checkoutToken: opaqueValue("multi-token"),
    }),
    "failed-precondition",
  );

  const childOnly = await createCheckout(client, [eventItem(eventIds.main, {
    adultTickets: 0,
    childTickets: 2,
    price: "20.00",
    seatsPerCartUnit: 2,
  })], "child-only");
  const childSession = await sessionFor(childOnly.orderID);
  assert(childSession.data()?.checkout?.totalCents === 2000, "Child-only tickets must not be double-counted.");

  const after = await mockState();
  assert(
    after.createAttempts === before.createAttempts + 1,
    "Rejected validation cases must not call PayPal create.",
  );

  return { rejectedBeforePayPal: 6, childOnlyTotalCents: 2000 };
};

const verifyCreateIdempotency = async (client) => {
  const cartItems = [productItem(productIds.main)];
  await setMockCaptureMode("complete");
  const checkoutAttemptId = opaqueValue("idempotent-create-attempt");
  const checkoutToken = opaqueValue("idempotent-create-token");
  const request = {
    ...payloadFor(cartItems),
    checkoutAttemptId,
    checkoutToken,
  };
  const first = await client.createPayPalOrder(request);
  const second = await client.createPayPalOrder(request);
  assert(first.data.orderID === second.data.orderID, "Create retries must return the same PayPal order.");
  const session = await sessionFor(first.data.orderID);
  assert(session.exists, "Create retry must preserve one checkout session.");

  return { orderID: first.data.orderID };
};

const verifyCheckoutAuthorization = async (client) => {
  const tokenCheckout = await createCheckout(client, [productItem(productIds.main)], "token-guard");
  const beforeWrongToken = await mockState();
  await expectCallableError(
    "wrong checkout token",
    () => client.capturePayPalOrder({
      checkoutToken: opaqueValue("wrong-checkout-token"),
      orderID: tokenCheckout.orderID,
    }),
    "permission-denied",
  );
  const afterWrongToken = await mockState();
  assert(
    afterWrongToken.captureAttempts === beforeWrongToken.captureAttempts,
    "A wrong checkout token must fail before PayPal capture.",
  );
  assert((await sessionFor(tokenCheckout.orderID)).data()?.inventoryState === "none", "A wrong token must not reserve stock.");

  const expiredCheckout = await createCheckout(client, [productItem(productIds.main)], "expired-session");
  await adminDb.doc(`paypalCheckouts/paypal_${expiredCheckout.orderID}`).update({
    expiresAt: timestamp.fromMillis(Date.now() - 1000),
  });
  const beforeExpired = await mockState();
  await expectCallableError(
    "expired checkout session",
    () => client.capturePayPalOrder({
      checkoutToken: expiredCheckout.checkoutToken,
      orderID: expiredCheckout.orderID,
    }),
    "deadline-exceeded",
  );
  const afterExpired = await mockState();
  assert(
    afterExpired.captureAttempts === beforeExpired.captureAttempts,
    "An expired checkout must fail before PayPal capture.",
  );
  assert((await sessionFor(expiredCheckout.orderID)).data()?.inventoryState === "none", "An expired session must not reserve stock.");
  assert(await stockFor(productIds.main) === 10, "Authorization guards must not change inventory.");

  return { expiredSessionBlocked: true, wrongTokenBlocked: true };
};

const verifyTrustedCaptureAndIdempotency = async (client) => {
  const checkout = await createCheckout(client, [
    productItem(productIds.main),
    eventItem(eventIds.main, {
      adultTickets: 2,
      price: "120.00",
      seatsPerCartUnit: 2,
    }),
  ], "trusted-capture");
  const captureRequest = {
    cartItems: [productItem(productIds.main, { price: "0.01", quantity: 99 })],
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
    shipping: "0.00",
    subtotal: "0.01",
    total: "0.01",
  };
  const [first, second] = await Promise.all([
    client.capturePayPalOrder(captureRequest),
    client.capturePayPalOrder(captureRequest),
  ]);
  assert(
    [first, second].every((response) => ["paid", "processing"].includes(response.data.status)),
    "Concurrent callbacks must resolve paid or safely processing.",
  );
  assert(await stockFor(productIds.main) === 9, "Concurrent callbacks must decrement product stock once.");
  const event = await adminDb.doc(`events/${eventIds.main}`).get();
  assert(event.data()?.ticketsSold === 7, "Concurrent callbacks must add event tickets once.");
  assert((await orderFor(checkout.orderID)).exists, "Trusted capture must write the order ledger.");
  assert(await movementCountFor(checkout.orderID) === 2, "Trusted capture must write one movement per line.");
  const third = await client.capturePayPalOrder(captureRequest);
  assert(third.data.finalized === true, "Sequential duplicate capture must return the paid order.");
  assert(await stockFor(productIds.main) === 9, "Sequential duplicate capture must not decrement stock again.");
  assert(await movementCountFor(checkout.orderID) === 2, "Sequential duplicate capture must not duplicate movements.");

  return { orderID: checkout.orderID, movements: 2 };
};

const verifyCaptureTimeRace = async (client) => {
  const checkout = await createCheckout(client, [productItem(productIds.race)], "capture-race");
  const before = await mockState();
  const productRef = adminDb.doc(`products/${productIds.race}`);
  const product = (await productRef.get()).data();
  await productRef.update({
    variants: [{ ...product.variants[0], stockOnHand: 0 }],
  });
  await expectCallableError(
    "capture-time stock race",
    () => client.capturePayPalOrder({
      checkoutToken: checkout.checkoutToken,
      orderID: checkout.orderID,
    }),
    "resource-exhausted",
  );
  const after = await mockState();
  assert(after.captureAttempts === before.captureAttempts, "Stock race must fail before PayPal capture.");
  assert(!(await orderFor(checkout.orderID)).exists, "Stock race must not write an order.");

  return { paypalCaptureAttempts: 0 };
};

const verifyApprovalBeforeReservation = async (client) => {
  const checkout = await createCheckout(
    client,
    [productItem(productIds.unapproved)],
    "unapproved-order",
    "unapproved",
  );
  const before = await mockState();
  await expectCallableError(
    "unapproved order capture",
    () => client.capturePayPalOrder({
      checkoutToken: checkout.checkoutToken,
      orderID: checkout.orderID,
    }),
    "failed-precondition",
  );
  const after = await mockState();
  const session = await sessionFor(checkout.orderID);
  assert(after.captureAttempts === before.captureAttempts, "Unapproved order must not call PayPal capture.");
  assert(await stockFor(productIds.unapproved) === 2, "Unapproved order must not reserve stock.");
  assert(session.data()?.inventoryState === "none", "Unapproved order must keep inventory unreserved.");

  return { inventoryState: "none", paypalCaptureAttempts: 0 };
};

const verifyImmutableSnapshot = async (client) => {
  const checkout = await createCheckout(
    client,
    [productItem(productIds.snapshotChanged)],
    "snapshot-change",
  );
  const productRef = adminDb.doc(`products/${productIds.snapshotChanged}`);
  await productRef.update({ title: "Phase 35 changed after approval" });
  const before = await mockState();
  await expectCallableError(
    "changed commercial snapshot",
    () => client.capturePayPalOrder({
      checkoutToken: checkout.checkoutToken,
      orderID: checkout.orderID,
    }),
    "failed-precondition",
  );
  const after = await mockState();
  assert(after.captureAttempts === before.captureAttempts, "Changed snapshot must fail before PayPal capture.");
  assert(await stockFor(productIds.snapshotChanged) === 2, "Changed snapshot must not reserve stock.");

  return { inventoryUnchanged: true, paypalCaptureAttempts: 0 };
};

const verifyCaptureVerification = async (client, productId, mode, expectedStatus) => {
  const checkout = await createCheckout(client, [productItem(productId)], `${mode}-capture`, mode);
  const result = await client.capturePayPalOrder({
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
  });
  assert(result.data.finalized === false, `${mode} capture must not report success.`);
  assert(!(await orderFor(checkout.orderID)).exists, `${mode} capture must not write an order.`);
  const session = await sessionFor(checkout.orderID);
  assert(session.data()?.status === expectedStatus, `${mode} capture must enter ${expectedStatus}.`);
  assert(session.data()?.recovery?.required === true, `${mode} capture must require recovery.`);
  assert(await stockFor(productId) === 1, `${mode} capture must retain its inventory reservation.`);

  return { orderID: checkout.orderID, status: expectedStatus };
};

const verifyDefinitiveFailure = async (client) => {
  const checkout = await createCheckout(client, [productItem(productIds.failed)], "failed-capture", "failed");
  const result = await client.capturePayPalOrder({
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
  });
  assert(result.data.status === "not_paid", "Definitive failure must report not paid.");
  assert(result.data.retryAllowed === true, "Definitive failure must explicitly allow retry.");
  assert(await stockFor(productIds.failed) === 2, "Definitive failure must release reserved stock.");
  const session = await sessionFor(checkout.orderID);
  assert(session.data()?.inventoryState === "released", "Definitive failure must mark inventory released.");
  assert(!(await orderFor(checkout.orderID)).exists, "Definitive failure must not write an order.");

  return { orderID: checkout.orderID, status: session.data()?.status };
};

const verifyReconciliationLeaseRace = async (client) => {
  const checkout = await createCheckout(
    client,
    [productItem(productIds.leaseRace)],
    "reconciliation-lease-race",
    "delayed_failed",
  );
  const sessionRef = adminDb.doc(`paypalCheckouts/paypal_${checkout.orderID}`);
  await sessionRef.update({ testFailureMode: "pause_reconcile_once" });
  await client.signIn();

  const reconciliationPromise = client.reconcilePayPalOrder({ orderID: checkout.orderID });
  await waitFor("reconciliation pause", async () => (
    Boolean((await sessionRef.get()).data()?.testReconcilePausedAt)
  ));

  const capturePromise = client.capturePayPalOrder({
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
  });
  await waitFor("delayed provider capture", async () => {
    const [state, session] = await Promise.all([mockState(), sessionRef.get()]);
    const providerOrder = state.orders.find((order) => order.id === checkout.orderID);
    return providerOrder?.status === "COMPLETED" && Boolean(session.data()?.captureLeaseId);
  });
  await sessionRef.update({ testContinueReconcile: true });

  const reconciliation = await reconciliationPromise;
  assert(reconciliation.data.status === "processing", "Stale reconciliation must not release a newer capture lease.");
  assert(await stockFor(productIds.leaseRace) === 1, "The active capture reservation must remain held during reconciliation.");

  const capture = await capturePromise;
  assert(capture.data.status === "not_paid", "The lease-owning capture must report terminal non-payment.");
  assert(capture.data.retryAllowed === true, "The lease-owning capture may permit retry after releasing inventory.");
  assert(await stockFor(productIds.leaseRace) === 2, "The lease owner must release stock exactly once.");
  assert((await sessionRef.get()).data()?.inventoryState === "released", "The terminal capture must mark inventory released.");
  assert(!(await orderFor(checkout.orderID)).exists, "The lease race must not write a paid order.");
  assert(await movementCountFor(checkout.orderID) === 0, "The lease race must not write sale movements.");

  return { captureStatus: capture.data.status, reconciliationStatus: reconciliation.data.status };
};

const verifyFinalizationRecovery = async (client) => {
  const checkout = await createCheckout(client, [productItem(productIds.recovery)], "finalize-recovery");
  const sessionRef = adminDb.doc(`paypalCheckouts/paypal_${checkout.orderID}`);
  await sessionRef.update({ testFailureMode: "finalize_once" });
  const first = await client.capturePayPalOrder({
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
  });
  assert(first.data.finalized === false, "Injected finalization failure must report processing.");
  assert(await stockFor(productIds.recovery) === 1, "Recovery path must retain one reservation.");
  assert(!(await orderFor(checkout.orderID)).exists, "Injected finalization failure must initially omit the order.");
  const second = await client.capturePayPalOrder({
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
  });
  assert(second.data.finalized === true, "Retry must finalize a previously captured payment.");
  assert(await stockFor(productIds.recovery) === 1, "Finalization retry must not decrement stock twice.");
  assert(await movementCountFor(checkout.orderID) === 1, "Finalization retry must write one movement.");

  return { orderID: checkout.orderID, recovered: true };
};

const verifyUnknownCaptureReconciliation = async (client) => {
  const checkout = await createCheckout(
    client,
    [productItem(productIds.errorApproved)],
    "unknown-capture",
    "error_approved",
  );
  const capture = await client.capturePayPalOrder({
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
  });
  assert(capture.data.finalized === false, "Unknown capture must report processing.");
  assert(await stockFor(productIds.errorApproved) === 1, "Unknown capture must retain inventory.");
  await expectCallableError(
    "unauthenticated reconciliation",
    () => client.reconcilePayPalOrder({ orderID: checkout.orderID }),
    "unauthenticated",
  );
  await client.signIn();
  const reconciliation = await client.reconcilePayPalOrder({ orderID: checkout.orderID });
  assert(reconciliation.data.status === "processing", "Non-terminal approval must remain in reconciliation.");
  assert(await stockFor(productIds.errorApproved) === 1, "Non-terminal approval must retain inventory.");
  assert((await sessionFor(checkout.orderID)).exists, "Checkout recovery record must remain available for admin review.");

  return { orderID: checkout.orderID, status: reconciliation.data.status };
};

const verifyCapturedAfterProviderError = async (client) => {
  const checkout = await createCheckout(
    client,
    [productItem(productIds.errorCompleted)],
    "provider-error-completed",
    "error_completed",
  );
  const result = await client.capturePayPalOrder({
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
  });
  assert(result.data.finalized === true, "Completed payment must recover after a lost capture response.");
  assert(await stockFor(productIds.errorCompleted) === 1, "Recovered capture must decrement stock once.");
  assert(await movementCountFor(checkout.orderID) === 1, "Recovered capture must write one movement.");

  return { orderID: checkout.orderID, recovered: true };
};

const verifyConcurrentCapture = async (client) => {
  const checkout = await createCheckout(client, [productItem(productIds.concurrent)], "concurrent-capture");
  const responses = await Promise.all(Array.from({ length: 4 }, () => client.capturePayPalOrder({
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
  })));
  assert(
    responses.every((response) => ["paid", "processing"].includes(response.data.status)),
    "Duplicate callbacks must resolve paid or safely processing.",
  );
  const final = await client.capturePayPalOrder({
    checkoutToken: checkout.checkoutToken,
    orderID: checkout.orderID,
  });
  assert(final.data.finalized === true, "A later duplicate callback must return the paid order.");
  assert(await stockFor(productIds.concurrent) === 4, "Concurrent callbacks must decrement stock exactly once.");
  assert(await movementCountFor(checkout.orderID) === 1, "Concurrent callbacks must write one movement.");

  return { callbacks: responses.length, orderID: checkout.orderID };
};

const runCheck = async (label, operation) => {
  process.stdout.write(`Phase 35: ${label}... `);
  const result = await operation();
  process.stdout.write("passed\n");
  return result;
};

const verify = async () => {
  await resetMock();
  await seedFixtures();
  const client = createClient();

  try {
    const results = {
      validation: await runCheck("server validation", () => verifyValidation(client)),
      createIdempotency: await runCheck("create idempotency", () => verifyCreateIdempotency(client)),
      checkoutAuthorization: await runCheck("checkout authorization", () => verifyCheckoutAuthorization(client)),
      approvalGate: await runCheck("approval gate", () => verifyApprovalBeforeReservation(client)),
      immutableSnapshot: await runCheck("immutable snapshot", () => verifyImmutableSnapshot(client)),
      trustedCapture: await runCheck("trusted capture", () => verifyTrustedCaptureAndIdempotency(client)),
      captureRace: await runCheck("capture-time stock race", () => verifyCaptureTimeRace(client)),
      concurrentCapture: await runCheck("concurrent callbacks", () => verifyConcurrentCapture(client)),
      wrongAmount: await runCheck("wrong capture amount", () => verifyCaptureVerification(
        client,
        productIds.wrongAmount,
        "wrong_amount",
        "needs_review",
      )),
      wrongCustomId: await runCheck("wrong capture reference", () => verifyCaptureVerification(
        client,
        productIds.wrongCustom,
        "wrong_custom_id",
        "needs_review",
      )),
      pendingCapture: await runCheck("pending capture", () => verifyCaptureVerification(
        client,
        productIds.pending,
        "pending",
        "capture_pending",
      )),
      definitiveFailure: await runCheck("definitive failure release", () => verifyDefinitiveFailure(client)),
      finalizationRecovery: await runCheck("finalization recovery", () => verifyFinalizationRecovery(client)),
      providerErrorRecovery: await runCheck("lost response recovery", () => verifyCapturedAfterProviderError(client)),
      reconciliation: await runCheck("admin reconciliation guard", () => verifyUnknownCaptureReconciliation(client)),
      reconciliationLeaseRace: await runCheck("reconciliation lease race", () => verifyReconciliationLeaseRace(client)),
    };
    const state = await mockState();
    assert(state.orderCount >= 10, "The mock should exercise multiple independent PayPal orders.");
    return { mock: state, results };
  } finally {
    await clearFixtures();
  }
};

const seedManualReview = async () => {
  await resetMock();
  await seedFixtures();
  const client = createClient();

  try {
    const checkout = await createCheckout(client, [
      productItem(productIds.main),
      eventItem(eventIds.main, {
        adultTickets: 2,
        price: "120.00",
        seatsPerCartUnit: 2,
      }),
    ], "manual-review");
    const result = await client.capturePayPalOrder({
      checkoutToken: checkout.checkoutToken,
      orderID: checkout.orderID,
    });
    assert(result.data.finalized === true, "Manual review fixture must be paid.");

    const recoveryCheckout = await createCheckout(
      client,
      [productItem(productIds.errorApproved)],
      "manual-recovery-review",
      "error_approved",
    );
    const recoveryResult = await client.capturePayPalOrder({
      checkoutToken: recoveryCheckout.checkoutToken,
      orderID: recoveryCheckout.orderID,
    });
    assert(recoveryResult.data.finalized === false, "Manual recovery fixture must remain in review.");
    assert(recoveryResult.data.status === "processing", "Manual recovery fixture must report processing.");

    return {
      adminEmail,
      adminPassword,
      orderID: checkout.orderID,
      productStock: await stockFor(productIds.main),
      recoveryOrderID: recoveryCheckout.orderID,
      recoveryProductStock: await stockFor(productIds.errorApproved),
    };
  } finally {
    // Manual fixtures intentionally remain until the explicit cleanup command.
  }
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
