/** @jest-environment node */

const {
  TextDecoder,
  TextEncoder,
} = require("util");

global.TextDecoder = global.TextDecoder || TextDecoder;
global.TextEncoder = global.TextEncoder || TextEncoder;

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
  setDoc,
} = require("firebase/firestore");

const {
  discardAdminDraft,
  publishAdminDraft,
  saveAdminDraft,
} = require("./adminDrafts");
const { productSkuRegistryId } = require("./productSkuRegistry");

const runEmulatorTests = process.env.RUN_DRAFT_PUBLISH_EMULATOR_TESTS === "true";
const describeWithEmulators = runEmulatorTests ? describe : describe.skip;
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "";
const adminUid = "phase38-draft-admin";
const adminEmail = "phase38-draft-admin@local.test";
const adminPassword = "phase38-emulator-only-password";
const productId = "phase38-product";
const newProductId = "phase38-new-product";
const secondNewProductId = "phase38-second-new-product";
const eventId = "phase38-event";
const contentId = "phase38-content";

const admin = require("../../functions/node_modules/firebase-admin");

const futureTimestamp = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const productVariant = (overrides = {}) => ({
  active: true,
  id: "jar",
  inventoryTracked: true,
  label: "Jar",
  lowStockThreshold: 2,
  price: "15.00",
  priceOptionIndex: 0,
  sku: "PHASE38-JAR",
  sortOrder: 0,
  stockOnHand: 10,
  ...overrides,
});

const productData = (overrides = {}) => ({
  category: "culinary",
  inStock: true,
  isActive: true,
  photos: [],
  priceOptions: [{ option: "Jar", price: "15.00" }],
  published: true,
  shipping: "17.00",
  slug: productId,
  title: "Phase 38 Product",
  variants: [productVariant()],
  ...overrides,
});

const eventData = (overrides = {}) => ({
  capacity: 30,
  category: "Experience",
  date: futureTimestamp(),
  eventDates: ["Phase 38 Future Session"],
  info: ["Emulator-only draft publish fixture."],
  inStock: true,
  isActive: true,
  manualSeatsReserved: 2,
  photos: [],
  priceOptions: ["60.00"],
  published: true,
  shipping: "0.00",
  ticketsSold: 5,
  title: "Phase 38 Event",
  waitlistEnabled: false,
  ...overrides,
});

const contentData = (overrides = {}) => ({
  published: true,
  sections: {
    title: "Phase 38 Content",
  },
  sortOrder: 99,
  ...overrides,
});

describeWithEmulators("admin draft publish transactions", () => {
  let adminApp;
  let adminAuth;
  let adminDb;
  let clientApp;
  let clientDb;

  const deleteAdminUser = async () => {
    try {
      await adminAuth.deleteUser(adminUid);
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }
  };

  const clearFixtures = async () => {
    const skuRegistry = await adminDb.collection("productSkus").get();
    const batch = adminDb.batch();
    skuRegistry.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    [productId, newProductId, secondNewProductId].forEach((id) => {
      batch.delete(adminDb.doc(`products/${id}`));
      batch.delete(adminDb.doc(`productDrafts/${id}`));
    });
    batch.delete(adminDb.doc(`events/${eventId}`));
    batch.delete(adminDb.doc(`eventDrafts/${eventId}`));
    batch.delete(adminDb.doc(`siteContent/${contentId}`));
    batch.delete(adminDb.doc(`siteContentDrafts/${contentId}`));
    await batch.commit();
  };

  const resetFixtures = async () => {
    await clearFixtures();
    const batch = adminDb.batch();
    batch.set(adminDb.doc(`products/${productId}`), productData());
    batch.set(adminDb.doc(`events/${eventId}`), eventData());
    batch.set(adminDb.doc(`siteContent/${contentId}`), contentData());
    await batch.commit();
  };

  beforeAll(async () => {
    expect(projectId).toBe("demo-calabash-gardens");
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBe("127.0.0.1:8080");
    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBe("127.0.0.1:9099");

    adminApp = admin.initializeApp({ projectId }, `phase38-${Date.now()}`);
    adminAuth = adminApp.auth();
    adminDb = adminApp.firestore();
    await deleteAdminUser();
    await adminAuth.createUser({
      displayName: "Phase 38 Draft Admin",
      email: adminEmail,
      emailVerified: true,
      password: adminPassword,
      uid: adminUid,
    });

    const seedBatch = adminDb.batch();
    seedBatch.set(adminDb.doc(`adminUsers/${adminUid}`), {
      active: true,
      email: adminEmail,
      role: "admin",
    });
    seedBatch.set(adminDb.doc("productCategories/culinary"), {
      active: true,
      name: "Culinary",
    });
    await seedBatch.commit();

    clientApp = initializeApp({
      apiKey: "phase38-demo-key",
      appId: "1:123456789:web:phase38-draft-publish",
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
    }, `phase38-client-${Date.now()}`);
    const clientAuth = getAuth(clientApp);
    clientDb = getFirestore(clientApp);
    connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);
    await signInWithEmailAndPassword(clientAuth, adminEmail, adminPassword);
  }, 30000);

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    if (!adminDb) {
      return;
    }

    await clearFixtures();
    await adminDb.doc(`adminUsers/${adminUid}`).delete();
    await adminDb.doc("productCategories/culinary").delete();
    await deleteAdminUser();
    if (clientApp) {
      await deleteApp(clientApp);
    }
    if (adminApp) {
      await adminApp.delete();
    }
  }, 30000);

  test("publishing product content preserves inventory and derives availability", async () => {
    const saved = await saveAdminDraft({
      data: productData({ title: "Draft Product Title" }),
      db: clientDb,
      expectedTargetExists: true,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });

    expect(saved.draftRevision).toBe(1);
    await adminDb.doc(`products/${productId}`).update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      variants: [productVariant({ stockOnHand: 0 })],
    });

    await publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: saved.draftRevision,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });

    const [liveSnapshot, draftSnapshot] = await Promise.all([
      adminDb.doc(`products/${productId}`).get(),
      adminDb.doc(`productDrafts/${productId}`).get(),
    ]);
    expect(liveSnapshot.data().title).toBe("Draft Product Title");
    expect(liveSnapshot.data().variants[0].stockOnHand).toBe(0);
    expect(liveSnapshot.data().inStock).toBe(false);
    expect(liveSnapshot.data().contentRevision).toBe(1);
    expect(draftSnapshot.data().draftStatus).toBe("published");
    expect(draftSnapshot.data().draftPublishedContentRevision).toBe(1);
    expect(draftSnapshot.data().draftRevision).toBe(2);
    const skuClaim = (await adminDb.doc(
      `productSkus/${productSkuRegistryId("PHASE38-JAR")}`,
    ).get()).data();
    expect(skuClaim).toMatchObject({
      productId,
      sku: "PHASE38-JAR",
      variantId: "jar",
    });
  });

  test("publishing legacy product content does not create inventory variants", async () => {
    const legacyProduct = productData({ title: "Phase 38 Legacy Product" });
    delete legacyProduct.variants;
    await adminDb.doc(`products/${productId}`).set(legacyProduct);
    const saved = await saveAdminDraft({
      data: { ...legacyProduct, title: "Updated Legacy Product" },
      db: clientDb,
      expectedTargetExists: true,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });

    await publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: saved.draftRevision,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });

    const live = (await adminDb.doc(`products/${productId}`).get()).data();
    expect(live.title).toBe("Updated Legacy Product");
    expect(live.inStock).toBe(true);
    expect(live.variants).toBeUndefined();
    expect((await adminDb.collection("productSkus").get()).empty).toBe(true);
  });

  test("publishing can remove an optional product sort order", async () => {
    await adminDb.doc(`products/${productId}`).update({ sortOrder: 4 });
    const saved = await saveAdminDraft({
      data: productData({ title: "Product Without Sort Order" }),
      db: clientDb,
      deletedFields: ["sortOrder"],
      expectedTargetExists: true,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });

    await publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: saved.draftRevision,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });

    const live = (await adminDb.doc(`products/${productId}`).get()).data();
    expect(live.title).toBe("Product Without Sort Order");
    expect(live.sortOrder).toBeUndefined();
  });

  test("publishing event content preserves ticket sales changed after draft save", async () => {
    const draftPayload = eventData({ title: "Draft Event Title" });
    delete draftPayload.ticketsSold;
    const saved = await saveAdminDraft({
      data: draftPayload,
      db: clientDb,
      expectedTargetExists: true,
      targetCollection: "events",
      targetId: eventId,
      userId: adminUid,
    });

    await adminDb.doc(`events/${eventId}`).update({
      ticketsSold: 8,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: saved.draftRevision,
      targetCollection: "events",
      targetId: eventId,
      userId: adminUid,
    });

    const live = (await adminDb.doc(`events/${eventId}`).get()).data();
    expect(live.title).toBe("Draft Event Title");
    expect(live.ticketsSold).toBe(8);
    expect(live.capacity).toBe(30);
    expect(live.contentRevision).toBe(1);
  });

  test("a conflicting content publish changes neither the live record nor draft status", async () => {
    const saved = await saveAdminDraft({
      data: contentData({ sections: { title: "Draft Content" } }),
      db: clientDb,
      expectedTargetExists: true,
      targetCollection: "siteContent",
      targetId: contentId,
      userId: adminUid,
    });

    await adminDb.doc(`siteContent/${contentId}`).update({
      sections: { title: "Concurrent Live Content" },
    });

    await expect(publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: saved.draftRevision,
      targetCollection: "siteContent",
      targetId: contentId,
      userId: adminUid,
    })).rejects.toMatchObject({ name: "DraftPublishConflictError" });

    const [liveSnapshot, draftSnapshot] = await Promise.all([
      adminDb.doc(`siteContent/${contentId}`).get(),
      adminDb.doc(`siteContentDrafts/${contentId}`).get(),
    ]);
    expect(liveSnapshot.data().sections.title).toBe("Concurrent Live Content");
    expect(liveSnapshot.data().contentRevision).toBeUndefined();
    expect(draftSnapshot.data().draftStatus).toBe("draft");
    expect(draftSnapshot.data().draftRevision).toBe(1);
    expect(draftSnapshot.data().draftPublishedAt).toBeUndefined();
  });

  test("a reviewed revision cannot publish after the draft changes", async () => {
    const firstSave = await saveAdminDraft({
      data: contentData({ sections: { title: "First Draft" } }),
      db: clientDb,
      expectedTargetExists: true,
      targetCollection: "siteContent",
      targetId: contentId,
      userId: adminUid,
    });
    const secondSave = await saveAdminDraft({
      data: contentData({ sections: { title: "Second Draft" } }),
      db: clientDb,
      expectedTargetExists: true,
      targetCollection: "siteContent",
      targetId: contentId,
      userId: adminUid,
    });

    expect(secondSave.draftRevision).toBe(2);
    await expect(publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: firstSave.draftRevision,
      targetCollection: "siteContent",
      targetId: contentId,
      userId: adminUid,
    })).rejects.toThrow(/changed after review/i);

    const live = (await adminDb.doc(`siteContent/${contentId}`).get()).data();
    expect(live.sections.title).toBe("Phase 38 Content");
  });

  test("a new draft publishes as one new live document", async () => {
    const saved = await saveAdminDraft({
      data: productData({
        slug: newProductId,
        title: "Phase 38 New Product",
        variants: [productVariant({ sku: "PHASE38-NEW-JAR" })],
      }),
      db: clientDb,
      expectedTargetExists: false,
      targetCollection: "products",
      targetId: newProductId,
      userId: adminUid,
    });

    await publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: saved.draftRevision,
      targetCollection: "products",
      targetId: newProductId,
      userId: adminUid,
    });

    const [liveSnapshot, draftSnapshot] = await Promise.all([
      adminDb.doc(`products/${newProductId}`).get(),
      adminDb.doc(`productDrafts/${newProductId}`).get(),
    ]);
    expect(liveSnapshot.exists).toBe(true);
    expect(liveSnapshot.data().title).toBe("Phase 38 New Product");
    expect(liveSnapshot.data().contentRevision).toBe(1);
    expect(draftSnapshot.data().draftStatus).toBe("published");
  });

  test("simultaneous product publishes cannot claim the same SKU", async () => {
    const sharedSku = "PHASE38-SHARED-JAR";
    const firstSave = await saveAdminDraft({
      data: productData({
        slug: newProductId,
        title: "Phase 38 First SKU Owner",
        variants: [productVariant({ sku: sharedSku })],
      }),
      db: clientDb,
      expectedTargetExists: false,
      targetCollection: "products",
      targetId: newProductId,
      userId: adminUid,
    });
    const secondSave = await saveAdminDraft({
      data: productData({
        slug: secondNewProductId,
        title: "Phase 38 Second SKU Owner",
        variants: [productVariant({ sku: sharedSku })],
      }),
      db: clientDb,
      expectedTargetExists: false,
      targetCollection: "products",
      targetId: secondNewProductId,
      userId: adminUid,
    });
    const results = await Promise.allSettled([
      publishAdminDraft({
        db: clientDb,
        expectedDraftRevision: firstSave.draftRevision,
        targetCollection: "products",
        targetId: newProductId,
        userId: adminUid,
      }),
      publishAdminDraft({
        db: clientDb,
        expectedDraftRevision: secondSave.draftRevision,
        targetCollection: "products",
        targetId: secondNewProductId,
        userId: adminUid,
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected").reason)
      .toMatchObject({ name: "DraftPublishConflictError" });
    const claim = (await adminDb.doc(
      `productSkus/${productSkuRegistryId(sharedSku)}`,
    ).get()).data();
    expect([newProductId, secondNewProductId]).toContain(claim.productId);
  });

  test("product publish transfers and releases SKU claims with variant edits", async () => {
    const firstSave = await saveAdminDraft({
      data: productData({ title: "Initial SKU Claim" }),
      db: clientDb,
      expectedTargetExists: true,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });
    await publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: firstSave.draftRevision,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });

    const transferredVariant = productVariant({
      id: "bottle",
      label: "Bottle",
    });
    const transferSave = await saveAdminDraft({
      data: productData({
        title: "Transferred SKU Claim",
        variants: [transferredVariant],
      }),
      db: clientDb,
      expectedTargetExists: true,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });
    await publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: transferSave.draftRevision,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });

    const originalClaimRef = adminDb.doc(
      `productSkus/${productSkuRegistryId("PHASE38-JAR")}`,
    );
    expect((await originalClaimRef.get()).data()).toMatchObject({
      productId,
      variantId: "bottle",
    });

    const replacementSku = "PHASE38-BOTTLE";
    const replacementSave = await saveAdminDraft({
      data: productData({
        title: "Replacement SKU Claim",
        variants: [{ ...transferredVariant, sku: replacementSku }],
      }),
      db: clientDb,
      expectedTargetExists: true,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });
    await publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: replacementSave.draftRevision,
      targetCollection: "products",
      targetId: productId,
      userId: adminUid,
    });

    expect((await originalClaimRef.get()).exists).toBe(false);
    expect((await adminDb.doc(
      `productSkus/${productSkuRegistryId(replacementSku)}`,
    ).get()).data()).toMatchObject({
      productId,
      sku: replacementSku,
      variantId: "bottle",
    });
  });

  test("two simultaneous publish attempts commit exactly once", async () => {
    const saved = await saveAdminDraft({
      data: contentData({ sections: { title: "Published Once" } }),
      db: clientDb,
      expectedTargetExists: true,
      targetCollection: "siteContent",
      targetId: contentId,
      userId: adminUid,
    });
    const publishRequest = () => publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: saved.draftRevision,
      targetCollection: "siteContent",
      targetId: contentId,
      userId: adminUid,
    });

    const results = await Promise.allSettled([publishRequest(), publishRequest()]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ name: "DraftPublishConflictError" });

    const [liveSnapshot, draftSnapshot] = await Promise.all([
      adminDb.doc(`siteContent/${contentId}`).get(),
      adminDb.doc(`siteContentDrafts/${contentId}`).get(),
    ]);
    expect(liveSnapshot.data().sections.title).toBe("Published Once");
    expect(liveSnapshot.data().contentRevision).toBe(1);
    expect(draftSnapshot.data().draftStatus).toBe("published");
    expect(draftSnapshot.data().draftRevision).toBe(2);
  });

  test("a live record created after a draft-only save is not overwritten", async () => {
    const saved = await saveAdminDraft({
      data: productData({
        slug: newProductId,
        title: "Draft-only Product",
      }),
      db: clientDb,
      expectedTargetExists: false,
      targetCollection: "products",
      targetId: newProductId,
      userId: adminUid,
    });

    await adminDb.doc(`products/${newProductId}`).set(productData({
      slug: newProductId,
      title: "Concurrently Created Product",
    }));

    await expect(publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: saved.draftRevision,
      targetCollection: "products",
      targetId: newProductId,
      userId: adminUid,
    })).rejects.toThrow(/created or removed/i);

    const [liveSnapshot, draftSnapshot] = await Promise.all([
      adminDb.doc(`products/${newProductId}`).get(),
      adminDb.doc(`productDrafts/${newProductId}`).get(),
    ]);
    expect(liveSnapshot.data().title).toBe("Concurrently Created Product");
    expect(draftSnapshot.data().draftStatus).toBe("draft");
    expect(draftSnapshot.data().draftPublishedAt).toBeUndefined();
  });

  test("a legacy draft cannot publish against an existing live record", async () => {
    await adminDb.doc(`eventDrafts/${eventId}`).set({
      ...eventData({ title: "Unsafe Legacy Draft" }),
      draftStatus: "draft",
      draftTargetCollection: "events",
      draftTargetId: eventId,
      draftUpdatedAt: admin.firestore.Timestamp.now(),
      draftUpdatedBy: adminUid,
    });

    await expect(publishAdminDraft({
      db: clientDb,
      expectedDraftRevision: 1,
      targetCollection: "events",
      targetId: eventId,
      userId: adminUid,
    })).rejects.toThrow(/predates safe publishing/i);

    const [liveSnapshot, draftSnapshot] = await Promise.all([
      adminDb.doc(`events/${eventId}`).get(),
      adminDb.doc(`eventDrafts/${eventId}`).get(),
    ]);
    expect(liveSnapshot.data().title).toBe("Phase 38 Event");
    expect(draftSnapshot.data().draftStatus).toBe("draft");
    expect(draftSnapshot.data().draftPublishedAt).toBeUndefined();
  });

  test("discard upgrades a legacy event draft and removes retired fields", async () => {
    await adminDb.doc(`eventDrafts/${eventId}`).set({
      ...eventData(),
      draftStatus: "draft",
      draftTargetCollection: "events",
      draftTargetId: eventId,
      draftUpdatedAt: admin.firestore.Timestamp.now(),
      draftUpdatedBy: adminUid,
      eventType: "retired",
      sortOrder: 12,
    });

    await discardAdminDraft({
      db: clientDb,
      targetCollection: "events",
      targetId: eventId,
      userId: adminUid,
    });

    const discarded = (await adminDb.doc(`eventDrafts/${eventId}`).get()).data();
    expect(discarded.draftStatus).toBe("discarded");
    expect(discarded.draftRevision).toBe(1);
    expect(discarded.draftBaseTargetExists).toBe(true);
    expect(discarded.eventType).toBeUndefined();
    expect(discarded.sortOrder).toBeUndefined();
  });

  test("rules reject an admin draft write that omits transactional metadata", async () => {
    await expect(setDoc(doc(clientDb, "siteContentDrafts", "phase38-invalid"), {
      draftStatus: "draft",
      draftTargetCollection: "siteContent",
      draftTargetId: "phase38-invalid",
      draftUpdatedAt: new Date(),
      draftUpdatedBy: adminUid,
      published: true,
      sections: {},
    })).rejects.toMatchObject({ code: "permission-denied" });
  });
});
