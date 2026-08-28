import {
  skuForVariant,
  variantIdForOption,
} from "../../data/productVariantIdentity";

const cleanText = (value, fallback = "") => String(value || fallback).trim();

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const numberOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const rowLabel = (row) => (
  row.secondary ? `${row.primary} (${row.secondary})` : row.primary
);

const conflict = (row, detail) => {
  throw new InventoryConflictError(
    `${rowLabel(row)} ${detail} Inventory was refreshed; review it and save again.`,
    [row.id],
  );
};

const validWholeNumber = (value) => Number.isInteger(value) && value >= 0;

const maxVariantCount = 3;
const maxVariantIdLength = 120;
const maxVariantLabelLength = 160;
const maxVariantPriceLength = 40;
const maxVariantSkuLength = 120;

const hasCompletePersistedVariantMapping = (variants, priceOptions) => (
  variants.length === priceOptions.length
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

const currentWholeNumber = (value, row, fieldName) => {
  if (!validWholeNumber(value)) {
    conflict(row, `has an invalid ${fieldName} value in Firestore.`);
  }

  return value;
};

const currentOptionalWholeNumber = (value, row, fieldName) => {
  if (value === null || value === undefined) {
    return null;
  }

  return currentWholeNumber(value, row, fieldName);
};

const desiredWholeNumber = (value, row, fieldName) => {
  const number = Number(value);

  if (!validWholeNumber(number)) {
    throw new Error(`${rowLabel(row)} needs a valid whole-number ${fieldName} value.`);
  }

  return number;
};

const variantIdForPriceOption = (priceOption, index) => (
  variantIdForOption(priceOption?.variantId || priceOption?.option, index)
);

export { skuForVariant };

const comparableInventoryOption = (priceOption = {}) => ({
  active: priceOption.active !== false,
  inventoryTracked: priceOption.inventoryTracked !== false,
  lowStockThreshold: String(priceOption.lowStockThreshold ?? "").trim(),
  option: cleanText(priceOption.option),
  price: cleanText(priceOption.price),
  sku: cleanText(priceOption.sku).toUpperCase(),
  stockOnHand: String(priceOption.stockOnHand ?? "").trim(),
  variantId: cleanText(priceOption.variantId),
});

export const productInventoryFormMatches = (candidateOptions, baselineOptions) => (
  JSON.stringify((Array.isArray(candidateOptions) ? candidateOptions : [])
    .map(comparableInventoryOption))
    === JSON.stringify((Array.isArray(baselineOptions) ? baselineOptions : [])
      .map(comparableInventoryOption))
);

const inventoryFieldChanges = (row, draft) => ({
  active: row.active !== (draft.active === true),
  inventoryTracked: (
    row.inventorySetupRequired === true
    && draft.stockConfirmed === true
  ) || row.inventoryTracked !== (draft.inventoryTracked === true),
  lowStockThreshold: String(row.lowStockThreshold === null ? "" : row.lowStockThreshold)
    !== String(draft.lowStockThreshold),
  stockOnHand: String(row.stockOnHand) !== String(draft.stockOnHand),
});

const eventFieldChanges = (row, draft) => ({
  capacity: String(row.capacity === null ? "" : row.capacity) !== String(draft.capacity),
  manualSeatsReserved: String(row.manualSeatsReserved || 0) !== String(draft.manualSeatsReserved),
  waitlistEnabled: row.waitlistEnabled !== (draft.waitlistEnabled === true),
});

const assertUniqueVariants = (variants, row) => {
  const variantIds = variants.map((variant) => cleanText(variant.id));
  const priceOptionIndexes = variants.map((variant) => variant.priceOptionIndex);
  const skus = variants.map((variant) => cleanText(variant.sku).toUpperCase());

  if (variantIds.some((variantId) => !variantId)) {
    conflict(row, "has a product option without a stable ID.");
  }

  if (new Set(variantIds).size !== variantIds.length) {
    conflict(row, "has duplicate product option IDs.");
  }

  if (priceOptionIndexes.some((index) => !Number.isInteger(index))) {
    conflict(row, "has a product option without a stable price index.");
  }

  if (new Set(priceOptionIndexes).size !== priceOptionIndexes.length) {
    conflict(row, "has duplicate product option price indexes.");
  }

  if (skus.some((sku) => !sku)) {
    conflict(row, "has a product option without a SKU.");
  }

  if (new Set(skus).size !== skus.length) {
    conflict(row, "has duplicate product option SKUs.");
  }
};

const assertCompleteVariantMapping = (variants, priceOptions, row) => {
  if (variants.length > maxVariantCount || priceOptions.length > maxVariantCount) {
    conflict(row, `has more than ${maxVariantCount} product options.`);
  }

  if (variants.length !== priceOptions.length) {
    conflict(row, "does not have exactly one inventory option for every price option.");
  }

  priceOptions.forEach((priceOption, index) => {
    const matchingVariants = variants.filter((variant) => variant.priceOptionIndex === index);

    if (matchingVariants.length !== 1) {
      conflict(row, `does not have exactly one inventory option for price option ${index + 1}.`);
    }

    if (matchingVariants[0].price !== priceOption?.price) {
      conflict(row, `has an inventory price that does not match price option ${index + 1}.`);
    }
  });

  variants.forEach((variant) => {
    if (variant.__invalidInventoryVariant === true) {
      conflict(row, "has a malformed product option in Firestore.");
    }

    if (typeof variant.active !== "boolean") {
      conflict(row, "has a product option with an invalid sellable status.");
    }

    if (typeof variant.inventoryTracked !== "boolean") {
      conflict(row, "has a product option with an invalid tracking status.");
    }

    if (typeof variant.id !== "string" || !variant.id.trim()) {
      conflict(row, "has a product option without a valid stable ID.");
    }

    if (variant.id.trim().length > maxVariantIdLength) {
      conflict(row, `has a product option ID longer than ${maxVariantIdLength} characters.`);
    }

    if (typeof variant.sku !== "string" || !variant.sku.trim()) {
      conflict(row, "has a product option without a valid SKU.");
    }

    if (variant.sku.trim().length > maxVariantSkuLength) {
      conflict(row, `has a SKU longer than ${maxVariantSkuLength} characters.`);
    }

    if (typeof variant.label !== "string") {
      conflict(row, "has a product option with an invalid label.");
    }

    if (variant.label.trim().length > maxVariantLabelLength) {
      conflict(row, `has a product option label longer than ${maxVariantLabelLength} characters.`);
    }

    if (typeof variant.price !== "string") {
      conflict(row, "has a product option with an invalid price.");
    }

    if (variant.price.trim().length > maxVariantPriceLength) {
      conflict(row, `has a product option price longer than ${maxVariantPriceLength} characters.`);
    }

    if (!Number.isInteger(variant.priceOptionIndex)) {
      conflict(row, "has a product option without a valid price index.");
    }

    if (!Number.isInteger(variant.sortOrder)) {
      conflict(row, "has a product option without a valid sort order.");
    }

    currentWholeNumber(variant.stockOnHand, row, "stock");
    currentOptionalWholeNumber(variant.lowStockThreshold, row, "low-stock threshold");
  });
};

const persistedProductVariant = (variant) => ({
  active: variant.active,
  id: variant.id,
  inventoryTracked: variant.inventoryTracked,
  label: variant.label,
  lowStockThreshold: variant.lowStockThreshold,
  price: variant.price,
  priceOptionIndex: variant.priceOptionIndex,
  sku: variant.sku,
  sortOrder: variant.sortOrder,
  stockOnHand: variant.stockOnHand,
});

export class InventoryConflictError extends Error {
  constructor(message, rowIds = []) {
    super(message);
    this.name = "InventoryConflictError";
    this.rowIds = Array.from(new Set(rowIds.filter(Boolean)));
  }
}

export const mergePreservedInventoryDrafts = ({
  freshDraftRows,
  preserveDraftRows,
  preserveRowIds = Object.keys(preserveDraftRows || {}),
  resetRowIds = [],
}) => {
  if (!preserveDraftRows) {
    return freshDraftRows;
  }

  const resetRowIdSet = new Set(resetRowIds);
  const preserveRowIdSet = new Set(preserveRowIds);

  return Object.keys(freshDraftRows).reduce((merged, rowId) => ({
    ...merged,
    [rowId]: preserveRowIdSet.has(rowId)
      && !resetRowIdSet.has(rowId)
      && hasOwn(preserveDraftRows, rowId)
      ? preserveDraftRows[rowId]
      : freshDraftRows[rowId],
  }), {});
};

export const updateInventoryDraftValue = ({ draft = {}, field, row, value }) => ({
  ...draft,
  ...(field === "stockOnHand"
    && row?.type === "product"
    && row.inventorySetupRequired === true
    ? {
      active: true,
      inventoryTracked: true,
    }
    : {}),
  ...(field === "stockOnHand" && row?.type === "product"
    ? { stockConfirmed: true }
    : {}),
  [field]: value,
});

export const variantsForProduct = (product, productId = product?.id || product?.slug || "") => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const priceOptions = Array.isArray(product?.priceOptions) ? product.priceOptions : [];
  const inventorySetupRequired = !hasCompletePersistedVariantMapping(variants, priceOptions);
  const normalizedVariants = variants.map((storedVariant, index) => {
    const variant = storedVariant && typeof storedVariant === "object" && !Array.isArray(storedVariant)
      ? storedVariant
      : { __invalidInventoryVariant: true };
    const priceOptionIndex = hasOwn(variant, "priceOptionIndex")
      ? variant.priceOptionIndex
      : index;
    const fallbackPriceOptionIndex = Number.isInteger(priceOptionIndex)
      ? priceOptionIndex
      : index;
    const priceOption = priceOptions[fallbackPriceOptionIndex] || {};
    const storedVariantId = hasOwn(variant, "id") ? variant.id : variant.variantId;
    const variantId = typeof storedVariantId === "string" && storedVariantId.trim()
      ? storedVariantId
      : storedVariantId === undefined || storedVariantId === null || storedVariantId === ""
        ? variantIdForPriceOption(priceOption, fallbackPriceOptionIndex)
        : storedVariantId;
    const storedSku = variant.sku;
    const skuMissing = storedSku === undefined
      || storedSku === null
      || (typeof storedSku === "string" && !storedSku.trim());
    const storedLabel = variant.label;
    const labelMissing = storedLabel === undefined
      || storedLabel === null
      || (typeof storedLabel === "string" && !storedLabel.trim());
    const storedPrice = variant.price;
    const priceMissing = storedPrice === undefined
      || storedPrice === null
      || (typeof storedPrice === "string" && !storedPrice.trim());

    return {
      ...variant,
      active: hasOwn(variant, "active")
        ? variant.active
        : product.inStock !== false && priceOption.active !== false,
      id: variantId,
      inventoryTracked: hasOwn(variant, "inventoryTracked")
        ? variant.inventoryTracked
        : priceOption.inventoryTracked === true,
      inventorySetupRequired,
      label: labelMissing
        ? cleanText(priceOption.option, `Option ${fallbackPriceOptionIndex + 1}`)
        : storedLabel,
      lowStockThreshold: hasOwn(variant, "lowStockThreshold")
        ? variant.lowStockThreshold
        : numberOrNull(priceOption.lowStockThreshold),
      price: priceMissing ? cleanText(priceOption.price) : storedPrice,
      priceOptionIndex,
      sku: skuMissing
        ? cleanText(priceOption.sku, skuForVariant(productId, variantId))
        : storedSku,
      sortOrder: hasOwn(variant, "sortOrder") ? variant.sortOrder : fallbackPriceOptionIndex,
      stockOnHand: hasOwn(variant, "stockOnHand")
        ? variant.stockOnHand
        : numberOrNull(priceOption.stockOnHand) || 0,
    };
  });
  const representedIndexes = new Set(normalizedVariants.map((variant) => variant.priceOptionIndex));
  const missingVariants = priceOptions.flatMap((priceOption, index) => {
    if (representedIndexes.has(index)) {
      return [];
    }

    const variantId = variantIdForPriceOption(priceOption, index);

    return [{
      active: product.inStock !== false && priceOption.active !== false,
      id: variantId,
      inventoryTracked: false,
      inventorySetupRequired,
      label: cleanText(priceOption.option, `Option ${index + 1}`),
      lowStockThreshold: numberOrNull(priceOption.lowStockThreshold),
      price: cleanText(priceOption.price),
      priceOptionIndex: index,
      sku: cleanText(priceOption.sku, skuForVariant(productId, variantId)),
      sortOrder: index,
      stockOnHand: numberOrNull(priceOption.stockOnHand) || 0,
    }];
  });

  return [...normalizedVariants, ...missingVariants].sort((first, second) => (
    (Number.isInteger(first.priceOptionIndex) ? first.priceOptionIndex : Number.MAX_SAFE_INTEGER)
      - (Number.isInteger(second.priceOptionIndex) ? second.priceOptionIndex : Number.MAX_SAFE_INTEGER)
    || (Number.isInteger(first.sortOrder) ? first.sortOrder : Number.MAX_SAFE_INTEGER)
      - (Number.isInteger(second.sortOrder) ? second.sortOrder : Number.MAX_SAFE_INTEGER)
    || cleanText(first.id).localeCompare(cleanText(second.id))
  ));
};

export const productInStockForVariants = (variants) => (
  (Array.isArray(variants) ? variants : []).some((variant) => (
    variant.active === true
      && (
        variant.inventoryTracked === false
        || (Number.isInteger(variant.stockOnHand) && variant.stockOnHand > 0)
      )
  ))
);

export const mergeProductInventoryDrafts = ({ changes, product }) => {
  const productId = changes[0]?.row?.productId || product?.id || product?.slug || "";
  const variants = variantsForProduct(product, productId).map((variant) => ({ ...variant }));
  const priceOptions = Array.isArray(product?.priceOptions) ? product.priceOptions : [];
  const movements = [];

  if (changes.length) {
    assertCompleteVariantMapping(variants, priceOptions, changes[0].row);
    assertUniqueVariants(variants, changes[0].row);
  }

  if (variants.some((variant) => variant.inventorySetupRequired === true)) {
    const everyQuantityConfirmed = variants.every((variant) => changes.some(({ draft, row }) => (
      draft.stockConfirmed === true
      && cleanText(variant.id) === row.variantId
      && variant.priceOptionIndex === row.priceOptionIndex
    )));

    if (!everyQuantityConfirmed) {
      const row = changes[0]?.row || { id: "", primary: "This product" };
      throw new InventoryConflictError(
        `${row.primary} needs a confirmed stock quantity for every option before inventory setup can be saved. Inventory was refreshed; review it and save again.`,
        changes.map((change) => change.row?.id),
      );
    }
  }

  changes.forEach(({ draft, row }) => {
    const matches = variants.reduce((indexes, variant, index) => (
      cleanText(variant.id) === row.variantId
      && variant.priceOptionIndex === row.priceOptionIndex
        ? [...indexes, index]
        : indexes
    ), []);

    if (matches.length !== 1) {
      conflict(row, "has a product option that changed or no longer exists.");
    }

    const variantIndex = matches[0];
    const currentVariant = variants[variantIndex];
    const currentStockOnHand = currentWholeNumber(
      currentVariant.stockOnHand,
      row,
      "stock",
    );
    const currentLowStockThreshold = currentOptionalWholeNumber(
      currentVariant.lowStockThreshold,
      row,
      "low-stock threshold",
    );
    const currentInventoryTracked = currentVariant.inventoryTracked !== false;
    const currentActive = currentVariant.active === true;
    const changed = inventoryFieldChanges(row, draft);
    const nextStockOnHand = desiredWholeNumber(draft.stockOnHand, row, "stock");
    const nextLowStockThreshold = draft.lowStockThreshold === ""
      ? null
      : desiredWholeNumber(draft.lowStockThreshold, row, "low-stock threshold");
    const nextInventoryTracked = draft.inventoryTracked === true;
    const nextActive = draft.active === true;

    if (changed.active && currentActive !== row.active) {
      conflict(row, "sellable status changed in Firestore while you were editing.");
    }

    if (changed.stockOnHand && currentStockOnHand !== row.stockOnHand) {
      conflict(row, "stock changed in Firestore while you were editing.");
    }

    if (
      changed.lowStockThreshold
      && currentLowStockThreshold !== row.lowStockThreshold
    ) {
      conflict(row, "low-stock threshold changed in Firestore while you were editing.");
    }

    if (
      changed.inventoryTracked
      && currentInventoryTracked !== (
        typeof row.storedInventoryTracked === "boolean"
          ? row.storedInventoryTracked
          : row.inventoryTracked
      )
    ) {
      conflict(row, "tracking status changed in Firestore while you were editing.");
    }

    variants[variantIndex] = {
      ...currentVariant,
      active: changed.active ? nextActive : currentActive,
      inventoryTracked: changed.inventoryTracked
        ? nextInventoryTracked
        : currentInventoryTracked,
      lowStockThreshold: changed.lowStockThreshold
        ? nextLowStockThreshold
        : currentLowStockThreshold,
      stockOnHand: changed.stockOnHand ? nextStockOnHand : currentStockOnHand,
    };

    if (changed.stockOnHand && nextStockOnHand !== currentStockOnHand) {
      movements.push({
        quantityDelta: nextStockOnHand - currentStockOnHand,
        row,
        variant: variants[variantIndex],
      });
    }
  });

  return {
    inStock: productInStockForVariants(variants),
    movements,
    variants: variants.map(persistedProductVariant),
  };
};

export const mergeEventInventoryDraft = ({ draft, event, row }) => {
  const currentCapacity = event.capacity === null || event.capacity === undefined
    ? null
    : currentWholeNumber(event.capacity, row, "capacity");
  const currentManualSeatsReserved = event.manualSeatsReserved === null
    || event.manualSeatsReserved === undefined
    ? 0
    : currentWholeNumber(event.manualSeatsReserved, row, "manual holds");
  const currentTicketsSold = event.ticketsSold === null || event.ticketsSold === undefined
    ? 0
    : currentWholeNumber(event.ticketsSold, row, "tickets sold");
  const currentWaitlistEnabled = event.waitlistEnabled === true;
  const changed = eventFieldChanges(row, draft);
  const desiredCapacity = desiredWholeNumber(draft.capacity, row, "capacity");
  const desiredManualSeatsReserved = desiredWholeNumber(
    draft.manualSeatsReserved,
    row,
    "manual holds",
  );
  const desiredWaitlistEnabled = draft.waitlistEnabled === true;

  if (changed.capacity && currentCapacity !== row.capacity) {
    conflict(row, "capacity changed in Firestore while you were editing.");
  }

  if (
    changed.manualSeatsReserved
    && currentManualSeatsReserved !== row.manualSeatsReserved
  ) {
    conflict(row, "manual holds changed in Firestore while you were editing.");
  }

  if (
    changed.waitlistEnabled
    && currentWaitlistEnabled !== row.waitlistEnabled
  ) {
    conflict(row, "waitlist status changed in Firestore while you were editing.");
  }

  const nextCapacity = changed.capacity ? desiredCapacity : currentCapacity;
  const nextManualSeatsReserved = changed.manualSeatsReserved
    ? desiredManualSeatsReserved
    : currentManualSeatsReserved;
  const nextWaitlistEnabled = changed.waitlistEnabled
    ? desiredWaitlistEnabled
    : currentWaitlistEnabled;

  if (nextCapacity === null) {
    conflict(row, "does not have a capacity set in Firestore.");
  }

  if (currentTicketsSold + nextManualSeatsReserved > nextCapacity) {
    conflict(
      row,
      `now has ${currentTicketsSold} sold and ${nextManualSeatsReserved} held seats, which exceeds capacity ${nextCapacity}.`,
    );
  }

  return {
    movementDelta: changed.manualSeatsReserved
      ? -(nextManualSeatsReserved - currentManualSeatsReserved)
      : 0,
    update: {
      capacity: nextCapacity,
      manualSeatsReserved: nextManualSeatsReserved,
      waitlistEnabled: nextWaitlistEnabled,
    },
  };
};
