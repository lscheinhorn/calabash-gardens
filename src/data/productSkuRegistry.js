const cleanText = (value) => String(value ?? "").trim();

export class ProductSkuRegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProductSkuRegistryError";
  }
}

export const normalizedProductSku = (sku) => cleanText(sku)
  .normalize("NFKC")
  .toUpperCase();

export const productSkuRegistryId = (sku) => {
  const normalizedSku = normalizedProductSku(sku);

  if (!normalizedSku) {
    throw new ProductSkuRegistryError("Every inventory option needs a SKU.");
  }

  return `sku-${encodeURIComponent(normalizedSku)}`;
};

export const productSkuClaimsForProduct = ({
  productId,
  strict = true,
  variants,
}) => {
  const claims = [];
  const normalizedProductId = cleanText(productId);
  const seenRegistryIds = new Set();

  if (strict && !normalizedProductId) {
    throw new ProductSkuRegistryError("Every SKU claim needs a stable product ID.");
  }

  (Array.isArray(variants) ? variants : []).forEach((variant) => {
    const variantId = cleanText(variant?.id);
    const sku = normalizedProductSku(variant?.sku);

    if (!variantId || !sku || sku.length > 120) {
      if (strict) {
        throw new ProductSkuRegistryError(
          "Every inventory option needs a stable ID and SKU no longer than 120 characters.",
        );
      }
      return;
    }

    const registryId = productSkuRegistryId(sku);

    if (seenRegistryIds.has(registryId)) {
      if (strict) {
        throw new ProductSkuRegistryError(`SKU ${sku} is repeated within this product.`);
      }
      return;
    }

    seenRegistryIds.add(registryId);
    claims.push({
      productId: normalizedProductId,
      registryId,
      sku,
      variantId,
    });
  });

  return claims.sort((first, second) => first.registryId.localeCompare(second.registryId));
};

export const productSkuClaimHasOwner = (claim, registryData = {}) => (
  cleanText(registryData.productId) === claim.productId
    && cleanText(registryData.variantId) === claim.variantId
);
