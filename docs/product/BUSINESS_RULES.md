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
5. [Commercial and fulfillment](#commercial-and-fulfillment)
6. [References](#references)
7. [Future notes](#future-notes)

## Current Status

Trust and procurement through Purchase Order are implemented in code. Fulfillment Phase A rules are implemented in code; payment rules are **Not implemented.**

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

## Commercial and fulfillment

- Purchase Orders originate from active awards.
- Issued PO commercial snapshots are immutable.
- Accepted PO is commercial truth; Fulfillment is operational truth.
- Exactly one Fulfillment is created for an accepted PO in Module 3.2.
- Fulfillment follows production → mandatory QC → packaging → ship → delivery → buyer completion.
- Lifecycle writes are trusted RPC-only and material actions append audit events.
- Buyer may cancel pre-ship; supplier cancellation is limited to `opened`; post-ship exceptions use dispute/claims paths.

## References

- [PROCUREMENT_WORKFLOW.md](./PROCUREMENT_WORKFLOW.md)
- [../architecture/API_REFERENCE.md](../architecture/API_REFERENCE.md)
- [../architecture/DECISION_LOG.md](../architecture/DECISION_LOG.md)
- [../architecture/DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md)
- [../domains/fulfillment/README.md](../domains/fulfillment/README.md)

## Future notes

PO amendments, Logistics, Claims, and payment milestones require later modules and decisions.

---

**Last Updated:** 2026-07-18
