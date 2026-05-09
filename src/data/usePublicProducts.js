import { useEffect, useMemo, useState } from "react";

import publicProductsCache from "../generated/public-products-cache.json";
import { getProductByKey, products as staticProducts } from "./siteData";

const publicProductsSource = process.env.REACT_APP_PUBLIC_PRODUCTS_SOURCE === "firestore"
  ? "firestore"
  : "static";

const getStaticState = () => ({
  error: "",
  isLoading: false,
  products: staticProducts,
  source: "static",
});

const getGeneratedCacheProducts = () => (
  Array.isArray(publicProductsCache.products)
    ? publicProductsCache.products
    : []
);

const getFallbackState = () => {
  const cachedProducts = getGeneratedCacheProducts();

  if (cachedProducts.length) {
    return {
      error: "Firestore products could not be loaded. Generated product cache is being used.",
      isLoading: false,
      products: cachedProducts,
      source: "generated-cache",
    };
  }

  return {
    ...getStaticState(),
    error: "Firestore products could not be loaded. Static products are being used.",
  };
};

export const usePublicProducts = () => {
  const [state, setState] = useState(getStaticState);

  useEffect(() => {
    let isCurrentLoad = true;

    if (publicProductsSource !== "firestore") {
      setState(getStaticState());
      return () => {
        isCurrentLoad = false;
      };
    }

    setState((currentState) => ({
      ...currentState,
      error: "",
      isLoading: true,
      source: "firestore",
    }));

    Promise.all([
      import("../firebase-config"),
      import("./publicProductAdapter"),
    ])
      .then(([firebaseConfig, publicProductAdapter]) => {
        if (!firebaseConfig.db) {
          return staticProducts;
        }

        return publicProductAdapter.loadFirestoreProductsForPublic({
          db: firebaseConfig.db,
          storage: firebaseConfig.storage,
          staticProductFallbacks: staticProducts,
        });
      })
      .then((firestoreProducts) => {
        if (!isCurrentLoad) {
          return;
        }

        setState({
          error: "",
          isLoading: false,
          products: firestoreProducts,
          source: "firestore",
        });
      })
      .catch(() => {
        if (!isCurrentLoad) {
          return;
        }

        setState(getFallbackState());
      });

    return () => {
      isCurrentLoad = false;
    };
  }, []);

  return state;
};

export const useHighlightedProducts = () => {
  const publicProducts = usePublicProducts();
  const highlightedProducts = useMemo(() => (
    publicProducts.products.filter((product) => product.isHighlighted && product.isActive === true)
  ), [publicProducts.products]);

  return {
    ...publicProducts,
    products: highlightedProducts,
  };
};

export const usePublicProductByKey = (productKey) => {
  const publicProducts = usePublicProducts();
  const product = useMemo(() => (
    publicProducts.products.find((currentProduct) => currentProduct.key === productKey)
  ), [productKey, publicProducts.products]);

  return {
    ...publicProducts,
    product: product || getProductByKey(productKey),
  };
};
