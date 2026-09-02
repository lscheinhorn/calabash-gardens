import { normalizeFirestoreProductForPublic } from "./publicProductAdapter";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
}));

jest.mock("firebase/storage", () => ({
  getDownloadURL: jest.fn(),
  ref: jest.fn(),
}));

const firestoreProduct = {
  id: "saffron-maple-syrup",
  isActive: true,
  priceOptions: [{ option: "4 oz", price: "15.00" }],
  published: true,
  title: "Saffron Maple Syrup",
  variants: [{
    active: true,
    id: "4-oz",
    inventoryTracked: true,
    label: "4 oz",
    lowStockThreshold: null,
    price: "15.00",
    priceOptionIndex: 0,
    sku: "CG-SAFFRON-MAPLE-SYRUP-4-OZ",
    sortOrder: 0,
    stockOnHand: 10,
  }],
};

describe("public product adapter admin preview state", () => {
  test("does not expose admin preview labels by default", () => {
    const product = normalizeFirestoreProductForPublic(firestoreProduct);

    expect(product.adminPreview).toBeUndefined();
  });

  test("includes exact inventory only for the admin preview opt-in", () => {
    const product = normalizeFirestoreProductForPublic(firestoreProduct, {
      includeAdminPreviewState: true,
    });

    expect(product.adminPreview).toEqual({
      draft: { savedAt: "", state: "live" },
      inventory: {
        isConfigured: true,
        options: [{ active: true, label: "4 oz", stockOnHand: 10 }],
      },
    });
  });

  test("passes unavailable draft status through the admin-only opt-in", () => {
    const product = normalizeFirestoreProductForPublic(firestoreProduct, {
      draftStatusAvailable: false,
      includeAdminPreviewState: true,
    });

    expect(product.adminPreview.draft.state).toBe("unavailable");
  });
});
