# Release Process

## Purpose

End-to-end steps to ship a Trade Grid Global release.

## Scope

Human process. Checklist → [../deployment/RELEASE_CHECKLIST.md](../deployment/RELEASE_CHECKLIST.md).

## Table of contents

1. [Current Status](#current-status)
2. [Development](#development)
3. [Verification](#verification)
4. [Documentation review](#documentation-review)
5. [Migration review](#migration-review)
6. [Testing](#testing)
7. [Tagging](#tagging)
8. [Release](#release)
9. [Rollback](#rollback)
10. [References](#references)
11. [Future notes](#future-notes)

## Current Status

| Capability | Status |
|------------|--------|
| Documented process | Implemented |
| Fully automated CD with gates | **Not implemented.** |

## Development

Implement on a feature branch; keep migrations additive; update docs with behavior changes.

## Verification

Run domain `scripts/verify-*.mjs` after applying migrations on staging.

## Documentation review

Update changelog, release notes, architecture/schema/API docs as needed. Ensure version strings align ([VERSIONING_POLICY.md](./VERSIONING_POLICY.md)).

## Migration review

Peer review SQL for RLS ambiguity, `search_path`, ownership checks ([MIGRATION_GUIDELINES.md](./MIGRATION_GUIDELINES.md)).

## Testing

`typecheck` / `lint` / `build` + smoke UI paths ([TESTING.md](./TESTING.md)).

## Tagging

Annotated git tag for milestones; bump `package.json` semver when releasing.

## Release

Deploy Next.js (Vercel) with matching env; confirm Supabase migrations applied.

## Rollback

Follow [../deployment/ROLLBACK_PROCEDURE.md](../deployment/ROLLBACK_PROCEDURE.md).

## References

- [../deployment/DEPLOYMENT.md](../deployment/DEPLOYMENT.md)
- [../RELEASE_NOTES.md](../RELEASE_NOTES.md)
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)

## Future notes

Codify process in GitHub Actions. **Not implemented.**

---

**Last Updated:** 2026-07-18
