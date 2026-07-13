-- Trade Grid Global: Product Lifecycle UX — restore, reopen, archive hardening
--
-- This migration:
--   * hardens public.archive_product (migration 006) with explicit is_supplier()
--   * adds restore_archived_product              archived -> draft
--   * adds reopen_published_product_for_editing  published -> draft
--
-- This migration is:
--   * additive/hardening - CREATE OR REPLACE on archive_product; two new RPCs
--   * non-destructive    - does not modify migrations 001-009
--   * fail-closed        - SECURITY DEFINER, fixed search_path, role + ownership
--
-- Restored/reopened products return to draft and are NOT publicly visible
-- until admin approves again (public_products filters status = 'published').

begin;

-- ---------------------------------------------------------------------------
-- 1) Harden existing archive_product (migration 006)
--    Explicit supplier role required; ownership and source-status unchanged.
-- ---------------------------------------------------------------------------
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

  if not public.is_supplier() then
    raise exception 'Only suppliers can archive products';
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
revoke all on function public.archive_product(uuid) from anon;
grant execute on function public.archive_product(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) restore_archived_product: archived -> draft
-- ---------------------------------------------------------------------------
create or replace function public.restore_archived_product(product_id uuid)
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

  if not public.is_supplier() then
    raise exception 'Only suppliers can restore archived products';
  end if;

  if not public.user_owns_company(prod.company_id) then
    raise exception 'You cannot restore a product you do not own';
  end if;

  if prod.status <> 'archived' then
    raise exception 'Only archived products can be restored to draft';
  end if;

  update public.products
     set status = 'draft',
         published_at = null,
         rejection_reason = null,
         updated_at = now()
   where id = product_id
   returning * into prod;

  return prod;
end;
$$;

revoke all on function public.restore_archived_product(uuid) from public;
revoke all on function public.restore_archived_product(uuid) from anon;
grant execute on function public.restore_archived_product(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) reopen_published_product_for_editing: published -> draft
-- ---------------------------------------------------------------------------
create or replace function public.reopen_published_product_for_editing(product_id uuid)
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

  if not public.is_supplier() then
    raise exception 'Only suppliers can reopen published products for editing';
  end if;

  if not public.user_owns_company(prod.company_id) then
    raise exception 'You cannot reopen a product you do not own';
  end if;

  if prod.status <> 'published' then
    raise exception 'Only published products can be reopened for editing';
  end if;

  update public.products
     set status = 'draft',
         published_at = null,
         rejection_reason = null,
         updated_at = now()
   where id = product_id
   returning * into prod;

  return prod;
end;
$$;

revoke all on function public.reopen_published_product_for_editing(uuid) from public;
revoke all on function public.reopen_published_product_for_editing(uuid) from anon;
grant execute on function public.reopen_published_product_for_editing(uuid) to authenticated;

commit;

notify pgrst, 'reload schema';
