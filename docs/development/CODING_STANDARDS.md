# Coding Standards

## Purpose

Shared engineering standards for Trade Grid Global application code.

## Scope

TypeScript / React / Next.js conventions. DB rules → [MIGRATION_GUIDELINES.md](./MIGRATION_GUIDELINES.md). Product UI feel → [UI_UX_GUIDELINES.md](./UI_UX_GUIDELINES.md).

## Table of contents

1. [Current Status](#current-status)
2. [TypeScript](#typescript)
3. [React](#react)
4. [Next.js](#nextjs)
5. [Naming conventions](#naming-conventions)
6. [Folder structure](#folder-structure)
7. [Imports](#imports)
8. [Formatting](#formatting)
9. [Comments](#comments)
10. [Documentation](#documentation)
11. [Best practices](#best-practices)
12. [References](#references)
13. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| ESLint + Prettier + `tsc --noEmit` | Implemented |
| Formal style guide beyond this doc / Cursor rules | This document |

## TypeScript

- Strict typing; avoid `any` unless unavoidable.
- Domain types live in `lib/database/types.ts` and domain `types.ts` files.
- Prefer explicit return types on exported service functions.

## React

- Prefer Server Components unless interactivity requires `"use client"`.
- Keep components small and modular; reuse existing UI (`components/ui`, domain folders).
- Do not duplicate components.
- Follow existing patterns (`startTransition`, etc.) when already used; do not add `useMemo`/`useCallback` by default without need.

## Next.js

- App Router only (`app/`).
- Dashboard pages compose domain components; keep data access in `lib/*` services.
- Do not weaken `proxy.ts` auth/role gates.

## Naming conventions

| Kind | Convention |
|------|------------|
| React components | `PascalCase.tsx` |
| Services / utils | `camelCase.ts` |
| SQL migrations | `NNN_snake_case.sql` |
| RPC names | `snake_case` |
| Notification types | `domain.event` |

## Folder structure

```
app/           routes
components/    UI by domain
lib/           services + types
supabase/migrations/
scripts/       verification
docs/          documentation
```

Do not invent parallel trees (`hooks/` currently absent).

## Imports

- Use `@/` path alias as elsewhere in the repo.
- Prefer importing from domain modules (`@/lib/rfq/service`) over deep relative chains when consistent with existing code.

## Formatting

- Prettier (`npm run format`) and ESLint (`npm run lint`).
- Match surrounding file style.

## Comments

- Explain non-obvious invariants (RLS, status machines), not trivial code.
- Do not leave placeholder TODOs that invent unscheduled features.

## Documentation

- Update `docs/` when behavior or schema changes.
- Mark unfinished work **Not implemented.**

## Best practices

From project rules: Security > Stability > Scalability > Features; production-ready patterns only; preserve auth and RLS; mobile-first responsive UI; Food/FMCG focus only.

## References

- [COMPONENT_GUIDELINES.md](./COMPONENT_GUIDELINES.md)
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
- [../architecture/DECISION_LOG.md](../architecture/DECISION_LOG.md)

## Future notes

Adopt React Compiler guidance consistently when the toolchain enables it.

---

**Last Updated:** 2026-07-18
