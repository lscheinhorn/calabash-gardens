# Phase 42 Admin Release Candidate

Date: 2026-08-28

Branch: `codex/phase42-release-candidate`

Candidate parent: `38d3740` (`feat: prepare automatic product variant identities`)

## Purpose

This gate prepares the accumulated admin portal, transactional inventory foundation, and automatic product/variant identities for an explicitly approved release. It does not merge, push, deploy, write Firestore data, switch the public storefront to Firestore, or enable server PayPal checkout.

## Git Scope

`main` and `origin/main` currently point to `ba6ffa0`. Once this release-gate change is committed, the candidate is a linear descendant containing 50 commits beyond that point: 49 accumulated implementation commits plus this workflow/documentation gate.

- 124 files changed;
- 45,454 insertions and 872 deletions;
- the accumulated media/admin preview, draft publishing, inventory, order review, guarded checkout/webhook scaffolds, parity tooling, and product identity work;
- no difference in the protected static product, event, content, inventory, image, or public-key files.

Because this is the accumulated local admin/backend program rather than a one-commit SKU patch, release approval must cover the complete candidate.

## Production Switches

The reviewed build keeps customer-facing data and payment behavior unchanged:

- `REACT_APP_PUBLIC_PRODUCTS_SOURCE` is absent, so products continue to load from the protected static catalog.
- Public events and site content continue to use the static data. Firestore event/content adapters are used only by the admin preview.
- `REACT_APP_PAYPAL_SERVER_CHECKOUT` and `REACT_APP_PAYPAL_WEBHOOK_REVIEW` are absent, so server checkout and webhook-review UI remain disabled.
- Firestore rules keep products, events, site content, orders, inventory movements, drafts, and `productSkus` restricted to approved admins.
- Firebase Functions and Storage rules are not part of the proposed deployment.
- `firebase.json` does not configure Firebase Hosting. The customer site remains on GitHub Pages through `npm run deploy`.
- The stale Firebase-generated GitHub Actions workflows have been removed from this candidate. They attempted Firebase Hosting deployments on every pull request and `main` push despite Hosting being deferred and unconfigured. Git history retains them if Firebase Hosting is intentionally designed later.

## Verification

- `npx firebase-tools deploy --only firestore:rules --project calabash-54fb5 --dry-run` compiled successfully without deploying.
- `npm run deploy -- --no-push` built the exact GitHub Pages artifact and created no remote publication.
- The complete React test run passed 48 tests across 6 suites, with 23 explicitly gated emulator tests skipped in that ordinary run.
- The separately enabled emulator runs passed all 14 draft-publish transaction tests and all 9 inventory/SKU transaction tests.
- The Firebase parity model passed 16 tests, the product-variant migration model passed 14 tests, and the Functions syntax check passed.
- The production build loaded the static Shop and the Firebase-configured admin sign-in screen from a temporary local server.
- Live-versus-candidate browser comparison matched Home, Shop, a product detail, Contact, and a populated Cart in text, headings, image counts, and layout dimensions.
- The populated Cart matched `$15` subtotal, `$17` shipping, and `$32` total.
- Events has one intentional difference: the live page still shows dead purchase controls for the September 20, 2025 event, while the candidate displays `This event has passed.` This is the previously approved past-event purchase safeguard.
- Release audit found and removed the two stale automatic Firebase Hosting workflows. No replacement deployment automation was added; site publication remains the explicit `npm run deploy` GitHub Pages command.
- The worktree remained clean after both dry-runs.

## Approved Release Sequence

Run only after Luke explicitly approves merge, push, Firestore-rules deployment, and GitHub Pages deployment:

1. Confirm this branch is clean and rerun the final test/build checks.
2. Fast-forward `main` to this reviewed branch and push `main`. The candidate removes the stale Firebase Hosting workflows, so this push must not initiate a Firebase Hosting deployment.
3. Deploy Firestore rules only to `calabash-54fb5`.
4. Deploy the current production build to GitHub Pages with `npm run deploy`.
5. Verify the live public routes remain on static data and verify Jetta can sign in to the live admin portal.
6. Rerun `npm run check:product-variant-migration`. Stop if any blocker remains.
7. Hand off Inventory to Jetta only after the preview reports zero blockers. Jetta must enter a real quantity for every product option before saving each incomplete product.

Do not deploy Functions or Storage rules, set public Firestore source flags, enable PayPal server flags, or perform a production data import in this release.

Firebase Hosting remains a separate future architecture and DNS phase. Do not restore or regenerate Firebase Hosting workflows until Hosting configuration, environment injection, custom-domain migration, preview behavior, and rollback have been reviewed and explicitly approved.

## Rollback Boundary

Record the pre-release `main`, `gh-pages`, and deployed Firestore-rules revisions before deployment. If verification fails, redeploy the previously reviewed GitHub Pages artifact and previous Firestore rules from their recorded commits. Do not use a destructive Git reset.

## Gate

Phase 42 may be committed on its feature branch. Merge, push, rules deployment, GitHub Pages deployment, and production inventory entry still require explicit approval.
