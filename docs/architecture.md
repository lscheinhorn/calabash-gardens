# Architecture

## Runtime

The app is a Create React App project using React 18. It is rendered from `src/index.js`, which wraps `App` in the Redux `Provider`.

## Routing

Routes are defined in `src/App.js` using `HashRouter`, `Routes`, and `Route` from `react-router-dom`.

## State

Cart state is managed by Redux Toolkit in `src/Components/Cart/cartSlice.js` and configured in `src/Store.js`.

## Data Sources

Most site data is static and imported from JS files:

- `src/resources/content.js`: home page copy
- `src/resources/products.js`: product catalog
- `src/resources/events.js`: event catalog and event page copy
- `src/resources/inventory.js`: event stock values
- `src/resources/public_keys.js`: public client keys

These resource files are protected business content. Backend prep and refactors should not edit their values without explicit approval.

Future backend work should first introduce a read-only content boundary so UI components can keep their current data shape while the storage layer is designed.

The first read-only boundary is `src/data/siteData.js`. It re-exports the current static resource values without changing data shape or behavior.

Public product reads now pass through `src/data/usePublicProducts.js`. Static products remain the default source. Firestore products are loaded only when `REACT_APP_PUBLIC_PRODUCTS_SOURCE=firestore` is set. `src/generated/public-products-cache.json` is a generated fallback artifact that can be refreshed from Firestore with `npm run generate:public-products-cache` before deployment; it is not editable business content. Products with no photos are normalized to the existing default Calabash logo image before rendering.

`npm run audit:firebase-parity` is the strict transition gate. It reads raw Firestore documents and known Storage objects without using the public adapters' static fallbacks, compares them with the protected static seed shape and current media ownership inventory, and writes local Markdown/JSON reports. It validates globally unique product SKUs, checkout-consistent tracked stock, exact ordered product/event media paths, reviewed file size and MD5 identity, legacy draft safety, exact generated-product cache keys/photos/order, and behavioral anonymous reads using the public query shapes. Report values are centrally sanitized so Firebase download tokens and URL query credentials are not retained. The runner contains no Firebase mutation APIs; a focused test enforces that boundary.

A parity result does not enable public Firestore reads. Customer-usable event document URL resolution, generated product/event/content fallbacks, Firebase-backed site/default media, desktop/mobile visual comparison, and an explicit source-switch approval remain separate release gates. Unimplemented runtime/fallback contracts fail closed rather than passing because a marker, filename, or empty artifact exists.

Admin event migration now has a read/seed/audit foundation. `src/data/adminEventSeed.js` converts static event records into Firestore-safe documents, and the admin Event Mirror Audit can create missing Firestore event documents without overwriting existing ones. The admin Event Editor saves event field edits to `eventDrafts` first; Publish Changes is the explicit action that transactionally publishes the reviewed saved draft to live `events`. Public event pages still read static events.

The admin Firestore Site Preview is a rehearsal path for public backend reads. It loads live Firestore products, site content, and events through public adapters, overlays active `productDrafts`, `siteContentDrafts`, and `eventDrafts`, normalizes the result to the current static shapes, and passes that data into the existing public components from inside `/admin`. Public routes continue to use their static defaults.

Draft publishing is a Firestore transaction over the saved draft and its live target. Each draft stores a content baseline, operational baseline, and draft revision. Publish rejects stale review or content conflicts, preserves newer live product inventory and event ticket facts, rejects same-field operational conflicts, and updates the live record plus draft status atomically. `src/data/adminDraftPublishModel.js` contains the deterministic merge/conflict model shared by preview and publish behavior.

The admin preview shows current live data plus a conflict warning when a draft no longer has a safe overlay. Firestore rules validate admin identity, document shape, and required draft metadata, but approved admin credentials remain a trusted-operator boundary. Firebase Console and server-admin access bypass client rules, so this transaction model protects the supported portal workflow from accidental races rather than treating an approved admin as an adversary.

## Checkout

Checkout uses `@paypal/react-paypal-js` in `src/Components/Paypal/Paypal.js`. The public default remains the legacy browser PayPal flow.

A disabled server-owned path is guarded by both React and Functions flags. Firebase callable Functions reload Firestore products/events, calculate trusted totals, reserve inventory, create/capture PayPal orders, and write normalized orders plus deterministic inventory movements. An independently disabled HTTP webhook verifies PayPal signatures against the exact received event bytes and can recover an interrupted completed capture through the same trusted snapshot and finalization path. Refund and reversal notifications enter admin review only; they do not automatically change inventory.

The server checkout and webhook have been verified only against the exact demo Firebase emulators and a loopback PayPal mock. They have not been deployed or enabled for public use.

## Contact

The contact form uses EmailJS from `src/Components/Contact/Contact.js`.

## Backend Foundation

`src/firebase-config.js` provides an env-driven Firebase config foundation, and `/admin` provides Firebase sign-in with an allowlist check. Admin draft editors exist for products, events, and site content, alongside Inventory, Orders, Photos, preview, and audit tools. Orders permits only transactionally guarded fulfillment status/notes updates from the client; commercial and payment facts remain server-owned. Public site data still defaults to static resources; the admin preview is the Firestore-backed rehearsal path.

The admin route is lazy-loaded from `src/App.js` so Firebase/admin code stays out of the main storefront bundle.
