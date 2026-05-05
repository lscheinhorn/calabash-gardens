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

## Agent Roles

### PM Agent

Owns scope, sequencing, Git workflow, status updates, decisions, docs, commits, pull requests, and merge readiness. The PM Agent keeps `PROJECT_STATUS.md` current.

### Frontend Agent

Owns React UI, routes, styling, responsive behavior, accessibility-friendly components, and customer-facing flows.

### Backend Agent

Needed for Firebase, authentication, inventory persistence, order storage, security rules, server-side checkout, and any future admin tooling.

### Accessibility Agent

Reviews keyboard navigation, semantic markup, alt text, focus behavior, color contrast, form labels, and mobile usability.

### QA Agent

Verifies builds, checkout/cart behavior, product and event flows, contact form behavior, responsive layouts, and regression risk.

### Documentation Agent

Keeps README and docs accurate when setup, architecture, data shape, workflow, external services, or user-facing behavior changes.

## Documentation Impact Check

Before closing a phase, answer:

1. Did user-facing behavior change?
2. Did data shape, security rules, setup, deployment, external services, or workflow change?
3. Did a bug, risk, decision, or future task appear?
4. Would a future developer or AI agent misunderstand the project without a doc update?

If yes, update docs before committing. If no, record: `Docs checked: no update needed.`
