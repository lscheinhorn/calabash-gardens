# Order Ledger And Reconciliation Plan

This plan defines the backend path for tracking all Calabash sales in one place before changing checkout behavior.

## Current State

- Public PayPal checkout still uses the legacy client-side flow by default, so customer-facing behavior has not changed.
- A guarded server-owned create/capture path exists behind `REACT_APP_PAYPAL_SERVER_CHECKOUT=enabled` and `PAYPAL_CHECKOUT_ENABLED=true`; an independently gated verified webhook path exists behind `PAYPAL_WEBHOOK_ENABLED=true`. Both have been verified only against isolated Firebase emulators and a local PayPal mock.
- Firestore `orders` rules deny client create/delete and all commercial/payment mutations. Approved admins may update only the five fulfillment workflow fields on an existing order.
- The guarded server path writes normalized paid orders and inventory movements and updates tracked product stock and event `ticketsSold` transactionally.
- Product variants can carry Firebase inventory metadata (`sku`, `stockOnHand`, `lowStockThreshold`, and tracking flags) in the admin product draft flow.
- Admin Inventory bulk saves now merge into freshly read product/event documents in one Firestore transaction, preserve concurrent fields that were not edited, and abort if an edited field changed since the screen loaded.
- Local waitlist rules now bind entries to an eligible event, but the public waitlist still needs a protected server endpoint and a per-occurrence date/capacity model before production use.
- Jette may also sell through Square in person, so the system needs a shared sales ledger rather than PayPal-only tracking.

## Guiding Decision

Use one normalized order/sales ledger for all purchase sources:

- `paypal_web`: website checkout through PayPal.
- `square_pos`: Square point-of-sale or Square imported sale.
- `manual`: admin-entered sale or adjustment.
- `refund`: reversal or negative movement tied to an original order.
- `inventory_adjustment`: count correction, waste, comp, or reconciliation adjustment.

Firebase should be the inventory source of truth. PayPal and Square should be treated as payment/source systems that feed verified sales into the Firebase ledger, not as separate inventory systems inside the admin UI.

## Target Firestore Shape

### `orders/{orderId}`

The order document is the business record Jette reviews.

Required target fields:

- `source`: `paypal_web`, `square_pos`, `square_import`, `manual`, or another approved source.
- `sourceOrderId`: external order ID when available.
- `sourcePaymentId`: external payment/capture ID when available.
- `status`: `pending`, `paid`, `partially_refunded`, `refunded`, `void`, or `needs_review`.
- `paymentStatus`: normalized payment state.
- `fulfillmentStatus`: `new`, `in_progress`, `fulfilled`, `picked_up`, `shipped`, `cancelled`, or `needs_review`.
- `createdAt`: timestamp.
- `paidAt`: timestamp or null.
- `customer`: normalized customer name, email, phone, and source IDs when available.
- `shipping`: normalized shipping address and shipping amount when present.
- `totals`: subtotal, shipping, tax, discount, total, currency.
- `items`: normalized line item array.
- `rawSource`: limited source snapshot for audit/debugging.

Line item target fields:

- `lineItemId`: stable local line item ID.
- `type`: `product`, `event`, `fee`, `shipping`, `discount`, or `unknown`.
- `linkedId`: product ID or event ID when mapped.
- `variantId`: product variant ID when the line item is a product option.
- `sku`: product SKU when available.
- `title`: line item display title at time of purchase.
- `quantity`: purchased units.
- `seatCount`: event seats represented by the line item.
- `unitPrice`: unit price in dollars.
- `total`: line total in dollars.
- `capacityGroupKey`: event/date capacity group when relevant.
- `sourceLineItemId`: external line item ID when available.

### `inventoryMovements/{movementId}`

Inventory and capacity changes should be ledgered rather than overwritten.

Required target fields:

- `orderId`: related order ID, if any.
- `source`: same source vocabulary as orders.
- `linkedType`: `product` or `event`.
- `linkedId`: product ID or event ID.
- `variantId`: product variant ID when `linkedType` is `product`.
- `sku`: product SKU when available.
- `capacityGroupKey`: event/date key when relevant.
- `quantityDelta`: negative for sale, positive for restock/refund.
- `reason`: `sale`, `refund`, `manual_adjustment`, `square_import`, `comp`, `waste`, or approved reason.
- `createdAt`: timestamp.
- `createdBy`: system/admin identifier.

For events, the system may denormalize paid seat totals back to `events.ticketsSold` for fast reads, but the ledger should remain the audit trail.

## PayPal Implementation Path

### Phase A: Safe Order Model And Admin View

Build the Firestore order shape and an admin Orders section first.

- Admins can list and inspect orders.
- Admins can filter by source, status, date, customer, product/event, and fulfillment status.
- Admins can update fulfillment notes/status only.
- Admins cannot edit PayPal payment facts.
- Firestore rules permit only fulfillment status, notes, revision, server timestamp, and authenticated updater UID changes on existing orders.

Implementation checkpoint on branch `codex/order-fulfillment-admin`:

- The selected order has a fixed-status fulfillment editor with 2,000-character internal notes.
- Saves use a Firestore transaction and monotonic `fulfillmentRevision`; stale status/notes/revision baselines are rejected and reloaded.
- Refreshing, payment reconciliation, and switching order cards preserve unsaved fulfillment drafts during the current page session. A failed refresh keeps the last loaded orders and drafts visible.
- The Orders toolbar exports only the currently filtered rows as quoted CSV and neutralizes formula-like user-controlled cells.
- Client rules deny order create/delete and every non-fulfillment mutation, including mixed requests that also contain an otherwise valid fulfillment update.
- `docs/phase37-order-fulfillment-verification.md` records the isolated rules matrix and browser acceptance test.
- These rule changes remain local and undeployed until Luke explicitly approves a rules deployment.

### Phase B: Server-Side PayPal Capture

Move PayPal create/capture out of the browser and into Firebase Functions or another approved backend.

Recommended flow:

1. Browser sends cart summary to `createPayPalOrder`.
2. Backend reloads products/events from Firestore and recalculates totals.
3. Backend checks event capacity and product availability.
4. Backend creates PayPal order using server-held PayPal credentials.
5. Browser receives only the PayPal order ID.
6. On buyer approval, browser sends PayPal order ID to `capturePayPalOrder`.
7. Backend checks idempotency, verifies capacity again, captures payment, writes `orders`, writes `inventoryMovements`, and updates `events.ticketsSold` in a transaction.
8. Browser shows success only after backend confirms the saved paid order.

This prevents a user from spoofing an order write or changing totals in the browser.

Implementation checkpoint on branch `codex/paypal-order-ledger-hardening`:

- Luke approved building this scaffold as a guarded next phase. Enabling it for public checkout, deploying Functions, or treating it as inventory-safe still requires explicit approval.
- The browser checkout keeps the current PayPal SDK flow by default; the server path remains explicitly disabled for public use.
- The experimental server path is gated by `REACT_APP_PAYPAL_SERVER_CHECKOUT=enabled` on the React side and `PAYPAL_CHECKOUT_ENABLED=true` on the Functions side.
- Functions require server-only `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_ENV`.
- `createPayPalOrder` reloads Firestore products/events, recalculates prices and shipping, validates stock/capacity, creates PayPal with a stable idempotency key, and persists a token-bound trusted checkout snapshot.
- `capturePayPalOrder` accepts only the PayPal order ID and opaque checkout token. It reloads the saved snapshot and rejects replacement browser cart data.
- Before reserving inventory, capture verifies PayPal approval, amount, currency, and the saved checkout reference. It also rejects a checkout whose commercial Firestore values changed after create.
- Capture transactionally reserves tracked product units and event seats before calling PayPal. A short capture lease prevents duplicate callbacks and reconciliation races.
- Completed captures finalize one normalized `orders/{orderId}` record and deterministic `inventoryMovements` exactly once. Pending or uncertain captures retain the reservation for recovery; only explicit terminal payment failure releases that exact reservation.
- The admin Orders section displays unsettled checkout records and exposes an authenticated `Check Status` action that cannot release a non-terminal approved payment.
- `docs/phase35-checkout-verification.md` records the deterministic emulator and browser test procedure and result.
- This checkpoint still needs a real PayPal sandbox checkout and signed webhook delivery, refund/void reversal handling, dependency review under Node 20, rule/Function deployment approval, and explicit live enablement.
- The legacy browser capture fallback must not remain as the silent production fallback after Firebase orders become authoritative.

### Phase C: PayPal Webhook Reconciliation

Add PayPal webhooks as a safety net after server-side capture.

- Verify webhook signatures server-side.
- Use PayPal event/order/capture IDs for idempotency.
- Fill in missed updates, refunds, disputes, or manual PayPal changes.
- Do not let webhooks double-count inventory movements.
- Reuse the same snapshot verification, reservation ownership, and deterministic order/movement finalization helpers as callable reconciliation.
- Do not release reservations for `APPROVED`, `PENDING`, provider timeout, or unknown states. Release only after a verified terminal non-payment state.

Implementation checkpoint on branch `codex/paypal-webhook-recovery`:

- `paypalWebhook` is an HTTP Function with an independent disabled-by-default gate, server credentials, webhook ID, and expected merchant ID.
- Signature verification returns the exact raw event bytes to PayPal's verification endpoint before any business write based on event content.
- `paypalWebhookEvents/{eventId}` is a server-written, admin-readable inbox with attempt counts, short processing leases, terminal duplicate acknowledgement, and retryable failures.
- Completed capture events re-fetch the full PayPal order and reuse the Phase 35 snapshot, amount, currency, reference, merchant, reservation, and deterministic finalization checks.
- `paymentReferences/paypal_capture_{captureId}` maps captures to normalized orders for later refund/reversal lookup without an order scan.
- A completed payment without a matching preexisting reservation enters review; the webhook does not invent a late stock decrement.
- Refund, reversal, pending-refund, pending-capture, and declined-capture events enter the admin review queue and do not automatically restock products, release event seats, change the order's financial status, or write reversing movements.
- Firestore client rules keep webhook records, capture references, and provider-looking movements server-owned while preserving the existing admin manual-adjustment flow.
- `docs/phase36-webhook-verification.md` records the deterministic emulator matrix and browser acceptance test.
- The checkpoint remains disabled and undeployed. Real PayPal sandbox webhook delivery and approved refund/disposition policy remain production gates.

## Square Reconciliation Path

Square should plug into the same `orders` and `inventoryMovements` model.

### Short Term

Start with manual/admin reconciliation tools:

- Add manual sale/adjustment entries for market sales if Jette needs them before Square API integration.
- Add CSV import later if Square exports are easier than API setup.
- Require product/event mapping before a row can affect inventory.
- Mark imported rows that cannot be mapped as `needs_review`.

### Medium Term

Integrate Square once credentials and product mapping are approved:

- Store Square IDs on products as optional external IDs, such as `externalIds.squareCatalogVariationId`.
- Use Square Orders/Payments data for in-person sales.
- Use Square webhooks for near-real-time POS sale imports.
- Use Square webhook event IDs for idempotency because Square can retry webhooks.
- Import Square sales into Firestore as `source: square_pos` orders and matching inventory movements.

### Source Of Truth

There are two viable models:

- Firestore as Calabash website/admin source of truth, with Square POS sales imported for reconciliation.
- Square as product inventory source of truth, with the website syncing product stock from Square.

Current decision: keep Firestore as the Calabash admin ledger and inventory source of truth. Import PayPal/Square sales into it. Do not make PayPal or Square the inventory master unless Luke and Jette explicitly change that decision later.

## Rules And Security

- Public users must not write `orders`, `inventoryMovements`, products, events, or inventory directly.
- Public checkout callables require an approved abuse-control layer, such as enforced Firebase App Check plus monitored rate limits, before live enablement.
- Admins can read orders and update only the approved fulfillment fields. Each update must increment the revision exactly once, use `request.time`, and identify the authenticated admin UID.
- Server/backend writes payment facts, paid orders, and inventory movements.
- Order IDs and source IDs must be idempotent.
- Approved refunds and voids must create new reversing movements instead of editing historical sale movement quantities. A payment notification alone is not approval to restock a physical product or reopen an event seat.
- Capture must be bound to the exact server-validated order snapshot created for the PayPal order ID; browser-supplied capture contents are never authoritative.
- A payment/inventory failure must produce a recoverable recorded state rather than a captured payment with no saved order.
- Public waitlist writes must move behind a server-owned endpoint with App Check/CAPTCHA and throttling; Firestore field and event-eligibility rules cannot prevent repeated anonymous submissions.
- Multi-date event waitlists require occurrence-specific timestamps and capacity keys. A display-date string plus one canonical event timestamp is not enough to determine whether each session is future or full.

## Admin Orders UI

Current admin features:

- Collapsible Orders section.
- Dark-mode friendly order list.
- Filters: source, payment status, fulfillment status, date range, product/event.
- Order detail drawer/card.
- Customer contact block.
- Line item list.
- Payment/source block.
- Shipping/pickup/fulfillment status and notes.
- Export CSV.
- Stale-edit rejection when another admin changes fulfillment first.

Future admin features:

- Date-range and product/event-specific filter controls beyond the current search/source/payment/fulfillment filters.
- `Needs Review` queue for Square/manual rows that do not map cleanly.
- Carrier, tracking number, and append-only fulfillment history only after their data shapes and workflow are approved.

## Acceptance Criteria Before Public Use

- PayPal totals are recalculated server-side.
- PayPal capture succeeds only through backend.
- Paid order is saved exactly once.
- Event `ticketsSold` increments exactly once per paid event line item.
- Full events cannot be oversold by simultaneous checkout.
- Admin order list shows the saved PayPal order.
- Uncertain capture states remain visible and recoverable after the browser leaves.
- Verified completed-capture webhooks recover an interrupted finalization exactly once.
- Refund/void handling is defined before inventory counts are considered final.
- Square sales can be represented without changing PayPal or website order shape.

## Open Decisions For Luke And Jette

- Approve deploying Firebase Functions for PayPal capture after sandbox testing is ready.
- Choose PayPal sandbox/live credential setup.
- Decide whether to build manual Square sale entry before Square API integration.
- Decide whether Square product catalog IDs should be mapped onto website products.
- Decide whether product inventory should be tracked in Firestore first or synced from Square later.
- Decide how refunds, partial refunds, comps, and market cash sales should appear in Jette's workflow.
