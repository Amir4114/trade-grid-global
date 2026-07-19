# Project Context

Business vision and strategy for Trade Grid Global.  
Implementation status lives in [CURRENT_STATUS.md](./CURRENT_STATUS.md) and [architecture/ARCHITECTURE_STATUS_v0.3.0.md](../architecture/ARCHITECTURE_STATUS_v0.3.0.md).

---

## Mission

Become the world’s most trusted B2B Food & FMCG trading platform — where serious importers and exporters can source, verify, request quotes, and select suppliers with auditable confidence.

---

## Vision

Trade Grid Global is a specialized B2B food trading platform connecting:

- Importers
- Exporters
- Manufacturers
- Distributors
- Wholesalers
- Food brands

**Focus:** Food & FMCG only.  
**Not:** a generic consumer marketplace or Alibaba clone.

---

## Industry focus

Food and FMCG trade categories, including (non-exhaustive):

Rice, spices, pulses, frozen foods, dairy, meat, poultry, seafood, fruits, vegetables, beverages, snacks, oils, FMCG products, food ingredients, and food packaging.

---

## Target users

| Persona | Needs |
|---------|-------|
| Buyer / importer | Trusted suppliers, structured RFQs, comparable quotations, clear award decisions |
| Supplier / exporter | Credible company profile, product listing, RFQ discovery, quotation workflow |
| Platform admin | Verification ops, product moderation, auditability |

---

## Problems solved

1. **Trust deficit** in cross-border food trade (unverified sellers, weak documentation)
2. **Unstructured sourcing** (emails/WhatsApp instead of auditable RFQ trails)
3. **Opaque supplier selection** (no comparable commercial history)
4. **Weak operational control** for platform operators (no case/SLA model)

---

## Competitive advantages (intended)

1. Food/FMCG specialization
2. Verification-first company and product workflows
3. Procurement engine: RFQ → quotation → award (implemented through v0.3.0)
4. Audit events and trusted notifications
5. Enterprise aesthetic and role-based dashboards

---

## Product principles

1. Increase trust
2. Help buyers find suppliers
3. Help suppliers generate leads
4. Improve RFQ conversion
5. Prefer security and stability over feature breadth

---

## Core modules (product map)

| Module | Business intent | Implementation |
|--------|-----------------|----------------|
| Authentication & onboarding | Identity + roles | Implemented |
| Company profiles & verification | Trust | Implemented (Premium Verified tier: **Not implemented.**) |
| Product catalog | Supply visibility | Implemented |
| RFQ marketplace | Demand capture | Implemented (dashboard; public `/rfq` still mock) |
| Quotations | Commercial response | Implemented |
| Award / selection | Supplier selection | Implemented |
| Purchase Orders | Commercial trade execution | Implemented in code (`017`) |
| Fulfillment | Operational execution | Phase A implemented in code (`018`); UI pending |
| Logistics / payments | Shipment and settlement | **Not implemented.** |
| AI intelligence | Matching & assistance | **Not implemented.** (mock `/ai-sourcing` only) |
| Admin dashboard | Operations | Partially implemented (verification + products live; analytics/RFQ admin mock) |

---

## Long-term platform vision

Evolve from verified RFQ procurement into a full trade operating system:

1. Trade execution (POs, shipping)
2. Finance (invoices, escrow/payments)
3. AI procurement assistance grounded in real platform data
4. Analytics for buyers, suppliers, and admins

See [ROADMAP.md](./ROADMAP.md).

---

## Business strategy

1. Finish the **trust + procurement** moat before expanding into AI spectacle.
2. Convert accepted orders into visible, auditable Fulfillment execution.
3. Keep category focus narrow (Food/FMCG) to maintain expertise and trust density.
4. Charge for outcomes serious importers will pay for: verification depth, risk reduction, conversion speed — not consumer ecommerce chrome.
