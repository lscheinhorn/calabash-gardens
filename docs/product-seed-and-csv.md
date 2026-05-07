# Product Seed And CSV Workflow

This document tracks the safe path from static product data to Firestore, and later to CSV import/export.

## Current Seed Tool

The admin product editor includes a guarded seed panel for copying current static products into Firestore.

The seed tool:

- reads `src/resources/products.js` without modifying it
- validates products before writing
- uses an explicit approved category list
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
- a category is not in the approved product category list
- shipping is not a string decimal like `17.00`
- a product has no price options
- a price is not a string decimal like `15.00`

Missing categories require an explicit mapping decision before seed. Do not infer categories from comments in the static resource file.

The inactive `Test basket` product is excluded from product seed and must not create an `All` category.

## Gift Set Category Mapping

Some static gift-set products omit runtime `category` values. Luke approved preserving those products under a real `Gifts` category because Jette may want them later, while keeping them inactive/unpublished unless she turns them back on.

The seed tool maps missing-category gift-set products to `Gifts`.
Only the four preserved legacy gift-set product IDs can use `Gifts`; it is not a general category for newly created products.

The storefront category dropdown should only show categories that have active/public products. A preserved empty or inactive `Gifts` category should not appear to customers.

Approved product categories:

- `Body Care`
- `Culinary`
- `Gifts`
- `Loose Leaf Tea`
- `Mambo Gede`
- `Ritual Smoking Blends`
- `Saffron`
- `Tinctures`

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
