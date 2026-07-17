# Environment

Developer environment and toolchain notes for Trade Grid Global.

Related: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Required software

| Tool | Notes |
|------|-------|
| **Node.js** | Documented working version at generation time: **v24.15.0** |
| **npm** | Documented working version: **11.14.1** |
| **Git** | Required |
| **Supabase project** | Hosted Postgres + Auth + Storage |
| **Browser** | Modern Chromium/Firefox/Safari for dashboard testing |

A local Postgres install is optional if you use hosted Supabase only.

---

## Node / npm

From `package.json`:

- `"type": "module"`
- Next.js `^16.2.10`
- React `^19.2.4`
- TypeScript `^5.9.3`

Scripts:

| Script | Command |
|--------|---------|
| `dev` | `node scripts/dev.mjs` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint app components lib contexts proxy.ts` |
| `typecheck` | `tsc --noEmit` |
| `format` | Prettier on `ts`/`tsx` |

---

## Operating system notes

Primary development evidence in recent work: **Windows 10/11 (PowerShell)**.  
The codebase is cross-platform Node/Next; path spaces in the workspace name (`trade grid global`) require quoting in shells.

---

## Supabase CLI

- Optional. Repository snapshot has **no** checked-in `.supabase/` link.
- Migrations can be applied via SQL Editor without the CLI.
- If using CLI: install Supabase CLI, link project, then apply migrations carefully to match `supabase/migrations/` order.

Documented CLI probe during development used `npx supabase` (version varies by npx cache).

---

## Cursor / VS Code compatibility

| Editor | Support |
|--------|---------|
| **Cursor** | Supported (project includes `.cursor/rules`) |
| **VS Code** | Compatible; `.vscode/settings.json`, `extensions.json`, Tailwind CSS data present |

No editor-specific runtime is required to build the app.

---

## Folder structure (engineering)

```
app/                  Routes (App Router)
components/           React components by domain
contexts/             AuthProvider
lib/                  Services, types, Supabase clients
scripts/              Verification + dev helpers
supabase/migrations/  SQL 001–016
docs/                 Documentation (this tree)
proxy.ts              Auth/dashboard proxy gate
next.config.mjs
tsconfig.json
eslint.config.mjs
postcss.config.mjs
components.json       shadcn config
.env.example
.env.local            Local secrets (gitignored)
```

| Path | Status |
|------|--------|
| `hooks/` | **Not present** |
| `public/` | **No tracked files** in current snapshot |

---

## Configuration files

| File | Purpose |
|------|---------|
| `.env.example` | Template for Supabase URL/anon key, optional service role, and reserved future placeholders |
| `.env.local` | Local secrets (do not commit) |
| `next.config.mjs` | Next.js config |
| `tsconfig.json` | TypeScript paths/options |
| `eslint.config.mjs` | ESLint flat config |
| `components.json` | shadcn/ui |
| `proxy.ts` | Request proxy / auth gating for dashboards |

---

## Environment variables detail

| Name | Client-visible? | Required |
|------|-----------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** — server/scripts only | Optional (verification scripts) |
| `NEXTAUTH_*`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `SENTRY_DSN` | N/A | **Not implemented** — placeholders in `.env.example` only |

See root [`.env.example`](../../.env.example) for the full template.
