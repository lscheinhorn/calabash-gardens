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

Admin event migration now has a read/seed/audit foundation. `src/data/adminEventSeed.js` converts static event records into Firestore-safe documents, and the admin Event Mirror Audit can create missing Firestore event documents without overwriting existing ones. The admin Event Editor saves event field edits to `eventDrafts` first; Publish Changes is the explicit action that copies draft-shaped data to live `events`. Public event pages still read static events.

The admin Firestore Site Preview is a rehearsal path for public backend reads. It loads live Firestore products, site content, and events through public adapters, overlays active `productDrafts`, `siteContentDrafts`, and `eventDrafts`, normalizes the result to the current static shapes, and passes that data into the existing public components from inside `/admin`. Public routes continue to use their static defaults.

## Checkout

Checkout uses `@paypal/react-paypal-js` in `src/Components/Paypal/Paypal.js`. The public default remains the legacy browser PayPal flow.

A disabled server-owned path is guarded by both React and Functions flags. Firebase callable Functions reload Firestore products/events, calculate trusted totals, reserve inventory, create/capture PayPal orders, and write normalized orders plus deterministic inventory movements. An independently disabled HTTP webhook verifies PayPal signatures against the exact received event bytes and can recover an interrupted completed capture through the same trusted snapshot and finalization path. Refund and reversal notifications enter admin review only; they do not automatically change inventory.

The server checkout and webhook have been verified only against the exact demo Firebase emulators and a loopback PayPal mock. They have not been deployed or enabled for public use.

## Contact

The contact form uses EmailJS from `src/Components/Contact/Contact.js`.

## Backend Foundation

`src/firebase-config.js` provides an env-driven Firebase config foundation, and `/admin` provides Firebase sign-in with an allowlist check. Admin draft editors exist for products, events, and site content, alongside Inventory, Orders, Photos, preview, and audit tools. Orders permits only transactionally guarded fulfillment status/notes updates from the client; commercial and payment facts remain server-owned. Public site data still defaults to static resources; the admin preview is the Firestore-backed rehearsal path.

The admin route is lazy-loaded from `src/App.js` so Firebase/admin code stays out of the main storefront bundle.
