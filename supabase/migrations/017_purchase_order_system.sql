-- Trade Grid Global: Purchase Order System (Module 3.1)
-- Release target: v0.4.0-purchase-orders
--
-- Extends Award (016). Does NOT redesign RFQ / quotation / award tables.
-- Additive only — do not edit migrations 001–016.
--
-- Locked decisions: AD-3.1-001 … AD-3.1-025
-- (docs/architecture/ARCHITECTURE_DECISIONS.md)
--
-- Pre-delivery: multi-table SQL and RLS fully qualify shared column names.
-- SECURITY DEFINER functions set search_path = public. Vars use v_ prefixes.
-- No completed status in 3.1. Commercial lock begins at issued.

begin;

-- ---------------------------------------------------------------------------
-- 1) Numbering sequence
-- ---------------------------------------------------------------------------
create sequence if not exists public.purchase_order_number_seq;

create or replace function public._next_purchase_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text;
  v_n bigint;
begin
  v_year := to_char((now() at time zone 'utc'), 'YYYY');
  v_n := nextval('public.purchase_order_number_seq');
  return format('TGG-PO-%s-%s', v_year, lpad(v_n::text, 6, '0'));
end;
$$;

revoke all on function public._next_purchase_order_number() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Tables
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  revision_no integer not null default 1 check (revision_no >= 1),

  buyer_company_id uuid not null references public.companies(id) on delete restrict,
  supplier_company_id uuid not null references public.companies(id) on delete restrict,
  award_id uuid not null references public.quotation_awards(id) on delete restrict,
  rfq_id uuid not null references public.rfqs(id) on delete restrict,
  thread_id uuid not null references public.quotation_threads(id) on delete restrict,
  source_offer_id uuid not null references public.quotation_offers(id) on delete restrict,

  status text not null default 'draft'
    check (status in ('draft', 'issued', 'accepted', 'rejected', 'cancelled')),

  -- Party snapshots (AD-3.1-004)
  buyer_company_name text not null default '',
  supplier_company_name text not null default '',
  buyer_country text not null default '',
  supplier_country text not null default '',
  buyer_address text not null default '',
  supplier_address text not null default '',
  buyer_tax_id text not null default '',
  supplier_tax_id text not null default '',
  buyer_contact_name text not null default '',
  buyer_contact_email text not null default '',
  supplier_contact_name text not null default '',
  supplier_contact_email text not null default '',

  -- Commercial snapshot (AD-3.1-003)
  product_name text not null default '',
  category text not null default '',
  currency text not null default 'USD',
  unit_price numeric(18, 6),
  price_unit text not null default '',
  total_price numeric(18, 6),
  quantity_value numeric(18, 6),
  quantity_unit text not null default '',
  moq_quantity numeric(18, 6),
  moq_unit text not null default '',
  incoterm text not null default '',
  payment_terms text not null default '',
  lead_time_min integer,
  lead_time_max integer,
  lead_time_unit text not null default 'days',
  target_country text not null default '',
  delivery_port text not null default '',
  packaging_requirement text not null default '',
  validity_until timestamptz,
  commercial_notes text not null default '',
  linked_product_id uuid references public.products(id) on delete set null,

  created_by uuid references auth.users(id) on delete set null,
  issued_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  rejected_by uuid references auth.users(id) on delete set null,
  cancelled_by uuid references auth.users(id) on delete set null,

  issued_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  reject_reason text,
  cancel_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists purchase_orders_one_nonterminal_per_award_idx
  on public.purchase_orders (award_id)
  where status in ('draft', 'issued', 'accepted');

create index if not exists purchase_orders_buyer_created_idx
  on public.purchase_orders (buyer_company_id, created_at desc);

create index if not exists purchase_orders_supplier_status_idx
  on public.purchase_orders (supplier_company_id, status);

create index if not exists purchase_orders_status_issued_idx
  on public.purchase_orders (status, issued_at desc);

create index if not exists purchase_orders_rfq_idx
  on public.purchase_orders (rfq_id);

create index if not exists purchase_orders_po_number_idx
  on public.purchase_orders (po_number);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  line_no integer not null check (line_no >= 1),
  product_name text not null default '',
  category text not null default '',
  description text not null default '',
  quantity_value numeric(18, 6),
  quantity_unit text not null default '',
  unit_price numeric(18, 6),
  price_unit text not null default '',
  line_total numeric(18, 6),
  currency text not null default 'USD',
  linked_product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_order_id, line_no)
);

create index if not exists purchase_order_items_po_idx
  on public.purchase_order_items (purchase_order_id, line_no);

create table if not exists public.purchase_order_events (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  event_type text not null,
  actor_type text not null
    check (actor_type in ('user', 'admin', 'system', 'ai')),
  actor_user_id uuid references auth.users(id) on delete set null,
  from_status text,
  to_status text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists purchase_order_events_po_idx
  on public.purchase_order_events (purchase_order_id, created_at desc);

create table if not exists public.purchase_order_documents (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  document_type text not null default 'other',
  file_name text not null,
  storage_path text not null,
  mime_type text not null default '',
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists purchase_order_documents_po_idx
  on public.purchase_order_documents (purchase_order_id, created_at desc);

revoke all on table public.purchase_orders from public;
revoke all on table public.purchase_order_items from public;
revoke all on table public.purchase_order_events from public;
revoke all on table public.purchase_order_documents from public;

grant select on table public.purchase_orders to authenticated;
grant select on table public.purchase_order_items to authenticated;
grant select on table public.purchase_order_events to authenticated;
grant select on table public.purchase_order_documents to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Append-only event protection
-- ---------------------------------------------------------------------------
create or replace function public._forbid_purchase_order_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'purchase_order_events are append-only';
end;
$$;

drop trigger if exists purchase_order_events_no_update on public.purchase_order_events;
create trigger purchase_order_events_no_update
  before update or delete on public.purchase_order_events
  for each row
  execute function public._forbid_purchase_order_event_mutation();

-- ---------------------------------------------------------------------------
-- 4) Helpers
-- ---------------------------------------------------------------------------
create or replace function public._append_purchase_order_event(
  p_purchase_order_id uuid,
  p_event_type text,
  p_actor_type text,
  p_actor_user_id uuid,
  p_from_status text default null,
  p_to_status text default null,
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.purchase_order_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created public.purchase_order_events;
begin
  insert into public.purchase_order_events (
    purchase_order_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    message,
    metadata
  )
  values (
    p_purchase_order_id,
    p_event_type,
    p_actor_type,
    p_actor_user_id,
    p_from_status,
    p_to_status,
    p_message,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_created;

  return v_created;
end;
$$;

revoke all on function public._append_purchase_order_event(
  uuid, text, text, uuid, text, text, text, jsonb
) from public, anon, authenticated;

create or replace function public._sync_purchase_order_primary_item(
  p_purchase_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
begin
  select * into v_po
  from public.purchase_orders po
  where po.id = p_purchase_order_id;

  if not found then
    return;
  end if;

  update public.purchase_order_items poi
  set product_name = v_po.product_name,
      category = v_po.category,
      quantity_value = v_po.quantity_value,
      quantity_unit = v_po.quantity_unit,
      unit_price = v_po.unit_price,
      price_unit = v_po.price_unit,
      line_total = v_po.total_price,
      currency = v_po.currency,
      linked_product_id = v_po.linked_product_id,
      updated_at = now()
  where poi.purchase_order_id = p_purchase_order_id
    and poi.line_no = 1;

  if not found then
    insert into public.purchase_order_items (
      purchase_order_id,
      line_no,
      product_name,
      category,
      description,
      quantity_value,
      quantity_unit,
      unit_price,
      price_unit,
      line_total,
      currency,
      linked_product_id
    )
    values (
      p_purchase_order_id,
      1,
      v_po.product_name,
      v_po.category,
      '',
      v_po.quantity_value,
      v_po.quantity_unit,
      v_po.unit_price,
      v_po.price_unit,
      v_po.total_price,
      v_po.currency,
      v_po.linked_product_id
    );
  end if;
end;
$$;

revoke all on function public._sync_purchase_order_primary_item(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) RLS (SELECT only — mutations via RPCs)
-- ---------------------------------------------------------------------------
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.purchase_order_events enable row level security;
alter table public.purchase_order_documents enable row level security;

drop policy if exists "Buyers read own purchase orders" on public.purchase_orders;
create policy "Buyers read own purchase orders"
  on public.purchase_orders for select
  using (public.user_owns_company(purchase_orders.buyer_company_id));

drop policy if exists "Suppliers read issued purchase orders" on public.purchase_orders;
create policy "Suppliers read issued purchase orders"
  on public.purchase_orders for select
  using (
    public.user_owns_company(purchase_orders.supplier_company_id)
    and purchase_orders.status in ('issued', 'accepted', 'rejected', 'cancelled')
  );

drop policy if exists "Admins read all purchase orders" on public.purchase_orders;
create policy "Admins read all purchase orders"
  on public.purchase_orders for select
  using (public.is_admin());

drop policy if exists "Buyers read own PO items" on public.purchase_order_items;
create policy "Buyers read own PO items"
  on public.purchase_order_items for select
  using (
    exists (
      select 1
      from public.purchase_orders po
      where po.id = purchase_order_items.purchase_order_id
        and public.user_owns_company(po.buyer_company_id)
    )
  );

drop policy if exists "Suppliers read issued PO items" on public.purchase_order_items;
create policy "Suppliers read issued PO items"
  on public.purchase_order_items for select
  using (
    exists (
      select 1
      from public.purchase_orders po
      where po.id = purchase_order_items.purchase_order_id
        and public.user_owns_company(po.supplier_company_id)
        and po.status in ('issued', 'accepted', 'rejected', 'cancelled')
    )
  );

drop policy if exists "Admins read all PO items" on public.purchase_order_items;
create policy "Admins read all PO items"
  on public.purchase_order_items for select
  using (public.is_admin());

drop policy if exists "Buyers read own PO events" on public.purchase_order_events;
create policy "Buyers read own PO events"
  on public.purchase_order_events for select
  using (
    exists (
      select 1
      from public.purchase_orders po
      where po.id = purchase_order_events.purchase_order_id
        and public.user_owns_company(po.buyer_company_id)
    )
  );

drop policy if exists "Suppliers read issued PO events" on public.purchase_order_events;
create policy "Suppliers read issued PO events"
  on public.purchase_order_events for select
  using (
    exists (
      select 1
      from public.purchase_orders po
      where po.id = purchase_order_events.purchase_order_id
        and public.user_owns_company(po.supplier_company_id)
        and po.status in ('issued', 'accepted', 'rejected', 'cancelled')
    )
  );

drop policy if exists "Admins read all PO events" on public.purchase_order_events;
create policy "Admins read all PO events"
  on public.purchase_order_events for select
  using (public.is_admin());

drop policy if exists "Buyers read own PO documents" on public.purchase_order_documents;
create policy "Buyers read own PO documents"
  on public.purchase_order_documents for select
  using (
    exists (
      select 1
      from public.purchase_orders po
      where po.id = purchase_order_documents.purchase_order_id
        and public.user_owns_company(po.buyer_company_id)
    )
  );

drop policy if exists "Suppliers read issued PO documents" on public.purchase_order_documents;
create policy "Suppliers read issued PO documents"
  on public.purchase_order_documents for select
  using (
    exists (
      select 1
      from public.purchase_orders po
      where po.id = purchase_order_documents.purchase_order_id
        and public.user_owns_company(po.supplier_company_id)
        and po.status in ('issued', 'accepted', 'rejected', 'cancelled')
    )
  );

drop policy if exists "Admins read all PO documents" on public.purchase_order_documents;
create policy "Admins read all PO documents"
  on public.purchase_order_documents for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6) Storage (private) — path: pos/<buyer_company_id>/<po_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'purchase-order-docs',
  'purchase-order-docs',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.buyer_owns_purchase_order_storage_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parts text[];
  v_company_uuid uuid;
  v_po_uuid uuid;
begin
  v_parts := storage.foldername(object_name);
  if array_length(v_parts, 1) is null or array_length(v_parts, 1) < 3 then
    return false;
  end if;
  if v_parts[1] is distinct from 'pos' then
    return false;
  end if;
  begin
    v_company_uuid := v_parts[2]::uuid;
    v_po_uuid := v_parts[3]::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1
    from public.purchase_orders po
    where po.id = v_po_uuid
      and po.buyer_company_id = v_company_uuid
      and public.user_owns_company(po.buyer_company_id)
  );
end;
$$;

revoke all on function public.buyer_owns_purchase_order_storage_path(text) from public;
grant execute on function public.buyer_owns_purchase_order_storage_path(text) to authenticated;

create or replace function public.can_read_purchase_order_storage_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parts text[];
  v_po_uuid uuid;
begin
  v_parts := storage.foldername(object_name);
  if array_length(v_parts, 1) is null or array_length(v_parts, 1) < 3 then
    return false;
  end if;
  if v_parts[1] is distinct from 'pos' then
    return false;
  end if;
  begin
    v_po_uuid := v_parts[3]::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1
    from public.purchase_orders po
    where po.id = v_po_uuid
      and (
        public.user_owns_company(po.buyer_company_id)
        or (
          public.user_owns_company(po.supplier_company_id)
          and po.status in ('issued', 'accepted', 'rejected', 'cancelled')
        )
        or public.is_admin()
      )
  );
end;
$$;

revoke all on function public.can_read_purchase_order_storage_path(text) from public;
grant execute on function public.can_read_purchase_order_storage_path(text) to authenticated;

drop policy if exists "Buyers upload purchase order docs" on storage.objects;
create policy "Buyers upload purchase order docs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'purchase-order-docs'
    and public.buyer_owns_purchase_order_storage_path(name)
  );

drop policy if exists "Buyers update purchase order docs" on storage.objects;
create policy "Buyers update purchase order docs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'purchase-order-docs'
    and public.buyer_owns_purchase_order_storage_path(name)
  )
  with check (
    bucket_id = 'purchase-order-docs'
    and public.buyer_owns_purchase_order_storage_path(name)
  );

drop policy if exists "Buyers delete purchase order docs" on storage.objects;
create policy "Buyers delete purchase order docs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'purchase-order-docs'
    and public.buyer_owns_purchase_order_storage_path(name)
  );

drop policy if exists "Parties read purchase order docs" on storage.objects;
create policy "Parties read purchase order docs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'purchase-order-docs'
    and public.can_read_purchase_order_storage_path(name)
  );

-- ---------------------------------------------------------------------------
-- 7) RPCs
-- ---------------------------------------------------------------------------
create or replace function public.create_purchase_order_draft(
  p_award_id uuid,
  p_payment_terms text default null,
  p_notes text default null
)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_award public.quotation_awards;
  v_rfq public.rfqs;
  v_thread public.quotation_threads;
  v_offer public.quotation_offers;
  v_buyer public.companies;
  v_supplier public.companies;
  v_buyer_profile public.profiles;
  v_supplier_profile public.profiles;
  v_po public.purchase_orders;
  v_total numeric(18, 6);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can create purchase orders';
  end if;

  select * into v_award
  from public.quotation_awards a
  where a.id = p_award_id
  for update;

  if not found then
    raise exception 'Award not found';
  end if;

  if v_award.status <> 'active' then
    raise exception 'Purchase orders require an active award';
  end if;

  select * into v_rfq
  from public.rfqs r
  where r.id = v_award.rfq_id
  for update;

  if not public.user_owns_company(v_rfq.buyer_company_id) then
    raise exception 'You cannot create a purchase order for an RFQ you do not own';
  end if;

  if v_rfq.status <> 'awarded' then
    raise exception 'RFQ must be awarded before creating a purchase order';
  end if;

  if exists (
    select 1
    from public.purchase_orders po
    where po.award_id = p_award_id
      and po.status in ('draft', 'issued', 'accepted')
  ) then
    raise exception 'An active purchase order already exists for this award';
  end if;

  select * into v_thread
  from public.quotation_threads t
  where t.id = v_award.thread_id;

  if not found then
    raise exception 'Quotation thread not found';
  end if;

  select * into v_offer
  from public.quotation_offers o
  where o.id = v_award.offer_id;

  if not found then
    raise exception 'Awarded offer not found';
  end if;

  select * into v_buyer from public.companies c where c.id = v_rfq.buyer_company_id;
  select * into v_supplier from public.companies c where c.id = v_award.supplier_company_id;
  select * into v_buyer_profile from public.profiles p where p.id = v_buyer.user_id;
  select * into v_supplier_profile from public.profiles p where p.id = v_supplier.user_id;

  v_total := v_offer.total_price;
  if v_total is null
     and v_offer.unit_price is not null
     and v_rfq.quantity_value is not null then
    v_total := round(v_offer.unit_price * v_rfq.quantity_value, 6);
  end if;

  insert into public.purchase_orders (
    po_number,
    revision_no,
    buyer_company_id,
    supplier_company_id,
    award_id,
    rfq_id,
    thread_id,
    source_offer_id,
    status,
    buyer_company_name,
    supplier_company_name,
    buyer_country,
    supplier_country,
    buyer_address,
    supplier_address,
    buyer_tax_id,
    supplier_tax_id,
    buyer_contact_name,
    buyer_contact_email,
    supplier_contact_name,
    supplier_contact_email,
    product_name,
    category,
    currency,
    unit_price,
    price_unit,
    total_price,
    quantity_value,
    quantity_unit,
    moq_quantity,
    moq_unit,
    incoterm,
    payment_terms,
    lead_time_min,
    lead_time_max,
    lead_time_unit,
    target_country,
    delivery_port,
    packaging_requirement,
    validity_until,
    commercial_notes,
    linked_product_id,
    created_by
  )
  values (
    public._next_purchase_order_number(),
    1,
    v_rfq.buyer_company_id,
    v_award.supplier_company_id,
    v_award.id,
    v_rfq.id,
    v_thread.id,
    v_offer.id,
    'draft',
    coalesce(v_buyer.company_name, ''),
    coalesce(v_supplier.company_name, ''),
    coalesce(v_buyer.country, ''),
    coalesce(v_supplier.country, ''),
    '',
    '',
    '',
    '',
    coalesce(v_buyer_profile.full_name, ''),
    coalesce(v_buyer_profile.email, ''),
    coalesce(v_supplier_profile.full_name, ''),
    coalesce(v_supplier_profile.email, ''),
    coalesce(v_rfq.product_name, ''),
    coalesce(v_rfq.category, ''),
    coalesce(nullif(btrim(v_offer.currency), ''), 'USD'),
    v_offer.unit_price,
    coalesce(v_offer.price_unit, ''),
    v_total,
    v_rfq.quantity_value,
    coalesce(v_rfq.quantity_unit, ''),
    v_offer.moq_quantity,
    coalesce(v_offer.moq_unit, ''),
    coalesce(v_offer.incoterm, ''),
    coalesce(nullif(btrim(coalesce(p_payment_terms, '')), ''), ''),
    v_offer.lead_time_min,
    v_offer.lead_time_max,
    coalesce(nullif(btrim(v_offer.lead_time_unit), ''), 'days'),
    coalesce(v_rfq.target_country, ''),
    coalesce(v_rfq.delivery_port, ''),
    coalesce(v_rfq.packaging_requirement, ''),
    v_offer.validity_until,
    coalesce(nullif(btrim(coalesce(p_notes, '')), ''), coalesce(v_offer.notes, '')),
    coalesce(v_offer.linked_product_id, v_rfq.linked_product_id),
    auth.uid()
  )
  returning * into v_po;

  perform public._sync_purchase_order_primary_item(v_po.id);

  perform public._append_purchase_order_event(
    v_po.id,
    'purchase_order.created',
    'user',
    auth.uid(),
    null,
    'draft',
    format('Draft purchase order %s created from award', v_po.po_number),
    jsonb_build_object(
      'award_id', v_award.id,
      'offer_id', v_offer.id,
      'rfq_id', v_rfq.id
    )
  );

  perform public._create_system_notification(
    v_buyer.user_id,
    'purchase_order.created',
    'Purchase order draft created',
    format('Draft %s is ready to review and issue.', v_po.po_number),
    'purchase_order',
    v_po.id,
    format('/dashboard/buyer/orders/%s', v_po.id),
    jsonb_build_object('po_number', v_po.po_number, 'award_id', v_award.id),
    'normal'
  );

  return v_po;
end;
$$;

revoke all on function public.create_purchase_order_draft(uuid, text, text) from public;
grant execute on function public.create_purchase_order_draft(uuid, text, text) to authenticated;

create or replace function public.update_purchase_order_draft(
  p_purchase_order_id uuid,
  p_payment_terms text default null,
  p_notes text default null,
  p_quantity_value numeric default null,
  p_quantity_unit text default null,
  p_unit_price numeric default null,
  p_total_price numeric default null,
  p_incoterm text default null,
  p_lead_time_min integer default null,
  p_lead_time_max integer default null,
  p_lead_time_unit text default null,
  p_delivery_port text default null,
  p_target_country text default null
)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can update purchase order drafts';
  end if;

  select * into v_po
  from public.purchase_orders po
  where po.id = p_purchase_order_id
  for update;

  if not found then
    raise exception 'Purchase order not found';
  end if;

  if not public.user_owns_company(v_po.buyer_company_id) then
    raise exception 'You cannot update a purchase order you do not own';
  end if;

  if v_po.status <> 'draft' then
    raise exception 'Only draft purchase orders can be updated';
  end if;

  update public.purchase_orders po
  set payment_terms = coalesce(p_payment_terms, po.payment_terms),
      commercial_notes = coalesce(p_notes, po.commercial_notes),
      quantity_value = coalesce(p_quantity_value, po.quantity_value),
      quantity_unit = coalesce(p_quantity_unit, po.quantity_unit),
      unit_price = coalesce(p_unit_price, po.unit_price),
      total_price = coalesce(p_total_price, po.total_price),
      incoterm = coalesce(p_incoterm, po.incoterm),
      lead_time_min = coalesce(p_lead_time_min, po.lead_time_min),
      lead_time_max = coalesce(p_lead_time_max, po.lead_time_max),
      lead_time_unit = coalesce(nullif(btrim(coalesce(p_lead_time_unit, '')), ''), po.lead_time_unit),
      delivery_port = coalesce(p_delivery_port, po.delivery_port),
      target_country = coalesce(p_target_country, po.target_country),
      revision_no = po.revision_no + 1,
      updated_at = now()
  where po.id = p_purchase_order_id
  returning * into v_po;

  perform public._sync_purchase_order_primary_item(v_po.id);

  perform public._append_purchase_order_event(
    v_po.id,
    'purchase_order.updated',
    'user',
    auth.uid(),
    'draft',
    'draft',
    format('Draft purchase order %s updated (revision %s)', v_po.po_number, v_po.revision_no),
    jsonb_build_object('revision_no', v_po.revision_no)
  );

  return v_po;
end;
$$;

revoke all on function public.update_purchase_order_draft(
  uuid, text, text, numeric, text, numeric, numeric, text, integer, integer, text, text, text
) from public;
grant execute on function public.update_purchase_order_draft(
  uuid, text, text, numeric, text, numeric, numeric, text, integer, integer, text, text, text
) to authenticated;

create or replace function public.issue_purchase_order(
  p_purchase_order_id uuid
)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
  v_award public.quotation_awards;
  v_supplier public.companies;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can issue purchase orders';
  end if;

  select * into v_po
  from public.purchase_orders po
  where po.id = p_purchase_order_id
  for update;

  if not found then
    raise exception 'Purchase order not found';
  end if;

  if not public.user_owns_company(v_po.buyer_company_id) then
    raise exception 'You cannot issue a purchase order you do not own';
  end if;

  if v_po.status <> 'draft' then
    raise exception 'Only draft purchase orders can be issued';
  end if;

  select * into v_award
  from public.quotation_awards a
  where a.id = v_po.award_id
  for update;

  if not found or v_award.status <> 'active' then
    raise exception 'Cannot issue purchase order: award is not active';
  end if;

  update public.purchase_orders po
  set status = 'issued',
      issued_by = auth.uid(),
      issued_at = now(),
      updated_at = now()
  where po.id = p_purchase_order_id
  returning * into v_po;

  perform public._append_purchase_order_event(
    v_po.id,
    'purchase_order.issued',
    'user',
    auth.uid(),
    'draft',
    'issued',
    format('Purchase order %s issued to supplier', v_po.po_number),
    jsonb_build_object('award_id', v_po.award_id)
  );

  select * into v_supplier
  from public.companies c
  where c.id = v_po.supplier_company_id;

  perform public._create_system_notification(
    v_supplier.user_id,
    'purchase_order.issued',
    'Purchase order received',
    format(
      'Buyer issued purchase order %s for %s. Please review and respond.',
      v_po.po_number,
      v_po.product_name
    ),
    'purchase_order',
    v_po.id,
    format('/dashboard/supplier/orders/%s', v_po.id),
    jsonb_build_object('po_number', v_po.po_number, 'award_id', v_po.award_id),
    'high'
  );

  return v_po;
end;
$$;

revoke all on function public.issue_purchase_order(uuid) from public;
grant execute on function public.issue_purchase_order(uuid) to authenticated;

create or replace function public.accept_purchase_order(
  p_purchase_order_id uuid
)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
  v_buyer public.companies;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_supplier() then
    raise exception 'Only suppliers can accept purchase orders';
  end if;

  select * into v_po
  from public.purchase_orders po
  where po.id = p_purchase_order_id
  for update;

  if not found then
    raise exception 'Purchase order not found';
  end if;

  if not public.user_owns_company(v_po.supplier_company_id) then
    raise exception 'You cannot accept a purchase order for another company';
  end if;

  if v_po.status <> 'issued' then
    raise exception 'Only issued purchase orders can be accepted';
  end if;

  update public.purchase_orders po
  set status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now(),
      updated_at = now()
  where po.id = p_purchase_order_id
  returning * into v_po;

  perform public._append_purchase_order_event(
    v_po.id,
    'purchase_order.accepted',
    'user',
    auth.uid(),
    'issued',
    'accepted',
    format('Purchase order %s accepted by supplier', v_po.po_number),
    jsonb_build_object('award_id', v_po.award_id)
  );

  select * into v_buyer
  from public.companies c
  where c.id = v_po.buyer_company_id;

  perform public._create_system_notification(
    v_buyer.user_id,
    'purchase_order.accepted',
    'Purchase order accepted',
    format('Supplier accepted purchase order %s.', v_po.po_number),
    'purchase_order',
    v_po.id,
    format('/dashboard/buyer/orders/%s', v_po.id),
    jsonb_build_object('po_number', v_po.po_number, 'award_id', v_po.award_id),
    'high'
  );

  return v_po;
end;
$$;

revoke all on function public.accept_purchase_order(uuid) from public;
grant execute on function public.accept_purchase_order(uuid) to authenticated;

create or replace function public.reject_purchase_order(
  p_purchase_order_id uuid,
  p_reason text
)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
  v_buyer public.companies;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_supplier() then
    raise exception 'Only suppliers can reject purchase orders';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'A rejection reason is required';
  end if;

  select * into v_po
  from public.purchase_orders po
  where po.id = p_purchase_order_id
  for update;

  if not found then
    raise exception 'Purchase order not found';
  end if;

  if not public.user_owns_company(v_po.supplier_company_id) then
    raise exception 'You cannot reject a purchase order for another company';
  end if;

  if v_po.status <> 'issued' then
    raise exception 'Only issued purchase orders can be rejected';
  end if;

  update public.purchase_orders po
  set status = 'rejected',
      rejected_by = auth.uid(),
      rejected_at = now(),
      reject_reason = v_reason,
      updated_at = now()
  where po.id = p_purchase_order_id
  returning * into v_po;

  perform public._append_purchase_order_event(
    v_po.id,
    'purchase_order.rejected',
    'user',
    auth.uid(),
    'issued',
    'rejected',
    v_reason,
    jsonb_build_object('award_id', v_po.award_id)
  );

  select * into v_buyer
  from public.companies c
  where c.id = v_po.buyer_company_id;

  perform public._create_system_notification(
    v_buyer.user_id,
    'purchase_order.rejected',
    'Purchase order rejected',
    format('Supplier rejected purchase order %s.', v_po.po_number),
    'purchase_order',
    v_po.id,
    format('/dashboard/buyer/orders/%s', v_po.id),
    jsonb_build_object(
      'po_number', v_po.po_number,
      'award_id', v_po.award_id,
      'reason', v_reason
    ),
    'high'
  );

  return v_po;
end;
$$;

revoke all on function public.reject_purchase_order(uuid, text) from public;
grant execute on function public.reject_purchase_order(uuid, text) to authenticated;

create or replace function public.cancel_purchase_order(
  p_purchase_order_id uuid,
  p_reason text default null
)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
  v_supplier public.companies;
  v_from text;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can cancel purchase orders';
  end if;

  select * into v_po
  from public.purchase_orders po
  where po.id = p_purchase_order_id
  for update;

  if not found then
    raise exception 'Purchase order not found';
  end if;

  if not public.user_owns_company(v_po.buyer_company_id) then
    raise exception 'You cannot cancel a purchase order you do not own';
  end if;

  if v_po.status not in ('draft', 'issued') then
    raise exception 'Only draft or issued purchase orders can be cancelled';
  end if;

  v_from := v_po.status;
  v_reason := nullif(btrim(coalesce(p_reason, '')), '');

  update public.purchase_orders po
  set status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = now(),
      cancel_reason = v_reason,
      updated_at = now()
  where po.id = p_purchase_order_id
  returning * into v_po;

  perform public._append_purchase_order_event(
    v_po.id,
    'purchase_order.cancelled',
    'user',
    auth.uid(),
    v_from,
    'cancelled',
    coalesce(v_reason, 'Purchase order cancelled'),
    jsonb_build_object('award_id', v_po.award_id)
  );

  if v_from = 'issued' then
    select * into v_supplier
    from public.companies c
    where c.id = v_po.supplier_company_id;

    perform public._create_system_notification(
      v_supplier.user_id,
      'purchase_order.cancelled',
      'Purchase order cancelled',
      format('Buyer cancelled purchase order %s.', v_po.po_number),
      'purchase_order',
      v_po.id,
      format('/dashboard/supplier/orders/%s', v_po.id),
      jsonb_build_object('po_number', v_po.po_number, 'award_id', v_po.award_id),
      'high'
    );
  end if;

  return v_po;
end;
$$;

revoke all on function public.cancel_purchase_order(uuid, text) from public;
grant execute on function public.cancel_purchase_order(uuid, text) to authenticated;

create or replace function public.get_purchase_order(
  p_purchase_order_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_po
  from public.purchase_orders po
  where po.id = p_purchase_order_id;

  if not found then
    return null;
  end if;

  if not (
    public.user_owns_company(v_po.buyer_company_id)
    or (
      public.user_owns_company(v_po.supplier_company_id)
      and v_po.status in ('issued', 'accepted', 'rejected', 'cancelled')
    )
    or public.is_admin()
  ) then
    raise exception 'Purchase order not found';
  end if;

  select jsonb_build_object(
    'purchase_order', to_jsonb(v_po),
    'items', coalesce(
      (
        select jsonb_agg(to_jsonb(poi) order by poi.line_no)
        from public.purchase_order_items poi
        where poi.purchase_order_id = v_po.id
      ),
      '[]'::jsonb
    ),
    'events', coalesce(
      (
        select jsonb_agg(to_jsonb(poe) order by poe.created_at desc)
        from public.purchase_order_events poe
        where poe.purchase_order_id = v_po.id
      ),
      '[]'::jsonb
    ),
    'documents', coalesce(
      (
        select jsonb_agg(to_jsonb(pod) order by pod.created_at desc)
        from public.purchase_order_documents pod
        where pod.purchase_order_id = v_po.id
      ),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_purchase_order(uuid) from public;
grant execute on function public.get_purchase_order(uuid) to authenticated;

create or replace function public.list_purchase_orders(
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_offset integer;
  v_status text;
  v_rows jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset := greatest(0, coalesce(p_offset, 0));
  v_status := nullif(btrim(coalesce(p_status, '')), '');

  if v_status is not null
     and v_status not in ('draft', 'issued', 'accepted', 'rejected', 'cancelled') then
    raise exception 'Invalid purchase order status filter';
  end if;

  if public.is_buyer() then
    select coalesce(jsonb_agg(to_jsonb(po) order by po.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select po.*
      from public.purchase_orders po
      where public.user_owns_company(po.buyer_company_id)
        and (v_status is null or po.status = v_status)
      order by po.created_at desc
      limit v_limit
      offset v_offset
    ) po;
  elsif public.is_supplier() then
    select coalesce(jsonb_agg(to_jsonb(po) order by po.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select po.*
      from public.purchase_orders po
      where public.user_owns_company(po.supplier_company_id)
        and po.status in ('issued', 'accepted', 'rejected', 'cancelled')
        and (v_status is null or po.status = v_status)
      order by po.created_at desc
      limit v_limit
      offset v_offset
    ) po;
  elsif public.is_admin() then
    select coalesce(jsonb_agg(to_jsonb(po) order by po.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select po.*
      from public.purchase_orders po
      where (v_status is null or po.status = v_status)
      order by po.created_at desc
      limit v_limit
      offset v_offset
    ) po;
  else
    raise exception 'Unauthorized';
  end if;

  return jsonb_build_object(
    'rows', coalesce(v_rows, '[]'::jsonb),
    'limit', v_limit,
    'offset', v_offset
  );
end;
$$;

revoke all on function public.list_purchase_orders(text, integer, integer) from public;
grant execute on function public.list_purchase_orders(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Extend revoke_award (AD-3.1-013) — same signature, additive body replace
-- ---------------------------------------------------------------------------
create or replace function public.revoke_award(
  p_award_id uuid,
  p_reason text default null
)
returns public.quotation_awards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_award public.quotation_awards;
  v_rfq public.rfqs;
  v_draft public.purchase_orders;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can revoke awards';
  end if;

  select * into v_award
  from public.quotation_awards a
  where a.id = p_award_id
  for update;

  if not found then
    raise exception 'Award not found';
  end if;

  select * into v_rfq from public.rfqs r where r.id = v_award.rfq_id for update;

  if not public.user_owns_company(v_rfq.buyer_company_id) then
    raise exception 'You cannot revoke an award on an RFQ you do not own';
  end if;

  if v_award.status <> 'active' then
    raise exception 'Award is not active';
  end if;

  if exists (
    select 1
    from public.purchase_orders po
    where po.award_id = p_award_id
      and po.status in ('issued', 'accepted')
  ) then
    raise exception
      'Cannot revoke award while an issued or accepted purchase order exists. Cancel the issued PO first.';
  end if;

  for v_draft in
    select po.*
    from public.purchase_orders po
    where po.award_id = p_award_id
      and po.status = 'draft'
    for update
  loop
    update public.purchase_orders po
    set status = 'cancelled',
        cancelled_by = auth.uid(),
        cancelled_at = now(),
        cancel_reason = 'Award revoked',
        updated_at = now()
    where po.id = v_draft.id;

    perform public._append_purchase_order_event(
      v_draft.id,
      'purchase_order.cancelled',
      'system',
      auth.uid(),
      'draft',
      'cancelled',
      'Draft purchase order cancelled because the award was revoked',
      jsonb_build_object('award_id', p_award_id, 'reason', 'award_revoked')
    );
  end loop;

  update public.quotation_awards a
  set status = 'revoked',
      revoked_at = now(),
      revoke_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where a.id = p_award_id
  returning * into v_award;

  update public.rfqs r
  set status = 'quoted',
      updated_at = now()
  where r.id = v_award.rfq_id;

  update public.quotation_offers o
  set status = 'submitted',
      updated_at = now()
  where o.id = v_award.offer_id
    and o.status = 'awarded';

  update public.quotation_threads t
  set status = 'active',
      awarded_offer_id = null,
      updated_at = now()
  where t.id = v_award.thread_id;

  update public.quotation_offers o
  set status = 'submitted',
      updated_at = now()
  from public.quotation_threads t
  where o.thread_id = t.id
    and t.rfq_id = v_award.rfq_id
    and o.status = 'not_selected';

  update public.quotation_threads t
  set status = 'active',
      updated_at = now()
  where t.rfq_id = v_award.rfq_id
    and t.id is distinct from v_award.thread_id
    and t.status = 'closed'
    and exists (
      select 1
      from public.quotation_offers o
      where o.thread_id = t.id
        and o.status = 'submitted'
    );

  perform public._append_award_event(
    v_award.id,
    'award.revoked',
    'user',
    auth.uid(),
    'active',
    'revoked',
    coalesce(v_award.revoke_reason, 'Award revoked'),
    '{}'::jsonb
  );

  perform public._append_rfq_event(
    v_award.rfq_id,
    'rfq.award_revoked',
    'user',
    auth.uid(),
    'awarded',
    'quoted',
    'Award revoked; RFQ reopened for quotations',
    jsonb_build_object('award_id', v_award.id)
  );

  return v_award;
end;
$$;

revoke all on function public.revoke_award(uuid, text) from public;
grant execute on function public.revoke_award(uuid, text) to authenticated;

commit;
