const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildFirebaseParityMarkdown,
  buildFirebaseParityReport,
} = require("./lib/firebase-parity-model");

const createKey = (input) => {
  const chars = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890.,";
  return Array.prototype.map.call(String(input || ""), (char) => {
    const number = chars.indexOf(char);
    return number > -1 ? number : chars.length;
  }).join("");
};

test("production parity runner imports no Firebase mutation APIs", () => {
  const runner = fs.readFileSync(path.join(__dirname, "firebase-parity-audit.js"), "utf8");
  const forbiddenApis = [
    "addDoc",
    "deleteDoc",
    "deleteObject",
    "runTransaction",
    "serverTimestamp",
    "setDoc",
    "updateDoc",
    "uploadBytes",
    "writeBatch",
  ];

  forbiddenApis.forEach((api) => {
    assert.doesNotMatch(runner, new RegExp(`\\b${api}\\b`));
  });
  assert.doesNotMatch(runner, /PARITY_GATE_PUBLIC_STOREFRONT_READS_VERIFIED/);
  assert.doesNotMatch(runner, /eventDocumentRulesConfigured/);

  const expectationLoader = fs.readFileSync(
    path.join(__dirname, "lib/load-static-parity-expectations.js"),
    "utf8",
  );
  assert.doesNotMatch(expectationLoader, /require\(["']@babel\//);
  assert.match(expectationLoader, /createRequire\(require\.resolve\(["']react-scripts\/package\.json["']\)\)/);
});

const baseInputs = () => {
  const product = {
    category: "saffron",
    id: "saffron-salt",
    info: "Salt",
    info1: "",
    info2: "",
    inStock: true,
    isActive: true,
    isHighlighted: false,
    photos: [{ path: "product-images/saffron-salt.jpg", sortOrder: 0 }],
    priceOptions: [{ option: "2 oz", price: "15.00" }],
    published: true,
    shipping: "17.00",
    sortOrder: 0,
    title: "Saffron Salt",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    variants: [{
      active: true,
      id: "2-oz",
      inventoryTracked: true,
      label: "2 oz",
      lowStockThreshold: null,
      price: "15.00",
      priceOptionIndex: 0,
      sku: "CG-SAFFRON-SALT-2-OZ",
      sortOrder: 0,
      stockOnHand: 10,
    }],
  };
  const category = {
    active: true,
    id: "saffron",
    name: "Saffron",
    sortOrder: 0,
  };
  const event = {
    category: "Experience",
    date: new Date("2026-09-05T04:00:00.000Z"),
    eventDates: ["September 5th, 2026"],
    id: "home-grown",
    info: ["Dinner"],
    inStock: true,
    isActive: true,
    link: "event-documents/home-grown-menu.pdf",
    photos: [{ path: "event-images/home-grown.jpg", sortOrder: 0 }],
    priceOptions: ["60.00"],
    published: true,
    shipping: "0.00",
    title: "Home Grown",
  };
  const contentDoc = {
    id: "home",
    published: true,
    sections: { header: { title: "Calabash Gardens" } },
    sortOrder: 0,
  };
  const mediaAssets = [
    {
      bin: "products",
      contentType: "image/jpeg",
      linkedId: product.id,
      linkedType: "product",
      mediaAssetId: "product-saffron-salt",
      sourcePath: "src/resources/images/product_photos/saffron-salt.jpg",
      storagePath: "product-images/saffron-salt.jpg",
    },
    {
      bin: "events",
      contentType: "image/jpeg",
      field: "photo",
      linkedId: event.id,
      linkedType: "event",
      mediaAssetId: "event-home-grown-photo",
      sourcePath: "src/resources/images/home-grown.jpg",
      storagePath: "event-images/home-grown.jpg",
    },
    {
      bin: "events",
      contentType: "application/pdf",
      field: "link",
      linkedId: event.id,
      linkedType: "event",
      mediaAssetId: "event-home-grown-menu",
      sourcePath: "src/resources/home-grown.pdf",
      storagePath: "event-documents/home-grown-menu.pdf",
    },
  ];
  const actualMediaAssets = mediaAssets.map((mediaAsset) => ({
    ...mediaAsset,
    id: mediaAsset.mediaAssetId,
    status: "active",
  }));
  mediaAssets.forEach((mediaAsset) => {
    mediaAsset.expectedMd5Hash = `md5-${mediaAsset.mediaAssetId}`;
    mediaAsset.expectedSize = 100;
  });
  const cacheProduct = {
    category: "Saffron",
    id: product.id,
    info: product.info,
    info1: product.info1,
    info2: product.info2,
    inStock: true,
    isActive: true,
    isHighlighted: false,
    key: createKey(product.title),
    photos: ["https://firebasestorage.googleapis.com/v0/b/test-bucket/o/product-images%2Fsaffron-salt.jpg?alt=media&token=test-token"],
    priceOptions: [{
      ...product.priceOptions[0],
      sku: product.variants[0].sku,
      variantId: product.variants[0].id,
    }],
    shipping: product.shipping,
    sortOrder: 0,
    title: product.title,
  };

  return {
    actual: {
      categories: [category],
      contentDocs: [contentDoc],
      drafts: [],
      events: [event],
      mediaAssets: actualMediaAssets,
      products: [product],
    },
    cache: {
      generatedAt: "2026-01-02T00:00:00.000Z",
      productCount: 1,
      products: [cacheProduct],
      source: "firestore:calabash-54fb5",
    },
    deployment: {
      cacheRefreshConfigured: true,
      contentFallbackConfigured: true,
      eventFallbackConfigured: true,
      eventLinkStorageResolutionConfigured: true,
      publicReadRulesConfigured: true,
      siteMediaRuntimeConfigured: true,
    },
    expected: {
      categories: [{ id: category.id, data: structuredClone(category) }],
      contentDocs: [{ id: contentDoc.id, data: structuredClone(contentDoc) }],
      events: [{ id: event.id, data: structuredClone(event) }],
      mediaAssets,
      products: [{ id: product.id, data: structuredClone(product) }],
      seedIssues: { errors: [], warnings: [] },
    },
    projectId: "calabash-54fb5",
    snapshotFingerprint: "test-snapshot-fingerprint",
    storageBucket: "test-bucket",
    storageStatusByPath: Object.fromEntries(mediaAssets.map((mediaAsset) => [
      mediaAsset.storagePath,
      {
        contentType: mediaAsset.contentType,
        downloadUrlAvailable: true,
        exists: true,
        md5Hash: mediaAsset.expectedMd5Hash,
        size: 100,
      },
    ])),
  };
};

test("complete content and media parity is ready", () => {
  const report = buildFirebaseParityReport(baseInputs());
  assert.equal(report.ready, true);
  assert.equal(report.blockers.length, 0);
});

test("operational stock and ticket fields do not create static parity conflicts", () => {
  const inputs = baseInputs();
  inputs.actual.products[0].inStock = false;
  inputs.actual.products[0].variants[0].stockOnHand = 4;
  inputs.actual.events[0].inStock = false;
  inputs.actual.events[0].capacity = 30;
  inputs.actual.events[0].ticketsSold = 12;
  inputs.cache.products[0].inStock = false;

  const report = buildFirebaseParityReport(inputs);
  assert.equal(report.ready, true);
  assert.equal(report.details.products.changed.length, 0);
  assert.equal(report.details.events.changed.length, 0);
});

test("custom stable variant IDs and SKUs are accepted when cache and Firestore agree", () => {
  const inputs = baseInputs();
  inputs.actual.products[0].variants[0].id = "custom-size-id";
  inputs.actual.products[0].variants[0].sku = "JETTE-CUSTOM-SKU";
  inputs.cache.products[0].priceOptions[0].variantId = "custom-size-id";
  inputs.cache.products[0].priceOptions[0].sku = "JETTE-CUSTOM-SKU";

  const report = buildFirebaseParityReport(inputs);
  assert.equal(report.ready, true);
  assert.equal(report.details.products.variantIssues.length, 0);
});

test("invalid Storage metadata or an unavailable download URL blocks parity", () => {
  const inputs = baseInputs();
  inputs.storageStatusByPath["product-images/saffron-salt.jpg"] = {
    contentType: "application/octet-stream",
    downloadUrlAvailable: false,
    exists: true,
    size: 0,
  };

  const report = buildFirebaseParityReport(inputs);
  assert.equal(report.ready, false);
  assert.equal(report.blockers.some((blocker) => blocker.code === "storage-metadata-invalid"), true);
});

test("missing event media, unexpected category, and changed content block readiness", () => {
  const inputs = baseInputs();
  inputs.actual.events[0].photos = [];
  inputs.actual.events[0].link = "";
  inputs.actual.categories.push({ active: true, id: "all", name: "All", sortOrder: 99 });
  inputs.actual.contentDocs[0].sections.header.title = "Changed";

  const report = buildFirebaseParityReport(inputs);
  const codes = new Set(report.blockers.map((blocker) => blocker.code));

  assert.equal(report.ready, false);
  assert.equal(codes.has("event-photos-different"), true);
  assert.equal(codes.has("event-menu-different"), true);
  assert.equal(codes.has("categories-extra"), true);
  assert.equal(codes.has("content-different"), true);
});

test("hidden test products warn while legacy drafts and stale fallback block readiness", () => {
  const inputs = baseInputs();
  inputs.actual.products.push({
    id: "test-product",
    isActive: false,
    published: false,
    title: "Test Product",
  });
  inputs.actual.drafts.push({
    draftStatus: "draft",
    id: "saffron-salt",
    targetCollection: "products",
  });
  inputs.cache.products = [];
  inputs.cache.productCount = 0;
  inputs.deployment.cacheRefreshConfigured = false;

  const report = buildFirebaseParityReport(inputs);
  const blockerCodes = new Set(report.blockers.map((blocker) => blocker.code));
  const warningCodes = new Set(report.warnings.map((warning) => warning.code));

  assert.equal(report.ready, false);
  assert.equal(warningCodes.has("products-extra-hidden"), true);
  assert.equal(blockerCodes.has("unsafe-active-draft"), true);
  assert.equal(blockerCodes.has("fallback-stale"), true);
  assert.equal(blockerCodes.has("fallback-refresh-not-configured"), true);
});

test("duplicate SKUs within one product and advertised zero tracked stock block readiness", () => {
  const duplicateInputs = baseInputs();
  const secondPriceOption = { option: "4 oz", price: "25.00" };
  duplicateInputs.actual.products[0].priceOptions.push(secondPriceOption);
  duplicateInputs.expected.products[0].data.priceOptions.push(structuredClone(secondPriceOption));
  duplicateInputs.actual.products[0].variants.push({
    ...structuredClone(duplicateInputs.actual.products[0].variants[0]),
    id: "4-oz",
    label: "4 oz",
    price: "25.00",
    priceOptionIndex: 1,
    sortOrder: 1,
  });
  duplicateInputs.cache.products[0].priceOptions.push({
    ...secondPriceOption,
    sku: "CG-SAFFRON-SALT-2-OZ",
    variantId: "4-oz",
  });

  const duplicateReport = buildFirebaseParityReport(duplicateInputs);
  assert.equal(duplicateReport.blockers.some((blocker) => (
    blocker.code === "product-variants-invalid" && blocker.message.includes("also used by")
  )), true);

  const zeroStockInputs = baseInputs();
  zeroStockInputs.actual.products[0].variants[0].stockOnHand = 0;
  const zeroStockReport = buildFirebaseParityReport(zeroStockInputs);
  assert.equal(zeroStockReport.blockers.some((blocker) => (
    blocker.code === "product-variants-invalid"
      && blocker.message.includes("advertised as available but has zero tracked stock")
  )), true);

  const hiddenDuplicateInputs = baseInputs();
  hiddenDuplicateInputs.actual.products.push({
    id: "zz-hidden-product",
    isActive: false,
    published: false,
    title: "Hidden Product",
    variants: [{
      id: "default",
      sku: "cg-saffron-salt-2-oz",
    }],
  });
  const hiddenDuplicateReport = buildFirebaseParityReport(hiddenDuplicateInputs);
  assert.equal(hiddenDuplicateReport.blockers.some((blocker) => (
    blocker.code === "product-variants-invalid"
      && blocker.target === "zz-hidden-product"
      && blocker.message.includes("also used by")
  )), true);
});

test("reports reject non-Storage references and redact URL query secrets", () => {
  const inputs = baseInputs();
  const secret = "SECRET_SENTINEL_VALUE";
  inputs.actual.products[0].photos = [{
    path: `https://firebasestorage.googleapis.com/v0/b/test-bucket/o/product-images%2Fsaffron-salt.jpg?signature=${secret}`,
    sortOrder: 0,
  }];

  const report = buildFirebaseParityReport(inputs);
  const serialized = JSON.stringify(report);

  assert.equal(report.blockers.some((blocker) => blocker.code === "media-reference-not-storage-path"), true);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes("?[redacted]"), true);
});

test("event media comparison rejects reordered and extra photos", () => {
  const reorderedInputs = baseInputs();
  const secondMedia = {
    ...structuredClone(reorderedInputs.expected.mediaAssets[1]),
    expectedMd5Hash: "md5-event-home-grown-photo-02",
    mediaAssetId: "event-home-grown-photo-02",
    sourcePath: "src/resources/images/home-grown-02.jpg",
    storagePath: "event-images/home-grown-02.jpg",
  };
  reorderedInputs.expected.mediaAssets.push(secondMedia);
  reorderedInputs.actual.mediaAssets.push({
    ...secondMedia,
    id: secondMedia.mediaAssetId,
    status: "active",
  });
  reorderedInputs.storageStatusByPath[secondMedia.storagePath] = {
    contentType: secondMedia.contentType,
    downloadUrlAvailable: true,
    exists: true,
    md5Hash: secondMedia.expectedMd5Hash,
    size: secondMedia.expectedSize,
  };
  reorderedInputs.actual.events[0].photos = [
    { path: secondMedia.storagePath, sortOrder: 0 },
    { path: "event-images/home-grown.jpg", sortOrder: 1 },
  ];

  const reorderedReport = buildFirebaseParityReport(reorderedInputs);
  assert.equal(reorderedReport.blockers.some((blocker) => blocker.code === "event-photos-different"), true);

  const extraInputs = baseInputs();
  extraInputs.actual.events[0].photos.push({ path: "event-images/unexpected.jpg", sortOrder: 1 });
  const extraReport = buildFirebaseParityReport(extraInputs);
  assert.equal(extraReport.blockers.some((blocker) => blocker.code === "event-photos-different"), true);
});

test("Storage identity requires the reviewed size and MD5 checksum", () => {
  const inputs = baseInputs();
  inputs.storageStatusByPath["product-images/saffron-salt.jpg"].md5Hash = "different-file";
  inputs.storageStatusByPath["product-images/saffron-salt.jpg"].size = 101;

  const report = buildFirebaseParityReport(inputs);
  const storageBlocker = report.blockers.find((blocker) => blocker.code === "storage-metadata-invalid");

  assert.ok(storageBlocker);
  assert.match(storageBlocker.message, /size 101 should be 100/);
  assert.match(storageBlocker.message, /MD5 checksum differs/);

  const unavailableInputs = baseInputs();
  delete unavailableInputs.expected.mediaAssets[0].expectedMd5Hash;
  delete unavailableInputs.expected.mediaAssets[0].expectedSize;
  const unavailableReport = buildFirebaseParityReport(unavailableInputs);
  assert.equal(unavailableReport.blockers.some((blocker) => (
    blocker.code === "storage-identity-unavailable"
  )), true);
});

test("fallback comparison rejects wrong photo identity, wrong bucket, and wrong key", () => {
  const wrongPathInputs = baseInputs();
  wrongPathInputs.cache.products[0].photos = [
    "https://firebasestorage.googleapis.com/v0/b/test-bucket/o/product-images%2Fwrong.jpg?alt=media&token=hidden",
  ];
  wrongPathInputs.cache.products[0].key = "wrong-key";
  const wrongPathReport = buildFirebaseParityReport(wrongPathInputs);
  assert.equal(wrongPathReport.blockers.some((blocker) => blocker.code === "fallback-stale"), true);

  const wrongBucketInputs = baseInputs();
  wrongBucketInputs.cache.products[0].photos = [
    "https://firebasestorage.googleapis.com/v0/b/wrong-bucket/o/product-images%2Fsaffron-salt.jpg?token=hidden",
  ];
  const wrongBucketReport = buildFirebaseParityReport(wrongBucketInputs);
  assert.equal(wrongBucketReport.blockers.some((blocker) => (
    blocker.code === "fallback-photo-reference-invalid"
      && blocker.message.includes("wrong Firebase Storage bucket")
  )), true);

  const invalidTimestampInputs = baseInputs();
  invalidTimestampInputs.cache.generatedAt = "not-a-date";
  const invalidTimestampReport = buildFirebaseParityReport(invalidTimestampInputs);
  assert.equal(invalidTimestampReport.blockers.some((blocker) => (
    blocker.code === "fallback-generated-at-invalid"
  )), true);
});

test("equal sort orders use title ordering and fallback order must match", () => {
  const inputs = baseInputs();
  const secondProduct = structuredClone(inputs.actual.products[0]);
  secondProduct.id = "apple-salt";
  secondProduct.title = "Apple Salt";
  secondProduct.photos = [];
  secondProduct.variants[0].sku = "CG-APPLE-SALT-2-OZ";
  const secondExpected = { id: secondProduct.id, data: structuredClone(secondProduct) };
  const secondCache = {
    ...structuredClone(inputs.cache.products[0]),
    id: secondProduct.id,
    key: createKey(secondProduct.title),
    photos: [],
    priceOptions: [{
      ...secondProduct.priceOptions[0],
      sku: secondProduct.variants[0].sku,
      variantId: secondProduct.variants[0].id,
    }],
    title: secondProduct.title,
  };

  inputs.actual.products.push(secondProduct);
  inputs.expected.products.unshift(secondExpected);
  inputs.cache.products.push(secondCache);
  inputs.cache.productCount = 2;

  const report = buildFirebaseParityReport(inputs);

  assert.equal(report.details.products.order.matches, true);
  assert.equal(report.details.fallback.orderMatches, false);
  assert.equal(report.blockers.some((blocker) => blocker.code === "fallback-order-different"), true);
});

test("fallback comparison rejects reordered multi-photo products", () => {
  const inputs = baseInputs();
  const secondMedia = {
    ...structuredClone(inputs.expected.mediaAssets[0]),
    expectedMd5Hash: "md5-product-saffron-salt-02",
    mediaAssetId: "product-saffron-salt-02",
    sourcePath: "src/resources/images/product_photos/saffron-salt-02.jpg",
    storagePath: "product-images/saffron-salt-02.jpg",
  };
  inputs.expected.mediaAssets.push(secondMedia);
  inputs.actual.mediaAssets.push({
    ...secondMedia,
    id: secondMedia.mediaAssetId,
    status: "active",
  });
  inputs.storageStatusByPath[secondMedia.storagePath] = {
    contentType: secondMedia.contentType,
    downloadUrlAvailable: true,
    exists: true,
    md5Hash: secondMedia.expectedMd5Hash,
    size: secondMedia.expectedSize,
  };
  inputs.actual.products[0].photos.push({ path: secondMedia.storagePath, sortOrder: 1 });
  inputs.cache.products[0].photos = [
    "https://firebasestorage.googleapis.com/v0/b/test-bucket/o/product-images%2Fsaffron-salt-02.jpg?token=hidden",
    "https://firebasestorage.googleapis.com/v0/b/test-bucket/o/product-images%2Fsaffron-salt.jpg?token=hidden",
  ];

  const report = buildFirebaseParityReport(inputs);

  assert.equal(report.details.products.photoDifferences.length, 0);
  assert.equal(report.blockers.some((blocker) => blocker.code === "fallback-stale"), true);
});

test("unverified release behavior fails closed", () => {
  const inputs = baseInputs();
  inputs.deployment = {
    cacheRefreshConfigured: false,
    contentFallbackConfigured: false,
    eventFallbackConfigured: false,
    eventLinkStorageResolutionConfigured: false,
    publicReadRulesConfigured: false,
    siteMediaRuntimeConfigured: false,
  };

  const report = buildFirebaseParityReport(inputs);
  const codes = new Set(report.blockers.map((blocker) => blocker.code));

  assert.equal(codes.has("fallback-refresh-not-configured"), true);
  assert.equal(codes.has("event-fallback-not-configured"), true);
  assert.equal(codes.has("content-fallback-not-configured"), true);
  assert.equal(codes.has("event-link-resolution-not-configured"), true);
  assert.equal(codes.has("public-read-rules-not-configured"), true);
  assert.equal(codes.has("site-media-runtime-not-configured"), true);
});

test("checked-in Markdown is reproducible from the checked-in JSON report", () => {
  const report = JSON.parse(fs.readFileSync(
    path.join(__dirname, "../docs/firebase-parity-audit.json"),
    "utf8",
  ));
  const markdown = fs.readFileSync(
    path.join(__dirname, "../docs/firebase-parity-audit.md"),
    "utf8",
  );

  assert.equal(markdown, buildFirebaseParityMarkdown(report));
});
