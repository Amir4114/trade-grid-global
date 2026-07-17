# Roadmap

Long-term product roadmap for Trade Grid Global.

Authoritative implementation status: [CURRENT_STATUS.md](./CURRENT_STATUS.md)  
Architecture: [ARCHITECTURE_STATUS_v0.3.0.md](../architecture/ARCHITECTURE_STATUS_v0.3.0.md)  
Milestones: [MILESTONES.md](./MILESTONES.md) · Backlog: [BACKLOG.md](./BACKLOG.md) · Future: [FUTURE_FEATURES.md](./FUTURE_FEATURES.md)

---

## Current Position

| Field | Value |
|-------|-------|
| **Product / Git tag** | `v0.4.0-purchase-orders` (target; prior `v0.3.0-procurement-complete`) |
| **npm version** | `0.4.0` |
| **Completed** | Module 1 + Module 2 + Module 3.1 Purchase Orders |
| **Next build** | Module 3.2 — Order Lifecycle / fulfillment |
| **Explicitly deferred** | Finance, production AI, live analytics |

Procurement path:

`RFQ → Quotation → Award → Purchase Order`  
**Not implemented:** Fulfillment lifecycle, logistics, payments.

---

## Module 1 — Foundation

**Status:** Largely complete (v0.1–v0.2)

### Objectives

Establish identity, company trust primitives, product catalog, and operational notifications.

### Major features

- Auth, roles, onboarding, password recovery
- Company profiles + document storage
- Product moderation lifecycle
- Notification center
- Verification operations command center
- Settings identity guard

### Dependencies

Supabase Auth + Postgres RLS baseline.

### Estimated complexity

**High** (security-sensitive). Largely delivered via migrations `001`–`013`.

---

## Module 2 — Procurement

**Status:** Complete through award (`v0.3.0-procurement-complete`)

### Objectives

Enable structured buyer demand and supplier commercial response through auditable award.

### Major features

- RFQ lifecycle + visibility model
- Quotation threads + versioned offers
- Buyer compare
- Supplier award / not-selected outcomes
- Award audit + notifications

### Dependencies

Module 1 (companies, products optional link, notifications).

### Estimated complexity

**High**. Delivered via migrations `014`–`016`.

### Optional polish (still Not implemented)

- Wire public `/rfq` to live data
- Buyer counter-offers
- Offer payment-terms / certification columns

---

## Module 3 — Trade Execution

**Status:** Module 3.1 Purchase Orders **implemented** (migration `017`). Remainder **Not implemented.**

### Objectives

Convert awards into executable trade instruments and operational fulfillment visibility.

### Major features

| Feature | Status |
|---------|--------|
| Purchase Orders (3.1) | **Implemented** (apply `017`) |
| Order Lifecycle / fulfillment (3.2) | **Not implemented.** |
| Logistics | **Not implemented.** |
| Shipping | **Not implemented.** |
| Trade documents (packing list, CoO, etc. as order artifacts) | Partial metadata table; upload UX limited |

### Dependencies

Module 2 awards (`quotation_awards`, winning `offer_id` / commercial snapshot).

### Estimated complexity

**High** (new tables, RLS, state machines, dual-party dashboards).

### Recommended next slice (3.2)

1. Fulfillment states on accepted PO (or child `orders` entity)  
2. Logistics/shipping events  
3. Richer document upload UX on PO  
4. Optional `completed` transition

---

## Module 4 — Finance

**Status:** **Not implemented.**

### Objectives

Settle commercial terms with invoices and payments while preserving auditability.

### Major features

| Feature | Status |
|---------|--------|
| Invoices | **Not implemented.** |
| Payments | **Not implemented.** |
| Escrow / trade financing | **Not implemented.** |

### Dependencies

Module 3 orders (stable order IDs and amounts).

### Estimated complexity

**Very high** (compliance, payment providers, reconciliation).

---

## Module 5 — AI Procurement

**Status:** **Not implemented** for production AI.  
Mock UI exists at `/ai-sourcing` using `mockSourcingResponse`.

### Objectives

Assist sourcing with recommendations grounded in platform data and verification signals.

### Major features

| Feature | Status |
|---------|--------|
| AI supplier matching | **Not implemented.** |
| AI recommendations | Mock only |
| AI trade assistant / risk / RFQ generator | **Not implemented.** |

### Dependencies

Clean product + RFQ + verification datasets; preferably post Module 3 for outcome labels.

### Estimated complexity

**High**. Reserved notification types exist but emitters are **Not implemented.**

---

## Module 6 — Analytics

**Status:** **Not implemented** for live analytics.  
Admin analytics page uses mock marketplace metrics.

### Objectives

Provide reporting for admins (and later buyers/suppliers) on funnel health, SLA, and trade volume.

### Major features

| Feature | Status |
|---------|--------|
| Reporting dashboards | Mock placeholder |
| Admin intelligence | Partial via verification queue only |
| Marketplace KPIs from live tables | **Not implemented.** |

### Dependencies

Modules 1–3 data maturity.

### Estimated complexity

**Medium–high**.

---

## Suggested sequencing

```mermaid
flowchart LR
  M1[Module 1 Foundation] --> M2[Module 2 Procurement]
  M2 --> M3[Module 3 Trade Execution]
  M3 --> M4[Module 4 Finance]
  M2 --> M6[Module 6 Analytics]
  M3 --> M5[Module 5 AI]
```

**Do not prioritize Module 5 before Module 3** — AI without execution data adds noise without conversion.
