-- Trade Grid Global: Product System Phase 2.5
-- Structured international trade data (additive, backward compatible).
--
-- This migration is:
--   * additive        - adds nullable structured columns; legacy text columns
--                       (moq, lead_time, incoterms, price) are preserved
--   * idempotent      - uses add column if not exists; view create or replace
--   * backward compatible - existing products with only legacy text continue
--                           to render; no data rewrites
--   * non-destructive - no drops, no column type changes, no RLS weakening
--
-- The application dual-writes legacy text (for display compatibility) and
-- structured columns (for future filtering, RFQ matching, and analytics).
-- Migrations 001-008 are NOT modified.

begin;

-- ---------------------------------------------------------------------------
-- 1) structured trade columns on public.products
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists moq_quantity numeric,
  add column if not exists moq_unit text,
  add column if not exists lead_time_min integer,
  add column if not exists lead_time_max integer,
  add column if not exists lead_time_unit text,
  add column if not exists incoterms_codes text[] not null default '{}',
  add column if not exists price_amount numeric,
  add column if not exists price_currency text,
  add column if not exists price_unit text,
  add column if not exists price_incoterm text;

-- Future filter / analytics indexes (safe on empty/nullable columns).
create index if not exists products_moq_quantity_idx
  on public.products(moq_quantity)
  where moq_quantity is not null;

create index if not exists products_price_amount_idx
  on public.products(price_amount)
  where price_amount is not null;

create index if not exists products_incoterms_codes_idx
  on public.products using gin(incoterms_codes);

-- ---------------------------------------------------------------------------
-- 2) public.public_products view — append structured columns AFTER the full
--    migration-008 column list. CREATE OR REPLACE VIEW requires identical
--    existing column names/positions; new columns may only be appended.
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
  c.categories    as company_categories,
  p.moq_quantity,
  p.moq_unit,
  p.lead_time_min,
  p.lead_time_max,
  p.lead_time_unit,
  p.incoterms_codes,
  p.price_amount,
  p.price_currency,
  p.price_unit,
  p.price_incoterm
from public.products p
join public.companies c on c.id = p.company_id
where p.status = 'published';

grant select on public.public_products to anon, authenticated;

commit;

notify pgrst, 'reload schema';
