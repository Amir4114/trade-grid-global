# Git Workflow

## Purpose

Standardize Git usage for Trade Grid Global.

## Scope

Branching, commits, tags, merges. Release narrative → [RELEASE_PROCESS.md](./RELEASE_PROCESS.md). Also [BRANCHING_STRATEGY.md](./BRANCHING_STRATEGY.md).

## Table of contents

1. [Current Status](#current-status)
2. [Git Flow](#git-flow)
3. [Branch naming](#branch-naming)
4. [Commit conventions](#commit-conventions)
5. [Tagging](#tagging)
6. [Merge strategy](#merge-strategy)
7. [Release branches](#release-branches)
8. [Hotfixes](#hotfixes)
9. [References](#references)
10. [Future notes](#future-notes)

## Current Status

| Practice | Status |
|----------|--------|
| Primary branch `main` | Implemented |
| Product tags (e.g. `v0.3.0-procurement-complete`) | Implemented |
| Strict Git Flow always used historically | Partial (history shows direct `main` commits) |

## Git Flow

Recommended going forward:

1. Branch from `main`
2. PR + review
3. Merge to `main`
4. Tag releases when migrations + verifies pass

## Branch naming

`feature/…`, `fix/…`, `docs/…`, `chore/…`, `migration/NNN-…` — see [../../CONTRIBUTING.md](../../CONTRIBUTING.md).

## Commit conventions

Imperative subjects; explain security-sensitive **why** in body; no secrets; no force-push to `main` without approval.

## Tagging

- Product milestones: annotated tags like `v0.3.0-procurement-complete`
- npm semver in `package.json`: `0.3.0`
- Document both in [../CHANGELOG.md](../CHANGELOG.md)

## Merge strategy

Prefer squash or merge commits per team preference; keep history readable. Rebase shared `main` only with care.

## Release branches

Long-lived `release/x.y` branches — **Not required today**; optional when parallel hotfixes demand it.

## Hotfixes

1. Branch `fix/…` from tagged release or `main`
2. Minimal patch + verify scripts
3. Merge + tag patch release
4. Avoid editing historical migrations — add compensating migration

## References

- [BRANCHING_STRATEGY.md](./BRANCHING_STRATEGY.md)
- [VERSIONING_POLICY.md](./VERSIONING_POLICY.md)
- [../deployment/ROLLBACK_PROCEDURE.md](../deployment/ROLLBACK_PROCEDURE.md)

## Future notes

Enforce branch protection rules on GitHub when the org enables them.

---

**Last Updated:** 2026-07-18
