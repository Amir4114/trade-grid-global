-- Trade Grid Global: Product System Phase 1
--
-- Adds the real, Supabase-backed product catalog on top of the existing
-- auth/onboarding schema (migrations 001-005). This migration is:
--   * additive          - creates only new objects, removes nothing
--   * data-safe         - no destructive statements, no data rewrites
--   * idempotent        - safe to re-run (create if not exists / create or
--                         replace / drop policy if exists + create)
--   * RLS protected     - row level security enabled with least-privilege
--                         policies; all sensitive status transitions go through
--                         narrowly scoped SECURITY DEFINER RPCs
--
-- Ownership model: company_id is the canonical owner of a product. A product
-- belongs to the company row, which in turn belongs to exactly one auth user
-- (companies.user_id is UNIQUE per migration 005).
--
-- Status lifecycle:
--   draft      - supplier work-in-progress (editable)
--   pending    - submitted, awaiting admin moderation (NOT supplier-editable)
--   published  - approved by admin, publicly visible
--   rejected   - declined by admin, editable again by supplier
--   archived   - retired by supplier (terminal for Phase 1)
--
-- Transition matrix:
--   supplier: create -> draft
--   supplier: edit content of draft / rejected (status unchanged)
--   supplier: draft|rejected -> pending      (RPC, requires completed onboarding)
--   admin:    pending -> published           (RPC)
--   admin:    pending -> rejected            (RPC, with reason)
--   supplier: draft|rejected|published -> archived (RPC)
--
-- Migrations 001-005 are NOT modified. public.is_admin() is normally created by
-- migration 004; because some live databases are missing it (004 drift), step 2
-- below re-creates it with the identical definition (create or replace) so 006
-- is self-contained and safe to apply regardless of 004's state.
--
-- LEGACY TABLE HANDLING (schema drift):
--   Some live databases already contain an older, incompatible public.products
--   table (columns like exporter_id / product_name / moq integer / price
--   numeric and NO company_id). A plain `create table if not exists` would
--   silently keep that legacy table and the rest of the migration would fail on
--   the missing company_id column. Step 0 below fixes this safely:
--     * canonical table already present (has company_id) -> left untouched
--     * legacy table present AND empty                   -> dropped, recreated
--     * legacy table present with ANY rows               -> RAISE EXCEPTION
--                                                           (fail-closed; no
--                                                           data is ever lost)
--   The drop is a plain DROP TABLE (no CASCADE): it removes only the table's
--   own indexes/policies/constraints/triggers, and fails closed if any external
--   object unexpectedly depends on it.

begin;

-- ---------------------------------------------------------------------------
-- 0) reconcile any pre-existing (legacy) public.products table
-- ---------------------------------------------------------------------------
do $$
declare
  has_company_id boolean;
  legacy_row_count bigint;
begin
  if to_regclass('public.products') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'products'
        and column_name = 'company_id'
    ) into has_company_id;

    -- Only reconcile when the existing table is NOT the canonical Phase 1 table.
    if not has_company_id then
      execute 'select count(*) from public.products' into legacy_row_count;

      if legacy_row_count > 0 then
        raise exception
          'Refusing to replace legacy public.products: % row(s) present. Export or migrate this data before applying migration 006.',
          legacy_row_count;
      end if;

      -- Empty legacy table with an incompatible schema: safe to remove and
      -- recreate below. No CASCADE, so it fails closed on unexpected deps.
      drop table public.products;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) products table
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null,
  description text not null default '',
  country_of_origin text not null default '',
  moq text not null default '',
  packaging text not null default '',
  lead_time text not null default '',
  incoterms text not null default '',
  hs_code text not null default '',
  price text not null default '',
  certifications text[] not null default '{}',
  specifications jsonb not null default '{}'::jsonb,
  image_url text,
  gallery text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'published', 'rejected', 'archived')),
  rejection_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_company_id_idx on public.products(company_id);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_category_idx on public.products(category);
create index if not exists products_published_idx
  on public.products(status, published_at desc);

alter table public.products enable row level security;

-- ---------------------------------------------------------------------------
-- 2) helper functions (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------
-- public.is_admin() is defined by migration 004. On databases where migration
-- 004 was never applied (confirmed live drift: "function public.is_admin() does
-- not exist"), the policies and RPCs below cannot be created. We therefore
-- (re)create it here with `create or replace`, using the EXACT same definition
-- as migration 004 so the two are byte-for-byte compatible and running either
-- order is safe and idempotent. This does NOT modify migration 004, does not
-- weaken authorization, and cannot recurse: it is SECURITY DEFINER with a fixed
-- search_path, so reading public.profiles inside it bypasses profiles RLS.
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

create or replace function public.is_supplier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'supplier'
  );
$$;

revoke all on function public.is_supplier() from public;
grant execute on function public.is_supplier() to authenticated;

create or replace function public.user_owns_company(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.companies
    where id = cid and user_id = auth.uid()
  );
$$;

revoke all on function public.user_owns_company(uuid) from public;
grant execute on function public.user_owns_company(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) RLS policies
-- ---------------------------------------------------------------------------
-- SELECT: the public may read ONLY published products.
drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products"
  on public.products for select
  using (status = 'published');

-- SELECT: a supplier may read all products owned by their own company.
drop policy if exists "Suppliers read own products" on public.products;
create policy "Suppliers read own products"
  on public.products for select
  using (public.user_owns_company(company_id));

-- SELECT: admins may read every product (moderation queue).
drop policy if exists "Admins read all products" on public.products;
create policy "Admins read all products"
  on public.products for select
  using (public.is_admin());

-- INSERT: only a supplier may create products, only for their own company,
-- and only in the 'draft' state. Buyers (is_supplier() = false) cannot insert.
drop policy if exists "Suppliers insert own draft products" on public.products;
create policy "Suppliers insert own draft products"
  on public.products for insert
  with check (
    public.is_supplier()
    and public.user_owns_company(company_id)
    and status = 'draft'
  );

-- UPDATE: a supplier may directly edit ONLY products currently in draft or
-- rejected, and the row must REMAIN in draft/rejected afterwards. This blocks:
--   * editing a pending product (USING fails: status not in draft/rejected)
--   * self-publish / self-reject / self-archive / self-submit (WITH CHECK fails)
-- Every real status transition is performed exclusively by the SECURITY DEFINER
-- RPCs below, which bypass this policy under controlled validation.
drop policy if exists "Suppliers edit editable products" on public.products;
create policy "Suppliers edit editable products"
  on public.products for update
  using (
    public.user_owns_company(company_id)
    and status in ('draft', 'rejected')
  )
  with check (
    public.user_owns_company(company_id)
    and status in ('draft', 'rejected')
  );

-- No DELETE policy is created: deletes are denied for all roles. Suppliers
-- archive instead (archive_product RPC).

-- ---------------------------------------------------------------------------
-- 4) status-transition RPCs (SECURITY DEFINER)
--    Each validates auth/ownership/role/status internally, so a broad UPDATE
--    policy is never required for sensitive transitions.
-- ---------------------------------------------------------------------------

-- supplier: draft|rejected -> pending (requires completed onboarding)
create or replace function public.submit_product_for_review(product_id uuid)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  prod public.products;
  onboarding_done boolean;
begin
  select * into prod from public.products where id = product_id;
  if not found then
    raise exception 'Product not found';
  end if;

  if not public.is_supplier() then
    raise exception 'Only suppliers can submit products for review';
  end if;

  if not public.user_owns_company(prod.company_id) then
    raise exception 'You cannot submit a product you do not own';
  end if;

  if prod.status not in ('draft', 'rejected') then
    raise exception 'Only draft or rejected products can be submitted for review';
  end if;

  select onboarding_completed into onboarding_done
  from public.companies where id = prod.company_id;

  if not coalesce(onboarding_done, false) then
    raise exception 'Complete your company onboarding before submitting products for review';
  end if;

  update public.products
     set status = 'pending',
         rejection_reason = null,
         updated_at = now()
   where id = product_id
   returning * into prod;

  return prod;
end;
$$;

revoke all on function public.submit_product_for_review(uuid) from public;
grant execute on function public.submit_product_for_review(uuid) to authenticated;

-- admin: pending -> published
create or replace function public.approve_product(product_id uuid)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  prod public.products;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve products';
  end if;

  select * into prod from public.products where id = product_id;
  if not found then
    raise exception 'Product not found';
  end if;

  if prod.status <> 'pending' then
    raise exception 'Only pending products can be approved';
  end if;

  update public.products
     set status = 'published',
         published_at = now(),
         rejection_reason = null,
         updated_at = now()
   where id = product_id
   returning * into prod;

  return prod;
end;
$$;

revoke all on function public.approve_product(uuid) from public;
grant execute on function public.approve_product(uuid) to authenticated;

-- admin: pending -> rejected (with reason)
create or replace function public.reject_product(product_id uuid, reason text)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  prod public.products;
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject products';
  end if;

  select * into prod from public.products where id = product_id;
  if not found then
    raise exception 'Product not found';
  end if;

  if prod.status <> 'pending' then
    raise exception 'Only pending products can be rejected';
  end if;

  update public.products
     set status = 'rejected',
         rejection_reason = nullif(trim(coalesce(reason, '')), ''),
         updated_at = now()
   where id = product_id
   returning * into prod;

  return prod;
end;
$$;

revoke all on function public.reject_product(uuid, text) from public;
grant execute on function public.reject_product(uuid, text) to authenticated;

-- supplier: draft|rejected|published -> archived
create or replace function public.archive_product(product_id uuid)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  prod public.products;
begin
  select * into prod from public.products where id = product_id;
  if not found then
    raise exception 'Product not found';
  end if;

  if not public.user_owns_company(prod.company_id) then
    raise exception 'You cannot archive a product you do not own';
  end if;

  if prod.status not in ('draft', 'rejected', 'published') then
    raise exception 'Only draft, rejected, or published products can be archived';
  end if;

  update public.products
     set status = 'archived',
         updated_at = now()
   where id = product_id
   returning * into prod;

  return prod;
end;
$$;

revoke all on function public.archive_product(uuid) from public;
grant execute on function public.archive_product(uuid) to authenticated;

commit;

-- Make the new table, columns, and functions visible to PostgREST immediately.
notify pgrst, 'reload schema';
