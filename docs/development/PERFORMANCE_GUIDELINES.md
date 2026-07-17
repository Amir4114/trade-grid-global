# Performance Guidelines

## Purpose

Performance expectations for UI and database work.

## Scope

Practical guidance for the current stack. Dedicated perf budgets — **Not implemented.**

## Table of contents

1. [Current Status](#current-status)
2. [Caching](#caching)
3. [Pagination](#pagination)
4. [Lazy loading](#lazy-loading)
5. [Indexes](#indexes)
6. [Database optimization](#database-optimization)
7. [React optimization](#react-optimization)
8. [Next.js optimization](#nextjs-optimization)
9. [References](#references)
10. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| Domain indexes in migrations | Implemented (see schema) |
| App-wide CDN cache policy doc | Partial (platform default) |
| Formal RUM | **Not implemented.** |

## Caching

- Prefer short-lived client refetch after mutations
- Do not cache award/quote decisions without revalidation
- HTTP cache headers strategy — mostly platform default today

## Pagination

Public product listing uses pagination helpers in `lib/products/service.ts`. New large lists should paginate; unbounded admin dumps are debt.

## Lazy loading

Use route-level code splitting from App Router; avoid shipping heavy client graphs on marketing pages unnecessarily (`three`/fiber exist — keep off critical procurement paths unless needed).

## Indexes

Add indexes with new filter/sort columns in migrations; document in [../architecture/DATABASE_SCHEMA.md](../architecture/DATABASE_SCHEMA.md).

## Database optimization

- Keep RPC transactions tight
- Avoid SELECT * across large joins in hot paths when projecting
- RLS expressions should use indexed foreign keys

## React optimization

- Prefer server components
- Don’t add memoization by default
- Disable expensive work while `busy`

## Next.js optimization

- Use `next/image` where replacing `<img>` (known lint debt on some pages)
- Keep env-only secrets server-side

## References

- [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- [../architecture/DATABASE_SCHEMA.md](../architecture/DATABASE_SCHEMA.md)

## Future notes

Add Lighthouse CI when marketing pages stabilize.

---

**Last Updated:** 2026-07-18
