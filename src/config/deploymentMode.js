export const isFirebaseHostingPreview =
  process.env.REACT_APP_DEPLOYMENT_PREVIEW === "true";

export const isBrowserRoutingEnabled =
  process.env.REACT_APP_ROUTER_MODE === "browser";
