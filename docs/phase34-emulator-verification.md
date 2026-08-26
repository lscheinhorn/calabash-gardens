# Phase 34 Emulator Verification

This procedure verifies the Phase 34 inventory transaction and public waitlist rules without reading or writing the production Firebase project.

## Safety Boundary

- Use the fixed project ID `demo-calabash-gardens`.
- Use only the local Auth emulator at `127.0.0.1:9099` and Firestore emulator at `127.0.0.1:8080`.
- `scripts/phase34-emulator-verification.js` exits unless the project ID starts with `demo-` and both emulator host variables match those local addresses.
- The React app connects to emulators only outside production, only when `REACT_APP_FIREBASE_USE_EMULATORS=true`, and only with a `demo-*` project ID.
- Emulator mode redirects Auth, Firestore, Functions, and Storage to loopback ports. This inventory/waitlist procedure starts only Auth and Firestore, so any accidental Functions or Storage operation fails locally instead of reaching a remote service.
- Do not replace the demo project ID with the production project ID.

## Prerequisites

- Project dependencies installed with `npm install`.
- Functions dependencies installed with `npm --prefix functions install`.
- Java 11 or newer. The verified local runtime is Homebrew OpenJDK 21 at `/usr/local/opt/openjdk@21/bin`.
- Firebase CLI available as `firebase`.

## Start Emulators

From the repository root:

```sh
PATH=/usr/local/opt/openjdk@21/bin:$PATH firebase emulators:start \
  --only firestore,auth \
  --project demo-calabash-gardens
```

Keep that terminal open. In a second terminal, seed deterministic fixtures:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
GCLOUD_PROJECT=demo-calabash-gardens \
node scripts/phase34-emulator-verification.js seed
```

The seed command prints the emulator-only admin credentials used for browser testing.

## Start The Emulator-Wired App

Use a free local port. This example uses `3003`:

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
REACT_APP_FIREBASE_APP_ID=1:123456789:web:phase34 \
npm start
```

Open `http://127.0.0.1:3003/#/admin`, sign in with the credentials printed by `seed`, and open Inventory.

## Inventory Success Test

1. Change QA Product A stock from `10` to `13`.
2. Change QA Inventory Event capacity from `30` to `32` and holds from `2` to `4`.
3. Before clicking Save Changes, run:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-calabash-gardens node scripts/phase34-emulator-verification.js set-concurrent-tickets
```

4. Click Save Changes. The UI must report `Inventory changes saved.` and show 13 product units plus 21 of 32 event seats available, with 7 sold and 4 held.
5. Assert persisted data and movements:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-calabash-gardens node scripts/phase34-emulator-verification.js assert-inventory
```

The assertion requires product stock `13`, event capacity `32`, holds `4`, preserved concurrent `ticketsSold: 7`, one product movement of `+3`, and one event-availability movement of `-2`.

## Inventory Conflict Test

1. Reset the product fixtures:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-calabash-gardens node scripts/phase34-emulator-verification.js reset-conflict
```

2. Refresh Inventory. Change QA Product A stock from `10` to `8` and QA Product B stock from `20` to `18`.
3. Simulate a concurrent QA Product A stock change:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-calabash-gardens node scripts/phase34-emulator-verification.js set-concurrent-stock
```

4. Click Save Changes. The UI must identify QA Product A as changed in Firestore, refresh the inventory, and leave no dirty rows.
5. Assert that the transaction made no partial writes:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-calabash-gardens PHASE34_CONFLICT_UI_CONFIRMED=true node scripts/phase34-emulator-verification.js assert-conflict
```

Set `PHASE34_CONFLICT_UI_CONFIRMED=true` only after the browser shows the named QA Product A conflict message and refreshes both rows. The script then requires QA Product A stock `9`, QA Product B stock `20`, and zero movement records; the script postcondition alone cannot prove the Save button was clicked.

## Waitlist Rules Test

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-calabash-gardens node scripts/phase34-emulator-verification.js verify-waitlist
```

The test permits exactly one anonymous submission for an active, published, future, full, waitlist-enabled event. It denies missing, inactive, not-full, waitlist-disabled, unpublished, and past events, plus mismatched event titles and dates. Emulator `PERMISSION_DENIED` logs are expected for these negative cases.

## Cleanup

Remove the deterministic fixtures and emulator-only admin user before stopping the processes:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-calabash-gardens node scripts/phase34-emulator-verification.js cleanup
```

After changing the harness cleanup logic, verify that it preserves unrelated emulator state:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-calabash-gardens node scripts/phase34-emulator-verification.js verify-cleanup-scope
```

This command creates temporary sentinel records in each touched collection plus an unrelated Auth user, runs Phase 34 fixture cleanup, requires every sentinel to survive, and removes the sentinels in a `finally` cleanup. It also removes the normal Phase 34 fixtures.

Stop the React server and Firebase emulators with `Ctrl-C`. Emulator data is ephemeral and must never be exported into the repository.

## Verified Result

On 2026-08-26, the inventory success test, atomic conflict test, and all nine waitlist rule cases passed. Cleanup-scope verification preserved six unrelated documents and one unrelated Auth user, then removed its sentinels. Browser diagnostics contained no new warnings or errors during the corrected final run. Temporary fixtures, the emulator user, the emulator-wired React process, and both Firebase emulators were removed or stopped afterward.
