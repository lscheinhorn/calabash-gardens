import { normalizeFirestoreProductForPublic } from "../../data/publicProductAdapter";
import {
  InventoryConflictError,
  mergePreservedInventoryDrafts,
  mergeEventInventoryDraft,
  mergeProductInventoryDrafts,
  productInStockForVariants,
  productInventoryFormMatches,
  skuForVariant,
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
  active: true,
  id: "product-test-product-0-default",
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
  active: true,
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

const productWithVariants = (variants) => ({
  priceOptions: variants.map((variant) => ({
    option: variant.label,
    price: variant.price,
  })),
  variants,
});

describe("inventoryAdminModel", () => {
  test("legacy price options receive stable variant indexes", () => {
    const variants = variantsForProduct({
      inStock: true,
      priceOptions: [
        { option: "4 oz", price: "15.00" },
        { option: "8 oz", price: "27.00" },
      ],
    }, "test-product");

    expect(variants).toMatchObject([
      { id: "4-oz", priceOptionIndex: 0, sku: "CG-TEST-PRODUCT-4-OZ", sortOrder: 0 },
      { id: "8-oz", priceOptionIndex: 1, sku: "CG-TEST-PRODUCT-8-OZ", sortOrder: 1 },
    ]);
  });

  test("content-only edits can recognize unchanged inventory form values", () => {
    const baseline = [{
      active: true,
      inventoryTracked: true,
      lowStockThreshold: "2",
      option: "Jar",
      price: "15.00",
      sku: "custom-jar",
      stockOnHand: "10",
      variantId: "jar",
    }];

    expect(productInventoryFormMatches([{ ...baseline[0] }], baseline)).toBe(true);
    expect(productInventoryFormMatches([{ ...baseline[0], stockOnHand: "9" }], baseline)).toBe(false);
    expect(productInventoryFormMatches([{ ...baseline[0], price: "16.00" }], baseline)).toBe(false);
  });

  test("legacy and incomplete variants receive deterministic metadata without replacing custom values", () => {
    expect(skuForVariant("Luke's Test Product", "4 oz")).toBe("CG-LUKE-S-TEST-PRODUCT-4-OZ");

    const variants = variantsForProduct({
      priceOptions: [
        { option: "Small", price: "10.00" },
        { option: "Large", price: "20.00" },
      ],
      variants: [
        { active: true, id: "small", inventoryTracked: true, label: "Small", price: "10.00", sku: "CUSTOM-SMALL", stockOnHand: 2 },
        { active: true, id: "large", inventoryTracked: true, label: "Large", price: "20.00", sku: "", stockOnHand: 3 },
      ],
    }, "test-product");

    expect(variants).toMatchObject([
      { id: "small", priceOptionIndex: 0, sku: "CUSTOM-SMALL", sortOrder: 0 },
      { id: "large", priceOptionIndex: 1, sku: "CG-TEST-PRODUCT-LARGE", sortOrder: 1 },
    ]);
  });

  test("a partial variant list receives the missing price-option mapping", () => {
    const variants = variantsForProduct({
      inStock: true,
      priceOptions: [
        { option: "Small", price: "10.00" },
        { option: "Large", price: "20.00" },
      ],
      variants: [{
        active: true,
        id: "large",
        inventoryTracked: true,
        label: "Large",
        lowStockThreshold: 2,
        price: "20.00",
        priceOptionIndex: 1,
        sku: "CUSTOM-LARGE",
        sortOrder: 1,
        stockOnHand: 3,
      }],
    }, "test-product");

    expect(variants).toMatchObject([
      { id: "small", priceOptionIndex: 0, sku: "CG-TEST-PRODUCT-SMALL", stockOnHand: 0 },
      { id: "large", priceOptionIndex: 1, sku: "CUSTOM-LARGE", stockOnHand: 3 },
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
      product: productWithVariants([productVariant({ stockOnHand: 8 })]),
    });

    expect(result.variants[0]).toMatchObject({
      lowStockThreshold: 3,
      stockOnHand: 8,
    });
    expect(result.inStock).toBe(true);
    expect(result.movements).toEqual([]);
  });

  test("a stock edit rejects a concurrent stock change", () => {
    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ stockOnHand: "7" }),
        row: productRow(),
      }],
      product: productWithVariants([productVariant({ stockOnHand: 9 })]),
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
      product: productWithVariants([
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
            sku: "CG-PRODUCT-UNTOUCHED",
            sortOrder: 2,
            stockOnHand: 6,
          }),
        ]),
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

  test("sellable status and tracked stock determine compatibility availability", () => {
    const soldOut = mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ stockOnHand: "0" }),
        row: productRow({ stockOnHand: 1 }),
      }],
      product: productWithVariants([productVariant({ stockOnHand: 1 })]),
    });
    const untracked = mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ inventoryTracked: false, stockOnHand: "0" }),
        row: productRow({ stockOnHand: 0 }),
      }],
      product: productWithVariants([productVariant({ stockOnHand: 0 })]),
    });
    const inactive = mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ active: false }),
        row: productRow(),
      }],
      product: productWithVariants([productVariant()]),
    });

    expect(soldOut.inStock).toBe(false);
    expect(untracked.inStock).toBe(true);
    expect(inactive.inStock).toBe(false);
    expect(productInStockForVariants([
      productVariant({ stockOnHand: 0 }),
      productVariant({ id: "available", priceOptionIndex: 1, sku: "AVAILABLE", stockOnHand: 2 }),
    ])).toBe(true);
  });

  test("duplicate or reordered variants fail safely", () => {
    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ stockOnHand: "9" }),
        row: productRow(),
      }],
      product: productWithVariants([
          productVariant(),
          productVariant({ priceOptionIndex: 1, sortOrder: 1 }),
        ]),
    })).toThrow(/duplicate product option IDs/i);

    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ stockOnHand: "9" }),
        row: productRow(),
      }],
      product: productWithVariants([productVariant({ priceOptionIndex: 1 })]),
    })).toThrow(/exactly one inventory option/i);
  });

  test("malformed stored inventory values fail closed", () => {
    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ lowStockThreshold: "3" }),
        row: productRow(),
      }],
      product: productWithVariants([productVariant({ stockOnHand: "10" })]),
    })).toThrow(/invalid stock value/i);

    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ active: false }),
        row: productRow(),
      }],
      product: productWithVariants([productVariant({ active: "true" })]),
    })).toThrow(/invalid sellable status/i);

    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ lowStockThreshold: "3" }),
        row: productRow(),
      }],
      product: {
        priceOptions: [{ option: "Default", price: "15.00" }],
        variants: [productVariant({ price: "16.00" })],
      },
    })).toThrow(/inventory price that does not match/i);

    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ lowStockThreshold: "3" }),
        row: productRow(),
      }],
      product: {
        priceOptions: [{ option: "Default", price: "15.00" }],
        variants: [productVariant({ price: "15.00 " })],
      },
    })).toThrow(/inventory price that does not match/i);

    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ lowStockThreshold: "3" }),
        row: productRow(),
      }],
      product: {
        priceOptions: [{ option: "Default", price: "15.00" }],
        variants: [null],
      },
    })).toThrow(/malformed product option/i);
  });

  test("a sellable-status edit rejects a concurrent status change", () => {
    expect(() => mergeProductInventoryDrafts({
      changes: [{
        draft: productDraft({ active: false }),
        row: productRow(),
      }],
      product: productWithVariants([productVariant({ active: false })]),
    })).toThrow(InventoryConflictError);
  });

  test("refreshing a conflict resets only that row and preserves other unsaved drafts", () => {
    const merged = mergePreservedInventoryDrafts({
      freshDraftRows: {
        first: { stockOnHand: "9" },
        second: { stockOnHand: "20" },
      },
      preserveDraftRows: {
        first: { stockOnHand: "8" },
        second: { stockOnHand: "18" },
      },
      preserveRowIds: ["first", "second"],
      resetRowIds: ["first"],
    });

    expect(merged).toEqual({
      first: { stockOnHand: "9" },
      second: { stockOnHand: "18" },
    });
  });

  test("a conflict refresh does not turn untouched stale snapshots into drafts", () => {
    const merged = mergePreservedInventoryDrafts({
      freshDraftRows: {
        edited: { stockOnHand: "9" },
        untouched: { stockOnHand: "25" },
      },
      preserveDraftRows: {
        edited: { stockOnHand: "11" },
        untouched: { stockOnHand: "20" },
      },
      preserveRowIds: ["edited"],
      resetRowIds: ["edited"],
    });

    expect(merged).toEqual({
      edited: { stockOnHand: "9" },
      untouched: { stockOnHand: "25" },
    });
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
