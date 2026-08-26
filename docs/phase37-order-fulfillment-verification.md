# Phase 37 Order Fulfillment Verification

This procedure verifies the admin fulfillment editor, stale-edit protection, restricted Firestore rule boundary, and filtered CSV export without reading or writing production Firebase data.

## Safety Boundary

- Use the exact project ID `demo-calabash-gardens`.
- Use only the loopback Auth emulator at `127.0.0.1:9099` and Firestore emulator at `127.0.0.1:8080`.
- `scripts/phase37-order-fulfillment-verification.js` exits unless every project ID and emulator host matches those fixed values.
- The harness creates and removes only the exact Phase 37 admin and order fixture IDs.
- Do not replace the demo project ID with the production project ID.

## Start Firebase Emulators

From the repository root:

```sh
PATH=/usr/local/opt/openjdk@21/bin:$PATH \
npx firebase-tools emulators:start \
  --only auth,firestore \
  --project demo-calabash-gardens
```

## Run The Rules Matrix

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
node scripts/phase37-order-fulfillment-verification.js verify-rules
```

The matrix verifies:

- two legitimate approved-admin fulfillment updates succeed and increment revision exactly once;
- invalid status, oversized notes, spoofed updater UID, client timestamp, and stale revision updates fail;
- payment status/ID, source, customer, item, and total changes fail, including mixed fulfillment-plus-payment changes;
- inactive-admin and anonymous reads/updates fail;
- client order create/delete fail;
- immutable payment, source, customer, item, and total facts remain unchanged.

## Manual Browser Test

Seed one emulator-only approved admin and one exact order fixture:

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
node scripts/phase37-order-fulfillment-verification.js seed-manual
```

Start a separate emulator-wired React app on a free port:

```sh
HOST=127.0.0.1 \
PORT=3003 \
BROWSER=none \
REACT_APP_FIREBASE_USE_EMULATORS=true \
REACT_APP_FIREBASE_API_KEY=demo-api-key \
REACT_APP_FIREBASE_AUTH_DOMAIN=demo-calabash-gardens.firebaseapp.com \
REACT_APP_FIREBASE_PROJECT_ID=demo-calabash-gardens \
REACT_APP_FIREBASE_STORAGE_BUCKET=demo-calabash-gardens.appspot.com \
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789 \
REACT_APP_FIREBASE_APP_ID=1:123456789:web:phase37 \
npm start
```

Manual acceptance checks:

1. Sign in with the emulator-only credentials printed by `seed-manual` and open Orders.
2. Change the fixture to `In Progress`, set notes to `Packed for browser QA.`, save, and confirm the badge/fields survive reload.
3. Confirm the saved document directly:

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
node scripts/phase37-order-fulfillment-verification.js assert-browser-save
```

4. Make another unsaved browser edit, then simulate a second admin:

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
node scripts/phase37-order-fulfillment-verification.js set-concurrent
```

5. Save the stale browser edit. Confirm the UI reports the conflict and reloads `Shipped` / `Concurrent admin update.` instead of overwriting it.
6. After visually confirming the conflict, verify the stored postcondition:

```sh
PHASE37_CONFLICT_UI_CONFIRMED=true \
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
node scripts/phase37-order-fulfillment-verification.js assert-browser-conflict
```

7. Apply an empty-result search and confirm Export CSV disables. Clear the filter, export, and confirm the one row includes the immutable payment/order facts plus the latest fulfillment values.
8. Confirm formula-like customer/item cells begin with an apostrophe in the downloaded CSV.
9. Check dark and light mode plus a 390 x 844 viewport, and confirm browser diagnostics contain no application warnings or errors.
10. With the Firestore emulator temporarily unavailable during a pending save, confirm status, notes, and Save Changes are all disabled until the request resolves.

## Cleanup

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
node scripts/phase37-order-fulfillment-verification.js cleanup
```

Stop the temporary React server and Firebase emulators. Emulator data must never be exported into the repository.

## Verified Result

On 2026-08-26, the isolated rules matrix passed two allowed updates and twenty denied mutation/read cases. Browser-controlled testing confirmed save and persistence, revision `1`, stale-edit rejection, preservation of the concurrent revision `2` update, filtered-export disabling, a one-row CSV with formula neutralization, truthful failed-refresh messaging, disabled controls during a pending network save, dark/light presentation, and a usable mobile fulfillment editor. Browser diagnostics contained no warnings or errors.

The complete Phase 35 sixteen-scenario checkout matrix and all six Phase 36 webhook groups passed again after the order-rule change. Fourteen React/Jest tests, Functions syntax, changed-script syntax, `firebase.json` parsing, the production build, whitespace checks, and protected-file checks passed. The build retained only the four existing unused-code warnings. Independent read-only rereview returned PASS after its refresh, pending-save, cleanup, and message-accuracy findings were fixed.

All Phase 37 fixtures and the emulator-only admin were removed. Temporary ports `3003`, `5001`, `8080`, `8787`, and `9099` were stopped, while the normal local app remained available on `127.0.0.1:3001`. No production Firebase, PayPal, checkout, inventory, public storefront, or protected static business content was contacted or changed.

## Production Gates

- The changed Firestore rules remain local until Luke explicitly approves a rules deployment.
- A real multi-admin production-data test is deferred; the deterministic emulator conflict test is the approved pre-deployment proof.
- The public checkout and PayPal webhook remain disabled and undeployed.
- Merge, push, deploy, and public backend enablement still require Luke's explicit approval.
