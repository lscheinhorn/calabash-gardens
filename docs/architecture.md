# Architecture

## Runtime

The app is a Create React App project using React 18. It is rendered from `src/index.js`, which wraps `App` in the Redux `Provider`.

## Routing

Routes are defined in `src/App.js` using `Routes` and `Route` from `react-router-dom`. The existing GitHub Pages build explicitly selects `HashRouter`. The Firebase Hosting preview build selects `BrowserRouter`, relies on the Hosting SPA rewrite for direct-route refreshes, and converts recognized legacy `#/...` links before React renders. Unknown browser routes redirect to the home route instead of rendering an empty shell.

Admin-preview iframe links use the same routing mode as their containing build. This preserves the current local/GitHub Pages preview while allowing clean same-origin routes on Firebase Hosting.

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

Draft publishing is a Firestore transaction over the saved draft and its live target. Each draft stores a content baseline, operational baseline, and draft revision. Publish rejects stale review or content conflicts, preserves newer live product inventory and event ticket facts, rejects same-field operational conflicts, and updates the live record plus draft status atomically. Content-only product drafts preserve an absent or existing variant shape instead of synthesizing inventory. `src/data/adminDraftPublishModel.js` contains the deterministic merge/conflict model shared by preview and publish behavior.

Product availability has one invariant across admin editing, draft publishing, and checkout: stored `inStock` is derived from variants and is true only when an active variant is either untracked or has positive tracked stock. `InventoryAdmin` uses `src/Components/Admin/inventoryAdminTransactions.js` to reread and update affected product/event records atomically. It can complete a legacy product's missing variant mapping with deterministic IDs/SKUs, but ambiguous or malformed mappings fail closed. Firestore rules require one complete variant per price option, exact variant/displayed-price agreement, and currently support at most three options, matching the current catalog and ProductAdmin limit. Server checkout charges the displayed `priceOptions` value after verifying that agreement.

`productSkus` is the transactional SKU ownership registry for the supported admin portal. Product publish and InventoryAdmin read each normalized SKU claim before writing, reject another owner, and update the claim in the same transaction as the product. This closes simultaneous duplicate-SKU saves while retaining the approved-admin trusted-operator boundary for Console/server-admin access.

Product and option identity generation is centralized in `src/data/productVariantIdentity.js`. A new product ID is suggested from its title, an option ID is suggested from its option label, and its SKU is generated as `CG-{PRODUCT-ID}-{VARIANT-ID}`. Generated identities continue following unsaved title/label edits, then become read-only after persistence. There is no separate product-level SKU: every sellable product has at least one variant, and a single-option product's variant SKU is its effective SKU.

`npm run plan:product-variant-migration` is the production read-only identity gate. It double-reads the exact `products` and `productSkus` state, rejects a changing snapshot, validates the reviewed 72-product/101-variant static contract, preserves valid persisted custom identities, generates only missing identities, detects mapping/collision/registry problems, and never invents stock. The source imports no Firestore mutation API. Its Markdown/JSON reports remain a plan until matching rules and client code are separately approved for release and Jetta intentionally saves real quantities through Inventory.

The admin preview shows current live data plus a conflict warning when a draft no longer has a safe overlay. Firestore rules validate admin identity, document shape, and required draft metadata, but approved admin credentials remain a trusted-operator boundary. Firebase Console and server-admin access bypass client rules, so this transaction model protects the supported portal workflow from accidental races rather than treating an approved admin as an adversary.

## Checkout

Checkout uses `@paypal/react-paypal-js` in `src/Components/Paypal/Paypal.js`. The public default remains the legacy browser PayPal flow.

A disabled server-owned path is guarded by both React and Functions flags. Firebase callable Functions reload Firestore products/events, calculate trusted totals, reserve inventory, create/capture PayPal orders, and write normalized orders plus deterministic inventory movements. Product reservation/decrement and release both recompute derived availability from the resulting variants. An independently disabled HTTP webhook verifies PayPal signatures against the exact received event bytes and can recover an interrupted completed capture through the same trusted snapshot and finalization path. Refund and reversal notifications enter admin review only; they do not automatically change inventory.

The server checkout and webhook have been verified only against the exact demo Firebase emulators and a loopback PayPal mock. They have not been deployed or enabled for public use.

## Contact

The contact form uses EmailJS from `src/Components/Contact/Contact.js`.

The temporary Firebase Hosting preview build disables EmailJS submission, PayPal checkout, and event waitlist writes. Approved admins may authenticate only to inspect a read-only Firestore site preview; editing and publishing controls are excluded from that build.

## Backend Foundation

`src/firebase-config.js` provides an env-driven Firebase config foundation, and `/admin` provides Firebase sign-in with an allowlist check. Admin draft editors exist for products, events, and site content, alongside Inventory, Orders, Photos, preview, and audit tools. Orders permits only transactionally guarded fulfillment status/notes updates from the client; commercial and payment facts remain server-owned. Public site data still defaults to static resources; the admin preview is the Firestore-backed rehearsal path.

The admin route is lazy-loaded from `src/App.js` so Firebase/admin code stays out of the main storefront bundle.
