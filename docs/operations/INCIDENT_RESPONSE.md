# Incident Response

## Purpose

Initial response steps when production is degraded.

## Scope

Process template. Tooling integrations — **Not implemented.**

## Table of contents

1. [Current Status](#current-status)
2. [Severity](#severity)
3. [Response steps](#response-steps)
4. [Communications](#communications)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| Documented IR outline | Implemented |
| On-call rotation / PagerDuty | **Not implemented.** |

## Severity

| Level | Example |
|-------|--------|
| SEV1 | Auth down; cannot login |
| SEV2 | Award/quote RPCs failing for all users |
| SEV3 | Partial UI defect; workaround exists |

## Response steps

1. Confirm blast radius (Vercel vs Supabase vs client)
2. Preserve evidence (times, error messages, request IDs if any)
3. Mitigate (rollback app — [../deployment/ROLLBACK_PROCEDURE.md](../deployment/ROLLBACK_PROCEDURE.md); disable feature flag if exists — **Not implemented.**)
4. Fix forward with migration/hotfix
5. Write brief post-incident notes

## Communications

Notify stakeholders via agreed channel (Slack/email — org-specific; **Not implemented** in-app).

## References

- [../deployment/MONITORING.md](../deployment/MONITORING.md)
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
- [SUPPORT_RUNBOOK.md](./SUPPORT_RUNBOOK.md)

## Future notes

Attach severity SLA once ops staffing exists.

---

**Last Updated:** 2026-07-18
