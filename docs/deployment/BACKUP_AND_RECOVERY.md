# Backup and Recovery

## Purpose

Describe backup expectations for Supabase-hosted data and application rollback pairing.

## Scope

Operational guidance. Vendor-specific PITR depends on Supabase plan. App code rollback → [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md).

## Table of contents

1. [Current Status](#current-status)
2. [What to protect](#what-to-protect)
3. [Supabase database](#supabase-database)
4. [Storage](#storage)
5. [Application](#application)
6. [Verification after restore](#verification-after-restore)
7. [References](#references)
8. [Future notes](#future-notes)

## Current Status

| Capability | Status |
|------------|--------|
| In-repo automated backup jobs | **Not implemented.** |
| Supabase managed backups / PITR | Depends on project plan (configure in Supabase dashboard) |
| Documented recovery pairing | This guide |

## What to protect

| Asset | Criticality |
|-------|-------------|
| Postgres (profiles → awards) | Critical |
| Storage buckets | High |
| Auth users | Critical (Supabase Auth) |
| Vercel deployments | High |
| `.env` secrets | Critical (not in git) |

## Supabase database

1. Enable automated backups / PITR per Supabase plan.
2. Before risky migrations, snapshot or confirm PITR window.
3. Prefer forward-fix migrations over destructive rollbacks ([../development/MIGRATION_GUIDELINES.md](../development/MIGRATION_GUIDELINES.md)).

## Storage

Bucket contents (`company-docs`, `product-images`, `rfq-docs`, `quotation-docs`) are not fully described by SQL dumps. Confirm backup coverage for Storage in the Supabase project settings.

## Application

Redeploy a known-good Vercel deployment that matches the restored schema generation (migrations `001`–`N`).

## Verification after restore

```bash
npm run typecheck
node --use-system-ca scripts/verify-rfq-foundation.mjs
node --use-system-ca scripts/verify-quotation-system.mjs
node --use-system-ca scripts/verify-award-system.mjs
```

## References

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md)
- [../operations/DISASTER_RECOVERY.md](../operations/DISASTER_RECOVERY.md)

## Future notes

Add runbooks for multi-region failover when required. **Not implemented.**

---

**Last Updated:** 2026-07-18
