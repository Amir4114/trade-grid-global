# Changelog

All notable changes to Trade Grid Global are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Latest milestone tag: `v0.5.0-phase-a`; full-release target: `v0.5.0-order-lifecycle`. npm `package.json` version: **`0.4.0`**.

Dates use commit / tag dates from the repository history where available.

---

## [Unreleased]

### Added

- Permanent architecture index, seven-domain model, engineering handbook, verification matrix, domain template, Fulfillment domain documentation, and repository health report.
- Migration `019_verification_submission_hardening.sql` for required storage-backed company evidence, owner document metadata enforcement, rejection feedback, and marketplace role/account/risk guards.
- Migration `020_verification_case_evidence_lock.sql` for immutable case evidence, review-before-decision, reasoned rejection/replacement, material identity invalidation, and canonical trust constraints.
- Migration `021_atomic_marketplace_signup.sql` for transactional Auth/profile/company provisioning and authenticated recovery of legacy incomplete registrations.
- Migration `022_pending_company_document_management.sql` for owner deletion of pending, unsubmitted company evidence using ordered Storage/metadata authorization.
- Admin short-lived signed document review links and shared verification recovery states.
- Locked Trust & Verification architecture decisions and domain lifecycle contract.

### Changed

- Aligned living product, planning, architecture, security, deployment, and release references with the tagged Phase A baseline.
- Stabilized Buyer onboarding and Settings before Fulfillment Phase B:
  - Marketplace signup now provisions Auth, profile, and company inside the Auth database transaction instead of client-side sequential upserts.
  - Supplier registration no longer attempts to mutate a trigger-created Buyer profile, and failed provisioning rolls back the Auth user.
  - Retrying an affected legacy registration authenticates the owner and atomically repairs missing profile/company state; complete accounts cannot be reprovisioned.
  - Loaded-but-missing company data is no longer treated as an indefinite loading state.
  - Buyer onboarding can create missing owner-scoped profile and company rows through existing RLS policies.
  - Onboarding now requires contact name, legal organization name, country, business type, company structure, and an import category.
  - Supplier onboarding now resolves fetch, session, and missing-company states with explicit messages instead of an indefinite loader.
  - Buyer Settings now exposes explicit load-error retry and missing-company recovery states while retaining the shared Supplier/Buyer settings workspace.
  - Onboarding verification now covers missing-company buyer recovery.
  - Verification submission now requires active Trade License and Company Registration evidence at both UI and RPC layers.
  - Rejected document types can be replaced while preserving rejected evidence history; under-review and verified users cannot resubmit.
  - Admin review now displays only the evidence frozen for that case; company approval/rejection requires review start and rejection requires actionable feedback.
  - Verification approval no longer overwrites the independent risk score.
  - Company settings no longer report failure after a successful company write solely because a redundant profile reload failed.
- Consolidated Buyer and Supplier onboarding into one role-configured,
  single-section workspace with Business, Categories, Markets, Certifications,
  Documents, Review, and Verification Submission steps.
- Replaced duplicate verification/certification upload pages with compatibility
  redirects to the canonical onboarding Documents section.
- Added canonical typed multi-document upload, owner preview, pending replacement
  and deletion, rejected append-only replacement, status display, and review
  locks. Removed the unsupported `Certification Document` label.
- Added a shared role-configured dashboard Overview composition based on real
  company onboarding/trust data, without analytics schema or invented metrics.
- Redesigned marketplace entry navigation and replaced Join Free with a Start
  Trading chooser for Guest, Buyer, and Supplier journeys.
- Added authenticated-encrypted, two-hour, read-only Guest Marketplace sessions
  without creating Auth, profile, company, or Trust records.
- Redirected successful verification submissions to role Workspace Overview.
- Added under-review workspace access guidance, trust-sensitive action gates,
  verification progress cards, and Buyer/Supplier Analytics placeholders.

---

## [v0.5.0-phase-a] — 2026-07-18

### Added

- Migration `018_order_fulfillment_system.sql`: `fulfillment_orders`, `fulfillment_order_events`, `fulfillment_order_documents`, private bucket `fulfillment-docs`
- Fulfillment lifecycle RPCs (`create_fulfillment`, production/QC/pack/ship/deliver/complete/cancel/fail/dispute, `get_fulfillment`, `list_fulfillments`)
- Extended `accept_purchase_order` to auto-create fulfillment (AD-3.2-004)
- Service wrappers `lib/fulfillment/service.ts` + typed models / notification types
- Script: `scripts/verify-order-fulfillment-system.mjs`
- Docs: DATABASE_SCHEMA / API_REFERENCE / CURRENT_STATUS updated for Module 3.2 Phase A

### Changed

- Repository housekeeping: root README, CONTRIBUTING, LICENSE.md, improved `.env.example`, docs version alignment.
- Expanded enterprise documentation under `docs/` (architecture diagrams, development standards, operations, product runbooks).

---

## [v0.4.0] — 2026-07-18

Tag: **`v0.4.0-purchase-orders`**.
npm version: `0.4.0`  
Release package: [`releases/v0.4.0-purchase-orders/`](../releases/v0.4.0-purchase-orders/release-notes.md)

### Added

- Migration `017_purchase_order_system.sql`: `purchase_orders`, `purchase_order_items`, `purchase_order_events`, `purchase_order_documents`, private bucket `purchase-order-docs`
- RPCs: `create_purchase_order_draft`, `update_purchase_order_draft`, `issue_purchase_order`, `accept_purchase_order`, `reject_purchase_order`, `cancel_purchase_order`, `get_purchase_order`, `list_purchase_orders`
- Extended `revoke_award` (additive replace): blocks revoke when issued/accepted PO exists; auto-cancels draft POs
- Service layer `lib/purchase-orders/*`
- Buyer Orders UI (replaces mock): list, create from award, detail, issue/cancel
- Supplier Orders UI: list, accept/reject, timeline
- Notifications: `purchase_order.created|issued|accepted|rejected|cancelled` (`purchase_order.completed` reserved, not emitted in 3.1)
- Script: `scripts/verify-purchase-order-system.mjs`
- Phase 0 locks in `docs/architecture/ARCHITECTURE_DECISIONS.md` (AD-3.1-\*)

### Changed

- Procurement path now: RFQ → Quotation → Award → Purchase Order (issue/accept)
- Mock buyer Orders page removed

---

## [v0.3.0] — 2026-07-18

Also tagged as **`v0.3.0-procurement-complete`**.

Commit: `7cd98e1` — _Complete procurement workflow with supplier award system_

npm version: `0.3.0`

### Added

- Enterprise documentation structure under `docs/` (architecture, planning, deployment)
- Migration `016_award_system.sql`: `quotation_awards`, `award_events`
- RPCs: `award_supplier`, `get_award`, `revoke_award`
- Buyer compare & award UI on RFQ detail
- Supplier win/lose messaging and `/dashboard/supplier/awards`
- Notifications: `quotation.awarded`, `quotation.not_selected`, `rfq.awarded`
- Script: `scripts/verify-award-system.mjs`
- Extended `supplier_can_access_rfq` for post-award participant read access
- Enterprise documentation tree under `docs/`

### Changed

- RFQ award locks quoting (`status = awarded`); losing offers marked `not_selected`
- Architecture documentation promoted to `v0.3.0-procurement-complete`

### Security

- Award mutations via SECURITY DEFINER RPC only; RLS SELECT for buyer/supplier/admin scopes
- Losing suppliers receive award existence without peer commercial award payload via `get_award`

---

## [v0.2] — 2026-07-15 … 2026-07-17

Grouped trust-ops + RFQ + quotation era (commits `e215df3`, `ee783d7` and related 011–015 work).

### Added

- Migration `011_notification_foundation.sql` — persistent notifications + mark-read RPCs
- Migration `012_settings_verified_identity_guard.sql` — verification status privilege guard
- Migration `013_verification_operations_foundation.sql` — verification cases, events, assessments, admin RPCs
- Migration `014_rfq_foundation.sql` — RFQs, invites, attachments, events, `rfq-docs`
- Migration `015_quotation_system.sql` — quotation threads/offers/attachments/events, `quotation-docs`
- Buyer/supplier RFQ dashboards; quotation submit/revise/withdraw; buyer compare list
- Admin Verification Command Center + product management surfaces
- Verification scripts for notifications, settings, verification ops, RFQ, quotations

### Changed

- Product moderation RPCs emit notifications and sync verification cases
- Company verification submission restricted to trusted RPC path

### Security

- Notifications: no client INSERT; SELECT own rows only
- Company `verification_status` self-assignment blocked for non-admins
- Quotation draft privacy from buyers; cross-company thread isolation

### Fixed

- Quotation RLS ambiguity on unqualified `status` in multi-table policies (015 hardening)

---

## [v0.1] — 2026-06-24 … 2026-07-14

Foundation through product system (commits from initial working tree through `23090b0` / product lifecycle).

### Added

- Auth onboarding foundation (migrations `001`–`005`, `007`)
- Company docs storage bucket `company-docs` (`003`)
- Product system (`006`), media + public views (`008`), structured trade data (`009`), lifecycle restore/reopen (`010`)
- Dashboard-first optional onboarding
- Password recovery + password visibility UX
- Public marketplace product/supplier surfaces (live views where wired)
- Product verification scripts (system, phase2, phase2.5, lifecycle)
- Early docs: `PROJECT_CONTEXT`, `CURRENT_STATUS`

### Changed

- Next.js upgraded to 16.2.10
- Admin RLS recursion fixes (`004`)
- Live auth schema alignment (`005`)
- Admin role hardening (`007`)

### Security

- `is_admin()` SECURITY DEFINER helper to avoid RLS recursion
- Admin role mutation guard
- Product publish only via admin RPCs (no supplier self-publish)

---

## Version mapping notes

| Product tag    | Approximate migrations               | Git evidence                      |
| -------------- | ------------------------------------ | --------------------------------- |
| v0.1           | 001–010                              | Product + auth foundation commits |
| v0.2           | 011–015                              | Notifications → RFQ → quotations  |
| v0.3.0         | 016 (+ award UI)                     | Tag `v0.3.0-procurement-complete` |
| v0.4.0         | 017 (+ PO UI)                        | Tag `v0.4.0-purchase-orders`      |
| v0.5.0 Phase A | 018 (+ Fulfillment service contract) | Tag `v0.5.0-phase-a`              |

[Unreleased]: #unreleased
[v0.5.0-phase-a]: #v050-phase-a--2026-07-18
[v0.3.0]: #v030--2026-07-18
[v0.2]: #v02--2026-07-15--2026-07-17
[v0.1]: #v01--2026-06-24--2026-07-14
