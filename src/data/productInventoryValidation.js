const validWholeNumber = (value) => Number.isInteger(value) && value >= 0;

export const hasCompletePersistedVariantMapping = (variants, priceOptions) => (
  Array.isArray(variants)
  && Array.isArray(priceOptions)
  && variants.length === priceOptions.length
  && variants.every((variant, index) => (
    variant
    && typeof variant === "object"
    && !Array.isArray(variant)
    && typeof variant.active === "boolean"
    && typeof variant.id === "string"
    && Boolean(variant.id.trim())
    && typeof variant.inventoryTracked === "boolean"
    && typeof variant.label === "string"
    && (variant.lowStockThreshold === null || validWholeNumber(variant.lowStockThreshold))
    && typeof variant.price === "string"
    && variant.price === priceOptions[index]?.price
    && variant.priceOptionIndex === index
    && typeof variant.sku === "string"
    && Boolean(variant.sku.trim())
    && variant.sortOrder === index
    && validWholeNumber(variant.stockOnHand)
  ))
);
