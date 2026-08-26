import { normalizeFirestoreProductForPublic } from "../../data/publicProductAdapter";
import {
  InventoryConflictError,
  mergeEventInventoryDraft,
  mergeProductInventoryDrafts,
  variantsForProduct,
} from "./inventoryAdminModel";

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

const productVariant = (overrides = {}) => ({
  active: true,
  id: "default",
  inventoryTracked: true,
  label: "Default",
  lowStockThreshold: 2,
  price: "15.00",
  priceOptionIndex: 0,
  sku: "CG-PRODUCT-DEFAULT",
  sortOrder: 0,
  stockOnHand: 10,
  ...overrides,
});

const productRow = (overrides = {}) => ({
  inventoryTracked: true,
  lowStockThreshold: 2,
  priceOptionIndex: 0,
  primary: "Test Product",
  productId: "test-product",
  secondary: "Default",
  stockOnHand: 10,
  variantId: "default",
  ...overrides,
});

const productDraft = (overrides = {}) => ({
  inventoryTracked: true,
  lowStockThreshold: "2",
  stockOnHand: "10",
  ...overrides,
});

const eventRow = (overrides = {}) => ({
  capacity: 30,
  manualSeatsReserved: 2,
  primary: "Test Event",
  productId: "test-event",
  ticketsSold: 5,
  waitlistEnabled: false,
  ...overrides,
});

const eventDraft = (overrides = {}) => ({
  capacity: "30",
  manualSeatsReserved: "2",
  waitlistEnabled: false,
  ...overrides,
});

describe("inventoryAdminModel", () => {
  test("legacy price options receive stable variant indexes", () => {
    const variants = variantsForProduct({
      inStock: true,
      priceOptions: [
        { option: "4 oz", price: "15.00" },
        { option: "8 oz", price: "27.00" },
      ],
    });

    expect(variants).toMatchObject([
      { id: "4-oz", priceOptionIndex: 0, sortOrder: 0 },
      { id: "8-oz", priceOptionIndex: 1, sortOrder: 1 },
    ]);
  });

  test("public price options respect explicit indexes and legacy array order", () => {
    const explicit = normalizeFirestoreProductForPublic({
      isActive: true,
      photos: [],
      priceOptions: [
        { option: "Small", price: "10.00" },
        { option: "Large", price: "20.00" },
      ],
      published: true,
      title: "Indexed Product",
      variants: [
        { id: "large", priceOptionIndex: 1, sku: "LARGE" },
        { id: "small", priceOptionIndex: 0, sku: "SMALL" },
      ],
    });
    const legacy = normalizeFirestoreProductForPublic({
      isActive: true,
      photos: [],
      priceOptions: [
        { option: "Small", price: "10.00" },
        { option: "Large", price: "20.00" },
      ],
      published: true,
      title: "Legacy Product",
      variants: [
        { id: "small", sku: "SMALL" },
        { id: "large", sku: "LARGE" },
      ],
    });

    expect(explicit.priceOptions.map((option) => option.variantId)).toEqual(["small", "large"]);
    expect(legacy.priceOptions.map((option) => option.variantId)).toEqual(["small", "large"]);
  });

  test("public price options do not overwrite mixed or duplicate variant indexes", () => {
    const mixed = normalizeFirestoreProductForPublic({
      isActive: true,
      photos: [],
      priceOptions: [
        { option: "Small", price: "10.00" },
        { option: "Large", price: "20.00" },
      ],
      published: true,
      title: "Mixed Product",
      variants: [
        { id: "legacy-small", sku: "LEGACY" },
        { id: "explicit-small", priceOptionIndex: 0, sku: "EXPLICIT" },
      ],
    });
    const duplicate = normalizeFirestoreProductForPublic({
      isActive: true,
      photos: [],
      priceOptions: [{ option: "Small", price: "10.00" }],
      published: true,
      title: "Duplicate Product",
      variants: [
        { id: "first", priceOptionIndex: 0, sku: "FIRST" },
        { id: "second", priceOptionIndex: 0, sku: "SECOND" },
      ],
    });

    expect(mixed.priceOptions.map((option) => option.variantId)).toEqual(["explicit-small", ""]);
    expect(duplicate.priceOptions[0].variantId).toBe("");
  });

  test("a threshold-only edit preserves stock changed by a concurrent sale", () => {
    const result = mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ lowStockThreshold: "3" }),
        row: productRow(),
      }],
      product: {
        variants: [productVariant({ stockOnHand: 8 })],
      },
    });

    expect(result.variants[0]).toMatchObject({
      lowStockThreshold: 3,
      stockOnHand: 8,
    });
    expect(result.movements).toEqual([]);
  });

  test("a stock edit rejects a concurrent stock change", () => {
    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ stockOnHand: "7" }),
        row: productRow(),
      }],
      product: {
        variants: [productVariant({ stockOnHand: 9 })],
      },
    })).toThrow(InventoryConflictError);
  });

  test("multiple variant edits preserve untouched variant data", () => {
    const result = mergeProductInventoryDrafts({
      changes: [
        {
          draft: productDraft({ stockOnHand: "8" }),
          row: productRow(),
        },
        {
          draft: productDraft({ lowStockThreshold: "5", stockOnHand: "20" }),
          row: productRow({
            lowStockThreshold: 4,
            priceOptionIndex: 1,
            secondary: "Large",
            stockOnHand: 20,
            variantId: "large",
          }),
        },
      ],
      product: {
        variants: [
          productVariant(),
          productVariant({
            id: "large",
            label: "Large",
            lowStockThreshold: 4,
            priceOptionIndex: 1,
            sku: "CG-PRODUCT-LARGE",
            sortOrder: 1,
            stockOnHand: 20,
          }),
          productVariant({
            id: "untouched",
            label: "Untouched",
            price: "33.00",
            priceOptionIndex: 2,
            sortOrder: 2,
            stockOnHand: 6,
          }),
        ],
      },
    });

    expect(result.variants[0].stockOnHand).toBe(8);
    expect(result.variants[1].lowStockThreshold).toBe(5);
    expect(result.variants[2]).toMatchObject({
      id: "untouched",
      price: "33.00",
      stockOnHand: 6,
    });
    expect(result.movements).toHaveLength(1);
    expect(result.movements[0].quantityDelta).toBe(-2);
  });

  test("duplicate or reordered variants fail safely", () => {
    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ stockOnHand: "9" }),
        row: productRow(),
      }],
      product: {
        variants: [
          productVariant(),
          productVariant({ priceOptionIndex: 1, sortOrder: 1 }),
        ],
      },
    })).toThrow(/duplicate product option IDs/i);

    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ stockOnHand: "9" }),
        row: productRow(),
      }],
      product: {
        variants: [productVariant({ priceOptionIndex: 1 })],
      },
    })).toThrow(/changed or no longer exists/i);
  });

  test("event edits preserve concurrent fields and use current ticket sales", () => {
    const result = mergeEventInventoryDraft({
      draft: eventDraft({ manualSeatsReserved: "3" }),
      event: {
        capacity: 40,
        manualSeatsReserved: 2,
        ticketsSold: 9,
        waitlistEnabled: false,
      },
      row: eventRow(),
    });

    expect(result.update).toEqual({
      capacity: 40,
      manualSeatsReserved: 3,
      waitlistEnabled: false,
    });
    expect(result.movementDelta).toBe(-1);
  });

  test("event capacity rejects a newer sold-ticket count", () => {
    expect(() => mergeEventInventoryDraft({
      draft: eventDraft({ capacity: "10" }),
      event: {
        capacity: 30,
        manualSeatsReserved: 2,
        ticketsSold: 9,
        waitlistEnabled: false,
      },
      row: eventRow(),
    })).toThrow(/9 sold and 2 held seats/i);
  });

  test("manual hold movement signs follow available-seat changes", () => {
    const addedHold = mergeEventInventoryDraft({
      draft: eventDraft({ manualSeatsReserved: "5" }),
      event: {
        capacity: 30,
        manualSeatsReserved: 2,
        ticketsSold: 5,
        waitlistEnabled: false,
      },
      row: eventRow(),
    });
    const releasedHold = mergeEventInventoryDraft({
      draft: eventDraft({ manualSeatsReserved: "1" }),
      event: {
        capacity: 30,
        manualSeatsReserved: 2,
        ticketsSold: 5,
        waitlistEnabled: false,
      },
      row: eventRow(),
    });

    expect(addedHold.movementDelta).toBe(-3);
    expect(releasedHold.movementDelta).toBe(1);
  });
});
