# Security Checklist

## Purpose

Pre-merge / pre-release security prompts.

## Scope

Complements [../architecture/SECURITY_MODEL.md](../architecture/SECURITY_MODEL.md).

## Table of contents

1. [Current Status](#current-status)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [RLS](#rls)
5. [RPC review](#rpc-review)
6. [Secrets](#secrets)
7. [Storage](#storage)
8. [SQL review](#sql-review)
9. [Dependency review](#dependency-review)
10. [References](#references)
11. [Future notes](#future-notes)

## Current Status

Security model implemented through migration `016`. Checklist automation — **Not implemented.**

## Authentication

- [ ] Session handled via Supabase SSR helpers
- [ ] No custom JWT parsing that bypasses Auth
- [ ] Password recovery flows unchanged unless intentional

## Authorization

- [ ] Role checks (`is_buyer` / `is_supplier` / `is_admin`) correct
- [ ] Company ownership enforced
- [ ] Admin self-promotion still blocked

## RLS

- [ ] New tables have RLS enabled
- [ ] Policies fail closed
- [ ] Multi-table policies fully qualify columns

## RPC review

- [ ] `search_path = public`
- [ ] Authn/authz before writes
- [ ] Status machine validated
- [ ] Internal helpers not granted to `authenticated` unless intended

## Secrets

- [ ] No secrets in git
- [ ] Service role not in `NEXT_PUBLIC_*`
- [ ] `.env.example` has placeholders only

## Storage

- [ ] Path ownership helpers used
- [ ] Private buckets stay private

## SQL review

- [ ] No dynamic SQL from user input
- [ ] Grants minimal

## Dependency review

- [ ] New packages justified ([DEPENDENCY_POLICY.md](./DEPENDENCY_POLICY.md))
- [ ] No unnecessary client exposure of heavy/native modules

## References

- [../architecture/SECURITY_MODEL.md](../architecture/SECURITY_MODEL.md)
- [MIGRATION_GUIDELINES.md](./MIGRATION_GUIDELINES.md)
- [CODE_REVIEW_CHECKLIST.md](./CODE_REVIEW_CHECKLIST.md)

## Future notes

Add automated `npm audit` gate in CI.

---

**Last Updated:** 2026-07-18
