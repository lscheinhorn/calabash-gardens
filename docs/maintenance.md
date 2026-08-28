# Maintenance

## Local Setup

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Build the app:

```bash
npm run build
```

In this Codex environment, npm may require:

```bash
PATH=/usr/local/opt/node/bin:$PATH npm run build
```

## Updating Products

Edit `src/resources/products.js`.

Only edit this file when Luke explicitly asks for a product/content change or approves a migration plan.

Before shipping product changes, verify:

- Product appears in the expected category.
- Product image renders.
- Price options are correct.
- Shipping amount is correct.
- `isActive` and `inStock` match business intent.
- Cart and PayPal totals are correct.

## Updating Events

Edit `src/resources/events.js` and, when seats are limited, `src/resources/inventory.js`.

Only edit these files when Luke explicitly asks for an event/inventory/content change or approves a migration plan.

Before shipping event changes, verify:

- Event date uses `new Date(year, monthIndex, day)`.
- Displayed date in `eventDates` matches the real event date.
- Menu or PDF links point to the right asset.
- Photos are present or an intentional placeholder is used.
- Deposit/full-price copy matches checkout amount.
- Adult, child, vegetarian, and gluten-free options calculate correctly.
- Inventory keys match generated cart item titles.

## Deployment

The customer site currently deploys to GitHub Pages through the explicit `npm run deploy` command. `firebase.json` configures Functions, Firestore rules, Storage rules, and local emulators, but it does not configure Firebase Hosting.

Keep `public/CNAME` set to `www.calabashgardens.com`. Create React App copies it into `build/CNAME`, which prevents a GitHub Pages deployment from dropping the live custom-domain mapping.

The stale Firebase-generated pull-request and `main`-push Hosting workflows were removed in Phase 42. Firebase Hosting remains a separately reviewed future migration. Never use an unscoped `firebase deploy`; deploy only an explicitly approved Firebase target such as `--only firestore:rules`.

Do not deploy without Luke's explicit approval.
