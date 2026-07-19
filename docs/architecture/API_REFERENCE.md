# API Reference (Supabase RPCs)

Client-facing and notable internal RPCs for Trade Grid Global.  
Invoked from the Next.js app via `supabase.rpc(...)` (see `lib/*/service.ts`).

Related: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) · [SECURITY_MODEL.md](./SECURITY_MODEL.md) · [ARCHITECTURE_STATUS_v0.3.0.md](./ARCHITECTURE_STATUS_v0.3.0.md)

Domain contracts: [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) · [Fulfillment RPC Reference](../domains/fulfillment/RPC_REFERENCE.md)

**Legend**

- **Permissions:** who may successfully execute
- **Internal:** underscore helpers — not for direct client use (typically revoked)

### Table of contents

- [Account provisioning](#account-provisioning)
- [Role & access helpers](#role--access-helpers)
- [Notifications](#notifications)
- [Company verification](#company-verification)
- [Products](#products)
- [RFQ](#rfq)
- [Quotations](#quotations)
- [Awards](#awards)
- [HTTP API routes](#http-api-routes-nextjs)

---

## Account provisioning

### `recover_incomplete_marketplace_account(p_full_name, p_company_name, p_account_type)`

|                    |                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**        | One-time transactional repair for an authenticated legacy Auth user whose marketplace company was never created                |
| **Permissions**    | `authenticated`; caller can recover only `auth.uid()`                                                                          |
| **Business rules** | Buyer/supplier only; administrator profiles forbidden; company must be absent; profile role and company are written atomically |
| **Returns**        | Created `companies` row                                                                                                        |
| **Failure**        | No session; invalid identity inputs; admin profile; company already exists                                                     |
| **Related**        | Migration `021`, `auth.users`, `profiles`, `companies`, `provision_marketplace_account_from_auth()`                            |

Normal signup does not call this RPC. Migration `021` provisions `profiles` and
`companies` from validated Auth metadata in the same transaction as the
`auth.users` insert. The RPC exists only to recover accounts orphaned by the
legacy client-sequenced flow.

---

## Role & access helpers

### `is_admin()` / `is_supplier()` / `is_buyer()`

|                 |                              |
| --------------- | ---------------------------- |
| **Purpose**     | Role predicates for RLS/RPCs |
| **Parameters**  | none                         |
| **Returns**     | `boolean`                    |
| **Permissions** | `authenticated` (execute)    |
| **Related**     | `profiles`                   |

### `user_owns_company(cid uuid)`

|                 |                 |
| --------------- | --------------- |
| **Purpose**     | Ownership check |
| **Returns**     | `boolean`       |
| **Permissions** | `authenticated` |

### `can_delete_pending_company_document_file(path)` / `can_delete_pending_company_document_metadata(id)`

|                    |                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**        | Internal RLS predicates for ordered owner deletion of pending company evidence                                                  |
| **Permissions**    | `authenticated`; result is always bound to `auth.uid()`                                                                         |
| **Business rules** | Company must be pending/rejected; evidence must be pending and not case-linked; metadata deletion additionally requires no file |
| **Related**        | Migration `022`, `documents`, private `company-docs`, `verification_case_documents`                                             |

### `supplier_can_access_rfq(p_rfq_id uuid)`

|                    |                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **Purpose**        | Whether current supplier may read an RFQ (visibility rules **or** existing quotation thread — 016) |
| **Returns**        | `boolean`                                                                                          |
| **Business rules** | Open/quoted discoverability by visibility; post-award read if thread exists                        |
| **Related**        | `rfqs`, `rfq_invites`, `quotation_threads`                                                         |

### `can_access_quotation_thread(p_thread_id uuid)`

|             |                                             |
| ----------- | ------------------------------------------- |
| **Purpose** | Buyer/owner supplier/admin access predicate |
| **Returns** | `boolean`                                   |

### `verification_case_sla_state(...)`

|                 |                                         |
| --------------- | --------------------------------------- |
| **Purpose**     | Compute SLA state for a case (013)      |
| **Permissions** | As granted in migration (admin tooling) |

---

## Notifications

### `mark_notification_read(notification_id uuid)`

|                 |                                                               |
| --------------- | ------------------------------------------------------------- |
| **Purpose**     | Mark one notification read                                    |
| **Returns**     | Updated notification row (as defined in migration)            |
| **Permissions** | Recipient only                                                |
| **Failure**     | Not found / not owner                                         |
| **Example**     | `supabase.rpc('mark_notification_read', { notification_id })` |
| **Related**     | `notifications`                                               |

### `mark_all_notifications_read()`

|                 |                                    |
| --------------- | ---------------------------------- |
| **Purpose**     | Mark all caller notifications read |
| **Permissions** | Authenticated caller’s rows only   |

### `_create_system_notification(...)` / `_notify_all_admins(...)`

|                 |                                    |
| --------------- | ---------------------------------- |
| **Purpose**     | Trusted notification creation      |
| **Permissions** | **Internal** — not client-callable |
| **Related**     | `notifications`                    |

---

## Company verification

### `submit_company_for_verification(company_id uuid)`

|                    |                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**        | Owner submits company for review → `under_review`                                                                                                                                                                              |
| **Permissions**    | Company owner                                                                                                                                                                                                                  |
| **Business rules** | Only from `pending`/`rejected`; requires completed legal company profile plus storage-backed active `Trade License` and `Company Registration`; opens a new case and freezes its evidence set (`013`, hardened by `019`/`020`) |
| **Failure**        | Not owner; invalid status; incomplete profile; missing/rejected required evidence                                                                                                                                              |
| **Related**        | `companies`, `documents`, `storage.objects`, `verification_cases`, `verification_case_documents`, notifications                                                                                                                |

### `get_company_verification_feedback(company_id uuid)`

|                 |                                                          |
| --------------- | -------------------------------------------------------- |
| **Purpose**     | Return the latest rejection reason to the owning company |
| **Permissions** | Company owner                                            |
| **Returns**     | Rejection reason text or `null`                          |
| **Failure**     | Not authenticated; not owner                             |

### `approve_company_verification(p_company_id uuid, ...)`

|                    |                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**        | Admin approve company                                                                                                                            |
| **Permissions**    | Admin                                                                                                                                            |
| **Business rules** | Company must be `under_review` with case `in_review`; approves case-scoped pending evidence; does not modify risk score; resolves case; notifies |
| **Related**        | `companies`, `documents`, `verification_cases`, `verification_case_documents`                                                                    |

### `reject_company_verification(p_company_id uuid, ...)`

|                    |                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Purpose**        | Admin reject company with reason                                                                           |
| **Permissions**    | Admin                                                                                                      |
| **Business rules** | Requires case `in_review` and non-blank reason; rejects case-scoped pending evidence so it can be replaced |
| **Failure**        | Not under review; review not started; blank reason; not admin                                              |

### `start_verification_case_review(p_case_id uuid)`

|                 |                                 |
| --------------- | ------------------------------- |
| **Purpose**     | Admin moves case to `in_review` |
| **Permissions** | Admin                           |

### `set_verification_case_priority(p_case_id uuid, p_priority text, ...)`

|                 |                       |
| --------------- | --------------------- | ------ | ---- | ------- |
| **Purpose**     | Admin priority change |
| **Permissions** | Admin                 |
| **Constraints** | Priority in `low      | normal | high | urgent` |

---

## Products

### `submit_product_for_review(product_id uuid)`

|                  |                                                  |
| ---------------- | ------------------------------------------------ |
| **Purpose**      | Supplier submits draft/rejected → pending review |
| **Permissions**  | Owning supplier                                  |
| **Side effects** | Notifications; verification case sync (013)      |
| **Failure**      | Not owner; invalid status                        |

### `approve_product(product_id uuid)`

|                  |                                            |
| ---------------- | ------------------------------------------ |
| **Purpose**      | Admin publish product                      |
| **Permissions**  | Admin                                      |
| **Side effects** | `published`; notify supplier; resolve case |

### `reject_product(product_id uuid, reason text)`

|                 |                                |
| --------------- | ------------------------------ |
| **Purpose**     | Admin reject with reason       |
| **Permissions** | Admin                          |
| **Failure**     | Empty reason (enforced in RPC) |

### `archive_product(product_id uuid)`

|                 |                                                      |
| --------------- | ---------------------------------------------------- |
| **Purpose**     | Supplier archives allowed statuses                   |
| **Permissions** | Owner supplier                                       |
| **Failure**     | Pending cannot archive (per lifecycle verify script) |

### `restore_archived_product(product_id uuid)`

|                 |                                            |
| --------------- | ------------------------------------------ |
| **Purpose**     | Archive → draft (never directly published) |
| **Permissions** | Owner                                      |

### `reopen_published_product_for_editing(product_id uuid)`

|                 |                                                        |
| --------------- | ------------------------------------------------------ |
| **Purpose**     | Published → draft for edit (removes public visibility) |
| **Permissions** | Owner (as implemented in 010)                          |

---

## RFQ

### `create_draft_rfq(...)`

|                 |                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| **Purpose**     | Create draft RFQ; optional invites                                                                             |
| **Key params**  | `p_title`, `p_product_name`, `p_category`, visibility, quantity, certs, deadline, `p_invite_supplier_ids[]`, … |
| **Returns**     | `rfqs` row                                                                                                     |
| **Permissions** | Buyer                                                                                                          |
| **Related**     | `rfqs`, `rfq_invites`, `rfq_events`                                                                            |

### `update_draft_rfq(p_rfq_id uuid, ...)`

|                 |                       |
| --------------- | --------------------- |
| **Purpose**     | Update draft only     |
| **Permissions** | Owning buyer          |
| **Failure**     | Not draft / not owner |

### `publish_rfq(p_rfq_id uuid)`

|                 |                                              |
| --------------- | -------------------------------------------- |
| **Purpose**     | Draft → `open`; notify; invite notifications |
| **Permissions** | Owning buyer                                 |
| **Failure**     | Invalid status                               |

### `close_rfq(p_rfq_id uuid)` / `cancel_rfq(p_rfq_id uuid, p_reason text)`

|                 |                                     |
| --------------- | ----------------------------------- |
| **Purpose**     | Close or cancel RFQ; notify parties |
| **Permissions** | Owning buyer                        |
| **Failure**     | Illegal transition                  |

**Example**

```ts
await supabase.rpc("publish_rfq", { p_rfq_id: rfqId })
```

---

## Quotations

### `create_draft_quotation(...)`

|                 |                                                                   |
| --------------- | ----------------------------------------------------------------- |
| **Purpose**     | Create/ensure thread + draft offer                                |
| **Permissions** | Supplier with quote access                                        |
| **Failure**     | Cannot quote (visibility/status); draft already exists path rules |

### `update_draft_quotation(p_offer_id uuid, ...)`

|                 |                                |
| --------------- | ------------------------------ |
| **Purpose**     | Update draft commercial fields |
| **Permissions** | Owning supplier                |
| **Failure**     | Not draft                      |

### `submit_quotation(...)`

|                    |                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Purpose**        | Submit new offer or existing draft                                                       |
| **Key params**     | `p_rfq_id` and/or `p_offer_id`, unit price, currency, lead time, MOQ, incoterm, notes, … |
| **Returns**        | `quotation_offers` row (`submitted`)                                                     |
| **Permissions**    | Supplier                                                                                 |
| **Business rules** | RFQ must be `open`/`quoted`; blocks after award/close                                    |
| **Side effects**   | Buyer `quotation.submitted`; may set RFQ `quoted`                                        |
| **Failure**        | Access denied; closed/awarded RFQ; validation                                            |

### `create_quotation_revision(p_thread_id uuid, ...)`

|                  |                                                        |
| ---------------- | ------------------------------------------------------ |
| **Purpose**      | New submitted revision; prior submitted → `superseded` |
| **Permissions**  | Owning supplier; thread active                         |
| **Side effects** | `quotation.updated`                                    |

### `withdraw_quotation(p_thread_id uuid)`

|                  |                        |
| ---------------- | ---------------------- |
| **Purpose**      | Withdraw thread/offers |
| **Permissions**  | Owning supplier        |
| **Side effects** | `quotation.withdrawn`  |

### `get_quotation_thread(p_thread_id uuid)`

|                 |                                              |
| --------------- | -------------------------------------------- |
| **Purpose**     | Aggregated JSON: thread, rfq, offers, events |
| **Permissions** | Buyer of RFQ, owning supplier, or admin      |
| **Failure**     | Access denied                                |
| **Returns**     | `jsonb` / record payload                     |

**Example**

```ts
await supabase.rpc("submit_quotation", {
  p_rfq_id: rfqId,
  p_unit_price: 900,
  p_currency: "USD",
  p_incoterm: "FOB",
})
```

---

## Awards

### `award_supplier(p_rfq_id uuid, p_thread_id uuid, p_notes text default null)`

|                    |                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**        | Award winning quotation; lock RFQ                                                                                                                             |
| **Returns**        | `quotation_awards` row (`active`)                                                                                                                             |
| **Permissions**    | Buyer owning the RFQ                                                                                                                                          |
| **Business rules** | RFQ `open`/`quoted`; one active award; thread belongs to RFQ; submitted supplier offer required; winner → `awarded`; losers → `not_selected`; RFQ → `awarded` |
| **Side effects**   | Award/RFQ/quotation events; notifications `rfq.awarded`, `quotation.awarded`, `quotation.not_selected`                                                        |
| **Failure**        | Not buyer/owner; already awarded; closed/cancelled; withdrawn thread; no submitted offer                                                                      |
| **Related**        | `quotation_awards`, `award_events`, `rfqs`, offers/threads                                                                                                    |

### `get_award(p_rfq_id uuid)`

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| **Purpose**     | Fetch award payload for authorized parties                                    |
| **Returns**     | `jsonb` with `awarded`, `is_winner`, `award`, `events` (losers: `award` null) |
| **Permissions** | Buyer, quoting participant, admin                                             |
| **Failure**     | Access denied; RFQ missing                                                    |

### `revoke_award(p_award_id uuid, p_reason text default null)`

|                    |                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**        | Revoke active award; reopen RFQ to `quoted`; restore offers for re-award                                                                                      |
| **Permissions**    | Owning buyer                                                                                                                                                  |
| **Business rules** | Preserves award history (`revoked`); does not delete rows; **blocked** if any PO for the award is `issued` or `accepted`; auto-cancels open `draft` POs (017) |
| **Failure**        | Not active; not owner; issued/accepted PO exists                                                                                                              |

**Example**

```ts
await supabase.rpc("award_supplier", {
  p_rfq_id: rfqId,
  p_thread_id: threadId,
  p_notes: "Best landed cost",
})
```

---

## Purchase orders

### `create_purchase_order_draft(p_award_id uuid, p_payment_terms text default null, p_notes text default null)`

|                    |                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| **Purpose**        | Create draft PO with commercial + party snapshots from active award                              |
| **Returns**        | `purchase_orders` row (`draft`)                                                                  |
| **Permissions**    | Buyer owning the award’s RFQ                                                                     |
| **Business rules** | Active award; RFQ `awarded`; at most one non-terminal PO per award; assigns `TGG-PO-YYYY-######` |
| **Side effects**   | Line item sync; `purchase_order.created` event + buyer notification                              |

### `update_purchase_order_draft(...)`

|                 |                                                        |
| --------------- | ------------------------------------------------------ |
| **Purpose**     | Edit draft commercial fields; increments `revision_no` |
| **Permissions** | Owning buyer                                           |
| **Failure**     | Not draft; not owner                                   |

### `issue_purchase_order(p_purchase_order_id uuid)`

|                 |                                                                |
| --------------- | -------------------------------------------------------------- |
| **Purpose**     | `draft` → `issued`; locks commercial fields; notifies supplier |
| **Permissions** | Owning buyer                                                   |
| **Failure**     | Not draft; award not active                                    |

### `accept_purchase_order(p_purchase_order_id uuid)` / `reject_purchase_order(p_purchase_order_id uuid, p_reason text)`

|                           |                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Purpose**               | Supplier response on issued PO                                                                            |
| **Permissions**           | Supplier company on PO                                                                                    |
| **Failure**               | Not issued; wrong company; reject without reason                                                          |
| **Side effects (accept)** | Auto-creates `fulfillment_orders` row in `opened` (AD-3.2-004) + `fulfillment.opened` event/notifications |

### `cancel_purchase_order(p_purchase_order_id uuid, p_reason text default null)`

|             |                                        |
| ----------- | -------------------------------------- |
| **Purpose** | Buyer cancel `draft` or `issued`       |
| **Failure** | Accepted/rejected/cancelled; not owner |

### `get_purchase_order(p_purchase_order_id uuid)` / `list_purchase_orders(p_status, p_limit, p_offset)`

|             |                                                                                   |
| ----------- | --------------------------------------------------------------------------------- |
| **Purpose** | Aggregated detail JSON / paginated list for buyer, supplier (non-draft), or admin |
| **Returns** | `jsonb`                                                                           |

**Example**

```ts
await supabase.rpc("create_purchase_order_draft", {
  p_award_id: awardId,
  p_payment_terms: "Net 30",
})
await supabase.rpc("issue_purchase_order", { p_purchase_order_id: poId })
```

---

## Fulfillment orders (Module 3.2 Phases A and B)

Operational lifecycle after accepted PO. Commercial fields remain on `purchase_orders`.

### `create_fulfillment(p_purchase_order_id uuid)`

|                 |                                                                              |
| --------------- | ---------------------------------------------------------------------------- |
| **Purpose**     | Idempotent create when fulfillment missing (normally auto-created on accept) |
| **Returns**     | `fulfillment_orders` row                                                     |
| **Permissions** | Buyer, supplier on PO, or admin                                              |
| **Failure**     | PO not accepted; unauthorized                                                |

### Lifecycle transitions

| RPC                                                          | From → To                                            | Actor             |
| ------------------------------------------------------------ | ---------------------------------------------------- | ----------------- |
| `start_production(p_fulfillment_id, p_production_location?)` | `opened` → `in_production`                           | Supplier          |
| `pause_production` / `resume_production`                     | Flag `is_paused` while `in_production`               | Supplier          |
| `complete_production`                                        | `in_production` → `quality_check`                    | Supplier          |
| `pass_qc`                                                    | `quality_check` → `packaging`                        | Supplier          |
| `fail_qc(p_fulfillment_id, p_reason, p_terminal?)`           | Rework → `in_production` or terminal → `failed`      | Supplier          |
| `pack_order` / `mark_ready`                                  | `packaging` → `ready_to_ship`                        | Supplier          |
| `mark_shipped(p_fulfillment_id, p_tracking_reference?)`      | `ready_to_ship` → `shipped`                          | Supplier          |
| `mark_in_transit`                                            | `shipped` → `in_transit`                             | Supplier          |
| `mark_delivered`                                             | `shipped`\|`in_transit` → `delivered`                | Buyer or supplier |
| `complete_fulfillment`                                       | `delivered` → `completed`                            | Buyer             |
| `cancel_fulfillment`                                         | Pre-ship (buyer) / `opened` (supplier) → `cancelled` | Party             |
| `fail_production`                                            | `in_production` → `failed`                           | Supplier          |
| `raise_fulfillment_dispute`                                  | Sets `is_disputed` (hold) after shipment             | Buyer             |

### Timeline operations

| RPC                                                                                       | Purpose                                            | Actor                   |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------- |
| `add_fulfillment_milestone(p_fulfillment_id, p_milestone_type, p_notes?, p_occurred_at?)` | Append canonical milestone event; status unchanged | Supplier owner          |
| `add_fulfillment_comment(p_fulfillment_id, p_comment)`                                    | Append immutable operational comment               | Buyer or supplier owner |

Supplemental milestone types: `container_loaded`, `shipment_booked`, `departed_port`, `arrived_destination`. Production started, packing complete, and delivered are existing lifecycle events and cannot be duplicated through this RPC. These are timeline facts; port/customs workflows remain Logistics 3.3.

### `get_fulfillment(p_fulfillment_id uuid)` / `list_fulfillments(p_status, p_limit, p_offset)`

|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| **Purpose**     | Detail JSON (order + events + documents) / paginated list |
| **Permissions** | Owning buyer/supplier or admin                            |

**Example**

```ts
await supabase.rpc("start_production", {
  p_fulfillment_id: fulfillmentId,
  p_production_location: "Mumbai plant",
})
await supabase.rpc("complete_fulfillment", { p_fulfillment_id: fulfillmentId })
```

App wrappers: `lib/fulfillment/service.ts`. Buyer and supplier UI consumes these through the Orders → Fulfillment segment.

---

## Internal helpers (selected)

| Function                                            | Purpose                                             |
| --------------------------------------------------- | --------------------------------------------------- |
| `_append_rfq_event`                                 | RFQ audit insert                                    |
| `_append_quotation_event`                           | Quotation audit insert                              |
| `_append_purchase_order_event`                      | PO audit insert                                     |
| `_next_purchase_order_number`                       | `TGG-PO-YYYY-######`                                |
| `_append_fulfillment_event`                         | Fulfillment audit insert                            |
| `_next_fulfillment_order_number`                    | `TGG-FF-YYYY-######`                                |
| `_create_fulfillment_for_po`                        | Shared create used by accept + `create_fulfillment` |
| `_append_award_event`                               | Award audit insert                                  |
| `_recompute_rfq_quote_status`                       | open ↔ quoted based on active submits               |
| `_assert_supplier_can_quote`                        | Enforce quote eligibility                           |
| `_ensure_quotation_thread`                          | Get/create thread                                   |
| `_open_or_refresh_verification_case` / `_resolve_*` | Case lifecycle                                      |

These are **not** part of the public client API.

---

## HTTP API routes (Next.js)

| Route                     | Purpose                             | Notes                                                                         |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `app/auth/callback`       | OAuth/email callback                | Auth                                                                          |
| `app/api/verify-document` | Document verification helper        | Not a Supabase RPC; see route for env needs                                   |
| `app/api/guest/session`   | Create/delete guest browser session | Validates input; encrypts/authenticates two-hour HttpOnly cookie; no DB write |

REST resource APIs for orders/payments — **Not implemented.**
