# Fulfillment Domain

Documentation index for Module 3.2 Fulfillment, the operational execution layer after a Purchase Order is accepted.

## Why this domain exists

An accepted Purchase Order records what buyer and supplier agreed. It cannot also be the changing record of production, QC, packing, dispatch, delivery, and exceptions without mixing commercial and operational truth. `fulfillment_orders` therefore owns operational status as a one-to-one child of the accepted PO.

## Current status

- Phase A database and RPC contract: **Implemented in code** by migration `018`.
- Fulfillment service wrappers: **Implemented in code**.
- Buyer/supplier Fulfillment UI: **Not implemented**; Phase B.
- First-class shipments, claims, and payments: **Not implemented**.

Activation requires migrations `017` and `018` in the target Supabase environment.

## Documentation

- [Domain contract](./DOMAIN.md) — purpose, ownership, dependencies, and business workflow
- [Entity map](./ENTITY_MAP.md) — entities and relationships
- [State machine](./STATE_MACHINE.md) — statuses, transitions, and actor rules
- [Events](./EVENTS.md) — audit and notification facts
- [RPC reference](./RPC_REFERENCE.md) — Fulfillment RPC contract
- [Security](./SECURITY.md) — RLS, trusted writes, storage, and threats

Canonical cross-domain references:

- [Domain model](../../architecture/DOMAIN_MODEL.md)
- [Locked decisions AD-3.2-*](../../architecture/ARCHITECTURE_DECISIONS.md)
- [Database schema](../../architecture/DATABASE_SCHEMA.md)
- [API reference](../../architecture/API_REFERENCE.md)
- [Product order lifecycle](../../product/ORDER_LIFECYCLE.md)
- [Module 3.2 design](../../planning/design/MODULE_3_2_ORDER_LIFECYCLE_DESIGN.md)

## Verification

```bash
node --use-system-ca scripts/verify-order-fulfillment-system.mjs
```

The script covers auto-creation, mandatory QC, the happy path, actor restrictions, cancellation, QC rework, cross-company isolation, append-only events, direct-write denial, aggregate reads, and selected notifications. Service-role-dependent checks may skip. Phase B must add explicit checks that suppliers cannot raise disputes and disputed Fulfillments cannot complete.

See the [Verification Matrix](../../VERIFICATION_MATRIX.md).

## Boundary summary

| Owns | Does not own |
|---|---|
| Operational status and milestones | PO prices, quantities, Incoterms, parties, payment terms |
| Production, QC, packing, readiness | Carrier legs and customs workflows |
| Lightweight shipment status/reference | Claims resolution and refunds |
| Delivery and buyer completion | Invoices, escrow, or settlement |
| Operational events and documents | Marketplace discovery |

## Future Phase B

Phase B should add typed backend/UI hardening and buyer/supplier operational surfaces while preserving Phase A RPCs, PO immutability, mandatory QC, buyer-gated completion, and RLS isolation.

Phase A gaps Phase B must resolve or explicitly accept:

- No application page currently consumes the Fulfillment service or notification deep-link query parameters.
- Storage objects can be managed by either trade party, but no client/RPC path registers `fulfillment_order_documents` metadata.
- `cancel_fulfillment` currently accepts a missing reason despite the locked “with reason” policy.
- The SQL alias `mark_ready` has no dedicated TypeScript service wrapper.
- No dedicated `releases/v0.5.0-phase-a/` verification artifact exists; this sprint’s live run passed 25 checks with 4 service-role-dependent skips.

---

**Owner:** Trade Operations  
**Last Updated:** 2026-07-18
