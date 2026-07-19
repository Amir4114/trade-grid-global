# Contributor Onboarding

## Purpose

Get a new engineer productive on Trade Grid Global quickly.

## Scope

Local setup through first PR. Business context → [../planning/PROJECT_CONTEXT.md](../planning/PROJECT_CONTEXT.md).

## Table of contents

1. [Current Status](#current-status)
2. [Repository structure](#repository-structure)
3. [How to install](#how-to-install)
4. [How to run](#how-to-run)
5. [How to create a branch](#how-to-create-a-branch)
6. [How to create migrations](#how-to-create-migrations)
7. [How to test](#how-to-test)
8. [How to submit changes](#how-to-submit-changes)
9. [References](#references)
10. [Future notes](#future-notes)

## Current Status

Onboarding path documented. Interactive training environment — **Not implemented.**

## Repository structure

See root [README.md](../../README.md). Key areas: `app/`, `components/`, `lib/`, `supabase/migrations/`, `scripts/`, `docs/`.

## How to install

```bash
npm install
cp .env.example .env.local
```

Fill Supabase URL + anon key. Apply migrations `001`–`022` to your project ([../deployment/DEPLOYMENT.md](../deployment/DEPLOYMENT.md)).

## How to run

```bash
npm run dev
```

## How to create a branch

```bash
git checkout main
git pull
git checkout -b feature/short-name
```

Conventions: [GIT_WORKFLOW.md](./GIT_WORKFLOW.md).

## How to create migrations

1. Add `supabase/migrations/023_….sql` (next number)
2. Follow [MIGRATION_GUIDELINES.md](./MIGRATION_GUIDELINES.md)
3. Update schema/API docs
4. Add/extend a verify script when security boundaries change

## How to test

```bash
npm run typecheck
npm run lint
npm run build
node --use-system-ca scripts/verify-award-system.mjs
```

See [TESTING.md](./TESTING.md).

## How to submit changes

1. Ensure [CODE_REVIEW_CHECKLIST.md](./CODE_REVIEW_CHECKLIST.md)
2. Open PR against `main`
3. Do not commit secrets; do not push tags unless asked

Also: [../../CONTRIBUTING.md](../../CONTRIBUTING.md) · docs map [../README.md](../README.md).

## References

- [../deployment/ENVIRONMENT.md](../deployment/ENVIRONMENT.md)
- [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- [../architecture/ARCHITECTURE_STATUS_v0.3.0.md](../architecture/ARCHITECTURE_STATUS_v0.3.0.md)

## Future notes

Add a Dockerized local Supabase profile when the team wants offline DB. **Not implemented.**

---

**Last Updated:** 2026-07-18
