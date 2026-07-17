# Deployment

How to run, migrate, verify, and release Trade Grid Global.

Related: [ENVIRONMENT.md](./ENVIRONMENT.md) · [RELEASE_NOTES.md](../RELEASE_NOTES.md) · [BACKUP_AND_RECOVERY.md](./BACKUP_AND_RECOVERY.md) · [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md) · [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)

---

## Local setup

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env.local
```

4. Fill Supabase values (see [ENVIRONMENT.md](./ENVIRONMENT.md)).
5. Apply database migrations `001`–`016` to your Supabase project (see below).
6. Start the app:

```bash
npm run dev
```

`package.json` uses `node scripts/dev.mjs` for the `dev` script.

---

## Environment variables

| Variable | Required for app | Purpose |
|----------|------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | No (scripts) | Server-only; used by some verification scripts for notification counts / provisioning |

`.env.example` documents required Supabase public keys, optional service role, and reserved future placeholders (NextAuth/OpenAI/Resend/Sentry — **not wired**).

**Never** expose the service role key to the browser or commit it to git.

---

## Supabase

1. Create or select a Supabase project.
2. Enable Email auth as used by the app.
3. Apply SQL migrations from `supabase/migrations/` **in numeric order** (`001` … `016`).
4. Confirm storage buckets exist after relevant migrations:
   - `company-docs` (003)
   - `product-images` (008)
   - `rfq-docs` (014)
   - `quotation-docs` (015)
5. Confirm Realtime publication includes `notifications` if using live bell updates (011 attempts to add the table to `supabase_realtime` when present).

The repository does not currently include a checked-in linked Supabase CLI project (`.supabase/`). Migrations are typically applied via **Supabase SQL Editor** or CLI against a linked project.

---

## Next.js

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint on `app` `components` `lib` `contexts` `proxy.ts` |

Hosting target: **Vercel** (Next.js App Router). Configure the same env vars in the Vercel project.

---

## Running migrations

Recommended order:

1. Open Supabase SQL Editor (or `supabase db` / `psql` if configured).
2. Run each file in `supabase/migrations/` from `001_auth_onboarding.sql` through `016_award_system.sql`.
3. Do not skip numbers; later migrations depend on earlier helpers/tables.
4. Re-run is designed to be largely **idempotent** (`if not exists`, `create or replace`, `drop policy if exists`), but always review before production apply.

---

## Verification scripts

After migrations:

```bash
node --use-system-ca scripts/verify-rfq-foundation.mjs
node --use-system-ca scripts/verify-quotation-system.mjs
node --use-system-ca scripts/verify-award-system.mjs
```

Other scripts cover auth, products, notifications, settings, and verification ops. See architecture status § Verification Scripts.

Scripts load `.env.local` for URL/keys.

---

## Production deployment

1. Ensure migrations `001`–`016` are applied on the production Supabase project.
2. Set production env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Deploy Next.js to Vercel (or compatible host).
4. Run smoke checks: login, publish RFQ, submit quotation, award.
5. Optionally run verification scripts against production only with extreme care (they create test users).

---

## Git workflow

Observed repository practice:

- Primary branch: `main`
- Feature work lands via commits on `main` (history shows sequential milestone commits)
- Product milestones tagged (example: `v0.3.0-procurement-complete`)

Suggested safe workflow going forward:

1. Feature branch from `main`
2. PR + review
3. Merge to `main`
4. Tag release when migrations + verify scripts pass

---

## Release workflow

1. Update [CHANGELOG.md](../CHANGELOG.md) and [RELEASE_NOTES.md](../RELEASE_NOTES.md)
2. Ensure architecture docs match implementation
3. Apply migrations to staging → run verify scripts
4. `npm run typecheck && npm run lint && npm run build`
5. Deploy
6. Create annotated git tag (example already used):

```bash
git tag -a v0.3.0-procurement-complete -m "Procurement workflow complete"
```

7. Push tag when authorized

---

## Version tagging

| Kind | Example | Source of truth |
|------|---------|-----------------|
| Product / docs Git tag | `v0.3.0-procurement-complete` | Git tags + docs |
| npm package version | `0.3.0` | `package.json` |

Keep both referenced consistently (tag for milestone name; semver for package metadata).

---

## Rollback process

Database rollbacks are **manual and environment-specific**:

1. Prefer forward-fix migrations over editing historical SQL.
2. If a new migration fails mid-apply in staging, restore from Supabase backup / point-in-time recovery if enabled.
3. Application rollback: redeploy the previous Vercel (or host) deployment paired with a DB that still matches that code’s expected migrations.
4. Do not delete award/audit history rows to “undo” a release — use `revoke_award` for business undo when available.
5. Document any emergency hotfix migration as a new numbered file.
