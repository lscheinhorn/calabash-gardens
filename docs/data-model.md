# Data Model

The current app uses static JavaScript objects instead of a database.

The static resource files are protected business data. Do not edit their values without an explicit product, event, inventory, or content request from Luke.

## Product

Defined in `src/resources/products.js`.

Important fields:

- `title`
- `category`
- `info`, `info1`, `info2`
- `priceOptions`
- `shipping`
- `isHighlighted`
- `isActive`
- `inStock`
- `photos`
- `key`

`key` is generated from `title` with `createKey`.

## Event

Defined in `src/resources/events.js`.

Important fields:

- `title`
- `category`
- `info`
- `date`
- `eventDates`
- `link`
- `priceOptions`
- `shipping`
- `isActive`
- `inStock`
- `photos`
- `key`

Events are rendered one at a time on `/events`, with previous/next navigation. The initial event is selected by comparing event dates to today's date.

## Event Inventory

Defined in `src/resources/inventory.js`.

Inventory keys are human-readable event/date strings. This is fragile because cart/event code must generate exactly matching strings.

## Cart Item

Cart items are derived from products or events and stored in Redux. Important fields include:

- `title`
- `category`
- `price`
- `quantity`
- `shipping`
- `key`
- `priceOptions`

Event cart items currently encode selected date and dietary choices into title/key strings.

## Backend Migration Notes

Before moving this data into Firebase or another backend, document the exact current data shape and preserve current values. A migration should not rename keys, rewrite copy, remove inactive records, or change prices unless Luke explicitly approves that content change.

The target admin-managed backend contract is tracked in `docs/admin-data-shapes.md`.
