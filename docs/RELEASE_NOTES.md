# Release Notes

## In progress: `v0.5.0-order-lifecycle` (Phase A — database foundation)

| Field | Value |
|-------|-------|
| **Target** | `v0.5.0-order-lifecycle` |
| **Phase** | A — DB + RPC contract only (no UI) |
| **Migration** | **`018_order_fulfillment_system.sql`** (requires `017`) |
| **npm version** | Still `0.4.0` until full 3.2 release |

### Phase A highlights

1. **`fulfillment_orders`** — operational child of accepted PO (`TGG-FF-YYYY-######`).
2. **Lifecycle RPCs** — production → QC → pack → ship → transit → deliver → complete (+ cancel/fail/dispute).
3. **Auto-create on PO accept** — AD-3.2-004.
4. **Append-only events** + private `fulfillment-docs` bucket.
5. **Verify script** — `scripts/verify-order-fulfillment-system.mjs`.

Frontend for fulfillment is **out of scope** for Phase A.

---

## Current stable release target: `v0.4.0-purchase-orders`

| Field | Value |
|-------|-------|
| **Version** | `0.4.0` / tag `v0.4.0-purchase-orders` (tag after commit) |
| **Release date** | 2026-07-18 |
| **Prior tag** | `v0.3.0-procurement-complete` |
| **npm version** | `0.4.0` |
| **Branch** | `main` |
| **Release package** | [`releases/v0.4.0-purchase-orders/`](../releases/v0.4.0-purchase-orders/release-notes.md) |

---

## Highlights (v0.4.0)

1. **Purchase orders** — Draft → issue → accept/reject/cancel from active awards.
2. **Commercial snapshots** — Party + commercial terms frozen; locked after issue.
3. **PO numbering** — `TGG-PO-YYYY-000001` with draft revision numbers.
4. **Trusted notifications** — `purchase_order.*` via existing notification infrastructure.
5. **Buyer & supplier Orders UI** — Replaces mock buyer Orders page.
6. **Award revoke guards** — Cannot revoke while issued/accepted PO exists.

Procurement path: `Create RFQ → Publish → Quote → Compare → Award → Purchase Order → Fulfillment (DB)`

Payments, logistics UI, amendments, and production AI remain **Not implemented.**

---

## Database migrations

| Migration | Role |
|-----------|------|
| `001`–`016` | Prerequisites (auth → awards) |
| **`017_purchase_order_system.sql`** | **Required** — PO schema, RLS, RPCs, storage |
| **`018_order_fulfillment_system.sql`** | **Required for 3.2 Phase A** — fulfillment schema, RLS, RPCs, storage |

Apply in order via Supabase SQL Editor or CLI. Migrations `017`/`018` are additive.

After apply, confirm:

- Tables `purchase_orders`, `fulfillment_orders` exist
- RPCs `accept_purchase_order`, `start_production`, `complete_fulfillment` exist

---

## Verification scripts

```bash
node --use-system-ca scripts/verify-rfq-foundation.mjs
node --use-system-ca scripts/verify-quotation-system.mjs
node --use-system-ca scripts/verify-award-system.mjs
node --use-system-ca scripts/verify-purchase-order-system.mjs
node --use-system-ca scripts/verify-order-fulfillment-system.mjs
```

Optional `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` enables notification-count assertions; without it those checks skip.

Quality gate before release:

```bash
npm run typecheck
npm run lint
npm run build
```

---

## Developer notes

- Domain writes for awards happen only through `award_supplier` / `revoke_award` RPCs.
- Domain writes for fulfillment happen only through fulfillment RPCs (`lib/fulfillment/service.ts`).
- App services: `lib/quotation/service.ts`, `lib/purchase-orders/*`, `lib/fulfillment/service.ts`.
- UI entry points (PO only in 0.4.0):
  - Buyer: RFQ detail compare & award panel; Orders
  - Supplier: quotation detail banners + `/dashboard/supplier/awards` + Orders

---

## Breaking changes

- **Behavioral:** After a successful award, RFQ `status` becomes `awarded` and new `submit_quotation` calls fail for that RFQ.
- **Access:** `supplier_can_access_rfq` also allows suppliers with an existing quotation thread to read the RFQ after award (quoting remains blocked).
- No formal public REST versioning; typed RPC contracts live in `lib/database/types.ts`.

---

## Known limitations

- Purchase orders / orders / invoices / payments — **Not implemented.**
- Buyer Orders / Inquiries / Saved Suppliers / Admin Analytics / Admin RFQs pages still use mock `lib/marketplace/data` where noted in architecture status.
- Public `/rfq` marketing page uses mock data; live RFQs are dashboard-based.
- Offer-level payment terms / certification columns — **Not implemented.**
- Buyer counter-offers (`offered_by = buyer`) — schema only; UX **Not implemented.**

---

## Future work

Immediate: **Module 3 — Trade Execution** (Purchase Orders after award).  
See [planning/ROADMAP.md](./planning/ROADMAP.md).

---

## Browser test checklist

1. Buyer creates + publishes RFQ  
2. Supplier discovers and submits quotation  
3. Buyer opens RFQ compare & award  
4. Confirm award → RFQ awarded  
5. Winner sees congratulations + awards page  
6. Loser sees awarded-to-another-supplier message  
7. Post-award quotation submit fails  
8. Notifications for award / not_selected / rfq.awarded  

---

## Related documentation

- [CHANGELOG.md](./CHANGELOG.md)
- [architecture/ARCHITECTURE_STATUS_v0.3.0.md](./architecture/ARCHITECTURE_STATUS_v0.3.0.md)
- [deployment/DEPLOYMENT.md](./deployment/DEPLOYMENT.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
