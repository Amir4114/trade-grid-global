# Glossary

## Purpose

Shared vocabulary for Trade Grid Global.

## Scope

Terms used in product and engineering docs.

## Table of contents

1. [Current Status](#current-status)
2. [Terms](#terms)
3. [References](#references)
4. [Future notes](#future-notes)

## Current Status

Living glossary — update as Module 3+ introduces order/payment terms.

## Terms

| Term | Meaning |
|------|---------|
| **RFQ** | Request for quotation — buyer demand document |
| **Visibility** | Who may discover an RFQ (`public`, `verified_suppliers_only`, `invite_only`) |
| **Quotation thread** | Per-supplier conversation container on an RFQ |
| **Offer / revision** | Versioned commercial proposal (`revision_no`) |
| **Award** | Buyer selection of a winning quotation (`quotation_awards`) |
| **Active award** | The single non-revoked award for an RFQ |
| **Verification case** | Admin ops unit for company or product review |
| **Trusted notification** | Inbox row created only by SECURITY DEFINER helpers |
| **RPC** | Postgres function exposed via Supabase (`supabase.rpc`) |
| **RLS** | Row Level Security |
| **Purchase Order (PO)** | Immutable commercial instrument created from an award; accepted PO is commercial truth |
| **Fulfillment** | Operational execution record for an accepted PO; owns production through completion status |
| **Orders** | UI umbrella for Purchase Orders and Fulfillment; not a separate source-of-truth entity |
| **Escrow** | Payment hold pattern — **Not implemented.** |

## References

- [PROCUREMENT_WORKFLOW.md](./PROCUREMENT_WORKFLOW.md)
- [../architecture/DATABASE_SCHEMA.md](../architecture/DATABASE_SCHEMA.md)
- [../architecture/DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md)
- [../domains/fulfillment/README.md](../domains/fulfillment/README.md)

## Future notes

Add Incoterm definitions only if product copy requires a controlled list.

---

**Last Updated:** 2026-07-18
