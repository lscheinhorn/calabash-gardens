import {
  productIdentitySlug,
  refreshGeneratedVariantIdentities,
  skuForVariant,
  variantIdForOption,
} from "./productVariantIdentity";

describe("product variant identity", () => {
  test("product IDs are suggested deterministically from titles", () => {
    expect(productIdentitySlug("Luke's Test Product")).toBe("lukes-test-product");
    expect(productIdentitySlug("  Saffron Maple Syrup  ")).toBe("saffron-maple-syrup");
    expect(productIdentitySlug("Crème Brûlée")).toBe("creme-brulee");
  });

  test("variant IDs are generated from option labels with stable fallbacks", () => {
    expect(variantIdForOption("4 oz", 0)).toBe("4-oz");
    expect(variantIdForOption("", 0)).toBe("default");
    expect(variantIdForOption("", 1)).toBe("option-2");
  });

  test("every sellable option receives a deterministic SKU", () => {
    expect(skuForVariant("saffron-maple-syrup", "4-oz"))
      .toBe("CG-SAFFRON-MAPLE-SYRUP-4-OZ");
    expect(skuForVariant("lukes-test-product", "default"))
      .toBe("CG-LUKES-TEST-PRODUCT-DEFAULT");
  });

  test("unsaved identities follow labels while persisted identities remain locked", () => {
    const refreshed = refreshGeneratedVariantIdentities([
      {
        option: "Large Jar",
        sku: "",
        skuLocked: false,
        variantId: "",
        variantIdLocked: false,
      },
      {
        option: "Renamed Option",
        sku: "JETTA-CUSTOM",
        skuLocked: true,
        variantId: "historic-id",
        variantIdLocked: true,
      },
    ], "maple-syrup");

    expect(refreshed[0]).toMatchObject({
      sku: "CG-MAPLE-SYRUP-LARGE-JAR",
      variantId: "large-jar",
    });
    expect(refreshed[1]).toMatchObject({
      sku: "JETTA-CUSTOM",
      variantId: "historic-id",
    });
  });
});
