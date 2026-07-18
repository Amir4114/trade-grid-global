# Decision Log (ADR-lite)

## Purpose

Record architectural decisions that shape Trade Grid Global so future modules do not silently reverse them.

## Scope

Decisions evidenced by migrations `001`–`016` and current app structure. Not a full ADR tool.

**Phase 0 locks:** Formal locked decisions live in [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) — Module 3.1 (**AD-3.1-001 … AD-3.1-025**), Module 3.2 (**AD-3.2-001 … AD-3.2-028**). This log remains the short index for platform-wide D001–D008.

## Table of contents

1. [Current Status](#current-status)
2. [Decision index](#decision-index)
3. [Decisions](#decisions)
4. [References](#references)
5. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| Informal decision log | Implemented (this doc) |
| Formal ADR tooling | **Not implemented.** |

## Decision index

| ID | Title | Status |
|----|-------|--------|
| D001 | Food/FMCG-only marketplace | Accepted |
| D002 | Supabase + RLS as system of record | Accepted |
| D003 | Privileged lifecycle via SECURITY DEFINER RPCs | Accepted |
| D004 | Visibility orthogonal to RFQ status | Accepted |
| D005 | Quotation threads + versioned offers | Accepted |
| D006 | Award before orders | Accepted |
| D007 | Trusted notifications only | Accepted |
| D008 | Defer AI until after trade execution | Accepted |

## Decisions

### D001 — Food/FMCG-only marketplace

- **Context:** Avoid generic B2B sprawl.
- **Decision:** Categories and messaging stay Food/FMCG.
- **Consequences:** Do not add unrelated verticals without product decision.

### D002 — Supabase + RLS as system of record

- **Decision:** Postgres + RLS + Storage; Next.js is the primary client.
- **Consequences:** No parallel source-of-truth DB. See [SECURITY_MODEL.md](./SECURITY_MODEL.md).

### D003 — Privileged lifecycle via SECURITY DEFINER RPCs

- **Decision:** Publish RFQ, submit quote, award, verify, moderate products via RPCs with `search_path = public`.
- **Consequences:** Direct client UPDATE on lifecycle tables is restricted/fail-closed where designed.

### D004 — Visibility orthogonal to RFQ status

- **Decision:** `visibility` (`public` | `verified_suppliers_only` | `invite_only`) is separate from `status`.
- **Consequences:** Do not overload `draft` as a visibility value.

### D005 — Quotation threads + versioned offers

- **Decision:** One thread per `(rfq, supplier)`; offers versioned with `revision_no`.
- **Consequences:** No flat one-row-per-supplier commercial history.

### D006 — Award before orders

- **Decision:** Ship award system (016) before POs/payments.
- **Consequences:** Module 3 starts from `quotation_awards`. Orders remain **Not implemented.**

### D007 — Trusted notifications only

- **Decision:** Clients cannot INSERT notifications; `_create_system_notification` only.
- **Consequences:** All new events must emit from trusted SQL paths.

### D008 — Defer production AI

- **Decision:** Keep `/ai-sourcing` mock until procurement execution exists.
- **Consequences:** See [../product/AI_ROADMAP.md](../product/AI_ROADMAP.md).

## References

- [ARCHITECTURE_STATUS_v0.3.0.md](./ARCHITECTURE_STATUS_v0.3.0.md)
- [../planning/ROADMAP.md](../planning/ROADMAP.md)
- [../development/API_DESIGN_GUIDELINES.md](../development/API_DESIGN_GUIDELINES.md)

## Future notes

Module 3.1 uses [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md). Promote additional modules there (AD-3.2-*, etc.) rather than expanding this lite log indefinitely.

---

**Last Updated:** 2026-07-18
