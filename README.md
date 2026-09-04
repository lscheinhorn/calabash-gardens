# Calabash Gardens

Calabash Gardens is a React storefront and event-booking site for a Vermont saffron farm. It supports product browsing, event promotion, cart management, PayPal checkout, and customer contact.

## Stack

- React 18
- Create React App / `react-scripts`
- React Router with host-specific `HashRouter`/`BrowserRouter` builds
- Redux Toolkit
- PayPal React SDK
- EmailJS
- Firebase Auth, Firestore, Storage, and guarded Functions foundations
- Static JS resource files for products, events, content, and event inventory

## Local Setup

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm start
```

Build for production:

```bash
npm run build
```

## Scripts

- `npm start`: run local development server
- `npm run build`: create production build
- `npm run build:github-pages`: create the existing hash-routed GitHub Pages build
- `npm run build:firebase-preview`: create the clean-routed, side-effect-disabled Firebase Hosting preview build
- `npm run deploy:firebase-preview`: deploy only the seven-day `phase45-preview` Hosting channel to the explicit Calabash Firebase project
- `npm run build:firebase-hosting`: create the clean-routed production Firebase Hosting build while retaining static public data and the current checkout settings
- `npm run deploy:firebase-hosting`: build and deploy only production Hosting to the explicit Calabash Firebase project
- `npm test`: run Create React App test runner
- `npm run test:firebase-parity-model`: run deterministic parity-model tests
- `npm run test:product-variant-migration-model`: run deterministic product identity and migration-preview tests
- `npm run test:inventory-admin-emulators`: run the isolated inventory transaction and Firestore rules matrix
- `npm run test:draft-publish-emulators`: run the isolated transactional draft-publish matrix
- `npm run audit:firebase-parity`: read Firestore/Storage, exercise anonymous public query shapes, and refresh the sanitized local parity report without Firebase writes
- `npm run check:firebase-parity`: run the same read-only audit without rewriting reports and fail while blockers remain
- `npm run plan:product-variant-migration`: refresh the production read-only product/variant/SKU plan after verifying the exact project and catalog contract
- `npm run check:product-variant-migration`: rerun the same preview without changing its checked-in reports and fail while migration blockers remain
- `npm run deploy`: build and publish with `gh-pages`

## Project Docs

- `AGENTS.md`: operating rules and agent roles
- `PROJECT_STATUS.md`: live source of truth
- `docs/app-overview.md`: product and route overview
- `docs/architecture.md`: technical architecture
- `docs/admin-setup.md`: Firebase/admin setup checklist
- `docs/admin-data-shapes.md`: target admin-managed backend data contract
- `docs/firestore-rules-plan.md`: draft Firestore security rules notes
- `docs/storage-rules-plan.md`: draft Firebase Storage rules notes
- `docs/data-model.md`: current static data model
- `docs/maintenance.md`: common maintenance tasks
- `docs/agent-workflow.md`: Git and phase workflow
- `docs/phase35-checkout-verification.md`: isolated server-checkout verification
- `docs/phase36-webhook-verification.md`: isolated webhook/recovery verification
- `docs/phase40-inventory-variant-verification.md`: inventory variant, availability, conflict, and responsive-admin verification
- `docs/phase41-product-variant-migration-verification.md`: automatic product/variant identity contract and no-write migration-preview verification
- `docs/firebase-parity-audit.md`: latest read-only Firestore/Storage parity result
- `docs/product-variant-migration-preview.md`: exact proposed identities for the current Firestore product catalog
- `docs/firebase-hosting-preview.md`: preview-channel safety, routing, CSP, caching, and live-cutover gate
- `docs/firebase-hosting-production.md`: production Hosting flags, deployment boundary, validation, and rollback procedure

## Notes

The public app still defaults to static product, event, and site content. The Firebase-backed admin portal supports draft editing, preview, media, transactionally unique product SKUs, inventory, and order-review foundations. Guarded server checkout and webhook recovery exist only as disabled, emulator-verified pre-live paths; they are not deployed or active on the public site.

The Firebase Hosting preview disables payment, contact, waitlist, password-reset, and admin-write actions. The separate production Hosting build uses clean routes while preserving the current static public catalog, client-side PayPal checkout, EmailJS contact form, waitlist behavior, password reset, and approved admin tools.

Before implementation work, confirm scope in `PROJECT_STATUS.md`, use a feature branch, and get Luke's approval.
