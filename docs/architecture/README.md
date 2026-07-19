# Architecture Index

Permanent architecture table of contents for Trade Grid Global. This index separates current contracts from historical release snapshots and directs future domains to the same documentation standard.

## Repository architecture overview

Trade Grid Global is a Food/FMCG-only B2B trade platform built with Next.js App Router and Supabase. PostgreSQL with Row Level Security is the system of record; trusted lifecycle mutations use `SECURITY DEFINER` RPCs; append-only events preserve audit history.

- [System architecture](./SYSTEM_ARCHITECTURE.md)
- [Domain model](./DOMAIN_MODEL.md)
- [Data flow](./DATA_FLOW.md)
- [Entity relationships](./ER_DIAGRAM.md)
- [Historical v0.3.0 architecture snapshot](./ARCHITECTURE_STATUS_v0.3.0.md)

## Domain overview

The platform separates marketplace discovery, identity and trust, commercial agreement, operational execution, financial settlement, analytics, and AI assistance. Commercial truth remains on accepted Purchase Orders; operational truth belongs to Fulfillment.

- [Canonical domain model](./DOMAIN_MODEL.md)
- [Trust & Verification domain](../domains/trust-verification/README.md)
- [Fulfillment domain index](../domains/fulfillment/README.md)
- [Product workflows](../product/)
- [Planning and delivery status](../planning/CURRENT_STATUS.md)

## Architecture documents

- [Architecture decisions](./ARCHITECTURE_DECISIONS.md)
- [Decision log](./DECISION_LOG.md)
- [System architecture](./SYSTEM_ARCHITECTURE.md)
- [Database schema](./DATABASE_SCHEMA.md)
- [API and RPC reference](./API_REFERENCE.md)
- [Security model](./SECURITY_MODEL.md)

## Decision log

Platform-wide decisions use `D###`. Module contracts use `AD-<module>-<sequence>` and remain binding until a superseding decision is accepted.

- [Platform decision log](./DECISION_LOG.md)
- [Locked module decisions](./ARCHITECTURE_DECISIONS.md)
- [ADR standard](../STANDARDS.md#architecture-decision-records)

## Database documentation

- [Database schema](./DATABASE_SCHEMA.md)
- [ER diagrams](./ER_DIAGRAM.md)
- [Migration guidelines](../development/MIGRATION_GUIDELINES.md)
- [Fulfillment entity map](../domains/fulfillment/ENTITY_MAP.md)

## Security documentation

- [Security model](./SECURITY_MODEL.md)
- [Security checklist](../development/SECURITY_CHECKLIST.md)
- [Trust & Verification security contract](../domains/trust-verification/README.md#security-contract)
- [Fulfillment security](../domains/fulfillment/SECURITY.md)

## Domain documentation

- [Domain model](./DOMAIN_MODEL.md)
- [Domain template](../templates/DOMAIN_TEMPLATE.md)
- [Trust & Verification](../domains/trust-verification/README.md)
- [Fulfillment](../domains/fulfillment/README.md)

Future domain folders belong under `docs/domains/<domain>/` and must use the template and quality gate.

## Release documentation

- [Release notes](../RELEASE_NOTES.md)
- [Changelog](../CHANGELOG.md)
- [Release process](../development/RELEASE_PROCESS.md)
- [Release checklist](../deployment/RELEASE_CHECKLIST.md)
- [Release packages](../../releases/)

## Engineering standards

- [Engineering handbook](../STANDARDS.md)
- [Coding standards](../development/CODING_STANDARDS.md)
- [API design](../development/API_DESIGN_GUIDELINES.md)
- [Code review checklist](../development/CODE_REVIEW_CHECKLIST.md)

## Verification documentation

- [Verification matrix](../VERIFICATION_MATRIX.md)
- [Testing strategy](../development/TESTING.md)
- [Repository health report](../REPOSITORY_HEALTH_REPORT.md)

## Authority order

When documents disagree, use this order:

1. Applied migrations and current source code for implemented behavior.
2. Locked decisions in `ARCHITECTURE_DECISIONS.md`.
3. `DOMAIN_MODEL.md`, domain documentation, and `CURRENT_STATUS.md`.
4. Current schema, API, security, and verification references.
5. Versioned architecture snapshots and historical release packages.

Historical documents describe their named release and must not override current status.

---

**Owner:** Architecture / Staff Engineering  
**Last Updated:** 2026-07-18
