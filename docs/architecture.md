# Architecture

## Runtime

The app is a Create React App project using React 18. It is rendered from `src/index.js`, which wraps `App` in the Redux `Provider`.

## Routing

Routes are defined in `src/App.js` using `HashRouter`, `Routes`, and `Route` from `react-router-dom`.

## State

Cart state is managed by Redux Toolkit in `src/Components/Cart/cartSlice.js` and configured in `src/Store.js`.

## Data Sources

Most site data is static and imported from JS files:

- `src/resources/content.js`: home page copy
- `src/resources/products.js`: product catalog
- `src/resources/events.js`: event catalog and event page copy
- `src/resources/inventory.js`: event stock values
- `src/resources/public_keys.js`: public client keys

These resource files are protected business content. Backend prep and refactors should not edit their values without explicit approval.

Future backend work should first introduce a read-only content boundary so UI components can keep their current data shape while the storage layer is designed.

## Checkout

Checkout uses `@paypal/react-paypal-js` in `src/Components/Paypal/Paypal.js`. Cart totals are calculated in the browser.

## Contact

The contact form uses EmailJS from `src/Components/Contact/Contact.js`.

## Dormant Backend Work

Firebase imports and admin/auth code exist but are commented out. The repo does not currently have an active backend data model, active auth, or active security rules.
