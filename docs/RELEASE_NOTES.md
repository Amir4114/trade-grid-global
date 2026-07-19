# Release Notes

## `v0.5.0-order-lifecycle`: Phase A tagged; full release in progress

| Field             | Value                                                        |
| ----------------- | ------------------------------------------------------------ |
| **Target**        | `v0.5.0-order-lifecycle`                                     |
| **Phase A tag**   | `v0.5.0-phase-a`                                             |
| **Current phase** | Phase A DB + RPC contract tagged; Phase B UI not implemented |
| **Migration**     | **`018_order_fulfillment_system.sql`** (requires `017`)      |
| **npm version**   | Still `0.4.0` until full 3.2 release                         |

### Phase A highlights

1. **`fulfillment_orders`** — operational child of accepted PO (`TGG-FF-YYYY-######`).
2. **Lifecycle RPCs** — production → QC → pack → ship → transit → deliver → complete (+ cancel/fail/dispute).
3. **Auto-create on PO accept** — AD-3.2-004.
4. **Append-only events** + private `fulfillment-docs` bucket.
5. **Verify script** — `scripts/verify-order-fulfillment-system.mjs`.

Frontend for fulfillment is **out of scope** for Phase A.

Architecture: [DOMAIN_MODEL.md](./architecture/DOMAIN_MODEL.md) · Domain contract: [Fulfillment](./domains/fulfillment/README.md) · Verification: [VERIFICATION_MATRIX.md](./VERIFICATION_MATRIX.md)

---

## Pre-Phase-B platform stabilization

Buyer onboarding and settings were hardened before Fulfillment Phase B.

**Signup transaction fix:** the live Auth trigger created a default Buyer profile
before the client called its profile UPSERT. Supplier signup therefore attempted
an owner role UPDATE, which Migration `019` correctly rejected after Auth had
already committed. Migration `021_atomic_marketplace_signup.sql` moves profile
and company provisioning into an `auth.users` trigger transaction. Any
provisioning error now rolls back Auth, while an authenticated one-time recovery
RPC repairs legacy users that have no company.

**Root cause:** the client auth context correctly represented a missing company as
`company === null` after loading, but Buyer Onboarding and shared Settings grouped
that terminal state with `loading === true`. The UI therefore displayed a permanent
loader and the onboarding service rejected submission because it only supported
updating an existing company.

**Fix:**

- Separate loading, fetch-error, signed-out, and missing-company UI states.
- Render Buyer onboarding for authenticated users even when the company record is absent.
- Use idempotent owner-scoped upserts to recover missing Buyer profile/company records under existing RLS.
- Require the identity fields needed to create a valid company record.
- Ensure Supplier onboarding also exits loading with explicit fetch, session, or missing-company guidance.
- Add meaningful retry actions for load failures and an onboarding recovery action from Settings.
- Extend `verify-onboarding-completion.mjs` with the missing-company path.

The onboarding loader/root-cause fix introduced no database change. Security
follow-up added additive migration `019_verification_submission_hardening.sql`:

- Trusted submission requires storage-backed Trade License and Company Registration evidence.
- Owner-created document metadata is forced to `pending` and validated against its private storage object.
- Marketplace role, company account type/owner, and risk score are immutable to ordinary owners.
- Rejected evidence can be replaced while retained for audit, and rejection feedback is owner-readable.
- Admin reviewers can open private evidence through five-minute signed URLs.

The architecture audit found that migration `019` did not freeze evidence per
case or complete the document rejection/replacement lifecycle. Additive
migration `020_verification_case_evidence_lock.sql` closes those release
blockers by requiring review start, reasoned rejection, case-scoped evidence,
canonical status/risk constraints, completed legal profiles, and material
identity invalidation.

Migrations `019` and `020` must both be applied before these controls are active.

### Buyer & Supplier workspace redesign — Phase 1

- Buyer and Supplier routes are thin adapters over one role-configured
  onboarding workspace.
- Only one section is visible at a time: Business Information, Product
  Categories, Markets, Certifications, Documents, Review, or Verification
  Submission.
- The Documents step is the only company evidence workflow. It accepts only
  canonical `CompanyDocumentType` values and supports multiple documents,
  five-minute owner previews, pending replacement/deletion, rejected
  append-only replacement, status, and review locks.
- Legacy verification and Supplier certification routes redirect to the
  role-specific Documents step.
- Buyer and Supplier dashboards begin with a shared Overview composition using
  real onboarding, verification, category, and market data. Analytics remains
  out of scope.
- Migration `022_pending_company_document_management.sql` adds only the narrow
  owner policy required for ordered deletion of pending, unsubmitted evidence.

### Marketplace experience redesign — Phase 1

- Start Trading replaces Join Free and offers Guest, Buyer, and Supplier entry.
- Guest sessions are authenticated-encrypted, HttpOnly, expire after two hours,
  and remain read-only without creating application or Trust identities.
- Verification submission redirects to role Workspace Overview.
- Under-review companies can use their workspace, browse public marketplace
  surfaces, and author private drafts. Public/commercial publish, submit, award,
  and issue actions display an explicit verification gate until approval.
- Verification Status cards show canonical Trust projection, progress, and next
  guidance without introducing a second verification lifecycle.
- Buyer and Supplier Analytics navigation is a placeholder only.
- No database migration or Trust-domain schema change was introduced.

---

## Current stable release target: `v0.4.0-purchase-orders`

| Field               | Value                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| **Version**         | `0.4.0` / tag `v0.4.0-purchase-orders`                                                    |
| **Release date**    | 2026-07-18                                                                                |
| **Prior tag**       | `v0.3.0-procurement-complete`                                                             |
| **npm version**     | `0.4.0`                                                                                   |
| **Branch**          | `main`                                                                                    |
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

| Migration                                         | Role                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `001`–`016`                                       | Prerequisites (auth → awards)                                                                     |
| **`017_purchase_order_system.sql`**               | **Required** — PO schema, RLS, RPCs, storage                                                      |
| **`018_order_fulfillment_system.sql`**            | **Required for 3.2 Phase A** — fulfillment schema, RLS, RPCs, storage                             |
| **`019_verification_submission_hardening.sql`**   | **Required before Phase B** — verification evidence and owner-field integrity                     |
| **`020_verification_case_evidence_lock.sql`**     | **Required for v0.4.1** — immutable case evidence and decision integrity                          |
| **`021_atomic_marketplace_signup.sql`**           | **Required before production signup** — atomic marketplace account provisioning                   |
| **`022_pending_company_document_management.sql`** | **Required for Phase 1 document deletion** — pending, owner-scoped, non-case-linked evidence only |

Apply in order via Supabase SQL Editor or CLI. Migrations `017`–`022` are additive.

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

- Fulfillment UI, first-class logistics/shipments, claims, invoices, and payments — **Not implemented.**
- Buyer Orders / Inquiries / Saved Suppliers / Admin Analytics / Admin RFQs pages still use mock `lib/marketplace/data` where noted in architecture status.
- Public `/rfq` marketing page uses mock data; live RFQs are dashboard-based.
- Offer-level payment terms / certification columns — **Not implemented.**
- Buyer counter-offers (`offered_by = buyer`) — schema only; UX **Not implemented.**

---

## Future work

Immediate: **Module 3.2 Phase B** — Fulfillment service hardening and buyer/supplier UI.
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
- [architecture/README.md](./architecture/README.md)
- [STANDARDS.md](./STANDARDS.md)
- [VERIFICATION_MATRIX.md](./VERIFICATION_MATRIX.md)
- [deployment/DEPLOYMENT.md](./deployment/DEPLOYMENT.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
