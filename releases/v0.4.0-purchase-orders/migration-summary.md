# Migration Summary

| Field | Value |
|-------|-------|
| **Migration** | `017_purchase_order_system.sql` |
| **Version** | `v0.4.0-purchase-orders` |
| **Purpose** | Implement Purchase Order System (Module 3.1) |
| **Type** | Additive only (does not edit `001`–`016`) |

Source file: [`supabase/migrations/017_purchase_order_system.sql`](../../supabase/migrations/017_purchase_order_system.sql)  
Schema overview: [`docs/architecture/DATABASE_SCHEMA.md`](../../docs/architecture/DATABASE_SCHEMA.md)  
API overview: [`docs/architecture/API_REFERENCE.md`](../../docs/architecture/API_REFERENCE.md)

---

## Tables Created

| Table | Role |
|-------|------|
| `purchase_orders` | Header: parties, award linkage, status, commercial + party snapshots, PO number, revision |
| `purchase_order_items` | Line items (typically one line from award snapshot) |
| `purchase_order_events` | Append-only audit trail |
| `purchase_order_documents` | Attachment metadata |

Also created: sequence `purchase_order_number_seq` for `TGG-PO-YYYY-######` numbering.

---

## Indexes

| Index focus | Intent |
|-------------|--------|
| Partial unique on `award_id` where status ∈ (`draft`,`issued`,`accepted`) | One non-terminal PO per award |
| `(buyer_company_id, created_at desc)` | Buyer list performance |
| `(supplier_company_id, status)` | Supplier inbox filters |
| `(status, issued_at desc)` | Issued-queue scans |
| `(rfq_id)`, `(po_number)` | Lookup by RFQ / number |
| Items `(purchase_order_id, line_no)` unique | Line ordering |
| Events/docs `(purchase_order_id, created_at desc)` | Timeline / file lists |

---

## Foreign Keys

| From | To |
|------|-----|
| `purchase_orders.buyer_company_id` / `supplier_company_id` | `companies` |
| `purchase_orders.award_id` | `quotation_awards` |
| `purchase_orders.rfq_id` | `rfqs` |
| `purchase_orders.thread_id` | `quotation_threads` |
| `purchase_orders.source_offer_id` | `quotation_offers` |
| Items / events / documents | `purchase_orders` |
| Optional `linked_product_id` | `products` |

---

## RLS Policies

| Role | Access |
|------|--------|
| **Buyer** | SELECT own POs (all statuses), items, events, documents |
| **Supplier** | SELECT when status is `issued`, `accepted`, `rejected`, or `cancelled` (drafts hidden) |
| **Admin** | SELECT all |
| **Mutations** | None via client — RPC only |

Events are further protected by an append-only trigger (no UPDATE/DELETE).

---

## RPC Functions

| RPC | Purpose |
|-----|---------|
| `create_purchase_order_draft` | Snapshot + draft from active award |
| `update_purchase_order_draft` | Draft-only edits; bump `revision_no` |
| `issue_purchase_order` | `draft` → `issued`; notify supplier |
| `accept_purchase_order` | Supplier accept |
| `reject_purchase_order` | Supplier reject (reason required) |
| `cancel_purchase_order` | Buyer cancel draft/issued |
| `get_purchase_order` | Aggregated JSON detail |
| `list_purchase_orders` | Role-scoped paginated list |

`revoke_award` is **replaced additively** in this migration to enforce PO guards (block on issued/accepted; auto-cancel drafts).

Internal helpers include `_append_purchase_order_event`, `_next_purchase_order_number`, `_sync_purchase_order_primary_item`.

---

## Storage

| Bucket | Visibility | Path |
|--------|------------|------|
| `purchase-order-docs` | Private | `pos/<buyer_company_id>/<po_id>/…` |

Signed URL access follows existing private-bucket patterns; path helpers enforce ownership.

---

## Notifications

Emitted via trusted `_create_system_notification`:

| Type | Typical recipient |
|------|-------------------|
| `purchase_order.created` | Buyer |
| `purchase_order.issued` | Supplier |
| `purchase_order.accepted` | Buyer |
| `purchase_order.rejected` | Buyer |
| `purchase_order.cancelled` | Supplier (if previously issued) |
| `purchase_order.completed` | Reserved in app types — **not emitted** in Module 3.1 |

---

## Architecture Decisions

Implementation follows **AD-3.1-001** through **AD-3.1-025**.

See [`docs/architecture/ARCHITECTURE_DECISIONS.md`](../../docs/architecture/ARCHITECTURE_DECISIONS.md)  
Design: [`docs/planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md`](../../docs/planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md)

---

## Dependencies

| Dependency | Requirement |
|------------|-------------|
| Migration `016_award_system.sql` | Active awards required |
| Migrations `014`–`015` | RFQ + quotations |
| Notification foundation (`011`) | Trusted inbox writes |

---

## Rollback

Production migrations are **additive** and **must not be rolled back manually** in shared environments. If a rollback is required, restore from backup / point-in-time recovery and follow [`docs/deployment/ROLLBACK_PROCEDURE.md`](../../docs/deployment/ROLLBACK_PROCEDURE.md). Do not delete `017` objects ad hoc.
