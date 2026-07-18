# Version

**v0.4.0-purchase-orders**

| Field | Value |
|-------|-------|
| **Release date** | 2026-07-18 |
| **Release status** | Production Ready |
| **npm version** | `0.4.0` |
| **Prior release** | `v0.3.0-procurement-complete` |

Canonical product notes also live in [`docs/RELEASE_NOTES.md`](../../docs/RELEASE_NOTES.md) and [`docs/CHANGELOG.md`](../../docs/CHANGELOG.md).

---

## Summary

This release introduces the **Purchase Order System (Module 3.1)** for Trade Grid Global. After a buyer awards a supplier, both parties can create, issue, accept, reject, or cancel a purchase order with an immutable commercial snapshot, append-only audit trail, RPC-only mutations, and trusted notifications.

Procurement path:

`RFQ → Quotation → Award → Purchase Order`

---

## Major Features

| Feature | Description |
|---------|-------------|
| Complete Purchase Order System | End-to-end PO domain from award through accept/reject |
| Purchase Order lifecycle | `draft` → `issued` → `accepted` \| `rejected` \| `cancelled` |
| Buyer Purchase Orders | List, create from award, draft edit, issue, cancel |
| Supplier Purchase Orders | Incoming list, accept / reject with reason, read-only after accept |
| Commercial Snapshot | Prices, quantities, Incoterms, lead time, payment terms, party identity |
| Purchase Order numbering | Professional IDs: `TGG-PO-YYYY-000001` |
| Revision support | `revision_no` increments on draft updates |
| Audit Events | Append-only `purchase_order_events` |
| RLS Security | SELECT policies for buyer, supplier (non-draft), admin |
| RPC-only architecture | All writes via SECURITY DEFINER RPCs |
| Notifications | Trusted `purchase_order.*` inbox events |
| Private document storage | Bucket `purchase-order-docs` |
| Verification script | `scripts/verify-purchase-order-system.mjs` |

---

## Architecture Highlights

Module 3.1 follows locked decisions **AD-3.1-001** through **AD-3.1-025**:

- PO originates only from an **active award**
- At most one non-terminal PO per award
- Commercial fields immutable after **issue**
- No physical deletes; events append-only
- `completed`, logistics, payments, and amendments deferred

Full registry: [`docs/architecture/ARCHITECTURE_DECISIONS.md`](../../docs/architecture/ARCHITECTURE_DECISIONS.md)  
Design: [`docs/planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md`](../../docs/planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md)

---

## Database Changes

Additive migration **`017_purchase_order_system.sql`** (does not modify `001`–`016`).

See [migration-summary.md](./migration-summary.md) for tables, indexes, RLS, RPCs, and storage.

---

## Security Improvements

| Control | Behavior |
|---------|----------|
| RLS | Client SELECT only; no direct INSERT/UPDATE/DELETE |
| RPC ownership | Buyer/supplier company checks on every mutator |
| Company isolation | Cross-company reads denied; supplier cannot see drafts |
| Immutable snapshots | Commercial truth from PO after issue, not live offer |
| Award revoke guards | Block revoke when PO is issued/accepted; auto-cancel drafts |

---

## Breaking Changes

**None.** This release is additive. Existing RFQ, quotation, and award APIs remain compatible. `revoke_award` gains additional guards when POs exist (expected safety behavior).

---

## Known Limitations

See [known-limitations.md](./known-limitations.md).

---

## Upgrade Notes

1. Ensure migrations `001`–`016` are already applied.
2. **Apply `017_purchase_order_system.sql` before using Purchase Orders.**
3. Redeploy the application (`0.4.0`).
4. Run `node --use-system-ca scripts/verify-purchase-order-system.mjs` on the target environment.

Without migration `017`, PO tables and RPCs will be unavailable.

---

## Future Roadmap

**Module 3.2 — Order Lifecycle** builds on accepted purchase orders for fulfillment states, without inventing a second commercial truth source.

See [`docs/planning/ROADMAP.md`](../../docs/planning/ROADMAP.md).

---

## Package Contents

| File | Purpose |
|------|---------|
| [release-notes.md](./release-notes.md) | This document |
| [verification-results.md](./verification-results.md) | Quality gate results |
| [migration-summary.md](./migration-summary.md) | Migration 017 summary |
| [known-limitations.md](./known-limitations.md) | Scope cuts and gaps |
