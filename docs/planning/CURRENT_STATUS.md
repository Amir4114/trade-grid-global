# Current Status

Living operational status for Trade Grid Global.  
Architecture detail: [ARCHITECTURE_STATUS_v0.3.0.md](../architecture/ARCHITECTURE_STATUS_v0.3.0.md)  
Canonical domain model: [DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md)
Locked decisions: [ARCHITECTURE_DECISIONS.md](../architecture/ARCHITECTURE_DECISIONS.md)
Fulfillment domain: [domains/fulfillment/README.md](../domains/fulfillment/README.md)

---

## Current version

| Field                        | Value                                                                     |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Product version (stable)** | `v0.4.0-purchase-orders`                                                  |
| **Latest tagged milestone**  | `v0.5.0-phase-a` — Module 3.2 Phase A                                     |
| **In progress**              | `v0.5.0-order-lifecycle` — global gate pending Trust migration `020`     |
| **Existing Git tags**        | `v0.3.0-procurement-complete`, `v0.4.0-purchase-orders`, `v0.5.0-phase-a` |
| **Current branch**           | `release/v0.5.1-fulfillment-stabilization`                                |
| **npm package.json version** | `0.4.0`                                                                   |

---

## Platform stabilization — Buyer onboarding and settings

Buyer onboarding and settings were stabilized before Fulfillment Phase B:

- Migration `021` makes marketplace registration transactional: the Auth insert, profile role, and company row now commit or roll back together.
- Signup metadata is the initial role source; the client no longer updates a trigger-created default Buyer profile after Auth commits.
- A retry with valid credentials can atomically recover legacy users that have no company, while already provisioned accounts are rejected from duplicate provisioning.
- Fixed the permanent `Loading onboarding profile...` state caused by treating a loaded-but-missing company row as an active fetch.
- Buyer onboarding now distinguishes loading, fetch failure, signed-out, existing-company, and missing-company states.
- Supplier onboarding now also exits loading for fetch, session, and missing-company failures, with retry/recovery guidance; supplier row creation remains a signup responsibility.
- A first-time or partially provisioned buyer can create the missing `profiles` and `companies` records through the normal RLS-protected onboarding submission.
- Contact name, legal organization name, and country of registration are required alongside business type, company structure, and at least one import category.
- Buyer Settings uses the same shared account, verification/security, notification, and role-specific company architecture as Supplier Settings, with explicit retry and onboarding recovery states.
- `verify-onboarding-completion.mjs` now covers buyer missing-company recovery.
- Verification follow-up hardening is implemented in migration `019`: trusted submission requires storage-backed Trade License and Company Registration evidence; owner-created metadata is forced to pending; role/account type/risk fields are protected.
- Migration `020` locks each case to its submitted evidence, requires review before a reasoned decision, transitions evidence for replacement/reuse, constrains canonical states/risk range, and expands material identity invalidation.
- Owners can read rejection feedback, and admins can open private case-scoped evidence through short-lived signed URLs.
- Buyer and Supplier onboarding now use one role-configured, single-section
  workspace. Company evidence is collected only in its Documents step and
  verification is submitted from the same workflow.
- Migration `022` permits owner preview/replacement and deletion only for
  pending evidence that is not linked to a case. Rejected, approved, and
  submitted evidence remains immutable.

The loader/root-cause fix required no migration. The subsequent verification
security and architecture reviews required additive migrations `019` and `020`;
migration `019` is active, but migration `020` remains absent from the connected
project and must be applied before the global release tag.

## Marketplace experience redesign — Phase 1

- Public navigation now centers Marketplace, Solutions, Resources, Pricing,
  About, Guest Access, Sign In, and Start Trading.
- Start Trading offers Guest, Buyer, and Supplier entry paths.
- Guest access uses an authenticated-encrypted two-hour read-only browser
  session and creates no marketplace identity records.
- Verification submission returns users to role Workspace Overview.
- Under-review users retain workspace, marketplace browsing, and private draft
  authoring while public/commercial publish, submit, award, and issue actions
  remain gated.
- Buyer/Supplier Overview includes verification progress and guidance.
- Buyer/Supplier Analytics navigation is present as an explicit placeholder;
  no analytics data model or metrics were introduced.

## Marketplace Foundation final polish — M1.1

- Every Buyer, Supplier, and Admin route now uses one role-aware workspace
  header with Profile/Company identity, canonical verification status, current
  section context, and RLS-filtered summary counts.
- Buyer and Supplier Overview remain the default post-login destinations and
  now surface company health, verification, pending setup tasks, quick actions,
  recent domain activity, and notification previews.
- The public company directory is backed by the existing anonymous-safe
  `public_suppliers` projection. SEO-ready `/company/{name--companyId}` pages
  combine that projection with published products and never query owner-only
  company fields.
- Marketplace company/product routes now provide explicit skeleton, empty, and
  recoverable error states.
- Buyer, Supplier, and Admin Analytics use the same placeholder and introduce
  no charts, metrics, schema, or pipelines.
- Marketplace Foundation presentation decisions are locked by AD-ME-003 and
  AD-ME-004. No migration, RLS, RPC, trigger, Auth, signup, or Trust change is
  part of M1.1.

---

## Current milestone

**Module 3.2 Order Lifecycle — Phase B release-verified and frozen.**

- `fulfillment_orders` is the operational child of an accepted Purchase Order.
- PO remains immutable commercial truth; fulfillment owns production → QC → pack → ship → deliver → complete.
- Auto-create on `accept_purchase_order` (AD-3.2-004).
- Migration `023` adds append-only supplemental milestones/comments, deterministic chronological aggregate reads, and required cancellation reasons.
- Buyer and Supplier Orders workspaces now provide Fulfillment lists, progress, timelines, milestones, comments, and role-permitted actions.
- Final live verification passed 44 checks with 0 failures and 2 service-role-only skips; buyer and supplier browser mutation/readback flows passed.

---

## Completed modules

| Module                                               | Status                                            |
| ---------------------------------------------------- | ------------------------------------------------- |
| Auth / onboarding / password recovery                | Hardened in code; apply `021` for atomic signup   |
| Company settings + identity guard                    | Complete; explicit loading/error/absent states    |
| Products + media + lifecycle                         | Complete                                          |
| Notifications                                        | Complete                                          |
| Verification operations (admin command center)       | Hardened in code; apply migrations `019`–`022`    |
| RFQ foundation (dashboard)                           | Complete                                          |
| Quotation system                                     | Complete                                          |
| Award & supplier selection                           | Complete (ensure migration `016` applied)         |
| Purchase Order system (Module 3.1)                   | Complete in code (ensure migration `017` applied) |
| Order Fulfillment DB foundation (Module 3.2 Phase A) | Complete in code (ensure migration `018` applied) |
| Order Fulfillment operations/UI (Module 3.2 Phase B) | Release-verified and frozen; migration `023` live |

---

## Verification status

Complete inventory and planned coverage: [VERIFICATION_MATRIX.md](../VERIFICATION_MATRIX.md).

| Area            | Script                                | Notes                                   |
| --------------- | ------------------------------------- | --------------------------------------- |
| Fulfillment     | `verify-order-fulfillment-system.mjs` | Requires migrations `017`, `018`, `023` |
| Purchase orders | `verify-purchase-order-system.mjs`    | Requires `017`                          |
| Awards          | `verify-award-system.mjs`             | Requires `016`                          |
| Quotations      | `verify-quotation-system.mjs`         | Requires `014`+`015`                    |
| RFQ             | `verify-rfq-foundation.mjs`           | Requires `014`                          |

Notification assertions often **SKIP** without `SUPABASE_SERVICE_ROLE_KEY`.

---

## Known blockers

| Blocker                                                            | Impact                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Migration `020` is missing from the connected environment          | Case-scoped evidence verifier is blocked; apply before the global release tag                   |
| No `SUPABASE_SERVICE_ROLE_KEY` / `DATABASE_URL` in local agent env | Cannot auto-apply SQL or assert all notifications                                               |
| Public `/rfq` not wired to live `rfqs`                             | Marketing RFQ surface disconnected                                                              |

---

## Immediate next objective

**Apply Trust migration `020`, rerun its verifier, then design Logistics 3.3
without adding transportation fields to frozen Fulfillment.**

---

## Overall completion estimate

| Scope                                 | Estimate                                           |
| ------------------------------------- | -------------------------------------------------- |
| Trust + procurement through PO accept | High (migration `020` deployment gap remains)      |
| Fulfillment database + RPC contract   | Release-verified and frozen                        |
| Fulfillment UI                        | Release-verified on buyer/supplier desktop/mobile  |
| Logistics / claims / payments         | Not started; separate future domains               |

---

**Last Updated:** 2026-07-19
