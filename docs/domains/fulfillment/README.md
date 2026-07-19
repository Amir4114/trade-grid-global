# Fulfillment Domain

Documentation index for Module 3.2 Fulfillment, the operational execution layer after a Purchase Order is accepted.

## Why this domain exists

An accepted Purchase Order records what buyer and supplier agreed. It cannot also be the changing record of production, QC, packing, dispatch, delivery, and exceptions without mixing commercial and operational truth. `fulfillment_orders` therefore owns operational status as a one-to-one child of the accepted PO.

## Current status

- Phase A database and lifecycle contract: **Implemented** by migration `018`.
- Phase B milestones, comments, timeline hardening, and cancellation policy: **Implemented** by migration `023`.
- Typed service wrappers and buyer/supplier Fulfillment UI: **Implemented**.
- First-class shipments, claims, and payments: **Not implemented**.

Activation requires migrations `017`, `018`, and `023` in the target Supabase environment.

## Documentation

- [Domain contract](./DOMAIN.md) — purpose, ownership, dependencies, and business workflow
- [Entity map](./ENTITY_MAP.md) — entities and relationships
- [State machine](./STATE_MACHINE.md) — statuses, transitions, and actor rules
- [Events](./EVENTS.md) — audit and notification facts
- [RPC reference](./RPC_REFERENCE.md) — Fulfillment RPC contract
- [Security](./SECURITY.md) — RLS, trusted writes, storage, and threats

Canonical cross-domain references:

- [Domain model](../../architecture/DOMAIN_MODEL.md)
- [Locked decisions AD-3.2-\*](../../architecture/ARCHITECTURE_DECISIONS.md)
- [Database schema](../../architecture/DATABASE_SCHEMA.md)
- [API reference](../../architecture/API_REFERENCE.md)
- [Product order lifecycle](../../product/ORDER_LIFECYCLE.md)
- [Module 3.2 design](../../planning/design/MODULE_3_2_ORDER_LIFECYCLE_DESIGN.md)

## Verification

```bash
node --use-system-ca scripts/verify-order-fulfillment-system.mjs
```

The script covers auto-creation, mandatory QC, the happy path, actor restrictions, reasoned cancellation, milestones, comments, chronological aggregation, dispute holds, cross-company isolation, append-only events, direct-write denial, aggregate reads, and selected notifications. Service-role-dependent checks may skip.

See the [Verification Matrix](../../VERIFICATION_MATRIX.md).

## Boundary summary

| Owns                                  | Does not own                                             |
| ------------------------------------- | -------------------------------------------------------- |
| Operational status and milestones     | PO prices, quantities, Incoterms, parties, payment terms |
| Production, QC, packing, readiness    | Carrier legs and customs workflows                       |
| Lightweight shipment status/reference | Claims resolution and refunds                            |
| Delivery and buyer completion         | Invoices, escrow, or settlement                          |
| Operational events and documents      | Marketplace discovery                                    |

## Phase B boundaries

- Orders workspaces expose Purchase Order and Fulfillment segments and consume notification deep links.
- Supplier actions use the ordered lifecycle RPCs and may append typed milestones.
- Both parties may append immutable operational comments; buyers remain read-only for supplier-controlled production/QC/dispatch transitions.
- Milestones are events, not statuses. Port/customs state and carrier integrations remain Logistics 3.3.
- Document metadata/storage foundations remain read-only in the UI until uploader ownership, retention, and evidence replacement rules are approved.

---

**Owner:** Trade Operations  
**Last Updated:** 2026-07-19
