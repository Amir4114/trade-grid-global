# Testing

## Purpose

Define how Trade Grid Global is tested today and what is planned.

## Scope

Verification scripts and manual release testing. Formal Jest/Playwright suites — **Not implemented** unless added later.

## Table of contents

1. [Current Status](#current-status)
2. [Testing strategy](#testing-strategy)
3. [Unit testing](#unit-testing)
4. [Integration testing](#integration-testing)
5. [Verification scripts](#verification-scripts)
6. [Future E2E testing](#future-e2e-testing)
7. [Regression testing](#regression-testing)
8. [Release testing](#release-testing)
9. [References](#references)
10. [Future notes](#future-notes)

## Current Status

| Layer | Status |
|-------|--------|
| Live domain verification scripts | Implemented (`scripts/verify-*.mjs`) |
| Unit test framework in CI | **Not implemented.** |
| Browser E2E suite | **Not implemented.** |

## Testing strategy

1. Type safety: `npm run typecheck`
2. Static quality: `npm run lint`
3. Build: `npm run build`
4. Domain security/lifecycle: verification scripts against a real Supabase project
5. Manual smoke for UI flows

## Unit testing

**Not implemented** as a standard suite. Prefer pure helpers (e.g. formatters, SLA helpers) for future unit tests when introduced.

## Integration testing

Primary integration coverage is **live Supabase RPC + RLS** verification scripts (create users, exercise RPCs, assert isolation).

## Verification scripts

| Script | Focus |
|--------|-------|
| `verify-auth-flow.mjs` / `verify-dashboard-first-auth.mjs` / `verify-password-recovery.mjs` / `verify-onboarding-completion.mjs` | Auth |
| `verify-product-*.mjs` / `verify-product-lifecycle.mjs` | Products |
| `verify-notification-foundation.mjs` | Notifications |
| `verify-settings-security.mjs` | Settings guard |
| `verify-verification-operations.mjs` | Verification ops |
| `verify-rfq-foundation.mjs` | RFQ |
| `verify-quotation-system.mjs` | Quotations |
| `verify-award-system.mjs` | Awards |

Run after applying relevant migrations. Optional `SUPABASE_SERVICE_ROLE_KEY` deepens some asserts.

## Future E2E testing

Playwright/Cypress covering buyer award happy path — **Not implemented.** Planned after Module 3 stabilizes.

## Regression testing

Re-run the verification scripts that touch changed domains plus full typecheck/lint/build before release.

## Release testing

See [../deployment/RELEASE_CHECKLIST.md](../deployment/RELEASE_CHECKLIST.md) and browser checklist in [../RELEASE_NOTES.md](../RELEASE_NOTES.md).

## References

- [../architecture/ARCHITECTURE_STATUS_v0.3.0.md](../architecture/ARCHITECTURE_STATUS_v0.3.0.md)
- [../deployment/DEPLOYMENT.md](../deployment/DEPLOYMENT.md)

## Future notes

Add CI job matrix for verify scripts on ephemeral Supabase when feasible.

---

**Last Updated:** 2026-07-18
