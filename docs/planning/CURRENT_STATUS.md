# Current Status

Living operational status for Trade Grid Global.  
Architecture detail: [ARCHITECTURE_STATUS_v0.3.0.md](../architecture/ARCHITECTURE_STATUS_v0.3.0.md)

---

## Current version

| Field | Value |
|-------|-------|
| **Product version** | `v0.3.0-procurement-complete` |
| **Latest Git tag** | `v0.3.0-procurement-complete` |
| **Tagged commit** | `7cd98e1` (2026-07-18) |
| **Current branch** | `main` |
| **npm package.json version** | `0.3.0` (aligned with release; Git tag `v0.3.0-procurement-complete`) |

---

## Current milestone

**Procurement complete through supplier award.**

Buyer can create/publish RFQs, suppliers can quote, buyers can compare and award.  
Purchase orders and payments are **Not implemented.**

---

## Completed modules

| Module | Status |
|--------|--------|
| Auth / onboarding / password recovery | Complete |
| Company settings + identity guard | Complete |
| Products + media + lifecycle | Complete |
| Notifications | Complete |
| Verification operations (admin command center) | Complete |
| RFQ foundation (dashboard) | Complete |
| Quotation system | Complete |
| Award & supplier selection | Complete (ensure migration `016` applied on each environment) |

---

## Verification status

Scripts exist under `scripts/verify-*.mjs` for auth, products, notifications, settings, verification ops, RFQ, quotations, and awards.

| Area | Script | Notes |
|------|--------|-------|
| Awards | `verify-award-system.mjs` | Requires migration `016` applied |
| Quotations | `verify-quotation-system.mjs` | Requires `014`+`015` |
| RFQ | `verify-rfq-foundation.mjs` | Requires `014` |
| Verification ops | `verify-verification-operations.mjs` | Requires `013` |

Notification assertions often **SKIP** without `SUPABASE_SERVICE_ROLE_KEY`.

---

## Known blockers

| Blocker | Impact |
|---------|--------|
| Migration `016` must be applied on each Supabase project before awards work in that environment | Award RPCs/tables missing until applied |
| Mock dashboard pages (orders, inquiries, admin analytics/RFQs, etc.) | Operator confusion; not live domains |
| Public `/rfq` not wired to live `rfqs` | Marketing RFQ surface disconnected from dashboard engine |
| No `SUPABASE_SERVICE_ROLE_KEY` locally | Notification asserts in verify scripts SKIP (optional) |

---

## Immediate next objective

**Module 3A — Purchase Orders / Order Management** after award (see [ROADMAP.md](./ROADMAP.md)).

Secondary hygiene: replace or clearly label mock nav destinations; wire or retire public `/rfq` mock submit.

---

## Overall completion estimate

| Scope | Estimate |
|-------|----------|
| Overall V1 platform (trust + procurement + execution) | **~55%** |
| Procurement-to-award path | **~95%** |

---

## What is not built (explicit)

- Purchase orders / orders / invoices / payments / escrow
- Negotiation chat
- Logistics / shipment visibility
- Production AI matching / trade assistant
- Subscription billing / premium verified tier
- Live admin analytics

Previous versions of this file listed quotations as “likely not built”; that is **obsolete** as of v0.3.0.
