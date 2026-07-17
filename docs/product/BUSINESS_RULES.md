# Business Rules

## Purpose

Canonical business rules enforced (or intended) by the platform.

## Scope

Implemented rules from RPCs/triggers. Planned rules marked **Not implemented.**

## Table of contents

1. [Current Status](#current-status)
2. [Trust](#trust)
3. [Products](#products)
4. [Procurement](#procurement)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

Trust + procurement rules through award — Implemented. Order/payment rules — **Not implemented.**

## Trust

- Users cannot self-assign `verification_status = verified`
- Company verification submit only via trusted RPC from allowed statuses
- Sensitive identity changes can reset verification (settings guard)

## Products

- Suppliers cannot self-publish; admin approve required
- Archive/restore/reopen follow lifecycle RPCs

## Procurement

- RFQ visibility ≠ status
- One quotation thread per supplier per RFQ
- Offers versioned; drafts hidden from buyers
- Only RFQ owner buyer may award
- Exactly one **active** award per RFQ
- Award locks RFQ; blocks new quotes
- Award history retained (`active`/`revoked`)

## References

- [PROCUREMENT_WORKFLOW.md](./PROCUREMENT_WORKFLOW.md)
- [../architecture/API_REFERENCE.md](../architecture/API_REFERENCE.md)
- [../architecture/DECISION_LOG.md](../architecture/DECISION_LOG.md)

## Future notes

PO acceptance windows, payment milestones — define with Module 3–4.

---

**Last Updated:** 2026-07-18
