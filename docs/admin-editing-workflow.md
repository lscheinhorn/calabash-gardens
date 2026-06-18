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

Protected static resource files remain read-only unless Luke explicitly approves a content migration or content change.

## Preview Editing UX

The admin preview is the map Jette uses to find content the same way a customer would find it.

- Normal preview navigation stays inside the preview iframe.
- Content Edit Mode highlights approved editable text in the preview.
- Clicking an approved content field opens the edit drawer beside the preview.
- The preview route stays where Jette clicked.
- The lower admin editor sections do not auto-scroll open for preview clicks.
- Saving a draft refreshes the preview data without publishing.
- The embedded admin preview keeps viewport size controls behind the view icon.
- The pencil icon toggles edit mode for the current preview without leaving the preview.
- The expand icon opens a full-preview admin overlay that keeps the side edit drawer available.

## Product And Event Editing

Products and events should follow the same preview-click pattern, but only after their drawer mode is implemented by reusing the existing Product Editor and Event Editor draft/publish logic.

Do not create a separate product or event save path for preview editing. The drawer must reuse the existing draft, review, publish, and discard helpers.

Expected future flow:

1. Jette navigates to a product card, product detail, or event in the preview.
2. Edit Mode shows a small edit control for the product or event.
3. Clicking the edit control opens a drawer with only that product or event card.
4. Saving a draft refreshes the preview in place.
5. Publishing remains explicit and review-gated.

## Regression Checks

For each preview-editing phase, verify:

- Public routes show no admin edit markers.
- Preview navigation remains under `/admin/preview/...`.
- Preview clicks do not scroll the parent admin page away from the preview.
- Draft saves write only to draft collections.
- Preview refreshes draft-over-live data after saving.
- Protected resource files are unchanged.
