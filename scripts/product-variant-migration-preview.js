const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { deleteApp, initializeApp } = require("firebase/app");
const {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} = require("firebase/auth");
const {
  collection,
  getDocs,
  getFirestore,
} = require("firebase/firestore");

const {
  buildProductVariantMigrationMarkdown,
  buildProductVariantMigrationPreview,
} = require("./lib/product-variant-migration-model");
const { canonicalize } = require("./lib/firebase-parity-model");
const { loadStaticParityExpectations } = require("./lib/load-static-parity-expectations");

const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env.local");
const jsonOutputPath = path.join(repoRoot, "docs/product-variant-migration-preview.json");
const markdownOutputPath = path.join(repoRoot, "docs/product-variant-migration-preview.md");
const reviewedCatalogContract = {
  productCount: 72,
  variantCount: 101,
};
const args = process.argv.slice(2);

const argumentValue = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? "" : String(args[index + 1] || "");
};

const expectedProjectId = argumentValue("--project");
const shouldCheck = args.includes("--check");
const shouldWriteReports = !args.includes("--no-write");

const readEnvFile = () => {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return values;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return values;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      values[key] = rawValue.replace(/^['"]|['"]$/g, "");
      return values;
    }, {});
};

const env = {
  ...readEnvFile(),
  ...process.env,
};

const requiredKeys = [
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  "REACT_APP_FIREBASE_APP_ID",
];

const assertConfiguration = () => {
  const missing = requiredKeys.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment values: ${missing.join(", ")}`);
  }

  if (!expectedProjectId) {
    throw new Error("Pass the expected Firebase project with --project.");
  }

  if (env.REACT_APP_FIREBASE_PROJECT_ID !== expectedProjectId) {
    throw new Error(`Refusing to inspect ${env.REACT_APP_FIREBASE_PROJECT_ID}; expected ${expectedProjectId}.`);
  }

  if (env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Production migration preview refuses Firestore emulator environment variables.");
  }

  if (!(env.PUBLIC_CACHE_ADMIN_EMAIL || env.MIGRATION_ADMIN_EMAIL)) {
    throw new Error("Missing PUBLIC_CACHE_ADMIN_EMAIL or MIGRATION_ADMIN_EMAIL.");
  }

  if (!(env.PUBLIC_CACHE_ADMIN_PASSWORD || env.MIGRATION_ADMIN_PASSWORD)) {
    throw new Error("Missing PUBLIC_CACHE_ADMIN_PASSWORD or MIGRATION_ADMIN_PASSWORD.");
  }
};

const firebaseConfig = () => ({
  apiKey: env.REACT_APP_FIREBASE_API_KEY,
  appId: env.REACT_APP_FIREBASE_APP_ID,
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  measurementId: env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET,
});

const readCollection = async (db, collectionName) => {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((documentSnapshot) => ({
    ...documentSnapshot.data(),
    id: documentSnapshot.id,
  }));
};

const fingerprint = (state) => crypto.createHash("sha256")
  .update(JSON.stringify(canonicalize(Object.fromEntries(Object.entries(state).map(([key, value]) => [
    key,
    Array.isArray(value)
      ? [...value].sort((first, second) => first.id.localeCompare(second.id))
      : value,
  ])))))
  .digest("hex");

const readState = async (db) => {
  const products = await readCollection(db, "products");
  let productSkus = [];
  let skuRegistryRead = { ok: true };

  try {
    productSkus = await readCollection(db, "productSkus");
  } catch (error) {
    skuRegistryRead = {
      code: error.code || "firestore/read-failed",
      ok: false,
    };
  }

  return { products, productSkus, skuRegistryRead };
};

const writeReports = (report) => {
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, buildProductVariantMigrationMarkdown(report));
  console.log(`Wrote ${path.relative(repoRoot, markdownOutputPath)}`);
  console.log(`Wrote ${path.relative(repoRoot, jsonOutputPath)}`);
};

const run = async () => {
  assertConfiguration();

  const expectedProducts = loadStaticParityExpectations().products;
  const expectedVariantCount = expectedProducts.reduce((total, product) => (
    total + (Array.isArray(product?.data?.variants) ? product.data.variants.length : 0)
  ), 0);

  if (
    expectedProducts.length !== reviewedCatalogContract.productCount
    || expectedVariantCount !== reviewedCatalogContract.variantCount
  ) {
    throw new Error(
      `Reviewed catalog contract changed. Expected ${reviewedCatalogContract.productCount} products/${reviewedCatalogContract.variantCount} variants, found ${expectedProducts.length}/${expectedVariantCount}.`,
    );
  }

  const app = initializeApp(firebaseConfig(), `product-variant-preview-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(
      auth,
      env.PUBLIC_CACHE_ADMIN_EMAIL || env.MIGRATION_ADMIN_EMAIL,
      env.PUBLIC_CACHE_ADMIN_PASSWORD || env.MIGRATION_ADMIN_PASSWORD,
    );

    const firstRead = await readState(db);
    const firstFingerprint = fingerprint(firstRead);
    const confirmedState = await readState(db);
    const confirmedFingerprint = fingerprint(confirmedState);

    if (firstFingerprint !== confirmedFingerprint) {
      throw new Error("Firestore products changed during the preview. No report was written; rerun against a stable snapshot.");
    }

    const preview = buildProductVariantMigrationPreview({
      actualProducts: confirmedState.products,
      actualSkuRegistry: confirmedState.productSkus,
      expectedProducts,
      skuRegistryRead: confirmedState.skuRegistryRead,
    });
    const report = {
      ...preview,
      generatedAt: new Date().toISOString(),
      projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
      snapshotFingerprint: confirmedFingerprint,
    };

    if (shouldWriteReports) {
      writeReports(report);
    }

    console.log(`Product variant migration preview: ${report.ready ? "READY FOR INVENTORY ENTRY" : "BLOCKED"}`);
    console.log(`Products: ${report.summary.productCount}`);
    console.log(`Variants/SKUs: ${report.summary.variantCount}`);
    console.log(`Blockers: ${report.summary.blockerCount}`);
    console.log(`Warnings: ${report.summary.warningCount}`);

    if (shouldCheck && !report.ready) {
      process.exitCode = 2;
    }
  } finally {
    try {
      await signOut(auth);
    } finally {
      await deleteApp(app);
    }
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.code) {
    console.error(`Code: ${error.code}`);
  }
  process.exit(1);
});
