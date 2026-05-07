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
- Approved admins can upload product photos to Firebase Storage and attach image references to Firestore product drafts.
- Approved admins can validate and seed missing static products into Firestore drafts.
- Event, site content, inventory, and checkout editors are not connected yet.
- Public product pages still read static product data.

## Next Guardrail

Before editor work begins, `firestore.rules` must be reviewed so only approved admins can write admin-managed content.

The first admin user must be created manually in the Firebase console before the draft rules are deployed.

Before real product photo upload testing, `storage.rules` must be reviewed and deployed so only approved admins can upload public site images.
