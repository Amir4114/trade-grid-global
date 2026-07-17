# Contributing to Trade Grid Global

Thank you for contributing. This repository is a **private / proprietary** B2B platform codebase. Follow these standards so trust, RLS, and procurement invariants stay intact.

Related: [`docs/README.md`](./docs/README.md) · [`docs/deployment/DEPLOYMENT.md`](./docs/deployment/DEPLOYMENT.md)

---

## Branch naming

Prefer:

| Pattern | Use |
|---------|-----|
| `feature/<short-name>` | New capabilities |
| `fix/<short-name>` | Bug fixes |
| `docs/<short-name>` | Documentation only |
| `chore/<short-name>` | Tooling / housekeeping |
| `migration/<nnn>-<name>` | Additive DB migrations |

Examples: `feature/purchase-orders`, `docs/architecture-v0.3`, `fix/quotation-rls-ambiguity`

Default integration branch: `main`.

---

## Commit conventions

- Prefer clear, imperative subjects (e.g. `Add award supplier RPC and buyer compare UI`).
- Explain **why** in the body when the change is security-sensitive or migrates data.
- Do not commit secrets (`.env.local`, service role keys, credentials).
- Do not amend shared history or force-push `main` unless explicitly approved.

Keep a Changelog entries belong in `docs/CHANGELOG.md` for release-facing work.

---

## Migration rules

1. **Never edit** historical files under `supabase/migrations/` that are already applied in shared environments.
2. Add a new numbered migration (`017_…sql`) that is additive and preferably idempotent (`if not exists`, `create or replace`, `drop policy if exists`).
3. Fully qualify ambiguous columns in multi-table SQL/RLS (`status`, `id`, `*_id`, timestamps).
4. SECURITY DEFINER functions must set `search_path = public` and use `v_`-prefixed PL/pgSQL variables.
5. Preserve RLS fail-closed defaults; prefer RPC-owned lifecycle writes for commercial tables.
6. Document the migration in `docs/architecture/DATABASE_SCHEMA.md` and release notes when shipping.

---

## Documentation standards

- Implementation facts only — mark unfinished work as **Not implemented.**
- Prefer updating existing docs under `docs/` over creating duplicates.
- Keep cross-links relative and working (`architecture/`, `planning/`, `deployment/`).
- Product/docs version tag: `v0.3.0-procurement-complete`; npm version: `0.3.0`.
- Do not invent env vars, RPCs, or tables.

---

## Verification requirements

After database or security-sensitive changes, run the relevant script(s):

```bash
node --use-system-ca scripts/verify-rfq-foundation.mjs
node --use-system-ca scripts/verify-quotation-system.mjs
node --use-system-ca scripts/verify-award-system.mjs
```

Other scripts cover auth, products, notifications, settings, and verification ops.  
Optional: `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for deeper notification/admin assertions.

---

## Testing expectations

Before opening a PR:

```bash
npm run typecheck
npm run lint
npm run build
```

For procurement/auth flows, manually smoke-test the affected dashboard paths (see release notes browser checklist).

Automated unit/e2e suites beyond verification scripts — expand as Module 3 lands; do not claim coverage that does not exist.

---

## Release workflow

1. Update `docs/CHANGELOG.md` and `docs/RELEASE_NOTES.md`
2. Align version references (`package.json`, README, architecture status, current status)
3. Apply migrations to staging → run verification scripts
4. `typecheck` / `lint` / `build`
5. Merge to `main`
6. Annotated git tag when releasing (example: `v0.3.0-procurement-complete`)
7. Deploy (see `docs/deployment/DEPLOYMENT.md`)

Do not push tags or production deploys without explicit approval.

---

## Pull request checklist

- [ ] Scope matches the ticket / request (no drive-by refactors)
- [ ] No secrets committed
- [ ] No edits to historical migrations (additive only)
- [ ] RLS / RPC changes reviewed for company isolation
- [ ] Docs updated when behavior or schema changes
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Relevant `scripts/verify-*.mjs` run (or justified skip)
- [ ] Known limitations noted if incomplete

---

## Code of collaboration

- Security > stability > scalability > features
- Prefer server components unless client interactivity is required
- Reuse existing UI/patterns; avoid duplicate components
- Food & FMCG focus only — do not generalize into unrelated marketplace verticals
