# Release Notes

## Current release target: `v0.4.0-purchase-orders`

| Field | Value |
|-------|-------|
| **Version** | `0.4.0` / tag `v0.4.0-purchase-orders` (tag after commit) |
| **Release date** | 2026-07-18 |
| **Prior tag** | `v0.3.0-procurement-complete` |
| **npm version** | `0.4.0` |
| **Branch** | `main` |

---

## Highlights

1. **Purchase orders** — Draft → issue → accept/reject/cancel from active awards.
2. **Commercial snapshots** — Party + commercial terms frozen; locked after issue.
3. **PO numbering** — `TGG-PO-YYYY-000001` with draft revision numbers.
4. **Trusted notifications** — `purchase_order.*` via existing notification infrastructure.
5. **Buyer & supplier Orders UI** — Replaces mock buyer Orders page.
6. **Award revoke guards** — Cannot revoke while issued/accepted PO exists.

Procurement path: `Create RFQ → Publish → Quote → Compare → Award → Purchase Order`

Payments, logistics, amendments, and production AI remain **Not implemented.**

---

## Database migrations

| Migration | Role in this release |
|-----------|----------------------|
| `001`–`016` | Prerequisites (auth → awards) |
| **`017_purchase_order_system.sql`** | **Required** — PO schema, RLS, RPCs, storage |

Apply in order via Supabase SQL Editor or CLI. Migration `017` is additive.

After apply, confirm:

- Tables `quotation_awards`, `award_events` exist
- RPCs `award_supplier`, `get_award`, `revoke_award` exist

---

## Verification scripts

```bash
node --use-system-ca scripts/verify-award-system.mjs
```

Also recommended after full stack apply:

```bash
node --use-system-ca scripts/verify-rfq-foundation.mjs
node --use-system-ca scripts/verify-quotation-system.mjs
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
- App services: `lib/quotation/service.ts` (`awardSupplier`, `getAwardForRfq`, `revokeAward`, `listSupplierAwards`).
- UI entry points:
  - Buyer: RFQ detail compare & award panel
  - Supplier: quotation detail banners + `/dashboard/supplier/awards`

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
