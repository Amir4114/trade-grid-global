# ER Diagram

## Purpose

Entity-relationship overview of implemented database domains.

## Scope

Tables from migrations `001`–`022`. Column-level detail → [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).

## Table of contents

1. [Current Status](#current-status)
2. [Core identity](#core-identity)
3. [Products & verification](#products--verification)
4. [Procurement](#procurement)
5. [Not modeled](#not-modeled)
6. [References](#references)
7. [Future notes](#future-notes)

## Current Status

| Domain                                                                                                  | Status               |
| ------------------------------------------------------------------------------------------------------- | -------------------- |
| Auth / companies / products / notifications / verification / RFQ / quotation / award / PO / Fulfillment | Implemented in code  |
| Invoices / payments / first-class shipments                                                             | **Not implemented.** |

## Core identity

```mermaid
erDiagram
  profiles ||--|| companies : owns
  companies ||--o{ documents : has
  companies ||--o{ products : lists
  profiles ||--o{ notifications : receives
```

## Products & verification

```mermaid
erDiagram
  companies ||--o{ products : supplies
  verification_cases ||--o{ verification_case_events : audits
  verification_cases ||--o{ verification_assessments : assesses
```

Cases reference company or product entities by `case_type` + `entity_id` (see schema).

## Procurement

```mermaid
erDiagram
  companies ||--o{ rfqs : buyer
  rfqs ||--o{ rfq_invites : invites
  rfqs ||--o{ rfq_events : audits
  rfqs ||--o{ rfq_attachments : files
  rfqs ||--o{ quotation_threads : receives
  companies ||--o{ quotation_threads : supplier
  quotation_threads ||--o{ quotation_offers : versions
  quotation_threads ||--o{ quotation_events : audits
  quotation_offers ||--o{ quotation_attachments : files
  rfqs ||--o| quotation_awards : awarded
  quotation_threads ||--o| quotation_awards : wins
  quotation_offers ||--o| quotation_awards : selected
  quotation_awards ||--o{ award_events : audits
  quotation_awards ||--o{ purchase_orders : sources
  purchase_orders ||--o{ purchase_order_items : lines
  purchase_orders ||--o{ purchase_order_events : audits
  purchase_orders ||--o{ purchase_order_documents : files
  purchase_orders ||--o| fulfillment_orders : executes
  fulfillment_orders ||--o{ fulfillment_order_events : audits
  fulfillment_orders ||--o{ fulfillment_order_documents : files
```

## Not modeled

Invoices, payments, negotiation messages, and first-class shipments — **Not implemented.**

## References

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- [../product/PROCUREMENT_WORKFLOW.md](../product/PROCUREMENT_WORKFLOW.md)
- [DOMAIN_MODEL.md](./DOMAIN_MODEL.md)
- [../domains/fulfillment/ENTITY_MAP.md](../domains/fulfillment/ENTITY_MAP.md)

## Future notes

Extend ER when Logistics 3.3 introduces first-class shipment entities.

---

**Last Updated:** 2026-07-18
