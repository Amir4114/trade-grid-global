# Order Lifecycle

## Purpose

Describe purchase orders (Module 3.1) and the intended fulfillment lifecycle after accept.

## Scope

| Layer | Status |
|-------|--------|
| Purchase Order issue / accept / reject / cancel | **Implemented** (migration `017`) |
| Fulfillment / logistics / payments / `completed` | **Not implemented** (Module 3.2+) |

## Table of contents

1. [Current Status](#current-status)
2. [Purchase Order flow (3.1)](#purchase-order-flow-31)
3. [Intended fulfillment (3.2+)](#intended-fulfillment-32)
4. [Dependencies](#dependencies)
5. [References](#references)

## Current Status

| Item | Status |
|------|--------|
| PO tables & RPCs | Implemented (`017`) |
| Buyer / supplier Orders dashboards | Implemented (live) |
| Commercial snapshot + append-only events | Implemented |
| Logistics / payments / amendments | **Not implemented.** |

## Purchase Order flow (3.1)

1. Active `quotation_awards`  
2. Buyer creates draft PO (commercial + party snapshot)  
3. Buyer issues PO → supplier notified  
4. Supplier accepts (commercial baseline) or rejects (reason required)  
5. Buyer may cancel draft/issued; accepted is read-only in 3.1  

Locked decisions: [ARCHITECTURE_DECISIONS.md](../architecture/ARCHITECTURE_DECISIONS.md) (AD-3.1-*).  
Design: [MODULE_3_1_PURCHASE_ORDER_DESIGN.md](../planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md).

## Intended fulfillment (3.2+)

1. Accepted PO as commercial baseline (AD-3.1-023)  
2. Fulfillment states / optional `orders` child entity  
3. Documents, logistics milestones, invoices  

## Dependencies

Module 2 awards (complete). Module 3.1 POs (complete in code — apply `017`).

## References

- [PROCUREMENT_WORKFLOW.md](./PROCUREMENT_WORKFLOW.md)
- [PAYMENT_WORKFLOW.md](./PAYMENT_WORKFLOW.md)
- [LOGISTICS_WORKFLOW.md](./LOGISTICS_WORKFLOW.md)
- [../planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md](../planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md)

---

**Last Updated:** 2026-07-18
