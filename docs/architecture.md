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

Checkout uses `@paypal/react-paypal-js` in `src/Components/Paypal/Paypal.js`. Cart totals are calculated in the browser.

## Contact

The contact form uses EmailJS from `src/Components/Contact/Contact.js`.

## Backend Foundation

`src/firebase-config.js` provides an env-driven Firebase config foundation, and `/admin` provides a Firebase sign-in shell with an allowlist check. Public site data still comes from static resources. Admin draft editors exist for products, events, and site content, but draft Firestore rules must be deployed before real draft writes can be tested against live Firebase.

The admin route is lazy-loaded from `src/App.js` so Firebase/admin code stays out of the main storefront bundle.
