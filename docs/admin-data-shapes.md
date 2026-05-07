# Admin Data Shapes

This document defines the target backend data contract before any product, event, content, inventory, or image editor is built.

It is a planning document only. It does not migrate data, change protected resource files, connect public reads to Firestore, or add admin write UI.

## Source Of Truth During Migration

Until Luke approves a backend-read phase, the public site continues to read static data through `src/data/siteData.js`.

Protected static files remain unchanged:

- `src/resources/products.js`
- `src/resources/events.js`
- `src/resources/content.js`
- `src/resources/inventory.js`
- `src/resources/images/**`
- `src/resources/public_keys.js`

Any seed or migration must preserve current values exactly unless Luke approves a specific content change.

## Shared Field Rules

All admin-managed documents should include:

- `createdAt`: server timestamp, system-managed.
- `updatedAt`: server timestamp, system-managed.
- `published`: boolean, admin-managed.
- `sortOrder`: number, admin-managed where ordering matters.

Use stable document IDs. Do not derive document IDs from editable display titles.

Use storage paths or URLs for future backend images. Do not store JavaScript `require(...)` values in Firestore.

Firestore rules use collection-specific validators for these shapes. Before any editor writes are enabled, review the exact final form fields against `firestore.rules`.

## Products

Collection: `products`

Suggested document ID:

```text
products/{productSlugOrStableId}
```

Required fields:

- `title`: string.
- `category`: string. Must match a document ID in `productCategories`.
- `priceOptions`: array of price option objects.
- `shipping`: string decimal value, matching current cart behavior.
- `published`: boolean.
- `isActive`: boolean.
- `inStock`: boolean.
- `photos`: array of image references.

Optional fields:

- `info`: string.
- `info1`: string.
- `info2`: string.
- `isHighlighted`: boolean.
- `slug`: string.

Price option shape:

```json
{
  "option": "4 oz",
  "price": "15.00"
}
```

Current compatibility notes:

- Some current products omit category in static data. Firestore product docs created through admin must use an approved `productCategories` ID.
- Some current product price options only contain `price` and no `option`.
- Current prices and shipping values are strings, not numbers.
- Current product keys are generated from title with `createKey`; future IDs should be stable even if title changes.
- Seeded Firestore product documents must not include fields outside this contract, because rules validate the full resulting document on update.
- New product IDs are suggested from the first title. The ID is locked after saving; changing it later requires creating a replacement product.
- New product IDs must not match an existing Firestore product document ID.

Editor controls:

- Text inputs for title, description fields, shipping, and option labels.
- Product ID input suggested from title for new products and disabled for saved products.
- Category dropdown populated from admin-managed `productCategories`.
- Decimal text input for prices until checkout math is refactored safely.
- Toggles for published, active, highlighted, and in-stock flags.
- Image uploader writes approved admin uploads to Firebase Storage and stores image references on Firestore product drafts.
- The first product editor writes Firestore product drafts only; it does not update public static product data.

Product image reference shape:

```json
{
  "path": "product-images/vermont-grown-saffron-1710000000000-jar.webp",
  "alt": "Small jar of saffron",
  "sortOrder": 0
}
```

Current image upload notes:

- Product photo uploads require selecting or saving a Firestore product first.
- Product photo paths must stay flat under `product-images/{fileName}` to match the current Storage rules.
- Uploaded product photos are not connected to public storefront rendering yet.

## Product Categories

Collection: `productCategories`

Suggested document ID:

```text
productCategories/{categorySlug}
```

Required fields:

- `name`: string.
- `active`: boolean.

Optional fields:

- `sortOrder`: number or null.

Editor controls:

- Text input for category name.
- Stable document ID generated from the category name when creating.
- Toggle for active/inactive.

Current compatibility notes:

- Current static product categories include values such as `Saffron`.
- Some current products omit category; seeded Firestore products must either use an approved category or wait for a migration decision.
- Product writes require a category ID that exists in this collection.
- The product editor uses this collection for its category dropdown and validation.
- New category IDs are suggested from the category name and locked after saving.
- New category IDs must not match an existing Firestore category document ID.

## Events

Collection: `events`

Suggested document ID:

```text
events/{eventSlugOrStableId}
```

Required fields:

- `title`: string.
- `category`: string.
- `info`: array of paragraph strings.
- `date`: timestamp.
- `eventDates`: array of display strings.
- `priceOptions`: array of string decimal values, matching current event behavior.
- `shipping`: string decimal value.
- `published`: boolean.
- `isActive`: boolean.
- `inStock`: boolean.
- `photos`: array of image references.

Optional fields:

- `link`: menu document/image reference.
- `slug`: string.
- `capacity`: number.
- `eventType`: string, for example `dining` or `music`.
- `dietaryOptions`: object describing vegetarian/gluten-free availability and fees.
- `childTicket`: object describing child-ticket pricing.

Current compatibility notes:

- Current event `date` values are JavaScript `Date` objects.
- Current `eventDates` are display strings and are also used in cart key/title generation.
- Current event `priceOptions` are string arrays such as `["60.00"]`, unlike product option objects.
- Past events should remain stored for history, but should not be purchasable.

Editor controls:

- Date picker for canonical date.
- Repeatable text inputs for event display dates.
- Repeatable textarea inputs for description paragraphs.
- Decimal text inputs for deposits/ticket prices.
- Toggles for published, active, and in-stock flags.
- Menu/image selectors only after file storage workflow is approved.

## Site Content

Collection: `siteContent`

Suggested document IDs:

- `home`
- `banner`
- `offerings`
- `about`
- `team`
- `experienceBlurb`

Required fields:

- `published`: boolean.
- `sections`: object or array matching the page section.

Current compatibility notes:

- `src/resources/content.js` is nested by page and section.
- `experienceBlurb` currently lives in `src/resources/events.js`, not `content.js`.
- The first backend version should preserve the existing nested shape as closely as possible.
- Firestore rules allow `sections` for site content documents.

Editor controls:

- Section-specific text inputs and textareas.
- Repeatable paragraphs for blurbs and bios.
- No rich text editor until content rendering rules are defined.

## Inventory

Collection: `inventory`

Suggested document ID:

```text
inventory/{inventoryKeyOrStableId}
```

Required fields:

- `stock`: number.
- `linkedType`: string, for example `event` or `product`.
- `linkedId`: stable product/event ID.

Optional fields:

- `eventDate`: string or timestamp.
- `dietaryVariant`: string.
- `notes`: string.

Current compatibility notes:

- Current event inventory keys are fragile human-readable title/date strings.
- Current event stock logic has known bugs and should be redesigned before selling limited backend-backed seats.
- Product inventory can remain `inStock` true/false until a deeper inventory phase is approved.

Editor controls:

- Do not build an inventory editor until event capacity and checkout behavior are accepted.
- Initial admin UI may show inventory status read-only.

## Images

Firebase Storage paths:

- `product-images/{fileName}`
- `event-images/{fileName}`
- `site-content-images/{fileName}`
- `admin-private/{uid}/{fileName}`

Image reference shape:

```json
{
  "path": "product-images/example.webp",
  "alt": "Product image description",
  "sortOrder": 0
}
```

Current compatibility notes:

- Current images are bundled with `require(...)`.
- Future image references should be storage paths or public URLs.
- Existing bundled images should remain untouched until a migration/upload phase is approved.

## Orders

Collection: `orders`

Order persistence is not part of the first admin editor.

Rules currently deny client order writes. A future order phase should decide whether PayPal order records are written by a server/cloud function instead of the browser.

## Next Implementation Gate

Before any editor writes are built:

- Review this document against the exact UI forms.
- Update `firestore.rules` required/allowed fields if the final data shape changes.
- Decide whether deletes are allowed or whether admin UI only deactivates records.
- Decide whether public reads use `published`, `isActive`, or both.
- Public Firestore reads remain disabled until Luke approves the backend-read phase.
