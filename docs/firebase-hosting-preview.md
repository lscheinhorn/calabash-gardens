# Firebase Hosting Preview

## Purpose

Phase 45 prepares a temporary Firebase Hosting channel for route, header, and visual review before any custom-domain or live Hosting cutover.

The existing customer site remains on GitHub Pages until Luke separately approves the final migration. A preview-channel deployment does not change DNS, the GitHub Pages deployment, Firebase rules, Functions, Storage objects, or Firestore data.

Current reviewed channel:

- URL: `https://calabash-54fb5--phase45-preview-rs478tis.web.app`
- Source commit: `65f1532`
- Expires: 2026-09-10 16:26:10 America/New_York

## Preview Contract

- Firebase project and Hosting site: `calabash-54fb5`
- Channel name: `phase45-preview`
- Channel expiration: seven days after each preview deployment
- Public products: static source
- Public events and site content: existing static source
- Firebase emulators: off
- Server PayPal checkout: off
- PayPal webhook review: off
- Routing: clean `BrowserRouter` URLs backed by a Firebase SPA rewrite
- Legacy links: recognized `#/...` app routes are converted to clean URLs before React renders

The preview URL is public. Public actions that could create external or production side effects are disabled:

- PayPal checkout does not render an actionable payment control.
- Contact submission does not call EmailJS.
- Event waitlist submission does not write Firestore.
- Password reset is hidden.

Approved admins may sign in only to inspect the Firestore-backed site preview. The temporary channel exposes no editor sections, edit-mode control, upload control, inventory action, draft action, or publish action.

Direct `/admin/preview/...` routes also ignore `?edit=content` in this build. The restriction is enforced inside the preview frame itself, not only by hiding controls on the parent admin page.

## Existing Release Protection

`npm run deploy` remains the GitHub Pages release path. Its predeploy build explicitly sets hash routing, so the current host and its `#/...` URLs remain refresh-safe during evaluation.

The Firebase preview build explicitly sets browser routing. This keeps clean routes limited to a host that supplies the required SPA rewrite.

## Commands

Run configuration checks:

```bash
npm run test:firebase-hosting-config
```

Build the temporary Firebase preview artifact:

```bash
npm run build:firebase-preview
```

Deploy the approved temporary channel:

```bash
npm run deploy:firebase-preview
```

The deploy command targets only Hosting on the explicitly named project/site. It is not a production Hosting release command.

## Headers

The preview sends a report-only Content Security Policy while required Firebase, PayPal, EmailJS, font, stylesheet, Storage, and YouTube requests are observed. It also sends:

- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`

HTML and rewritten app routes use `Cache-Control: no-cache`. Hashed files under `/static/**` use a one-year immutable cache.

The report-only PayPal origins are sufficient for this checkout-disabled preview. They are not approval to enforce this policy or enable live checkout. Re-review PayPal's then-current CSP and Venmo requirements before either change.

## Live Cutover Gate

Do not connect `www.calabashgardens.com` or deploy the live Hosting channel until a separate review confirms:

1. Direct load, refresh, history, and internal navigation for all public, product, and admin routes.
2. Legacy `#/...` links convert correctly.
3. Desktop, tablet, mobile, keyboard, and admin-preview behavior pass.
4. CSP reports show every required origin and no unexplained dependency.
5. The intended production checkout, contact, waitlist, admin-write, and public-data-source flags are explicit.
6. Firebase Auth authorized domains include the final custom domain.
7. DNS records, certificate readiness, rollback point, and post-cutover checks are recorded.
8. Luke explicitly approves merge and live cutover.

GitHub Pages remains the rollback host until the Firebase custom domain is verified. Do not remove its branch, custom-domain file, or deployment path as part of preview work.
