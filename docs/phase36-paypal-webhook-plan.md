# Phase 36 PayPal Webhook Plan

This phase adds a disabled, verified PayPal webhook path for automatic capture recovery and payment-change review. It does not deploy Functions, register a live webhook, enable server checkout, or change public storefront behavior.

## Why This Phase Exists

The Phase 35 callable capture path safely records uncertain payments for admin review. It still depends on the browser callback or an admin clicking `Check Status` to converge a captured payment into the order ledger. A verified PayPal webhook provides an independent recovery signal when the buyer closes the page or a response is lost.

PayPal documents `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.REFUNDED`, and `PAYMENT.CAPTURE.REVERSED` as Payments v2 webhook events. PayPal also requires webhook verification and retries non-2xx deliveries. References:

- [PayPal webhook integration and verification](https://developer.paypal.com/api/rest/webhooks/rest/)
- [PayPal webhook event names](https://developer.paypal.com/api/rest/webhooks/event-names/)
- [PayPal verify-webhook-signature API](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post/)
- [PayPal payment related IDs](https://developer.paypal.com/api/payments/v2/definitions/supplementary_data/)

## Approved Implementation Boundary

### Automatic Capture Recovery

For a verified `PAYMENT.CAPTURE.COMPLETED` event:

1. Extract the PayPal order ID from `resource.supplementary_data.related_ids.order_id` and the capture ID from `resource.id`.
2. Load the existing `paypalCheckouts` session and normalized order record.
3. Retrieve the order from PayPal instead of trusting webhook amount/status fields by themselves.
4. Reuse the trusted checkout snapshot, amount/currency/reference checks, capture verification, deterministic order write, and deterministic movement IDs from Phase 35.
5. Finalize only when inventory is already reserved for that checkout. A completed payment without a reservation enters review; the webhook must not invent stock after payment.
6. Treat duplicate and concurrent webhook deliveries as idempotent.

### Refund, Reversal, And Dispute Review

Verified refund/reversal-related events create an admin-visible review record but do not automatically change inventory.

That is intentional:

- A product refund does not prove the physical item was returned in resalable condition.
- A ticket refund does not define whether a seat should reopen, remain held, or move to a waitlist customer.
- A partial monetary refund does not identify which line item or quantity should be restocked.
- Disputes and reversals may require evidence and fulfillment review before inventory changes.

Jette or Luke must approve a concrete restock/seat-release policy before refund events can write reversing inventory movements. Until then, the original sale movement remains immutable and the review queue prevents silent inventory corruption.

## Security And Idempotency

- The endpoint is separately gated by `PAYPAL_WEBHOOK_ENABLED=true` and requires a server-only `PAYPAL_WEBHOOK_ID` plus PayPal server credentials.
- Every delivery is verified against PayPal before any Firestore read/write based on its contents. The gateway sends PayPal the exact raw webhook event bytes received by Firebase; it does not parse and reserialize the event before verification.
- Capture verification also checks the configured `PAYPAL_MERCHANT_ID` against PayPal's capture payee before finalization.
- The production verification path uses PayPal's `verify-webhook-signature` API. The local emulator uses the loopback PayPal mock; the gateway's existing exact-demo-project override prevents an emulator URL from being used in production.
- `paypalWebhookEvents/{eventId}` is server-write-only and admin-read-only.
- Each event uses a Firestore processing lease so concurrent duplicates cannot finalize or enqueue review twice. Failed processing can be retried after the lease expires.
- The event record stores only identifiers, event type, processing state, timestamps, and a concise review reason. It does not duplicate the complete webhook payload.
- Invalid signatures receive a non-2xx response and make no business-data writes.
- Unrecognized verified event types are recorded as ignored and do not touch orders or inventory.
- Successful finalization writes a deterministic `paymentReferences/paypal_capture_{captureId}` record so later refund and reversal resources can resolve back to the original PayPal order without scanning orders.
- Client Firestore rules allow only the admin Inventory UI's manual-adjustment movement shape. Provider-looking sale or refund movements, webhook inbox records, and payment references remain server-only.

## Admin Behavior

- The Orders page loads only review-required webhook records when the separate admin review flag is enabled. Capture status actions remain available only when guarded server checkout is also enabled.
- Capture-recovery records continue to offer `Check Status`.
- Refund, reversal, and dispute records display a clear manual-review reason without a misleading automatic inventory action.
- Existing paid orders and inventory rows remain visible through the same components.

## Emulator Test Matrix

- invalid signature rejected with no event/order/inventory write;
- verified unknown event recorded once as ignored;
- completed webhook finalizes an interrupted captured checkout exactly once;
- concurrent duplicate completed deliveries write one order and one movement per line;
- mismatched order/capture identifiers enter review without inventory mutation;
- completed payment without a reservation enters review without late stock decrement;
- refund/reversal event enters review and does not restock products or release seats;
- duplicate refund/reversal delivery remains one review item;
- processing failure remains retryable after the event lease expires;
- exact pretty-printed event bytes survive the local signature round trip;
- capture-to-order payment references resolve later refund resources;
- admin clients may create the approved manual adjustment shape but cannot impersonate provider movements or write webhook/reference records;
- protected static business files remain unchanged.

## Production Gates

- Real PayPal sandbox webhook registration and signed delivery test.
- Confirm the exact event subscriptions for the Calabash PayPal REST app.
- Decide product-restock, event-seat, partial-refund, dispute, and reversal policies.
- Add an approved financial refund ledger and order-status transition policy; this phase records those payment changes for review only.
- Configure server secrets without committing them.
- Add approved App Check/rate-limit controls for public checkout callables.
- Complete Node 20 dependency review.
- Obtain explicit approval before deploying Functions/rules or enabling either checkout flag.
