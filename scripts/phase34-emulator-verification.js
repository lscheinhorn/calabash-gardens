const admin = require("../functions/node_modules/firebase-admin");
const { deleteApp, initializeApp } = require("firebase/app");
const {
  addDoc,
  collection,
  connectFirestoreEmulator,
  getFirestore,
  serverTimestamp,
} = require("firebase/firestore");

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "";
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || "";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "";
const adminAppName = "phase34-emulator-verification";
const adminUid = "phase34-qa-admin";
const adminEmail = "qa-admin@local.test";
const adminPassword = "emulator-only-password";
const fixtureCategoryId = "culinary";
const harnessStatePath = "phase34Harness/state";
const fixtureProductIds = ["qa-product-a", "qa-product-b"];
const fixtureEventIds = [
  "qa-event",
  "qa-waitlist-eligible",
  "qa-waitlist-inactive",
  "qa-waitlist-open",
  "qa-waitlist-disabled",
  "qa-waitlist-unpublished",
  "qa-waitlist-past",
];
const fixtureLinkedIds = new Set([...fixtureProductIds, ...fixtureEventIds]);

const assertIsolatedEmulators = () => {
  if (!projectId.startsWith("demo-")) {
    throw new Error("Phase 34 verification requires a demo-* Firebase project ID.");
  }

  if (firestoreHost !== "127.0.0.1:8080" || authHost !== "127.0.0.1:9099") {
    throw new Error("Phase 34 verification requires the local Firestore and Auth emulator hosts.");
  }
};

assertIsolatedEmulators();

const adminApp = admin.initializeApp({ projectId }, adminAppName);
const adminAuth = adminApp.auth();
const adminDb = adminApp.firestore();
const timestamp = admin.firestore.Timestamp;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const daysFromNow = (days) => timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000);

const productVariant = (overrides = {}) => ({
  active: true,
  id: "jar",
  inventoryTracked: true,
  label: "Jar",
  lowStockThreshold: 2,
  price: "15.00",
  priceOptionIndex: 0,
  sku: "CG-QA-JAR",
  sortOrder: 0,
  stockOnHand: 10,
  ...overrides,
});

const productFixture = (title, overrides = {}) => ({
  category: fixtureCategoryId,
  createdAt: timestamp.now(),
  inStock: true,
  isActive: false,
  photos: [],
  priceOptions: [{ option: "Jar", price: "15.00" }],
  published: false,
  shipping: "17.00",
  title,
  updatedAt: timestamp.now(),
  variants: [productVariant()],
  ...overrides,
});

const eventFixture = (title, overrides = {}) => ({
  capacity: 30,
  category: "Experience",
  createdAt: timestamp.now(),
  date: daysFromNow(30),
  eventDates: ["Phase 34 Future Session"],
  info: ["Emulator-only QA fixture."],
  inStock: true,
  isActive: true,
  manualSeatsReserved: 2,
  photos: [],
  priceOptions: ["60.00"],
  published: true,
  shipping: "0.00",
  ticketsSold: 5,
  title,
  updatedAt: timestamp.now(),
  waitlistEnabled: false,
  ...overrides,
});

const deleteMatchingDocuments = async (collectionName, matchesFixture) => {
  const snapshot = await adminDb.collection(collectionName).get();
  const matchingDocuments = snapshot.docs.filter((document) => matchesFixture(document.data()));

  if (matchingDocuments.length === 0) {
    return;
  }

  for (let index = 0; index < matchingDocuments.length; index += 450) {
    const batch = adminDb.batch();
    matchingDocuments.slice(index, index + 450).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
};

const clearFixtures = async () => {
  const harnessStateSnapshot = await adminDb.doc(harnessStatePath).get();
  await deleteMatchingDocuments(
    "eventWaitlist",
    (entry) => fixtureEventIds.includes(entry.eventId),
  );
  await deleteMatchingDocuments(
    "inventoryMovements",
    (movement) => fixtureLinkedIds.has(movement.linkedId),
  );

  const batch = adminDb.batch();
  fixtureProductIds.forEach((productId) => batch.delete(adminDb.doc(`products/${productId}`)));
  fixtureEventIds.forEach((eventId) => batch.delete(adminDb.doc(`events/${eventId}`)));
  if (harnessStateSnapshot.data()?.createdCategory === true) {
    batch.delete(adminDb.doc(`productCategories/${fixtureCategoryId}`));
  }
  batch.delete(adminDb.doc(harnessStatePath));
  batch.delete(adminDb.doc(`adminUsers/${adminUid}`));
  await batch.commit();

  try {
    await adminAuth.deleteUser(adminUid);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }
  }
};

const verifyCleanupScope = async () => {
  const sentinelUid = "phase34-unrelated-admin";
  const sentinelRefs = [
    adminDb.doc("adminUsers/phase34-unrelated-admin"),
    adminDb.doc("eventWaitlist/phase34-unrelated-entry"),
    adminDb.doc("events/phase34-unrelated-event"),
    adminDb.doc("inventoryMovements/phase34-unrelated-movement"),
    adminDb.doc("productCategories/phase34-unrelated-category"),
    adminDb.doc("products/phase34-unrelated-product"),
  ];
  const deleteSentinels = async () => {
    const batch = adminDb.batch();
    sentinelRefs.forEach((reference) => batch.delete(reference));
    await batch.commit();

    try {
      await adminAuth.deleteUser(sentinelUid);
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }
  };

  await deleteSentinels();
  const seedBatch = adminDb.batch();
  sentinelRefs.forEach((reference) => seedBatch.set(reference, { phase34Fixture: false }));
  await seedBatch.commit();
  await adminAuth.createUser({
    email: "unrelated@local.test",
    password: adminPassword,
    uid: sentinelUid,
  });

  try {
    await clearFixtures();
    const sentinelSnapshots = await Promise.all(sentinelRefs.map((reference) => reference.get()));
    const sentinelUser = await adminAuth.getUser(sentinelUid);

    assert(
      sentinelSnapshots.every((snapshot) => snapshot.exists),
      "Phase 34 cleanup must preserve unrelated emulator documents.",
    );
    assert(sentinelUser.uid === sentinelUid, "Phase 34 cleanup must preserve unrelated emulator users.");

    return {
      preservedDocumentCount: sentinelSnapshots.length,
      preservedUser: sentinelUser.uid,
    };
  } finally {
    await deleteSentinels();
  }
};

const seed = async () => {
  await clearFixtures();
  const categoryRef = adminDb.doc(`productCategories/${fixtureCategoryId}`);
  const categorySnapshot = await categoryRef.get();
  await adminAuth.createUser({
    displayName: "Phase 34 QA Admin",
    email: adminEmail,
    emailVerified: true,
    password: adminPassword,
    uid: adminUid,
  });

  const batch = adminDb.batch();
  batch.set(adminDb.doc(`adminUsers/${adminUid}`), {
    active: true,
    createdAt: timestamp.now(),
    displayName: "Phase 34 QA Admin",
    email: adminEmail,
    role: "admin",
    updatedAt: timestamp.now(),
  });
  batch.set(adminDb.doc(harnessStatePath), {
    createdAt: timestamp.now(),
    createdCategory: !categorySnapshot.exists,
  });
  if (!categorySnapshot.exists) {
    batch.set(categoryRef, {
      active: true,
      createdAt: timestamp.now(),
      name: "Culinary",
      sortOrder: 1,
      updatedAt: timestamp.now(),
    });
  }
  batch.set(adminDb.doc("products/qa-product-a"), productFixture("QA Product A"));
  batch.set(adminDb.doc("products/qa-product-b"), productFixture("QA Product B", {
    variants: [productVariant({ sku: "CG-QA-B-JAR", stockOnHand: 20 })],
  }));
  batch.set(adminDb.doc("events/qa-event"), eventFixture("QA Inventory Event"));
  batch.set(adminDb.doc("events/qa-waitlist-eligible"), eventFixture("QA Eligible Waitlist Event", {
    capacity: 3,
    manualSeatsReserved: 1,
    ticketsSold: 2,
    waitlistEnabled: true,
  }));
  batch.set(adminDb.doc("events/qa-waitlist-inactive"), eventFixture("QA Inactive Waitlist Event", {
    capacity: 3,
    isActive: false,
    manualSeatsReserved: 1,
    ticketsSold: 2,
    waitlistEnabled: true,
  }));
  batch.set(adminDb.doc("events/qa-waitlist-open"), eventFixture("QA Open Waitlist Event", {
    capacity: 10,
    manualSeatsReserved: 1,
    ticketsSold: 2,
    waitlistEnabled: true,
  }));
  batch.set(adminDb.doc("events/qa-waitlist-disabled"), eventFixture("QA Disabled Waitlist Event", {
    capacity: 3,
    manualSeatsReserved: 1,
    ticketsSold: 2,
    waitlistEnabled: false,
  }));
  batch.set(adminDb.doc("events/qa-waitlist-unpublished"), eventFixture("QA Unpublished Waitlist Event", {
    capacity: 3,
    manualSeatsReserved: 1,
    published: false,
    ticketsSold: 2,
    waitlistEnabled: true,
  }));
  batch.set(adminDb.doc("events/qa-waitlist-past"), eventFixture("QA Past Waitlist Event", {
    capacity: 3,
    date: daysFromNow(-30),
    eventDates: ["Phase 34 Past Session"],
    manualSeatsReserved: 1,
    ticketsSold: 2,
    waitlistEnabled: true,
  }));
  await batch.commit();

  return {
    adminEmail,
    adminPassword,
    projectId,
  };
};

const setConcurrentTicketsSold = async () => {
  await adminDb.doc("events/qa-event").update({
    ticketsSold: 7,
    updatedAt: timestamp.now(),
  });

  return { ticketsSold: 7 };
};

const assertInventorySave = async () => {
  const [productSnapshot, eventSnapshot, movementSnapshot] = await Promise.all([
    adminDb.doc("products/qa-product-a").get(),
    adminDb.doc("events/qa-event").get(),
    adminDb.collection("inventoryMovements").get(),
  ]);
  const product = productSnapshot.data();
  const event = eventSnapshot.data();
  const movements = movementSnapshot.docs
    .map((document) => document.data())
    .filter((movement) => fixtureLinkedIds.has(movement.linkedId));
  const productMovements = movements.filter((movement) => movement.linkedId === "qa-product-a");
  const eventMovements = movements.filter((movement) => movement.linkedId === "qa-event");

  assert(product.variants[0].stockOnHand === 13, "QA Product A stock should be 13.");
  assert(event.capacity === 32, "QA event capacity should be 32.");
  assert(event.manualSeatsReserved === 4, "QA event holds should be 4.");
  assert(event.ticketsSold === 7, "QA event must preserve the concurrent ticketsSold value 7.");
  assert(movements.length === 2, "Expected exactly two Phase 34 inventory movements.");
  assert(productMovements.length === 1, "Expected exactly one QA Product A movement.");
  assert(productMovements[0].quantityDelta === 3, "Product movement should add 3 units.");
  assert(productMovements[0].linkedType === "product", "Product movement should target a product.");
  assert(productMovements[0].variantId === "jar", "Product movement should target the jar variant.");
  assert(productMovements[0].source === "manual", "Product movement should use the manual source.");
  assert(productMovements[0].reason === "manual_adjustment", "Product movement should record a manual adjustment.");
  assert(eventMovements.length === 1, "Expected exactly one QA event movement.");
  assert(eventMovements[0].quantityDelta === -2, "Event hold movement should remove 2 available seats.");
  assert(eventMovements[0].linkedType === "event", "Event movement should target an event.");
  assert(eventMovements[0].source === "manual", "Event movement should use the manual source.");
  assert(eventMovements[0].reason === "manual_adjustment", "Event movement should record a manual adjustment.");

  return {
    event: {
      capacity: event.capacity,
      manualSeatsReserved: event.manualSeatsReserved,
      ticketsSold: event.ticketsSold,
    },
    movementCount: movements.length,
    productStock: product.variants[0].stockOnHand,
  };
};

const resetConflictFixtures = async () => {
  await deleteMatchingDocuments(
    "inventoryMovements",
    (movement) => fixtureLinkedIds.has(movement.linkedId),
  );
  const batch = adminDb.batch();
  batch.update(adminDb.doc("products/qa-product-a"), {
    updatedAt: timestamp.now(),
    variants: [productVariant({ stockOnHand: 10 })],
  });
  batch.update(adminDb.doc("products/qa-product-b"), {
    updatedAt: timestamp.now(),
    variants: [productVariant({ sku: "CG-QA-B-JAR", stockOnHand: 20 })],
  });
  await batch.commit();

  return { productA: 10, productB: 20 };
};

const setConcurrentProductStock = async () => {
  await adminDb.doc("products/qa-product-a").update({
    updatedAt: timestamp.now(),
    variants: [productVariant({ stockOnHand: 9 })],
  });

  return { productA: 9 };
};

const assertConflict = async () => {
  assert(
    process.env.PHASE34_CONFLICT_UI_CONFIRMED === "true",
    "Confirm the browser showed the expected conflict message before asserting postconditions.",
  );
  const [productASnapshot, productBSnapshot, movementSnapshot] = await Promise.all([
    adminDb.doc("products/qa-product-a").get(),
    adminDb.doc("products/qa-product-b").get(),
    adminDb.collection("inventoryMovements").get(),
  ]);
  const productAStock = productASnapshot.data().variants[0].stockOnHand;
  const productBStock = productBSnapshot.data().variants[0].stockOnHand;

  assert(productAStock === 9, "Concurrent QA Product A stock should survive the rejected save.");
  assert(productBStock === 20, "QA Product B should not be partially written after a conflict.");
  const fixtureMovementCount = movementSnapshot.docs
    .map((document) => document.data())
    .filter((movement) => fixtureLinkedIds.has(movement.linkedId))
    .length;

  assert(fixtureMovementCount === 0, "A rejected bulk save must not create inventory movements.");

  return {
    movementCount: fixtureMovementCount,
    productAStock,
    productBStock,
  };
};

const waitlistEntry = (eventId, eventTitle, eventDate) => ({
  createdAt: serverTimestamp(),
  email: "waitlist@local.test",
  eventDate,
  eventId,
  eventTitle,
  message: "Emulator-only rule verification.",
  name: "Waitlist QA",
  phone: "",
  status: "new",
});

const verifyWaitlistRules = async () => {
  const clientApp = initializeApp({
    apiKey: "demo-api-key",
    appId: "1:123456789:web:phase34",
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
  }, `phase34-waitlist-${Date.now()}`);
  const clientDb = getFirestore(clientApp);
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);
  const waitlistCollection = collection(clientDb, "eventWaitlist");
  const results = [];

  const expectAllowed = async (label, entry) => {
    await addDoc(waitlistCollection, entry);
    results.push({ allowed: true, label });
  };

  const expectDenied = async (label, entry) => {
    try {
      await addDoc(waitlistCollection, entry);
      throw new Error(`${label} unexpectedly passed waitlist rules.`);
    } catch (error) {
      if (String(error.message).includes("unexpectedly passed")) {
        throw error;
      }

      assert(error.code === "permission-denied", `${label} should fail with permission-denied.`);
      results.push({ allowed: false, label });
    }
  };

  try {
    await expectAllowed("eligible event", waitlistEntry(
      "qa-waitlist-eligible",
      "QA Eligible Waitlist Event",
      "Phase 34 Future Session",
    ));
    await expectDenied("missing event", waitlistEntry(
      "qa-waitlist-missing",
      "QA Missing Waitlist Event",
      "Phase 34 Future Session",
    ));
    await expectDenied("inactive event", waitlistEntry(
      "qa-waitlist-inactive",
      "QA Inactive Waitlist Event",
      "Phase 34 Future Session",
    ));
    await expectDenied("event below capacity", waitlistEntry(
      "qa-waitlist-open",
      "QA Open Waitlist Event",
      "Phase 34 Future Session",
    ));
    await expectDenied("waitlist disabled", waitlistEntry(
      "qa-waitlist-disabled",
      "QA Disabled Waitlist Event",
      "Phase 34 Future Session",
    ));
    await expectDenied("unpublished event", waitlistEntry(
      "qa-waitlist-unpublished",
      "QA Unpublished Waitlist Event",
      "Phase 34 Future Session",
    ));
    await expectDenied("past event", waitlistEntry(
      "qa-waitlist-past",
      "QA Past Waitlist Event",
      "Phase 34 Past Session",
    ));
    await expectDenied("mismatched title", waitlistEntry(
      "qa-waitlist-eligible",
      "Wrong Event Title",
      "Phase 34 Future Session",
    ));
    await expectDenied("mismatched date", waitlistEntry(
      "qa-waitlist-eligible",
      "QA Eligible Waitlist Event",
      "Wrong Session",
    ));

    const savedEntries = await adminDb.collection("eventWaitlist").get();
    const fixtureEntryCount = savedEntries.docs
      .map((document) => document.data())
      .filter((entry) => fixtureEventIds.includes(entry.eventId))
      .length;
    assert(fixtureEntryCount === 1, "Exactly one eligible waitlist entry should be saved.");
  } finally {
    await deleteApp(clientApp);
  }

  return { results, savedEntryCount: 1 };
};

const commands = {
  "assert-conflict": assertConflict,
  "assert-inventory": assertInventorySave,
  cleanup: clearFixtures,
  "reset-conflict": resetConflictFixtures,
  seed,
  "set-concurrent-stock": setConcurrentProductStock,
  "set-concurrent-tickets": setConcurrentTicketsSold,
  "verify-cleanup-scope": verifyCleanupScope,
  "verify-waitlist": verifyWaitlistRules,
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
