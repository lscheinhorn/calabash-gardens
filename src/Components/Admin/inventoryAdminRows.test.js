import {
  productInventoryDraftChanged,
  productInventoryDraftRowsFor,
  productInventoryRowsForProduct,
  validateProductInventoryChanges,
} from "./inventoryAdminRows";

const legacyProduct = {
  inStock: true,
  isActive: true,
  priceOptions: [
    { option: "Small", price: "10.00" },
    { option: "Large", price: "18.00" },
  ],
  published: true,
  title: "Test Product",
  variants: [],
};

describe("shared inventory admin rows", () => {
  test("builds deterministic setup rows without inventing confirmed quantities", () => {
    const rows = productInventoryRowsForProduct(legacyProduct, "test-product");
    const drafts = productInventoryDraftRowsFor(rows, { blankUnconfirmed: true });

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.inventorySetupRequired)).toBe(true);
    expect(rows.map((row) => row.sku)).toEqual([
      "CG-TEST-PRODUCT-SMALL",
      "CG-TEST-PRODUCT-LARGE",
    ]);
    expect(Object.values(drafts).map((draft) => draft.stockOnHand)).toEqual(["", ""]);
    expect(rows.some((row) => (
      productInventoryDraftChanged(row, drafts[row.id])
    ))).toBe(false);
  });

  test("rejects setup until every option has a confirmed whole-number quantity", () => {
    const rows = productInventoryRowsForProduct(legacyProduct, "test-product");
    const draftRows = productInventoryDraftRowsFor(rows, { blankUnconfirmed: true });
    draftRows[rows[0].id] = {
      ...draftRows[rows[0].id],
      active: true,
      inventoryTracked: true,
      stockConfirmed: true,
      stockOnHand: "2",
    };

    expect(validateProductInventoryChanges({
      dirtyRows: [rows[0]],
      draftRows,
      rows,
    })).toMatch(/confirmed stock quantity for every option/i);
  });
});
