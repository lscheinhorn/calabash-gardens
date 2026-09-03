import {
  buildBrowserRouteUrl,
  buildHashRouteUrl,
  isSupportedAppPath,
  legacyHashRouteForLocation,
  migrateLegacyHashRoute,
  previewRouteForPublicPath,
  sameOriginRouteForHref,
} from "./browserRouting";

describe("browser routing helpers", () => {
  test("converts a legacy hash route without losing its query", () => {
    expect(legacyHashRouteForLocation({
      hash: "#/admin?edit=content",
      origin: "https://www.calabashgardens.com",
      search: "?campaign=hosting",
    })).toBe("/admin?edit=content&campaign=hosting");
  });

  test("ignores ordinary anchors and protocol-relative hash values", () => {
    expect(legacyHashRouteForLocation({
      hash: "#details",
      origin: "https://www.calabashgardens.com",
    })).toBe("");
    expect(legacyHashRouteForLocation({
      hash: "#//example.com/admin",
      origin: "https://www.calabashgardens.com",
    })).toBe("");
    expect(legacyHashRouteForLocation({
      hash: "#/not-a-real-route",
      origin: "https://www.calabashgardens.com",
    })).toBe("");
  });

  test("recognizes only routes owned by the app", () => {
    expect(isSupportedAppPath("/shop")).toBe(true);
    expect(isSupportedAppPath("/products/saffron-maple-syrup")).toBe(true);
    expect(isSupportedAppPath("/admin/preview/contact")).toBe(true);
    expect(isSupportedAppPath("/static/media/menu.pdf")).toBe(false);
  });

  test("replaces a legacy browser URL before React renders", () => {
    const replaceState = jest.fn();
    const browserWindow = {
      history: { replaceState, state: { existing: true } },
      location: {
        hash: "#/shop",
        origin: "https://www.calabashgardens.com",
      },
    };

    expect(migrateLegacyHashRoute(browserWindow)).toBe(true);
    expect(replaceState).toHaveBeenCalledWith({ existing: true }, "", "/shop");
  });

  test("resolves clean and legacy same-origin links", () => {
    const origin = "https://preview.web.app";

    expect(sameOriginRouteForHref("https://preview.web.app/products/saffron", origin)).toEqual({
      hash: "",
      pathname: "/products/saffron",
      search: "",
    });
    expect(sameOriginRouteForHref("https://preview.web.app/#/events", origin)).toEqual({
      hash: "",
      pathname: "/events",
      search: "",
    });
    expect(sameOriginRouteForHref("https://example.com/shop", origin)).toBeNull();
  });

  test("maps only public app routes into the admin preview", () => {
    expect(previewRouteForPublicPath("/")).toBe("/admin/preview/home");
    expect(previewRouteForPublicPath("/shop/")).toBe("/admin/preview/shop");
    expect(previewRouteForPublicPath("/products/saffron-maple-syrup")).toBe(
      "/admin/preview/products/saffron-maple-syrup",
    );
    expect(previewRouteForPublicPath("/static/media/menu.pdf")).toBe("");
  });

  test("builds a clean preview URL with an explicit query", () => {
    expect(buildBrowserRouteUrl({
      origin: "https://preview.web.app",
      path: "/admin/preview/shop",
      query: { edit: "content", refresh: 2 },
    })).toBe("https://preview.web.app/admin/preview/shop?edit=content&refresh=2");
  });

  test("builds a legacy preview URL for the GitHub Pages router", () => {
    expect(buildHashRouteUrl({
      origin: "https://www.calabashgardens.com",
      path: "/admin/preview/shop",
      query: { edit: "content", refresh: 2 },
    })).toBe("https://www.calabashgardens.com/#/admin/preview/shop?edit=content&refresh=2");
  });
});
