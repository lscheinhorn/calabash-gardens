# Firebase Setup Plan

This phase plans Firebase setup for a future admin editor. It does not activate Firebase, add dependencies, deploy rules, migrate content, or change runtime behavior.

## Current State

- `src/firebase-config.js` contains commented Firebase setup code.
- `.firebaserc` is commented out and references project `calabash-54fb5`.
- `firebase.json` is commented out.
- `package.json` lists `firebzase`, which appears to be a typo.
- `package-lock.json` lists `firebase`.
- `node_modules/firebase` exists locally.
- `src/Components/Admin/Admin.js` is fully commented out.
- `src/Components/ProductEditor/ProductEditor.js` is fully commented out.
- `src/Components/Editor/Editor.js` imports Firebase services, but active config exports do not exist.

## Non-Goals

- Do not modify protected content/data files.
- Do not enable Firebase in runtime code.
- Do not add, remove, or install dependencies.
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

- `.env.example`

Required future variables:

- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

## Dependency Plan

Before activation, resolve the dependency mismatch:

- Replace `firebzase` in `package.json` with `firebase`.
- Confirm `package-lock.json` remains consistent.
- Do this in a dedicated approved branch because dependency changes can affect builds.

Do not make this change in the planning branch.

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

After approval:

- Fix dependency name.
- Add active Firebase config module that reads environment variables.
- Export `auth`, `db`, and `storage`.
- Do not connect public data reads to Firebase yet.
- Build must pass.

### Step 2: Admin Auth Shell

- Restore `/admin` as a login/dashboard shell.
- Gate dashboard access behind Firebase Auth.
- Check admin allowlist before showing editor navigation.
- No product/event/content writes yet.

### Step 3: Read-Only Backend Probe

- Add a safe read-only Firestore probe or status panel inside admin.
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
