import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";

import { applyAdminDrafts } from "./adminDrafts";
import { createKey, products as staticProducts } from "../resources/products";

export const publicProductsSource = process.env.REACT_APP_PUBLIC_PRODUCTS_SOURCE === "firestore"
  ? "firestore"
  : "static";

const normalizePriceOptions = (priceOptions, variants = []) => {
  if (!Array.isArray(priceOptions) || priceOptions.length === 0) {
    return [{ option: "", price: "" }];
  }

  const variantsByIndex = Array.isArray(variants)
    ? new Map(variants.map((variant) => [variant.priceOptionIndex, variant]))
    : new Map();

  return priceOptions.map((priceOption, index) => {
    const variant = variantsByIndex.get(index) || {};

    return {
      option: String(priceOption?.option || ""),
      price: String(priceOption?.price || ""),
      variantId: String(variant.id || priceOption?.variantId || ""),
      sku: String(variant.sku || priceOption?.sku || ""),
    };
  });
};

const comparablePriceOptions = (priceOptions) => normalizePriceOptions(priceOptions)
  .map((priceOption) => ({
    option: priceOption.option,
    price: priceOption.price,
  }));

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

const resolvePhotoUrls = (photoRefs, storageUrlByPath) => photoRefs
  .map((photo) => storageUrlByPath[photo.path] || "")
  .filter(Boolean);

export const staticProductsBySeedId = (products = staticProducts) => products.reduce((productsById, product) => {
  productsById.set(product.slug || product.id || seedIdForTitle(product.title), product);
  return productsById;
}, new Map());

export const seedIdForTitle = (title) => String(title || "")
  .trim()
  .toLowerCase()
  .replace(/['‘’]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const normalizeFirestoreProductForPublic = (firestoreProduct, options = {}) => {
  const {
    categoryNameById = {},
    fallbackProduct,
    storageUrlByPath = {},
  } = options;
  const title = String(firestoreProduct.title || fallbackProduct?.title || "");
  const photoRefs = normalizePhotoRefs(firestoreProduct.photos);
  const storagePhotos = resolvePhotoUrls(photoRefs, storageUrlByPath);
  const fallbackPhotos = Array.isArray(fallbackProduct?.photos) ? fallbackProduct.photos : [];
  const photos = storagePhotos.length ? storagePhotos : fallbackPhotos;

  return {
    category: categoryNameById[firestoreProduct.category] || fallbackProduct?.category || firestoreProduct.category || "",
    id: firestoreProduct.id || firestoreProduct.slug || seedIdForTitle(title),
    info: String(firestoreProduct.info || fallbackProduct?.info || ""),
    info1: String(firestoreProduct.info1 || fallbackProduct?.info1 || ""),
    info2: String(firestoreProduct.info2 || fallbackProduct?.info2 || ""),
    inStock: firestoreProduct.inStock !== false,
    isActive: firestoreProduct.published === true && firestoreProduct.isActive === true,
    isHighlighted: firestoreProduct.isHighlighted === true,
    key: fallbackProduct?.key || createKey(title),
    photos,
    priceOptions: normalizePriceOptions(firestoreProduct.priceOptions || fallbackProduct?.priceOptions, firestoreProduct.variants),
    shipping: String(firestoreProduct.shipping || fallbackProduct?.shipping || "0.00"),
    sortOrder: Number.isFinite(firestoreProduct.sortOrder) ? firestoreProduct.sortOrder : fallbackProduct?.sortOrder ?? 999,
    title,
  };
};

export const normalizeFirestoreProductsForPublic = (firestoreProducts, options = {}) => {
  const fallbackById = options.fallbackById || staticProductsBySeedId(options.staticProducts || staticProducts);

  return firestoreProducts
    .map((firestoreProduct) => normalizeFirestoreProductForPublic(firestoreProduct, {
      ...options,
      fallbackProduct: fallbackById.get(firestoreProduct.id),
    }))
    .sort((firstProduct, secondProduct) => firstProduct.sortOrder - secondProduct.sortOrder || firstProduct.title.localeCompare(secondProduct.title));
};

const buildCategoryNameMap = async (db) => {
  const categoriesSnapshot = await getDocs(collection(db, "productCategories"));
  return Object.fromEntries(categoriesSnapshot.docs.map((categoryDoc) => [
    categoryDoc.id,
    String(categoryDoc.data().name || categoryDoc.id),
  ]));
};

const buildStorageUrlMap = async (storage, firestoreProducts) => {
  if (!storage) {
    return {};
  }

  const storagePaths = Array.from(new Set(firestoreProducts
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

export const loadFirestoreProductsForPublic = async ({
  db,
  drafts = [],
  staticProductFallbacks = staticProducts,
  storage,
}) => {
  const productsQuery = query(collection(db, "products"), orderBy("title"));
  const productsSnapshot = await getDocs(productsQuery);
  const liveFirestoreProducts = productsSnapshot.docs.map((productDoc) => ({
    id: productDoc.id,
    ...productDoc.data(),
  }));
  const firestoreProducts = drafts.length
    ? applyAdminDrafts(liveFirestoreProducts, drafts, "products")
    : liveFirestoreProducts;
  const [categoryNameById, storageUrlByPath] = await Promise.all([
    buildCategoryNameMap(db),
    buildStorageUrlMap(storage, firestoreProducts),
  ]);

  return normalizeFirestoreProductsForPublic(firestoreProducts, {
    categoryNameById,
    staticProducts: staticProductFallbacks,
    storageUrlByPath,
  });
};

const comparableProduct = (product) => ({
  category: product.category || "",
  info: product.info || "",
  info1: product.info1 || "",
  info2: product.info2 || "",
  inStock: product.inStock !== false,
  isActive: product.isActive === true,
  isHighlighted: product.isHighlighted === true,
  key: product.key || createKey(product.title || ""),
  photoCount: Array.isArray(product.photos) ? product.photos.length : 0,
  priceOptions: comparablePriceOptions(product.priceOptions),
  shipping: String(product.shipping || ""),
  title: product.title || "",
});

export const buildProductPublicParityReport = (firestoreProducts, options = {}) => {
  const normalizedFirestoreProducts = normalizeFirestoreProductsForPublic(firestoreProducts, options);
  const staticComparisonProducts = options.staticProducts || staticProducts;
  const firestoreByKey = new Map(normalizedFirestoreProducts.map((product) => [product.key, product]));
  const staticByKey = new Map(staticComparisonProducts.map((product) => [product.key, product]));
  const missing = [];
  const extra = [];
  const different = [];
  const matching = [];

  staticComparisonProducts.forEach((staticProduct) => {
    const firestoreProduct = firestoreByKey.get(staticProduct.key);

    if (!firestoreProduct) {
      missing.push(staticProduct);
      return;
    }

    const staticComparable = comparableProduct(staticProduct);
    const firestoreComparable = comparableProduct(firestoreProduct);

    if (JSON.stringify(staticComparable) === JSON.stringify(firestoreComparable)) {
      matching.push(staticProduct);
      return;
    }

    different.push({
      firestoreProduct,
      staticProduct,
    });
  });

  normalizedFirestoreProducts.forEach((firestoreProduct) => {
    if (!staticByKey.has(firestoreProduct.key)) {
      extra.push(firestoreProduct);
    }
  });

  return {
    different,
    extra,
    matching,
    missing,
    normalizedFirestoreProducts,
    staticProducts: staticComparisonProducts,
  };
};
