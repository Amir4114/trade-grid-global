# Engineering Handbook

Canonical repository standards for Trade Grid Global. Detailed specialist guides remain authoritative where linked; this handbook defines the shared contract.

## Principles

1. Security > stability > scalability > features.
2. Preserve one source of truth per domain.
3. Prefer additive, auditable change.
4. Mark planned behavior **Planned** or **Not implemented**; never present design as shipped.
5. Reuse existing components, services, helpers, and documentation before creating parallels.
6. Keep the product Food/FMCG-specific and enterprise-oriented.

## Folder structure

| Path | Responsibility |
|---|---|
| `app/` | Next.js App Router routes |
| `components/` | Shared and domain UI |
| `lib/<domain>/` | Domain services, types, and helpers |
| `supabase/migrations/` | Ordered database changes |
| `scripts/` | Verification and maintenance scripts |
| `docs/architecture/` | Cross-domain architecture and decisions |
| `docs/product/` | Business behavior and user workflows |
| `docs/planning/` | Current status, roadmap, backlog, and designs |
| `docs/domains/<domain>/` | Independent domain contract |
| `docs/templates/` | Required documentation templates |
| `releases/<tag>/` | Immutable release evidence |

Do not create duplicate parallel trees for an existing responsibility.

## Naming conventions

- React components: `PascalCase.tsx`.
- TypeScript services and utilities: existing local convention, normally descriptive kebab-case or camelCase filenames.
- Database objects and RPCs: `snake_case`.
- SQL parameters: `p_*`; PL/pgSQL variables: `v_*`; internal helpers: leading `_`.
- Tables: plural nouns; event tables: `<entity>_events`; document metadata: `<entity>_documents`.
- Persisted statuses and event names are lowercase and stable.
- User-facing labels may differ from persisted values but must be mapped explicitly.

## Database tables

- Every table has one domain owner and a documented purpose.
- Sensitive tables enable RLS.
- Prefer UUID primary keys, `timestamptz` UTC timestamps, explicit foreign keys, and indexes for ownership/status/list queries.
- Text status CHECK constraints are the current convention; keep TypeScript types aligned.
- Lifecycle event rows are append-only where audit is required.
- Do not physically delete trade records through product workflows.
- Avoid duplicating upstream truth. Denormalized display data must be identified as a snapshot or cache.

## Migration numbering

- Format: `NNN_snake_case_description.sql`.
- Allocate the next unused three-digit number.
- Never edit an applied historical migration; use an additive forward fix.
- Document prerequisites, irreversible effects, RLS, grants, storage, and verification.
- Follow [Migration Guidelines](./development/MIGRATION_GUIDELINES.md).

## RPC naming

- Use one clear business action per `snake_case` RPC: `publish_rfq`, `award_supplier`, `complete_fulfillment`.
- Read aggregates use `get_*`; paginated collections use `list_*`.
- Internal helpers start with `_` and are not client contracts.
- Trusted functions authenticate, authorize, validate state, set `search_path`, and create audit/notification side effects atomically.
- Direct client writes are denied where the lifecycle is RPC-owned.

## Event naming

- Format: `domain.past_tense_event`, for example `fulfillment.qc_passed`.
- Event type describes a fact that occurred, not a command.
- Events include actor, time, entity, from/to status where applicable, and non-sensitive metadata.
- Changing an event meaning requires an ADR or explicit compatibility plan; add a new type instead of silently redefining history.

## Notification naming

- Format: `domain.event`, normally matching the trusted domain fact.
- Notifications are created only by trusted SQL paths.
- `entity_type`, `entity_id`, recipient, priority, and safe action URL must be documented.
- A reserved TypeScript type is not “implemented” until a trusted emitter and verification exist.

## Document naming

- Permanent reference documents use uppercase snake case: `DOMAIN_MODEL.md`.
- Domain folders use lowercase kebab-case and contain the standard uppercase files.
- Release package files use lowercase kebab-case as established: `release-notes.md`.
- Versioned snapshots include the version in the filename only when intentionally historical.

## Documentation structure

Each document states purpose, scope/status, owner or audience where useful, authoritative references, and last-updated date. Domain documentation follows [DOMAIN_TEMPLATE.md](./templates/DOMAIN_TEMPLATE.md). Avoid copying full schema or RPC descriptions between files; summarize and link to the owner document.

Status vocabulary:

- **Implemented in code:** present in repository but may require deployment/migration.
- **Active:** deployed and usable in the referenced environment, only when verified.
- **Planned / Not implemented:** no production contract.
- **Mock:** visual/demo behavior without production data.
- **Historical:** accurate only for the named release or snapshot.

## Verification scripts

- Filename: `scripts/verify-<capability>.mjs` unless an existing TypeScript verification convention applies.
- A domain script exercises live RPC/RLS boundaries, happy path, forbidden transitions, cross-company isolation, and audit/notification behavior where applicable.
- Scripts must report pass, fail, and legitimate skips separately and exit non-zero on failure.
- Required environment and migration prerequisites belong in the file header.
- Update [VERIFICATION_MATRIX.md](./VERIFICATION_MATRIX.md) whenever coverage changes.

## Release folders

- Path: `releases/<milestone-tag>/`.
- Minimum evidence for a database-backed domain release: `release-notes.md`, `verification-results.md`, `migration-summary.md`, and `known-limitations.md`.
- Release packages are historical records. Correct errors explicitly; do not rewrite them to imply later capabilities shipped in that release.
- Current status belongs in `docs/planning/CURRENT_STATUS.md`.

## Git tags and versioning

- Package version uses SemVer in `package.json`.
- Milestone tags use `v<semver>-<capability>`, for example `v0.5.0-order-lifecycle`.
- Create annotated release tags only after authorized quality gates pass.
- Align package version, changelog, release notes, release package, and tag at release time.
- A target tag is not an existing Git tag; label it “target” or “pending”.

## Architecture Decision Records

- Platform decisions: `D###` in `architecture/DECISION_LOG.md`.
- Module decisions: `AD-<module>-<sequence>` in `architecture/ARCHITECTURE_DECISIONS.md`.
- Every decision records context, decision, reason, alternatives, consequences/future review, status, and date.
- Valid statuses: `PROPOSED`, `LOCKED`/`ACCEPTED`, `SUPERSEDED`, `DEPRECATED`.
- Change a locked decision only through a linked superseding record.

## Mermaid diagrams

- Use Mermaid only when it clarifies ownership, relationships, state, sequence, or dependency.
- Keep node identifiers simple and labels concise.
- Diagrams must agree with adjacent prose and use canonical entity/status names.
- Mark future nodes as future; do not mix planned and implemented elements without a legend or explicit styling.
- Prefer one concern per diagram.

## Markdown conventions

- One H1 per file; sentence-case headings.
- Use relative links and descriptive link text.
- Use tables for compact reference data, not long narrative.
- Fence commands and diagrams; do not place implementation SQL in architecture documents.
- Use checklists only for actionable gates.
- Avoid duplicate prose; link to the authoritative document.

## Code review expectations

Reviewers confirm domain ownership, source-of-truth integrity, security boundaries, state transitions, backward compatibility, performance/index needs, documentation, and verification. No review may rely on UI controls as authorization. See [Code Review Checklist](./development/CODE_REVIEW_CHECKLIST.md).

## Verification philosophy

Verification proves behavior at the boundary where it is enforced. For this repository that means type safety and build checks for application code plus live Supabase RPC/RLS scripts for database domains. A skip is evidence of incomplete coverage, not a pass, and must state the missing prerequisite.

## Regression philosophy

Run the changed domain verification and all upstream/downstream workflows that share entities, helpers, RLS, notifications, or RPCs. Changes to PO acceptance therefore require Purchase Order and Fulfillment verification; changes to awards require RFQ, Quotation, Award, PO, and Fulfillment checks.

## Definition of Done

A change is done only when:

- Architecture and domain ownership are explicit.
- Security and RLS/RPC implications are reviewed.
- Types, lint, and build pass when application code can be affected.
- Required migrations are additive, reviewed, and verified when database work exists.
- Relevant current and regression verification scripts pass or a real blocker is documented.
- Documentation, decisions, schema/API references, status, changelog, and release evidence are consistent.
- Known limitations and future extensions are honest.
- No placeholder, duplicate concept, broken link, or unowned source of truth is introduced.

For documentation-only changes, database and browser execution may be **Not applicable**, but existing requested regression scripts still run when credentials and deployed prerequisites are available.

## References

- [Architecture index](./architecture/README.md)
- [Domain model](./architecture/DOMAIN_MODEL.md)
- [Verification matrix](./VERIFICATION_MATRIX.md)
- [Testing](./development/TESTING.md)
- [Release process](./development/RELEASE_PROCESS.md)

---

**Owner:** Staff Engineering  
**Last Updated:** 2026-07-18
