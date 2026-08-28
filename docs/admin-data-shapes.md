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

## Draft And Publish Workflow

Admin edits should use draft collections before any public Firestore read switch is approved:

- `productDrafts`
- `eventDrafts`
- `siteContentDrafts`

Draft documents use the same public-facing fields as their live target collection plus draft metadata:

- `draftBaseContentFingerprint`: canonical fingerprint of the live content when the draft began.
- `draftBaseContentRevision`: live `contentRevision` when the draft began.
- `draftBaseOperationalJson`: serialized baseline for product inventory or event capacity/holds/waitlist fields.
- `draftBaseTargetExists`: whether the live target existed when the draft began.
- `draftDeletedFields`: approved optional live fields intentionally removed by the draft.
- `draftRevision`: integer incremented on every saved, published, or discarded draft state change.
- `draftStatus`: `draft`, `published`, or `discarded`.
- `draftTargetCollection`: `products`, `events`, or `siteContent`.
- `draftTargetId`: matching target document ID.
- `draftUpdatedAt`: server timestamp.
- `draftUpdatedBy`: admin user ID string.
- `draftPublishedAt` and `draftPublishedBy`: set when a draft is published.
- `draftPublishedContentRevision`: live content revision produced by a successful publish.
- `draftDiscardedAt` and `draftDiscardedBy`: set when a draft is discarded.

Live product, event, and site-content documents may include `contentRevision`, a nonnegative integer incremented by transactional draft publishing.

Current admin workflow:

- Save Draft writes to the matching draft collection only.
- Firestore Site Preview loads live records with active draft records overlaid.
- Publish Changes rereads the persisted draft and live target in one transaction, validates the reviewed draft revision and saved live-content baseline, writes the live collection, and marks the draft `published` atomically.
- Discard Draft marks the draft `discarded`; it does not delete live data.
- Public routes and generated cache reads still use live collections only.

Operational ownership during publish:

- Product variant `active`, `stockOnHand`, `lowStockThreshold`, and `inventoryTracked` values are preserved from live data when the draft did not edit them.
- Product `inStock` is not draft-owned. It is derived from the merged live variants after every publish.
- Event `capacity`, `manualSeatsReserved`, and `waitlistEnabled` values follow the same three-way merge rule.
- Event `ticketsSold` is server/inventory owned and is always taken from the current live event.
- If both the draft and live record changed the same operational value differently, publishing stops with a conflict and writes neither document.
- A new event begins with `ticketsSold: 0` when it has a capacity.
- A draft cannot publish event capacity below current sold tickets plus manual holds.
- Active legacy drafts without baseline metadata must be discarded and saved again before publishing an existing live record.

Product photo uploads still upload the Storage object immediately, but the product document reference to that photo is draft-only until published. Attaching, reordering, alt editing, and detaching product photos update `productDrafts`, not live `products`.

## Media Assets

Collection: `mediaAssets`

Suggested document ID:

```text
mediaAssets/{stableMediaAssetId}
```

Required fields:

- `title`: string.
- `alt`: string.
- `bin`: string. Must be one of `products`, `events`, `site`, or `other`.
- `tags`: array of strings.
- `storagePath`: string.
- `linkedType`: string. Must be one of `product`, `event`, `site`, or `none`.
- `linkedId`: string. Empty string when `linkedType` is `none`.
- `status`: string. Must be `active` or `archived`.

Optional fields:

- `contentType`: string.
- `size`: number.
- `source`: string, such as `static-product-photo-migration`.
- `sourcePath`: string, for migration traceability only.
- `uploadedBy`: string admin user ID.
- `createdAt`: server timestamp.
- `updatedAt`: server timestamp.

Media asset shape:

```json
{
  "title": "Vermont Grown Saffron",
  "alt": "",
  "bin": "products",
  "tags": ["product", "saffron", "vermont-grown-saffron"],
  "storagePath": "product-images/vermont-grown-saffron-01-0.5g-vermont-grown-saffron-1.webp",
  "linkedType": "product",
  "linkedId": "vermont-grown-saffron",
  "status": "active",
  "source": "static-product-photo-migration",
  "sourcePath": "src/resources/images/product_photos/0.5g_vermont_grown_saffron_1.webp"
}
```

Current media library notes:

- The admin Photos section edits Firestore media metadata only.
- Product photo upload controls exist, but product photo references now save through `productDrafts` until published.
- Broad media migration writes are still gated by review and approval.
- Moving a photo between bins changes Firestore metadata only; it does not move Storage files.
- The `other` bin is a holding area for images that need review before they are linked to products, events, or site content.
- Public storefront pages still do not read `mediaAssets`.
- The Firebase ownership audit maps product, event, site, and other media candidates before any broader upload phase. It is read-only and should be reviewed before changing Storage paths, rules, or public reads.
- Event menu PDFs/DOC/DOCX files are not covered by the current image-only Storage upload rules and need a separate reviewed rule/data-shape decision before upload.

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
- `variants`: array of sellable product option/inventory metadata objects.
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

Variant shape:

```json
{
  "id": "4-oz",
  "label": "4 oz",
  "price": "15.00",
  "sku": "CG-SAFFRON-MAPLE-SYRUP-4-OZ",
  "stockOnHand": 12,
  "lowStockThreshold": 3,
  "inventoryTracked": true,
  "active": true,
  "priceOptionIndex": 0,
  "sortOrder": 0
}
```

Variant notes:

- Product IDs are suggested automatically from the new product title. They may be adjusted before the first save and remain locked afterward.
- Variant IDs identify the exact sellable option inside a product, such as a jar size.
- Before first save, variant IDs follow option labels automatically and SKUs follow the product ID plus variant ID as `CG-{PRODUCT-ID}-{VARIANT-ID}`.
- Persisted variant IDs and SKUs are read-only identities. Existing valid custom IDs/SKUs are preserved exactly.
- There is no separate product-level SKU. A product always sells through at least one variant; for a single-option product, that variant SKU is the product's effective SKU.
- `priceOptions` remains the storefront compatibility shape. `variants` carries the stable ID, SKU, and inventory metadata for the same option index.
- Each variant `price` must exactly match its corresponding `priceOptions` value. The displayed `priceOptions` value is authoritative for server checkout; a mismatch is rejected before PayPal.
- `stockOnHand` and `lowStockThreshold` are whole numbers. Blank stock fields normalize to `0`; blank low-stock thresholds store as `null`.
- `inventoryTracked: false` allows a product option to stay sellable without a stock count.
- `active: false` preserves an option without offering it as an active inventory variant.
- Each product must have exactly one variant for each `priceOptions` entry, identified by the matching zero-based `priceOptionIndex`.
- The locally verified Firestore rules support at most three price options/variants per product. The current catalog does not exceed that boundary, and ProductAdmin disables adding a fourth option.
- Variant IDs and SKUs must be nonblank. SKUs are compared case-insensitively for uniqueness in the supported admin UI.
- `productSkus/{encodedNormalizedSku}` transactionally reserves each persisted SKU for one product ID and variant ID. Product publish and InventoryAdmin claim or release these records in the same transaction as the product write, so concurrent supported-portal saves cannot both claim one SKU.
- `inStock` is a compatibility field derived from variants: it is true only when at least one active variant is either untracked or has positive tracked stock. ProductAdmin does not expose a separate availability checkbox.
- InventoryAdmin can present missing legacy variants using deterministic IDs and SKUs. The first successful inventory save persists the complete mapping without changing product copy, category, photos, prices, shipping, or visibility.
- Legacy rows remain untracked until Jetta enters the real quantity. Editing a stock value automatically enables tracking and sellability for that option; entering `0` intentionally records it as tracked and out of stock. An incomplete product mapping cannot save until every option has an explicitly confirmed quantity.
- A product title, copy, visibility, or photo draft preserves the exact existing `priceOptions`, `variants`, and compatibility availability when inventory controls were not edited. A legacy product with no persisted variants remains without variants until an intentional inventory save.
- The guarded server checkout decrements tracked variant stock, release restores reserved stock, and both paths recompute `inStock`. These paths are emulator-verified but remain disabled and undeployed for public use.

Current compatibility notes:

- Some current products omit category in static data. Firestore product docs created through admin must use an approved `productCategories` ID.
- Some current product price options only contain `price` and no `option`.
- Current prices and shipping values are strings, not numbers.
- Current product keys are generated from title with `createKey`; future IDs should be stable even if title changes.
- Seeded Firestore product documents must not include fields outside this contract, because rules validate the full resulting document on update.
- New product IDs are suggested from the first title. The ID is locked after saving; changing it later requires creating a replacement product.
- New product IDs must not match an existing Firestore product document ID.
- `src/data/publicProductAdapter.js` is the read-only bridge for future public product reads. It normalizes Firestore product documents back into the current public product shape, keeps static as the default source, and provides a parity report helper before any public switch is approved.
- Public product pages still import static data through `src/data/siteData.js`; Firestore product reads are not active on the public site yet.
- The admin Public Product Parity panel uses the adapter to compare Firestore-normalized visible products against currently visible static shop products before any public backend-read switch is approved.
- `src/data/usePublicProducts.js` is the guarded public hook layer. It returns static products by default and loads Firestore products only when `REACT_APP_PUBLIC_PRODUCTS_SOURCE=firestore` is explicitly set.
- `src/generated/public-products-cache.json` is a generated deploy artifact for backend-read fallback, not source-of-truth product content. It is refreshed manually from Firestore with `npm run generate:public-products-cache`.
- If Firestore loading fails while the Firestore source flag is enabled, public product hooks use the generated product cache when it has products. If the generated cache is empty or missing products, they fall back to the current static product data.
- Public product hooks normalize any product without photos to the existing default Calabash logo image before Product and ProductPage render it.
- Public Firestore product normalization carries hidden `variantId` and `sku` fields on price options for future order/inventory capture, while preserving current visible option labels and prices.
- The production read-only parity audit found that 72 current product documents do not yet have a complete persisted `variants` array. InventoryAdmin can synthesize legacy rows for editing, but guarded server checkout requires persisted stable variant IDs, SKUs, and stock. This is a migration blocker, not permission to bulk-write production products.
- The Phase 41 read-only identity preview proposes 101 variant IDs/SKUs across those 72 reviewed products and explicitly leaves all 101 starting quantities for Jetta. It excludes only the known non-public `Title` and `test-basket` records and fails closed if either becomes public or any other extra product appears.
- `npm run audit:firebase-parity` compares raw Firestore fields before adapter fallbacks; validates one stable variant per price option, globally unique SKUs, and available tracked stock; checks exact ordered media attachments and reviewed Storage checksums; and reports content/media/cache differences in `docs/firebase-parity-audit.md` and `.json`.

Editor controls:

- Text inputs for title, description fields, shipping, and option labels.
- Product ID input suggested from title for new products and disabled for saved products.
- Category dropdown populated from admin-managed `productCategories`.
- Decimal text input for prices until checkout math is refactored safely.
- Variant ID, SKU, stock on hand, low-stock threshold, track-inventory, and sell-option controls for each product price option.
- `Visible on site` toggle. The editor keeps stored `published` and `isActive` in sync for compatibility.
- `inStock` remains stored for compatibility but is derived from variant `active`, `inventoryTracked`, and `stockOnHand`; it has no independent editor control.
- Highlighted toggle.
- Filterable Firestore product cards with inline edit mode for existing products.
- Image uploader writes approved admin uploads to Firebase Storage and stores image references on Firestore product drafts.
- The first product editor writes Firestore product drafts only; it does not update public static product data.

Product image reference shape:

```json
{
  "path": "product-images/vermont-grown-saffron-1710000000000-jar.webp",
  "alt": "Small jar of saffron",
  "sortOrder": 0,
  "mediaAssetId": "product-vermont-grown-saffron-01"
}
```

Current image upload notes:

- Product photo uploads are available from each expanded Firestore product card.
- Product photo paths must stay flat under `product-images/{fileName}` to match the current Storage rules.
- Uploaded product photos are not connected to public storefront rendering yet.

Static product seed notes:

- Seeded products must pass the same field contract as manually edited Firestore products.
- Seeded products skip existing Firestore product IDs instead of overwriting them.
- Seeded products use `photos: []`; image migration/upload is a separate workflow.
- Static gift-set products with missing runtime categories seed under `Gifts`.
- `Gifts` is reserved for the preserved legacy gift-set products, not new products.
- Categories have an `active` flag; new products can use only active categories.
- Existing products can keep an inactive category while being edited, but new products cannot choose inactive categories.
- `Gifts` seeds inactive by default.
- The inactive test product is excluded from seed and must not create an `All` category.
- Admin-created categories must come from the approved category list.
- Storefront category filters should show only categories with active products.

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

- `descriptionBlocks`: array of `{ subtitle, body }` sections. Admin event editing writes this structured shape while still writing `info` for current public compatibility.
- `link`: menu document/image reference.
- `slug`: string.
- `capacity`: number.
- `manualSeatsReserved`: number for seats Jette holds outside the website until order tracking is connected.
- `ticketsSold`: computed number from order/ticket records. This is read by the site but not edited by Jette in the Event Editor.
- `waitlistEnabled`: boolean.
- `dietaryOptions`: object describing vegetarian/gluten-free availability and fees.
- `childTicket`: object describing child-ticket pricing.

Current compatibility notes:

- Current event `date` values are JavaScript `Date` objects.
- Current `eventDates` are display strings and are also used in cart key/title generation.
- Current event `priceOptions` are string arrays such as `["60.00"]`, unlike product option objects.
- Events are ordered chronologically by `date`; there is no separate event-level sort order in the editor.
- The earlier admin-only `eventType` field was removed from the editor and Firestore rules because it did not come from the static event model or public behavior.
- Event shipping is retained as an internal `0.00` compatibility value for the shared cart item shape, but it is not exposed in the event editor.
- The editor shows one customer-facing `Visible on site` toggle and keeps stored `published` and `isActive` in sync.
- Event ticket availability is computed from event date and capacity. Future backend order tracking should update `ticketsSold`; the current manual hold field only reserves seats Jette knows are unavailable outside the website.
- The visible availability label should read like `2 of 30 available` when a future event has capacity remaining.
- When a future visible event reaches capacity, public purchase controls should hide and the waitlist should show if `waitlistEnabled` is true.
- Past events should remain stored for history, but should not be purchasable.
- Static event photos and menu links are intentionally not copied by the current event seed. They should move only through an approved media/document migration that preserves stable Storage paths and `mediaAssets` metadata.

Editor controls:

- Date picker for canonical date.
- Repeatable text inputs for event display dates.
- Repeatable description sections with optional subtitles and paragraph fields; structured paragraph bodies render intentional line breaks in preview/public Firestore mode.
- Decimal text inputs for deposits/ticket prices.
- `Visible on site` toggle.
- Capacity, manual holds, and waitlist controls. `ticketsSold` remains computed/read-only and must not become an editor field without an approved order-tracking plan.
- Event photo upload, Photo Library attach, drag-handle reorder, selected-photo alt-text editing, and thumbnail `x` detach tools.
- Menu/document upload remains a separate event-media phase.

## Event Waitlist

Collection: `eventWaitlist`

Suggested document ID:

```text
eventWaitlist/{autoId}
```

Required fields:

- `createdAt`: timestamp.
- `email`: string.
- `eventDate`: string.
- `eventId`: string.
- `eventTitle`: string.
- `name`: string.
- `status`: string, currently `new`.

Optional fields:

- `message`: string.
- `phone`: string.

Current compatibility notes:

- Public users may create waitlist entries only through the Firestore rules shape above.
- Admin users can list waitlist entries from the Event Editor.
- Waitlist entries do not decrement event capacity and do not represent sold tickets.

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
- Flexible admin-added content blocks are stored as `contentBlocks` maps. The `home` document stores them under `sections.header.contentBlocks`; `banner`, `offerings`, `about`, `team`, and `experienceBlurb` store them under `sections.contentBlocks`.
- Each block has `{ type, text, sortOrder }`, where `type` is `title`, `subtitle`, or `paragraph`.

Content block shape:

```json
{
  "block_1710000000000_abcd": {
    "type": "paragraph",
    "text": "Additional editable copy.",
    "sortOrder": 0
  }
}
```
- Firestore rules allow `sections` for site content documents.
- The first content mirror audit is read-only and checks `home`, `banner`, `offerings`, `about`, and `team` against Firestore `siteContent`.
- The content mirror audit now also checks `experienceBlurb`, which is sourced from `src/resources/events.js` during migration.
- The content mirror audit does not write Firestore documents or change public site reads.
- The guarded content seed action creates missing `siteContent` documents only; it checks each document before writing and skips any existing document to avoid overwriting admin edits.
- The first content editor edits seeded Firestore `siteContent` documents only. Public pages continue to read static content until a backend-read phase is approved.
- The first event mirror audit compares static events to Firestore `events` documents and can seed missing event documents without overwriting existing Firestore edits. It intentionally leaves photos and menu links empty until event media migration is approved.
- The first event editor edits Firestore `events` documents only. Public event pages continue to read static event data until backend event reads, media fallback, inventory, and checkout behavior are approved.
- New event IDs are suggested from the event title and locked after saving. Creating a new event will not overwrite an existing Firestore event document with the same ID.
- Event media and inventory are intentionally outside the first event editor; `photos` are preserved from existing Firestore documents and inventory remains static in this phase.
- The admin Firestore Site Preview renders Home, Shop, and Events previews with existing public components fed by Firestore-normalized data. It is admin-only and does not change public routes.

Editor controls:

- Section-specific text inputs and textareas.
- Repeatable paragraphs for blurbs and bios.
- No rich text editor until content rendering rules are defined.

## Inventory

Inventory is owned by the existing product and event documents rather than a separate mutable `inventory` collection:

- `products/{productId}.variants[]` owns product option stock, tracking, low-stock threshold, and sellable status.
- `events/{eventId}` owns capacity, manual holds, waitlist preference, and the server-owned `ticketsSold` count.
- `inventoryMovements/{movementId}` is the append-only audit record for manual adjustments, checkout decrements, releases, and future imports.

InventoryAdmin reads current products/events and offers inline bulk editing. A save runs as one Firestore transaction that rereads every affected document before writing:

- Same-field stock, threshold, tracking, sellable-status, capacity, hold, or waitlist races fail closed.
- An affected bulk save writes every requested row or no requested rows.
- A conflicted row refreshes to current Firestore data while unrelated unsaved rows stay in the form.
- Concurrent product copy changes and event `ticketsSold` updates are preserved.
- Product writes contain only `variants`, derived `inStock`, and `updatedAt`; event writes contain only the approved operational fields and `updatedAt`.
- Product saves also claim each normalized SKU under `productSkus` in the same transaction. An existing claim owned by another product option rejects the entire save.
- Product quantity changes and event manual-hold changes create matching movement records in the same transaction. Threshold, tracking, sellable-status, capacity, and waitlist-only edits do not invent quantity movements.

Inventory editor controls:

- Product: stock on hand, optional low-stock threshold, track inventory, and sell this option.
- Event: capacity, manual holds, and waitlist when full.
- Event sold tickets are displayed but never editable in InventoryAdmin.
- Save Changes, Discard Changes, and Refresh remain available above the scrollable table; the action bar stays visible while editing on narrow screens.

Production note: the Phase 41 UI/model and Phase 40 transaction/rule contract are verified against demo emulators. The migration preview does not write Firestore. The current deployed rules do not yet allow its signed-in client to verify `productSkus`, so Jetta's production quantity-entry handoff remains gated on a separately approved rules/client release and a zero-blocker preview rerun. This does not authorize a public-source switch or checkout enablement.

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
- Current Storage rules allow image uploads under `product-images/`, `event-images/`, `site-content-images/`, `other-images/`, and `admin-private/`. Non-image event documents need a new reviewed path/rule before they can be uploaded.
- Event photo uploads create `mediaAssets` records with `bin: events`, `linkedType: event`, and `linkedId` set to the event ID so uploaded event photos remain visible in the reusable Photo Library.

## Orders

Collection: `orders`

Order persistence is planned as a shared sales ledger for PayPal website sales, Square point-of-sale/imported sales, manual sales, refunds, and inventory adjustments.

Payment/order facts must be written by a server/cloud function or another approved backend after PayPal/Square verification, not directly by the browser. Approved admins may update only the fulfillment fields listed below on an existing order; client order creation and deletion remain denied.

Admin Orders foundation and guarded recovery view:

- The admin dashboard has a top-level `Orders` section.
- It reads existing `orders` documents for approved admins only.
- It filters client-side by source, payment status, fulfillment status, and search text.
- It tolerates missing/partial order fields while the backend shape is still being built.
- It shows an empty state until server-side PayPal capture, Square import, or manual order entry writes records.
- Approved admins can update `fulfillmentStatus` and `fulfillmentNotes`. Each save also writes a server timestamp, the authenticated admin UID, and an incremented `fulfillmentRevision`.
- Fulfillment saves use a transaction and reject stale revisions/status/notes instead of overwriting another admin's work. Refreshing or switching orders preserves unsaved fulfillment drafts in the current page session.
- Firestore rules allow changes only to `fulfillmentStatus`, `fulfillmentNotes`, `fulfillmentRevision`, `fulfillmentUpdatedAt`, and `fulfillmentUpdatedBy`; payment, source, customer, shipping, item, total, create, and delete mutations remain denied.
- The fixed fulfillment vocabulary is `new`, `in_progress`, `fulfilled`, `picked_up`, `shipped`, `cancelled`, and `needs_review`. `cancelled` is a fulfillment label only and does not refund, void, or change inventory.
- The current filtered order list can be exported as quoted CSV. User-controlled cells are neutralized before spreadsheet use to prevent formula execution.
- When guarded server checkout is explicitly enabled, it also reads unsettled `paypalCheckouts` and verified `paypalWebhookEvents` records into Payment Review.
- Authenticated `Check Status` can reconcile an unsettled capture through the server Function. Refund and reversal records are manual-review-only and cannot restock products or release event seats from the browser.
- It does not create, delete, import, refund, void, or edit payment facts. The guarded reconciliation path and webhook remain disabled and undeployed for public use.
- It does not change the default public checkout, cart, PayPal buttons, or static storefront reads.

See `docs/order-ledger-and-reconciliation-plan.md` for the target order, inventory movement, PayPal capture, Square reconciliation, and broader admin Orders UI plan.

## Next Implementation Gate

Before any editor writes are built:

- Review this document against the exact UI forms.
- Update `firestore.rules` required/allowed fields if the final data shape changes.
- Decide whether deletes are allowed or whether admin UI only deactivates records.
- Decide whether public reads use `published`, `isActive`, or both.
- Public Firestore reads remain disabled until Luke approves the backend-read phase.
