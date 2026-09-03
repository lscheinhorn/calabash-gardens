import { variantsForProduct } from "./inventoryAdminModel";

export const inventoryText = (value, fallback = "") => String(value || fallback).trim();

export const inventoryNumberOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

export const inventoryStatusLabel = (value) => String(value || "unknown")
  .replace(/_/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const inventoryWholeNumber = (value) => /^\d+$/.test(String(value).trim());

export const productInventoryRowsForProduct = (product, productId) => (
  variantsForProduct(product, productId).map((variant, index) => {
    const stockOnHand = inventoryNumberOrNull(variant.stockOnHand) || 0;
    const lowStockThreshold = inventoryNumberOrNull(variant.lowStockThreshold);
    const storedInventoryTracked = variant.inventoryTracked !== false;
    const inventoryTracked = variant.inventorySetupRequired === true
      ? false
      : storedInventoryTracked;
    const variantActive = variant.active !== false;
    const visible = product.isActive !== false && product.published !== false;
    const lowStock = inventoryTracked
      && lowStockThreshold !== null
      && stockOnHand <= lowStockThreshold;
    const status = !visible || !variantActive
      ? "inactive"
      : !inventoryTracked
        ? "untracked"
        : stockOnHand <= 0
          ? "out"
          : lowStock
            ? "low"
            : "available";

    return {
      active: variantActive,
      category: inventoryText(product.category),
      id: `product-${productId}-${variant.priceOptionIndex}-${inventoryText(variant.id, index)}`,
      inventoryTracked,
      inventorySetupRequired: variant.inventorySetupRequired === true,
      lowStockThreshold,
      priceOptionIndex: variant.priceOptionIndex,
      primary: inventoryText(product.title, productId),
      productId,
      secondary: inventoryText(variant.label || variant.id || `Option ${index + 1}`),
      sku: inventoryText(variant.sku),
      status,
      stockOnHand,
      storedInventoryTracked,
      type: "product",
      value: inventoryTracked ? `${stockOnHand} on hand` : "Not tracked",
      variantId: inventoryText(variant.id),
    };
  })
);

export const productInventoryRowsFromSnapshot = (snapshot) => snapshot.docs.flatMap((docSnapshot) => (
  productInventoryRowsForProduct(docSnapshot.data(), docSnapshot.id)
));

export const productInventoryDraftForRow = (row, options = {}) => ({
  active: row.active === true,
  inventoryTracked: row.inventoryTracked === true,
  lowStockThreshold: row.lowStockThreshold === null ? "" : String(row.lowStockThreshold),
  stockOnHand: options.blankUnconfirmed && row.inventorySetupRequired === true
    ? ""
    : String(row.stockOnHand),
});

export const productInventoryDraftChanged = (row, draft) => (
  draft
  && (
    (row.inventorySetupRequired === true && draft.stockConfirmed === true)
    || row.active !== draft.active
    || (
      !(row.inventorySetupRequired === true
        && draft.stockConfirmed !== true
        && String(draft.stockOnHand).trim() === "")
      && String(row.stockOnHand) !== String(draft.stockOnHand)
    )
    || String(row.lowStockThreshold === null ? "" : row.lowStockThreshold) !== String(draft.lowStockThreshold)
    || row.inventoryTracked !== draft.inventoryTracked
  )
);

export const productInventoryDraftRowsFor = (rows, options = {}) => rows.reduce((drafts, row) => ({
  ...drafts,
  [row.id]: productInventoryDraftForRow(row, options),
}), {});

export const validateProductInventoryChanges = ({ dirtyRows, draftRows, rows }) => {
  if (!dirtyRows.some((row) => row.type === "product")) {
    return "";
  }

  const productSkuOwners = new Map();

  for (const row of rows.filter((candidate) => candidate.type === "product")) {
    const sku = inventoryText(row.sku).toUpperCase();

    if (!sku) {
      return `${row.primary} ${row.secondary || "option"} needs a SKU before inventory can be saved.`;
    }

    if (productSkuOwners.has(sku)) {
      return `${row.primary} ${row.secondary || "option"} uses the same SKU as ${productSkuOwners.get(sku)}.`;
    }

    productSkuOwners.set(sku, `${row.primary} ${row.secondary || "option"}`);
  }

  const setupProductIds = new Set(dirtyRows
    .filter((row) => row.type === "product" && row.inventorySetupRequired === true)
    .map((row) => row.productId));

  for (const productId of setupProductIds) {
    const productRows = rows.filter((row) => (
      row.type === "product" && row.productId === productId
    ));
    const unconfirmedQuantity = productRows.some((row) => (
      row.inventorySetupRequired === true
      && draftRows[row.id]?.stockConfirmed !== true
    ));

    if (unconfirmedQuantity) {
      return `${productRows[0]?.primary || productId} needs a confirmed stock quantity for every option before inventory setup can be saved.`;
    }
  }

  for (const row of dirtyRows.filter((candidate) => candidate.type === "product")) {
    const draft = draftRows[row.id] || {};

    if (!inventoryWholeNumber(draft.stockOnHand)) {
      return "Every changed product stock value must be a whole number.";
    }

    if (draft.lowStockThreshold !== "" && !inventoryWholeNumber(draft.lowStockThreshold)) {
      return "Every changed low-stock threshold must be blank or a whole number.";
    }
  }

  return "";
};
