# Order Lifecycle

## Purpose

Describe the intended order lifecycle after award.

## Scope

**Not implemented** in application or database. Planning only.

## Table of contents

1. [Current Status](#current-status)
2. [Intended flow](#intended-flow)
3. [Dependencies](#dependencies)
4. [References](#references)
5. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| Orders / PO tables & RPCs | **Not implemented.** |
| Buyer Orders dashboard | Mock data only |

## Intended flow

1. Active `quotation_awards` selected  
2. Create purchase order snapshot from winning offer  
3. Supplier acknowledge / fulfill states  
4. Documents attached  
5. Close / cancel with audit  

Exact state machine — **Not implemented** (define during Module 3 design).

## Dependencies

Module 2 awards (complete). See [../planning/ROADMAP.md](../planning/ROADMAP.md).

## References

- [PROCUREMENT_WORKFLOW.md](./PROCUREMENT_WORKFLOW.md)
- [PAYMENT_WORKFLOW.md](./PAYMENT_WORKFLOW.md)
- [LOGISTICS_WORKFLOW.md](./LOGISTICS_WORKFLOW.md)

## Future notes

Replace mock `/dashboard/buyer/orders` when domain ships.

---

**Last Updated:** 2026-07-18
