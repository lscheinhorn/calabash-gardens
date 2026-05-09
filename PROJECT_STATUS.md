# PROJECT_STATUS

This file is the live source of truth for Calabash Gardens project work.

## Current Status

Public product parity testing is in progress on branch `codex/product-image-manifest`.

## Approved Tech Stack

- React 18
- Create React App / `react-scripts`
- React Router with `HashRouter`
- Redux Toolkit for cart state
- PayPal React SDK for checkout
- EmailJS for contact form
- Static JS resource files for products, events, content, and event inventory
- Firebase is present as an env-driven config module, with admin auth shell and product editor only

## Current Phase

Phase 27: Admin public product parity report.

## Done Work

- Existing website includes home, shop, product detail, events, cart, contact, header/nav, and footer.
- Event content includes 2026 Calabash Experience entries.
- Production build succeeds with warnings.
- PM branch created from `main`: `codex/pm-workflow-docs`.
- Created `AGENTS.md`.
- Created project-specific `README.md`.
- Created docs for app overview, architecture, data model, maintenance, and agent workflow.
- Updated Calabash Experience main blurb.
- Updated vegetarian and gluten-free event option labels to show `+$10`.
- Updated product shipping from `$15` to `$17`.
- Updated cart shipping cap from `$15` to `$17`.
- Added cart shipping increase note.
- Updated Saffron Salt 2 oz from `$12.50` to `$15.00`.
- Kept the 2026 event data in `events.js` but set those events inactive.
- Restored 2025 events to active so events before 2026 still show.
- Updated the Events page to respect `isActive` when choosing which events to show.
- Prevented past events before 2026 from being purchasable by setting their `inStock` values to false.
- Merged and deployed customer-request fixes.
- Added backend-readiness guardrails and merged them into `main`.
- Merged admin product categories and validation into `main`.
- Added admin product photo upload on the active admin branch.
- Added admin product and category ID suggestions on the active admin branch.
- Added admin product seed/import foundation on the active admin branch.
- Moved admin product photo upload and attached-photo display into expanded product cards on the active admin branch.
- Replaced admin collapse/expand text controls with compact arrow controls on the active admin branch.
- Merged and deployed admin product card UI for `/admin` testing.
- Added a dry-run product image migration manifest generator on the active branch.
- Added the admin media library foundation on the active branch.
- Added a controlled media upload/import dry-run planner on the active branch.
- Added a non-destructive media asset preparation step for oversized migration images on the active branch.
- Added admin large-image optimization controls and a local media optimization review report on the active branch.
- Added a guarded Firebase media migration importer on the active branch.
- Added Storage-backed admin media previews on the active branch.
- Added collapsible Photos library and product-card attach-from-Other media controls on the active branch.
- Added product-card controls to edit attached photo alt text, reorder product photos, and detach photos without deleting Storage files on the active branch.
- Added a read-only admin Product Mirror Audit panel comparing static product seed expectations with Firestore product documents on the active branch.
- Added a read-only admin Content Mirror Audit panel comparing static site copy expectations with Firestore site content documents on the active branch.
- Added a guarded admin action to seed missing Firestore `siteContent` documents from static content expectations without overwriting existing documents on the active branch.
- Added an admin-only Site Content Editor for editing seeded Firestore `siteContent` documents without changing public static reads on the active branch.
- Added admin dark/light theme toggle with dark mode as the default on the active branch.
- Added a read-only Firestore-to-public-product adapter and parity report helper without switching public product pages to Firestore on the active branch.
- Added an admin-only Public Product Parity panel that compares Firestore-normalized visible products against the current static shop output on the active branch.

## In Progress Work

- Review admin Photos metadata flow, draft `mediaAssets` rules, and media manifest before approving upload migration.
- Review the zero-blocker media migration dry-run report before any real upload/import.
- Review `docs/media-optimization-review.html` before uploading optimized migration images.
- Verify imported media thumbnails in admin product cards and the Photos library.
- Verify attaching an existing `other` bin photo to a product updates the product photo refs and media asset link metadata.
- Verify product photo alt-text edits, reordering, and detach behavior in admin product cards.
- Verify Product Mirror Audit reports missing, extra, different, and photo-review product records without writing data.
- Verify Content Mirror Audit reports missing, extra, and different site-content records without writing data.
- Verify Seed Missing Content creates only missing `siteContent` documents and skips existing documents.
- Verify Site Content Editor saves Firestore `siteContent` sections and does not edit protected static content files.
- Verify admin dark mode loads by default and the light/dark toggle persists locally.
- Verify the public product adapter normalizes Firestore products to the existing static public product shape before any public read switch is approved.
- Verify Public Product Parity reports whether Firestore-normalized visible products match static visible shop products without switching public reads.
- Review `docs/product-image-migration-manifest.md` before approving any product image upload phase.
- Luke and Jette need to test the live `/admin` login and provide feedback.
- Verify admin product cards, inline edits, category guardrails, seed behavior, and card-local photo upload on the live admin route.
- Use subagents to review implementation scope and guardrail compliance.

## Planned Work

- Review and approve this documentation baseline.
- Create a prioritized implementation plan before product code changes.
- QA current commerce and event-ticket flows before backend work.
- Clean build warnings and stale code.
- Stabilize event quantity, dietary-option, child-ticket, and inventory behavior.
- Decide whether admin/Firebase work should be completed, removed, or deferred.
- Review checkout/order confirmation requirements.
- Review accessibility, mobile layout, and content polish.
- Approve backend stack and first implementation phase.
- Test `/admin` with Firebase env values and an approved admin user.
- Plan CSV import/export UI after the seed validator is reviewed.
- Plan backend product reads after seeded data is reviewed.
- Plan approved product image upload only after the dry-run manifest is reviewed.

## Bugs

- Event stock checks compare the full `quantity` object against stock, which cannot work as intended.
- Some event inventory keys appear outdated or mismatched with current event dates.
- The events build has missing-dependency React hook warnings.
- Several unused variables/imports remain.
- `README.md` was still the Create React App default before this phase.

## Risks And Open Questions

- Checkout is client-side PayPal integration only; order persistence and fulfillment workflow are unclear.
- Inventory is static and may not prevent overselling.
- Admin product editor writes to Firestore, but public product pages still use static data.
- Firebase services export `null` until required `REACT_APP_FIREBASE_*` environment variables are configured.
- Real admin testing still needs Firebase project values and approved admin user records.
- Draft Firestore rules are not deployed.
- Storage rules were deployed to `calabash-54fb5` on 2026-05-07.
- Admin data-shape contract is a planning document and is not a migration.
- Draft Firestore rules are aligned with the data-shape contract but are still not deployed.
- Product editor requires Firebase env values, deployed/reviewed rules, and an approved admin record for real testing.
- Product writes require approved `productCategories` records.
- Product photo upload requires deployed/reviewed Storage rules before real Firebase testing.
- Product image migration dry run found many shared default-logo placeholders; those should not be uploaded as individual product photos without approval.
- Media library metadata can organize photos by bin and tags, but actual upload migration is still not connected.
- Media asset rules validate `tags` as a list; admin UI normalizes tags to strings before writing.
- Media migration preparation creates optimized upload copies under ignored `.media-migration-assets/` for oversized files.
- Admin product photo upload treats 10 MB as the performance threshold and 25 MB as the draft hard cap for rare original-upload overrides.
- Original admin photo uploads between 10 MB and 25 MB require reviewed/deployed Storage rules before they work live.
- Media migration importer requires `--confirm` before Firebase writes and signs in with local-only approved admin credentials.
- `firebase.json` is active for Storage rules only; Firebase Hosting remains outside this config.
- Firebase Rules System service agent has the `Firebase Rules Firestore Service Agent` role, allowing Storage rules to check Firestore `adminUsers/{uid}`.
- Confirmed media import uploaded 20 Storage objects, created 20 `mediaAssets` documents, and attached product photo refs to 11 Firestore products.
- Admin product cards and Photos library resolve Storage download URLs for imported media previews.
- Product cards can attach active `other` bin media assets to a product without uploading a new file.
- Uploaded product photos are stored on Firestore product drafts only; public product pages still use static images until a backend-read phase is approved.
- Static product seed maps preserved gift-set products with missing categories to `Gifts`.
- Static product seed excludes inactive test products and must not create an `All` category.
- Existing unapproved Firestore categories may need manual cleanup if they were already seeded before this guardrail.
- CSV import/export should reuse the product seed validation contract instead of trusting spreadsheet validation.
- Public product pages still do not read Firestore products; admin Firestore product labels reflect seeded/admin data only.
- `src/Components/Editor/Editor.js` imports Firebase services and should not be mounted until admin auth/config handling is designed.
- Event deposits, child tickets, vegetarian/gluten-free fees, and full-payment rules need explicit acceptance criteria.
- Deployment target appears related to Firebase and/or `homepage`, but current deployment process needs confirmation.
- Product, event, content, inventory, image, and public key files are protected and must not be edited without explicit approval.

## Decisions

- Use branch-per-phase workflow.
- Do not merge without Luke's approval.
- Treat docs as required infrastructure before product implementation.
- Do not change `src/resources/products.js`, `src/resources/events.js`, `src/resources/content.js`, `src/resources/inventory.js`, `src/resources/images/**`, or `src/resources/public_keys.js` without explicit approval.
- Future backend prep should start with read-only content boundaries and data-shape documentation before adding backend dependencies.
- Recommended backend path is Firebase Auth, Firestore, and Storage, pending Luke approval before implementation.
- First implementation slice should be a read-only content adapter, not Firebase activation or admin editing.
- `src/data/siteData.js` is the initial read-only content adapter boundary.
- Adapter helpers are read-only and must not mutate or normalize protected source data.
- Firebase setup should use environment variables from `.env.local`; an `.env.example` template can be added only after approval.
- Firebase dependency/config setup must not connect products, events, content, or inventory to Firebase.
- Admin auth shell must not mount `src/Components/Editor/Editor.js` or expose write controls.
- Admin route should stay lazy-loaded so Firebase/admin code is not bundled into the main storefront path.
- Firestore rules must be reviewed before admin write controls are added.
- The first admin user must be bootstrapped manually before draft rules are deployed.
- Storage rules must be reviewed before image upload controls are added.
- Admin editor forms must follow the documented data shapes unless Luke approves a change.
- Firestore validators must be rechecked whenever editor fields change.
- Admin product editor must not edit static product resource files.
- Product category choices must come from `productCategories`; no free-typed categories in product forms.
- Product image uploads should use flat `product-images/{fileName}` paths unless Storage rules are approved for a different path structure.
- Product and category IDs should be suggested from the title/name when created and treated as locked after saving.
- Product seeding must not overwrite existing Firestore products.
- Product seeding must not store bundled JavaScript `require(...)` image values in Firestore.
- Existing Firestore products should be edited inline from product cards; the New Product form should stay for creation only.
- Existing Firestore product photos should be uploaded and reviewed from the expanded product card.
- Project-directory product image migration must be planned as a separate dry-run manifest before uploading.
- Product image migration dry run must not upload files, write Firestore data, or edit protected static resource files.
- Media bins are Firestore metadata only; moving a media item between bins does not move the Storage object.
- Real media upload/import must not run while the dry-run report has upload blockers.
- Optimized media migration copies are generated artifacts and should not be committed.
- Large admin photo uploads should default to web optimization so public product pages stay fast after backend image reads are approved.
- Media migration imports must skip existing Storage objects and `mediaAssets` documents, append product photo references, and not replace existing Firestore product photos.
- Product categories must come from the approved category list: Body Care, Culinary, Gifts, Loose Leaf Tea, Mambo Gede, Ritual Smoking Blends, Saffron, and Tinctures.
- Gifts is reserved for the preserved legacy gift-set product IDs and should not be used for newly created products.
- Product categories have active/inactive status; new products can use active categories only.
- Existing products can keep inactive categories during edits for preservation.
- Gifts seeds inactive by default.

## Verification History

- 2026-05-05: `npm run build` completed successfully with warnings.
- 2026-05-05: Dev server starts when allowed to bind to `127.0.0.1`.
- 2026-05-05: `npm run build` completed successfully after customer-request fixes, with the same existing warnings.
- 2026-05-05: `npm run build` completed successfully after inactive-event correction, with the same existing warnings.
- 2026-05-05: `npm run deploy` published customer-request fixes.
- 2026-05-07: `npm run build` completed successfully after admin product photo upload, with the same existing warnings.
- 2026-05-07: `npm run build` completed successfully after admin product card UI, with the same existing warnings.
- 2026-05-07: `npm run build` completed successfully after moving product photo upload into product cards, with the same existing warnings.
- 2026-05-07: `npm run build` completed successfully after admin collapse arrow UI polish, with the same existing warnings.
- 2026-05-07: Post-merge `npm run build` completed successfully on `main`, with the same existing warnings.
- 2026-05-07: `npm run deploy` completed successfully and reported `Published`.
- 2026-05-07: `npm run manifest:product-images` generated a dry-run manifest with 16 upload candidates, 62 skipped default placeholders, 0 missing source files, and 4 unreferenced product photo files.
- 2026-05-07: `npm run build` completed successfully after adding the product image manifest generator, with the same existing warnings.
- 2026-05-07: `npm run manifest:product-images` regenerated the media asset manifest with product and other-bin metadata candidates.
- 2026-05-07: `npm run build` completed successfully after adding the media library foundation, with the same existing warnings.
- 2026-05-07: `npm run plan:media-migration` generated Markdown and JSON dry-run reports with 20 planned uploads, 20 planned `mediaAssets` documents, 11 product update targets, and 2 upload blockers over 10 MB.
- 2026-05-07: `npm run build` completed successfully after adding the media migration dry-run planner, with the same existing warnings.
- 2026-05-07: `npm run build` completed successfully after expanding exact media migration payload reports, with the same existing warnings.
- 2026-05-07: `npm run prepare:media-migration-assets` created optimized upload copies for the two oversized media migration files under ignored `.media-migration-assets/`.
- 2026-05-07: `npm run plan:media-migration` regenerated Markdown and JSON dry-run reports with 20 planned uploads, 2 optimized upload copies, and 0 upload blockers.
- 2026-05-07: `npm run build` completed successfully after adding media migration asset preparation, with the same existing warnings.
- 2026-05-07: `npm run review:media-optimization` generated a local side-by-side HTML review for optimized migration images.
- 2026-05-07: `npm run import:media-migration` printed the guarded importer dry-run plan with no Firebase writes.
- 2026-05-07: `npm run import:media-migration -- --confirm` was attempted with approved network access. Firebase Auth succeeded, but the first Storage upload returned `404 Not Found`; no Firestore writes ran in the importer before this failure.
- 2026-05-07: `npx firebase-tools deploy --only storage --project calabash-54fb5` deployed `storage.rules`.
- 2026-05-07: Confirmed media import was retried after Storage rules deploy and failed on the first upload with `storage/unauthorized`; no Firestore writes ran.
- 2026-05-07: Luke granted the Firebase Rules System service agent the `Firebase Rules Firestore Service Agent` role.
- 2026-05-07: `npm run import:media-migration -- --confirm` completed successfully: 20 files uploaded, 20 `mediaAssets` documents created, 11 product targets updated, and 0 targets skipped.

## Commits

- `bf03950 docs: establish PM workflow`
- `2966a85 merge: cousin request fixes`
- `160e5a1 merge: prevent past event purchases`
- `31f7ad7 merge: backend readiness guardrails`
- `67fb218 merge: admin backend plan`
- `7a348ef merge: read-only content adapter`
- `39a1396 merge: content adapter helpers`
- `b9205f1 docs: plan firebase setup`
- `17367b9 chore: add firebase config foundation`
- `c805190 feat: add admin auth shell`
- `a28459e docs: add admin setup status`
- `1fb5d03 docs: draft firestore rules`
- `48f1e1d docs: draft storage rules`
- `3284b98 docs: define admin data shapes`
- `17639d0 docs: align firestore rules with data shapes`
- `2462ddb feat: add admin product editor`
- `5e157ff feat: add product categories validation`
- `341ec93 feat: add admin product photo upload`
- `6e64617 feat: suggest locked admin ids`
- `594b0a4 fix: clean apostrophes in admin ids`
- `6271823 feat: add admin product seed foundation`
- `a0deec5 feat: preserve gift sets in seed`
- `e357186 feat: move product photos into cards`
- `48a0f55 style: polish admin collapse controls`
- `1046ec7 merge: admin product card ui`
- `5a1025d docs: add product image migration dry run`
- `315235f feat: add media library foundation`
- `3bad712 docs: add media migration dry run`
- `feat: prepare oversized media assets` (current branch)

## Deployments

- 2026-05-05: Published customer-request fixes with `npm run deploy`.
- 2026-05-07: Published admin product card UI for live `/admin` testing with `npm run deploy`.
