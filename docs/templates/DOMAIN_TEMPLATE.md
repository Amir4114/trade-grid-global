# <Domain Name> Domain

**Status:** Proposed | Implemented in code | Active | Historical  
**Owner:** <Engineering capability>  
**Release:** <Target or shipped tag>  
**Decisions:** <ADR links>

## Purpose

Explain the business problem, why this domain exists, the truth it owns, and why its entities should not extend another domain’s entity.

## Business Workflow

Describe entry conditions, happy path, exception paths, actors, and terminal outcomes. Distinguish implemented behavior from future behavior.

## Architecture

Define the domain boundary, source of truth, upstream dependencies, downstream consumers, trust boundaries, and extension points. Link to the [Domain Model](../architecture/DOMAIN_MODEL.md).

## State Machine

List canonical persisted states, allowed transitions, actors, guards, terminal states, and forbidden transitions. Include a Mermaid state diagram when it improves clarity.

## Entities

For each entity document purpose, owner, authoritative fields, lifecycle, retention, indexes, and expected scale. Avoid copying the full schema reference.

## Relationships

Document cardinality, foreign-key direction, cross-domain references, and which side owns the relationship. Include an ER diagram when useful.

## Events

Document event name, trigger, actor, payload expectations, consumers, retention, and whether it is audit-only or externally publishable.

## Documents

Document metadata entity, storage bucket/path, allowed types/sizes, upload/read roles, retention, and evidence requirements.

## Notifications

Document trusted notification types, recipients, priority, entity linkage, safe action URLs, and verification.

## Security

Document authentication, role/ownership rules, RLS read policy, mutation boundary, `SECURITY DEFINER` requirements, storage policy, audit protection, threats, and limitations.

## RPCs

For each client RPC document purpose, parameters, returns, permissions, state guards, side effects, failures, and idempotency/concurrency behavior. Link to the canonical API reference.

## Database

Document migration ownership, tables, constraints, indexes, timestamps, deletion/retention policy, and upgrade/rollback posture. Do not embed migration SQL.

## Verification

List scripts, prerequisites, positive and negative coverage, expected skips, regression dependencies, and last recorded evidence. Update the [Verification Matrix](../VERIFICATION_MATRIX.md).

## Release Checklist

- [ ] Architecture and ADRs accepted
- [ ] Schema/API/security docs updated
- [ ] Migration additive and reviewed, if applicable
- [ ] Domain and regression verification passed
- [ ] Typecheck, lint, and build passed
- [ ] Browser or E2E checklist passed when UI exists
- [ ] Changelog, release notes, and release package updated
- [ ] Known limitations documented

## Lessons Learned

1. Biggest implementation challenge.
2. Biggest architectural decision.
3. Technical debt introduced.
4. Future improvements identified.
5. Reusable patterns created.
6. Changes later modules should build upon.

## Future Extensions

List explicit extension points, deferred scope, compatibility constraints, and the ADR required to alter existing invariants.

## Engineering Review

Assess architecture, security, maintainability, scalability, consistency, future-proofing, knowledge transfer, and repository organization.

## Quality Gate

| Gate | Status | Evidence |
|---|---|---|
| Architecture | Pending | |
| Typecheck | Pending / N/A | |
| Lint | Pending / N/A | |
| Build | Pending / N/A | |
| Migration | Pending / N/A | |
| Verification scripts | Pending | |
| Security review | Pending | |
| Browser test checklist | Pending / N/A | |
| Known limitations | Pending | |
| Ready for commit | No | |

## References

- [Architecture Index](../architecture/README.md)
- [Engineering Handbook](../STANDARDS.md)
- [Current Status](../planning/CURRENT_STATUS.md)

---

**Last Updated:** YYYY-MM-DD
