# Fulfillment RPC Reference

Domain-focused summary of client-callable Fulfillment RPCs. Parameter-level platform authority remains [API_REFERENCE.md](../../architecture/API_REFERENCE.md).

## Creation and reads

| RPC | Purpose | Actor |
|---|---|---|
| `create_fulfillment` | Idempotently create the missing child for an accepted PO; normal path is automatic PO acceptance | Buyer, supplier, or admin on the PO |
| `get_fulfillment` | Return authorized Fulfillment with events/documents | Buyer, supplier, admin |
| `list_fulfillments` | Return role-scoped, filtered, paginated rows | Buyer, supplier, admin |

`accept_purchase_order` is a Commercial RPC with an Operational side effect: it invokes the trusted create helper so an accepted PO cannot be orphaned.

## Lifecycle RPCs

| RPC | Contract |
|---|---|
| `start_production` | Supplier: `opened` → `in_production`; optional production location |
| `pause_production` | Supplier: set pause while in production |
| `resume_production` | Supplier: clear pause while in production |
| `complete_production` | Supplier: `in_production` → `quality_check` |
| `pass_qc` | Supplier: `quality_check` → `packaging` |
| `fail_qc` | Supplier: reasoned rework to production or terminal failure |
| `pack_order` | Supplier: `packaging` → `ready_to_ship` |
| `mark_ready` | SQL compatibility alias for readiness; no dedicated wrapper exists in `lib/fulfillment/service.ts` |
| `mark_shipped` | Supplier: `ready_to_ship` → `shipped`; optional tracking reference |
| `mark_in_transit` | Supplier: `shipped` → `in_transit` |
| `mark_delivered` | Buyer or supplier: shipped/transit → delivered |
| `complete_fulfillment` | Buyer only: `delivered` → `completed`; blocked while `is_disputed` |
| `cancel_fulfillment` | Buyer pre-ship or supplier from opened; reason is currently optional in SQL, contrary to the locked policy |
| `fail_production` | Supplier: production → failed; reason required |
| `raise_fulfillment_dispute` | Buyer only after shipment: set dispute hold and append event |

## Trusted internal helpers

| Helper | Purpose |
|---|---|
| `_create_fulfillment_for_po` | Shared one-per-accepted-PO creation |
| `_next_fulfillment_order_number` | Generate `TGG-FF-YYYY-######` |
| `_append_fulfillment_event` | Append immutable audit fact |
| `_forbid_fulfillment_event_mutation` | Reject event update/delete |

Internal helpers are not client APIs and have client execution revoked.

## Common guarantees

Every mutator:

- Requires authenticated actor and expected company role.
- Verifies buyer/supplier ownership from the Fulfillment/PO chain.
- Enforces the current-state transition.
- Preserves PO commercial fields.
- Writes timestamps in UTC.
- Appends an audit event and emits applicable trusted notifications.
- Fails closed on unauthorized, duplicate, or invalid transitions.

## Failure categories

- Missing or unaccepted Purchase Order.
- Fulfillment not found or hidden by authorization.
- Wrong actor/company.
- Invalid current status or pause/dispute guard.
- Missing required failure, QC, or dispute reason; cancellation currently permits omission.
- Duplicate creation or terminal record.
- Migration `018` not applied in the target environment.

Clients should present actionable domain errors without exposing another company’s data.

## Verification

`scripts/verify-order-fulfillment-system.mjs` exercises the primary read/write contracts. Any RPC addition or behavior change must update that script, the platform API reference, the state machine, and locked decisions when an invariant changes.

## References

- [State machine](./STATE_MACHINE.md)
- [Events](./EVENTS.md)
- [Security](./SECURITY.md)
- [Verification matrix](../../VERIFICATION_MATRIX.md)

---

**Last Updated:** 2026-07-18
