# Branching Strategy

## Purpose

Define how branches are created and integrated.

## Scope

Complements [GIT_WORKFLOW.md](./GIT_WORKFLOW.md).

## Table of contents

1. [Current Status](#current-status)
2. [Default branch](#default-branch)
3. [Short-lived branches](#short-lived-branches)
4. [Protection recommendations](#protection-recommendations)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| Default branch `main` | Implemented |
| Enforced PR-only merges | Depends on GitHub settings (not encoded in repo) |

## Default branch

`main` — production-track integration branch.

## Short-lived branches

| Prefix | Use |
|--------|-----|
| `feature/` | New capability |
| `fix/` | Bugfix |
| `docs/` | Documentation only |
| `chore/` | Tooling/housekeeping |
| `migration/` | Additive SQL |

Delete after merge.

## Protection recommendations

- Require PR reviews for `main`
- Require status checks (`typecheck`/`lint`/`build`) when CI exists
- Disallow force-push to `main`

**Not implemented** as code — configure on the host.

## References

- [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)

## Future notes

Introduce `develop` only if release cadence requires it.

---

**Last Updated:** 2026-07-18
