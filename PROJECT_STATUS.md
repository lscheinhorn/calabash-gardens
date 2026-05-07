# PROJECT_STATUS

This file is the live source of truth for Calabash Gardens project work.

## Current Status

Admin product seed/import foundation is in progress on branch `codex/admin-product-seed-import`.

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

Phase 16: Admin product seed/import foundation.

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

## In Progress Work

- Add a guarded admin seed tool for copying static products into Firestore drafts.
- Map preserved inactive gift-set products to a real `Gifts` category for seed.
- Keep storefront category filters limited to categories with active products.
- Document future CSV import/export validation expectations.
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
- Review admin product photo upload before merge.
- Plan CSV import/export UI after the seed validator is reviewed.
- Plan backend product reads after seeded data is reviewed.

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
- Draft Firestore rules are not deployed and `firebase.json` remains commented out.
- Draft Storage rules are not deployed and `firebase.json` remains commented out.
- Admin data-shape contract is a planning document and is not a migration.
- Draft Firestore rules are aligned with the data-shape contract but are still not deployed.
- Product editor requires Firebase env values, deployed/reviewed rules, and an approved admin record for real testing.
- Product writes require approved `productCategories` records.
- Product photo upload requires deployed/reviewed Storage rules before real Firebase testing.
- Uploaded product photos are stored on Firestore product drafts only; public product pages still use static images until a backend-read phase is approved.
- Static product seed maps preserved gift-set products with missing categories to `Gifts`.
- CSV import/export should reuse the product seed validation contract instead of trusting spreadsheet validation.
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

## Verification History

- 2026-05-05: `npm run build` completed successfully with warnings.
- 2026-05-05: Dev server starts when allowed to bind to `127.0.0.1`.
- 2026-05-05: `npm run build` completed successfully after customer-request fixes, with the same existing warnings.
- 2026-05-05: `npm run build` completed successfully after inactive-event correction, with the same existing warnings.
- 2026-05-05: `npm run deploy` published customer-request fixes.
- 2026-05-07: `npm run build` completed successfully after admin product photo upload, with the same existing warnings.

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
- Pending commit for admin product seed/import foundation.

## Deployments

- 2026-05-05: Published customer-request fixes with `npm run deploy`.
