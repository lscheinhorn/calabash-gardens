# App Overview

Calabash Gardens is a React website for a Vermont saffron farm and event business. It combines brand storytelling, product sales, event promotion, ticket/deposit checkout, and customer contact.

## Primary User Flows

- Learn about Calabash Gardens on the home page.
- Browse highlighted products.
- Browse the full shop by category.
- View product details and add items to the cart.
- Browse Calabash Experience events.
- Select event date, dietary preferences, adult tickets, and child tickets.
- Pay through PayPal.
- Send a contact message through EmailJS.

## Main Routes

- `/`: home page
- `/shop`: product listing
- `/products/:key`: product detail
- `/events`: Calabash Experience event flow
- `/cart`: cart and PayPal checkout
- `/contact`: contact form
- `/admin`: Firebase sign-in shell and setup status for approved admins; editors are not connected yet

The app uses `HashRouter`, so deployed URLs include `#/`.

## Product Positioning

The site should feel like a working farm storefront: warm, trustworthy, grounded, and practical. The main conversion paths are product purchases and event bookings.
