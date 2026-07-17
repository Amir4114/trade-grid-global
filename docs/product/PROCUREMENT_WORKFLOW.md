# Procurement Workflow

## Purpose

End-to-end RFQ → quotation → award workflow (implemented).

## Scope

Dashboard procurement path. Public `/rfq` marketing page is mock — not this workflow’s source of truth.

## Table of contents

1. [Current Status](#current-status)
2. [Happy path](#happy-path)
3. [Diagram](#diagram)
4. [Statuses](#statuses)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

| Step | Status |
|------|--------|
| RFQ create/publish/close/cancel | Implemented |
| Quotation draft/submit/revise/withdraw | Implemented |
| Compare & award | Implemented |
| PO after award | **Not implemented.** |

## Happy path

1. Buyer creates draft RFQ → publishes (`open`)
2. Supplier discovers (visibility rules) → submits quotation
3. Optional revisions
4. Buyer compares → confirms award
5. Winner/losers notified; RFQ `awarded`

## Diagram

See mermaid in [../architecture/ARCHITECTURE_STATUS_v0.3.0.md](../architecture/ARCHITECTURE_STATUS_v0.3.0.md) § Procurement Workflow Diagram and [../architecture/DATA_FLOW.md](../architecture/DATA_FLOW.md).

## Statuses

| Entity | Key statuses |
|--------|----------------|
| RFQ | `draft` `open` `quoted` `awarded` `closed` `cancelled` (`expired` reserved) |
| Thread | `draft` `active` `withdrawn` `awarded` `closed` |
| Offer | `draft` `submitted` `superseded` `awarded` `not_selected` … |
| Award | `active` `revoked` |

## References

- [BUSINESS_RULES.md](./BUSINESS_RULES.md)
- [USER_ROLES.md](./USER_ROLES.md)
- [../architecture/API_REFERENCE.md](../architecture/API_REFERENCE.md)
- [ORDER_LIFECYCLE.md](./ORDER_LIFECYCLE.md)

## Future notes

Handoff artifact from award → PO is Module 3.

---

**Last Updated:** 2026-07-18
