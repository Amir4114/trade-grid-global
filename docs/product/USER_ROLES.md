# User Roles

## Purpose

Define buyer, supplier, and admin capabilities.

## Scope

Roles stored on `profiles.role`. Premium tiers — **Not implemented.**

## Table of contents

1. [Current Status](#current-status)
2. [Role matrix](#role-matrix)
3. [Admin notes](#admin-notes)
4. [References](#references)
5. [Future notes](#future-notes)

## Current Status

| Role | Status |
|------|--------|
| `buyer` / `supplier` / `admin` | Implemented |
| Premium Verified (as distinct role) | **Not implemented.** |

## Role matrix

| Capability | Buyer | Supplier | Admin |
|------------|-------|----------|-------|
| Onboarding + company profile | Yes | Yes | N/A (ops) |
| Submit company verification | Yes | Yes | Approves |
| Manage products | — | Yes | Moderate |
| Create/publish RFQs | Yes | — | Read (admin RFQ UI partly mock) |
| Quote on RFQs | — | Yes | — |
| Award supplier | Yes | — | SELECT awards; award RPC is buyer-only |
| Purchase Orders | Create/issue/cancel own | Accept/reject own | Read support |
| Fulfillment Phase A | Cancel/deliver/complete own per state | Production/QC/pack/ship own per state | Read support |
| Verification command center | — | — | Yes |
| Notifications | Own | Own | Own + admin alerts |

## Admin notes

Admin role is hardened against self-promotion. Provision out-of-band.

## References

- [BUSINESS_RULES.md](./BUSINESS_RULES.md)
- [../architecture/SECURITY_MODEL.md](../architecture/SECURITY_MODEL.md)
- [../planning/PROJECT_CONTEXT.md](../planning/PROJECT_CONTEXT.md)

## Future notes

Company multi-user seats — **Not implemented.**

---

**Last Updated:** 2026-07-18
