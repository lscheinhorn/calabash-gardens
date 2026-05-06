# Agent Workflow

## Branch Flow

1. Start from `main`.
2. Check status with `git status --short`.
3. Confirm `main` is clean before branching. If `git status --short` shows unexpected changes, stop and ask Luke before continuing.
4. Create a scoped branch using `codex/`.
5. Make one coherent phase of changes.
6. Check whether the task touches protected content/data files.
7. Run relevant verification.
8. Update `PROJECT_STATUS.md`.
9. Stage and commit.
10. Ask Luke before merge, push, deploy, or broader scope changes.

Branches must start from a clean `main` worktree unless Luke explicitly approves a different base branch.

## Protected Files

Do not edit these without an explicit request naming the content/data change:

- `src/resources/products.js`
- `src/resources/events.js`
- `src/resources/content.js`
- `src/resources/inventory.js`
- `src/resources/images/**`
- `src/resources/public_keys.js`

Backend prep, cleanup, linting, and refactors must avoid these files unless Luke approves a specific migration or content update.

## Phase Closure

Every phase ends with:

- Changed files summary.
- Protected-files summary.
- Verification summary.
- Documentation impact check.
- Commit status.
- Next recommended phase.

## Merge Readiness

A branch is merge-ready only when:

- The requested scope is complete.
- Build/tests pass or known failures are documented.
- User-facing risks are called out.
- Docs are updated when needed.
- Luke approves the merge.

## Implementation Guard Rails

- Keep changes small and reviewable.
- Prefer existing patterns before introducing new architecture.
- Do not add dependencies without approval.
- Do not deploy without approval.
- Do not change payment, auth, or data persistence behavior without explicit acceptance criteria.
- Do not change product, event, or site copy/content data without explicit approval.
- Use a subagent for scope review before merging larger cleanup/backend-prep work.
