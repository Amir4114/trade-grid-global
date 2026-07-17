# Support Runbook

## Purpose

First-line troubleshooting for common support tickets.

## Scope

Operational tips. Not a public help center CMS.

## Table of contents

1. [Current Status](#current-status)
2. [Common issues](#common-issues)
3. [Escalation](#escalation)
4. [References](#references)
5. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| Runbook | Implemented |
| In-app support console | **Not implemented.** |

## Common issues

| Symptom | Checks |
|---------|--------|
| Cannot login | Supabase Auth status; user email confirm; env URL/key |
| Cannot see RFQ (supplier) | Visibility rules; invite; verification status; post-award thread access |
| Cannot submit quote | RFQ status must be `open`/`quoted` (not awarded/closed) |
| Cannot award | Must be buyer owner; RFQ open/quoted; thread has submitted offer |
| Missing notification | Confirm trusted emit path; user id; service role not required for delivery |
| Product not public | Status must be `published`; check `public_products` |

## Escalation

Escalate SEV1/2 per [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md). Engineering needs RPC error text + timestamps + company/RFQ IDs (no secrets).

## References

- [../product/PROCUREMENT_WORKFLOW.md](../product/PROCUREMENT_WORKFLOW.md)
- [../architecture/API_REFERENCE.md](../architecture/API_REFERENCE.md)
- [../planning/CURRENT_STATUS.md](../planning/CURRENT_STATUS.md)

## Future notes

Build a support macros library in the help desk tool.

---

**Last Updated:** 2026-07-18
