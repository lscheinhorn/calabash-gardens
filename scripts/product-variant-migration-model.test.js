const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildProductVariantMigrationMarkdown,
  buildProductVariantMigrationPreview,
} = require("./lib/product-variant-migration-model");

const expectedProduct = (overrides = {}) => ({
  id: "maple-syrup",
  data: {
    id: "maple-syrup",
    priceOptions: [
      { option: "4 oz", price: "15.00" },
      { option: "8 oz", price: "27.00" },
    ],
    title: "Maple Syrup",
    variants: [
      { id: "4-oz", sku: "CG-MAPLE-SYRUP-4-OZ" },
      { id: "8-oz", sku: "CG-MAPLE-SYRUP-8-OZ" },
    ],
    ...overrides,
  },
});

const actualProduct = (overrides = {}) => ({
  id: "maple-syrup",
  isActive: true,
  priceOptions: [
    { option: "4 oz", price: "15.00" },
    { option: "8 oz", price: "27.00" },
  ],
  title: "Maple Syrup",
  variants: [],
  ...overrides,
});

test("missing variants receive deterministic identities without invented quantities", () => {
  const report = buildProductVariantMigrationPreview({
    actualProducts: [actualProduct()],
    expectedProducts: [expectedProduct()],
  });

  assert.equal(report.ready, true);
  assert.equal(report.summary.initializeProductCount, 1);
  assert.equal(report.summary.generatedSkuCount, 2);
  assert.deepEqual(report.products[0].variants.map((variant) => ({
    needsJettaQuantity: variant.needsJettaQuantity,
    sku: variant.sku,
    stock: variant.currentStockOnHand,
    variantId: variant.variantId,
  })), [
    {
      needsJettaQuantity: true,
      sku: "CG-MAPLE-SYRUP-4-OZ",
      stock: null,
      variantId: "4-oz",
    },
    {
      needsJettaQuantity: true,
      sku: "CG-MAPLE-SYRUP-8-OZ",
      stock: null,
      variantId: "8-oz",
    },
  ]);
});

test("valid custom identities are preserved while missing identities are generated", () => {
  const report = buildProductVariantMigrationPreview({
    actualProducts: [actualProduct({
      variants: [{
        id: "small-bottle",
        price: "15.00",
        priceOptionIndex: 0,
        sku: "JETTA-MAPLE-SMALL",
        stockOnHand: 4,
      }],
    })],
    expectedProducts: [expectedProduct()],
  });

  assert.equal(report.ready, true);
  assert.equal(report.summary.preservedSkuCount, 1);
  assert.equal(report.summary.generatedSkuCount, 1);
  assert.equal(report.products[0].variants[0].variantId, "small-bottle");
  assert.equal(report.products[0].variants[0].sku, "JETTA-MAPLE-SMALL");
  assert.equal(report.products[0].variants[0].currentStockOnHand, 4);
});

test("SKU registry claims are classified as missing, correct, conflicting, or orphaned", () => {
  const correctClaim = {
    id: "sku-CG-MAPLE-SYRUP-4-OZ",
    productId: "maple-syrup",
    sku: "CG-MAPLE-SYRUP-4-OZ",
    variantId: "4-oz",
  };
  const report = buildProductVariantMigrationPreview({
    actualProducts: [actualProduct()],
    actualSkuRegistry: [
      correctClaim,
      {
        id: "sku-CG-MAPLE-SYRUP-8-OZ",
        productId: "another-product",
        sku: "CG-MAPLE-SYRUP-8-OZ",
        variantId: "8-oz",
      },
      {
        id: "sku-ORPHANED",
        productId: "old-product",
        sku: "ORPHANED",
        variantId: "default",
      },
    ],
    expectedProducts: [expectedProduct()],
  });

  assert.equal(report.ready, false);
  assert.equal(report.summary.registryCorrectCount, 1);
  assert.equal(report.summary.registryConflictCount, 1);
  assert.equal(report.summary.registryOrphanCount, 1);
  assert(report.blockers.some((entry) => entry.type === "conflicting-sku-claim"));
  assert(report.warnings.some((entry) => entry.type === "orphaned-sku-claim"));
});

test("an unreadable SKU registry blocks the preview instead of assuming it is empty", () => {
  const report = buildProductVariantMigrationPreview({
    actualProducts: [actualProduct()],
    expectedProducts: [expectedProduct()],
    skuRegistryRead: { code: "permission-denied", ok: false },
  });

  assert.equal(report.ready, false);
  assert.equal(report.summary.registryUnverifiedCount, 2);
  assert(report.blockers.some((entry) => entry.type === "sku-registry-unreadable"));
  assert(report.products[0].variants.every((variant) => variant.registryStatus === "unverified"));
});

test("duplicate proposed SKUs across products block readiness", () => {
  const secondExpected = expectedProduct({
    title: "Second Product",
    variants: [
      { id: "4-oz", sku: "CG-MAPLE-SYRUP-4-OZ" },
      { id: "8-oz", sku: "CG-SECOND-PRODUCT-8-OZ" },
    ],
  });
  secondExpected.id = "second-product";
  secondExpected.data.id = "second-product";
  const secondActual = actualProduct({ title: "Second Product" });
  secondActual.id = "second-product";

  const report = buildProductVariantMigrationPreview({
    actualProducts: [actualProduct(), secondActual],
    expectedProducts: [expectedProduct(), secondExpected],
  });

  assert.equal(report.ready, false);
  assert(report.blockers.some((entry) => entry.type === "duplicate-global-sku"));
});

test("duplicate generated variant IDs within a product block readiness", () => {
  const report = buildProductVariantMigrationPreview({
    actualProducts: [actualProduct()],
    expectedProducts: [expectedProduct({
      variants: [
        { id: "same", sku: "CG-MAPLE-SYRUP-SAME" },
        { id: "same", sku: "CG-MAPLE-SYRUP-SAME-2" },
      ],
    })],
  });

  assert.equal(report.ready, false);
  assert(report.blockers.some((entry) => entry.type === "duplicate-proposed-variant-id"));
});

test("compatibility-equivalent Unicode SKUs collide under registry normalization", () => {
  const report = buildProductVariantMigrationPreview({
    actualProducts: [actualProduct({
      variants: [
        {
          id: "small",
          priceOptionIndex: 0,
          sku: "ＣＧ-SAME",
        },
        {
          id: "large",
          priceOptionIndex: 1,
          sku: "CG-SAME",
        },
      ],
    })],
    expectedProducts: [expectedProduct()],
  });

  assert.equal(report.ready, false);
  assert(report.blockers.some((entry) => entry.type === "duplicate-proposed-sku"));
});

test("price-option differences and missing Firestore products block readiness", () => {
  const changed = buildProductVariantMigrationPreview({
    actualProducts: [actualProduct({
      priceOptions: [{ option: "4 oz", price: "16.00" }],
    })],
    expectedProducts: [expectedProduct()],
  });
  const missing = buildProductVariantMigrationPreview({
    actualProducts: [],
    expectedProducts: [expectedProduct()],
  });

  assert(changed.blockers.some((entry) => entry.type === "price-options-differ"));
  assert(missing.blockers.some((entry) => entry.type === "missing-firestore-product"));
});

test("known inactive test products are excluded without becoming blockers", () => {
  const report = buildProductVariantMigrationPreview({
    actualProducts: [
      actualProduct(),
      { id: "test-basket", isActive: false, title: "Test basket" },
      { id: "Title", isActive: false, title: "Title" },
    ],
    expectedProducts: [expectedProduct()],
  });

  assert.equal(report.ready, true);
  assert.equal(report.summary.excludedProductCount, 2);
  assert.equal(report.summary.warningCount, 0);
});

test("a known test record must be reviewed if it becomes publicly active", () => {
  const report = buildProductVariantMigrationPreview({
    actualProducts: [
      actualProduct(),
      {
        id: "test-basket",
        isActive: true,
        published: true,
        title: "Test basket",
      },
    ],
    expectedProducts: [expectedProduct()],
  });

  assert.equal(report.ready, false);
  assert(report.blockers.some((entry) => (
    entry.type === "extra-firestore-product" && entry.id === "test-basket"
  )));
});

test("preview visibility requires both published and active flags", () => {
  const unpublished = buildProductVariantMigrationPreview({
    actualProducts: [actualProduct({ isActive: true, published: false })],
    expectedProducts: [expectedProduct()],
  });
  const inactive = buildProductVariantMigrationPreview({
    actualProducts: [actualProduct({ isActive: false, published: true })],
    expectedProducts: [expectedProduct()],
  });

  assert.equal(unpublished.products[0].isActive, true);
  assert.equal(unpublished.products[0].published, false);
  assert.equal(unpublished.products[0].visible, false);
  assert.equal(inactive.products[0].isActive, false);
  assert.equal(inactive.products[0].published, true);
  assert.equal(inactive.products[0].visible, false);
});

test("an unknown extra Firestore product blocks the reviewed allowlist", () => {
  const report = buildProductVariantMigrationPreview({
    actualProducts: [
      actualProduct(),
      { id: "unexpected-placeholder", isActive: false, title: "Unexpected" },
    ],
    expectedProducts: [expectedProduct()],
  });

  assert.equal(report.ready, false);
  assert(report.blockers.some((entry) => (
    entry.type === "extra-firestore-product" && entry.id === "unexpected-placeholder"
  )));
});

test("the production reader contains no Firebase mutation API", () => {
  const scriptPath = path.join(__dirname, "product-variant-migration-preview.js");
  const source = fs.readFileSync(scriptPath, "utf8");
  const mutationApis = [
    "addDoc",
    "deleteDoc",
    "runTransaction",
    "setDoc",
    "updateDoc",
    "writeBatch",
  ];

  mutationApis.forEach((apiName) => {
    assert.equal(new RegExp(`\\b${apiName}\\b`).test(source), false, `${apiName} must not be imported or called.`);
  });
});

test("the checked-in Markdown report exactly renders the checked-in JSON report", () => {
  const jsonPath = path.join(__dirname, "..", "docs", "product-variant-migration-preview.json");
  const markdownPath = path.join(__dirname, "..", "docs", "product-variant-migration-preview.md");
  const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const markdown = fs.readFileSync(markdownPath, "utf8");

  assert.equal(buildProductVariantMigrationMarkdown(report), markdown);
});
