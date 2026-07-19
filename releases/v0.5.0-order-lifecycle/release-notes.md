# v0.5.0 Order Lifecycle — Fulfillment Phase B

## Release scope

Phase B completes the application surface for the operational lifecycle created after supplier acceptance of a Purchase Order.

**Status:** Fulfillment Phase B is live-verified and frozen. The global release
tag remains pending only because Trust migration `020` is absent from the
connected verification environment.

### Delivered

- Buyer and Supplier Orders workspaces with Purchase Order / Fulfillment segments.
- Role-scoped Fulfillment lists, filters, details, operational progress, milestones, documents summary, and chronological timeline.
- Supplier controls for production, quality, packing, dispatch, transit, delivery, and supplemental milestones.
- Buyer controls for permitted cancellation, delivery confirmation, completion, and dispute hold.
- Immutable party comments and supplemental milestone events.
- Counterparty notifications for milestones and comments.
- Required cancellation reasons and deterministic event ordering.
- Typed service/RPC contracts and expanded live verification.

## Architecture

The accepted Purchase Order remains immutable commercial truth. `fulfillment_orders` remains its one-to-one operational child and owns current execution state. `fulfillment_order_events` owns append-only history, including Phase B milestones and comments.

Milestones are event subtypes because they have no independent lifecycle or ownership. Port/customs workflows are not statuses in this release and remain owned by future Logistics Module 3.3.

## Activation

Apply migrations in order:

1. `017_purchase_order_system.sql`
2. `018_order_fulfillment_system.sql`
3. `023_fulfillment_phase_b_operations.sql`

Then run:

```bash
node --use-system-ca scripts/verify-order-fulfillment-system.mjs
```

## Security

- Reads remain buyer/supplier tenant scoped through RLS.
- All mutations remain `SECURITY DEFINER` RPCs with role, ownership, and state guards.
- Clients have no direct lifecycle/event writes.
- Events remain append-only.
- Admin support remains read-only in Module 3.2.

See [known limitations](./known-limitations.md) and [verification results](./verification-results.md).
