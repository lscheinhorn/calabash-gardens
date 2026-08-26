# Phase 35 Checkout Verification

This procedure verifies the guarded server-owned PayPal checkout, order ledger, inventory reservation, and payment-recovery flow without contacting PayPal or reading or writing the production Firebase project.

## Safety Boundary

- Use the exact project ID `demo-calabash-gardens`.
- Use only the local Auth emulator at `127.0.0.1:9099`, Firestore emulator at `127.0.0.1:8080`, Functions emulator at `127.0.0.1:5001`, and PayPal mock at `127.0.0.1:8787`.
- `scripts/phase35-checkout-verification.js` exits unless every project ID, emulator host, and PayPal base URL matches those fixed values.
- `functions/paypalGateway.js` accepts a PayPal API override only inside the Functions emulator, only for the exact demo project, and only for an HTTP loopback URL.
- The React app connects to emulators only outside production, only when `REACT_APP_FIREBASE_USE_EMULATORS=true`, and only with a `demo-*` project ID.
- Do not replace the demo project ID with the production project ID.

## Prerequisites

- Project dependencies installed with `npm install`.
- Functions dependencies installed with `npm --prefix functions install`.
- Java 11 or newer. The verified local runtime is Homebrew OpenJDK 21 at `/usr/local/opt/openjdk@21/bin`.
- Firebase CLI available as `firebase` or `npx firebase-tools`.

## Start The PayPal Mock

From the repository root:

```sh
node scripts/paypal-mock-server.js
```

Keep that terminal open. The mock listens only on `127.0.0.1:8787` and supports deterministic create, retrieve, capture, provider-error, pending, definitive-failure, amount-mismatch, and checkout-reference-mismatch cases.

## Start Firebase Emulators

In a second terminal:

```sh
PATH=/usr/local/opt/openjdk@21/bin:$PATH \
PAYPAL_CHECKOUT_ENABLED=true \
PAYPAL_CLIENT_ID=phase35-emulator-client \
PAYPAL_CLIENT_SECRET=phase35-emulator-secret \
PAYPAL_ENV=sandbox \
PAYPAL_API_BASE_URL=http://127.0.0.1:8787 \
firebase emulators:start \
  --only auth,firestore,functions \
  --project demo-calabash-gardens
```

Keep that terminal open. No Storage emulator is needed for this checkout test.

## Run The Automated Matrix

In a third terminal:

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001 \
PAYPAL_API_BASE_URL=http://127.0.0.1:8787 \
node scripts/phase35-checkout-verification.js verify
```

The matrix verifies:

- trusted product, event, shipping, and total recalculation;
- inactive, stale-price, aggregate-stock, aggregate-capacity, past-event, and multi-date-event rejection before PayPal;
- child-only event ticket totals;
- idempotent PayPal order creation;
- wrong-token rejection and expired-session rejection before capture or reservation;
- PayPal approval, amount, currency, and checkout-reference checks before inventory reservation;
- immutable checkout snapshots between create and capture;
- exact product stock and event seat updates from the stored server snapshot;
- simultaneous duplicate capture callbacks without duplicate stock, seats, orders, or movements;
- stock changes between create and capture;
- retained reservations for pending or uncertain captures;
- explicit inventory release only after a definitive PayPal failure;
- a delayed terminal provider response interleaved with stale admin reconciliation, proving only the capture lease owner can release inventory;
- recovery after a lost provider response or an injected finalization interruption;
- authenticated admin reconciliation and non-terminal payment protection.

The command cleans its own Phase 35 fixtures in a `finally` block.

## Manual Admin Review

Seed one paid order and one payment-review record:

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001 \
PAYPAL_API_BASE_URL=http://127.0.0.1:8787 \
node scripts/phase35-checkout-verification.js seed-manual
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
REACT_APP_FIREBASE_APP_ID=1:123456789:web:phase35 \
REACT_APP_PAYPAL_SERVER_CHECKOUT=enabled \
npm start
```

Open `http://127.0.0.1:3003/#/admin` and use the credentials printed by `seed-manual`.

Manual acceptance checks:

1. Orders shows the paid order once with the exact product, event seats, `$135.00` subtotal, `$17.00` shipping, and `$152.00` total.
2. Payment Review shows the unsettled PayPal order. `Check Status` keeps an `APPROVED` but non-terminal order under review and does not advise taking a second payment.
3. Inventory shows the paid product at `9 on hand`, the reviewed product at `1 on hand`, and the paid event at `21 of 30 available` with `7 sold / 2 held`.

## Cleanup

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001 \
PAYPAL_API_BASE_URL=http://127.0.0.1:8787 \
node scripts/phase35-checkout-verification.js cleanup
```

Stop the temporary React server, Firebase emulators, and PayPal mock with `Ctrl-C`. Emulator data is ephemeral and must never be exported into the repository.

## Production Gates

Do not deploy or enable this checkout path until all of the following are approved and complete:

- Run a real PayPal sandbox checkout with dedicated sandbox buyer and seller accounts.
- Complete the real PayPal sandbox registration and signed-delivery test for the disabled webhook recovery path described in `docs/phase36-webhook-verification.md`.
- Define refund, partial-refund, dispute, and void reversal movements.
- Add approved abuse protection for anonymous checkout callables, such as Firebase App Check plus monitored rate limits, before exposing them publicly.
- Review Firebase Functions dependencies under Node 20 and resolve deployment-relevant audit findings.
- Review and deploy Functions plus the matching Firestore rules.
- Set server credentials with Firebase secrets or another approved secret store; never commit them.
- Enable both server and React checkout flags only in the approved environment.
- Remove the legacy browser-capture fallback before Firebase becomes the authoritative live order and inventory path.
- Keep multi-date event ticket sales blocked until occurrence-specific IDs, dates, and capacity are approved.

## Verified Result

On 2026-08-26, the complete 16-scenario deterministic matrix passed against the local PayPal mock and Firebase Auth, Firestore, and Functions emulators. Browser-controlled admin testing confirmed the paid ledger record, payment-review reconciliation control, exact order totals, single inventory decrement, retained uncertain-payment reservation, and event seat calculation. Protected static business content was unchanged, and no production Firebase or PayPal service was contacted. A current production-dependency audit reported 12 findings (1 low, 10 moderate, and 1 high); dependency changes were deliberately deferred to a separately reviewed upgrade phase.
