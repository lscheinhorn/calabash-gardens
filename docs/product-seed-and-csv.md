# Product Seed And CSV Workflow

This document tracks the safe path from static product data to Firestore, and later to CSV import/export.

## Current Seed Tool

The admin product editor includes a guarded seed panel for copying current static products into Firestore.

The seed tool:

- reads `src/resources/products.js` without modifying it
- validates products before writing
- uses an explicit approved category list
- creates missing approved `productCategories` first
- creates only missing `products`
- skips existing Firestore product documents instead of overwriting them
- stores `photos: []` because bundled `require(...)` image values are not valid Firestore image references
- keeps public storefront reads on static data

Seeded products use the same Firestore product contract as the admin product editor.

Project-directory product image migration is intentionally separate from seed. A future image migration should start with a dry-run manifest that maps static product IDs to exact source image files and planned Firebase Storage paths before anything is uploaded.

## Product Image Migration Dry Run

Use this command to regenerate the current dry-run manifest:

```sh
npm run manifest:product-images
```

Use this command to generate the controlled upload/import dry-run report:

```sh
npm run plan:media-migration
```

If the report shows upload blockers over the 10 MB website-performance threshold, run:

```sh
npm run prepare:media-migration-assets
npm run plan:media-migration
npm run review:media-optimization
```

The preparation command writes optimized upload copies to ignored `.media-migration-assets/` paths. It does not edit files under `src/resources/images/`.
The review command writes `docs/media-optimization-review.html` so the original and optimized upload copies can be checked side by side before any real upload.

Admin product photo uploads follow the same policy: 10 MB is the performance threshold, large images default to website optimization, and original uploads are an intentional override bounded by the draft Storage hard cap.

The command reads `src/resources/products.js`, parses product `photos` references, and writes `docs/product-image-migration-manifest.md`.

The manifest is review-only:

- it does not upload files
- it does not write Firestore data
- it does not edit static product or image resources
- it skips the shared default logo placeholder
- it proposes deterministic flat Storage paths under `product-images/`
- it lists unreferenced files in `src/resources/images/product_photos/`
- it proposes `mediaAssets` metadata for product images and `other` bin candidates

Do not build an upload phase until Luke approves the manifest decisions listed at the bottom of that file.
The dry-run report must show zero upload blockers before a real upload/import should run.
The dry-run command also writes `docs/media-migration-dry-run.json` with exact planned Firestore payloads and Storage upload records.

After visual review and approval, run the guarded importer without confirmation first:

```sh
npm run import:media-migration
```

That prints the current import plan and performs no Firebase writes.

For a real upload/import, `.env.local` must include the Firebase config values plus:

```sh
MIGRATION_ADMIN_EMAIL=approved-admin@example.com
MIGRATION_ADMIN_PASSWORD=admin-password
```

Then run:

```sh
npm run import:media-migration -- --confirm
```

The importer uses the normal Firebase client SDK and signs in as an approved admin, so Firestore and Storage rules still apply. It uploads missing Storage objects, creates missing `mediaAssets` documents, and appends missing product photo references without replacing existing product photos.
It skips Storage objects, `mediaAssets` documents, and product photo refs that already exist.

If the confirmed importer fails on the first Storage upload with `404 Not Found`, check Firebase Console for the project Storage setup. Firebase Storage must be enabled and available for the configured bucket before media upload migration can run.
If it fails with `storage/unauthorized` after Storage rules deploy, check the cross-service rules IAM permission. The Firebase Storage service agent needs the `Firebase Rules Firestore Service Agent` role so Storage rules can read `adminUsers/{uid}` in Firestore.

After import, the admin product cards and Photos library should display Storage-backed previews for attached/imported media. Public product pages still use static images until a separate backend-read phase is approved.
Product cards can also attach an existing active photo from the `other` media bin. Attaching moves that media asset into the `products` bin, links it to the selected product, preserves existing tags, and appends a product photo reference without uploading another file.

## Required Validation

The seed must block writes when:

- a product title cannot produce a stable product ID
- a product ID is duplicated
- a category is missing or cannot produce a stable category ID
- a category is not in the approved product category list
- shipping is not a string decimal like `17.00`
- a product has no price options
- a price is not a string decimal like `15.00`

Missing categories require an explicit mapping decision before seed. Do not infer categories from comments in the static resource file.

The inactive `Test basket` product is excluded from product seed and must not create an `All` category.

## Gift Set Category Mapping

Some static gift-set products omit runtime `category` values. Luke approved preserving those products under a real `Gifts` category because Jette may want them later, while keeping them inactive/unpublished unless she turns them back on.

The seed tool maps missing-category gift-set products to `Gifts`.
Only the four preserved legacy gift-set product IDs can use `Gifts`; it is not a general category for newly created products. `Gifts` exists as an inactive category by default.
New products can use active categories only. Existing products may keep an inactive category when edited.

The storefront category dropdown should only show categories that have active/public products. A preserved empty or inactive `Gifts` category should not appear to customers.

Approved product categories:

- `Body Care`
- `Culinary`
- `Gifts` inactive by default
- `Loose Leaf Tea`
- `Mambo Gede`
- `Ritual Smoking Blends`
- `Saffron`
- `Tinctures`

`All` exists in the old static file only as a test/filter sentinel and is not an approved product category.

## Future CSV Workflow

CSV import/export should reuse the same validation contract before writing anything to Firestore.

CSV should be treated as an exchange format, not the source of truth. Firestore remains the source of truth once public reads are switched.

Recommended future CSV controls:

- export current Firestore products to CSV with fixed column headers
- validate every uploaded CSV row before writing
- show a dry-run report with create/update/skip/error counts
- require stable product IDs for updates
- restrict categories to existing category IDs
- require decimal strings for money fields
- parse price options through a documented format
- block unknown columns unless explicitly approved
- never delete products from CSV import without a separate confirmation flow

This avoids relying on spreadsheet cell validation for data integrity. The admin app validates the uploaded file regardless of what Excel or another editor allowed.
