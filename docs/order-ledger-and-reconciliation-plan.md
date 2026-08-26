# Order Ledger And Reconciliation Plan

This plan defines the backend path for tracking all Calabash sales in one place before changing checkout behavior.

## Current State

- PayPal checkout is client-side in `src/Components/Paypal/Paypal.js`.
- PayPal returns an order ID and capture details in the browser after approval, but the site only logs those details and shows a thank-you message.
- Firestore `orders` rules currently deny client writes.
- Event capacity can be represented in Firestore events, but `ticketsSold` is not authoritative until confirmed orders write it.
- Product variants can carry Firebase inventory metadata (`sku`, `stockOnHand`, `lowStockThreshold`, and tracking flags) in the admin product draft flow.
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
- Client writes remain denied unless a temporary, clearly marked testing rule is explicitly approved.

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

Implementation checkpoint on branch `codex/preview-edit-drawer`:

- Luke approved building this scaffold as a guarded next phase. Enabling it for public checkout, deploying Functions, or treating it as inventory-safe still requires explicit approval.
- A Firebase Functions source folder exists at `functions/`.
- The browser checkout keeps the current PayPal SDK flow by default.
- The experimental server path is gated by `REACT_APP_PAYPAL_SERVER_CHECKOUT=enabled` on the React side and `PAYPAL_CHECKOUT_ENABLED=true` on the Functions side.
- Functions require server-only `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_ENV`.
- `createPayPalOrder` and `capturePayPalOrder` reload Firestore products/events, recalculate product/event line prices, enforce active availability, product variant stock, event capacity, and trusted shipping totals before creating/capturing through PayPal.
- `capturePayPalOrder` can write a normalized `orders/{orderId}` document after capture.
- `capturePayPalOrder` now writes `inventoryMovements`, decrements tracked product variant stock, and increments `events.ticketsSold` for capacity-tracked events in the same idempotent Firestore transaction that writes the order.
- This checkpoint still needs PayPal sandbox testing before public use. Do not enable it for public checkout until sandbox checkout, duplicate-callback idempotency, oversell, refund, and failure/reconciliation scenarios are verified.

Checkpoint blockers found during the 2026-08-26 review:

- `createPayPalOrder` must persist the server-validated cart snapshot under the created PayPal order ID. `capturePayPalOrder` must load that trusted snapshot instead of accepting replacement cart contents from the browser.
- The capture flow needs an approved reservation or compensation/recovery design. Capturing payment before a Firestore stock/order transaction can leave a customer charged if concurrent inventory changes make the transaction fail.
- Product stock updates must read and update the current Firestore variant inside a transaction instead of writing a complete variants array from a stale browser snapshot.
- The Functions path remains disabled and non-deployable until these blockers are implemented and sandbox-tested.

### Phase C: PayPal Webhook Reconciliation

Add PayPal webhooks as a safety net after server-side capture.

- Verify webhook signatures server-side.
- Use PayPal event/order/capture IDs for idempotency.
- Fill in missed updates, refunds, disputes, or manual PayPal changes.
- Do not let webhooks double-count inventory movements.

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
- Admins can read orders and update fulfillment fields.
- Server/backend writes payment facts, paid orders, and inventory movements.
- Order IDs and source IDs must be idempotent.
- Refunds and voids must create reversing movements instead of editing historical sale movement quantities.
- Capture must be bound to the exact server-validated order snapshot created for the PayPal order ID; browser-supplied capture contents are never authoritative.
- A payment/inventory failure must produce a recoverable recorded state rather than a captured payment with no saved order.

## Admin Orders UI

Expected admin features:

- Collapsible Orders section.
- Dark-mode friendly order list.
- Filters: source, payment status, fulfillment status, date range, product/event.
- Order detail drawer/card.
- Customer contact block.
- Line item list.
- Payment/source block.
- Shipping/pickup/fulfillment status and notes.
- Export CSV.
- `Needs Review` queue for Square/manual rows that do not map cleanly.

## Acceptance Criteria Before Public Use

- PayPal totals are recalculated server-side.
- PayPal capture succeeds only through backend.
- Paid order is saved exactly once.
- Event `ticketsSold` increments exactly once per paid event line item.
- Full events cannot be oversold by simultaneous checkout.
- Admin order list shows the saved PayPal order.
- Refund/void handling is defined before inventory counts are considered final.
- Square sales can be represented without changing PayPal or website order shape.

## Open Decisions For Luke And Jette

- Approve deploying Firebase Functions for PayPal capture after sandbox testing is ready.
- Choose PayPal sandbox/live credential setup.
- Decide whether to build manual Square sale entry before Square API integration.
- Decide whether Square product catalog IDs should be mapped onto website products.
- Decide whether product inventory should be tracked in Firestore first or synced from Square later.
- Decide how refunds, partial refunds, comps, and market cash sales should appear in Jette's workflow.
