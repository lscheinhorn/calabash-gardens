const cleanIdentityText = (value) => String(value || "").trim();

export const productIdentitySlug = (value) => cleanIdentityText(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/['‘’]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const variantIdForOption = (option, index) => (
  productIdentitySlug(option) || (index === 0 ? "default" : `option-${index + 1}`)
);

export const skuForVariant = (productId, variantId) => (
  ["CG", cleanIdentityText(productId), cleanIdentityText(variantId)]
    .filter(Boolean)
    .join("-")
    .replace(/[^a-z0-9-]/gi, "-")
    .replace(/-+/g, "-")
    .toUpperCase()
);

export const refreshGeneratedVariantIdentities = (priceOptions, productId) => (
  Array.isArray(priceOptions) ? priceOptions : []
).map((priceOption, index) => {
  const variantId = priceOption.variantIdLocked
    ? cleanIdentityText(priceOption.variantId)
    : variantIdForOption(priceOption.option, index);

  return {
    ...priceOption,
    variantId,
    sku: priceOption.skuLocked
      ? cleanIdentityText(priceOption.sku)
      : skuForVariant(productId, variantId),
  };
});
