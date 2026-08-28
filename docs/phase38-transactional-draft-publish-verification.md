# Phase 38 Transactional Draft Publish Verification

This procedure verifies atomic product, event, and site-content draft publishing without reading or writing production Firebase data.

## Safety Boundary

- Use the exact project ID `demo-calabash-gardens`.
- Use only the loopback Auth emulator at `127.0.0.1:9099` and Firestore emulator at `127.0.0.1:8080`.
- Keep `RUN_DRAFT_PUBLISH_EMULATOR_TESTS=true`; the integration suite otherwise skips.
- Do not replace the demo project ID with the production project ID.
- The normal local app on `127.0.0.1:3001` may be inspected read-only, but do not save, publish, or discard there during this verification.

## Run The Emulator Matrix

From the repository root:

```sh
XDG_CONFIG_HOME=/tmp/firebase-config \
JAVA_HOME=/usr/local/opt/openjdk@21 \
PATH=/usr/local/opt/openjdk@21/bin:/usr/local/opt/node/bin:$PATH \
RUN_DRAFT_PUBLISH_EMULATOR_TESTS=true \
npm run test:draft-publish-emulators
```

The matrix verifies:

- product publishing preserves a concurrent live stock change;
- explicitly clearing an approved optional product field removes it;
- event publishing preserves concurrent ticket sales;
- a live site-content conflict writes neither the live target nor published draft status;
- a draft revision changed after review cannot publish;
- publishing a new product creates the target and marks the draft published atomically;
- two simultaneous publish attempts produce exactly one commit;
- a live record created after a draft-only save is not overwritten;
- an active legacy draft cannot publish against an existing live record;
- discarding a legacy event draft upgrades its metadata and removes retired admin-only fields;
- malformed direct draft writes are denied by Firestore rules.

The expected rules-denial scenario may print one `PERMISSION_DENIED` warning while still passing.

## Application Checks

```sh
PATH=/usr/local/opt/node/bin:$PATH CI=true npm test -- --watchAll=false --runInBand
```

```sh
PATH=/usr/local/opt/node/bin:$PATH npm run build
```

```sh
PATH=/usr/local/opt/node/bin:$PATH npm run functions:check
```

Also run `git diff --check` and confirm the protected static business-content diff is empty.

## Verified Result

On 2026-08-27, all eleven emulator scenarios passed against the isolated demo project. The regular suite passed 27 tests with eleven emulator-only tests skipped, including focused preview-conflict and effective-review checks. The production build passed with the same four existing unused-code warnings, and the Functions syntax check passed. A signed-in read-only browser inspection loaded Site Preview, 74 Products, 10 Events, and Site Content without application console errors. Separate emulator-only browser fixtures confirmed that a conflicting draft shows current live product content/inventory and a visible warning in both Site Preview and Products, while a nonconflicting draft with concurrently updated stock shows current stock and lists only its title change in Review Publish. No browser warnings/errors or real Firestore save, publish, discard, inventory, or content mutation occurred.

## Production Gates

- The changed Firestore rules remain local until Luke explicitly approves deployment.
- No live draft is automatically upgraded or published. An active legacy draft against an existing record must be discarded, reopened, and saved again.
- Approved Firebase admin credentials are a trusted-operator boundary. This phase prevents races and accidental overwrites through the supported portal; it does not make Firebase Console/server-admin access adversarially safe.
- Public storefront reads remain static/default-gated.
- Merge, push, deploy, production-data mutation, and public backend enablement require Luke's explicit approval.
