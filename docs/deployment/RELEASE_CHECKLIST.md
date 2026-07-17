# Release Checklist

## Purpose

Pre-release gate for Trade Grid Global milestones.

## Scope

Human checklist. Process narrative → [RELEASE_PROCESS.md](../development/RELEASE_PROCESS.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).

## Table of contents

1. [Current Status](#current-status)
2. [Checklist](#checklist)
3. [References](#references)
4. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| Checklist documented | Implemented (this file) |
| Automated release pipeline | **Not implemented.** |

## Checklist

### Code & quality

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] No secrets in diff

### Database

- [ ] New migrations additive only (`017+`); historical files untouched
- [ ] Migrations applied on staging
- [ ] Relevant `scripts/verify-*.mjs` passed
- [ ] Schema docs updated ([../architecture/DATABASE_SCHEMA.md](../architecture/DATABASE_SCHEMA.md))

### Security

- [ ] RLS / RPC review ([../development/SECURITY_CHECKLIST.md](../development/SECURITY_CHECKLIST.md))
- [ ] No service role in client bundles

### Documentation

- [ ] [../CHANGELOG.md](../CHANGELOG.md) updated
- [ ] [../RELEASE_NOTES.md](../RELEASE_NOTES.md) updated if shipping a release
- [ ] Version strings consistent (`0.3.0` / `v0.3.0-procurement-complete` pattern)

### Release

- [ ] Tag created when authorized
- [ ] Production deploy
- [ ] Smoke: login, RFQ publish, quote, award (as applicable)
- [ ] Rollback plan reviewed ([ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md))

## References

- [../development/CODE_REVIEW_CHECKLIST.md](../development/CODE_REVIEW_CHECKLIST.md)
- [../CONTRIBUTING.md](../../CONTRIBUTING.md)

## Future notes

Automate checklist in CI when pipelines exist. **Not implemented.**

---

**Last Updated:** 2026-07-18
