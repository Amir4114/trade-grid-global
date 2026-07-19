# Security Model

Security architecture for Trade Grid Global as implemented in migrations `001`–`022` and the Next.js app.

Related: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) · [API_REFERENCE.md](./API_REFERENCE.md) · [ARCHITECTURE_STATUS_v0.3.0.md](./ARCHITECTURE_STATUS_v0.3.0.md)

### Table of contents

- [Authentication](#authentication)
- [Authorization](#authorization)
- [Company isolation](#company-isolation)
- [RLS](#rls)
- [SECURITY DEFINER RPCs](#security-definer-rpcs)
- [Storage security](#storage-security)
- [Signed URLs](#signed-urls)
- [Notification permissions](#notification-permissions)
- [Audit logging](#audit-logging)
- [Threat model](#threat-model-current)
- [Known security limitations](#known-security-limitations)

---

## Authentication

| Item              | Implementation                                                               |
| ----------------- | ---------------------------------------------------------------------------- |
| Provider          | Supabase Auth (email/password)                                               |
| Session           | Cookie-based SSR via `@supabase/ssr` (`lib/supabase/client.ts`, `server.ts`) |
| Callback          | `app/auth/callback`                                                          |
| Password recovery | `/forgot-password`, `/reset-password`                                        |
| Roles             | Stored on `profiles.role`: `buyer` \| `supplier` \| `admin`                  |
| Provisioning      | Migration `021`: Auth/profile/company commit or roll back together           |
| Gate              | `proxy.ts` + dashboard shell role checks                                     |

Service role key is **never** shipped to the browser. Anon key is public and must remain RLS-safe.

### Guest access

- Guest Marketplace uses an AES-256-GCM authenticated-encrypted, HttpOnly,
  SameSite=Lax cookie with a two-hour expiry.
- The signing key is server-only `GUEST_SESSION_SECRET` and must contain at
  least 32 characters.
- Guest sessions do not create Supabase Auth, profile, company, or verification
  records.
- Dashboard routes still require Supabase authentication in `proxy.ts`; guest
  cookies grant no RLS identity or write capability.

---

## Authorization

### Role helpers (SECURITY DEFINER)

| Function                       | Rule                                       |
| ------------------------------ | ------------------------------------------ |
| `is_admin()`                   | `profiles.role = 'admin'` for `auth.uid()` |
| `is_supplier()` / `is_buyer()` | Role checks                                |
| `user_owns_company(cid)`       | `companies.user_id = auth.uid()`           |

### Admin hardening

- Migration `007` blocks client self-promotion into admin role
- Migration `004`/`006` define non-recursive `is_admin()` for policies
- Migration `019` prevents authenticated owners from changing marketplace role, company account type, owner, or risk score.
- Migration `020` freezes evidence per case, constrains canonical statuses/risk,
  requires review-before-decision, and makes rejected evidence replaceable
  without rewriting case history. It also normalizes owner company inserts to
  pending/baseline risk and blocks direct admin verification decisions.
- Migration `021` validates Buyer/Supplier signup metadata in a trusted Auth
  trigger and creates profile/company rows inside the Auth transaction. Its
  recovery RPC is authenticated, owner-bound, one-time, and rejects admins or
  users who already have a company.
- Migration `022` permits owner deletion only for pending, unsubmitted evidence.
  Security-definer predicates evaluate ownership and case linkage without RLS
  visibility gaps; Storage must be removed before metadata.

### Privileged transitions

Status changes that affect trust or commerce use RPCs, not raw table UPDATEs:

- Company verification submit / approve / reject
- Product submit / approve / reject / archive / restore / reopen
- RFQ publish / close / cancel
- Quotation submit / revise / withdraw
- Award / revoke award
- Purchase Order issue / accept / reject / cancel
- Fulfillment production / QC / packing / shipment / delivery / completion

Company verification submission additionally requires storage-backed `Trade License`
and `Company Registration` evidence. Owner-created document metadata is normalized
to `pending`, and its storage path must belong to the owner's company. Submission
freezes the reviewed documents in `verification_case_documents`; admin case views
and decisions use that immutable set.

---

## Company isolation

| Domain          | Isolation rule                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Companies       | One row per user; owners see own; admins see all                                                     |
| Products        | Supplier owns via `company_id`; public sees published only                                           |
| RFQs            | Buyer owns via `buyer_company_id`; suppliers see only discoverable/accessible RFQs                   |
| Quotations      | Unique thread per `(rfq_id, supplier_company_id)`; peers cannot read other suppliers’ threads/offers |
| Awards          | Suppliers SELECT only awards for their `supplier_company_id`; losers use `get_award` limited payload |
| Purchase Orders | Buyer owns; supplier sees own non-draft POs; admin reads all                                         |
| Fulfillment     | Buyer/supplier see own company rows; admin reads all; lifecycle writes are RPC-only                  |

Cross-company isolation is covered by verification scripts for RFQ, quotation, and award domains.

---

## RLS

### Patterns

1. Enable RLS on all sensitive tables
2. Prefer SELECT policies for clients
3. Deny direct INSERT/UPDATE/DELETE where RPCs own the lifecycle (notifications, RFQ/quotation/award core rows)
4. Qualify ambiguous columns in multi-table policy expressions (`status`, `id`, `*_id`)

### Notifications special case

- `GRANT SELECT` only to `authenticated`
- `REVOKE` INSERT/UPDATE/DELETE from clients
- Trusted DEFINER inserts bypass privilege revocation as function owner

### Verification cases

- Admin SELECT policies only
- Case mutations via admin RPCs / internal helpers

---

## SECURITY DEFINER RPCs

| Property         | Practice in repo                                                  |
| ---------------- | ----------------------------------------------------------------- |
| `search_path`    | Explicitly `set search_path = public`                             |
| Authn            | Check `auth.uid()` where required                                 |
| Authz            | `is_buyer` / `is_supplier` / `is_admin` / `user_owns_company`     |
| Variables        | Prefer `v_` prefixes in PL/pgSQL (014–016)                        |
| Client grants    | `GRANT EXECUTE … TO authenticated` for public RPCs                |
| Internal helpers | Underscore prefix; typically `REVOKE` from `anon`/`authenticated` |

Threat if misconfigured: DEFINER without `search_path` or missing ownership checks. Current procurement migrations follow the hardened pattern.

---

## Storage security

| Bucket                | Visibility  | Controls                                                                             |
| --------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `company-docs`        | Private     | Owner path upload/read; short signed preview; pending unsubmitted delete; admin read |
| `product-images`      | Public read | Supplier upload/update/delete own paths via ownership helper                         |
| `rfq-docs`            | Private     | Buyer upload on own RFQ paths; party read helpers                                    |
| `quotation-docs`      | Private     | Supplier upload on own thread paths; party read helpers                              |
| `purchase-order-docs` | Private     | PO party-scoped access                                                               |
| `fulfillment-docs`    | Private     | Fulfillment party-scoped access                                                      |

Path ownership helpers (examples): `supplier_owns_product_storage_path`, `buyer_owns_rfq_storage_path`, `supplier_owns_quotation_storage_path`, `can_read_quotation_storage_path`.

---

## Signed URLs

Private buckets rely on Supabase Storage authenticated access / signed URL
patterns through the client SDK. Company evidence previews expire after five
minutes and remain subject to owner/admin Storage SELECT policy. The application
does **not** implement a custom long-lived signed-URL microservice.

Document OCR route `app/api/verify-document` is separate from storage ACL and must not receive service-role credentials in client bundles.

---

## Notification permissions

| Action                     | Who                                                              |
| -------------------------- | ---------------------------------------------------------------- |
| Create notification        | Trusted SQL only (`_create_system_notification`, triggers, RPCs) |
| Read                       | Recipient only                                                   |
| Mark read / mark all       | Recipient via RPC                                                |
| Forge type/title/recipient | **Blocked** (verified by `verify-notification-foundation.mjs`)   |

Action URLs should be sanitized in the app (`lib/notifications/safe-url.ts`).

---

## Audit logging

Immutable event tables (append-only via helpers):

| Table                      | Domain                              |
| -------------------------- | ----------------------------------- |
| `rfq_events`               | RFQ lifecycle                       |
| `quotation_events`         | Quotation lifecycle                 |
| `award_events`             | Award lifecycle                     |
| `verification_case_events` | Verification ops                    |
| `purchase_order_events`    | Commercial Purchase Order lifecycle |
| `fulfillment_order_events` | Operational Fulfillment lifecycle   |

Awards are never hard-deleted for history; revoke sets `status = revoked`.

---

## Threat model (current)

| Threat                                     | Mitigation                               |
| ------------------------------------------ | ---------------------------------------- |
| Privilege escalation to admin              | Role guard + RLS                         |
| Self-verify company / self-publish product | Triggers + RPCs                          |
| Forge notifications                        | No client insert                         |
| Read competitor quotations                 | Thread/offer RLS                         |
| Award another buyer’s RFQ                  | `award_supplier` ownership check         |
| Quote after award / closed RFQ             | Status assertions in quote RPCs          |
| Storage path traversal                     | Path ownership helpers + policies        |
| Service role leak                          | Not in client env; not in `.env.example` |

---

## Security assumptions

1. Supabase project has migrations `001`–`022` applied for all documented current domains.
2. Anon key is acceptable to expose; RLS is correct and complete.
3. Admins are provisioned out-of-band (not self-serve signup to admin).
4. Operators do not paste service role keys into frontend env vars.
5. Verification scripts’ test users are acceptable in non-prod.

---

## Known security limitations

| Limitation                     | Notes                                                       |
| ------------------------------ | ----------------------------------------------------------- |
| Mock dashboard pages           | Not a bypass, but can mislead operators                     |
| Public `/rfq` mock submit      | Does not write live RFQs; risk is UX confusion              |
| Admin analytics/RFQ pages mock | No live admin RFQ moderation console                        |
| AI notification types reserved | Emitters **Not implemented.**                               |
| SLA warning notifications      | Helpers exist; warning emitters **Not implemented.**        |
| Buyer counter-offer path       | Schema allows `offered_by = buyer`; UX **Not implemented.** |
| Environments without `016`     | Award endpoints fail closed (missing RPC/table)             |

---

## Verification

Prefer running:

- `scripts/verify-notification-foundation.mjs`
- `scripts/verify-settings-security.mjs`
- `scripts/verify-rfq-foundation.mjs`
- `scripts/verify-quotation-system.mjs`
- `scripts/verify-award-system.mjs`
- `scripts/verify-purchase-order-system.mjs`
- `scripts/verify-order-fulfillment-system.mjs`

Complete inventory: [../VERIFICATION_MATRIX.md](../VERIFICATION_MATRIX.md). Fulfillment-specific controls: [../domains/fulfillment/SECURITY.md](../domains/fulfillment/SECURITY.md).
