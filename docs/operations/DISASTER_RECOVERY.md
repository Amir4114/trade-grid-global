# Disaster Recovery

## Purpose

Recover from major data or region loss scenarios.

## Scope

Complements [../deployment/BACKUP_AND_RECOVERY.md](../deployment/BACKUP_AND_RECOVERY.md).

## Table of contents

1. [Current Status](#current-status)
2. [RTO / RPO](#rto--rpo)
3. [Scenarios](#scenarios)
4. [References](#references)
5. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| DR outline | Implemented |
| Multi-region active-active | **Not implemented.** |
| Tested DR drills | **Not implemented.** (schedule operationally) |

## RTO / RPO

Formal targets — **Not implemented** (set with business owners). Until then: restore via Supabase backup/PITR + redeploy last good app.

## Scenarios

| Scenario | Action |
|----------|--------|
| Bad migration | Compensating migration or PITR |
| Storage loss | Restore Storage from vendor backup if available |
| Accidental data delete | PITR; do not invent silent deletes of audit tables |
| Full project loss | Recreate Supabase project; re-apply migrations `001`–`N`; restore dump; redeploy |

## References

- [../deployment/BACKUP_AND_RECOVERY.md](../deployment/BACKUP_AND_RECOVERY.md)
- [../deployment/ROLLBACK_PROCEDURE.md](../deployment/ROLLBACK_PROCEDURE.md)
- [MAINTENANCE.md](./MAINTENANCE.md)

## Future notes

Annual DR game day.

---

**Last Updated:** 2026-07-18
