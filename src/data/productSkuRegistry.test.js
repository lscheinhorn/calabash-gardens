import {
  normalizedProductSku,
  productSkuClaimHasOwner,
  productSkuClaimsForProduct,
  productSkuRegistryId,
  ProductSkuRegistryError,
} from "./productSkuRegistry";

describe("productSkuRegistry", () => {
  test("SKU identity is case-insensitive and safe as a Firestore document ID", () => {
    expect(normalizedProductSku(" jetta/jar ")).toBe("JETTA/JAR");
    expect(productSkuRegistryId("jetta/jar")).toBe("sku-JETTA%2FJAR");
  });

  test("claims retain stable product and variant ownership", () => {
    const [claim] = productSkuClaimsForProduct({
      productId: "saffron-salt",
      variants: [{ id: "2-oz", sku: " salt-2oz " }],
    });

    expect(claim).toEqual({
      productId: "saffron-salt",
      registryId: "sku-SALT-2OZ",
      sku: "SALT-2OZ",
      variantId: "2-oz",
    });
    expect(productSkuClaimHasOwner(claim, {
      productId: "saffron-salt",
      variantId: "2-oz",
    })).toBe(true);
    expect(productSkuClaimHasOwner(claim, {
      productId: "another-product",
      variantId: "2-oz",
    })).toBe(false);
  });

  test("strict claims reject missing and duplicate SKU identities", () => {
    expect(() => productSkuClaimsForProduct({
      productId: "test-product",
      variants: [{ id: "default", sku: "" }],
    })).toThrow(ProductSkuRegistryError);
    expect(() => productSkuClaimsForProduct({
      productId: "test-product",
      variants: [
        { id: "small", sku: "SAME" },
        { id: "large", sku: "same" },
      ],
    })).toThrow(/repeated/i);
    expect(() => productSkuClaimsForProduct({
      productId: "test-product",
      variants: [{ id: "default", sku: "ß".repeat(61) }],
    })).toThrow(/no longer than 120/i);
  });

  test("non-strict claims skip malformed legacy entries", () => {
    expect(productSkuClaimsForProduct({
      productId: "legacy-product",
      strict: false,
      variants: [{ id: "default", sku: "" }],
    })).toEqual([]);
  });
});
