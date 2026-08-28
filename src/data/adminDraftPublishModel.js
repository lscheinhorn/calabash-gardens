const productOperationalFields = [
  "active",
  "inventoryTracked",
  "lowStockThreshold",
  "stockOnHand",
];

const eventOperationalFields = [
  "capacity",
  "manualSeatsReserved",
  "waitlistEnabled",
];

const documentMetadataFields = new Set([
  "_draft",
  "_draftConflict",
  "_draftOnly",
  "contentRevision",
  "createdAt",
  "draftConflict",
  "id",
  "updatedAt",
]);

const cleanText = (value) => String(value || "").trim();

const canonicalValue = (value) => {
  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return { __date: value.toISOString() };
  }

  if (value && typeof value.toMillis === "function") {
    return { __timestamp: value.toMillis() };
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalValue(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        if (value[key] !== undefined) {
          result[key] = canonicalValue(value[key]);
        }
        return result;
      }, {});
  }

  return value;
};

const canonicalJson = (value) => JSON.stringify(canonicalValue(value));

const withoutDocumentMetadata = (data = {}) => Object.fromEntries(
  Object.entries(data).filter(([key]) => !documentMetadataFields.has(key)),
);

const variantKey = (variant = {}, index = 0) => {
  const id = cleanText(variant.id || variant.variantId || variant.option)
    || (index === 0 ? "default" : `option-${index + 1}`);
  const priceOptionIndex = Number.isInteger(variant.priceOptionIndex)
    ? variant.priceOptionIndex
    : index;

  return `${id}::${priceOptionIndex}`;
};

const productVariants = (product = {}) => {
  return Array.isArray(product.variants) ? product.variants : [];
};

const normalizedProductOperationalVariant = (variant, index) => ({
  active: variant.active !== false,
  id: cleanText(variant.id || variant.variantId || variant.option)
    || (index === 0 ? "default" : `option-${index + 1}`),
  inventoryTracked: variant.inventoryTracked !== false,
  key: variantKey(variant, index),
  lowStockThreshold: Number.isInteger(variant.lowStockThreshold)
    ? variant.lowStockThreshold
    : null,
  priceOptionIndex: Number.isInteger(variant.priceOptionIndex)
    ? variant.priceOptionIndex
    : index,
  stockOnHand: Number.isInteger(variant.stockOnHand) ? variant.stockOnHand : 0,
});

const productInStock = (variants) => variants.some((variant) => (
  variant.active === true
    && (
      variant.inventoryTracked === false
      || (Number.isInteger(variant.stockOnHand) && variant.stockOnHand > 0)
    )
));

const fieldState = (data, field) => (
  Object.prototype.hasOwnProperty.call(data || {}, field)
    ? { present: true, value: data[field] }
    : { present: false, value: null }
);

const eventOperationalSnapshot = (event = {}) => Object.fromEntries(
  eventOperationalFields.map((field) => [field, fieldState(event, field)]),
);

const sameValue = (first, second) => canonicalJson(first) === canonicalJson(second);

const assertUniqueVariantKeys = (variants, label) => {
  const keys = variants.map((variant) => variant.key);

  if (new Set(keys).size !== keys.length) {
    throw new DraftPublishConflictError(`${label} has duplicate product option identifiers.`);
  }
};

const eventDateValue = (value) => {
  if (!value) {
    return null;
  }

  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const eventInStock = (event) => {
  if (event.isActive !== true) {
    return false;
  }

  const date = eventDateValue(event.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date && date < today) {
    return false;
  }

  if (!Number.isInteger(event.capacity)) {
    return true;
  }

  const ticketsSold = Number.isInteger(event.ticketsSold) ? event.ticketsSold : 0;
  const manualSeatsReserved = Number.isInteger(event.manualSeatsReserved)
    ? event.manualSeatsReserved
    : 0;

  return event.capacity - ticketsSold - manualSeatsReserved > 0;
};

const resolveOperationalState = ({ base, draft, fieldLabel, live }) => {
  const draftChanged = !sameValue(draft, base);
  const liveChanged = !sameValue(live, base);

  if (draftChanged && liveChanged && !sameValue(draft, live)) {
    throw new DraftPublishConflictError(
      `${fieldLabel} changed after this draft started. Review the latest inventory before publishing.`,
    );
  }

  return draftChanged ? draft : live;
};

const mergeProductOperationalData = ({
  baseOperational,
  deletedFields,
  draftData,
  liveData,
}) => {
  if (!Array.isArray(draftData.variants)) {
    const payload = { ...draftData };

    if (Array.isArray(liveData.variants)) {
      payload.variants = liveData.variants;
      payload.inStock = productInStock(liveData.variants);
    } else {
      delete payload.variants;
      payload.inStock = typeof liveData.inStock === "boolean"
        ? liveData.inStock
        : draftData.inStock;
    }

    return { fieldsToDelete: deletedFields, payload };
  }

  const draftVariants = productVariants(draftData);
  const draftOperational = draftVariants.map(normalizedProductOperationalVariant);
  const baseVariants = Array.isArray(baseOperational?.variants) ? baseOperational.variants : [];
  const liveVariants = productVariants(liveData).map(normalizedProductOperationalVariant);

  assertUniqueVariantKeys(draftOperational, "The draft");
  assertUniqueVariantKeys(baseVariants, "The saved baseline");
  assertUniqueVariantKeys(liveVariants, "The live product");

  const draftKeys = new Set(draftOperational.map((variant) => variant.key));
  const baseByKey = new Map(baseVariants.map((variant) => [variant.key, variant]));
  const liveByKey = new Map(liveVariants.map((variant) => [variant.key, variant]));

  baseVariants.forEach((baseVariant) => {
    if (draftKeys.has(baseVariant.key)) {
      return;
    }

    const liveVariant = liveByKey.get(baseVariant.key);
    if (liveVariant && productOperationalFields.some((field) => (
      !sameValue(liveVariant[field], baseVariant[field])
    ))) {
      throw new DraftPublishConflictError(
        "Inventory changed for a product option this draft removes. Review the latest product before publishing.",
      );
    }
  });

  const variants = draftVariants.map((draftVariant, index) => {
    const draftInventory = draftOperational[index];
    const baseInventory = baseByKey.get(draftInventory.key);
    const liveInventory = liveByKey.get(draftInventory.key);

    if (baseInventory && !liveInventory) {
      throw new DraftPublishConflictError(
        "A product option was removed after this draft started. Review the latest product before publishing.",
      );
    }

    const nextVariant = { ...draftVariant };

    productOperationalFields.forEach((field) => {
      if (!baseInventory) {
        nextVariant[field] = liveInventory ? liveInventory[field] : draftInventory[field];
        return;
      }

      nextVariant[field] = resolveOperationalState({
        base: baseInventory[field],
        draft: draftInventory[field],
        fieldLabel: `${draftVariant.label || draftVariant.id || "Product option"} ${field}`,
        live: liveInventory[field],
      });
    });

    return nextVariant;
  });

  return {
    fieldsToDelete: deletedFields,
    payload: {
      ...draftData,
      inStock: productInStock(variants),
      variants,
    },
  };
};

const mergeEventOperationalData = ({
  baseOperational,
  deletedFields,
  draftData,
  liveData,
  targetExists,
}) => {
  const payload = { ...draftData };
  const fieldsToDelete = new Set(deletedFields);
  const liveOperational = eventOperationalSnapshot(liveData);

  eventOperationalFields.forEach((field) => {
    const draftState = fieldsToDelete.has(field)
      ? { present: false, value: null }
      : fieldState(draftData, field);

    if (!targetExists) {
      if (!draftState.present) {
        delete payload[field];
      }
      return;
    }

    const resolved = resolveOperationalState({
      base: baseOperational[field] || { present: false, value: null },
      draft: draftState,
      fieldLabel: `Event ${field}`,
      live: liveOperational[field],
    });

    if (resolved.present) {
      payload[field] = resolved.value;
      fieldsToDelete.delete(field);
    } else {
      delete payload[field];
      if (liveOperational[field].present) {
        fieldsToDelete.add(field);
      }
    }
  });

  if (targetExists && Object.prototype.hasOwnProperty.call(liveData, "ticketsSold")) {
    payload.ticketsSold = liveData.ticketsSold;
  } else if (!targetExists && Number.isInteger(payload.capacity)) {
    payload.ticketsSold = 0;
  } else {
    delete payload.ticketsSold;
  }

  if (
    Number.isInteger(payload.capacity)
    && (
      (Number.isInteger(payload.ticketsSold) ? payload.ticketsSold : 0)
      + (Number.isInteger(payload.manualSeatsReserved) ? payload.manualSeatsReserved : 0)
    ) > payload.capacity
  ) {
    throw new DraftPublishConflictError(
      "Event capacity is lower than the current sold and held seats. Review inventory before publishing.",
    );
  }

  payload.inStock = eventInStock(payload);

  return {
    fieldsToDelete: Array.from(fieldsToDelete),
    payload,
  };
};

export class DraftPublishConflictError extends Error {
  constructor(message = "This draft is no longer based on the current live content.") {
    super(message);
    this.name = "DraftPublishConflictError";
  }
}

export const contentRevisionFor = (data = {}) => (
  Number.isInteger(data.contentRevision) && data.contentRevision >= 0
    ? data.contentRevision
    : 0
);

export const contentFingerprintForTarget = (targetCollection, data = {}) => {
  const content = withoutDocumentMetadata(data);

  if (targetCollection === "products") {
    delete content.inStock;
    content.variants = productVariants(data).map((variant) => (
      Object.fromEntries(Object.entries(variant).filter(([key]) => (
        !productOperationalFields.includes(key)
      )))
    ));
  }

  if (targetCollection === "events") {
    [...eventOperationalFields, "inStock", "ticketsSold"].forEach((field) => {
      delete content[field];
    });
  }

  return canonicalJson(content);
};

export const operationalSnapshotForTarget = (targetCollection, data = {}) => {
  if (targetCollection === "products") {
    return {
      variants: productVariants(data).map(normalizedProductOperationalVariant),
    };
  }

  if (targetCollection === "events") {
    return eventOperationalSnapshot(data);
  }

  return {};
};

export const serializeOperationalSnapshot = (snapshot) => canonicalJson(snapshot || {});

export const parseOperationalSnapshot = (serialized) => {
  try {
    const parsed = JSON.parse(serialized || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    throw new DraftPublishConflictError(
      "This draft has invalid baseline data. Discard it and save a new draft before publishing.",
    );
  }
};

export const mergeDraftWithLiveOperationalData = ({
  baseOperational,
  deletedFields = [],
  draftData,
  liveData = {},
  targetCollection,
  targetExists,
}) => {
  if (targetCollection === "products" && targetExists) {
    return mergeProductOperationalData({
      baseOperational,
      deletedFields,
      draftData,
      liveData,
    });
  }

  if (targetCollection === "events") {
    return mergeEventOperationalData({
      baseOperational,
      deletedFields,
      draftData,
      liveData,
      targetExists,
    });
  }

  return {
    fieldsToDelete: deletedFields,
    payload: { ...draftData },
  };
};
