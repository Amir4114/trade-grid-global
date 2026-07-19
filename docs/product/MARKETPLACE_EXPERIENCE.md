# Marketplace Experience

## Purpose

Marketplace Experience owns public entry, role choice, guest browsing, and
Buyer/Supplier workspace navigation. It does not own authentication,
marketplace company identity, or verification transitions.

A guest is a temporary acquisition context, not a `profile`, `company`, or
Trust subject. Guest sessions therefore use an authenticated-encrypted,
two-hour HttpOnly cookie and never create database records.

## Public entry flow

```mermaid
flowchart TD
    A[Public navigation] --> B[Start Trading]
    B --> C{Choose experience}
    C --> D[Continue as Guest]
    C --> E[Create Buyer Account]
    C --> F[Create Supplier Account]
    D --> G[Name and business email]
    G --> H[Encrypted two-hour guest session]
    H --> I[Read-only Marketplace]
    E --> J[Atomic marketplace signup]
    F --> J
    J --> K[Role onboarding workspace]
```

## Verification-to-workspace flow

```mermaid
flowchart TD
    A[Role onboarding workspace] --> B[Complete profile and documents]
    B --> C[Review]
    C --> D[Submit verification]
    D --> E[Trust RPC freezes case evidence]
    E --> F[Company: under_review]
    F --> G[Buyer or Supplier Overview]
    G --> H[Browse public Marketplace]
    G --> I[Read workspace data]
    G --> J{Trust-sensitive action}
    J -->|Under review| K[Explain approval requirement]
    J -->|Verified| L[Continue trading workflow]
```

## Access policy

| Context      | Public marketplace | Role workspace | Private drafts | Publish/submit/award |
| ------------ | ------------------ | -------------- | -------------- | -------------------- |
| Anonymous    | Yes                | No             | No             | No                   |
| Guest        | Yes, read-only     | No             | No             | No                   |
| Pending      | Yes                | Yes            | Yes            | No                   |
| Under review | Yes                | Yes            | Yes            | No                   |
| Verified     | Yes                | Yes            | Yes            | Yes                  |
| Rejected     | Yes                | Yes            | Yes            | No; resubmit first   |

The UI gate is clear guidance, not a replacement for Supabase RLS or trusted
RPC validation. Existing database authorization remains authoritative.
Phase 1 does not change commercial RPC or RLS policy. Where an existing RPC
does not yet require `verified`, this UI gate is not a security boundary; a
future governed capability migration must enforce that policy server-side.

## Workspace model

- Overview is the default post-login destination.
- Onboarding is one role-configured, single-active-section workspace.
- Verification Status reads canonical `companies.verification_status`.
- Analytics is a navigation placeholder only; no data pipeline or metric schema
  exists in Phase 1.
- Document management remains owned by the shared onboarding document manager.

## Related decisions

- [AD-ME-001 and AD-ME-002](../architecture/ARCHITECTURE_DECISIONS.md#index--marketplace-experience)
- [Security model](../architecture/SECURITY_MODEL.md#guest-access)
- [Data flow](../architecture/DATA_FLOW.md)
