# Order Lifecycle

## Purpose

Describe purchase orders (Module 3.1) and fulfillment after accept (Module 3.2).

## Scope

| Layer | Status |
|-------|--------|
| Purchase Order issue / accept / reject / cancel | **Implemented** (migration `017`) |
| Fulfillment DB + RPCs (Phase A) | **Implemented in code** (migration `018` — apply to activate) |
| Fulfillment UI | **Not implemented** (Phase B+) |
| Logistics shipment legs / payments / claims | **Not implemented** (Modules 3.3 / payments / 3.4) |

## Table of contents

1. [Current Status](#current-status)
2. [Purchase Order flow (3.1)](#purchase-order-flow-31)
3. [Fulfillment (3.2)](#fulfillment-32)
4. [Dependencies](#dependencies)
5. [References](#references)

## Current Status

| Item | Status |
|------|--------|
| PO tables & RPCs | Implemented (`017`) |
| Buyer / supplier Orders dashboards (PO) | Implemented (live) |
| Commercial snapshot + append-only PO events | Implemented |
| `fulfillment_orders` + lifecycle RPCs | Implemented in code (`018`) |
| Auto-create fulfillment on PO accept | Implemented in `018` (AD-3.2-004) |
| Fulfillment dashboards / nav segments | **Not implemented.** |
| Logistics / payments / amendments | **Not implemented.** |

## Purchase Order flow (3.1)

1. Active `quotation_awards`  
2. Buyer creates draft PO (commercial + party snapshot)  
3. Buyer issues PO → supplier notified  
4. Supplier accepts (commercial baseline) or rejects (reason required)  
5. Buyer may cancel draft/issued; accepted commercial fields remain immutable  

Locked decisions: [ARCHITECTURE_DECISIONS.md](../architecture/ARCHITECTURE_DECISIONS.md) (AD-3.1-*).  
Design: [MODULE_3_1_PURCHASE_ORDER_DESIGN.md](../planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md).

## Fulfillment (3.2)

PO remains commercial truth. Operational status lives only on `fulfillment_orders`.

Happy path:

`opened` → `in_production` → `quality_check` → `packaging` → `ready_to_ship` → `shipped` → `in_transit` → `delivered` → `completed`

- QC mandatory (AD-3.2-010)
- Buyer completes (AD-3.2-009)
- Cancel: buyer pre-ship; supplier only from `opened` (AD-3.2-005)
- Shipments / claims deferred (AD-3.2-025 / 012)

**Apply:** `supabase/migrations/018_order_fulfillment_system.sql`  
**Verify:** `node --use-system-ca scripts/verify-order-fulfillment-system.mjs`  
**Service:** `lib/fulfillment/service.ts`  
**Design:** [MODULE_3_2_ORDER_LIFECYCLE_DESIGN.md](../planning/design/MODULE_3_2_ORDER_LIFECYCLE_DESIGN.md)  
**Locks:** AD-3.2-001 … AD-3.2-028

## Dependencies

Module 2 awards (complete). Module 3.1 POs (complete — apply `017`). Module 3.2 Phase A (complete in code — apply `018`).

## References

- [PROCUREMENT_WORKFLOW.md](./PROCUREMENT_WORKFLOW.md)
- [PAYMENT_WORKFLOW.md](./PAYMENT_WORKFLOW.md)
- [LOGISTICS_WORKFLOW.md](./LOGISTICS_WORKFLOW.md)
- [../planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md](../planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md)
- [../planning/design/MODULE_3_2_ORDER_LIFECYCLE_DESIGN.md](../planning/design/MODULE_3_2_ORDER_LIFECYCLE_DESIGN.md)

---

**Last Updated:** 2026-07-18
