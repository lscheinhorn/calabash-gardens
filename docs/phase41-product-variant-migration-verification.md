# Phase 41 Product Variant Migration Verification

Date: 2026-08-28

Branch: `codex/product-variant-migration-preview`

## Scope

Phase 41 prepares the current Firestore products for Jetta's real inventory entry without changing protected static business content or writing production Firestore data.

The identity contract is:

- New product ID: suggested from the title and editable only before first save.
- Variant ID: suggested from the option label; a blank single option uses `default`.
- Variant SKU: `CG-{PRODUCT-ID}-{VARIANT-ID}` in uppercase.
- Persisted variant IDs and SKUs: read-only and preserved exactly, including valid custom values.
- Product SKU: no separate field. Every sellable product has a variant, and a single-option variant SKU is the product's effective SKU.

`src/data/productVariantIdentity.js` is the shared implementation used by seed preparation, ProductAdmin, and InventoryAdmin. Generated identities keep following unsaved title and option-label edits. They lock when the product/variant is persisted.

## Jetta Handoff

The current legacy rows intentionally do not pretend that zero is the real inventory. They display the proposed option identity as Untracked until Jetta enters the quantity.

For each product option, Jetta enters the actual Stock value. Each stock edit automatically enables Track and Sell. `0` is allowed and means the option is tracked but currently out of stock. An incomplete product cannot initialize from a threshold/status-only edit or until every option has an explicitly confirmed quantity. One Save Changes transaction then:

- rereads every affected product;
- rejects stale or malformed data;
- persists exactly one variant for each existing price option;
- claims each SKU in `productSkus` and rejects conflicts;
- writes only variants, derived `inStock`, and `updatedAt` on the product;
- records a movement only when the quantity actually changes;
- leaves title, descriptions, category, photos, prices, shipping, and visibility unchanged.

## Read-Only Production Preview

`npm run plan:product-variant-migration` double-read the exact `calabash-54fb5` product state and generated:

- 74 Firestore product documents read;
- 72 reviewed real products;
- 101 proposed variants and SKUs;
- 98 generated variant IDs and 3 preserved custom IDs;
- 101 generated SKUs and 0 replaced custom SKUs;
- 101 quantities explicitly left for Jetta;
- known non-public `Title` and `test-basket` records excluded;
- 2 warnings for legacy `A Touch of Sunshine` rows whose array positions provide their missing indexes;
- 1 blocker because currently deployed rules return `permission-denied` for `productSkus`.

The preview is therefore intentionally **BLOCKED**, not failed or partially applied. No product, variant, SKU registry claim, inventory quantity, rule, or deployment was changed. After an explicitly approved matching rules/client release, rerun the preview; Jetta's quantity entry begins only when SKU ownership is verifiable and the report has zero blockers.

## Verification

- Product identity and Inventory model: 24 tests passed.
- Product migration model/report: 14 tests passed.
- Regular React/Jest suite: 48 passed, 23 emulator-gated tests skipped as designed.
- Inventory Auth/Firestore emulator: 9 scenarios passed.
- Draft-publish Auth/Firestore emulator: 14 scenarios passed, including newer-inventory preservation and concurrent SKU rejection.
- Firebase parity model: 16 tests passed.
- Functions syntax check: passed.
- Production build: passed with the same existing four unused-code warnings.
- Manual New Product check: `Luke's QA Product` suggested product ID `lukes-qa-product`; option label `Large Jar` generated variant ID `large-jar` and SKU `CG-LUKES-QA-PRODUCT-LARGE-JAR`. The product ID remained adjustable before first save, while variant ID/SKU were read-only; the unsaved form was then cleared.
- Manual local admin check: both `A Touch of Sunshine` options and `Cilantro Salt` displayed `Not tracked` with Track off even where legacy stored flags existed; generated identity fields were read-only; entering stock turned on Track/Sell only in the local draft; Discard Changes restored the untouched Firestore state.
- Final no-write production check: returned the expected single `productSkus` rules-permission blocker with 72 products, 101 variants/SKUs, and 2 warnings; both checked-in report hashes remained unchanged.
- Independent read-only review: caught and verified fixes for setup-required rows appearing tracked and for an explicit Track-off choice being ignored when a legacy stored flag was true; the final targeted rereview returned PASS and reconfirmed the stored-value concurrency guard.
- Protected static content/resource diff: passed; no protected file changed.

## Release Gate

This phase may be committed on its feature branch. It must not be merged, pushed, deployed, or used for production inventory entry until Luke explicitly approves those actions. It does not enable Firestore as the public storefront source or enable server PayPal checkout.
