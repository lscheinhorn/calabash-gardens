# Firebase Setup Plan

This document tracks Firebase setup for a future admin editor. The current implementation adds an env-driven Firebase config foundation and admin auth shell, but it does not connect public site data to Firebase, deploy rules, migrate content, or add admin editing behavior.

## Current State

- `src/firebase-config.js` exports an env-driven Firebase config foundation.
- Firebase services export `null` until required `REACT_APP_FIREBASE_*` variables are configured.
- `.firebaserc` is commented out and references project `calabash-54fb5`.
- `firebase.json` is commented out.
- `package.json` now lists `firebase`.
- `package-lock.json` lists `firebase`.
- `node_modules/firebase` exists locally.
- `src/Components/Admin/Admin.js` provides a Firebase sign-in shell and checks `adminUsers/{uid}` for active admin access.
- `src/Components/ProductEditor/ProductEditor.js` is fully commented out.
- `src/Components/Editor/Editor.js` imports Firebase services, but it is not mounted by the admin auth shell.

## Non-Goals

- Do not modify protected content/data files.
- Do not connect products, events, content, inventory, checkout, or public pages to Firebase yet.
- Do not deploy Firebase hosting, Firestore rules, or Storage rules.
- Do not build the admin editor yet.
- Do not migrate product, event, content, or inventory data.

## Proposed Firebase Services

- Firebase Auth for admin login.
- Firestore for products, events, site content, admin user metadata, and later order/inventory records.
- Firebase Storage for uploaded product/event images.

## Environment Variables

Use `.env.local` for local Firebase config once implementation is approved. Keep `.env.local` uncommitted.

Future template file, only after approval:

- `.env.example` has been added.

Required future variables:

- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

## Dependency Plan

Dependency mismatch status:

- `firebzase` has been replaced with `firebase` in `package.json`.
- `package-lock.json` already listed `firebase`.

Any future Firebase package upgrades should happen in a dedicated approved branch because dependency changes can affect builds.

## Admin Access Model

Initial approved admin model should be:

- Firebase Auth email/password or passwordless email link.
- Admin allowlist stored in Firestore, keyed by Firebase Auth `uid`.
- Only active admin users can write products, events, content, or images.
- Public users can only read published/active public data.

Needed before implementation:

- Jette's admin email.
- Luke's admin email, if Luke should also have access.
- Decision on whether direct live edits are acceptable or draft/publish is required.

## Draft Firestore Collections

These are proposed and should not be created until implementation is approved:

- `adminUsers`
- `products`
- `events`
- `siteContent`
- `inventory`
- `orders`

First backend read/write work should not include `orders` unless checkout persistence is explicitly approved.

## Security Rules Strategy

Rules must be designed before writes are enabled:

- Public reads only from safe published documents.
- Admin writes only when `request.auth.uid` maps to an active admin user.
- Disallow client writes to order/payment records in the first admin phase.
- Validate required fields for products/events/content where practical.
- Protect image upload paths by admin UID.

## Implementation Sequence

### Step 1: Dependency And Config Branch

Status: done.

- Fix dependency name. Done.
- Add active Firebase config module that reads environment variables. Done.
- Export `auth`, `db`, and `storage`. Done.
- Do not connect public data reads to Firebase yet.
- Build must pass.

### Step 2: Admin Auth Shell

- Restore `/admin` as a login/dashboard shell. Done.
- Gate dashboard access behind Firebase Auth. Done.
- Check admin allowlist before showing editor navigation. Done.
- No product/event/content writes yet.

### Step 3: Read-Only Backend Probe

- Add a safe read-only Firestore probe or status panel inside admin. Done.
- Keep public site data on static adapter fallback.

### Step 4: Data Seeding Plan

- Decide whether data is seeded by script, manual entry, or admin forms.
- Preserve static data exactly unless Luke approves specific changes.

## Verification Checklist

- Protected resources unchanged unless explicitly approved.
- `npm run build` passes.
- `.env.local` remains untracked.
- No Firebase deploy occurs without approval.
- No admin write path exists until security rules are reviewed.
- Subagent reviews scope before merge readiness.
