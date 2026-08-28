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
  updateDoc,
} = require("firebase/firestore");

const {
  InventoryConflictError,
  variantsForProduct,
} = require("./inventoryAdminModel");
const { saveInventoryRowsTransaction } = require("./inventoryAdminTransactions");
const { productSkuRegistryId } = require("../../data/productSkuRegistry");

const runEmulatorTests = process.env.RUN_INVENTORY_ADMIN_EMULATOR_TESTS === "true";
const describeWithEmulators = runEmulatorTests ? describe : describe.skip;
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "";
const adminUid = "phase40-inventory-admin";
const adminEmail = "phase40-inventory-admin@local.test";
const adminPassword = "phase40-emulator-only-password";
const productId = "phase40-product";

const admin = require("../../../functions/node_modules/firebase-admin");

const priceOptions = [
  { option: "Small", price: "10.00" },
  { option: "Large", price: "20.00" },
];

const productData = (overrides = {}) => ({
  category: "culinary",
  inStock: true,
  isActive: true,
  photos: [{ alt: "Unchanged", path: "product-images/unchanged.webp", sortOrder: 0 }],
  priceOptions,
  published: true,
  shipping: "17.00",
  slug: productId,
  title: "Phase 40 Product",
  ...overrides,
});

const completeVariant = (overrides = {}) => ({
  active: true,
  id: "small",
  inventoryTracked: true,
  label: "Small",
  lowStockThreshold: 2,
  price: "10.00",
  priceOptionIndex: 0,
  sku: "PHASE40-SMALL",
  sortOrder: 0,
  stockOnHand: 10,
  ...overrides,
});

const rowForVariant = (product, index) => {
  const variant = variantsForProduct(product, productId)[index];
  const storedInventoryTracked = variant.inventoryTracked === true;

  return {
    active: variant.active === true,
    id: `product-${productId}-${variant.priceOptionIndex}-${variant.id}`,
    inventoryTracked: variant.inventorySetupRequired === true
      ? false
      : storedInventoryTracked,
    inventorySetupRequired: variant.inventorySetupRequired === true,
    lowStockThreshold: variant.lowStockThreshold,
    priceOptionIndex: variant.priceOptionIndex,
    primary: product.title,
    productId,
    secondary: variant.label,
    stockOnHand: Number.isInteger(variant.stockOnHand) ? variant.stockOnHand : 0,
    storedInventoryTracked,
    type: "product",
    variantId: String(variant.id || ""),
  };
};

const draftForRow = (row, overrides = {}) => ({
  active: row.active,
  inventoryTracked: row.inventoryTracked,
  lowStockThreshold: row.lowStockThreshold === null ? "" : String(row.lowStockThreshold),
  stockOnHand: String(row.stockOnHand),
  ...overrides,
});

describeWithEmulators("admin inventory transactions", () => {
  let adminApp;
  let adminAuth;
  let adminDb;
  let clientApp;
  let clientDb;
  let anonymousApp;
  let anonymousDb;

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
    const movements = await adminDb.collection("inventoryMovements").get();
    const skuRegistry = await adminDb.collection("productSkus").get();
    const batch = adminDb.batch();
    movements.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    skuRegistry.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    batch.delete(adminDb.doc(`products/${productId}`));
    await batch.commit();
  };

  const seedProduct = async (product) => {
    await adminDb.doc(`products/${productId}`).set(product);
  };

  const movements = async () => (
    (await adminDb.collection("inventoryMovements").get()).docs.map((snapshot) => snapshot.data())
  );

  beforeAll(async () => {
    expect(projectId).toBe("demo-calabash-gardens");
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBe("127.0.0.1:8080");
    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBe("127.0.0.1:9099");

    adminApp = admin.initializeApp({ projectId }, `phase40-${Date.now()}`);
    adminAuth = adminApp.auth();
    adminDb = adminApp.firestore();
    await deleteAdminUser();
    await adminAuth.createUser({
      displayName: "Phase 40 Inventory Admin",
      email: adminEmail,
      emailVerified: true,
      password: adminPassword,
      uid: adminUid,
    });
    await adminDb.doc(`adminUsers/${adminUid}`).set({
      active: true,
      email: adminEmail,
      role: "admin",
    });
    await adminDb.doc("productCategories/culinary").set({
      active: true,
      name: "Culinary",
    });

    clientApp = initializeApp({
      apiKey: "phase40-demo-key",
      appId: "1:123456789:web:phase40-inventory",
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
    }, `phase40-client-${Date.now()}`);
    const clientAuth = getAuth(clientApp);
    clientDb = getFirestore(clientApp);
    connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);
    await signInWithEmailAndPassword(clientAuth, adminEmail, adminPassword);

    anonymousApp = initializeApp({
      apiKey: "phase40-anonymous-key",
      appId: "1:123456789:web:phase40-anonymous",
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
    }, `phase40-anonymous-${Date.now()}`);
    anonymousDb = getFirestore(anonymousApp);
    connectFirestoreEmulator(anonymousDb, "127.0.0.1", 8080);
  }, 30000);

  beforeEach(async () => {
    await clearFixtures();
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
    if (anonymousApp) {
      await deleteApp(anonymousApp);
    }
    if (adminApp) {
      await adminApp.delete();
    }
  }, 30000);

  test("an admin save initializes every legacy option and changes no product content", async () => {
    const original = productData();
    await seedProduct(original);
    const rows = [rowForVariant(original, 0), rowForVariant(original, 1)];

    await saveInventoryRowsTransaction({
      db: clientDb,
      dirtyRows: rows,
      draftRows: {
        [rows[0].id]: draftForRow(rows[0], { inventoryTracked: true, stockConfirmed: true, stockOnHand: "5" }),
        [rows[1].id]: draftForRow(rows[1], { inventoryTracked: true, stockConfirmed: true, stockOnHand: "0" }),
      },
    });

    const saved = (await adminDb.doc(`products/${productId}`).get()).data();
    expect(saved).toMatchObject({
      category: original.category,
      inStock: true,
      isActive: original.isActive,
      photos: original.photos,
      priceOptions: original.priceOptions,
      published: original.published,
      shipping: original.shipping,
      title: original.title,
    });
    expect(saved.variants).toMatchObject([
      {
        active: true,
        id: "small",
        priceOptionIndex: 0,
        sku: "CG-PHASE40-PRODUCT-SMALL",
        stockOnHand: 5,
      },
      {
        active: true,
        id: "large",
        priceOptionIndex: 1,
        sku: "CG-PHASE40-PRODUCT-LARGE",
        stockOnHand: 0,
      },
    ]);
    const skuClaims = (await adminDb.collection("productSkus").get()).docs
      .map((snapshot) => snapshot.data());
    expect(skuClaims).toHaveLength(2);
    expect(skuClaims).toEqual(expect.arrayContaining([
      expect.objectContaining({
        productId,
        sku: "CG-PHASE40-PRODUCT-SMALL",
        variantId: "small",
      }),
      expect.objectContaining({
        productId,
        sku: "CG-PHASE40-PRODUCT-LARGE",
        variantId: "large",
      }),
    ]));
    expect(await movements()).toMatchObject([{
      linkedId: productId,
      quantityDelta: 5,
      sku: "CG-PHASE40-PRODUCT-SMALL",
      variantId: "small",
    }]);
  });

  test("a partial legacy list is completed while its custom variant identity is preserved", async () => {
    const partial = productData({
      variants: [completeVariant({
        id: "large-custom",
        label: "Large",
        price: "20.00",
        priceOptionIndex: 1,
        sku: "JETTE-CUSTOM-LARGE",
        sortOrder: 1,
        stockOnHand: 3,
      })],
    });
    await seedProduct(partial);
    const rows = [rowForVariant(partial, 0), rowForVariant(partial, 1)];

    await saveInventoryRowsTransaction({
      db: clientDb,
      dirtyRows: rows,
      draftRows: {
        [rows[0].id]: draftForRow(rows[0], { inventoryTracked: true, stockConfirmed: true, stockOnHand: "4" }),
        [rows[1].id]: draftForRow(rows[1], { inventoryTracked: false, stockConfirmed: true, stockOnHand: "3" }),
      },
    });

    const saved = (await adminDb.doc(`products/${productId}`).get()).data();
    expect(saved.variants).toMatchObject([
      { id: "small", priceOptionIndex: 0, stockOnHand: 4 },
      {
        id: "large-custom",
        inventoryTracked: false,
        priceOptionIndex: 1,
        sku: "JETTE-CUSTOM-LARGE",
        stockOnHand: 3,
      },
    ]);
  });

  test("a threshold-only edit preserves stock changed after the admin loaded the row", async () => {
    const original = productData({
      priceOptions: [priceOptions[0]],
      variants: [completeVariant()],
    });
    await seedProduct(original);
    const row = rowForVariant(original, 0);
    await adminDb.doc(`products/${productId}`).update({
      variants: [completeVariant({ stockOnHand: 7 })],
    });

    await saveInventoryRowsTransaction({
      db: clientDb,
      dirtyRows: [row],
      draftRows: {
        [row.id]: draftForRow(row, { lowStockThreshold: "4" }),
      },
    });

    const saved = (await adminDb.doc(`products/${productId}`).get()).data();
    expect(saved.variants[0]).toMatchObject({ lowStockThreshold: 4, stockOnHand: 7 });
    expect(saved.inStock).toBe(true);
    expect(await movements()).toHaveLength(0);
  });

  test("a concurrent stock change rejects the entire save and creates no movement", async () => {
    const original = productData({
      priceOptions: [priceOptions[0]],
      variants: [completeVariant()],
    });
    await seedProduct(original);
    const row = rowForVariant(original, 0);
    await adminDb.doc(`products/${productId}`).update({
      variants: [completeVariant({ stockOnHand: 9 })],
    });

    await expect(saveInventoryRowsTransaction({
      db: clientDb,
      dirtyRows: [row],
      draftRows: {
        [row.id]: draftForRow(row, { stockOnHand: "8" }),
      },
    })).rejects.toBeInstanceOf(InventoryConflictError);

    const saved = (await adminDb.doc(`products/${productId}`).get()).data();
    expect(saved.variants[0].stockOnHand).toBe(9);
    expect(await movements()).toHaveLength(0);
  });

  test("an inventory save cannot claim a SKU owned by another product", async () => {
    const original = productData();
    await seedProduct(original);
    const rows = [rowForVariant(original, 0), rowForVariant(original, 1)];
    const sku = "CG-PHASE40-PRODUCT-SMALL";
    await adminDb.doc(`productSkus/${productSkuRegistryId(sku)}`).set({
      productId: "another-product",
      sku,
      updatedAt: admin.firestore.Timestamp.now(),
      updatedBy: "fixture",
      variantId: "small",
    });

    await expect(saveInventoryRowsTransaction({
      db: clientDb,
      dirtyRows: rows,
      draftRows: {
        [rows[0].id]: draftForRow(rows[0], { inventoryTracked: true, stockConfirmed: true, stockOnHand: "5" }),
        [rows[1].id]: draftForRow(rows[1], { inventoryTracked: true, stockConfirmed: true, stockOnHand: "0" }),
      },
    })).rejects.toMatchObject({
      name: "InventoryConflictError",
      rowIds: expect.arrayContaining(rows.map((row) => row.id)),
    });

    const saved = (await adminDb.doc(`products/${productId}`).get()).data();
    expect(saved.variants).toBeUndefined();
    expect(await movements()).toHaveLength(0);
  });

  test("malformed legacy inventory fails closed and anonymous writes are denied", async () => {
    const malformed = productData({
      priceOptions: [priceOptions[0]],
      variants: [completeVariant({ stockOnHand: "10" })],
    });
    await seedProduct(malformed);
    const row = rowForVariant(malformed, 0);
    const request = {
      dirtyRows: [row],
      draftRows: {
        [row.id]: draftForRow(row, { lowStockThreshold: "4", stockConfirmed: true }),
      },
    };

    await expect(saveInventoryRowsTransaction({ db: clientDb, ...request }))
      .rejects.toBeInstanceOf(InventoryConflictError);
    await expect(saveInventoryRowsTransaction({ db: anonymousDb, ...request }))
      .rejects.toMatchObject({ code: "permission-denied" });
    expect((await adminDb.doc(`products/${productId}`).get()).data().variants[0].stockOnHand)
      .toBe("10");
    expect(await movements()).toHaveLength(0);
  });

  test("Firestore rules reject blank SKUs, price mismatches, and incomplete mappings", async () => {
    const valid = productData({
      priceOptions: [priceOptions[0]],
      variants: [completeVariant()],
    });
    await seedProduct(valid);
    const productRef = doc(clientDb, "products", productId);

    await expect(updateDoc(productRef, {
      variants: [completeVariant({ sku: "" })],
    })).rejects.toMatchObject({ code: "permission-denied" });

    await expect(updateDoc(productRef, {
      variants: [completeVariant({ price: "16.00" })],
    })).rejects.toMatchObject({ code: "permission-denied" });

    await adminDb.doc(`products/${productId}`).set(productData({
      variants: [completeVariant()],
    }));
    await expect(updateDoc(productRef, {
      variants: [completeVariant()],
    })).rejects.toMatchObject({ code: "permission-denied" });
  });

  test("Firestore rules accept the supported maximum of three complete variants", async () => {
    const manyPriceOptions = Array.from({ length: 3 }, (_, index) => ({
      option: `Option ${index + 1}`,
      price: `${index + 1}.00`,
    }));
    const manyVariants = manyPriceOptions.map((priceOption, index) => ({
      active: true,
      id: `option-${index + 1}`,
      inventoryTracked: true,
      label: priceOption.option,
      lowStockThreshold: 2,
      price: priceOption.price,
      priceOptionIndex: index,
      sku: `PHASE40-OPTION-${index + 1}`,
      sortOrder: index,
      stockOnHand: 10,
    }));
    await seedProduct(productData({
      priceOptions: manyPriceOptions,
      variants: manyVariants,
    }));

    await expect(updateDoc(doc(clientDb, "products", productId), {
      title: "Phase 40 Product With Three Options",
    })).resolves.toBeUndefined();
  });

  test("Firestore rules restrict SKU ownership records to approved admins and valid shapes", async () => {
    const sku = "PHASE40-RULE-SKU";
    const payload = {
      productId,
      sku,
      updatedAt: new Date(),
      updatedBy: adminUid,
      variantId: "default",
    };

    await expect(setDoc(
      doc(clientDb, "productSkus", productSkuRegistryId(sku)),
      payload,
    )).resolves.toBeUndefined();
    await expect(setDoc(
      doc(anonymousDb, "productSkus", productSkuRegistryId("PHASE40-ANONYMOUS")),
      { ...payload, sku: "PHASE40-ANONYMOUS" },
    )).rejects.toMatchObject({ code: "permission-denied" });
    await expect(setDoc(
      doc(clientDb, "productSkus", productSkuRegistryId("PHASE40-INVALID")),
      { ...payload, sku: "PHASE40-INVALID", variantId: "" },
    )).rejects.toMatchObject({ code: "permission-denied" });
  });
});
