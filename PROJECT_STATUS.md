# PROJECT_STATUS

This file is the live source of truth for Calabash Gardens project work.

## Current Status

Admin/backend planning is in progress on branch `codex/admin-backend-plan`.

## Approved Tech Stack

- React 18
- Create React App / `react-scripts`
- React Router with `HashRouter`
- Redux Toolkit for cart state
- PayPal React SDK for checkout
- EmailJS for contact form
- Static JS resource files for products, events, content, and event inventory
- Firebase is present as commented/dormant setup, not active

## Current Phase

Phase 3: admin/backend implementation planning.

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

## Bugs

- Event stock checks compare the full `quantity` object against stock, which cannot work as intended.
- Some event inventory keys appear outdated or mismatched with current event dates.
- The events build has missing-dependency React hook warnings.
- Several unused variables/imports remain.
- `README.md` was still the Create React App default before this phase.

## Risks And Open Questions

- Checkout is client-side PayPal integration only; order persistence and fulfillment workflow are unclear.
- Inventory is static and may not prevent overselling.
- Admin/Firebase code is commented out; the intended data-management path needs approval.
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
- Pending commit for admin/backend plan.

## Deployments

- 2026-05-05: Published customer-request fixes with `npm run deploy`.
