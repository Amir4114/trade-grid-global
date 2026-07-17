# Payment Workflow

## Purpose

Intended payments / settlement flow.

## Scope

**Not implemented.** No payment provider integration in app code (`RESEND`/`card` processors absent).

## Table of contents

1. [Current Status](#current-status)
2. [Intended capabilities](#intended-capabilities)
3. [References](#references)
4. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| Invoices / payments / escrow | **Not implemented.** |
| Env placeholders for future billing tools | Partial (see `.env.example` reserved keys) |

## Intended capabilities

(Module 4) Invoices tied to orders; payment capture/escrow; reconciliation; audit. Details TBD — do not invent gateways here.

## References

- [../planning/ROADMAP.md](../planning/ROADMAP.md)
- [ORDER_LIFECYCLE.md](./ORDER_LIFECYCLE.md)
- [../architecture/DECISION_LOG.md](../architecture/DECISION_LOG.md)

## Future notes

Security review mandatory before handling funds.

---

**Last Updated:** 2026-07-18
