# PROJECT_STATUS

This file is the live source of truth for Calabash Gardens project work.

## Current Status

Admin data-shape planning is in progress on branch `codex/admin-data-shapes`.

## Approved Tech Stack

- React 18
- Create React App / `react-scripts`
- React Router with `HashRouter`
- Redux Toolkit for cart state
- PayPal React SDK for checkout
- EmailJS for contact form
- Static JS resource files for products, events, content, and event inventory
- Firebase is present as an env-driven config module, with admin auth shell only

## Current Phase

Phase 10: Admin data-shape planning.

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

## In Progress Work

- Draft admin/backend implementation plan for Jette-managed products, events, and site content.
- Use subagents to review implementation readiness and guardrail compliance before coding.
- Document existing admin/Firebase blockers and recommended first implementation slice.
- Implement read-only content adapter boundary without changing protected resource files.
- Add read-only helper functions to the content adapter and use them where equivalent.
- Merged the read-only content adapter and helper phases into `main`.
- Merged the Firebase setup plan into `main`.
- Merged the Firebase dependency/config foundation into `main`.
- Merged the admin auth shell into `main`.
- Merged admin setup/status into `main`.
- Merged Firestore rules planning into `main`.
- Merged Storage rules planning into `main`.

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
- Review admin data-shape contract before merge.
- Decide first editor implementation slice.
- Plan seed/export strategy before backend content reads.

## Bugs

- Event stock checks compare the full `quantity` object against stock, which cannot work as intended.
- Some event inventory keys appear outdated or mismatched with current event dates.
- The events build has missing-dependency React hook warnings.
- Several unused variables/imports remain.
- `README.md` was still the Create React App default before this phase.

## Risks And Open Questions

- Checkout is client-side PayPal integration only; order persistence and fulfillment workflow are unclear.
- Inventory is static and may not prevent overselling.
- Admin auth shell exists, but content editing and public content backend data reads are not active.
- Firebase services export `null` until required `REACT_APP_FIREBASE_*` environment variables are configured.
- Real admin testing still needs Firebase project values and approved admin user records.
- Draft Firestore rules are not deployed and `firebase.json` remains commented out.
- Draft Storage rules are not deployed and `firebase.json` remains commented out.
- Admin data-shape contract is a planning document and is not a migration.
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

## Verification History

- 2026-05-05: `npm run build` completed successfully with warnings.
- 2026-05-05: Dev server starts when allowed to bind to `127.0.0.1`.
- 2026-05-05: `npm run build` completed successfully after customer-request fixes, with the same existing warnings.
- 2026-05-05: `npm run build` completed successfully after inactive-event correction, with the same existing warnings.
- 2026-05-05: `npm run deploy` published customer-request fixes.

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
- Pending commit for admin data-shape planning.

## Deployments

- 2026-05-05: Published customer-request fixes with `npm run deploy`.
