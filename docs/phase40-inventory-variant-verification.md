# Phase 40 Inventory Variant Verification

This procedure verifies inventory variant initialization, derived product availability, transactional admin saves, conflict handling, draft publishing, and checkout reservation/release behavior without reading or writing production Firebase data.

## Safety Boundary

- Use only a `demo-*` Firebase project with Auth, Firestore, and Functions emulators on loopback addresses.
- Do not deploy Firestore rules, Functions, or React source flags as part of this verification.
- Do not run a product variant migration against production.
- Do not change protected files under `src/resources/`.
- The public storefront remains on its existing static source unless Luke separately approves the source switch.

## Inventory Contract

- A product has exactly one variant per `priceOptions` entry.
- Each variant has a stable nonblank ID, nonblank SKU, matching `priceOptionIndex`, stock, threshold, tracking status, active status, and deterministic sort order.
- Each variant price exactly matches its corresponding displayed price option. Server checkout uses the displayed value as authoritative and rejects mismatches before PayPal.
- The locally verified Firestore rules and ProductAdmin support no more than three variants. The current catalog has no product above that limit.
- `inStock` is derived. It is true only when at least one active variant is either untracked or has positive tracked stock.
- InventoryAdmin may synthesize missing legacy variants for display, but only a successful transaction persists them.
- InventoryAdmin writes no product copy, category, price, shipping, photo, or visibility fields.
- Content/photo-only product drafts preserve the existing inventory fields verbatim and do not synthesize variants for legacy products.
- Product publish and InventoryAdmin claim normalized SKUs in `productSkus` in the same Firestore transaction as the product write.
- Draft publishing merges current operational variant values and then derives `inStock`; it cannot replace newer stock with stale draft data.
- Checkout reservation/decrement and release derive `inStock` from the resulting variants.

## Automated Checks

Run the regular model suite:

```sh
CI=true npm test -- --watchAll=false --runInBand
```

Run the isolated inventory transaction and rule matrix:

```sh
npm run test:inventory-admin-emulators
```

The inventory emulator matrix verifies:

- all missing legacy variants initialize in one admin save;
- custom existing variant IDs and SKUs survive partial-list completion;
- product content fields remain byte-for-byte equivalent apart from operational inventory fields;
- threshold-only changes preserve newer stock and create no movement;
- concurrent same-field stock changes reject the entire bulk save and create no movement;
- malformed legacy values fail closed;
- anonymous writes are denied;
- blank SKUs and incomplete price-option mappings are denied by rules;
- mapped price mismatches are denied by rules;
- an SKU owned by another product rejects the complete inventory transaction;
- SKU ownership records accept only valid approved-admin writes;
- three complete variants are accepted by rules.

Run the transactional draft-publish matrix:

```sh
npm run test:draft-publish-emulators
```

This verifies that publishing preserves newer operational facts, derives product availability, leaves legacy variants absent on content-only publishes, rejects stale review/content conflicts, prevents simultaneous products from claiming one SKU, and writes the live target plus draft status atomically.

Run the Phase 35 loopback checkout matrix using `docs/phase35-checkout-verification.md`. Its final-unit cases must prove:

- reserving or selling the last tracked unit stores `inStock: false`;
- releasing a failed reservation restores stock and stores `inStock: true` when the option is active;
- duplicate or interrupted callbacks do not duplicate stock, seats, orders, or movements.

Finally run:

```sh
npm run build
git diff --check
```

## Manual Emulator UI Check

Use the Phase 34 demo fixtures from `scripts/phase34-emulator-verification.js`; never substitute the production project ID.

Acceptance checks:

1. Inventory shows inline Stock, Low, Track, and Sell controls for products and Capacity, Holds, and Waitlist controls for events.
2. Editing product stock and event capacity/holds enables one bulk Save Changes action.
3. A simulated concurrent `ticketsSold` update survives the admin save.
4. Product stock and event manual-hold deltas create exactly matching movement records.
5. Two edited products plus a simulated same-field stock race reject atomically: the conflicted row refreshes, the unrelated row remains unsaved in the form, and no movement is written.
6. Discard Changes restores the remaining unsaved row.
7. ProductAdmin has no independent Available now checkbox; option-level Sell and Track controls remain.
8. Add Price Option disables at three options.
9. Desktop event/product controls do not overlap or overflow.
10. At a 390 by 844 viewport, inventory controls stack cleanly and Save/Discard/Refresh remain sticky while the table is edited.
11. Browser console contains no app errors or warnings.

## Phase 40 Result

Verified locally on 2026-08-28:

- 42 regular tests passed; 23 emulator-gated tests were skipped in the regular run.
- 9 inventory transaction/rules emulator tests passed.
- 14 transactional draft-publish emulator tests passed.
- The Phase 35 checkout matrix passed all 16 scenario groups, including eight invalid-cart rejections before PayPal, mapped-price mismatch rejection, and final-unit availability assertions.
- Production build passed with the four pre-existing unused import/variable warnings in Cart, CartItem, Main, and the protected events resource.
- Manual emulator UI save, concurrent ticket preservation, stale bulk conflict, unrelated-draft preservation, discard, product option limit, desktop layout, mobile layout, sticky actions, and console checks passed.
- Protected content/resource diff was empty.

## Remaining Production Gates

- Review the exact production variant migration preview, including all proposed IDs, SKUs, active/tracking values, and starting stock.
- Resolve every strict Firebase parity blocker and regenerate a zero-blocker report.
- Review and approve matching Firestore rules and Functions as one production release.
- Run a real PayPal sandbox buyer/seller checkout and signed webhook delivery test.
- Complete abuse protection, refund/reversal policy, generated fallback, media/menu parity, anonymous public-read, and visual parity gates.
- Obtain Luke's explicit approval before merge, push, deploy, production mutation, public-source switch, or checkout enablement.
