# Known Limitations

| Field | Value |
|-------|-------|
| **Current version** | `v0.4.0` / `v0.4.0-purchase-orders` |
| **Module** | 3.1 Purchase Order System |

Canonical status: [`docs/planning/CURRENT_STATUS.md`](../../docs/planning/CURRENT_STATUS.md)  
Roadmap: [`docs/planning/ROADMAP.md`](../../docs/planning/ROADMAP.md)

---

## Implemented

| Capability | Notes |
|------------|-------|
| Purchase Orders | Draft, issue, accept, reject, cancel |
| Commercial + party snapshots | Locked after issue |
| Buyer / supplier Orders UI | Replaces mock buyer Orders |
| Audit events | Append-only |
| Trusted notifications | `purchase_order.*` (except completed) |
| Private PO document storage | Bucket + path helpers |
| Award revoke guards | Respect issued/accepted POs |

---

## Not Yet Implemented

| Area | Target |
|------|--------|
| Order Lifecycle | Module 3.2 |
| Shipment Tracking | Later Module 3.x |
| Logistics | Later Module 3.x |
| Payments | Module 4 |
| Invoice Generation | Module 4 |
| Purchase Order Amendments | Future (versions) |
| Completion Workflow (`completed`) | Module 3.2+ (AD-3.1-012) |
| Multi-shipment Support | Later |
| ERP Integration | Later |
| E-signature Provider | Later (AD-3.1-019 Future Review) |
| SLA Expiry of issued POs | Later (AD-3.1-017) |
| Break-glass Admin Actions | Later (AD-3.1-018) |

---

## Technical Limitations

| Limitation | Impact |
|------------|--------|
| Notification verification requires Supabase Service Role | Local verify scripts **SKIP** notification counts without `SUPABASE_SERVICE_ROLE_KEY` |
| Storage verification requires Service Role | Bucket metadata probes may **SKIP** without service role |
| Tax / street address snapshot fields | Schema present; source company data may be empty until compliance fields expand |
| Document upload UX | Storage foundation exists; rich upload UI is limited vs RFQ/quotation |
| Public `/rfq` marketing surface | Still disconnected from live dashboard RFQ engine |

Locked decisions and deferred items: [`docs/architecture/ARCHITECTURE_DECISIONS.md`](../../docs/architecture/ARCHITECTURE_DECISIONS.md)  
Design scope cuts: [`docs/planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md`](../../docs/planning/design/MODULE_3_1_PURCHASE_ORDER_DESIGN.md)

---

## Future Improvements

1. **Module 3.2 — Order Lifecycle** on accepted POs (fulfillment states; no second commercial truth).
2. Logistics and shipment milestones consuming accepted PO lines.
3. Payments / invoices referencing `purchase_order_id`.
4. Controlled amendments via version history.
5. Optional issued-PO SLA / expiry and dual-control admin break-glass.

See release notes: [release-notes.md](./release-notes.md) · product: [`docs/product/ORDER_LIFECYCLE.md`](../../docs/product/ORDER_LIFECYCLE.md)
