# Verification Matrix

Inventory of repository verification scripts. “Present” means the script exists; it does not claim the current environment passed. The latest recorded release evidence is in `releases/*/verification-results.md`.

## Status legend

- **Complete:** dedicated script exists for the expected domain.
- **Partial:** coverage exists across adjacent scripts but no single domain-wide contract.
- **Planned:** no dedicated script exists.
- **Recorded PASS:** historical release evidence records a successful run.

## Domain matrix

| Domain                  | Verification script                       | Coverage                                                                                                                | Current status                                                                                 | Future tests                                                       |
| ----------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Authentication          | `verify-auth-flow.mjs`                    | Atomic Buyer/Supplier provisioning, failed-signup rollback, orphan recovery, duplicate prevention, role guard, login    | Complete in code; migration `021` required for live execution                                  | Session expiry, OAuth, abuse/rate limits                           |
| Authentication          | `verify-dashboard-first-auth.mjs`         | Dashboard-first routing contract                                                                                        | Complete                                                                                       | Automated browser redirect coverage                                |
| Authentication          | `verify-password-recovery.mjs`            | Password recovery contract                                                                                              | Complete                                                                                       | Browser email-link journey                                         |
| Authentication          | `verify-onboarding-completion.mjs`        | Buyer/supplier completion, shared workspace route behavior, and missing-company Buyer recovery under RLS                | Complete                                                                                       | Multi-user company onboarding                                      |
| Marketplace             | `verify-product-system.mjs`               | Product lifecycle, moderation, role hardening, public visibility                                                        | Partial domain coverage                                                                        | Dedicated marketplace discovery/search contract                    |
| Marketplace             | `verify-product-phase2.mjs`               | Product media and public supplier phase                                                                                 | Partial                                                                                        | Storage edge cases and ranking                                     |
| Marketplace             | `verify-product-phase2-5.mjs`             | Structured Food/FMCG trade fields                                                                                       | Partial                                                                                        | Category-specific validation                                       |
| Marketplace             | `verify-product-lifecycle.mjs`            | Archive, restore, reopen behavior                                                                                       | Partial                                                                                        | Public cache invalidation                                          |
| Marketplace experience  | `verify-marketplace-experience.ts`        | Role Overview redirects, under-review access policy, trust-sensitive gates, Analytics route ownership                   | Complete helper coverage; guest cookie/API requires browser integration check                  | Automated guest expiry and multi-browser session coverage          |
| Marketplace foundation  | `verify-marketplace-foundation-polish.ts` | Canonical company slugs, immutable ID resolution, malformed slug rejection, legacy compatibility, fixture-free activity | Complete helper coverage; public projection and responsive states require browser integration  | Automated metadata, anonymous disclosure, and accessibility checks |
| Product security        | `verify-settings-security.mjs`            | Material identity invalidation, marketplace role/account/risk immutability, required evidence submission                | Complete in code; migrations `019`–`020` required                                              | Multi-user membership                                              |
| Product policy          | `verify-settings-policy.ts`               | Settings policy helper behavior                                                                                         | Complete helper check                                                                          | Standard test runner integration                                   |
| Notifications           | `verify-notification-foundation.mjs`      | Own-row reads, trusted creation, lifecycle notifications                                                                | Complete                                                                                       | Delivery/retry and realtime disconnect behavior                    |
| Notifications           | `verify-notification-safe-url.ts`         | Action URL sanitization                                                                                                 | Complete helper check                                                                          | Browser navigation checks                                          |
| Verification operations | `verify-verification-operations.mjs`      | Canonical uploads, preview isolation, pending replace/delete, case evidence locks, decisions/resubmission, roles, audit | Complete in code; migrations `019`–`022` and service role required for admin-positive coverage | SLA jobs, renewal, and AI assessment review                        |
| RFQ                     | `verify-rfq-foundation.mjs`               | Lifecycle, visibility, RLS, events, storage/notifications where credentials allow                                       | Complete; recorded PASS for v0.4.0                                                             | Expiry automation and public/live RFQ integration                  |
| Quotation               | `verify-quotation-system.mjs`             | Draft privacy, submit/revise/withdraw, isolation, events                                                                | Complete; recorded PASS for v0.4.0                                                             | Buyer counter-offers and richer terms                              |
| Award                   | `verify-award-system.mjs`                 | Selection, one-active-award, losers, revoke, isolation                                                                  | Complete; recorded PASS for v0.4.0                                                             | Split awards and admin support policy                              |
| Purchase Orders         | `verify-purchase-order-system.mjs`        | Snapshot, issue/accept/reject/cancel, RLS, events, notifications                                                        | Complete; recorded PASS for v0.4.0                                                             | Amendments, multi-line edits, e-sign                               |
| Fulfillment             | `verify-order-fulfillment-system.mjs`     | Auto-create, lifecycle, mandatory QC, milestones/comments, chronology, disputes, actor rules, RLS, audit, notifications | PASS — 44 passed, 0 failed, 2 service-role skips; migrations 017, 018, 023 live                 | Documents, concurrency/load, external event delivery               |
| Logistics               | —                                         | No first-class shipment/carrier domain                                                                                  | Planned                                                                                        | Shipment/leg state, carrier events, tracking isolation             |
| Claims                  | —                                         | Minimal Fulfillment dispute hold only                                                                                   | Planned                                                                                        | Claim lifecycle, evidence, resolution, split/return paths          |
| Payments                | —                                         | No invoice/payment/escrow domain                                                                                        | Planned                                                                                        | Provider contract, ledger, reconciliation, refunds                 |
| Analytics               | —                                         | No live analytics verification                                                                                          | Planned                                                                                        | Metric lineage, tenant isolation, reconciliation                   |
| AI                      | —                                         | Mock UI only; no production model contract                                                                              | Planned                                                                                        | Evaluation, safety, explainability, drift, human approval          |

## Expected regression chain

Run commands from the repository root after applying the required migrations:

```bash
node --use-system-ca scripts/verify-auth-flow.mjs
node --use-system-ca scripts/verify-product-system.mjs
npx tsx scripts/verify-marketplace-foundation-polish.ts
node --use-system-ca scripts/verify-rfq-foundation.mjs
node --use-system-ca scripts/verify-quotation-system.mjs
node --use-system-ca scripts/verify-award-system.mjs
node --use-system-ca scripts/verify-purchase-order-system.mjs
node --use-system-ca scripts/verify-order-fulfillment-system.mjs
```

`verify-marketplace` and `verify-authentication` do not exist under those exact names. Use `verify-product-system.mjs` as the current marketplace foundation and `verify-auth-flow.mjs` for authentication.

## Environment and interpretation

- Scripts require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`.
- Some scripts require `SUPABASE_SERVICE_ROLE_KEY` for trusted admin provisioning, notification counts, or storage metadata.
- Missing service-role coverage must be reported as **SKIP**, not silently treated as pass.
- A missing required migration is a blocker for that domain verification, not an application regression to “fix” in a documentation sprint.
- Scripts create test users/data in the configured project; run against an approved non-production environment unless the script is explicitly production-safe.

## Quality gates

| Gate                   | Command/evidence                                   |
| ---------------------- | -------------------------------------------------- |
| Type safety            | `npm run typecheck`                                |
| Static analysis        | `npm run lint`                                     |
| Production compilation | `npm run build`                                    |
| Domain behavior        | Relevant `scripts/verify-*` commands               |
| Security               | RLS/RPC negative tests plus review checklist       |
| Browser                | Release-specific manual checklist until E2E exists |
| Documentation          | Relative-link validation and terminology review    |

## References

- [Engineering handbook](./STANDARDS.md)
- [Testing strategy](./development/TESTING.md)
- [Current status](./planning/CURRENT_STATUS.md)
- [Fulfillment verification](./domains/fulfillment/README.md#verification)
- [v0.4.0 verification evidence](../releases/v0.4.0-purchase-orders/verification-results.md)

---

**Owner:** Quality Engineering / Domain Owners  
**Last Updated:** 2026-07-19
