# Firestore Rules Plan

This phase drafts Firestore security rules before any admin write UI exists. The rules are not deployed in this phase.

## Scope

- Add `firestore.rules` as a draft rules file.
- Document how the rules map to the current admin shell.
- Keep `firebase.json` commented out.
- Do not deploy rules.
- Do not add product, event, content, inventory, image, or order editors.
- Do not connect public site data to Firestore.

## Current Rule Model

The draft rules use an `adminUsers/{uid}` allowlist.

An approved admin document must include:

```json
{
  "active": true,
  "email": "admin@example.com",
  "role": "owner"
}
```

The first admin user must be bootstrapped manually in the Firebase console before these rules are deployed. After rules are deployed, approved admins can manage other admin user records.

## Collection Access

- `adminUsers`: signed-in users can read their own record; admins can read and manage admin records.
- `products`: admin reads and writes only until public backend reads are approved.
- `productCategories`: admin reads and writes only; product writes require an existing approved category document ID.
- `events`: admin reads and writes only until public backend reads are approved.
- `siteContent`: admin reads and writes only until public backend reads are approved.
- `inventory`: admin-only reads and writes.
- `orders`: admin reads only; client writes are denied until checkout/order persistence is designed.
- Everything else is denied by default.

## Important Guardrails

- These rules are a draft and must be reviewed before deployment.
- `firebase.json` is not activated in this phase.
- Public site data remains static until a later approved backend-read branch.
- Admin write controls must not be added until rules are reviewed against the exact editor data shape.
- Draft Storage rules are tracked separately in `storage.rules` and `docs/storage-rules-plan.md`.

## Deployment Caveats

- Public reads for `products`, `events`, and `siteContent` are intentionally disabled in the current draft. When public backend reads are approved, list queries must be constrained to the public-read fields; Firestore rules do not filter unsafe query results after the fact.
- Roles are stored but not enforced yet. Any active admin can manage other admin records in this draft.
- Product, event, site content, and inventory writes use collection-specific validators aligned to `docs/admin-data-shapes.md`.
- Product and product category writes are constrained to the approved product category IDs.
- `gifts` is an approved category document ID, but product writes can use it only for the preserved legacy gift-set product IDs.
- Product, event, and content deletes are currently admin-allowed in the draft. The UI may still choose to deactivate instead of delete.
- Public reads are not enabled yet. Before backend reads power the public site, decide whether `published`, `isActive`, or both should gate public access.

## Open Questions

- Should admins be allowed to delete product/event/content records, or should the UI only deactivate them?
- Should admin roles be limited to `owner` and `editor`, or kept flexible for now?
- Should public reads use `published`, `isActive`, or both?
- Should order records be written by a server/cloud function rather than the browser?
