# Calabash Gardens

Calabash Gardens is a React storefront and event-booking site for a Vermont saffron farm. It supports product browsing, event promotion, cart management, PayPal checkout, and customer contact.

## Stack

- React 18
- Create React App / `react-scripts`
- React Router with `HashRouter`
- Redux Toolkit
- PayPal React SDK
- EmailJS
- Static JS resource files for products, events, content, and event inventory

## Local Setup

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm start
```

Build for production:

```bash
npm run build
```

## Scripts

- `npm start`: run local development server
- `npm run build`: create production build
- `npm test`: run Create React App test runner
- `npm run deploy`: build and publish with `gh-pages`

## Project Docs

- `AGENTS.md`: operating rules and agent roles
- `PROJECT_STATUS.md`: live source of truth
- `docs/app-overview.md`: product and route overview
- `docs/architecture.md`: technical architecture
- `docs/admin-setup.md`: Firebase/admin setup checklist
- `docs/firestore-rules-plan.md`: draft Firestore security rules notes
- `docs/data-model.md`: current static data model
- `docs/maintenance.md`: common maintenance tasks
- `docs/agent-workflow.md`: Git and phase workflow

## Notes

The app currently uses static product and event data. Firebase config and an admin sign-in shell exist, but admin editing and public content backend data reads are not active.

Before implementation work, confirm scope in `PROJECT_STATUS.md`, use a feature branch, and get Luke's approval.
