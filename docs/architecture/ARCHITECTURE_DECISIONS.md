# Architecture Decisions — Trade Grid Global

**Purpose:** Official architectural contract for locked product/engineering decisions.  
**Companion:** Informal historical log remains in [DECISION_LOG.md](./DECISION_LOG.md) (D001–D008).  
**Module 3.1 source:** [../planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md](../planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md)

**Status legend:** `LOCKED` = binding for implementation · `SUPERSEDED` · `DEPRECATED`

---

## Index — Module 3.1 Purchase Order

| Decision ID | Title | Status |
|-------------|-------|--------|
| AD-3.1-001 | PO originates only from active Award | LOCKED |
| AD-3.1-002 | At most one non-terminal PO per Award | LOCKED |
| AD-3.1-003 | Commercial snapshot on PO | LOCKED |
| AD-3.1-004 | Snapshot party identity (company + contacts) | LOCKED |
| AD-3.1-005 | Commercial fields immutable after issue | LOCKED |
| AD-3.1-006 | No physical deletes of PO records | LOCKED |
| AD-3.1-007 | Append-only purchase order events | LOCKED |
| AD-3.1-008 | RPC-only writes for PO mutations | LOCKED |
| AD-3.1-009 | UTC timestamps | LOCKED |
| AD-3.1-010 | Supplier cannot see draft POs | LOCKED |
| AD-3.1-011 | New draft allowed after reject/cancel (not after accept) | LOCKED |
| AD-3.1-012 | `completed` deferred to Module 3.2 | LOCKED |
| AD-3.1-013 | Block award revoke when issued or accepted PO exists | LOCKED |
| AD-3.1-014 | Nav label “Orders” hosts PO lists in 3.1 | LOCKED |
| AD-3.1-015 | Line items: schema + UI list; no multi-SKU picker in 3.1 | LOCKED |
| AD-3.1-016 | Optional payment-terms text on PO header | LOCKED |
| AD-3.1-017 | No auto-expiry of issued POs in 3.1 | LOCKED |
| AD-3.1-018 | No admin force actions in 3.1 | LOCKED |
| AD-3.1-019 | Electronic acceptance via durable state + Platform ToS | LOCKED |
| AD-3.1-020 | No logistics in Module 3.1 | LOCKED |
| AD-3.1-021 | No payments capture in Module 3.1 | LOCKED |
| AD-3.1-022 | PO amendments / versions out of scope for 3.1 | LOCKED |
| AD-3.1-023 | Accepted PO is commercial baseline for later fulfillment | LOCKED |
| AD-3.1-024 | Additive migration only (do not edit 001–016) | LOCKED |
| AD-3.1-025 | Trusted notifications only for PO events | LOCKED |

---

## Decisions — Module 3.1

### AD-3.1-001 — PO originates only from active Award

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-001 |
| **Module** | 3.1 Purchase Order |
| **Title** | PO originates only from active Award |
| **Status** | LOCKED |
| **Decision** | A Purchase Order may be created only from an **active** `quotation_awards` row. Create must fail if the award is missing, not active, or parties/RFQ chain are inconsistent. |
| **Reason** | Preserves D006 (award before orders). Prevents orphan commercial commitments and keeps RFQ → Quotation → Award → PO as a single trust path. |
| **Alternatives considered** | Create PO from RFQ or quotation without award (rejected — skips selection audit); create from revoked award (rejected — invalid selection). |
| **Future review** | None for 3.1. Multi-award / split-award models would require a new ADR. |
| **Date** | 2026-07-18 |

### AD-3.1-002 — At most one non-terminal PO per Award

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-002 |
| **Module** | 3.1 Purchase Order |
| **Title** | At most one non-terminal PO per Award |
| **Status** | LOCKED |
| **Decision** | At most one PO per award may exist in status `draft`, `issued`, or `accepted` at a time. Enforce via RPC guards and a partial unique index (or equivalent). Terminal statuses `rejected` and `cancelled` do not count toward this limit. |
| **Reason** | Prevents duplicate concurrent commercial commitments for the same award while allowing recovery after reject/cancel (see AD-3.1-011). |
| **Alternatives considered** | One PO forever per award (rejected — blocks recovery after supplier reject); unlimited concurrent drafts (rejected — race and confusion). |
| **Future review** | Split orders / multi-supplier awards (product change). |
| **Date** | 2026-07-18 |

### AD-3.1-003 — Commercial snapshot on PO

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-003 |
| **Module** | 3.1 Purchase Order |
| **Title** | Commercial snapshot on PO |
| **Status** | LOCKED |
| **Decision** | On draft create, copy commercial terms from the awarded offer (and RFQ context) onto the PO header and `purchase_order_items`. After issue, UI and APIs display commercial truth from the PO snapshot, not live offer rows. |
| **Reason** | Later offer edits or award changes must not silently rewrite history. Required for audit and dispute readiness. |
| **Alternatives considered** | Live join to offer for display (rejected — mutable history); snapshot only at accept (rejected — issued PO must already be stable for supplier review). |
| **Future review** | Amendment versions (AD-3.1-022) when Module 3.x adds change orders. |
| **Date** | 2026-07-18 |

### AD-3.1-004 — Snapshot party identity (company + contacts)

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-004 |
| **Module** | 3.1 Purchase Order |
| **Title** | Snapshot party identity (company + contacts) |
| **Status** | LOCKED |
| **Decision** | At draft create (refreshed at issue if still draft-editable policy allows), snapshot buyer/supplier company display names and primary trade contact fields available on the award/RFQ path onto the PO (or itemized metadata). Retain FK `buyer_company_id` / `supplier_company_id` for authorization. |
| **Reason** | Company renames and contact changes must not alter the historical commercial instrument. Authorization still uses company IDs. |
| **Alternatives considered** | Always resolve live company profile for PDF/display (rejected for historical accuracy); snapshot only names, never contacts (weaker for trade ops). |
| **Future review** | Formal registered address / tax ID snapshot when compliance module expands. |
| **Date** | 2026-07-18 |

### AD-3.1-005 — Commercial fields immutable after issue

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-005 |
| **Module** | 3.1 Purchase Order |
| **Title** | Commercial fields immutable after issue |
| **Status** | LOCKED |
| **Decision** | While `draft`, buyer may update allowed commercial/draft fields via RPC. From status `issued` onward, commercial snapshot fields and line commercial fields are immutable in Module 3.1. Acceptance does not re-open editing. |
| **Reason** | Supplier must review a stable instrument; acceptance acknowledges that instrument. Aligns with “no amendments in 3.1.” |
| **Alternatives considered** | Editable until accept (rejected — supplier may accept a moving target); editable after accept (rejected — destroys commercial baseline). |
| **Future review** | Controlled amendments via `purchase_order_versions` (future module). |
| **Date** | 2026-07-18 |

### AD-3.1-006 — No physical deletes of PO records

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-006 |
| **Module** | 3.1 Purchase Order |
| **Title** | No physical deletes of PO records |
| **Status** | LOCKED |
| **Decision** | Purchase orders, items, events, and document metadata are not physically deleted by product RPCs. Lifecycle ends via `cancelled` / `rejected` (and future statuses). Storage object removal, if ever allowed, must leave an audit event. |
| **Reason** | Trade audit and dispute readiness; matches RFQ/award event retention patterns. |
| **Alternatives considered** | Soft-delete flag column (unnecessary if terminal statuses suffice); hard DELETE for drafts (rejected — weak audit). |
| **Future review** | Legal retention / erasure requests (compliance process, not product DELETE). |
| **Date** | 2026-07-18 |

### AD-3.1-007 — Append-only purchase order events

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-007 |
| **Module** | 3.1 Purchase Order |
| **Title** | Append-only purchase order events |
| **Status** | LOCKED |
| **Decision** | Every create / update-draft (optional fine-grained) / issue / accept / reject / cancel writes `purchase_order_events`. No client or RPC UPDATE/DELETE on event rows. |
| **Reason** | Immutable audit trail required by design security model and production acceptance criteria. |
| **Alternatives considered** | Status-only history on header (rejected — insufficient); mutable event corrections (rejected — breaks trust). |
| **Future review** | Partitioning if event volume requires it operationally. |
| **Date** | 2026-07-18 |

### AD-3.1-008 — RPC-only writes for PO mutations

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-008 |
| **Module** | 3.1 Purchase Order |
| **Title** | RPC-only writes for PO mutations |
| **Status** | LOCKED |
| **Decision** | All INSERT/UPDATE/DELETE on PO tables occur only through SECURITY DEFINER RPCs with `search_path` set, ownership checks, and status guards. RLS allows SELECT (scoped); clients have no direct mutation grants. Extends D003. |
| **Reason** | Fail-closed lifecycle; prevents workflow bypass and cross-company writes. |
| **Alternatives considered** | Client UPDATEs under RLS (rejected — easy to miss transition rules); service-role from Next.js only (rejected as sole control — DB must enforce). |
| **Future review** | None for 3.1 pattern. |
| **Date** | 2026-07-18 |

### AD-3.1-009 — UTC timestamps

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-009 |
| **Module** | 3.1 Purchase Order |
| **Title** | UTC timestamps |
| **Status** | LOCKED |
| **Decision** | Persist all PO timestamps (`created_at`, `updated_at`, `issued_at`, `accepted_at`, etc.) in UTC (`timestamptz`). UI localizes for display. |
| **Reason** | Cross-border Food/FMCG trade; consistent with existing Supabase schema conventions. |
| **Alternatives considered** | Company-local timezone columns (rejected — ambiguity across parties). |
| **Future review** | None. |
| **Date** | 2026-07-18 |

### AD-3.1-010 — Supplier cannot see draft POs

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-010 |
| **Module** | 3.1 Purchase Order |
| **Title** | Supplier cannot see draft POs |
| **Status** | LOCKED |
| **Decision** | Suppliers have no SELECT visibility on POs in `draft` (RLS and/or RPC filters). Supplier access begins at `issued`. |
| **Reason** | Avoids premature commercial signaling and incomplete-instrument noise; cleaner inbox UX. |
| **Alternatives considered** | Read-only draft preview for supplier (rejected for 3.1 — leaks intent before issue); shared collaborative draft (out of scope). |
| **Future review** | Optional “preview to supplier” feature flag if large buyers demand it. |
| **Date** | 2026-07-18 |

### AD-3.1-011 — New draft allowed after reject/cancel

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-011 |
| **Module** | 3.1 Purchase Order |
| **Title** | New draft allowed after reject/cancel (not after accept) |
| **Status** | LOCKED |
| **Decision** | If an award has no PO in `draft`, `issued`, or `accepted`, the buyer may create a new draft (including after prior `rejected` or `cancelled` POs). An `accepted` PO permanently consumes the award for new PO creation in 3.1. |
| **Reason** | Suppliers may reject for fixable reasons; buyers need a recovery path without revoking/re-awarding. Acceptance is the mutual commitment. |
| **Alternatives considered** | One PO row forever (rejected — no recovery); allow new PO after accept (rejected — dual commitments). |
| **Future review** | Change-order / replacement PO after accept (amendments module). |
| **Date** | 2026-07-18 |

### AD-3.1-012 — `completed` deferred to Module 3.2

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-012 |
| **Module** | 3.1 Purchase Order |
| **Title** | `completed` deferred to Module 3.2 |
| **Status** | LOCKED |
| **Decision** | Module 3.1 status set is `draft` \| `issued` \| `accepted` \| `rejected` \| `cancelled` only. No Complete action, no `completed` transition, and no requirement to add `completed` to the CHECK constraint in 3.1. |
| **Reason** | Completion belongs to order lifecycle / fulfillment (3.2+), not issue/accept. Keeps 3.1 cutline sharp. |
| **Alternatives considered** | Trivial buyer “mark complete” in 3.1 (rejected — invites fake fulfillment without logistics); include unused enum value (rejected — dead state). |
| **Future review** | Module 3.2 Order Lifecycle defines completion semantics. |
| **Date** | 2026-07-18 |

### AD-3.1-013 — Block award revoke when issued or accepted PO exists

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-013 |
| **Module** | 3.1 Purchase Order |
| **Title** | Block award revoke when issued or accepted PO exists |
| **Status** | LOCKED |
| **Decision** | `revoke_award` must fail if any PO for that award is `issued` or `accepted`. Draft-only POs: on successful revoke, auto-cancel open drafts (audit event). Rejected/cancelled POs do not block revoke. Issued POs: buyer must `cancel_purchase_order` before revoke. Accepted POs: revoke remains blocked in 3.1 (no silent unwind). |
| **Reason** | Prevents selection revoke from orphaning or contradicting an in-flight or accepted commercial instrument. |
| **Alternatives considered** | Auto-cancel issued PO on revoke (rejected — surprises supplier); allow revoke after accept (rejected — destroys baseline); admin-only unwind (deferred — AD-3.1-018). |
| **Future review** | Admin/legal break-glass unwind process after 3.1. |
| **Date** | 2026-07-18 |

### AD-3.1-014 — Nav label “Orders” hosts PO lists in 3.1

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-014 |
| **Module** | 3.1 Purchase Order |
| **Title** | Nav label “Orders” hosts PO lists in 3.1 |
| **Status** | LOCKED |
| **Decision** | Buyer existing **Orders** nav (`/dashboard/buyer/orders`) becomes the PO list/detail surface. Supplier gains an **Orders** nav pointing at supplier PO list. No separate “Purchase Orders” vs “Orders” split in 3.1. |
| **Reason** | Replaces mock Orders page with real work; avoids dual nav confusion before fulfillment exists. |
| **Alternatives considered** | Separate “Purchase Orders” nav (deferred until fulfillment “Orders” needs a distinct name); hide under RFQ only (rejected — poor discoverability). |
| **Future review** | Rename/split if Module 3.2 introduces a distinct fulfillment Order entity. |
| **Date** | 2026-07-18 |

### AD-3.1-015 — Line items schema + UI list; no multi-SKU picker

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-015 |
| **Module** | 3.1 Purchase Order |
| **Title** | Line items: schema + UI list; no multi-SKU picker in 3.1 |
| **Status** | LOCKED |
| **Decision** | Persist `purchase_order_items` always. Create populates lines from the awarded commercial source (typically one line). UI renders the items list on draft/detail. Module 3.1 does **not** ship a multi-product catalog picker or arbitrary line add from marketplace. |
| **Reason** | Schema ready for multi-line growth; UX stays aligned with single-award / single-commercial-offer reality of current procurement. |
| **Alternatives considered** | Header-only quantities, no items table (rejected — poor extensibility); full multi-SKU PO builder (rejected — out of scope for 3.1). |
| **Future review** | Multi-line editing / multi-SKU POs when product demands it. |
| **Date** | 2026-07-18 |

### AD-3.1-016 — Optional payment-terms text on PO header

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-016 |
| **Module** | 3.1 Purchase Order |
| **Title** | Optional payment-terms text on PO header |
| **Status** | LOCKED |
| **Decision** | PO header may include optional free-text `payment_terms` (and related delivery/notes fields per design). This is commercial narrative only — **not** Module 4 payment capture, escrow, or invoicing. |
| **Reason** | Traders need Incoterms/payment wording on the instrument without building payments. |
| **Alternatives considered** | Omit payment terms until Module 4 (weaker PO); structured payment schedule engine (rejected — Module 4). |
| **Future review** | Structured payment terms when Payments module ships. |
| **Date** | 2026-07-18 |

### AD-3.1-017 — No auto-expiry of issued POs in 3.1

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-017 |
| **Module** | 3.1 Purchase Order |
| **Title** | No auto-expiry of issued POs in 3.1 |
| **Status** | LOCKED |
| **Decision** | Issued POs do not auto-expire or auto-cancel by SLA job in Module 3.1. Buyer cancel and supplier accept/reject remain the only exits from `issued`. |
| **Reason** | Avoid silent commercial timeouts without product SLA design and notifications. |
| **Alternatives considered** | TTL on issue (deferred); reminder-only jobs without status change (optional later, not required). |
| **Future review** | Optional expiry/SLA in a later ops module. |
| **Date** | 2026-07-18 |

### AD-3.1-018 — No admin force actions in 3.1

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-018 |
| **Module** | 3.1 Purchase Order |
| **Title** | No admin force actions in 3.1 |
| **Status** | LOCKED |
| **Decision** | Platform admin may read POs for support (SELECT). No force-cancel, force-accept, force-complete, or award-unwind RPCs in Module 3.1. |
| **Reason** | Break-glass without process invites privilege abuse and audit gaps. |
| **Alternatives considered** | Admin force-cancel in MVP (rejected for 3.1); support-only DB edits (forbidden — violates RPC-only). |
| **Future review** | Explicit break-glass RPCs with dual-control audit. |
| **Date** | 2026-07-18 |

### AD-3.1-019 — Electronic acceptance via durable state + Platform ToS

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-019 |
| **Module** | 3.1 Purchase Order |
| **Title** | Electronic acceptance via durable state + Platform ToS |
| **Status** | LOCKED |
| **Decision** | Supplier **Accept** is a durable, audited state transition (`issued` → `accepted`). Product/UI copy must state that acceptance is subject to Platform Terms of Service / governing agreement. Module 3.1 does not integrate a third-party e-signature provider. |
| **Reason** | Unblocks engineering with a clear legal posture: platform ToS is the governing frame; technical acceptance is auditable. Formal counsel wordsmithing is Future Review, not an open architecture fork. |
| **Alternatives considered** | Block PO until counsel drafts unique contract language (delays 3.1); DocuSign-required accept (out of scope); acceptance with no ToS disclosure (rejected — risk). |
| **Future review** | Legal counsel review of exact UI/ToS wording; optional e-sign later. |
| **Date** | 2026-07-18 |

### AD-3.1-020 — No logistics in Module 3.1

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-020 |
| **Module** | 3.1 Purchase Order |
| **Title** | No logistics in Module 3.1 |
| **Status** | LOCKED |
| **Decision** | No shipments, carriers, tracking, or milestone tables in Module 3.1. |
| **Reason** | Design cutline: issue/accept/reject only; logistics consumes accepted PO later. |
| **Alternatives considered** | Minimal “shipped” flag (rejected — fake logistics). |
| **Future review** | Logistics module post–Order Lifecycle. |
| **Date** | 2026-07-18 |

### AD-3.1-021 — No payments capture in Module 3.1

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-021 |
| **Module** | 3.1 Purchase Order |
| **Title** | No payments capture in Module 3.1 |
| **Status** | LOCKED |
| **Decision** | No invoices, escrow, payouts, or payment state machine in Module 3.1. Optional payment-terms text only (AD-3.1-016). |
| **Reason** | Payments are Module 4; mixing them into PO MVP expands risk and scope. |
| **Alternatives considered** | Deposit capture at accept (rejected). |
| **Future review** | Module 4 references `purchase_order_id`. |
| **Date** | 2026-07-18 |

### AD-3.1-022 — PO amendments / versions out of scope for 3.1

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-022 |
| **Module** | 3.1 Purchase Order |
| **Title** | PO amendments / versions out of scope for 3.1 |
| **Status** | LOCKED |
| **Decision** | Do not implement `purchase_order_versions` or post-issue commercial amendments in 3.1. |
| **Reason** | Explicit future extension in design §10; immutability after issue is the v1 contract. |
| **Alternatives considered** | Lightweight edit-after-accept (rejected — breaks AD-3.1-005). |
| **Future review** | Amendments module when buyers require change orders. |
| **Date** | 2026-07-18 |

### AD-3.1-023 — Accepted PO is commercial baseline for later fulfillment

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-023 |
| **Module** | 3.1 Purchase Order |
| **Title** | Accepted PO is commercial baseline for later fulfillment |
| **Status** | LOCKED |
| **Decision** | For Module 3.1 and onward planning: an `accepted` PO is the mutually acknowledged commercial baseline. Module 3.2 may add lifecycle/fulfillment states or a related `orders` entity, but must not invent a second conflicting commercial truth that ignores the accepted PO snapshot. |
| **Reason** | Closes the “Orders vs PO” entity ambiguity for 3.1 without designing 3.2 tables prematurely. |
| **Alternatives considered** | Introduce separate `orders` table in 3.1 as alias (rejected — premature); treat award as fulfillment baseline (rejected — award is selection, not issued commitment). |
| **Future review** | Module 3.2 chooses whether fulfillment rows are PO statuses or a child `orders` record. |
| **Date** | 2026-07-18 |

### AD-3.1-024 — Additive migration only

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-024 |
| **Module** | 3.1 Purchase Order |
| **Title** | Additive migration only (do not edit 001–016) |
| **Status** | LOCKED |
| **Decision** | Implement schema/RPCs in a new migration (e.g. `017_purchase_order_system.sql`). Do not rewrite applied migrations `001`–`016`. Award revoke interaction is via additive changes to revoke RPC behavior in the new migration (or carefully additive alter of function body in new migration only). |
| **Reason** | Migration discipline; production safety. |
| **Alternatives considered** | Edit `016_award_system.sql` in place (forbidden). |
| **Future review** | None. |
| **Date** | 2026-07-18 |

### AD-3.1-025 — Trusted notifications only for PO events

| Field | Value |
|-------|-------|
| **Decision ID** | AD-3.1-025 |
| **Module** | 3.1 Purchase Order |
| **Title** | Trusted notifications only for PO events |
| **Status** | LOCKED |
| **Decision** | PO lifecycle notifications (`purchase_order.*`) emit only from trusted RPC paths via `_create_system_notification` (D007). Clients never INSERT notifications. |
| **Reason** | Prevent forged “PO accepted” inbox spam; consistent with awards/RFQs. |
| **Alternatives considered** | Client-created notifications (rejected). |
| **Future review** | None for trust model. |
| **Date** | 2026-07-18 |

---

## Remaining stakeholder items (non-blocking)

These are **not** open architectural forks for Module 3.1. They are Future Review items already recorded on locked decisions:

| Item | Why it needs stakeholders later | Blocks 3.1 implementation? |
|------|----------------------------------|----------------------------|
| Exact ToS / UI legal copy for Accept | Counsel wordsmithing of disclosure text | **No** — AD-3.1-019 locked engineering posture |
| Admin break-glass unwind | Support ops + legal process | **No** — out of 3.1 |
| Separate fulfillment “Orders” entity name | Product naming when 3.2 ships | **No** — AD-3.1-014 / AD-3.1-023 |

---

## References

- [MODULE_3_1_PURCHASE_ORDER_DESIGN.md](../planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md)
- [DECISION_LOG.md](./DECISION_LOG.md)
- [SECURITY_MODEL.md](./SECURITY_MODEL.md)
- [ARCHITECTURE_STATUS_v0.3.0.md](./ARCHITECTURE_STATUS_v0.3.0.md)

---

**Last Updated:** 2026-07-18
