# Agent Workflow

## Branch Flow

1. Start from `main`.
2. Check status with `git status --short`.
3. Create a scoped branch using `codex/`.
4. Make one coherent phase of changes.
5. Run relevant verification.
6. Update `PROJECT_STATUS.md`.
7. Stage and commit.
8. Ask Luke before merge, push, deploy, or broader scope changes.

## Phase Closure

Every phase ends with:

- Changed files summary.
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
