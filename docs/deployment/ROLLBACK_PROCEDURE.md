# Rollback Procedure

## Purpose

Steps to undo a bad application or database release safely.

## Scope

Operational rollback. Broader DR → [../operations/DISASTER_RECOVERY.md](../operations/DISASTER_RECOVERY.md). Also summarized in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Table of contents

1. [Current Status](#current-status)
2. [Principles](#principles)
3. [Application rollback](#application-rollback)
4. [Database rollback](#database-rollback)
5. [Business undo (awards)](#business-undo-awards)
6. [References](#references)
7. [Future notes](#future-notes)

## Current Status

| Capability | Status |
|------------|--------|
| Documented procedure | Implemented |
| Automated rollback bot | **Not implemented.** |

## Principles

1. Prefer **forward fix** migrations over rewriting history.
2. Keep app deployment and DB migration generation paired.
3. Never delete audit/award history to “undo” a release.

## Application rollback

1. Identify last known-good Git tag / Vercel deployment.
2. Redeploy that artifact.
3. Confirm env vars still match ([ENVIRONMENT.md](./ENVIRONMENT.md)).
4. Smoke-test auth + critical procurement paths.

## Database rollback

1. If migration not applied: stop; fix migration; re-apply.
2. If migration applied and breaks prod: restore from backup/PITR ([BACKUP_AND_RECOVERY.md](./BACKUP_AND_RECOVERY.md)) **or** ship compensating migration `NNN_fix_….sql`.
3. Do not edit already-applied historical migration files.

## Business undo (awards)

Use `revoke_award` for intentional commercial undo when RFQ was awarded — preserves history. See [../architecture/API_REFERENCE.md](../architecture/API_REFERENCE.md).

## References

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [../development/MIGRATION_GUIDELINES.md](../development/MIGRATION_GUIDELINES.md)
- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)

## Future notes

Add blue/green cutover notes when multi-slot deploy is required.

---

**Last Updated:** 2026-07-18
