-- Trade Grid Global: Product System Phase 2
-- Product media storage + safe public supplier identity.
--
-- This migration is:
--   * additive        - creates only new objects (bucket, one helper function,
--                       storage policies, two read-only views); does not modify
--                       existing tables, columns, RLS, RPCs, or migrations 001-007.
--   * idempotent      - bucket upserts on conflict; helper uses create or replace;
--                       policies are drop-if-exists then recreate; views use
--                       create or replace (no CASCADE, no table drops).
--   * fail-closed     - storage write policies require supplier role AND safe
--                       ownership validation of the first path segment; malformed
--                       paths return false instead of raising cast exceptions.
--   * least-exposure  - the public views expose ONLY the safe marketing columns
--                       listed below and ONLY rows tied to a PUBLISHED product.
--
-- RERUN NOTE:
--   Views are maintained with CREATE OR REPLACE (not DROP/CREATE) so grants
--   and dependent objects are preserved across reruns. PostgreSQL requires
--   DROP/CREATE only when removing/renaming view columns; this migration does
--   not do that. Policies are always recreated to pick up helper changes.
--
-- ---------------------------------------------------------------------------
-- STORAGE MODEL (bucket: product-images)
-- ---------------------------------------------------------------------------
--   Path convention (enforced by the app):  <company_id>/<random-uuid>.<ext>
--   The first path segment is the owning company id; storage RLS ties write
--   access to that company via public.supplier_owns_product_storage_path().
--
--   The bucket is PUBLIC (read) on purpose: published product images must be
--   stably and cacheably viewable by anonymous marketplace visitors, and image
--   file names are random UUIDs that are never listed publicly.
--
--   RESIDUAL RISK (documented, accepted for Phase 2): because the bucket is
--   public-read, an object is retrievable by anyone who knows its exact random
--   URL. Draft/pending image URLs are only ever stored on the product row
--   (readable by owner/admin, or publicly only once published), so they are not
--   discoverable through any public listing. This is the standard marketplace
--   trade-off and does NOT expose the private products/companies tables. If
--   stricter per-status image privacy is later required, switch the bucket to
--   private + signed URLs in a follow-up migration.
--
-- ---------------------------------------------------------------------------
-- PUBLIC SUPPLIER IDENTITY (views: public_products, public_suppliers)
-- ---------------------------------------------------------------------------
--   public.companies RLS restricts reads to the owner and admins, so the public
--   marketplace cannot read supplier identity directly. These two views are
--   owned by the migration role (postgres) and run with security_invoker = false,
--   so they bypass RLS on the base tables -- but they are safe because:
--     1. they hard-filter to products.status = 'published', and
--     2. they project ONLY the explicitly approved marketing columns.
--   security_barrier = true prevents user-supplied predicates from observing
--   filtered-out rows via leaky functions.
--
--   Exposed company fields (safe):  company_id, company_name, country,
--     business_type, verification_status (derived public badge value),
--     year_established, categories.
--   NEVER exposed: user_id, risk_score, personal email, onboarding internals,
--     documents, admin notes, or any other companies/profiles column.
--
--   verification_status derivation (from live app contract):
--     signup default          -> 'pending'
--     onboarding submission   -> 'under_review'  (lib/auth/onboarding.ts)
--     admin approve             -> 'verified'      (admin verification UI)
--     admin reject              -> 'rejected'      (admin verification UI)
--   The view normalizes these to a public-safe badge value; any unknown or
--   future internal value maps to 'pending' (never 'verified').

begin;

-- ---------------------------------------------------------------------------
-- 1) product-images storage bucket (public read, typed + size limited)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2) safe storage path ownership helper (must exist before policies)
--    Validates the first path segment is a UUID before calling
--    public.user_owns_company(). Malformed or missing segments return false
--    without raising cast exceptions.
-- ---------------------------------------------------------------------------
create or replace function public.supplier_owns_product_storage_path(storage_path text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when coalesce((storage.foldername(storage_path))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.user_owns_company(((storage.foldername(storage_path))[1])::uuid)
      else false
    end;
$$;

revoke all on function public.supplier_owns_product_storage_path(text) from public;
revoke all on function public.supplier_owns_product_storage_path(text) from anon;
grant execute on function public.supplier_owns_product_storage_path(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) storage.objects RLS policies for the product-images bucket
--    Reuses is_supplier() (migration 006) for role gating and the safe path
--    helper above for ownership. Buyers and anon are denied all writes.
-- ---------------------------------------------------------------------------

-- SELECT: anyone may read product image objects (bucket is public-read).
drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- INSERT: only a supplier may upload into their own company folder.
drop policy if exists "Suppliers upload own product images" on storage.objects;
create policy "Suppliers upload own product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_supplier()
    and public.supplier_owns_product_storage_path(name)
  );

-- UPDATE: a supplier may modify only objects inside their own company folder.
drop policy if exists "Suppliers update own product images" on storage.objects;
create policy "Suppliers update own product images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_supplier()
    and public.supplier_owns_product_storage_path(name)
  )
  with check (
    bucket_id = 'product-images'
    and public.is_supplier()
    and public.supplier_owns_product_storage_path(name)
  );

-- DELETE: a supplier may delete only objects inside their own company folder.
drop policy if exists "Suppliers delete own product images" on storage.objects;
create policy "Suppliers delete own product images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_supplier()
    and public.supplier_owns_product_storage_path(name)
  );

-- ---------------------------------------------------------------------------
-- 4) public.public_products view (published products + safe supplier fields)
--    CREATE OR REPLACE preserves grants across reruns (no CASCADE).
-- ---------------------------------------------------------------------------
create or replace view public.public_products
with (security_invoker = false, security_barrier = true)
as
select
  p.id,
  p.name,
  p.category,
  p.description,
  p.country_of_origin,
  p.moq,
  p.packaging,
  p.lead_time,
  p.incoterms,
  p.hs_code,
  p.price,
  p.certifications,
  p.specifications,
  p.image_url,
  p.gallery,
  p.published_at,
  p.created_at,
  c.id            as company_id,
  c.company_name  as company_name,
  c.country       as company_country,
  c.business_type as business_type,
  case lower(trim(coalesce(c.verification_status, '')))
    when 'verified' then 'verified'
    when 'rejected' then 'rejected'
    when 'under_review' then 'under_review'
    when 'under-review' then 'under_review'
    else 'pending'
  end             as verification_status,
  c.year_established   as year_established,
  c.categories    as company_categories
from public.products p
join public.companies c on c.id = p.company_id
where p.status = 'published';

grant select on public.public_products to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) public.public_suppliers view (companies with >= 1 published product)
-- ---------------------------------------------------------------------------
create or replace view public.public_suppliers
with (security_invoker = false, security_barrier = true)
as
select
  c.id            as company_id,
  c.company_name  as company_name,
  c.country       as country,
  c.business_type as business_type,
  case lower(trim(coalesce(c.verification_status, '')))
    when 'verified' then 'verified'
    when 'rejected' then 'rejected'
    when 'under_review' then 'under_review'
    when 'under-review' then 'under_review'
    else 'pending'
  end             as verification_status,
  c.year_established   as year_established,
  c.categories    as categories
from public.companies c
where exists (
  select 1
  from public.products p
  where p.company_id = c.id
    and p.status = 'published'
);

grant select on public.public_suppliers to anon, authenticated;

commit;

-- Make the new bucket, policies, and views visible to PostgREST immediately.
notify pgrst, 'reload schema';
