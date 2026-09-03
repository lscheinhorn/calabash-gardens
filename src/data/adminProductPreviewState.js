import { hasCompletePersistedVariantMapping } from "./productInventoryValidation";
import {
  operationalSnapshotForTarget,
  parseOperationalSnapshot,
  serializeOperationalSnapshot,
} from "./adminDraftPublishModel";

const cleanText = (value) => String(value || "").trim();

const isoTimestamp = (value) => {
  if (!value) {
    return "";
  }

  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const inventoryOption = (variant) => ({
  active: variant.active,
  label: cleanText(variant.label) || "Default",
  stockOnHand: variant.stockOnHand,
});

const completeInventoryOptions = (product) => {
  const priceOptions = Array.isArray(product.priceOptions) ? product.priceOptions : [];
  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (
    !priceOptions.length
    || !hasCompletePersistedVariantMapping(variants, priceOptions)
    || variants.some((variant) => variant.inventoryTracked !== true)
  ) {
    return null;
  }

  const ids = variants.map((variant) => cleanText(variant.id));
  const skus = variants.map((variant) => cleanText(variant.sku).toUpperCase());

  if (new Set(ids).size !== ids.length || new Set(skus).size !== skus.length) {
    return null;
  }

  return variants.map(inventoryOption);
};

const draftEditsInventory = (draft) => {
  if (!Array.isArray(draft?.data?.variants)) {
    return false;
  }

  try {
    return serializeOperationalSnapshot(operationalSnapshotForTarget("products", draft.data))
      !== serializeOperationalSnapshot(parseOperationalSnapshot(draft.draftBaseOperationalJson));
  } catch (error) {
    return true;
  }
};

export const buildAdminProductPreviewState = (product = {}, options = {}) => {
  const { draftStatusAvailable = true } = options;
  const draft = product._draft && typeof product._draft === "object"
    ? product._draft
    : null;
  const draftConflict = cleanText(product._draftConflict);
  const inventoryOptions = completeInventoryOptions(product);

  return {
    draft: {
      inventoryEdited: draftEditsInventory(draft),
      savedAt: isoTimestamp(draft?.draftUpdatedAt),
      state: !draftStatusAvailable
        ? "unavailable"
        : draftConflict
          ? "conflict"
          : draft
            ? "saved"
            : "live",
    },
    inventory: {
      isConfigured: Boolean(inventoryOptions),
      options: inventoryOptions || [],
    },
  };
};
