const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
  orderBy,
  query,
} = require("firebase/firestore");
const {
  getDownloadURL,
  getMetadata,
  getStorage,
  ref,
} = require("firebase/storage");

const {
  buildFirebaseParityMarkdown,
  buildFirebaseParityReport,
  canonicalize,
  isAllowedStoragePath,
} = require("./lib/firebase-parity-model");
const { loadStaticParityExpectations } = require("./lib/load-static-parity-expectations");

const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env.local");
const jsonOutputPath = path.join(repoRoot, "docs/firebase-parity-audit.json");
const markdownOutputPath = path.join(repoRoot, "docs/firebase-parity-audit.md");
const cachePath = path.join(repoRoot, "src/generated/public-products-cache.json");
const args = process.argv.slice(2);

const argumentValue = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? "" : String(args[index + 1] || "");
};

const expectedProjectId = argumentValue("--project");
const shouldCheck = args.includes("--check");
const shouldWrite = !args.includes("--no-write");

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
    throw new Error(`Refusing to audit ${env.REACT_APP_FIREBASE_PROJECT_ID}; expected ${expectedProjectId}.`);
  }

  if (env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error("Production parity audit refuses Firebase emulator environment variables.");
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

const readCollection = async (db, collectionName, targetCollection = "") => {
  const snapshot = await getDocs(collection(db, collectionName));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    return {
      ...data,
      _storedId: data.id,
      id: documentSnapshot.id,
      ...(targetCollection ? { targetCollection } : {}),
    };
  });
};

const readFirebaseState = async (db) => {
  const [
    products,
    categories,
    events,
    contentDocs,
    mediaAssets,
    productDrafts,
    eventDrafts,
    siteContentDrafts,
  ] = await Promise.all([
    readCollection(db, "products"),
    readCollection(db, "productCategories"),
    readCollection(db, "events"),
    readCollection(db, "siteContent"),
    readCollection(db, "mediaAssets"),
    readCollection(db, "productDrafts", "products"),
    readCollection(db, "eventDrafts", "events"),
    readCollection(db, "siteContentDrafts", "siteContent"),
  ]);

  return {
    categories,
    contentDocs,
    drafts: [...productDrafts, ...eventDrafts, ...siteContentDrafts],
    events,
    mediaAssets,
    products,
  };
};

const firebaseStateFingerprint = (state) => {
  const sortedState = Object.fromEntries(Object.entries(state).map(([collectionName, documents]) => [
    collectionName,
    [...documents].sort((first, second) => (
      String(first.targetCollection || "").localeCompare(String(second.targetCollection || ""))
        || String(first.id || "").localeCompare(String(second.id || ""))
    )),
  ]));

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(sortedState)))
    .digest("hex");
};

const allStoragePaths = (expected, actual) => Array.from(new Set([
  ...expected.mediaAssets.map((mediaAsset) => mediaAsset.storagePath),
  ...actual.mediaAssets.map((mediaAsset) => mediaAsset.storagePath),
  ...actual.products.flatMap((product) => (
    Array.isArray(product.photos) ? product.photos : []
  )).map((photo) => typeof photo === "string" ? photo : photo?.path),
  ...actual.events.flatMap((event) => (
    Array.isArray(event.photos) ? event.photos : []
  )).map((photo) => typeof photo === "string" ? photo : photo?.path),
  ...actual.events.map((event) => event.link),
].filter(isAllowedStoragePath)));

const storageStatusFor = async (storage, storagePath) => {
  try {
    const storageRef = ref(storage, storagePath);
    const [metadata] = await Promise.all([
      getMetadata(storageRef),
      getDownloadURL(storageRef),
    ]);
    return {
      contentType: metadata.contentType || "",
      downloadUrlAvailable: true,
      exists: true,
      md5Hash: metadata.md5Hash || "",
      size: Number(metadata.size || 0),
    };
  } catch (error) {
    return {
      code: error.code || "storage/read-failed",
      exists: false,
    };
  }
};

const readStorageStatuses = async (storage, storagePaths) => {
  const statuses = {};
  const batchSize = 8;

  for (let index = 0; index < storagePaths.length; index += batchSize) {
    const batch = storagePaths.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(async (storagePath) => [
      storagePath,
      await storageStatusFor(storage, storagePath),
    ]));

    results.forEach(([storagePath, status]) => {
      statuses[storagePath] = status;
    });
  }

  return statuses;
};

const verifyAnonymousPublicReads = async () => {
  const publicApp = initializeApp(firebaseConfig(), `firebase-parity-public-read-${Date.now()}`);
  const publicDb = getFirestore(publicApp);
  const probes = [
    {
      name: "products-order-by-title",
      read: () => getDocs(query(collection(publicDb, "products"), orderBy("title"))),
    },
    {
      name: "product-categories",
      read: () => getDocs(collection(publicDb, "productCategories")),
    },
    {
      name: "events-order-by-date",
      read: () => getDocs(query(collection(publicDb, "events"), orderBy("date"))),
    },
    {
      name: "site-content",
      read: () => getDocs(collection(publicDb, "siteContent")),
    },
  ];

  try {
    const checks = await Promise.all(probes.map(async (probe) => {
      try {
        await probe.read();
        return { allowed: true, name: probe.name };
      } catch (error) {
        return {
          allowed: false,
          code: error.code || "firestore/read-failed",
          name: probe.name,
        };
      }
    }));

    return {
      publicReadChecks: checks,
      publicReadRulesConfigured: checks.every((check) => check.allowed),
    };
  } finally {
    await deleteApp(publicApp);
  }
};

const loadLocalInputs = () => {
  const expected = loadStaticParityExpectations();

  return {
    cache: JSON.parse(fs.readFileSync(cachePath, "utf8")),
    deployment: {
      // These remain false until a behavioral cache/runtime contract is implemented and tested.
      cacheRefreshConfigured: false,
      contentFallbackConfigured: false,
      eventFallbackConfigured: false,
      eventLinkStorageResolutionConfigured: expected.runtimeProbes
        .eventLinkStorageResolutionConfigured === true,
      siteMediaRuntimeConfigured: false,
    },
    expected,
  };
};

const writeReports = (report) => {
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownOutputPath, buildFirebaseParityMarkdown(report));
  console.log(`Wrote ${path.relative(repoRoot, markdownOutputPath)}`);
  console.log(`Wrote ${path.relative(repoRoot, jsonOutputPath)}`);
};

const run = async () => {
  assertConfiguration();

  const { cache, deployment, expected } = loadLocalInputs();
  const app = initializeApp(firebaseConfig(), `firebase-parity-audit-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  try {
    await signInWithEmailAndPassword(
      auth,
      env.PUBLIC_CACHE_ADMIN_EMAIL || env.MIGRATION_ADMIN_EMAIL,
      env.PUBLIC_CACHE_ADMIN_PASSWORD || env.MIGRATION_ADMIN_PASSWORD,
    );

    const [actual, publicReadDeployment] = await Promise.all([
      readFirebaseState(db),
      verifyAnonymousPublicReads(),
    ]);
    const snapshotFingerprint = firebaseStateFingerprint(actual);
    const storageStatusByPath = await readStorageStatuses(
      storage,
      allStoragePaths(expected, actual),
    );
    const confirmedActual = await readFirebaseState(db);
    const confirmedFingerprint = firebaseStateFingerprint(confirmedActual);

    if (snapshotFingerprint !== confirmedFingerprint) {
      throw new Error("Firestore changed during the parity audit. No report was written; rerun against a stable snapshot.");
    }

    const report = buildFirebaseParityReport({
      actual: confirmedActual,
      cache,
      deployment: {
        ...deployment,
        ...publicReadDeployment,
      },
      expected,
      projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
      snapshotFingerprint,
      storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      storageStatusByPath,
    });

    if (shouldWrite) {
      writeReports(report);
    }

    console.log(`Firebase parity: ${report.ready ? "READY" : "NOT READY"}`);
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
