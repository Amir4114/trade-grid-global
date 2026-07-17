# API Design Guidelines

## Purpose

Conventions for Supabase RPCs and Next.js route handlers.

## Scope

RPC-first backend. REST resource APIs for orders/payments — **Not implemented.**

## Table of contents

1. [Current Status](#current-status)
2. [RPC design](#rpc-design)
3. [Naming](#naming)
4. [Errors](#errors)
5. [Versioning](#versioning)
6. [Next.js routes](#nextjs-routes)
7. [References](#references)
8. [Future notes](#future-notes)

## Current Status

| Surface | Status |
|---------|--------|
| SECURITY DEFINER RPCs | Implemented |
| Public REST versioning | **Not implemented.** |

## RPC design

- One clear business action per RPC (`publish_rfq`, `award_supplier`)
- Authenticate (`auth.uid()`), authorize (role/ownership), validate status machine
- Emit audit events + notifications inside the same transaction when required
- Return the primary row or structured jsonb (`get_quotation_thread`, `get_award`)

## Naming

- `snake_case` functions
- Prefix internal helpers with `_`
- Parameters `p_*`

## Errors

- `raise exception` with actionable messages
- Do not leak cross-company data in errors

## Versioning

Document breaking RPC behavior in [../CHANGELOG.md](../CHANGELOG.md). Formal API versions — **Not implemented.**

## Next.js routes

Existing: `app/auth/callback`, `app/api/verify-document`. Prefer RPCs for domain mutations. Do not expose service role.

## References

- [../architecture/API_REFERENCE.md](../architecture/API_REFERENCE.md)
- [ERROR_HANDLING.md](./ERROR_HANDLING.md)
- [../architecture/DECISION_LOG.md](../architecture/DECISION_LOG.md)

## Future notes

If Module 3 adds HTTP APIs, version under `/api/v1` and keep RLS/RPC as source of truth.

---

**Last Updated:** 2026-07-18
