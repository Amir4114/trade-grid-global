# State Management

## Purpose

Describe how UI state is handled.

## Scope

React local state and auth context. Global stores (Redux/Zustand) — **Not implemented.**

## Table of contents

1. [Current Status](#current-status)
2. [Patterns in use](#patterns-in-use)
3. [Server as source of truth](#server-as-source-of-truth)
4. [Guidelines](#guidelines)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

| Approach | Status |
|----------|--------|
| React `useState` / `useEffect` in domain clients | Implemented |
| `contexts/AuthProvider` | Implemented |
| Redux/Zustand/Jotai | **Not implemented.** |

## Patterns in use

- Page-level state for lists/details (`loading`, `error`, `busy`, entity)
- Reload-after-mutation via service calls
- Notifications: fetch + realtime subscribe in notification UI

## Server as source of truth

Commercial state lives in Postgres (RFQ/quote/award statuses). UI must re-fetch after RPC success rather than inventing parallel truth.

## Guidelines

- Do not cache privileged decisions only in client memory
- Prefer derived UI from server statuses (`awarded`, `not_selected`, …)

## References

- [COMPONENT_GUIDELINES.md](./COMPONENT_GUIDELINES.md)
- [../architecture/DATA_FLOW.md](../architecture/DATA_FLOW.md)

## Future notes

Introduce a shared cache library only if list performance demands it.

---

**Last Updated:** 2026-07-18
