const fs = require("fs");
const path = require("path");

const { initializeApp } = require("firebase/app");
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
  getStorage,
  ref,
} = require("firebase/storage");

const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env.local");
const outputPath = path.join(repoRoot, "src/generated/public-products-cache.json");

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
  appId: env.REACT_APP_FIREBASE_APP_ID,
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  measurementId: env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET,
});

const cacheAdminEmail = () => env.PUBLIC_CACHE_ADMIN_EMAIL || env.MIGRATION_ADMIN_EMAIL;
const cacheAdminPassword = () => env.PUBLIC_CACHE_ADMIN_PASSWORD || env.MIGRATION_ADMIN_PASSWORD;

const createKey = (input) => {
  const chars = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890.,";
  const numbers = Array.prototype.map.call(String(input || ""), (char) => {
    const number = chars.indexOf(char);
    return number > -1 ? number : chars.length;
  });

  return numbers.join("");
};

const seedIdForTitle = (title) => String(title || "")
  .trim()
  .toLowerCase()
  .replace(/['‘’]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const normalizePriceOptions = (priceOptions) => {
  if (!Array.isArray(priceOptions) || priceOptions.length === 0) {
    return [{ option: "", price: "" }];
  }

  return priceOptions.map((priceOption) => ({
    option: String(priceOption?.option || ""),
    price: String(priceOption?.price || ""),
  }));
};

const normalizePhotoRefs = (photos) => {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos
    .map((photo, index) => {
      if (typeof photo === "string") {
        return {
          path: photo,
          sortOrder: index,
        };
      }

      if (!photo || typeof photo !== "object" || !photo.path) {
        return null;
      }

      return {
        path: photo.path,
        sortOrder: Number.isInteger(photo.sortOrder) ? photo.sortOrder : index,
      };
    })
    .filter(Boolean)
    .sort((firstPhoto, secondPhoto) => firstPhoto.sortOrder - secondPhoto.sortOrder);
};

const buildCategoryNameMap = async (db) => {
  const categoriesSnapshot = await getDocs(collection(db, "productCategories"));

  return Object.fromEntries(categoriesSnapshot.docs.map((categoryDoc) => [
    categoryDoc.id,
    String(categoryDoc.data().name || categoryDoc.id),
  ]));
};

const readProducts = async (db) => {
  const productsQuery = query(collection(db, "products"), orderBy("title"));
  const productsSnapshot = await getDocs(productsQuery);

  return productsSnapshot.docs.map((productDoc) => ({
    id: productDoc.id,
    ...productDoc.data(),
  }));
};

const buildStorageUrlMap = async (storage, products) => {
  const storagePaths = Array.from(new Set(products
    .flatMap((product) => normalizePhotoRefs(product.photos))
    .map((photo) => photo.path)
    .filter(Boolean)));
  const entries = await Promise.all(storagePaths.map(async (storagePath) => {
    try {
      return [storagePath, await getDownloadURL(ref(storage, storagePath))];
    } catch (error) {
      return [storagePath, ""];
    }
  }));

  return Object.fromEntries(entries);
};

const normalizeProduct = (product, { categoryNameById, storageUrlByPath }) => {
  const title = String(product.title || "");
  const photoRefs = normalizePhotoRefs(product.photos);

  return {
    category: categoryNameById[product.category] || product.category || "",
    id: product.id || product.slug || seedIdForTitle(title),
    info: String(product.info || ""),
    info1: String(product.info1 || ""),
    info2: String(product.info2 || ""),
    inStock: product.inStock !== false,
    isActive: product.published === true && product.isActive === true,
    isHighlighted: product.isHighlighted === true,
    key: createKey(title),
    photos: photoRefs
      .map((photo) => storageUrlByPath[photo.path] || "")
      .filter(Boolean),
    priceOptions: normalizePriceOptions(product.priceOptions),
    shipping: String(product.shipping || "0.00"),
    sortOrder: Number.isFinite(product.sortOrder) ? product.sortOrder : 999,
    title,
  };
};

const writeCache = (payload) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const run = async () => {
  requireEnv([
    ...requiredFirebaseKeys,
  ]);

  if (!cacheAdminEmail() || !cacheAdminPassword()) {
    throw new Error("Missing PUBLIC_CACHE_ADMIN_EMAIL/PUBLIC_CACHE_ADMIN_PASSWORD or MIGRATION_ADMIN_EMAIL/MIGRATION_ADMIN_PASSWORD.");
  }

  const app = initializeApp(firebaseConfig());
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  try {
    await signInWithEmailAndPassword(auth, cacheAdminEmail(), cacheAdminPassword());

    const [categoryNameById, firestoreProducts] = await Promise.all([
      buildCategoryNameMap(db),
      readProducts(db),
    ]);
    const storageUrlByPath = await buildStorageUrlMap(storage, firestoreProducts);
    const products = firestoreProducts
      .map((product) => normalizeProduct(product, { categoryNameById, storageUrlByPath }))
      .sort((firstProduct, secondProduct) => firstProduct.sortOrder - secondProduct.sortOrder || firstProduct.title.localeCompare(secondProduct.title));

    writeCache({
      generatedAt: new Date().toISOString(),
      productCount: products.length,
      products,
      source: `firestore:${env.REACT_APP_FIREBASE_PROJECT_ID}`,
    });

    console.log(`Generated ${products.length} public products at ${path.relative(repoRoot, outputPath)}.`);
  } finally {
    await signOut(auth);
  }
};

run().catch((error) => {
  console.error(error.message);
  if (error.code) {
    console.error(`Code: ${error.code}`);
  }
  process.exit(1);
});
