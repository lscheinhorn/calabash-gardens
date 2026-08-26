# Phase 36 Webhook Verification

This procedure verifies the disabled PayPal webhook inbox, signature handling, capture recovery, payment-change review, and Firestore ownership rules without contacting PayPal or any production Firebase project.

## Safety Boundary

- Use the exact project ID `demo-calabash-gardens`.
- Use only the loopback Auth emulator at `127.0.0.1:9099`, Firestore emulator at `127.0.0.1:8080`, Functions emulator at `127.0.0.1:5001`, and PayPal mock at `127.0.0.1:8787`.
- `scripts/phase36-webhook-verification.js` exits unless every project ID and host matches those fixed values.
- The PayPal API override remains limited to the exact demo Functions emulator and a loopback URL.
- The webhook endpoint is independently disabled unless `PAYPAL_WEBHOOK_ENABLED=true`, even if callable checkout is enabled.
- Do not replace the demo project ID with the production project ID.

## Start The PayPal Mock

From the repository root:

```sh
node scripts/paypal-mock-server.js
```

The mock listens only on `127.0.0.1:8787`. Its signature endpoint accepts only a signature derived from the exact event bytes embedded in the verification request, so a parse-and-reserialize regression fails the matrix.

## Start Firebase Emulators

In another terminal:

```sh
PATH=/usr/local/opt/openjdk@21/bin:$PATH \
PAYPAL_CHECKOUT_ENABLED=true \
PAYPAL_WEBHOOK_ENABLED=true \
PAYPAL_CLIENT_ID=phase36-emulator-client \
PAYPAL_CLIENT_SECRET=phase36-emulator-secret \
PAYPAL_WEBHOOK_ID=phase36-emulator-webhook \
PAYPAL_MERCHANT_ID=PHASE36MERCHANT \
PAYPAL_ENV=sandbox \
PAYPAL_API_BASE_URL=http://127.0.0.1:8787 \
firebase emulators:start \
  --only auth,firestore,functions \
  --project demo-calabash-gardens
```

No Storage emulator is needed for this phase.

## Run The Automated Matrix

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001 \
PAYPAL_API_BASE_URL=http://127.0.0.1:8787 \
node scripts/phase36-webhook-verification.js verify
```

The matrix verifies:

- invalid signatures return `401` and create no webhook record;
- pretty-printed event bytes are passed unchanged through PayPal verification;
- unknown verified events are durably ignored once;
- four concurrent completed deliveries recover one interrupted capture exactly once;
- one normalized order, one movement per line, and one deterministic capture reference are written;
- capture mismatch, missing checkout, and paid-without-reservation cases enter review without late inventory changes;
- a transient PayPal retrieval failure returns `503`, remains retryable, and succeeds on the second delivery;
- refund, reversal, and pending-refund events enter review without restocking a product, releasing event seats, or writing reversing movements;
- an approved admin can write only the Inventory UI's manual-adjustment movement shape and cannot write provider movements, webhook events, or payment references.

The command removes only Phase 36 fixture IDs in a `finally` block.

## Manual Admin Review

With the mock and emulators running, seed one recovered paid order, one refund review, and one paid-without-reservation review:

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001 \
PAYPAL_API_BASE_URL=http://127.0.0.1:8787 \
node scripts/phase36-webhook-verification.js seed-manual
```

Start a separate emulator-wired React app on a free port using the same environment shown in the Phase 35 manual procedure, plus `REACT_APP_PAYPAL_WEBHOOK_REVIEW=enabled`. Open `/admin` and sign in with the printed emulator-only credentials.

Manual acceptance checks:

1. Orders shows the recovered order once with `$135.00` subtotal, `$17.00` shipping, and `$152.00` total.
2. Payment Review shows the refund as `Manual review only` and does not offer an inventory-changing action.
3. The paid-without-reservation capture remains in review. `Check Status` does not request a second payment or create a late stock decrement.
4. Inventory shows the recovered product at `4 on hand`, the no-reservation product at `4 on hand`, and the event at `21 of 30 available` with `7 sold / 2 held`.

## Cleanup

```sh
GCLOUD_PROJECT=demo-calabash-gardens \
GOOGLE_CLOUD_PROJECT=demo-calabash-gardens \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001 \
PAYPAL_API_BASE_URL=http://127.0.0.1:8787 \
node scripts/phase36-webhook-verification.js cleanup
```

Stop the temporary React server, Firebase emulators, and PayPal mock. Emulator data must never be exported into the repository.

## Production Gates

- Register the exact HTTPS Functions endpoint in a dedicated PayPal sandbox REST app and subscribe only to the approved event set.
- Deliver and inspect a real PayPal sandbox webhook, including PayPal signature verification and retry behavior.
- Store PayPal credentials, webhook ID, and merchant ID in approved server-side secret storage.
- Define refund, partial-refund, reversal, dispute, product-restock, and event-seat-release workflows before they can change orders or inventory.
- Add approved App Check/rate-limit controls for public checkout callables.
- Complete the Node 20 dependency and production audit review.
- Obtain explicit approval before deploying Functions/rules, enabling either PayPal flag, registering a webhook, or switching the public checkout.

## Verified Result

On 2026-08-26, the deterministic webhook matrix and the complete Phase 35 checkout regression matrix passed against isolated local services. Browser-controlled admin testing confirmed the recovered paid order, distinct manual-only refund review, paid-without-reservation review, unchanged no-reservation inventory, exact totals, and event availability. A second browser run confirmed webhook reviews remain visible through the independent admin review flag when checkout is disabled and expose no status action in that mode. Focused independent re-review returned PASS after its three P2 hardening findings were fixed. No production Firebase or PayPal service was contacted, and protected static business content was unchanged.
