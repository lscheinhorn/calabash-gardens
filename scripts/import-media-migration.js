const fs = require("fs");
const path = require("path");

const { initializeApp } = require("firebase/app");
const {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} = require("firebase/auth");
const {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} = require("firebase/firestore");
const {
  getMetadata,
  getStorage,
  ref,
  uploadBytes,
} = require("firebase/storage");

const { repoRoot } = require("./product-image-migration-manifest");

const dryRunPath = path.join(repoRoot, "docs/media-migration-dry-run.json");
const envPath = path.join(repoRoot, ".env.local");
const maxUploadSize = 25 * 1024 * 1024;

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--confirm");

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
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      return {
        ...values,
        [key]: value,
      };
    }, {});
};

const env = {
  ...readEnvFile(),
  ...process.env,
};

const requiredFirebaseKeys = [
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  "REACT_APP_FIREBASE_APP_ID",
];

const requireEnv = (keys) => {
  const missingKeys = keys.filter((key) => !env[key]);

  if (missingKeys.length) {
    throw new Error(`Missing required environment values: ${missingKeys.join(", ")}`);
  }
};

const firebaseConfig = () => ({
  apiKey: env.REACT_APP_FIREBASE_API_KEY,
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.REACT_APP_FIREBASE_APP_ID,
  measurementId: env.REACT_APP_FIREBASE_MEASUREMENT_ID,
});

const readDryRun = () => {
  if (!fs.existsSync(dryRunPath)) {
    throw new Error("Run npm run plan:media-migration before importing media.");
  }

  return JSON.parse(fs.readFileSync(dryRunPath, "utf8"));
};

const fileSizeFor = (sourcePath) => {
  const absolutePath = path.join(repoRoot, sourcePath);

  return fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : 0;
};

const validateDryRun = (dryRun) => {
  const missingFiles = dryRun.storageUploads.filter((upload) => (
    !fs.existsSync(path.join(repoRoot, upload.uploadSourcePath))
  ));
  const oversizedFiles = dryRun.storageUploads.filter((upload) => (
    fileSizeFor(upload.uploadSourcePath) >= maxUploadSize
  ));

  if (dryRun.uploadBlockers.length) {
    throw new Error("Dry-run report still has upload blockers. Resolve them before import.");
  }

  if (missingFiles.length) {
    throw new Error(`Missing upload source files: ${missingFiles.map((upload) => upload.uploadSourcePath).join(", ")}`);
  }

  if (oversizedFiles.length) {
    throw new Error(`Upload source files exceed 25 MB: ${oversizedFiles.map((upload) => upload.uploadSourcePath).join(", ")}`);
  }
};

const storageObjectExists = async (storage, storagePath) => {
  try {
    await getMetadata(ref(storage, storagePath));
    return true;
  } catch (error) {
    if (error.code === "storage/object-not-found") {
      return false;
    }

    throw error;
  }
};

const uploadStorageObjects = async (storage, uploads) => {
  const results = [];

  for (const upload of uploads) {
    const alreadyExists = await storageObjectExists(storage, upload.storagePath);

    if (alreadyExists) {
      results.push({
        mediaAssetId: upload.mediaAssetId,
        action: "skipped-existing",
        storagePath: upload.storagePath,
      });
      continue;
    }

    const absolutePath = path.join(repoRoot, upload.uploadSourcePath);
    const bytes = fs.readFileSync(absolutePath);

    await uploadBytes(ref(storage, upload.storagePath), bytes, {
      contentType: upload.contentType,
      customMetadata: {
        mediaAssetId: upload.mediaAssetId,
        originalSize: String(upload.originalSize),
        sourcePath: upload.sourcePath,
        uploadSourcePath: upload.uploadSourcePath,
        usesOptimizedUpload: String(upload.usesOptimizedUpload),
      },
    });

    results.push({
      mediaAssetId: upload.mediaAssetId,
      action: "uploaded",
      storagePath: upload.storagePath,
    });
  }

  return results;
};

const writeMediaAssetDocuments = async (db, mediaAssetDocuments) => {
  const results = [];

  for (const mediaAsset of mediaAssetDocuments) {
    const mediaAssetRef = doc(db, "mediaAssets", mediaAsset.id);
    const mediaAssetSnapshot = await getDoc(mediaAssetRef);

    if (mediaAssetSnapshot.exists()) {
      results.push({
        action: "skipped-existing",
        mediaAssetId: mediaAsset.id,
      });
      continue;
    }

    await setDoc(mediaAssetRef, {
      ...mediaAsset.data,
      migratedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    results.push({
      action: "created",
      mediaAssetId: mediaAsset.id,
    });
  }

  return results;
};

const appendProductPhotoReferences = async (db, productPhotoUpdates) => {
  const results = [];

  for (const update of productPhotoUpdates) {
    const productRef = doc(db, "products", update.productId);
    const productSnapshot = await getDoc(productRef);

    if (!productSnapshot.exists()) {
      results.push({
        action: "skipped-missing-product",
        productId: update.productId,
      });
      continue;
    }

    const product = productSnapshot.data();
    const existingPhotos = Array.isArray(product.photos) ? product.photos : [];
    const existingKeys = new Set(existingPhotos.map((photo) => (
      photo && typeof photo === "object"
        ? photo.mediaAssetId || photo.path
        : String(photo)
    )));
    const newPhotos = update.photos.filter((photo) => (
      !existingKeys.has(photo.mediaAssetId) && !existingKeys.has(photo.path)
    ));

    if (!newPhotos.length) {
      results.push({
        action: "skipped-existing-photos",
        productId: update.productId,
      });
      continue;
    }

    await setDoc(productRef, {
      photos: [
        ...existingPhotos,
        ...newPhotos.map((photo, index) => ({
          ...photo,
          sortOrder: existingPhotos.length + index,
        })),
      ],
      updatedAt: serverTimestamp(),
    }, { merge: true });

    results.push({
      action: "attached-photos",
      count: newPhotos.length,
      productId: update.productId,
    });
  }

  return results;
};

const printPlan = (dryRun) => {
  console.log("Media migration import plan");
  console.log(`Mode: ${shouldWrite ? "CONFIRMED WRITE" : "dry run only"}`);
  console.log(`Storage uploads: ${dryRun.storageUploads.length}`);
  console.log(`Optimized upload copies: ${dryRun.storageUploads.filter((upload) => upload.usesOptimizedUpload).length}`);
  console.log(`mediaAssets documents: ${dryRun.mediaAssetDocuments.length}`);
  console.log(`Product photo update targets: ${dryRun.productPhotoUpdates.length}`);
  console.log(`Upload blockers: ${dryRun.uploadBlockers.length}`);

  if (!shouldWrite) {
    console.log("");
    console.log("No Firebase writes were run. Use npm run import:media-migration -- --confirm after review.");
  }
};

const run = async () => {
  const dryRun = readDryRun();
  validateDryRun(dryRun);
  printPlan(dryRun);

  if (!shouldWrite) {
    return;
  }

  requireEnv([
    ...requiredFirebaseKeys,
    "MIGRATION_ADMIN_EMAIL",
    "MIGRATION_ADMIN_PASSWORD",
  ]);

  const app = initializeApp(firebaseConfig());
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  try {
    await signInWithEmailAndPassword(auth, env.MIGRATION_ADMIN_EMAIL, env.MIGRATION_ADMIN_PASSWORD);

    const uploadResults = await uploadStorageObjects(storage, dryRun.storageUploads);
    const mediaAssetResults = await writeMediaAssetDocuments(db, dryRun.mediaAssetDocuments);
    const productResults = await appendProductPhotoReferences(db, dryRun.productPhotoUpdates);

    console.log("");
    console.log("Media migration import complete.");
    console.log(`Uploaded files: ${uploadResults.filter((result) => result.action === "uploaded").length}`);
    console.log(`Skipped existing files: ${uploadResults.filter((result) => result.action === "skipped-existing").length}`);
    console.log(`mediaAssets documents created: ${mediaAssetResults.filter((result) => result.action === "created").length}`);
    console.log(`mediaAssets documents skipped: ${mediaAssetResults.filter((result) => result.action === "skipped-existing").length}`);
    console.log(`Product targets updated: ${productResults.filter((result) => result.action === "attached-photos").length}`);
    console.log(`Product targets skipped: ${productResults.filter((result) => result.action !== "attached-photos").length}`);
  } finally {
    await signOut(auth);
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
