const routeUrlFor = (route, origin) => {
  try {
    const routeUrl = new URL(route, `${origin}/`);
    return routeUrl.origin === origin ? routeUrl : null;
  } catch {
    return null;
  }
};

export const isSupportedAppPath = (path) => {
  const normalizedPath = String(path || "").replace(/\/+$/, "") || "/";

  return ["/", "/shop", "/events", "/contact", "/cart", "/admin"].includes(normalizedPath)
    || /^\/products\/[^/]+$/.test(normalizedPath)
    || /^\/admin\/preview\/(home|shop|events|contact|cart)$/.test(normalizedPath)
    || /^\/admin\/preview\/products\/[^/]+$/.test(normalizedPath);
};

export const legacyHashRouteForLocation = (location) => {
  const hash = String(location?.hash || "");
  const origin = String(location?.origin || "");

  if (!origin || !hash.startsWith("#/") || hash.startsWith("#//")) {
    return "";
  }

  const routeUrl = routeUrlFor(hash.slice(1), origin);
  if (!routeUrl || !isSupportedAppPath(routeUrl.pathname)) {
    return "";
  }

  const legacyQuery = new URLSearchParams(routeUrl.search);
  const originalQuery = new URLSearchParams(String(location?.search || ""));

  originalQuery.forEach((value, key) => {
    if (!legacyQuery.has(key)) {
      legacyQuery.append(key, value);
    }
  });

  const search = legacyQuery.toString();
  return `${routeUrl.pathname}${search ? `?${search}` : ""}${routeUrl.hash}`;
};

export const migrateLegacyHashRoute = (browserWindow) => {
  const route = legacyHashRouteForLocation(browserWindow?.location);

  if (!route || !browserWindow?.history?.replaceState) {
    return false;
  }

  browserWindow.history.replaceState(browserWindow.history.state || null, "", route);
  return true;
};

export const sameOriginRouteForHref = (href, origin) => {
  let linkUrl;

  try {
    linkUrl = new URL(href, `${origin}/`);
  } catch {
    return null;
  }

  if (linkUrl.origin !== origin) {
    return null;
  }

  const legacyRoute = legacyHashRouteForLocation(linkUrl);
  const routeUrl = legacyRoute ? routeUrlFor(legacyRoute, origin) : linkUrl;

  return routeUrl
    ? {
        hash: routeUrl.hash,
        pathname: routeUrl.pathname,
        search: routeUrl.search,
      }
    : null;
};

export const previewRouteForPublicPath = (publicPath) => {
  const normalizedPath = String(publicPath || "").replace(/\/+$/, "") || "/";

  if (normalizedPath === "/") {
    return "/admin/preview/home";
  }

  if (["/shop", "/events", "/contact", "/cart"].includes(normalizedPath)) {
    return `/admin/preview/${normalizedPath.slice(1)}`;
  }

  if (/^\/products\/[^/]+$/.test(normalizedPath)) {
    return normalizedPath.replace("/products/", "/admin/preview/products/");
  }

  if (normalizedPath.startsWith("/admin/preview/")) {
    return normalizedPath;
  }

  return "";
};

export const buildBrowserRouteUrl = ({ origin, path, query = {} }) => {
  const routeUrl = routeUrlFor(path, origin);

  if (!routeUrl) {
    return "";
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      routeUrl.searchParams.set(key, String(value));
    }
  });

  return routeUrl.toString();
};

export const buildHashRouteUrl = ({ origin, path, query = {} }) => {
  const browserUrl = buildBrowserRouteUrl({ origin, path, query });

  if (!browserUrl) {
    return "";
  }

  const routeUrl = new URL(browserUrl);
  return `${routeUrl.origin}/#${routeUrl.pathname}${routeUrl.search}`;
};
