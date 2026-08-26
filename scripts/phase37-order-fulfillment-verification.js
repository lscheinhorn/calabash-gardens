const admin = require("../functions/node_modules/firebase-admin");
const { deleteApp, initializeApp } = require("firebase/app");
const {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
} = require("firebase/auth");
const {
  connectFirestoreEmulator,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} = require("firebase/firestore");

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "";
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || "";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "";
const adminAppName = "phase37-order-fulfillment-verification";
const activeAdminUid = "phase37-active-admin";
const activeAdminEmail = "phase37-admin@local.test";
const inactiveAdminUid = "phase37-inactive-admin";
const inactiveAdminEmail = "phase37-inactive@local.test";
const adminPassword = "phase37-emulator-only-password";
const orderId = "phase37-order-qa";
const orderPath = `orders/${orderId}`;
const timestamp = admin.firestore.Timestamp;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertIsolatedEmulators = () => {
  assert(projectId === "demo-calabash-gardens", "Phase 37 requires the exact demo project ID.");
  assert(firestoreHost === "127.0.0.1:8080", "Phase 37 requires the local Firestore emulator.");
  assert(authHost === "127.0.0.1:9099", "Phase 37 requires the local Auth emulator.");
};

assertIsolatedEmulators();

const adminApp = admin.initializeApp({ projectId }, adminAppName);
const adminAuth = adminApp.auth();
const adminDb = adminApp.firestore();

const orderFixture = () => ({
  createdAt: timestamp.now(),
  customer: {
    email: "phase37-buyer@local.test",
    name: "=Phase 37 Buyer",
    phone: "555-0100",
    sourcePayerId: "PHASE37PAYER",
  },
  fulfillmentStatus: "new",
  items: [{
    capacityGroupKey: "",
    lineItemId: "phase37-line-1",
    linkedId: "phase37-product",
    quantity: 1,
    seatCount: 0,
    sku: "PHASE37-SKU",
    sourceLineItemId: "",
    title: "+Phase 37 Product",
    total: 15,
    type: "product",
    unitPrice: 15,
    variantId: "jar",
  }],
  paidAt: timestamp.now(),
  paymentStatus: "completed",
  rawSource: {
    captureStatus: "COMPLETED",
    orderId: "PHASE37PAYPALORDER",
  },
  schemaVersion: 1,
  shipping: {
    address: {
      address_line_1: "1 Main St",
      admin_area_1: "VT",
      admin_area_2: "Wells River",
      country_code: "US",
      postal_code: "05081",
    },
    amount: 17,
    name: "Phase 37 Buyer",
  },
  snapshotHash: "phase37-snapshot-hash",
  source: "paypal_web",
  sourceOrderId: "PHASE37PAYPALORDER",
  sourcePaymentId: "PHASE37CAPTURE",
  status: "paid",
  totals: {
    currency: "USD",
    discount: 0,
    shipping: 17,
    subtotal: 15,
    tax: 0,
    total: 32,
  },
  totalsCents: {
    shipping: 1700,
    subtotal: 1500,
    total: 3200,
  },
  updatedAt: timestamp.now(),
});

const deleteUserIfPresent = async (uid) => {
  try {
    await adminAuth.deleteUser(uid);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }
  }
};

const clearFixtures = async () => {
  const batch = adminDb.batch();
  batch.delete(adminDb.doc(orderPath));
  batch.delete(adminDb.doc("orders/phase37-client-created"));
  batch.delete(adminDb.doc(`adminUsers/${activeAdminUid}`));
  batch.delete(adminDb.doc(`adminUsers/${inactiveAdminUid}`));
  await batch.commit();
  await deleteUserIfPresent(activeAdminUid);
  await deleteUserIfPresent(inactiveAdminUid);
};

const seedFixtures = async () => {
  await clearFixtures();
  await Promise.all([
    adminAuth.createUser({
      displayName: "Phase 37 Active Admin",
      email: activeAdminEmail,
      emailVerified: true,
      password: adminPassword,
      uid: activeAdminUid,
    }),
    adminAuth.createUser({
      displayName: "Phase 37 Inactive Admin",
      email: inactiveAdminEmail,
      emailVerified: true,
      password: adminPassword,
      uid: inactiveAdminUid,
    }),
  ]);

  const batch = adminDb.batch();
  batch.set(adminDb.doc(`adminUsers/${activeAdminUid}`), {
    active: true,
    createdAt: timestamp.now(),
    displayName: "Phase 37 Active Admin",
    email: activeAdminEmail,
    role: "admin",
    updatedAt: timestamp.now(),
  });
  batch.set(adminDb.doc(`adminUsers/${inactiveAdminUid}`), {
    active: false,
    createdAt: timestamp.now(),
    displayName: "Phase 37 Inactive Admin",
    email: inactiveAdminEmail,
    role: "admin",
    updatedAt: timestamp.now(),
  });
  batch.set(adminDb.doc(orderPath), orderFixture());
  await batch.commit();

  return {
    adminEmail: activeAdminEmail,
    adminPassword,
    orderId,
  };
};

const createClient = ({ email = "", password = "", suffix }) => {
  const app = initializeApp({
    apiKey: "phase37-demo-key",
    appId: `1:123456789:web:phase37-${suffix}`,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
  }, `phase37-${suffix}-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);

  return {
    app,
    auth,
    db,
    signIn: async () => {
      if (email) {
        await signInWithEmailAndPassword(auth, email, password);
      }
    },
  };
};

const expectPermissionDenied = async (label, operation) => {
  try {
    await operation();
    throw new Error(`${label} unexpectedly passed Firestore rules.`);
  } catch (error) {
    if (String(error.message).includes("unexpectedly passed")) {
      throw error;
    }

    assert(error.code === "permission-denied", `${label} should fail with permission-denied.`);
  }
};

const validFulfillmentUpdate = (overrides = {}) => ({
  fulfillmentNotes: "Packed for Phase 37 QA.",
  fulfillmentRevision: 1,
  fulfillmentStatus: "in_progress",
  fulfillmentUpdatedAt: serverTimestamp(),
  fulfillmentUpdatedBy: activeAdminUid,
  ...overrides,
});

const verifyRules = async () => {
  const clients = [];

  try {
    await seedFixtures();
    const active = createClient({
      email: activeAdminEmail,
      password: adminPassword,
      suffix: "active",
    });
    const inactive = createClient({
      email: inactiveAdminEmail,
      password: adminPassword,
      suffix: "inactive",
    });
    const anonymous = createClient({ suffix: "anonymous" });
    clients.push(active, inactive, anonymous);

    await Promise.all([active.signIn(), inactive.signIn()]);
    const activeOrderRef = doc(active.db, "orders", orderId);
    const inactiveOrderRef = doc(inactive.db, "orders", orderId);
    const anonymousOrderRef = doc(anonymous.db, "orders", orderId);

    await updateDoc(activeOrderRef, validFulfillmentUpdate());
    const afterAllowed = (await adminDb.doc(orderPath).get()).data();
    assert(afterAllowed.fulfillmentStatus === "in_progress", "Valid admin fulfillment status must save.");
    assert(afterAllowed.fulfillmentRevision === 1, "First fulfillment save must set revision 1.");
    assert(afterAllowed.fulfillmentUpdatedBy === activeAdminUid, "Updater UID must be stored.");
    assert(afterAllowed.paymentStatus === "completed", "Valid fulfillment save must preserve payment status.");
    assert(afterAllowed.sourcePaymentId === "PHASE37CAPTURE", "Valid fulfillment save must preserve payment ID.");
    assert(afterAllowed.totals.total === 32, "Valid fulfillment save must preserve totals.");
    assert(afterAllowed.items[0].quantity === 1, "Valid fulfillment save must preserve items.");

    const next = (overrides = {}) => validFulfillmentUpdate({
      fulfillmentNotes: "Second update",
      fulfillmentRevision: 2,
      fulfillmentStatus: "fulfilled",
      ...overrides,
    });

    await expectPermissionDenied("payment status mutation", () => updateDoc(activeOrderRef, {
      ...next(),
      paymentStatus: "refunded",
    }));
    await expectPermissionDenied("payment ID mutation", () => updateDoc(activeOrderRef, {
      ...next(),
      sourcePaymentId: "WRONGCAPTURE",
    }));
    await expectPermissionDenied("source mutation", () => updateDoc(activeOrderRef, {
      ...next(),
      source: "manual",
    }));
    await expectPermissionDenied("customer mutation", () => updateDoc(activeOrderRef, {
      ...next(),
      customer: { ...afterAllowed.customer, email: "changed@local.test" },
    }));
    await expectPermissionDenied("shipping mutation", () => updateDoc(activeOrderRef, {
      ...next(),
      shipping: { ...afterAllowed.shipping, method: "changed" },
    }));
    await expectPermissionDenied("item mutation", () => updateDoc(activeOrderRef, {
      ...next(),
      items: [{ ...afterAllowed.items[0], quantity: 99 }],
    }));
    await expectPermissionDenied("total mutation", () => updateDoc(activeOrderRef, {
      ...next(),
      totals: { ...afterAllowed.totals, total: 1 },
    }));
    await expectPermissionDenied("payment-owned timestamp mutation", () => updateDoc(activeOrderRef, {
      ...next(),
      createdAt: new Date(0),
    }));
    await expectPermissionDenied("invalid fulfillment status", () => updateDoc(
      activeOrderRef,
      next({ fulfillmentStatus: "paid" }),
    ));
    await expectPermissionDenied("oversized fulfillment notes", () => updateDoc(
      activeOrderRef,
      next({ fulfillmentNotes: "x".repeat(2001) }),
    ));
    await expectPermissionDenied("spoofed updater UID", () => updateDoc(
      activeOrderRef,
      next({ fulfillmentUpdatedBy: inactiveAdminUid }),
    ));
    await expectPermissionDenied("client timestamp", () => updateDoc(
      activeOrderRef,
      next({ fulfillmentUpdatedAt: new Date(0) }),
    ));
    await expectPermissionDenied("stale fulfillment revision", () => updateDoc(
      activeOrderRef,
      next({ fulfillmentRevision: 1 }),
    ));
    await expectPermissionDenied("skipped fulfillment revision", () => updateDoc(
      activeOrderRef,
      next({ fulfillmentRevision: 3 }),
    ));
    await expectPermissionDenied("fulfillment metadata deletion", () => updateDoc(
      activeOrderRef,
      next({ fulfillmentNotes: deleteField() }),
    ));
    await expectPermissionDenied("inactive admin update", () => updateDoc(
      inactiveOrderRef,
      next({ fulfillmentUpdatedBy: inactiveAdminUid }),
    ));
    await expectPermissionDenied("anonymous order read", () => getDoc(anonymousOrderRef));
    await expectPermissionDenied("anonymous order update", () => updateDoc(
      anonymousOrderRef,
      next({ fulfillmentUpdatedBy: "anonymous" }),
    ));
    await expectPermissionDenied("admin order create", () => setDoc(
      doc(active.db, "orders", "phase37-client-created"),
      { fulfillmentStatus: "new" },
    ));
    await expectPermissionDenied("admin order delete", () => deleteDoc(activeOrderRef));

    await updateDoc(activeOrderRef, next());
    const finalOrder = (await adminDb.doc(orderPath).get()).data();
    assert(finalOrder.fulfillmentRevision === 2, "Second valid update must increment revision to 2.");
    assert(finalOrder.fulfillmentStatus === "fulfilled", "Second valid update must save.");

    return {
      allowedUpdates: 2,
      deniedChecks: 20,
      finalRevision: finalOrder.fulfillmentRevision,
      immutablePaymentFactsPreserved: true,
    };
  } finally {
    try {
      await Promise.all(clients.map((client) => deleteApp(client.app)));
    } finally {
      await clearFixtures();
    }
  }
};

const setConcurrentFulfillment = async () => {
  const orderRef = adminDb.doc(orderPath);
  const snapshot = await orderRef.get();

  assert(snapshot.exists, "Phase 37 order fixture is missing.");
  const order = snapshot.data() || {};
  const revision = Number.isInteger(order.fulfillmentRevision) ? order.fulfillmentRevision : 0;
  await orderRef.update({
    fulfillmentNotes: "Concurrent admin update.",
    fulfillmentRevision: revision + 1,
    fulfillmentStatus: "shipped",
    fulfillmentUpdatedAt: timestamp.now(),
    fulfillmentUpdatedBy: "phase37-concurrent-admin",
  });

  return { fulfillmentRevision: revision + 1, fulfillmentStatus: "shipped" };
};

const assertBrowserSave = async () => {
  const order = (await adminDb.doc(orderPath).get()).data() || {};
  assert(order.fulfillmentStatus === "in_progress", "Browser save must set fulfillment in progress.");
  assert(order.fulfillmentNotes === "Packed for browser QA.", "Browser save must persist its notes.");
  assert(order.fulfillmentRevision === 1, "Browser save must increment fulfillment revision once.");
  assert(order.paymentStatus === "completed", "Browser save must preserve payment status.");
  assert(order.sourcePaymentId === "PHASE37CAPTURE", "Browser save must preserve the payment ID.");
  assert(order.totals.total === 32, "Browser save must preserve total 32.");
  assert(order.items[0].quantity === 1, "Browser save must preserve item quantity.");

  return { fulfillmentRevision: 1, fulfillmentStatus: order.fulfillmentStatus };
};

const assertBrowserConflict = async () => {
  assert(
    process.env.PHASE37_CONFLICT_UI_CONFIRMED === "true",
    "Confirm the browser showed the Phase 37 conflict message before asserting postconditions.",
  );
  const order = (await adminDb.doc(orderPath).get()).data() || {};
  assert(order.fulfillmentStatus === "shipped", "Concurrent fulfillment status must survive conflict.");
  assert(order.fulfillmentNotes === "Concurrent admin update.", "Concurrent notes must survive conflict.");
  assert(order.fulfillmentRevision === 2, "Rejected stale save must not increment revision again.");
  assert(order.paymentStatus === "completed", "Conflict must preserve payment status.");
  assert(order.sourcePaymentId === "PHASE37CAPTURE", "Conflict must preserve payment ID.");
  assert(order.totals.total === 32, "Conflict must preserve total 32.");
  assert(order.items[0].quantity === 1, "Conflict must preserve item quantity.");

  return { fulfillmentRevision: 2, fulfillmentStatus: order.fulfillmentStatus };
};

const commands = {
  "assert-browser-conflict": assertBrowserConflict,
  "assert-browser-save": assertBrowserSave,
  cleanup: clearFixtures,
  "seed-manual": seedFixtures,
  "set-concurrent": setConcurrentFulfillment,
  "verify-rules": verifyRules,
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
