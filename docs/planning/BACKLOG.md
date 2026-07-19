# Backlog

## Purpose

Prioritized engineering backlog derived from known gaps — not a full issue tracker.

## Scope

Actionable items visible from the current codebase/docs. Tracker tooling (Jira/Linear) — **Not implemented** in-repo.

## Table of contents

1. [Current Status](#current-status)
2. [P0 — Before / with Module 3](#p0--before--with-module-3)
3. [P1 — Product quality](#p1--product-quality)
4. [P2 — Platform](#p2--platform)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

| Item                         | Status               |
| ---------------------------- | -------------------- |
| Formal ticket system in repo | **Not implemented.** |
| This backlog snapshot        | Documentation only   |

## P0 — Before / with Module 3

| ID   | Item                                                           | Status                   |
| ---- | -------------------------------------------------------------- | ------------------------ |
| B001 | Confirm migration `016` applied on all envs                    | Ops                      |
| B002 | Design and implement PO schema from `quotation_awards`         | Complete in code (`017`) |
| B003 | Replace mock buyer Orders page with live Purchase Orders       | Complete                 |
| B004 | Fulfillment Phase B buyer/supplier UI                          | Complete in code (`023`) |
| B005 | Fulfillment document ownership, retention, and upload workflow | Planned                  |

## P1 — Product quality

| ID   | Item                                                               | Status               |
| ---- | ------------------------------------------------------------------ | -------------------- |
| B010 | Wire or retire public `/rfq` mock                                  | **Not implemented.** |
| B011 | Label/remove mock Inquiries, Saved Suppliers, Admin Analytics/RFQs | Open                 |
| B012 | Supplier certifications CRUD (beyond static placeholder)           | **Not implemented.** |
| B013 | Offer payment-terms / cert fields (schema change)                  | **Not implemented.** |

## P2 — Platform

| ID   | Item                                 | Status               |
| ---- | ------------------------------------ | -------------------- |
| B020 | Linked Supabase CLI project in repo  | **Not implemented.** |
| B021 | E2E test suite beyond verify scripts | **Not implemented.** |
| B022 | Observability (Sentry etc.)          | **Not implemented.** |

## References

- [CURRENT_STATUS.md](./CURRENT_STATUS.md)
- [ROADMAP.md](./ROADMAP.md)
- [FUTURE_FEATURES.md](./FUTURE_FEATURES.md)
- [../architecture/ARCHITECTURE_STATUS_v0.3.0.md](../architecture/ARCHITECTURE_STATUS_v0.3.0.md)
- [../architecture/DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md)
- [../domains/fulfillment/README.md](../domains/fulfillment/README.md)

## Future notes

Move items into the team’s tracker; keep this file as a mirror of themes.

---

**Last Updated:** 2026-07-18
