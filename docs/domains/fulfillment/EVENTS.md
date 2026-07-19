# Fulfillment Events

Fulfillment events are append-only audit facts. They are distinct from inbox notifications, even when both use the same type string.

## Event catalog

| Event | Meaning | Typical state effect |
|---|---|---|
| `fulfillment.opened` | Operational record created from accepted PO | — → `opened` |
| `fulfillment.production_started` | Supplier started production | `opened` → `in_production` |
| `fulfillment.production_paused` | Temporary production hold | Pause flag |
| `fulfillment.production_resumed` | Production resumed | Clear pause flag |
| `fulfillment.qc_started` | Production completed and inspection began | `in_production` → `quality_check` |
| `fulfillment.qc_passed` | Inspection passed | `quality_check` → `packaging` |
| `fulfillment.qc_rework` | Inspection requires rework | `quality_check` → `in_production` |
| `fulfillment.qc_failed` | Inspection failed | Rework or `failed` |
| `fulfillment.packed` | Packing completed | `packaging` → `ready_to_ship` |
| `fulfillment.shipped` | Goods dispatched | `ready_to_ship` → `shipped` |
| `fulfillment.in_transit` | Goods marked en route | `shipped` → `in_transit` |
| `fulfillment.delivered` | Arrival recorded | `shipped`/`in_transit` → `delivered` |
| `fulfillment.completed` | Buyer confirmed close | `delivered` → `completed` |
| `fulfillment.cancelled` | Permitted pre-ship cancellation | → `cancelled` |
| `fulfillment.failed` | Explicit terminal operational failure | → `failed` |
| `fulfillment.disputed` | Buyer raised a post-shipment operational dispute hold | Dispute flag |

## Event record contract

Each event records:

- Fulfillment identifier.
- Stable event type.
- Actor type and actor user when applicable.
- Prior and resulting status when applicable.
- Human-readable message.
- Structured, non-sensitive metadata.
- UTC creation time.

Events are inserted through `_append_fulfillment_event`; update/delete is blocked. Corrections use a compensating future event, never history rewriting.

## Notifications

Trusted RPCs use `_create_system_notification` for relevant counterpart updates. Current notification emission includes lifecycle milestones such as opened, production/QC changes, ready-to-ship, shipped/transit, delivered/completed, cancellation, failure, and dispute.

Notification rules:

1. Clients never insert notification rows.
2. Recipient is derived from trusted party identity.
3. `entity_type` is `fulfillment_order`; `entity_id` is the Fulfillment ID.
4. Action URLs must use the application safe-URL policy.
5. A notification is delivery UX; the event row remains the audit fact.

Current Phase A naming intentionally differs for some facts: packaging stores `fulfillment.packed` while notifying `fulfillment.ready_to_ship`; QC rework stores `fulfillment.qc_rework` while the notification uses `fulfillment.qc_failed`. Production resume is event-only. Deep links target the future Orders/Fulfillment tab, which has no Phase B UI consumer yet.

## Consumers

- Fulfillment detail timeline.
- Buyer and supplier notifications.
- Support/admin read-only investigation.
- Future Analytics cycle-time and exception models.
- Future Logistics/Claims integrations and AI anomaly indicators.

No external event bus is implemented. Any future publication must define delivery, ordering, idempotency, privacy, and schema versioning without changing stored event meanings.

## References

- [State machine](./STATE_MACHINE.md)
- [Security](./SECURITY.md)
- [Engineering event standard](../../STANDARDS.md#event-naming)

---

**Last Updated:** 2026-07-18
