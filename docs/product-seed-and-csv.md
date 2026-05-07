# Product Seed And CSV Workflow

This document tracks the safe path from static product data to Firestore, and later to CSV import/export.

## Current Seed Tool

The admin product editor includes a guarded seed panel for copying current static products into Firestore.

The seed tool:

- reads `src/resources/products.js` without modifying it
- validates products before writing
- creates missing `productCategories` first
- creates only missing `products`
- skips existing Firestore product documents instead of overwriting them
- stores `photos: []` because bundled `require(...)` image values are not valid Firestore image references
- keeps public storefront reads on static data

Seeded products use the same Firestore product contract as the admin product editor.

## Required Validation

The seed must block writes when:

- a product title cannot produce a stable product ID
- a product ID is duplicated
- a category is missing or cannot produce a stable category ID
- shipping is not a string decimal like `17.00`
- a product has no price options
- a price is not a string decimal like `15.00`

Missing categories require an explicit mapping decision before seed. Do not infer categories from comments in the static resource file.

## Current Known Seed Blocker

Some static gift-set products omit runtime `category` values. They appear to have commented category hints, but comments are not data and should not be used automatically.

Before the full static product list can be seeded, Luke should approve one of these choices:

- map those products to a new `Gifts` category
- map those products to another existing category
- leave them out of seed until Jette updates them manually in admin

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
