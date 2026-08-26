const cleanText = (value, fallback = "") => String(value || fallback).trim();

const numberOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const slugify = (value) => cleanText(value)
  .toLowerCase()
  .replace(/['‘’]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const rowLabel = (row) => (
  row.secondary ? `${row.primary} (${row.secondary})` : row.primary
);

const conflict = (row, detail) => {
  throw new InventoryConflictError(
    `${rowLabel(row)} ${detail} Inventory was refreshed; review it and save again.`,
  );
};

const validWholeNumber = (value) => Number.isInteger(value) && value >= 0;

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
  slugify(priceOption?.variantId || priceOption?.option)
  || (index === 0 ? "default" : `option-${index + 1}`)
);

const inventoryFieldChanges = (row, draft) => ({
  inventoryTracked: row.inventoryTracked !== (draft.inventoryTracked === true),
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
};

export class InventoryConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "InventoryConflictError";
  }
}

export const variantsForProduct = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  if (variants.length) {
    return variants.map((variant, index) => ({
      ...variant,
      priceOptionIndex: Number.isInteger(variant.priceOptionIndex)
        ? variant.priceOptionIndex
        : index,
      sortOrder: Number.isInteger(variant.sortOrder) ? variant.sortOrder : index,
    }));
  }

  const priceOptions = Array.isArray(product?.priceOptions) ? product.priceOptions : [];

  return priceOptions.map((priceOption, index) => ({
    active: product.inStock !== false && priceOption.active !== false,
    id: variantIdForPriceOption(priceOption, index),
    inventoryTracked: priceOption.inventoryTracked !== false,
    label: cleanText(priceOption.option, `Option ${index + 1}`),
    lowStockThreshold: numberOrNull(priceOption.lowStockThreshold),
    price: cleanText(priceOption.price),
    priceOptionIndex: index,
    sku: cleanText(priceOption.sku),
    sortOrder: index,
    stockOnHand: numberOrNull(priceOption.stockOnHand) || 0,
  }));
};

export const mergeProductInventoryDrafts = ({ changes, product }) => {
  const variants = variantsForProduct(product).map((variant) => ({ ...variant }));
  const movements = [];

  changes.forEach(({ draft, row }) => {
    assertUniqueVariants(variants, row);

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
    const changed = inventoryFieldChanges(row, draft);
    const nextStockOnHand = desiredWholeNumber(draft.stockOnHand, row, "stock");
    const nextLowStockThreshold = draft.lowStockThreshold === ""
      ? null
      : desiredWholeNumber(draft.lowStockThreshold, row, "low-stock threshold");
    const nextInventoryTracked = draft.inventoryTracked === true;

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
      && currentInventoryTracked !== row.inventoryTracked
    ) {
      conflict(row, "tracking status changed in Firestore while you were editing.");
    }

    variants[variantIndex] = {
      ...currentVariant,
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

  return { movements, variants };
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
