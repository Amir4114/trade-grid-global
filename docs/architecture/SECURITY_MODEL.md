# Security Model

Security architecture for Trade Grid Global as implemented in migrations `001`–`016` and the Next.js app.

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

| Item | Implementation |
|------|----------------|
| Provider | Supabase Auth (email/password) |
| Session | Cookie-based SSR via `@supabase/ssr` (`lib/supabase/client.ts`, `server.ts`) |
| Callback | `app/auth/callback` |
| Password recovery | `/forgot-password`, `/reset-password` |
| Roles | Stored on `profiles.role`: `buyer` \| `supplier` \| `admin` |
| Gate | `proxy.ts` + dashboard shell role checks |

Service role key is **never** shipped to the browser. Anon key is public and must remain RLS-safe.

---

## Authorization

### Role helpers (SECURITY DEFINER)

| Function | Rule |
|----------|------|
| `is_admin()` | `profiles.role = 'admin'` for `auth.uid()` |
| `is_supplier()` / `is_buyer()` | Role checks |
| `user_owns_company(cid)` | `companies.user_id = auth.uid()` |

### Admin hardening

- Migration `007` blocks client self-promotion into admin role
- Migration `004`/`006` define non-recursive `is_admin()` for policies

### Privileged transitions

Status changes that affect trust or commerce use RPCs, not raw table UPDATEs:

- Company verification submit / approve / reject
- Product submit / approve / reject / archive / restore / reopen
- RFQ publish / close / cancel
- Quotation submit / revise / withdraw
- Award / revoke award

---

## Company isolation

| Domain | Isolation rule |
|--------|----------------|
| Companies | One row per user; owners see own; admins see all |
| Products | Supplier owns via `company_id`; public sees published only |
| RFQs | Buyer owns via `buyer_company_id`; suppliers see only discoverable/accessible RFQs |
| Quotations | Unique thread per `(rfq_id, supplier_company_id)`; peers cannot read other suppliers’ threads/offers |
| Awards | Suppliers SELECT only awards for their `supplier_company_id`; losers use `get_award` limited payload |

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

| Property | Practice in repo |
|----------|------------------|
| `search_path` | Explicitly `set search_path = public` |
| Authn | Check `auth.uid()` where required |
| Authz | `is_buyer` / `is_supplier` / `is_admin` / `user_owns_company` |
| Variables | Prefer `v_` prefixes in PL/pgSQL (014–016) |
| Client grants | `GRANT EXECUTE … TO authenticated` for public RPCs |
| Internal helpers | Underscore prefix; typically `REVOKE` from `anon`/`authenticated` |

Threat if misconfigured: DEFINER without `search_path` or missing ownership checks. Current procurement migrations follow the hardened pattern.

---

## Storage security

| Bucket | Visibility | Controls |
|--------|------------|----------|
| `company-docs` | Private | Owner path upload/read; admin read |
| `product-images` | Public read | Supplier upload/update/delete own paths via ownership helper |
| `rfq-docs` | Private | Buyer upload on own RFQ paths; party read helpers |
| `quotation-docs` | Private | Supplier upload on own thread paths; party read helpers |

Path ownership helpers (examples): `supplier_owns_product_storage_path`, `buyer_owns_rfq_storage_path`, `supplier_owns_quotation_storage_path`, `can_read_quotation_storage_path`.

---

## Signed URLs

Private buckets rely on Supabase Storage authenticated access / signed URL patterns through the client SDK. The application does **not** implement a custom long-lived signed-URL microservice.

Document OCR route `app/api/verify-document` is separate from storage ACL and must not receive service-role credentials in client bundles.

---

## Notification permissions

| Action | Who |
|--------|-----|
| Create notification | Trusted SQL only (`_create_system_notification`, triggers, RPCs) |
| Read | Recipient only |
| Mark read / mark all | Recipient via RPC |
| Forge type/title/recipient | **Blocked** (verified by `verify-notification-foundation.mjs`) |

Action URLs should be sanitized in the app (`lib/notifications/safe-url.ts`).

---

## Audit logging

Immutable event tables (append-only via helpers):

| Table | Domain |
|-------|--------|
| `rfq_events` | RFQ lifecycle |
| `quotation_events` | Quotation lifecycle |
| `award_events` | Award lifecycle |
| `verification_case_events` | Verification ops |

Awards are never hard-deleted for history; revoke sets `status = revoked`.

---

## Threat model (current)

| Threat | Mitigation |
|--------|------------|
| Privilege escalation to admin | Role guard + RLS |
| Self-verify company / self-publish product | Triggers + RPCs |
| Forge notifications | No client insert |
| Read competitor quotations | Thread/offer RLS |
| Award another buyer’s RFQ | `award_supplier` ownership check |
| Quote after award / closed RFQ | Status assertions in quote RPCs |
| Storage path traversal | Path ownership helpers + policies |
| Service role leak | Not in client env; not in `.env.example` |

---

## Security assumptions

1. Supabase project has migrations `001`–`016` applied.
2. Anon key is acceptable to expose; RLS is correct and complete.
3. Admins are provisioned out-of-band (not self-serve signup to admin).
4. Operators do not paste service role keys into frontend env vars.
5. Verification scripts’ test users are acceptable in non-prod.

---

## Known security limitations

| Limitation | Notes |
|------------|-------|
| Mock dashboard pages | Not a bypass, but can mislead operators |
| Public `/rfq` mock submit | Does not write live RFQs; risk is UX confusion |
| Admin analytics/RFQ pages mock | No live admin RFQ moderation console |
| AI notification types reserved | Emitters **Not implemented.** |
| SLA warning notifications | Helpers exist; warning emitters **Not implemented.** |
| Buyer counter-offer path | Schema allows `offered_by = buyer`; UX **Not implemented.** |
| Environments without `016` | Award endpoints fail closed (missing RPC/table) |

---

## Verification

Prefer running:

- `scripts/verify-notification-foundation.mjs`
- `scripts/verify-settings-security.mjs`
- `scripts/verify-rfq-foundation.mjs`
- `scripts/verify-quotation-system.mjs`
- `scripts/verify-award-system.mjs`
