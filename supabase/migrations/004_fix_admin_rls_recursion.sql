-- Trade Grid Global: fix infinite recursion in admin RLS policies
--
-- Problem:
--   The "Admins can read all profiles" policy in 001_auth_onboarding.sql runs
--   `select 1 from public.profiles where id = auth.uid() and role = 'admin'`
--   from inside a policy ON public.profiles. Postgres re-applies RLS to that
--   subquery, which re-triggers the same policy, causing:
--     ERROR: 42P17 infinite recursion detected in policy for relation "profiles"
--   This breaks every admin read (e.g. fetchAdminUsers, verification queue).
--
-- Fix:
--   Use a SECURITY DEFINER helper that reads the role WITHOUT triggering RLS,
--   then rebuild all admin policies on top of it.
--
-- Run once in the Supabase SQL editor (or via the Supabase CLI).

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- profiles ------------------------------------------------------------------
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- companies -----------------------------------------------------------------
drop policy if exists "Admins can read all companies" on public.companies;
create policy "Admins can read all companies"
  on public.companies for select
  using (public.is_admin());

drop policy if exists "Admins can update all companies" on public.companies;
create policy "Admins can update all companies"
  on public.companies for update
  using (public.is_admin());

-- documents -----------------------------------------------------------------
drop policy if exists "Admins can read all documents" on public.documents;
create policy "Admins can read all documents"
  on public.documents for select
  using (public.is_admin());

-- storage.objects -----------------------------------------------------------
drop policy if exists "Admins can read all company documents" on storage.objects;
create policy "Admins can read all company documents"
  on storage.objects for select
  using (
    bucket_id = 'company-docs'
    and public.is_admin()
  );
