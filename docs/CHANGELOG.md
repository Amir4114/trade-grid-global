# Changelog

All notable changes to Trade Grid Global are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Product target tag: `v0.4.0-purchase-orders`. npm `package.json` version: **`0.4.0`**.

Dates use commit / tag dates from the repository history where available.

---

## [Unreleased]

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

Target tag: **`v0.4.0-purchase-orders`**.  
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
- Phase 0 locks in `docs/architecture/ARCHITECTURE_DECISIONS.md` (AD-3.1-*)

### Changed

- Procurement path now: RFQ → Quotation → Award → Purchase Order (issue/accept)
- Mock buyer Orders page removed

---

## [v0.3.0] — 2026-07-18

Also tagged as **`v0.3.0-procurement-complete`**.  
Commit: `7cd98e1` — *Complete procurement workflow with supplier award system*  
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

| Product tag | Approximate migrations | Git evidence |
|-------------|------------------------|--------------|
| v0.1 | 001–010 | Product + auth foundation commits |
| v0.2 | 011–015 | Notifications → RFQ → quotations |
| v0.3.0 | 016 (+ award UI) | Tag `v0.3.0-procurement-complete` |

[Unreleased]: #unreleased
[v0.3.0]: #v030--2026-07-18
[v0.2]: #v02--2026-07-15--2026-07-17
[v0.1]: #v01--2026-06-24--2026-07-14
