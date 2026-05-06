# Admin Backend Plan

This plan prepares a safe admin editor so Jette can update products, events, inventory, images, and site content herself.

## Current Decision

Recommended backend: Firebase Auth, Firestore, and Firebase Storage.

Why:

- The repo already has an env-driven Firebase config foundation and dormant admin/Auth/Firestore UI experiments.
- It fits a small owner-managed admin workflow.
- Auth, document storage, image storage, and security rules can live in one stack.
- It avoids building and hosting a custom server before the business needs one.

No Firebase rule, data migration, or public data connection should be changed until Luke approves implementation of a specific phase.

## Current Repo State

The public site is still powered by static JavaScript resource files:

- Products: `src/resources/products.js`
- Events and event blurb: `src/resources/events.js`
- Event inventory: `src/resources/inventory.js`
- Site copy: `src/resources/content.js`
- PayPal keys: `src/resources/public_keys.js`

The current admin/backend code is not production-ready:

- `/admin` exists as a route, but `src/Components/Admin/Admin.js` is fully commented out.
- `src/firebase-config.js` exports env-driven Firebase `app`, `auth`, `db`, and `storage` values, which remain `null` until required environment variables are configured.
- `src/Components/ProductEditor/ProductEditor.js` is fully commented out.
- `src/Components/Editor/Editor.js` imports Firebase services, but it is not mounted through the inactive admin route.
- `package.json` lists the real `firebase` dependency.
- Orders are not persisted to a backend after PayPal approval.

These facts are blockers to a safe admin editor and should be handled in planned phases, not patched casually.

## Hard Guardrails

- Do not edit `src/resources/products.js`, `src/resources/events.js`, `src/resources/content.js`, `src/resources/inventory.js`, `src/resources/images/**`, or `src/resources/public_keys.js` during backend prep unless Luke asks for the exact content change.
- Do not change customer-facing site behavior unless the phase explicitly says so.
- Do not deploy without Luke's approval.
- Do not merge without Luke's approval.
- Keep each phase on its own `codex/` branch from clean `main`.
- Use a subagent scope review before merge readiness.

## Proposed Admin Capabilities

### Products

- Create product.
- Edit title, category, description, price options, shipping, active, highlighted, and in-stock flags.
- Add/select product images.
- Deactivate products without deleting records.

### Events

- Create event.
- Edit title, date, display dates, description paragraphs, ticket/deposit price options, menu link, active flag, in-stock flag, and images.
- Deactivate future events without deleting records.
- Keep historical events available for reference while preventing purchases when appropriate.

### Site Content

- Edit homepage/header/banner/about/team/offering copy.
- Keep copy grouped by page/section so Jette does not need to edit code.

### Inventory And Orders

- First version should avoid overpromising.
- Product inventory can remain `inStock` true/false until a deeper inventory system is approved.
- Event capacity needs a clear model before selling limited seats from backend data.
- PayPal order persistence is a separate phase and should not be bundled into the first admin editor.

## Data Model Draft

### `products`

Document ID should be stable and not derived from editable display title.

Suggested fields:

- `slug`
- `title`
- `category`
- `info`
- `info1`
- `info2`
- `priceOptions`
- `shipping`
- `isHighlighted`
- `isActive`
- `inStock`
- `photos`
- `createdAt`
- `updatedAt`

### `events`

Document ID should be stable and not derived from editable display title.

Suggested fields:

- `slug`
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
- `capacity`
- `createdAt`
- `updatedAt`

### `siteContent`

Suggested documents:

- `home`
- `banner`
- `about`
- `team`
- `offerings`

The first migration should preserve the existing `content.js` shape as closely as possible.

### `adminUsers`

Suggested fields:

- `uid`
- `email`
- `role`
- `isActive`

Security rules should allow writes only for approved admin users.

## Implementation Phases

### Phase 1: Content Boundary

Goal: Introduce read-only data access modules that return the current static data unchanged.

Initial implementation:

- `src/data/siteData.js` re-exports current static resource values from protected files.
- `src/data/siteData.js` exposes a minimal set of read-only helpers for highlighted products, product lookup by key, and active events.
- Public components import through `src/data/siteData.js` instead of importing product, event, inventory, key, or content resources directly.
- The adapter is intentionally read-only and does not change data shape or values.

Allowed changes:

- New adapter files.
- UI imports updated to read through adapters.
- Tests or simple verification scripts.

Protected files stay unchanged.

Acceptance criteria:

- Build passes.
- Site looks and behaves the same.
- Product/event/content values are unchanged.
- Product listing, product detail, events page, cart totals, and PayPal item payloads are smoke-checked.
- Subagent verifies no protected data edits.

### Phase 2: Firebase Setup Plan

Goal: Prepare exact Firebase/Auth/Firestore/Storage setup steps and security model.

Allowed changes:

- Documentation.
- Optional config template only if approved.

Not allowed:

- No dependency changes.
- No active Firebase config.
- No security rules deployment.

Acceptance criteria:

- Luke approves backend stack and Firebase project.
- Admin users and roles are defined.
- Security-rule strategy is written before code.

### Phase 3: Read-Only Backend Loader

Goal: Add backend read path behind the content boundary, with static fallback.

Allowed changes only after approval:

- Firebase dependency/config.
- Read-only Firestore loader.
- Feature flag or environment switch.

Acceptance criteria:

- Static site still works without backend data.
- Backend reads do not change displayed content unless seeded data matches current content.
- Build passes.

### Phase 4: Admin Auth Shell

Goal: Build a protected admin login and dashboard shell.

Acceptance criteria:

- Only approved admin users can access editor screens.
- Unauthorized users cannot write.
- No product/event/content writes yet.

### Phase 5: Product Editor

Goal: Let Jette create/edit/deactivate products.

Acceptance criteria:

- Edits save to backend.
- Public product pages read backend data safely.
- Product data can be backed up/exported.
- No checkout regression.

### Phase 6: Event Editor

Goal: Let Jette create/edit/deactivate events.

Acceptance criteria:

- Past events cannot be purchased.
- Future inactive events do not show publicly.
- Event data is not deleted when hidden.
- Ticket pricing and dates preview correctly.

### Phase 7: Site Content Editor

Goal: Let Jette edit page copy without code changes.

Acceptance criteria:

- Copy changes are scoped by section.
- Empty or malformed content cannot break the site.
- Static fallback remains available.

## Verification Checklist

Before merge readiness for any implementation phase:

- `git status --short` is clean except intended files.
- Changed files list is reviewed.
- Protected content files are unchanged unless explicitly approved.
- Build passes.
- Admin auth behavior is checked when relevant.
- Product listing, product detail, events, cart, and contact flows are spot-checked when relevant.
- Subagent review confirms "asked vs changed."
- Luke approves merge.

## Open Questions Before Coding

- Confirm Firebase is the approved backend.
- Confirm Jette's admin email or account setup path.
- Should admins edit live content directly, or save drafts first?
- Should images be uploaded in admin v1 or selected from existing files first?
- Should product/event backend data be seeded manually, by script, or entered through admin?
- Should old events remain visible as archive items, or hidden once past?

## Known Technical Risks

- Current product and event keys are generated from titles, so editing titles can break URLs or cart identity unless stable IDs are introduced.
- Event inventory keys depend on fragile title/date/dietary strings.
- Bundled image imports using `require(...)` need an adapter before user-uploaded backend images can work.
- Client-side PayPal checkout has no backend order persistence or server-side validation.
- Firebase security rules must be designed before write access is enabled.
