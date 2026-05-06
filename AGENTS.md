# AGENTS

This repo uses a PM-led workflow. `PROJECT_STATUS.md` is the source of truth for current state, plans, decisions, risks, verification, commits, and deployments.

## Operating Rules

- Planning and execution stay separate.
- Luke must approve the plan and say `go` before implementation work begins.
- Use feature branches for all non-trivial work. Default branch prefix: `codex/`.
- Do not merge until the work is reviewed, verified, and Luke confirms it is ready.
- Do not add dependencies, paid services, or major architecture changes without approval.
- Do not deploy without approval.
- Do not overwrite user work.
- Every completed phase requires a documentation impact check.

## Protected Content And Data Files

These files contain live business content and must not be changed without Luke explicitly asking for that exact content or data change:

- `src/resources/products.js`
- `src/resources/events.js`
- `src/resources/content.js`
- `src/resources/inventory.js`
- files under `src/resources/images/`
- `src/resources/public_keys.js`

Do not make "cleanup", formatting, migration, generated, or convenience edits in these files as part of unrelated work. If backend prep requires reading them, read only. If a future backend migration needs to transform them, first create a written migration plan and get Luke's approval.

## Backend Prep Rules

- Backend work must start with a plan, not implementation.
- Do not add Firebase, database, auth, admin, payment, or deployment dependencies without approval.
- Do not move, rewrite, normalize, or re-key product/event/content data without approval.
- Preserve current customer-facing behavior unless Luke explicitly approves a behavior change.
- Prefer adapters and read-only abstractions first, so the current static site can keep working while backend work is designed.
- Use at least one subagent for backend planning or larger cleanup phases to review scope, protected files, and regression risk.
- Ask before merge, push, or deploy.

## Agent Roles

### PM Agent

Owns scope, sequencing, Git workflow, status updates, decisions, docs, commits, pull requests, and merge readiness. The PM Agent keeps `PROJECT_STATUS.md` current.

The PM Agent is responsible for enforcing protected content rules before any edit.

### Frontend Agent

Owns React UI, routes, styling, responsive behavior, accessibility-friendly components, and customer-facing flows.

### Backend Agent

Needed for Firebase, authentication, inventory persistence, order storage, security rules, server-side checkout, and any future admin tooling.

The Backend Agent must design data ownership and migration paths before touching live static resource files.

### Accessibility Agent

Reviews keyboard navigation, semantic markup, alt text, focus behavior, color contrast, form labels, and mobile usability.

### QA Agent

Verifies builds, checkout/cart behavior, product and event flows, contact form behavior, responsive layouts, and regression risk.

For content-sensitive work, QA must explicitly verify that protected content files were not changed unless the task asked for it.

### Documentation Agent

Keeps README and docs accurate when setup, architecture, data shape, workflow, external services, or user-facing behavior changes.

## Documentation Impact Check

Before closing a phase, answer:

1. Did user-facing behavior change?
2. Did data shape, security rules, setup, deployment, external services, or workflow change?
3. Did a bug, risk, decision, or future task appear?
4. Would a future developer or AI agent misunderstand the project without a doc update?

If yes, update docs before committing. If no, record: `Docs checked: no update needed.`
