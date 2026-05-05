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

Before shipping product changes, verify:

- Product appears in the expected category.
- Product image renders.
- Price options are correct.
- Shipping amount is correct.
- `isActive` and `inStock` match business intent.
- Cart and PayPal totals are correct.

## Updating Events

Edit `src/resources/events.js` and, when seats are limited, `src/resources/inventory.js`.

Before shipping event changes, verify:

- Event date uses `new Date(year, monthIndex, day)`.
- Displayed date in `eventDates` matches the real event date.
- Menu or PDF links point to the right asset.
- Photos are present or an intentional placeholder is used.
- Deposit/full-price copy matches checkout amount.
- Adult, child, vegetarian, and gluten-free options calculate correctly.
- Inventory keys match generated cart item titles.

## Deployment

Deployment target needs confirmation. `firebase.json` is currently commented out, while `package.json` includes a `homepage` value and a `gh-pages` deploy script.
