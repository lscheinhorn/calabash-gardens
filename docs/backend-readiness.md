# Backend Readiness

This document prepares the project for a future backend/admin system where Jette can update products, events, and site content herself.

## Goal

Create a safe path from static resource files to managed content without changing customer-facing behavior or rewriting business data unexpectedly.

## Non-Goals For Prep Work

- Do not build the backend yet.
- Do not add Firebase or another backend dependency yet.
- Do not change product, event, inventory, image, key, price, or copy data without explicit approval.
- Do not deploy without approval.
- Do not merge without Luke's approval.

## Protected Source Files

These files are source-of-truth business content until a backend migration is approved:

- `src/resources/products.js`
- `src/resources/events.js`
- `src/resources/content.js`
- `src/resources/inventory.js`
- `src/resources/images/**`
- `src/resources/public_keys.js`

Backend prep may inspect these files, but must not edit them unless Luke asks for the specific content change.

## Recommended Backend Prep Phases

### Phase 1: Read-Only Content Boundary

Create read-only accessor modules or selectors that wrap the current static resources. The UI should continue receiving the same data shape.

Acceptance criteria:

- No product/event/content values change.
- Existing routes and purchase flows still work.
- Resource imports are isolated behind a small API.
- Build passes.

### Phase 2: Data Shape Inventory

Document current product, event, inventory, and content shapes with required/optional fields and known quirks.

Acceptance criteria:

- No code behavior changes.
- Known fragile fields are documented, especially generated keys, event dates, inventory keys, and price options.

### Phase 3: Backend Decision

Choose the backend approach, likely Firebase or a similarly simple managed service, only after approval.

Decision criteria:

- Jette can safely edit products, events, and page copy.
- Auth is simple and secure.
- Content edits can be reviewed or recovered.
- Product/event images have a clear upload/storage path.
- Checkout and inventory behavior are not made less reliable.

### Phase 4: Admin Design

Design the admin workflow before building it.

Needed admin capabilities:

- Sign in.
- Create/edit/deactivate products.
- Create/edit/deactivate events.
- Edit site copy.
- Upload or select images.
- Manage event availability without overselling.
- Preview before publishing when practical.

### Phase 5: Migration Plan

Only after approval, migrate static data to backend-managed records.

Migration requirements:

- Preserve current customer-facing content unless a change is approved.
- Keep a backup of static source data.
- Verify product listings, product pages, events, cart, PayPal totals, and contact flow.
- Rollback path is documented before deployment.

## Subagent Review Requirement

Use at least one subagent before merging backend prep or backend implementation work. The subagent should check:

- Protected files were not changed without approval.
- Scope matches the request.
- Data shapes are preserved.
- Customer-facing behavior is unchanged unless approved.
- Verification is appropriate for the risk.

## Open Questions

- Should backend be Firebase, another managed CMS/database, or a simpler admin file workflow?
- Does Jette need draft/publish, or are direct edits acceptable?
- Who can sign in?
- Should orders and inventory be stored in the backend or remain tied to PayPal/order email for now?
- Where should images be stored and resized?
