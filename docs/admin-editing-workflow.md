# Admin Editing Workflow

This workflow defines how new site sections become editable by Jette without turning random UI copy or customer-facing behavior into mutable content by accident.

## Ownership Decision

Before building or changing a site section, assign each visible surface one owner:

- `Admin editable`: Jette can edit the field through Firestore draft editing and preview.
- `Code owned`: developers control the text or behavior because it is navigation, checkout, cart, validation, layout chrome, or other product logic.
- `Data owned`: products, events, categories, inventory, and media records own the content.
- `Mixed`: developers own the layout and behavior, while specific text/image fields are admin editable.

Do not make a field admin editable unless that decision is explicit.

## Editable Content Contract

For a new admin-editable content section:

1. Add the section to the Firestore `siteContent` contract and seed/audit path.
2. Render the public component from the normalized Firestore-compatible data shape.
3. Add preview edit markers only for the approved editable fields.
4. Keep edits on draft collections first.
5. Require `Save Draft`, then `Review Publish`, then `Confirm Publish Changes` before live Firestore changes.
6. Publish the reviewed saved draft and its live target in one Firestore transaction.

Protected static resource files remain read-only unless Luke explicitly approves a content migration or content change.

## Preview Editing UX

The admin preview is the map Jette uses to find content the same way a customer would find it.

- Normal preview navigation stays inside the preview iframe.
- Content Edit Mode makes approved editable text clickable in the preview, but only the active field or paragraph should keep a persistent selected highlight.
- Saved draft words that differ from the live Firestore text should be highlighted inline in the preview, with added draft words shown as an obvious green mark.
- Clicking an approved content field opens the edit drawer beside the preview.
- The preview route stays where Jette clicked.
- The lower admin editor sections do not auto-scroll open for preview clicks.
- Saving a draft refreshes the preview data without publishing.
- The embedded admin preview keeps viewport size controls behind the view icon.
- The pencil icon toggles edit mode for the current preview without leaving the preview.
- The expand icon opens a full-preview admin overlay that keeps the side edit drawer available.
- Preview side cards should edit the clicked field or paragraph only, in the same order Jette sees it on the site.
- Preview side cards use `Save Draft`, `Publish`, and `Discard Draft`; the preview itself is the primary review surface.
- Preview side cards keep instructional notes compact behind help controls so the edit field remains the focus.
- Added content blocks use the same preview-click drawer flow. A block can be a title, subtitle, or paragraph, and it can be removed from the draft before publishing.
- Manual refresh and audit/setup tools belong outside the Jette-facing preview editing flow.

## Transactional Publish Contract

Saving a draft records the live content revision, a canonical live-content fingerprint, the live record's existence, an operational inventory snapshot, and a monotonically increasing draft revision. Those values define exactly what Jette reviewed.

Confirm Publish Changes must reread both the saved draft and live target inside one Firestore transaction. The transaction must:

- reject a publish when the saved draft changed after review;
- reject a publish when live product, event, or site content changed after the draft began;
- preserve newer live product stock and event ticket counts when the draft did not edit those values;
- reject conflicting inventory edits instead of choosing one silently;
- preserve the exact existing product inventory shape when a draft changes only copy, visibility, or photos;
- claim every published product SKU transactionally and reject an SKU already owned by another product option;
- reject event capacity below current sold tickets plus manual holds;
- write the live target and mark the draft published together, or write neither;
- publish the persisted draft record, never unsaved form state supplied by the browser.

Product variant active status, stock, threshold, and tracking plus event capacity/holds/waitlist settings are operational data. Their live values may change while a content draft is open, so draft preview and publish merge them through the same ownership rules. Product `inStock` is always derived from the merged variants. Event `ticketsSold` is always preserved from the live record and is never owned by a content draft.

Product price and inventory structures change only when Jetta edits the product's option/inventory controls. Title, description, visibility, and photo-only drafts must not synthesize, normalize, re-key, or otherwise migrate a legacy product's variants.

Drafts saved before this contract lack a trustworthy baseline. An active legacy draft against an existing live record must be discarded, reopened from live data, and saved again before it can publish.

If preview overlay detects changed live content or a same-field operational conflict, it must show current live data and an explicit conflict warning. It must never silently render the stale draft as though it can publish.

Firestore rules validate approved-admin identity and document shapes, while the portal owns this review/publish workflow. Approved admin credentials are a trusted-operator boundary: Firebase Console/server-admin access bypasses client rules, and a deliberately custom client using an approved admin account is outside the accidental-overwrite protection provided by this UI.

## Admin Sections

The admin home should present Jette-facing work areas as top-level sections:

- `Site Preview`
- `Products`
- `Events`
- `Site Content`
- `Photos`
- `Developer / Audit Tools`

Only one top-level section should be open at a time. The whole section header is clickable, and the arrow is only the visual expansion indicator.

Migration, mirror, parity, and setup/audit tooling belongs under `Developer / Audit Tools` unless Luke explicitly asks to promote it into Jette's normal editing workflow.

## Product And Event Editing

Products and events follow the same preview-click pattern by reusing the existing Product Editor and Event Editor draft/publish logic.

Do not create a separate product or event save path for preview editing. The drawer must reuse the existing draft, review, publish, and discard helpers.

Expected flow:

1. Jette navigates to a product card, product detail, or event in the preview.
2. Edit Mode shows a small edit control for the product or event.
3. Clicking the edit control opens a drawer with only that product or event card.
4. Saving a draft refreshes the preview in place.
5. Publishing remains explicit and review-gated.

Product and event preview editing include photo upload, Photo Library attach, drag-handle reorder, selected-photo alt-text editing, and thumbnail `x` detach tools. These photo tools should stay hidden until Jette selects a photo or clicks `Add Photo`; in-app crop is intentionally deferred because photos can be cropped before upload. The Photo Library picker should show all active Storage-backed media assets as previewable thumbnail cards, not only the old `other` bin.

Event description editing uses repeatable sections with optional subtitle and paragraph fields. Events are ordered chronologically by the canonical `date` field; do not add a separate event-level sort-order editor. The earlier admin-only `eventType` field should stay removed unless Luke approves a real customer-facing use for it. Event menu/document upload remains a separate event-media phase.

Product and event editors show one customer-facing visibility control: `Visible on site`. The stored `published` compatibility field is kept in sync behind the scenes. Product shipping remains editable because products ship; event shipping remains an internal `0.00` compatibility field and should not be shown in the event editor.

Event availability should be computed instead of manually toggled. Jette sets capacity; future order tracking should update `ticketsSold`; and the Event Editor may use manual holds only for seats reserved outside the website until checkout/order persistence is connected. Public event pages should show labels like `2 of 30 available`, hide ticket purchase for past events, and show a waitlist for full future events when waitlist is enabled. Waitlist entries save to `eventWaitlist` and are visible from the matching Event Editor card.

The client cart also counts event seats across adult, child, dietary, and duplicate cart variants for the same event/date, but this is only a customer-side guard. The guarded server PayPal path now owns reservation, capture, `ticketsSold`, product stock, and movement updates transactionally in demo-emulator verification. It remains disabled and undeployed until the production payment and release gates are approved.

## Admin Shell And Inventory

The admin dashboard uses a left-sidebar navigation shell. Only one section renders in the main workspace at a time: Site Preview, Products, Events, Inventory, Orders, Photos, Site Content, or Developer / Audit Tools.

The Inventory section is the operating view over live Firestore inventory records. It combines product variant stock and event capacity/tickets/manual holds without changing protected static resource files.

Inventory edits are intentionally narrower than product/event content edits:

- Product inventory rows can update stock on hand, low-stock threshold, whether inventory is tracked, and whether the variant is sellable.
- Event inventory rows can update capacity, manual holds, and whether the waitlist opens when full.
- Product/event descriptions, prices, photos, titles, and visibility still belong in the Product and Event editors.
- Stock/manual-hold changes create `inventoryMovements` rows for audit. This is the beginning of the inventory ledger; paid orders and future Square/manual imports should use the same movement model.
- Inventory Save Changes rereads all affected records in one transaction. Same-field stale edits reject the whole save, the conflicted row refreshes, and unrelated unsaved rows remain editable.
- Product `inStock` is derived from active variants and stock tracking; there is no independent availability checkbox.
- Legacy products can display synthesized option rows, but the first successful save must persist exactly one stable variant and SKU per price option. The current locally verified rules support at most three options.
- The displayed price option is the checkout price. Its mapped variant must store the same value, and the save fails closed on a mismatch.
- Product publish and Inventory Save Changes reserve normalized SKUs through `productSkus` in the same transaction as the product update; a concurrent duplicate claim rejects atomically.

## Site Content Blocks

Existing site content fields stay owned by their current content docs. When Jette needs to add new copy without a code change, the Site Content Editor can add optional blocks:

- `title`
- `subtitle`
- `paragraph`

These blocks save under `contentBlocks`, render after the existing approved fields for that content section, and stay draft-only until published. The `home` document stores header/footer blocks under `sections.header.contentBlocks`; the other content docs store them under `sections.contentBlocks`.

## Regression Checks

For each preview-editing phase, verify:

- Public routes show no admin edit markers.
- Preview navigation remains under `/admin/preview/...`.
- Preview clicks do not scroll the parent admin page away from the preview.
- Draft saves write only to draft collections.
- Preview refreshes draft-over-live data after saving.
- Publishing a reviewed revision writes the target and published draft status atomically.
- A stale reviewed revision or changed live content writes neither document.
- Concurrent inventory or ticket changes are preserved unless the draft edited the same operational value, in which case conflicting edits fail closed.
- Protected resource files are unchanged.
