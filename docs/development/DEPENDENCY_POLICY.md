# Dependency Policy

## Purpose

Rules for adding or upgrading npm dependencies.

## Scope

`package.json` / lockfile. Do not invent unused SaaS SDKs.

## Table of contents

1. [Current Status](#current-status)
2. [Principles](#principles)
3. [Allowed categories](#allowed-categories)
4. [Process](#process)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

Dependencies managed via npm; `package.json` is `private: true`.

## Principles

- Prefer platform capabilities (Supabase, Next.js) over new frameworks
- Minimize client bundle weight
- No dependency that requires leaking secrets to the browser

## Allowed categories

UI primitives, Supabase clients, lint/format/typescript tooling, targeted libs already present (e.g. framer-motion, tesseract for OCR route).

New AI/email/Sentry SDKs only when the feature is scheduled (placeholders exist in `.env.example` but are **Not implemented**).

## Process

1. Justify in PR
2. Pin/ranges consistent with repo style
3. Run `typecheck` / `lint` / `build`
4. Update docs if env vars are introduced

## References

- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
- [../deployment/ENVIRONMENT.md](../deployment/ENVIRONMENT.md)

## Future notes

Renovate/Dependabot — configure when org allows. **Not implemented** in-repo.

---

**Last Updated:** 2026-07-18
