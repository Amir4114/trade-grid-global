-- Trade Grid Global: auth, profiles, companies, documents
-- Run in Supabase SQL editor or via Supabase CLI

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('buyer', 'supplier', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  company_name text not null,
  country text not null default '',
  business_type text not null default '',
  company_structure text not null default '',
  verification_status text not null default 'pending',
  risk_score integer not null default 50,
  employee_count text,
  annual_purchase_volume text,
  year_established text,
  categories text[] not null default '{}',
  export_markets text[] not null default '{}',
  target_markets text[] not null default '{}',
  required_certifications text[] not null default '{}',
  certifications text[] not null default '{}',
  onboarding_completed boolean not null default false,
  onboarding_step text not null default 'business_info',
  account_type text check (account_type in ('buyer', 'supplier')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_type text not null,
  document_name text not null,
  file_url text not null,
  status text not null default 'pending',
  uploaded_at timestamptz not null default now()
);

create index if not exists companies_user_id_idx on public.companies(user_id);
create index if not exists documents_company_id_idx on public.documents(company_id);
create index if not exists profiles_role_idx on public.profiles(role);

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.documents enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can read own company"
  on public.companies for select
  using (auth.uid() = user_id);

create policy "Users can insert own company"
  on public.companies for insert
  with check (auth.uid() = user_id);

create policy "Users can update own company"
  on public.companies for update
  using (auth.uid() = user_id);

create policy "Admins can read all companies"
  on public.companies for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update all companies"
  on public.companies for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can read own company documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.companies
      where companies.id = documents.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can insert own company documents"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.companies
      where companies.id = documents.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Admins can read all documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
