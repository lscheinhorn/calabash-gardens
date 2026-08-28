const targetLabels = {
  categories: "Product categories",
  content: "Site content",
  drafts: "Drafts",
  events: "Events",
  fallback: "Generated fallback",
  media: "Media",
  products: "Products",
  release: "Public read readiness",
};

const canonicalize = (value) => {
  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]));
  }

  return value;
};

const stableStringify = (value) => JSON.stringify(canonicalize(value));

const allowedStoragePathPattern = /^(product-images|event-images|event-documents|site-content-images|other-images)\/[^/?#\\\x00-\x1f]+$/;

const isAllowedStoragePath = (value) => {
  const storagePath = String(value || "");

  return allowedStoragePathPattern.test(storagePath)
    && !storagePath.startsWith("/")
    && !storagePath.split("/").includes("..");
};

const sanitizeString = (value) => {
  const text = String(value);

  const withoutUrlQueries = text.replace(/https?:\/\/[^\s<>()\[\]{}"']+/gi, (candidate) => {
    try {
      const url = new URL(candidate);
      return `${url.origin}${url.pathname}${url.search ? "?[redacted]" : ""}${url.hash ? "#[redacted]" : ""}`;
    } catch (error) {
      return "[redacted-url]";
    }
  });

  return withoutUrlQueries.replace(
    /\b(firebaseStorageDownloadTokens|token|x-goog-[a-z0-9-]+)=([^\s&,;]+)/gi,
    "$1=[redacted]",
  );
};

const sanitizeReportValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeReportValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [
      key,
      sanitizeReportValue(nestedValue),
    ]));
  }

  return typeof value === "string" ? sanitizeString(value) : value;
};

const createKey = (input) => {
  const chars = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890.,";

  return Array.prototype.map.call(String(input || ""), (char) => {
    const number = chars.indexOf(char);
    return number > -1 ? number : chars.length;
  }).join("");
};

const displayValue = (value) => {
  const serialized = stableStringify(value);
  return serialized.length > 500 ? `${serialized.slice(0, 497)}...` : serialized;
};

const normalizeString = (value) => String(value ?? "");
const normalizeBoolean = (value) => value === true;
const normalizeNumber = (value) => (Number.isFinite(value) ? value : null);

const normalizePriceOptions = (priceOptions) => (
  Array.isArray(priceOptions) ? priceOptions : []
).map((priceOption) => (
  typeof priceOption === "string"
    ? String(priceOption)
    : {
      option: normalizeString(priceOption?.option),
      price: normalizeString(priceOption?.price),
    }
));

const normalizePublicPriceOptions = (priceOptions, variants = []) => {
  const normalizedPrices = (Array.isArray(priceOptions) ? priceOptions : []).map((priceOption) => (
    typeof priceOption === "string"
      ? {
        option: "",
        price: String(priceOption),
        sku: "",
        variantId: "",
      }
      : {
        option: normalizeString(priceOption?.option),
        price: normalizeString(priceOption?.price),
        sku: normalizeString(priceOption?.sku),
        variantId: normalizeString(priceOption?.variantId),
      }
  ));
  const variantList = Array.isArray(variants) ? variants : [];

  return normalizedPrices.map((priceOption, index) => {
    const variant = variantList.find((candidate) => candidate?.priceOptionIndex === index) || {};

    return {
      option: normalizeString(priceOption.option),
      price: normalizeString(priceOption.price),
      sku: normalizeString(variant.sku || priceOption.sku),
      variantId: normalizeString(variant.id || priceOption.variantId),
    };
  });
};

const normalizeStringList = (values) => (
  Array.isArray(values) ? values.map((value) => normalizeString(value)) : []
);

const normalizeDate = (value) => {
  if (!value) {
    return new Date(0).toISOString();
  }

  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
};

const normalizePhotoPaths = (photos) => (
  Array.isArray(photos) ? photos : []
).map((photo, index) => {
  if (typeof photo === "string") {
    return { path: photo, sortOrder: index };
  }

  if (!photo || typeof photo !== "object" || !photo.path) {
    return null;
  }

  return {
    path: String(photo.path),
    sortOrder: Number.isInteger(photo.sortOrder) ? photo.sortOrder : index,
  };
}).filter(Boolean)
  .sort((firstPhoto, secondPhoto) => (
    firstPhoto.sortOrder - secondPhoto.sortOrder
  ))
  .map((photo) => photo.path);

const fieldNormalizers = {
  active: normalizeBoolean,
  category: normalizeString,
  date: normalizeDate,
  eventDates: normalizeStringList,
  info: (value) => (Array.isArray(value) ? normalizeStringList(value) : normalizeString(value)),
  info1: normalizeString,
  info2: normalizeString,
  isActive: normalizeBoolean,
  isHighlighted: normalizeBoolean,
  name: normalizeString,
  priceOptions: normalizePriceOptions,
  published: normalizeBoolean,
  sections: canonicalize,
  shipping: normalizeString,
  sortOrder: normalizeNumber,
  title: normalizeString,
};

const diffFields = (expected, actual, fields) => fields.reduce((differences, field) => {
  const normalize = fieldNormalizers[field] || canonicalize;
  const expectedValue = normalize(expected[field]);
  const actualValue = normalize(actual[field]);

  if (stableStringify(expectedValue) !== stableStringify(actualValue)) {
    differences.push({
      actual: displayValue(actualValue),
      expected: displayValue(expectedValue),
      field,
    });
  }

  return differences;
}, []);

const indexById = (items) => new Map((items || []).map((item) => [item.id, item]));

const makeIssueCollector = () => {
  const blockers = [];
  const warnings = [];

  return {
    addBlocker: (group, code, target, message) => blockers.push({ code, group, message, target }),
    addWarning: (group, code, target, message) => warnings.push({ code, group, message, target }),
    blockers,
    warnings,
  };
};

const compareRecords = ({
  actualItems,
  collector,
  expectedItems,
  fields,
  group,
  hiddenExtra,
}) => {
  const actualById = indexById(actualItems);
  const expectedById = indexById(expectedItems);
  const changed = [];
  const matching = [];
  const missing = [];

  expectedItems.forEach((expectedItem) => {
    const actualItem = actualById.get(expectedItem.id);

    if (!actualItem) {
      missing.push(expectedItem.id);
      collector.addBlocker(group, `${group}-missing`, expectedItem.id, `${targetLabels[group]} record is missing.`);
      return;
    }

    const differences = diffFields(expectedItem.data || expectedItem, actualItem, fields);

    if (differences.length) {
      changed.push({ differences, id: expectedItem.id });
      collector.addBlocker(
        group,
        `${group}-different`,
        expectedItem.id,
        `${targetLabels[group]} fields differ: ${differences.map((difference) => difference.field).join(", ")}.`,
      );
      return;
    }

    matching.push(expectedItem.id);
  });

  const extraVisible = [];
  const extraHidden = [];

  actualItems.filter((item) => !expectedById.has(item.id)).forEach((item) => {
    if (hiddenExtra && hiddenExtra(item)) {
      extraHidden.push(item.id);
      collector.addWarning(group, `${group}-extra-hidden`, item.id, `Extra ${targetLabels[group].toLowerCase()} record is hidden from the public site.`);
      return;
    }

    extraVisible.push(item.id);
    collector.addBlocker(group, `${group}-extra`, item.id, `Unexpected ${targetLabels[group].toLowerCase()} record exists.`);
  });

  return {
    changed,
    extraHidden,
    extraVisible,
    matching,
    missing,
    totalActual: actualItems.length,
    totalExpected: expectedItems.length,
  };
};

const compareRelativeOrder = ({ actualItems, collector, expectedItems, group }) => {
  const expectedIds = expectedItems.map((item) => item.id);
  const expectedIdSet = new Set(expectedIds);
  const actualIds = actualItems
    .map((item) => ({
      id: item.id,
      sortOrder: Number.isFinite(item.sortOrder) ? item.sortOrder : Number.MAX_SAFE_INTEGER,
      title: normalizeString(item.title),
    }))
    .filter((item) => expectedIdSet.has(item.id))
    .sort((first, second) => (
      first.sortOrder - second.sortOrder
        || first.title.localeCompare(second.title)
        || first.id.localeCompare(second.id)
    ))
    .map((item) => item.id);
  const comparableExpectedIds = expectedIds.filter((id) => actualIds.includes(id));
  const matches = stableStringify(comparableExpectedIds) === stableStringify(actualIds);

  if (!matches) {
    collector.addBlocker(group, `${group}-order-different`, "relative-order", `${targetLabels[group]} relative order differs from the static site.`);
  }

  return {
    actual: actualIds,
    expected: comparableExpectedIds,
    matches,
  };
};

const compareEffectiveVisibility = ({ actualItems, collector, expectedItems, group }) => {
  const actualById = indexById(actualItems);
  const differences = [];

  expectedItems.forEach((expectedItem) => {
    const actualItem = actualById.get(expectedItem.id);
    if (!actualItem) {
      return;
    }

    const expectedVisible = expectedItem.data.isActive === true;
    const actualVisible = actualItem.published === true && actualItem.isActive === true;

    if (expectedVisible !== actualVisible) {
      differences.push({ actual: actualVisible, expected: expectedVisible, id: expectedItem.id });
      collector.addBlocker(group, `${group}-visibility-different`, expectedItem.id, `${targetLabels[group]} public visibility differs from the static site.`);
    }

    if (actualItem.published !== actualItem.isActive) {
      collector.addWarning(group, `${group}-legacy-visibility-flags`, expectedItem.id, "Legacy published/isActive fields differ, although effective public visibility is unchanged.");
    }
  });

  return differences;
};

const compareProductVariants = ({ actualProducts, collector, expectedProducts }) => {
  const actualById = indexById(actualProducts);
  const duplicateSkuIssuesByProduct = new Map();
  const expectedIds = new Set(expectedProducts.map((product) => product.id));
  const issues = [];
  const skuOwners = new Map();

  [...actualProducts]
    .sort((first, second) => normalizeString(first.id).localeCompare(normalizeString(second.id)))
    .forEach((product) => {
      const variants = Array.isArray(product.variants) ? product.variants : [];

      variants.forEach((variant, index) => {
        const sku = normalizeString(variant?.sku).trim();
        if (!sku) {
          return;
        }

        const variantId = normalizeString(variant?.id).trim() || `variant-${index + 1}`;
        const target = `${product.id}/${variantId}`;
        const normalizedSku = sku.toUpperCase();
        const owner = skuOwners.get(normalizedSku);

        if (owner) {
          const productIssues = duplicateSkuIssuesByProduct.get(product.id) || [];
          productIssues.push(`SKU ${sku} is also used by ${owner}`);
          duplicateSkuIssuesByProduct.set(product.id, productIssues);
        } else {
          skuOwners.set(normalizedSku, target);
        }
      });
    });

  expectedProducts.forEach((expectedProduct) => {
    const actualProduct = actualById.get(expectedProduct.id);
    if (!actualProduct) {
      return;
    }

    const priceOptions = normalizePriceOptions(actualProduct.priceOptions);
    const variants = Array.isArray(actualProduct.variants) ? actualProduct.variants : [];
    const productIssues = [...(duplicateSkuIssuesByProduct.get(expectedProduct.id) || [])];
    const productVariantIds = new Set();

    if (variants.length !== priceOptions.length) {
      productIssues.push(`expected ${priceOptions.length} variants, found ${variants.length}`);
    }

    priceOptions.forEach((priceOption, index) => {
      const matchingVariants = variants.filter((variant) => variant?.priceOptionIndex === index);

      if (matchingVariants.length !== 1) {
        productIssues.push(`price option ${index + 1} maps to ${matchingVariants.length} variants`);
        return;
      }

      const variant = matchingVariants[0];
      [
        ["label", normalizeString(priceOption.option || "Default"), normalizeString(variant.label)],
        ["price", normalizeString(priceOption.price), normalizeString(variant.price)],
        ["sortOrder", index, variant.sortOrder],
      ].forEach(([field, expectedValue, actualValue]) => {
        if (stableStringify(expectedValue) !== stableStringify(actualValue)) {
          productIssues.push(`variant ${index + 1} ${field} differs`);
        }
      });

      const variantId = normalizeString(variant.id).trim();
      const sku = normalizeString(variant.sku).trim();
      if (!variantId) {
        productIssues.push(`variant ${index + 1} needs a stable ID`);
      } else if (productVariantIds.has(variantId)) {
        productIssues.push(`variant ID ${variantId} is duplicated`);
      } else {
        productVariantIds.add(variantId);
      }
      if (!sku) {
        productIssues.push(`variant ${index + 1} needs a SKU`);
      }
      if (typeof variant.active !== "boolean") {
        productIssues.push(`variant ${index + 1} active must be boolean`);
      } else if (
        actualProduct.published === true
        && actualProduct.isActive === true
        && actualProduct.inStock !== false
        && variant.active !== true
      ) {
        productIssues.push(`variant ${index + 1} is shown by priceOptions but is not active`);
      }
      if (typeof variant.inventoryTracked !== "boolean") {
        productIssues.push(`variant ${index + 1} inventoryTracked must be boolean`);
      }

      if (!Number.isInteger(variant.stockOnHand) || variant.stockOnHand < 0) {
        productIssues.push(`variant ${index + 1} stockOnHand must be a nonnegative integer`);
      } else if (
        actualProduct.published === true
        && actualProduct.isActive === true
        && actualProduct.inStock !== false
        && variant.active === true
        && variant.inventoryTracked === true
        && variant.stockOnHand === 0
      ) {
        productIssues.push(`variant ${index + 1} is advertised as available but has zero tracked stock`);
      }
      if (
        variant.lowStockThreshold !== null
        && variant.lowStockThreshold !== undefined
        && (!Number.isInteger(variant.lowStockThreshold) || variant.lowStockThreshold < 0)
      ) {
        productIssues.push(`variant ${index + 1} lowStockThreshold must be blank or a nonnegative integer`);
      }

    });

    if (productIssues.length) {
      const uniqueIssues = Array.from(new Set(productIssues));
      issues.push({ id: expectedProduct.id, issues: uniqueIssues });
      collector.addBlocker("products", "product-variants-invalid", expectedProduct.id, uniqueIssues.join("; "));
    }
  });

  duplicateSkuIssuesByProduct.forEach((productIssues, productId) => {
    if (expectedIds.has(productId)) {
      return;
    }

    const uniqueIssues = Array.from(new Set(productIssues));
    issues.push({ id: productId, issues: uniqueIssues });
    collector.addBlocker("products", "product-variants-invalid", productId, uniqueIssues.join("; "));
  });

  return issues;
};

const productPhotoExpectations = (mediaAssets) => mediaAssets.reduce((photosByProduct, mediaAsset) => {
  if (mediaAsset.linkedType !== "product" || mediaAsset.bin !== "products") {
    return photosByProduct;
  }

  const productPhotos = photosByProduct.get(mediaAsset.linkedId) || [];
  productPhotos.push(mediaAsset.storagePath);
  photosByProduct.set(mediaAsset.linkedId, productPhotos);
  return photosByProduct;
}, new Map());

const compareProductPhotos = ({ actualProducts, collector, expectedProducts, mediaAssets }) => {
  const expectedPhotosById = productPhotoExpectations(mediaAssets);
  const actualById = indexById(actualProducts);
  const differences = [];

  expectedProducts.forEach((expectedProduct) => {
    const actualProduct = actualById.get(expectedProduct.id);
    if (!actualProduct) {
      return;
    }

    const expectedPaths = expectedPhotosById.get(expectedProduct.id) || [];
    const actualPaths = normalizePhotoPaths(actualProduct.photos);

    if (stableStringify(expectedPaths) !== stableStringify(actualPaths)) {
      differences.push({
        actual: actualPaths,
        expected: expectedPaths,
        id: expectedProduct.id,
      });
      collector.addBlocker("products", "product-photos-different", expectedProduct.id, "Product photo attachments do not match the static site.");
    }
  });

  return differences;
};

const compareEventMedia = ({ actualEvents, collector, expectedEvents, mediaAssets }) => {
  const actualById = indexById(actualEvents);
  const differences = [];

  expectedEvents.forEach((expectedEvent) => {
    const event = actualById.get(expectedEvent.id);
    if (!event) {
      return;
    }

    const expectedEventMedia = mediaAssets.filter((mediaAsset) => (
      mediaAsset.linkedType === "event" && mediaAsset.linkedId === expectedEvent.id
    ));
    const expectedPhotos = expectedEventMedia
      .filter((mediaAsset) => mediaAsset.field === "photo")
      .map((mediaAsset) => mediaAsset.storagePath);
    const expectedMenu = normalizeString(expectedEventMedia.find((mediaAsset) => (
      mediaAsset.field === "link"
    ))?.storagePath);
    const actualPhotos = normalizePhotoPaths(event.photos);
    const actualMenu = normalizeString(event.link);

    if (stableStringify(expectedPhotos) !== stableStringify(actualPhotos)) {
      differences.push({
        actual: actualPhotos,
        eventId: expectedEvent.id,
        expected: expectedPhotos,
        field: "photos",
      });
      collector.addBlocker(
        "events",
        "event-photos-different",
        expectedEvent.id,
        "Ordered event photo attachments differ from the static event.",
      );
    }

    if (expectedMenu !== actualMenu) {
      differences.push({
        actual: actualMenu,
        eventId: expectedEvent.id,
        expected: expectedMenu,
        field: "link",
      });
      collector.addBlocker(
        "events",
        "event-menu-different",
        expectedEvent.id,
        "Event menu/link attachment differs from the static event.",
      );
    }
  });

  return differences;
};

const compareMedia = ({ actual, collector, expected, storageStatusByPath }) => {
  const expectedById = new Map(expected.map((mediaAsset) => [mediaAsset.mediaAssetId, mediaAsset]));
  const actualById = indexById(actual);
  const requiredFields = ["bin", "contentType", "linkedId", "linkedType", "sourcePath", "storagePath"];
  const changed = [];
  const missingDocuments = [];

  expected.forEach((expectedMedia) => {
    const actualMedia = actualById.get(expectedMedia.mediaAssetId);

    if (!actualMedia) {
      missingDocuments.push(expectedMedia.mediaAssetId);
      collector.addBlocker("media", "media-document-missing", expectedMedia.mediaAssetId, `mediaAssets document is missing for ${expectedMedia.storagePath}.`);
    } else {
      const differences = diffFields(expectedMedia, actualMedia, requiredFields);
      if (normalizeString(actualMedia.status) !== "active") {
        differences.push({
          actual: displayValue(actualMedia.status),
          expected: displayValue("active"),
          field: "status",
        });
      }

      if (differences.length) {
        changed.push({ differences, id: expectedMedia.mediaAssetId });
        collector.addBlocker("media", "media-document-different", expectedMedia.mediaAssetId, `mediaAssets metadata differs: ${differences.map((difference) => difference.field).join(", ")}.`);
      }
    }
  });

  const extraDocuments = actual
    .filter((mediaAsset) => !expectedById.has(mediaAsset.id))
    .map((mediaAsset) => mediaAsset.id);
  extraDocuments.forEach((id) => {
    collector.addWarning("media", "media-document-extra", id, "Extra mediaAssets record is not part of the current static ownership inventory.");
  });

  const missingStorage = [];
  const inaccessibleStorage = [];
  const storageMetadataDifferences = [];

  expected.forEach((mediaAsset) => {
    const identityIssues = [];
    if (!Number.isFinite(mediaAsset.expectedSize) || mediaAsset.expectedSize <= 0) {
      identityIssues.push("reviewed source size is unavailable");
    }
    if (!normalizeString(mediaAsset.expectedMd5Hash)) {
      identityIssues.push("reviewed source MD5 checksum is unavailable");
    }
    if (identityIssues.length) {
      storageMetadataDifferences.push({
        issues: identityIssues,
        path: mediaAsset.storagePath,
      });
      collector.addBlocker(
        "media",
        "storage-identity-unavailable",
        mediaAsset.mediaAssetId,
        identityIssues.join("; "),
      );
    }

    const storageStatus = storageStatusByPath[mediaAsset.storagePath];

    if (storageStatus?.exists === true) {
      const metadataIssues = [];
      if (storageStatus.contentType !== mediaAsset.contentType) {
        metadataIssues.push(`content type ${storageStatus.contentType || "missing"} should be ${mediaAsset.contentType}`);
      }
      if (!Number.isFinite(storageStatus.size) || storageStatus.size <= 0) {
        metadataIssues.push("size must be greater than zero");
      }
      if (
        Number.isFinite(mediaAsset.expectedSize)
        && storageStatus.size !== mediaAsset.expectedSize
      ) {
        metadataIssues.push(`size ${storageStatus.size} should be ${mediaAsset.expectedSize}`);
      }
      if (
        mediaAsset.expectedMd5Hash
        && storageStatus.md5Hash !== mediaAsset.expectedMd5Hash
      ) {
        metadataIssues.push("MD5 checksum differs from the reviewed upload source");
      }
      if (storageStatus.downloadUrlAvailable !== true) {
        metadataIssues.push("download URL is unavailable");
      }

      if (metadataIssues.length) {
        storageMetadataDifferences.push({
          issues: metadataIssues,
          path: mediaAsset.storagePath,
        });
        collector.addBlocker("media", "storage-metadata-invalid", mediaAsset.mediaAssetId, metadataIssues.join("; "));
      }
      return;
    }

    if (storageStatus?.code === "storage/object-not-found") {
      missingStorage.push(mediaAsset.storagePath);
      collector.addBlocker("media", "storage-object-missing", mediaAsset.mediaAssetId, `Storage object is missing: ${mediaAsset.storagePath}.`);
      return;
    }

    inaccessibleStorage.push({
      code: storageStatus?.code || "not-checked",
      path: mediaAsset.storagePath,
    });
    collector.addBlocker("media", "storage-object-inaccessible", mediaAsset.mediaAssetId, `Storage object could not be verified (${storageStatus?.code || "not checked"}): ${mediaAsset.storagePath}.`);
  });

  return {
    changed,
    extraDocuments,
    inaccessibleStorage,
    missingDocuments,
    missingStorage,
    storageMetadataDifferences,
    totalActual: actual.length,
    totalExpected: expected.length,
  };
};

const validDraftBaseline = (draft) => (
  Number.isInteger(draft.draftBaseContentRevision)
    && draft.draftBaseContentRevision >= 0
    && typeof draft.draftBaseContentFingerprint === "string"
    && typeof draft.draftBaseOperationalJson === "string"
    && typeof draft.draftBaseTargetExists === "boolean"
    && Number.isInteger(draft.draftRevision)
    && draft.draftRevision >= 1
);

const compareDrafts = ({ collector, drafts }) => {
  const active = drafts.filter((draft) => draft.draftStatus === "draft");
  const unsafe = active.filter((draft) => !validDraftBaseline(draft));

  active.filter(validDraftBaseline).forEach((draft) => {
    collector.addWarning("drafts", "active-draft", `${draft.targetCollection}/${draft.id}`, "A safe unpublished draft is pending and is intentionally excluded from live parity.");
  });
  unsafe.forEach((draft) => {
    collector.addBlocker("drafts", "unsafe-active-draft", `${draft.targetCollection}/${draft.id}`, "Active draft predates transactional publishing and must be discarded and saved again before it can publish safely.");
  });

  return {
    active: active.map((draft) => `${draft.targetCollection}/${draft.id}`),
    safeActive: active.filter(validDraftBaseline).map((draft) => `${draft.targetCollection}/${draft.id}`),
    total: drafts.length,
    unsafeActive: unsafe.map((draft) => `${draft.targetCollection}/${draft.id}`),
  };
};

const publicProductShape = (product, categoryNames) => ({
  category: categoryNames[product.category] || product.category || "",
  info: normalizeString(product.info),
  info1: normalizeString(product.info1),
  info2: normalizeString(product.info2),
  inStock: product.inStock !== false,
  isActive: product.published === true && product.isActive === true,
  isHighlighted: product.isHighlighted === true,
  key: createKey(product.title),
  photoPaths: normalizePhotoPaths(product.photos),
  priceOptions: normalizePublicPriceOptions(product.priceOptions, product.variants),
  shipping: normalizeString(product.shipping || "0.00"),
  sortOrder: normalizeNumber(product.sortOrder) ?? 999,
  title: normalizeString(product.title),
});

const cachePhotoStoragePath = (value, storageBucket) => {
  const photoValue = normalizeString(value);

  if (isAllowedStoragePath(photoValue)) {
    return { path: photoValue, valid: true };
  }

  try {
    const url = new URL(photoValue);
    const match = url.hostname === "firebasestorage.googleapis.com"
      ? url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/)
      : null;

    if (!match) {
      return { reason: "unsupported URL", valid: false };
    }

    const bucket = decodeURIComponent(match[1]);
    if (bucket !== storageBucket) {
      return { reason: "wrong Firebase Storage bucket", valid: false };
    }

    const storagePath = decodeURIComponent(match[2]);
    if (!isAllowedStoragePath(storagePath)) {
      return { reason: "unapproved Storage path", valid: false };
    }

    return { path: storagePath, valid: true };
  } catch (error) {
    return { reason: "not a Storage path or supported Firebase URL", valid: false };
  }
};

const cacheProductShape = (product, storageBucket) => {
  const photoResults = (Array.isArray(product.photos) ? product.photos : [])
    .map((photo) => cachePhotoStoragePath(photo, storageBucket));

  return {
    invalidPhotoReasons: photoResults
      .map((result, index) => result.valid ? null : `photo ${index + 1}: ${result.reason}`)
      .filter(Boolean),
    shape: {
      category: normalizeString(product.category),
      info: normalizeString(product.info),
      info1: normalizeString(product.info1),
      info2: normalizeString(product.info2),
      inStock: product.inStock !== false,
      isActive: product.isActive === true,
      isHighlighted: product.isHighlighted === true,
      key: normalizeString(product.key),
      photoPaths: photoResults.filter((result) => result.valid).map((result) => result.path),
      priceOptions: normalizePublicPriceOptions(product.priceOptions, product.variants),
      shipping: normalizeString(product.shipping || "0.00"),
      sortOrder: normalizeNumber(product.sortOrder) ?? 999,
      title: normalizeString(product.title),
    },
  };
};

const compareFallback = ({
  actualCategories,
  actualProducts,
  cache,
  collector,
  deployment,
  projectId,
  storageBucket,
}) => {
  const categoryNames = Object.fromEntries(actualCategories.map((category) => [
    category.id,
    normalizeString(category.name || category.id),
  ]));
  const cacheProducts = Array.isArray(cache?.products) ? cache.products : [];
  const cacheById = indexById(cacheProducts);
  const actualById = indexById(actualProducts);
  const missing = [];
  const extra = [];
  const changed = [];

  actualProducts.forEach((product) => {
    const cachedProduct = cacheById.get(product.id);
    if (!cachedProduct) {
      missing.push(product.id);
      return;
    }

    const actualShape = publicProductShape(product, categoryNames);
    const cacheResult = cacheProductShape(cachedProduct, storageBucket);
    if (cacheResult.invalidPhotoReasons.length) {
      collector.addBlocker(
        "fallback",
        "fallback-photo-reference-invalid",
        product.id,
        `Generated fallback has invalid photo references (${cacheResult.invalidPhotoReasons.join("; ")}).`,
      );
    }
    if (stableStringify(actualShape) !== stableStringify(cacheResult.shape)) {
      changed.push(product.id);
    }
  });

  cacheProducts.forEach((product) => {
    if (!actualById.has(product.id)) {
      extra.push(product.id);
    }
  });

  if (cache?.source !== `firestore:${projectId}`) {
    collector.addBlocker("fallback", "fallback-source", "public-products-cache", "Generated fallback source does not identify the audited Firestore project.");
  }
  if (cache?.productCount !== cacheProducts.length) {
    collector.addBlocker("fallback", "fallback-count-invalid", "public-products-cache", "Generated fallback productCount does not match its product array.");
  }
  if (missing.length || extra.length || changed.length) {
    collector.addBlocker("fallback", "fallback-stale", "public-products-cache", `Generated fallback differs from Firestore (${missing.length} missing, ${extra.length} extra, ${changed.length} changed).`);
  }
  const actualOrder = [...actualProducts]
    .sort((first, second) => (
      (normalizeNumber(first.sortOrder) ?? 999) - (normalizeNumber(second.sortOrder) ?? 999)
        || normalizeString(first.title).localeCompare(normalizeString(second.title))
        || first.id.localeCompare(second.id)
    ))
    .map((product) => product.id);
  const cacheOrder = cacheProducts.map((product) => product.id);
  const orderMatches = stableStringify(actualOrder) === stableStringify(cacheOrder);
  if (!orderMatches) {
    collector.addBlocker("fallback", "fallback-order-different", "public-products-cache", "Generated fallback product order differs from the public Firestore adapter order.");
  }
  if (!deployment.cacheRefreshConfigured) {
    collector.addBlocker("fallback", "fallback-refresh-not-configured", "predeploy", "The deploy workflow does not regenerate the Firestore product fallback before building.");
  }
  if (!deployment.eventFallbackConfigured) {
    collector.addBlocker("fallback", "event-fallback-not-configured", "events", "Events do not have a generated Firestore fallback artifact for an outage or failed read.");
  }
  if (!deployment.contentFallbackConfigured) {
    collector.addBlocker("fallback", "content-fallback-not-configured", "siteContent", "Site content does not have a generated Firestore fallback artifact for an outage or failed read.");
  }

  const generatedAt = cache?.generatedAt ? new Date(cache.generatedAt) : null;
  const generatedAtIsValid = generatedAt && !Number.isNaN(generatedAt.getTime());
  if (!generatedAtIsValid) {
    collector.addBlocker("fallback", "fallback-generated-at-invalid", "public-products-cache", "Generated fallback must record a valid generation timestamp.");
  }
  const latestProductUpdate = actualProducts
    .map((product) => product.updatedAt)
    .filter(Boolean)
    .map((value) => value?.toDate ? value.toDate() : new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((first, second) => second - first)[0];

  if (generatedAtIsValid && latestProductUpdate && generatedAt < latestProductUpdate) {
    collector.addWarning("fallback", "fallback-older-than-firestore", "public-products-cache", "Generated fallback predates the latest Firestore product update.");
  }

  return {
    changed,
    extra,
    generatedAt: cache?.generatedAt || "",
    missing,
    orderMatches,
    productCount: cacheProducts.length,
    contentFallbackConfigured: deployment.contentFallbackConfigured === true,
    eventFallbackConfigured: deployment.eventFallbackConfigured === true,
    refreshConfigured: deployment.cacheRefreshConfigured === true,
    source: cache?.source || "",
  };
};

const collectReferencedMediaPaths = (actual) => {
  const references = [];

  actual.products.forEach((product) => {
    normalizePhotoPaths(product.photos).forEach((path) => references.push({ path, target: `products/${product.id}` }));
  });
  actual.events.forEach((event) => {
    normalizePhotoPaths(event.photos).forEach((path) => references.push({ path, target: `events/${event.id}` }));
    if (event.link) {
      references.push({ path: String(event.link), target: `events/${event.id}:link` });
    }
  });

  return references;
};

const compareUnbackedReferences = ({ actual, collector }) => {
  const mediaPaths = new Set(actual.mediaAssets.map((mediaAsset) => mediaAsset.storagePath).filter(Boolean));
  const references = collectReferencedMediaPaths(actual);
  const invalid = references.filter((reference) => !isAllowedStoragePath(reference.path));
  const unbacked = references.filter((reference) => (
    isAllowedStoragePath(reference.path) && !mediaPaths.has(reference.path)
  ));

  invalid.forEach((reference) => {
    collector.addBlocker(
      "media",
      "media-reference-not-storage-path",
      reference.target,
      `Referenced media must use an approved Firebase Storage path: ${reference.path}.`,
    );
  });

  unbacked.forEach((reference) => {
    collector.addBlocker("media", "media-reference-unbacked", reference.target, `Referenced path has no mediaAssets record: ${reference.path}.`);
  });

  return {
    invalid,
    unbacked,
  };
};

const buildFirebaseParityReport = ({
  actual,
  cache,
  deployment = {},
  expected,
  generatedAt = new Date().toISOString(),
  projectId,
  snapshotFingerprint = "",
  storageBucket = "",
  storageStatusByPath = {},
}) => {
  const collector = makeIssueCollector();

  expected.seedIssues.errors.forEach((message, index) => {
    collector.addBlocker("products", "static-seed-error", `seed-${index + 1}`, message);
  });

  const products = compareRecords({
    actualItems: actual.products,
    collector,
    expectedItems: expected.products,
    fields: [
      "title",
      "category",
      "info",
      "info1",
      "info2",
      "shipping",
      "priceOptions",
      "isHighlighted",
    ],
    group: "products",
    hiddenExtra: (product) => !(product.published === true && product.isActive === true),
  });
  products.photoDifferences = compareProductPhotos({
    actualProducts: actual.products,
    collector,
    expectedProducts: expected.products,
    mediaAssets: expected.mediaAssets,
  });
  products.order = compareRelativeOrder({
    actualItems: actual.products,
    collector,
    expectedItems: expected.products,
    group: "products",
  });
  products.variantIssues = compareProductVariants({
    actualProducts: actual.products,
    collector,
    expectedProducts: expected.products,
  });
  products.visibilityDifferences = compareEffectiveVisibility({
    actualItems: actual.products,
    collector,
    expectedItems: expected.products,
    group: "products",
  });

  const categories = compareRecords({
    actualItems: actual.categories,
    collector,
    expectedItems: expected.categories,
    fields: ["name", "active"],
    group: "categories",
  });

  const events = compareRecords({
    actualItems: actual.events,
    collector,
    expectedItems: expected.events,
    fields: [
      "title",
      "category",
      "date",
      "eventDates",
      "info",
      "priceOptions",
      "shipping",
    ],
    group: "events",
  });
  events.mediaDifferences = compareEventMedia({
    actualEvents: actual.events,
    collector,
    expectedEvents: expected.events,
    mediaAssets: expected.mediaAssets,
  });
  events.visibilityDifferences = compareEffectiveVisibility({
    actualItems: actual.events,
    collector,
    expectedItems: expected.events,
    group: "events",
  });

  const expectedEventLinks = expected.mediaAssets.filter((mediaAsset) => (
    mediaAsset.linkedType === "event" && mediaAsset.field === "link"
  ));
  if (expectedEventLinks.length && deployment.eventLinkStorageResolutionConfigured !== true) {
    collector.addBlocker("events", "event-link-resolution-not-configured", "publicEventAdapter", "Event menu Storage paths are not resolved to customer-usable URLs.");
  }
  const content = compareRecords({
    actualItems: actual.contentDocs,
    collector,
    expectedItems: expected.contentDocs,
    fields: ["published", "sections"],
    group: "content",
  });
  content.order = compareRelativeOrder({
    actualItems: actual.contentDocs,
    collector,
    expectedItems: expected.contentDocs,
    group: "content",
  });

  const media = compareMedia({
    actual: actual.mediaAssets,
    collector,
    expected: expected.mediaAssets,
    storageStatusByPath,
  });
  media.references = compareUnbackedReferences({ actual, collector });

  const drafts = compareDrafts({ collector, drafts: actual.drafts });
  const fallback = compareFallback({
    actualCategories: actual.categories,
    actualProducts: actual.products,
    cache,
    collector,
    deployment,
    projectId,
    storageBucket,
  });

  if (deployment.publicReadRulesConfigured !== true) {
    collector.addBlocker("release", "public-read-rules-not-configured", "firestore.rules", "The anonymous product, category, event, and site-content query shapes did not all succeed; inspect the recorded probe codes before changing rules.");
  }
  if (deployment.siteMediaRuntimeConfigured !== true) {
    collector.addBlocker("media", "site-media-runtime-not-configured", "public-site-media", "Site/default media still render from bundled files instead of a Firebase Storage adapter.");
  }

  const report = {
    blockers: collector.blockers,
    details: {
      categories,
      content,
      drafts,
      events,
      fallback,
      media,
      products,
      release: {
        publicReadChecks: Array.isArray(deployment.publicReadChecks)
          ? deployment.publicReadChecks
          : [],
      },
    },
    generatedAt,
    projectId,
    ready: collector.blockers.length === 0,
    snapshotFingerprint,
    summary: {
      blockerCount: collector.blockers.length,
      blockerTypeCount: new Set(collector.blockers.map((blocker) => blocker.code)).size,
      categories: { actual: categories.totalActual, expected: categories.totalExpected },
      content: { actual: content.totalActual, expected: content.totalExpected },
      events: { actual: events.totalActual, expected: events.totalExpected },
      media: { actual: media.totalActual, expected: media.totalExpected },
      products: { actual: products.totalActual, expected: products.totalExpected },
      warningCount: collector.warnings.length,
      warningTypeCount: new Set(collector.warnings.map((warning) => warning.code)).size,
    },
    warnings: collector.warnings,
  };

  return sanitizeReportValue(canonicalize(report));
};

const markdownEscape = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

const issueTable = (issues) => {
  if (!issues.length) {
    return "None.";
  }

  return [
    "| Area | Target | Finding |",
    "| --- | --- | --- |",
    ...issues.map((issue) => `| ${markdownEscape(targetLabels[issue.group] || issue.group)} | \`${markdownEscape(issue.target)}\` | ${markdownEscape(issue.message)} |`),
  ].join("\n");
};

const changedTargets = (section) => section.changed.map((row) => (
  `${row.id}: ${row.differences.map((difference) => difference.field).join(", ")}`
));

const listOrNone = (items) => items.length ? items.map((item) => `- ${item}`).join("\n") : "None.";

const buildFirebaseParityMarkdown = (report) => {
  const { details, summary } = report;
  const status = report.ready ? "READY" : "NOT READY";
  const publicReadRows = details.release.publicReadChecks.length
    ? details.release.publicReadChecks.map((check) => (
      `| ${markdownEscape(check.name)} | ${check.allowed ? "allowed" : "denied"} | ${markdownEscape(check.code || "ok")} |`
    )).join("\n")
    : "| Not checked | denied | no behavioral result |";

  return `# Firebase Parity Audit

Generated: ${report.generatedAt}

Project: \`${report.projectId}\`

Firestore snapshot fingerprint: \`${report.snapshotFingerprint || "not recorded"}\`

Status: **${status}**

This command is read-only with respect to Firebase. It reads Firestore and Storage metadata, then writes this local report. It does not save drafts, publish records, upload files, change rules, regenerate the public fallback, or deploy.

## Acceptance Boundary

- Public content fields, visibility, ordering, prices, dates, photos, event menus, and site content must match the static source of truth.
- Product stock quantities/thresholds, event capacity, tickets sold, manual holds, and waitlist state are Firestore-owned operational facts and are intentionally excluded from static content comparison. Variant IDs, SKUs, price-option mapping, and value validity are still required structural checks.
- Every expected Storage object must match the reviewed upload source's exact size and MD5 checksum, and public cache photos must resolve to ordered paths in the audited bucket without retaining URL query tokens.
- Public query readiness is exercised anonymously using the exact product, category, event, and site-content read shapes. Unimplemented fallback/runtime contracts fail closed.
- Safe unpublished drafts are reported separately and do not alter live parity. Legacy drafts that cannot publish transactionally are blockers.
- The public site remains on static reads until this report is ready and Luke separately approves the switch.

## Summary

| Area | Expected | Firestore |
| --- | ---: | ---: |
| Products | ${summary.products.expected} | ${summary.products.actual} |
| Product categories | ${summary.categories.expected} | ${summary.categories.actual} |
| Events | ${summary.events.expected} | ${summary.events.actual} |
| Site content | ${summary.content.expected} | ${summary.content.actual} |
| Media records / Storage candidates | ${summary.media.expected} | ${summary.media.actual} |

- Blockers: ${summary.blockerCount}
- Blocker types: ${summary.blockerTypeCount}
- Warnings: ${summary.warningCount} across ${summary.warningTypeCount} types
- Generated fallback products: ${details.fallback.productCount}
- Active drafts: ${details.drafts.active.length} (${details.drafts.unsafeActive.length} legacy/unsafe)

### Anonymous Public Read Probes

| Query shape | Result | Code |
| --- | --- | --- |
${publicReadRows}

## Blockers

${issueTable(report.blockers)}

## Warnings

${issueTable(report.warnings)}

## Record Detail

### Products

- Missing: ${details.products.missing.length}
- Changed: ${details.products.changed.length}
- Photo attachment differences: ${details.products.photoDifferences.length}
- Variant/SKU issues: ${details.products.variantIssues.length}
- Relative order matches: ${details.products.order.matches ? "yes" : "no"}
- Visibility differences: ${details.products.visibilityDifferences.length}
- Unexpected public: ${details.products.extraVisible.length}
- Extra but hidden: ${details.products.extraHidden.length}

Changed targets:

${listOrNone(changedTargets(details.products))}

Hidden extras:

${listOrNone(details.products.extraHidden)}

### Product Categories

- Missing: ${details.categories.missing.length}
- Changed: ${details.categories.changed.length}
- Unexpected: ${details.categories.extraVisible.length}

Unexpected categories:

${listOrNone(details.categories.extraVisible)}

### Events

- Missing: ${details.events.missing.length}
- Changed: ${details.events.changed.length}
- Unexpected: ${details.events.extraVisible.length}
- Missing/different photo or menu attachments: ${details.events.mediaDifferences.length}
- Visibility differences: ${details.events.visibilityDifferences.length}

Changed targets:

${listOrNone(changedTargets(details.events))}

### Site Content

- Missing: ${details.content.missing.length}
- Changed: ${details.content.changed.length}
- Unexpected: ${details.content.extraVisible.length}
- Relative order matches: ${details.content.order.matches ? "yes" : "no"}

Changed targets:

${listOrNone(changedTargets(details.content))}

### Media And Storage

- Missing mediaAssets documents: ${details.media.missingDocuments.length}
- Changed mediaAssets documents: ${details.media.changed.length}
- Extra mediaAssets documents: ${details.media.extraDocuments.length}
- Missing Storage objects: ${details.media.missingStorage.length}
- Storage objects not verifiable under current rules: ${details.media.inaccessibleStorage.length}
- Storage metadata/download differences: ${details.media.storageMetadataDifferences.length}
- Product/event references that are not approved Storage paths: ${details.media.references.invalid.length}
- Product/event Storage paths without mediaAssets metadata: ${details.media.references.unbacked.length}

### Generated Fallback

- Source: \`${details.fallback.source || "missing"}\`
- Missing products: ${details.fallback.missing.length}
- Extra products: ${details.fallback.extra.length}
- Changed products: ${details.fallback.changed.length}
- Product order matches: ${details.fallback.orderMatches ? "yes" : "no"}
- Deploy refresh configured: ${details.fallback.refreshConfigured ? "yes" : "no"}
- Event fallback configured: ${details.fallback.eventFallbackConfigured ? "yes" : "no"}
- Site-content fallback configured: ${details.fallback.contentFallbackConfigured ? "yes" : "no"}

## Next Gate

Resolve every blocker through separately reviewed migration or code phases, rerun \`npm run audit:firebase-parity\`, and review the resulting diff. A ready report is evidence for the later public-read decision; it does not itself authorize a merge, Firebase write, rules deployment, public-source switch, or site deployment.
`;
};

module.exports = {
  buildFirebaseParityMarkdown,
  buildFirebaseParityReport,
  canonicalize,
  isAllowedStoragePath,
  normalizePhotoPaths,
};
