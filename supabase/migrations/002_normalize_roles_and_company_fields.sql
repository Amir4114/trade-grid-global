-- Minimal schema alignment for signup/onboarding.
-- Run once in Supabase SQL editor.

-- 1) Normalize legacy profile roles (importer/exporter -> buyer/supplier)
update public.profiles
set role = 'buyer'
where lower(role) = 'importer';

update public.profiles
set role = 'supplier'
where lower(role) = 'exporter';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('buyer', 'supplier', 'admin'));

-- 2) Add missing company onboarding columns
alter table public.companies
  add column if not exists account_type text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_step text not null default 'business_info';

alter table public.companies
  drop constraint if exists companies_account_type_check;

alter table public.companies
  add constraint companies_account_type_check
  check (account_type is null or account_type in ('buyer', 'supplier'));

-- 3) Ensure companies RLS allows authenticated users to insert their own row
alter table public.companies enable row level security;

drop policy if exists "Users can read own company" on public.companies;
create policy "Users can read own company"
  on public.companies for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own company" on public.companies;
create policy "Users can insert own company"
  on public.companies for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own company" on public.companies;
create policy "Users can update own company"
  on public.companies for update
  using (auth.uid() = user_id);
