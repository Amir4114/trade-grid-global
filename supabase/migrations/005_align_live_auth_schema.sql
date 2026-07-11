-- Trade Grid Global: reconcile live database with the intended auth schema
--
-- EVERY fix below was proven against the live database with the anon client
-- before being included. Claims that could not be reproduced (e.g. "full_name
-- column missing", "account_type/onboarding columns missing", "companies
-- SELECT/INSERT policies broken") were tested, DISPROVEN, and deliberately
-- excluded. Only evidence-backed changes remain.
--
-- Reproductions (authenticated anon session; auth.uid() proven valid because
-- SELECT of the caller's own row succeeds):
--
--   Defect 1 - profiles UPDATE blocked for owner
--     UPDATE profiles SET ... WHERE id = <self>        -> 0 rows affected
--     upsert profiles (INSERT ... ON CONFLICT DO UPDATE)-> 42501
--       "new row violates row-level security policy (USING expression)"
--     Runtime: lib/auth/signup.ts upserts profiles; a DB trigger already created
--     the row, so it resolves to UPDATE and is rejected -> "Profile creation
--     failed" on every signup.
--
--   Defect 2 - companies.onboarding_step is INTEGER (must be TEXT)
--     INSERT ... onboarding_step = 'business_info'      -> 22P02
--       "invalid input syntax for type integer: business_info"
--     INSERT ... onboarding_step = 0                    -> success, stored 0
--     Runtime: signup writes 'business_info' and onboarding writes 'completed'
--     -> both fail with 22P02.
--
--   Defect 3 - companies.user_id lacks a UNIQUE constraint
--     upsert companies { onConflict: 'user_id' }         -> 42P10
--       "there is no unique or exclusion constraint matching the ON CONFLICT
--        specification"
--     Runtime: lib/auth/signup.ts company upsert on user_id fails at plan time.
--
--   Defect 4 - companies UPDATE blocked for owner
--     (owner INSERT succeeds, proving auth.uid() = user_id)
--     UPDATE companies SET ... WHERE user_id = <self>    -> 0 rows affected
--     Runtime: lib/auth/onboarding.ts update().eq(user_id).select().single()
--     matches 0 rows -> PGRST116 -> onboarding can never complete.
--
--   Defect 5 - companies is MISSING 8 columns the app reads/writes
--     Read-only probe: select <col> from companies limit 0
--       employee_count, annual_purchase_volume, year_established, categories,
--       export_markets, target_markets, required_certifications, updated_at
--       each -> 42703 "column companies.<col> does not exist"
--       (42703 = genuinely absent, NOT a stale PGRST204 cache)
--     These are declared in 001_auth_onboarding.sql but never existed on the
--     drifted live table. verify-auth-flow.mjs did not catch this because it
--     only writes the 13 columns that DO exist and never touches onboarding-form
--     columns.
--     Runtime: lib/auth/onboarding.ts saveBuyerOnboarding / saveSupplierOnboarding
--     and submitCompanyForVerification write these columns -> PGRST204/42703 ->
--     onboarding completion is impossible; SupplierDashboardPage also reads
--     company.categories.length which is undefined without the column.
--
-- Independent catalog confirmation (run with elevated access if desired):
--   select data_type from information_schema.columns
--     where table_schema='public' and table_name='companies'
--       and column_name='onboarding_step';                    -- expect: integer
--   select conname, contype from pg_constraint
--     where conrelid='public.companies'::regclass and contype in ('u','x'); -- expect: no (user_id) unique
--   select cmd, qual, with_check from pg_policies
--     where schemaname='public' and tablename in ('profiles','companies');  -- expect: no working UPDATE policy
--
-- This migration removes NO columns and NO data. Requires service-role / SQL
-- editor privileges (the app anon key cannot alter policies, types, or
-- constraints).

begin;

-- ---------------------------------------------------------------------------
-- Defect 1: allow the authenticated owner to UPDATE their own profile.
-- Both USING and WITH CHECK are required so PostgREST upsert
-- (INSERT ... ON CONFLICT DO UPDATE) is permitted for the pre-existing,
-- trigger-created row.
-- ---------------------------------------------------------------------------
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Defect 2: onboarding_step must be TEXT (app writes 'business_info' /
-- 'completed'). Data-preserving cast; existing integer values become their
-- text form and are overwritten by the app on the next write.
-- ---------------------------------------------------------------------------
alter table public.companies
  alter column onboarding_step drop default;
alter table public.companies
  alter column onboarding_step type text using onboarding_step::text;
alter table public.companies
  alter column onboarding_step set default 'business_info';

-- ---------------------------------------------------------------------------
-- Defect 3: one company per user; required arbiter for upsert onConflict user_id.
-- Guarded so re-runs are safe. If this fails because duplicate user_id rows
-- already exist, that is a real data condition to review explicitly -- this
-- migration will NOT silently delete rows to force it through.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'companies_user_id_key'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_user_id_key unique (user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Defect 4: allow the authenticated owner to UPDATE their own company (used by
-- onboarding completion).
-- ---------------------------------------------------------------------------
drop policy if exists "Users can update own company" on public.companies;
create policy "Users can update own company"
  on public.companies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Defect 5: restore the onboarding columns the app reads/writes. Additive and
-- idempotent; matches the types declared in 001_auth_onboarding.sql. Existing
-- rows receive the column defaults. Removes nothing.
-- ---------------------------------------------------------------------------
alter table public.companies
  add column if not exists employee_count text,
  add column if not exists annual_purchase_volume text,
  add column if not exists year_established text,
  add column if not exists categories text[] not null default '{}',
  add column if not exists export_markets text[] not null default '{}',
  add column if not exists target_markets text[] not null default '{}',
  add column if not exists required_certifications text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

commit;

-- Make the corrected column type immediately visible to PostgREST.
notify pgrst, 'reload schema';
