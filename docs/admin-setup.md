# Admin Setup

This document tracks the manual setup needed before the admin shell can be used.

## Local Environment

Copy `.env.example` to `.env.local` and fill in the Firebase web app values.

Required variables:

- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

Do not commit `.env.local`.

Optional guarded checkout variables:

- `REACT_APP_PAYPAL_CLIENT_ID`: the matching PayPal sandbox or live browser client ID for the selected environment.
- `REACT_APP_PAYPAL_SERVER_CHECKOUT`: keep blank during the transition; set to `enabled` only in an explicitly approved test or deployment environment.
- `REACT_APP_PAYPAL_WEBHOOK_REVIEW`: keep blank during the transition; set to `enabled` only where the admin should load verified webhook review records. This does not enable the server webhook.

Server-only PayPal credentials belong in the Functions environment or approved secret storage described by `functions/.env.example`; they must never use the `REACT_APP_` prefix.

The disabled webhook path has a separate server gate and configuration:

- `PAYPAL_WEBHOOK_ENABLED`: keep `false` until deployment and webhook registration are explicitly approved.
- `PAYPAL_WEBHOOK_ID`: the ID PayPal assigns to the webhook registered for the exact deployed Functions HTTPS URL.
- `PAYPAL_MERCHANT_ID`: the intended Calabash PayPal merchant/payee ID used to reject captures for another receiver.

`PAYPAL_CHECKOUT_ENABLED` does not enable the webhook, and `PAYPAL_WEBHOOK_ENABLED` does not enable browser checkout. Keep both disabled in production until all gates are approved.

## Firebase Console Setup

Needed before real admin testing:

- Confirm the Firebase project.
- Enable Firebase Authentication.
- Choose email/password or passwordless email link sign-in.
- Create Jette's admin user.
- Create Luke's admin user if Luke should have access.
- Create an `adminUsers` Firestore collection.

Each approved admin should have a document at:

```text
adminUsers/{firebaseAuthUid}
```

Minimum fields:

```json
{
  "active": true,
  "email": "admin@example.com",
  "role": "owner"
}
```

## Current Admin Shell Behavior

- `/admin` is lazy-loaded.
- The shell signs in with Firebase Auth.
- The shell reads `adminUsers/{uid}` to confirm `active: true`.
- Approved admins can create and update Firestore product drafts.
- Approved admins can create and update product categories in Firestore.
- New product IDs are suggested from the product title and locked after saving.
- New category IDs are suggested from the category name and locked after saving.
- Product drafts must use a category from `productCategories`.
- Firestore products show as collapsible admin cards with filters for search, category, published state, active state, and stock state.
- Existing Firestore products edit inline from their product card; the New Product form is only for creating products.
- Approved admins can upload product photos from an expanded product card to Firebase Storage and attach image references to Firestore product drafts.
- Approved admins can view, filter, and edit media metadata in the Photos section.
- Approved admins can validate and seed missing static products into Firestore drafts.
- Approved admins can edit events, site content, and product/event inventory through Firestore-backed draft and inventory flows without changing protected static resource files.
- The Orders section can list and filter normalized Firestore orders, export the filtered list as CSV, and transactionally update only fulfillment status and internal notes. Firestore rules keep payment, source, customer, item, total, create, and delete operations server-owned. When guarded server checkout is enabled, Orders can also show unsettled PayPal checkouts and independently enabled verified webhook review records.
- The guarded PayPal server checkout and independently gated webhook recovery path are emulator-verified but remain disabled and undeployed for public use.
- Public product pages still read static product data.

## Next Guardrail

Before any production checkout switch, follow the deployment gates in `docs/phase35-checkout-verification.md` and `docs/phase36-webhook-verification.md`. This includes real PayPal sandbox checkout and webhook validation, refund/void policy, Functions and Firestore rule review, secret configuration, abuse controls, and explicit approval to deploy and enable the server path.
