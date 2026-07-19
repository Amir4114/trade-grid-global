# Migration Guidelines

## Purpose

Rules for changing the Postgres schema safely.

## Scope

Files under `supabase/migrations/`. RPC/RLS detail → [../architecture/SECURITY_MODEL.md](../architecture/SECURITY_MODEL.md).

## Table of contents

1. [Current Status](#current-status)
2. [Migration numbering](#migration-numbering)
3. [Safe migrations](#safe-migrations)
4. [Rollback strategy](#rollback-strategy)
5. [Data migrations](#data-migrations)
6. [Review checklist](#review-checklist)
7. [References](#references)
8. [Future notes](#future-notes)

## Current Status

| Item                       | Status                |
| -------------------------- | --------------------- |
| Migrations `001`–`022`     | Present in repository |
| Linked CLI project in repo | **Not implemented.**  |

## Migration numbering

- Next unused file after the current baseline: `023_<snake_case_description>.sql`
- Never reuse numbers; never edit applied historical files in shared envs.

## Safe migrations

- Prefer additive: `create table if not exists`, `add column if not exists`, `create or replace function`
- `drop policy if exists` before recreate
- SECURITY DEFINER: `set search_path = public`; `v_` variables
- Fully qualify `status`, `id`, `*_id`, timestamps in multi-table SQL/RLS
- Keep CHECK text enums consistent with app types

## Rollback strategy

Forward-fix or restore from backup — see [../deployment/ROLLBACK_PROCEDURE.md](../deployment/ROLLBACK_PROCEDURE.md). Do not rewrite history.

## Data migrations

- Batch large updates; avoid long locks where possible
- Preserve audit tables; never delete award/event history for convenience
- Document irreversible transforms in release notes

## Review checklist

- [ ] Idempotent where practical
- [ ] RLS enabled on new tables
- [ ] Grants minimal (often SELECT + RPC execute)
- [ ] Notifications via `_create_system_notification` only
- [ ] Verify script added/updated for new security boundaries
- [ ] [../architecture/DATABASE_SCHEMA.md](../architecture/DATABASE_SCHEMA.md) updated

## References

- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
- [../architecture/API_REFERENCE.md](../architecture/API_REFERENCE.md)
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)

## Future notes

Adopt Squawk/sqlfluff in CI when available. **Not implemented.**

---

**Last Updated:** 2026-07-18
