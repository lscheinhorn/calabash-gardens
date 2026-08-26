# Phase 37 Order Fulfillment Plan

This phase completes a narrow admin Orders workflow for fulfillment status, internal notes, and filtered CSV export. It does not change checkout, payment facts, inventory, public storefront behavior, production Firebase data, or protected static business content.

## Approved Boundary

An approved admin may update only these fields on an existing order:

- `fulfillmentStatus`
- `fulfillmentNotes`
- `fulfillmentRevision`
- `fulfillmentUpdatedAt`
- `fulfillmentUpdatedBy`

Allowed statuses remain the existing order-ledger vocabulary:

- `new`
- `in_progress`
- `fulfilled`
- `picked_up`
- `shipped`
- `cancelled`
- `needs_review`

`cancelled` describes fulfillment only. It does not refund, void, reverse, or otherwise alter payment or inventory.

Admins cannot create or delete orders through this workflow. Firestore rules must reject any client attempt to change source identifiers, payment status, customer data, shipping/payment facts, line items, totals, timestamps owned by payment processing, or any other order field.

## Concurrency And Validation

- Fulfillment notes are plain text, optional, and limited to 2,000 characters.
- The client writes the authenticated admin UID and a server timestamp; rules verify both.
- Saving uses a Firestore transaction.
- Each save increments `fulfillmentRevision` exactly once. The transaction compares the stored revision, status, and notes with the values loaded into that editor. If another admin changed fulfillment, the save aborts and reloads the current order instead of overwriting it.
- Concurrent changes to unrelated server-owned fields are preserved because the transaction updates only the five approved fulfillment fields.

## Admin UI

- The selected order detail includes one compact Fulfillment editor.
- Status uses a fixed select menu; notes use a labeled text area with a character count.
- Save is disabled when the draft is unchanged, invalid, or currently saving.
- Switching between orders, refreshing Orders, or reconciling a payment preserves each unsaved fulfillment draft during the current page session. Saving or resolving a conflict resets only that order's draft.
- A filtered CSV download exports the orders currently shown by search/source/payment/fulfillment filters.
- CSV fields are quoted correctly, newlines are normalized, and user-controlled text that could be interpreted as a spreadsheet formula is escaped.

## Verification

Automated checks must cover:

- valid admin fulfillment update allowed;
- unauthenticated update denied;
- order create/delete denied;
- invalid status, oversized notes, wrong updater UID, and non-server timestamp denied;
- payment/source/customer/item/total mutation denied, including when mixed with a valid fulfillment update;
- pure model validation, stale fulfillment conflict detection, and CSV escaping;
- existing checkout/webhook matrices and React tests remain green;
- protected static business files remain unchanged.

Manual browser checks must cover:

- editing fulfillment status and notes from Orders;
- saved values and status badge surviving reload;
- a concurrent fulfillment edit being rejected without partial overwrite;
- payment IDs, payment status, totals, and item quantities remaining unchanged;
- filtered CSV download containing the expected order and escaped cells;
- no application errors in light or dark admin styling.

## Production Gates

- Firestore rule changes remain local until Luke approves a rules deployment.
- The public checkout and PayPal webhook remain disabled and undeployed.
- No production order is edited during this phase.
- Merge, push, deploy, or public backend enablement still requires Luke's explicit approval.
