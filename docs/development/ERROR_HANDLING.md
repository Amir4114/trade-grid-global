# Error Handling

## Purpose

Consistent handling of failures across UI and RPCs.

## Scope

Client UX + SQL exceptions. Central error tracking → [LOGGING_GUIDELINES.md](./LOGGING_GUIDELINES.md).

## Table of contents

1. [Current Status](#current-status)
2. [RPC errors](#rpc-errors)
3. [Service layer](#service-layer)
4. [UI patterns](#ui-patterns)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

| Mechanism | Status |
|-----------|--------|
| `raise exception` in RPCs | Implemented |
| Services throw `Error` with message | Implemented |
| Sentry/global boundary productization | **Not implemented.** |

## RPC errors

Return actionable messages (“Only buyers can award…”, “RFQ already awarded”). Avoid leaking peer company commercial data.

## Service layer

`lib/*/service.ts` typically: `if (error) throw new Error(error.message)`.

## UI patterns

- Local `error` state on forms/pages
- Toasts for success / some notification arrivals (`lib/toast`)
- Keep buttons disabled while `busy`

## References

- [../architecture/API_REFERENCE.md](../architecture/API_REFERENCE.md)
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)

## Future notes

Add React error boundaries for dashboard segments when monitoring exists.

---

**Last Updated:** 2026-07-18
