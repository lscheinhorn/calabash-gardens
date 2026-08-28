const cleanText = (value) => String(value ?? "").trim();

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const productDataFor = (product) => {
  const data = isObject(product?.data) ? product.data : product;

  return {
    ...(isObject(data) ? data : {}),
    id: cleanText(product?.id || data?.id || data?.slug),
  };
};

const priceOptionFor = (priceOption = {}) => ({
  option: cleanText(priceOption.option),
  price: cleanText(priceOption.price),
});

const optionsMatch = (actualOptions, expectedOptions) => (
  JSON.stringify(actualOptions.map(priceOptionFor))
  === JSON.stringify(expectedOptions.map(priceOptionFor))
);

const validIdentity = (value) => {
  const identity = cleanText(value);
  return identity && identity.length <= 120 ? identity : "";
};

const validStock = (value) => Number.isInteger(value) && value >= 0;
const knownInactiveTestProductIds = new Set(["Title", "test-basket"]);

const canonicalSku = (value) => cleanText(value).normalize("NFKC").toUpperCase();

const registryIdForSku = (sku) => `sku-${encodeURIComponent(canonicalSku(sku))}`;

const issue = (scope, type, id, detail) => ({
  detail,
  id,
  scope,
  type,
});

const existingVariantsByIndex = (product, optionCount, blockers, warnings) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const byIndex = new Map();

  if (variants.length > optionCount) {
    blockers.push(issue(
      "product",
      "extra-existing-variants",
      product.id,
      `Expected ${optionCount} variants but found ${variants.length}; extras require manual review.`,
    ));
  }

  variants.forEach((variant, arrayIndex) => {
    if (!isObject(variant)) {
      blockers.push(issue(
        "variant",
        "malformed-existing-variant",
        `${product.id}/${arrayIndex + 1}`,
        "Existing variant is not an object.",
      ));
      return;
    }

    const storedIndex = Number.isInteger(variant.priceOptionIndex)
      ? variant.priceOptionIndex
      : arrayIndex;

    if (!Number.isInteger(variant.priceOptionIndex)) {
      warnings.push(issue(
        "variant",
        "legacy-index-assumed",
        `${product.id}/${arrayIndex + 1}`,
        `Missing priceOptionIndex; preview maps this row to option ${arrayIndex + 1}.`,
      ));
    }

    if (storedIndex < 0 || storedIndex >= optionCount) {
      blockers.push(issue(
        "variant",
        "invalid-price-option-index",
        `${product.id}/${arrayIndex + 1}`,
        `priceOptionIndex ${storedIndex} is outside the product option list.`,
      ));
      return;
    }

    if (byIndex.has(storedIndex)) {
      blockers.push(issue(
        "variant",
        "duplicate-price-option-index",
        `${product.id}/${storedIndex}`,
        `Multiple variants map to price option ${storedIndex + 1}.`,
      ));
      return;
    }

    byIndex.set(storedIndex, variant);
  });

  return byIndex;
};

const buildProductPreview = (expectedProduct, actualProduct, blockers, warnings) => {
  const expected = productDataFor(expectedProduct);
  const actual = productDataFor(actualProduct);
  const expectedOptions = Array.isArray(expected.priceOptions) ? expected.priceOptions : [];
  const actualOptions = Array.isArray(actual.priceOptions) ? actual.priceOptions : [];
  const expectedVariants = Array.isArray(expected.variants) ? expected.variants : [];

  if (!expectedOptions.length || expectedVariants.length !== expectedOptions.length) {
    blockers.push(issue(
      "product",
      "invalid-static-option-contract",
      expected.id,
      "Static product options do not have a complete generated variant identity contract.",
    ));
  }

  if (!optionsMatch(actualOptions, expectedOptions)) {
    blockers.push(issue(
      "product",
      "price-options-differ",
      expected.id,
      "Firestore option labels or prices differ from the reviewed static product catalog.",
    ));
  }

  const currentByIndex = existingVariantsByIndex(
    actual,
    actualOptions.length,
    blockers,
    warnings,
  );

  const variants = actualOptions.map((priceOption, index) => {
    const current = currentByIndex.get(index) || {};
    const generated = expectedVariants[index] || {};
    const currentVariantId = validIdentity(current.id || current.variantId);
    const currentSku = validIdentity(current.sku);
    const generatedVariantId = validIdentity(generated.id);
    const generatedSku = validIdentity(generated.sku);
    const variantId = currentVariantId || generatedVariantId;
    const sku = currentSku || generatedSku;

    if (!variantId) {
      blockers.push(issue(
        "variant",
        "missing-proposed-variant-id",
        `${expected.id}/${index + 1}`,
        "No valid existing or generated variant ID is available.",
      ));
    }

    if (!sku) {
      blockers.push(issue(
        "variant",
        "missing-proposed-sku",
        `${expected.id}/${index + 1}`,
        "No valid existing or generated SKU is available.",
      ));
    }

    if (current.price !== undefined && cleanText(current.price) !== cleanText(priceOption.price)) {
      warnings.push(issue(
        "variant",
        "stored-price-will-align",
        `${expected.id}/${variantId || index + 1}`,
        `Stored variant price ${cleanText(current.price) || "(blank)"} will align to displayed price ${cleanText(priceOption.price)}.`,
      ));
    }

    return {
      currentInventoryTracked: current.inventoryTracked === true,
      currentStockOnHand: validStock(current.stockOnHand) ? current.stockOnHand : null,
      idSource: currentVariantId ? "existing" : "generated",
      initialActive: actual.inStock !== false,
      initialInventoryTracked: false,
      initialStockOnHand: 0,
      label: cleanText(priceOption.option) || "Default",
      needsJettaQuantity: true,
      price: cleanText(priceOption.price),
      priceOptionIndex: index,
      sku,
      skuSource: currentSku ? "existing" : "generated",
      sortOrder: index,
      variantId,
    };
  });

  const variantIds = variants.map((variant) => variant.variantId).filter(Boolean);
  const normalizedSkus = variants.map((variant) => canonicalSku(variant.sku)).filter(Boolean);

  if (new Set(variantIds).size !== variantIds.length) {
    blockers.push(issue(
      "product",
      "duplicate-proposed-variant-id",
      expected.id,
      "Generated or preserved variant IDs repeat within this product.",
    ));
  }

  if (new Set(normalizedSkus).size !== normalizedSkus.length) {
    blockers.push(issue(
      "product",
      "duplicate-proposed-sku",
      expected.id,
      "Generated or preserved SKUs repeat within this product.",
    ));
  }

  const completeExistingMapping = actualOptions.length > 0
    && currentByIndex.size === actualOptions.length
    && variants.every((variant) => (
      variant.idSource === "existing"
      && variant.skuSource === "existing"
    ));

  return {
    action: completeExistingMapping ? "review-quantity" : "initialize-on-inventory-save",
    id: expected.id,
    isActive: actual.isActive === true,
    published: actual.published === true,
    title: cleanText(expected.title || actual.title),
    variants,
    visible: actual.published === true && actual.isActive === true,
  };
};

const addGlobalSkuBlockers = (products, blockers) => {
  const ownerBySku = new Map();

  products.forEach((product) => product.variants.forEach((variant) => {
    const normalizedSku = canonicalSku(variant.sku);
    if (!normalizedSku) {
      return;
    }

    const owner = `${product.id}/${variant.variantId}`;
    const existingOwner = ownerBySku.get(normalizedSku);

    if (existingOwner && existingOwner !== owner) {
      blockers.push(issue(
        "catalog",
        "duplicate-global-sku",
        normalizedSku,
        `${normalizedSku} is proposed for both ${existingOwner} and ${owner}.`,
      ));
      return;
    }

    ownerBySku.set(normalizedSku, owner);
  }));
};

const addRegistryReview = (products, actualSkuRegistry, blockers, warnings) => {
  const registryById = new Map(actualSkuRegistry.map((record) => {
    const data = productDataFor(record);
    return [cleanText(record?.id || data.id), data];
  }).filter(([id]) => id));
  const reviewedRegistryIds = new Set();
  const summary = {
    conflicting: 0,
    correctlyOwned: 0,
    missing: 0,
    orphaned: 0,
  };

  products.forEach((product) => product.variants.forEach((variant) => {
    const registryId = registryIdForSku(variant.sku);
    const registryData = registryById.get(registryId);
    reviewedRegistryIds.add(registryId);
    variant.registryId = registryId;

    if (!registryData) {
      variant.registryStatus = "missing";
      summary.missing += 1;
      return;
    }

    const correctlyOwned = cleanText(registryData.productId) === product.id
      && cleanText(registryData.variantId) === variant.variantId
      && canonicalSku(registryData.sku) === canonicalSku(variant.sku);

    if (correctlyOwned) {
      variant.registryStatus = "correctly-owned";
      summary.correctlyOwned += 1;
      return;
    }

    variant.registryStatus = "conflicting";
    summary.conflicting += 1;
    blockers.push(issue(
      "sku-registry",
      "conflicting-sku-claim",
      registryId,
      `${variant.sku} is claimed by ${cleanText(registryData.productId) || "an unknown product"}/${cleanText(registryData.variantId) || "an unknown variant"}.`,
    ));
  }));

  registryById.forEach((registryData, registryId) => {
    if (reviewedRegistryIds.has(registryId)) {
      return;
    }

    summary.orphaned += 1;
    warnings.push(issue(
      "sku-registry",
      "orphaned-sku-claim",
      registryId,
      `Registry claim ${cleanText(registryData.sku) || registryId} is not used by the reviewed catalog.`,
    ));
  });

  return summary;
};

const countWhere = (products, predicate) => products.reduce((total, product) => (
  total + product.variants.filter(predicate).length
), 0);

const buildProductVariantMigrationPreview = ({
  actualProducts = [],
  actualSkuRegistry = [],
  expectedProducts = [],
  skuRegistryRead = { ok: true },
} = {}) => {
  const blockers = [];
  const warnings = [];
  const actualById = new Map(actualProducts.map((product) => {
    const data = productDataFor(product);
    return [data.id, data];
  }).filter(([id]) => id));
  const expectedById = new Map(expectedProducts.map((product) => {
    const data = productDataFor(product);
    return [data.id, product];
  }).filter(([id]) => id));

  const products = [];

  expectedById.forEach((expectedProduct, productId) => {
    const actualProduct = actualById.get(productId);

    if (!actualProduct) {
      blockers.push(issue(
        "product",
        "missing-firestore-product",
        productId,
        "The reviewed static product is missing from Firestore.",
      ));
      return;
    }

    products.push(buildProductPreview(expectedProduct, actualProduct, blockers, warnings));
  });

  const excludedProducts = [];
  actualById.forEach((actualProduct, productId) => {
    if (expectedById.has(productId)) {
      return;
    }

    const knownInactiveTestProduct = knownInactiveTestProductIds.has(productId)
      && !(actualProduct.isActive === true && actualProduct.published === true);

    excludedProducts.push({
      id: productId,
      reason: knownInactiveTestProduct
        ? "Known inactive test record; excluded from migration."
        : "Not present in the reviewed static catalog; excluded pending review.",
      title: cleanText(actualProduct.title),
    });

    if (!knownInactiveTestProduct) {
      blockers.push(issue(
        "product",
        "extra-firestore-product",
        productId,
        "Firestore product is not in the reviewed static catalog and will not receive generated identities.",
      ));
    }
  });

  addGlobalSkuBlockers(products, blockers);
  const registrySummary = skuRegistryRead.ok === false
    ? {
      conflicting: 0,
      correctlyOwned: 0,
      missing: 0,
      orphaned: 0,
      unverified: products.reduce((total, product) => total + product.variants.length, 0),
    }
    : {
      ...addRegistryReview(
        products,
        actualSkuRegistry,
        blockers,
        warnings,
      ),
      unverified: 0,
    };

  if (skuRegistryRead.ok === false) {
    products.forEach((product) => product.variants.forEach((variant) => {
      variant.registryId = registryIdForSku(variant.sku);
      variant.registryStatus = "unverified";
    }));
    blockers.push(issue(
      "sku-registry",
      "sku-registry-unreadable",
      "productSkus",
      `SKU ownership could not be verified (${cleanText(skuRegistryRead.code) || "read failed"}).`,
    ));
  }

  const variantCount = products.reduce((total, product) => total + product.variants.length, 0);

  return {
    blockers,
    excludedProducts,
    products,
    ready: blockers.length === 0,
    summary: {
      actualProductCount: actualById.size,
      blockerCount: blockers.length,
      excludedProductCount: excludedProducts.length,
      expectedProductCount: expectedById.size,
      generatedSkuCount: countWhere(products, (variant) => variant.skuSource === "generated"),
      generatedVariantIdCount: countWhere(products, (variant) => variant.idSource === "generated"),
      initializeProductCount: products.filter((product) => (
        product.action === "initialize-on-inventory-save"
      )).length,
      preservedSkuCount: countWhere(products, (variant) => variant.skuSource === "existing"),
      preservedVariantIdCount: countWhere(products, (variant) => variant.idSource === "existing"),
      productCount: products.length,
      quantityReviewCount: variantCount,
      registryConflictCount: registrySummary.conflicting,
      registryCorrectCount: registrySummary.correctlyOwned,
      registryMissingCount: registrySummary.missing,
      registryOrphanCount: registrySummary.orphaned,
      registryUnverifiedCount: registrySummary.unverified,
      variantCount,
      warningCount: warnings.length,
    },
    warnings,
  };
};

const markdownEscape = (value) => cleanText(value).replace(/\|/g, "\\|");

const buildProductVariantMigrationMarkdown = (report) => {
  const status = report.ready ? "READY FOR INVENTORY ENTRY" : "BLOCKED";
  const lines = [
    "# Product Variant Migration Preview",
    "",
    `Status: **${status}**`,
    "",
    "This is a read-only identity plan. It does not update Firestore. Starting quantities remain Jetta-required and are written only when she saves reviewed counts in Inventory.",
    "",
    "## Summary",
    "",
    `- Reviewed static products: ${report.summary.expectedProductCount}`,
    `- Firestore products read: ${report.summary.actualProductCount}`,
    `- Products requiring identity initialization on first inventory save: ${report.summary.initializeProductCount}`,
    `- Proposed variants/SKUs: ${report.summary.variantCount}`,
    `- Generated variant IDs: ${report.summary.generatedVariantIdCount}`,
    `- Preserved variant IDs: ${report.summary.preservedVariantIdCount}`,
    `- Generated SKUs: ${report.summary.generatedSkuCount}`,
    `- Preserved SKUs: ${report.summary.preservedSkuCount}`,
    `- Missing SKU registry claims to create transactionally: ${report.summary.registryMissingCount}`,
    `- Existing correct SKU registry claims: ${report.summary.registryCorrectCount}`,
    `- Conflicting SKU registry claims: ${report.summary.registryConflictCount}`,
    `- Orphaned SKU registry claims needing review: ${report.summary.registryOrphanCount}`,
    `- Unverified SKU registry claims: ${report.summary.registryUnverifiedCount}`,
    `- Quantities Jetta must confirm: ${report.summary.quantityReviewCount}`,
    `- Blockers: ${report.summary.blockerCount}`,
    `- Warnings: ${report.summary.warningCount}`,
    "",
    "## Proposed Identities",
    "",
    "| Product | Option | Variant ID | SKU | Identity | Registry | Quantity |",
    "|---|---|---|---|---|---|---|",
  ];

  report.products.forEach((product) => product.variants.forEach((variant) => {
    lines.push([
      `| ${markdownEscape(product.title)}`,
      markdownEscape(variant.label),
      `\`${markdownEscape(variant.variantId)}\``,
      `\`${markdownEscape(variant.sku)}\``,
      `${variant.idSource}/${variant.skuSource}`,
      variant.registryStatus,
      "Jetta required |",
    ].join(" | "));
  }));

  lines.push("", "## Blockers", "");
  if (report.blockers.length) {
    report.blockers.forEach((entry) => lines.push(`- **${entry.id}** (${entry.type}): ${entry.detail}`));
  } else {
    lines.push("- None.");
  }

  lines.push("", "## Warnings", "");
  if (report.warnings.length) {
    report.warnings.forEach((entry) => lines.push(`- **${entry.id}** (${entry.type}): ${entry.detail}`));
  } else {
    lines.push("- None.");
  }

  lines.push("", "## Excluded Firestore Products", "");
  if (report.excludedProducts.length) {
    report.excludedProducts.forEach((product) => lines.push(
      `- **${product.id}**: ${product.reason}`,
    ));
  } else {
    lines.push("- None.");
  }

  return `${lines.join("\n")}\n`;
};

module.exports = {
  buildProductVariantMigrationMarkdown,
  buildProductVariantMigrationPreview,
};
