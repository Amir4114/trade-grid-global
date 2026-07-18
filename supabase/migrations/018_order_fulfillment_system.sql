-- Trade Grid Global: Order Fulfillment System (Module 3.2 Phase A)
-- Release target: v0.5.0-order-lifecycle
--
-- Operational execution AFTER an accepted Purchase Order.
-- Does NOT redesign RFQ / quotation / award / PO commercial snapshots.
-- Locked decisions: AD-3.2-001 … AD-3.2-028
--
-- Additive only — do not edit migrations 001–017.
-- Pre-delivery: fully qualify shared column names. SECURITY DEFINER
-- functions set search_path = public. Vars use v_ / params p_.

begin;

-- ---------------------------------------------------------------------------
-- 1) Numbering
-- ---------------------------------------------------------------------------
create sequence if not exists public.fulfillment_order_number_seq;

create or replace function public._next_fulfillment_order_number()
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
  v_n := nextval('public.fulfillment_order_number_seq');
  return format('TGG-FF-%s-%s', v_year, lpad(v_n::text, 6, '0'));
end;
$$;

revoke all on function public._next_fulfillment_order_number() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Tables
-- ---------------------------------------------------------------------------
create table if not exists public.fulfillment_orders (
  id uuid primary key default gen_random_uuid(),
  fulfillment_number text not null unique,
  purchase_order_id uuid not null unique
    references public.purchase_orders(id) on delete restrict,

  buyer_company_id uuid not null references public.companies(id) on delete restrict,
  supplier_company_id uuid not null references public.companies(id) on delete restrict,

  status text not null default 'opened'
    check (status in (
      'opened',
      'in_production',
      'quality_check',
      'packaging',
      'ready_to_ship',
      'shipped',
      'in_transit',
      'delivered',
      'completed',
      'cancelled',
      'failed'
    )),

  is_paused boolean not null default false,
  is_disputed boolean not null default false,
  production_location text not null default '',
  tracking_reference text not null default '',
  cancel_reason text,
  fail_reason text,
  dispute_reason text,

  opened_at timestamptz not null default now(),
  production_started_at timestamptz,
  production_completed_at timestamptz,
  qc_started_at timestamptz,
  qc_completed_at timestamptz,
  packaging_started_at timestamptz,
  packaging_completed_at timestamptz,
  ready_to_ship_at timestamptz,
  shipped_at timestamptz,
  in_transit_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  disputed_at timestamptz,

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fulfillment_orders_buyer_status_idx
  on public.fulfillment_orders (buyer_company_id, status, updated_at desc);

create index if not exists fulfillment_orders_supplier_status_idx
  on public.fulfillment_orders (supplier_company_id, status, updated_at desc);

create index if not exists fulfillment_orders_status_updated_idx
  on public.fulfillment_orders (status, updated_at desc);

create index if not exists fulfillment_orders_po_idx
  on public.fulfillment_orders (purchase_order_id);

create table if not exists public.fulfillment_order_events (
  id uuid primary key default gen_random_uuid(),
  fulfillment_order_id uuid not null
    references public.fulfillment_orders(id) on delete cascade,
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

create index if not exists fulfillment_order_events_fo_idx
  on public.fulfillment_order_events (fulfillment_order_id, created_at desc);

create table if not exists public.fulfillment_order_documents (
  id uuid primary key default gen_random_uuid(),
  fulfillment_order_id uuid not null
    references public.fulfillment_orders(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  document_type text not null default 'other',
  stage text not null default '',
  file_name text not null,
  storage_path text not null,
  mime_type text not null default '',
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists fulfillment_order_documents_fo_idx
  on public.fulfillment_order_documents (fulfillment_order_id, created_at desc);

revoke all on table public.fulfillment_orders from public;
revoke all on table public.fulfillment_order_events from public;
revoke all on table public.fulfillment_order_documents from public;

grant select on table public.fulfillment_orders to authenticated;
grant select on table public.fulfillment_order_events to authenticated;
grant select on table public.fulfillment_order_documents to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Append-only events
-- ---------------------------------------------------------------------------
create or replace function public._forbid_fulfillment_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'fulfillment_order_events are append-only';
end;
$$;

drop trigger if exists fulfillment_order_events_no_update on public.fulfillment_order_events;
create trigger fulfillment_order_events_no_update
  before update or delete on public.fulfillment_order_events
  for each row
  execute function public._forbid_fulfillment_event_mutation();

create or replace function public._append_fulfillment_event(
  p_fulfillment_order_id uuid,
  p_event_type text,
  p_actor_type text,
  p_actor_user_id uuid,
  p_from_status text default null,
  p_to_status text default null,
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.fulfillment_order_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created public.fulfillment_order_events;
begin
  insert into public.fulfillment_order_events (
    fulfillment_order_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    message,
    metadata
  )
  values (
    p_fulfillment_order_id,
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

revoke all on function public._append_fulfillment_event(
  uuid, text, text, uuid, text, text, text, jsonb
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
alter table public.fulfillment_orders enable row level security;
alter table public.fulfillment_order_events enable row level security;
alter table public.fulfillment_order_documents enable row level security;

drop policy if exists "Buyers read own fulfillment orders" on public.fulfillment_orders;
create policy "Buyers read own fulfillment orders"
  on public.fulfillment_orders for select
  using (public.user_owns_company(fulfillment_orders.buyer_company_id));

drop policy if exists "Suppliers read own fulfillment orders" on public.fulfillment_orders;
create policy "Suppliers read own fulfillment orders"
  on public.fulfillment_orders for select
  using (public.user_owns_company(fulfillment_orders.supplier_company_id));

drop policy if exists "Admins read all fulfillment orders" on public.fulfillment_orders;
create policy "Admins read all fulfillment orders"
  on public.fulfillment_orders for select
  using (public.is_admin());

drop policy if exists "Buyers read own fulfillment events" on public.fulfillment_order_events;
create policy "Buyers read own fulfillment events"
  on public.fulfillment_order_events for select
  using (
    exists (
      select 1
      from public.fulfillment_orders fo
      where fo.id = fulfillment_order_events.fulfillment_order_id
        and public.user_owns_company(fo.buyer_company_id)
    )
  );

drop policy if exists "Suppliers read own fulfillment events" on public.fulfillment_order_events;
create policy "Suppliers read own fulfillment events"
  on public.fulfillment_order_events for select
  using (
    exists (
      select 1
      from public.fulfillment_orders fo
      where fo.id = fulfillment_order_events.fulfillment_order_id
        and public.user_owns_company(fo.supplier_company_id)
    )
  );

drop policy if exists "Admins read all fulfillment events" on public.fulfillment_order_events;
create policy "Admins read all fulfillment events"
  on public.fulfillment_order_events for select
  using (public.is_admin());

drop policy if exists "Buyers read own fulfillment documents" on public.fulfillment_order_documents;
create policy "Buyers read own fulfillment documents"
  on public.fulfillment_order_documents for select
  using (
    exists (
      select 1
      from public.fulfillment_orders fo
      where fo.id = fulfillment_order_documents.fulfillment_order_id
        and public.user_owns_company(fo.buyer_company_id)
    )
  );

drop policy if exists "Suppliers read own fulfillment documents" on public.fulfillment_order_documents;
create policy "Suppliers read own fulfillment documents"
  on public.fulfillment_order_documents for select
  using (
    exists (
      select 1
      from public.fulfillment_orders fo
      where fo.id = fulfillment_order_documents.fulfillment_order_id
        and public.user_owns_company(fo.supplier_company_id)
    )
  );

drop policy if exists "Admins read all fulfillment documents" on public.fulfillment_order_documents;
create policy "Admins read all fulfillment documents"
  on public.fulfillment_order_documents for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5) Storage — path: fulfillment/<buyer_company_id>/<fulfillment_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fulfillment-docs',
  'fulfillment-docs',
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

create or replace function public.party_owns_fulfillment_storage_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parts text[];
  v_company_uuid uuid;
  v_fo_uuid uuid;
begin
  v_parts := storage.foldername(object_name);
  if array_length(v_parts, 1) is null or array_length(v_parts, 1) < 3 then
    return false;
  end if;
  if v_parts[1] is distinct from 'fulfillment' then
    return false;
  end if;
  begin
    v_company_uuid := v_parts[2]::uuid;
    v_fo_uuid := v_parts[3]::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1
    from public.fulfillment_orders fo
    where fo.id = v_fo_uuid
      and fo.buyer_company_id = v_company_uuid
      and (
        public.user_owns_company(fo.buyer_company_id)
        or public.user_owns_company(fo.supplier_company_id)
      )
  );
end;
$$;

revoke all on function public.party_owns_fulfillment_storage_path(text) from public;
grant execute on function public.party_owns_fulfillment_storage_path(text) to authenticated;

create or replace function public.can_read_fulfillment_storage_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parts text[];
  v_fo_uuid uuid;
begin
  v_parts := storage.foldername(object_name);
  if array_length(v_parts, 1) is null or array_length(v_parts, 1) < 3 then
    return false;
  end if;
  if v_parts[1] is distinct from 'fulfillment' then
    return false;
  end if;
  begin
    v_fo_uuid := v_parts[3]::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1
    from public.fulfillment_orders fo
    where fo.id = v_fo_uuid
      and (
        public.user_owns_company(fo.buyer_company_id)
        or public.user_owns_company(fo.supplier_company_id)
        or public.is_admin()
      )
  );
end;
$$;

revoke all on function public.can_read_fulfillment_storage_path(text) from public;
grant execute on function public.can_read_fulfillment_storage_path(text) to authenticated;

drop policy if exists "Parties upload fulfillment docs" on storage.objects;
create policy "Parties upload fulfillment docs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fulfillment-docs'
    and public.party_owns_fulfillment_storage_path(name)
  );

drop policy if exists "Parties update fulfillment docs" on storage.objects;
create policy "Parties update fulfillment docs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'fulfillment-docs'
    and public.party_owns_fulfillment_storage_path(name)
  )
  with check (
    bucket_id = 'fulfillment-docs'
    and public.party_owns_fulfillment_storage_path(name)
  );

drop policy if exists "Parties delete fulfillment docs" on storage.objects;
create policy "Parties delete fulfillment docs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fulfillment-docs'
    and public.party_owns_fulfillment_storage_path(name)
  );

drop policy if exists "Parties read fulfillment docs" on storage.objects;
create policy "Parties read fulfillment docs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'fulfillment-docs'
    and public.can_read_fulfillment_storage_path(name)
  );

-- ---------------------------------------------------------------------------
-- 6) Internal create + notify helpers
-- ---------------------------------------------------------------------------
create or replace function public._notify_fulfillment_parties(
  p_fo public.fulfillment_orders,
  p_type text,
  p_title text,
  p_message text,
  p_priority text default 'normal',
  p_notify_buyer boolean default true,
  p_notify_supplier boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer public.companies;
  v_supplier public.companies;
  v_url_buyer text;
  v_url_supplier text;
begin
  v_url_buyer := format('/dashboard/buyer/orders?tab=fulfillment&id=%s', p_fo.id);
  v_url_supplier := format('/dashboard/supplier/orders?tab=fulfillment&id=%s', p_fo.id);

  select * into v_buyer from public.companies c where c.id = p_fo.buyer_company_id;
  select * into v_supplier from public.companies c where c.id = p_fo.supplier_company_id;

  if p_notify_buyer and v_buyer.user_id is not null then
    perform public._create_system_notification(
      v_buyer.user_id,
      p_type,
      p_title,
      p_message,
      'fulfillment_order',
      p_fo.id,
      v_url_buyer,
      jsonb_build_object(
        'fulfillment_number', p_fo.fulfillment_number,
        'purchase_order_id', p_fo.purchase_order_id,
        'status', p_fo.status
      ),
      p_priority
    );
  end if;

  if p_notify_supplier and v_supplier.user_id is not null then
    perform public._create_system_notification(
      v_supplier.user_id,
      p_type,
      p_title,
      p_message,
      'fulfillment_order',
      p_fo.id,
      v_url_supplier,
      jsonb_build_object(
        'fulfillment_number', p_fo.fulfillment_number,
        'purchase_order_id', p_fo.purchase_order_id,
        'status', p_fo.status
      ),
      p_priority
    );
  end if;
end;
$$;

revoke all on function public._notify_fulfillment_parties(
  public.fulfillment_orders, text, text, text, text, boolean, boolean
) from public, anon, authenticated;

create or replace function public._create_fulfillment_for_po(
  p_purchase_order_id uuid,
  p_actor_user_id uuid default null,
  p_actor_type text default 'system'
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders;
  v_fo public.fulfillment_orders;
begin
  select * into v_po
  from public.purchase_orders po
  where po.id = p_purchase_order_id
  for update;

  if not found then
    raise exception 'Purchase order not found';
  end if;

  if v_po.status <> 'accepted' then
    raise exception 'Fulfillment requires an accepted purchase order';
  end if;

  select * into v_fo
  from public.fulfillment_orders fo
  where fo.purchase_order_id = p_purchase_order_id;

  if found then
    return v_fo;
  end if;

  insert into public.fulfillment_orders (
    fulfillment_number,
    purchase_order_id,
    buyer_company_id,
    supplier_company_id,
    status,
    created_by,
    updated_by
  )
  values (
    public._next_fulfillment_order_number(),
    v_po.id,
    v_po.buyer_company_id,
    v_po.supplier_company_id,
    'opened',
    p_actor_user_id,
    p_actor_user_id
  )
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id,
    'fulfillment.opened',
    p_actor_type,
    p_actor_user_id,
    null,
    'opened',
    format('Fulfillment %s opened for purchase order %s', v_fo.fulfillment_number, v_po.po_number),
    jsonb_build_object('purchase_order_id', v_po.id, 'po_number', v_po.po_number)
  );

  perform public._notify_fulfillment_parties(
    v_fo,
    'fulfillment.opened',
    'Fulfillment opened',
    format('Operational fulfillment %s is open for PO %s.', v_fo.fulfillment_number, v_po.po_number),
    'normal',
    true,
    true
  );

  return v_fo;
end;
$$;

revoke all on function public._create_fulfillment_for_po(uuid, uuid, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7) Extend accept_purchase_order (AD-3.2-004) — additive replace
-- ---------------------------------------------------------------------------
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

  -- AD-3.2-004: auto-create operational fulfillment
  perform public._create_fulfillment_for_po(v_po.id, auth.uid(), 'system');

  return v_po;
end;
$$;

revoke all on function public.accept_purchase_order(uuid) from public;
grant execute on function public.accept_purchase_order(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Public RPCs — lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.create_fulfillment(
  p_purchase_order_id uuid
)
returns public.fulfillment_orders
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

  select * into v_po
  from public.purchase_orders po
  where po.id = p_purchase_order_id;

  if not found then
    raise exception 'Purchase order not found';
  end if;

  if not (
    public.user_owns_company(v_po.buyer_company_id)
    or public.user_owns_company(v_po.supplier_company_id)
    or public.is_admin()
  ) then
    raise exception 'Unauthorized';
  end if;

  if v_po.status <> 'accepted' then
    raise exception 'Fulfillment requires an accepted purchase order';
  end if;

  return public._create_fulfillment_for_po(p_purchase_order_id, auth.uid(), 'user');
end;
$$;

revoke all on function public.create_fulfillment(uuid) from public;
grant execute on function public.create_fulfillment(uuid) to authenticated;

create or replace function public.start_production(
  p_fulfillment_id uuid,
  p_production_location text default null
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_supplier() then
    raise exception 'Only suppliers can start production';
  end if;

  select * into v_fo
  from public.fulfillment_orders fo
  where fo.id = p_fulfillment_id
  for update;

  if not found then
    raise exception 'Fulfillment not found';
  end if;
  if not public.user_owns_company(v_fo.supplier_company_id) then
    raise exception 'You cannot update fulfillment for another company';
  end if;
  if v_fo.status <> 'opened' then
    raise exception 'Production can only start from opened status';
  end if;

  v_from := v_fo.status;

  update public.fulfillment_orders fo
  set status = 'in_production',
      is_paused = false,
      production_location = coalesce(nullif(btrim(coalesce(p_production_location, '')), ''), fo.production_location),
      production_started_at = coalesce(fo.production_started_at, now()),
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.production_started', 'user', auth.uid(),
    v_from, 'in_production', 'Production started', '{}'::jsonb
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.production_started', 'Production started',
    format('Supplier started production on %s.', v_fo.fulfillment_number),
    'normal', true, false
  );

  return v_fo;
end;
$$;

revoke all on function public.start_production(uuid, text) from public;
grant execute on function public.start_production(uuid, text) to authenticated;

create or replace function public.pause_production(
  p_fulfillment_id uuid,
  p_reason text default null
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_supplier() then
    raise exception 'Only suppliers can pause production';
  end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.supplier_company_id) then
    raise exception 'Unauthorized';
  end if;
  if v_fo.status <> 'in_production' then
    raise exception 'Only in-production fulfillments can be paused';
  end if;
  if v_fo.is_paused then
    raise exception 'Production is already paused';
  end if;

  update public.fulfillment_orders fo
  set is_paused = true, updated_by = auth.uid(), updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.production_paused', 'user', auth.uid(),
    'in_production', 'in_production',
    coalesce(nullif(btrim(coalesce(p_reason, '')), ''), 'Production paused'),
    jsonb_build_object('is_paused', true)
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.production_paused', 'Production paused',
    format('Production paused on %s.', v_fo.fulfillment_number),
    'normal', true, false
  );

  return v_fo;
end;
$$;

revoke all on function public.pause_production(uuid, text) from public;
grant execute on function public.pause_production(uuid, text) to authenticated;

create or replace function public.resume_production(
  p_fulfillment_id uuid
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_supplier() then raise exception 'Only suppliers can resume production'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.supplier_company_id) then raise exception 'Unauthorized'; end if;
  if v_fo.status <> 'in_production' or not v_fo.is_paused then
    raise exception 'Production is not paused';
  end if;

  update public.fulfillment_orders fo
  set is_paused = false, updated_by = auth.uid(), updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.production_resumed', 'user', auth.uid(),
    'in_production', 'in_production', 'Production resumed',
    jsonb_build_object('is_paused', false)
  );

  return v_fo;
end;
$$;

revoke all on function public.resume_production(uuid) from public;
grant execute on function public.resume_production(uuid) to authenticated;

create or replace function public.complete_production(
  p_fulfillment_id uuid
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_supplier() then raise exception 'Only suppliers can complete production'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.supplier_company_id) then raise exception 'Unauthorized'; end if;
  if v_fo.status <> 'in_production' then
    raise exception 'Production can only be completed from in_production';
  end if;
  if v_fo.is_paused then
    raise exception 'Resume production before submitting to QC';
  end if;

  v_from := v_fo.status;

  update public.fulfillment_orders fo
  set status = 'quality_check',
      production_completed_at = now(),
      qc_started_at = coalesce(fo.qc_started_at, now()),
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.qc_started', 'user', auth.uid(),
    v_from, 'quality_check', 'Production complete; QC started', '{}'::jsonb
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.qc_started', 'Quality inspection started',
    format('%s entered quality inspection.', v_fo.fulfillment_number),
    'normal', true, false
  );

  return v_fo;
end;
$$;

revoke all on function public.complete_production(uuid) from public;
grant execute on function public.complete_production(uuid) to authenticated;

create or replace function public.pass_qc(
  p_fulfillment_id uuid
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_supplier() then raise exception 'Only suppliers can pass QC'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.supplier_company_id) then raise exception 'Unauthorized'; end if;
  if v_fo.status <> 'quality_check' then
    raise exception 'QC can only be passed from quality_check';
  end if;

  v_from := v_fo.status;

  update public.fulfillment_orders fo
  set status = 'packaging',
      qc_completed_at = now(),
      packaging_started_at = coalesce(fo.packaging_started_at, now()),
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.qc_passed', 'user', auth.uid(),
    v_from, 'packaging', 'QC passed; packaging started', '{}'::jsonb
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.qc_passed', 'QC passed',
    format('Quality checks passed on %s.', v_fo.fulfillment_number),
    'normal', true, false
  );

  return v_fo;
end;
$$;

revoke all on function public.pass_qc(uuid) from public;
grant execute on function public.pass_qc(uuid) to authenticated;

create or replace function public.fail_qc(
  p_fulfillment_id uuid,
  p_reason text,
  p_terminal boolean default false
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
  v_reason text;
  v_to text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_supplier() then raise exception 'Only suppliers can fail QC'; end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then raise exception 'A QC failure reason is required'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.supplier_company_id) then raise exception 'Unauthorized'; end if;
  if v_fo.status <> 'quality_check' then
    raise exception 'QC can only fail from quality_check';
  end if;

  v_from := v_fo.status;
  v_to := case when coalesce(p_terminal, false) then 'failed' else 'in_production' end;

  if v_to = 'failed' then
    update public.fulfillment_orders fo
    set status = 'failed',
        fail_reason = v_reason,
        failed_at = now(),
        qc_completed_at = now(),
        updated_by = auth.uid(),
        updated_at = now()
    where fo.id = p_fulfillment_id
    returning * into v_fo;
  else
    update public.fulfillment_orders fo
    set status = 'in_production',
        is_paused = false,
        qc_completed_at = now(),
        updated_by = auth.uid(),
        updated_at = now()
    where fo.id = p_fulfillment_id
    returning * into v_fo;
  end if;

  perform public._append_fulfillment_event(
    v_fo.id,
    case when v_to = 'failed' then 'fulfillment.qc_failed' else 'fulfillment.qc_rework' end,
    'user', auth.uid(), v_from, v_to, v_reason,
    jsonb_build_object('terminal', coalesce(p_terminal, false))
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.qc_failed', 'QC failed',
    format('Quality check failed on %s: %s', v_fo.fulfillment_number, v_reason),
    'high', true, false
  );

  return v_fo;
end;
$$;

revoke all on function public.fail_qc(uuid, text, boolean) from public;
grant execute on function public.fail_qc(uuid, text, boolean) to authenticated;

create or replace function public.pack_order(
  p_fulfillment_id uuid
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_supplier() then raise exception 'Only suppliers can pack orders'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.supplier_company_id) then raise exception 'Unauthorized'; end if;
  if v_fo.status <> 'packaging' then
    raise exception 'Packing can only complete from packaging status';
  end if;

  v_from := v_fo.status;

  update public.fulfillment_orders fo
  set status = 'ready_to_ship',
      packaging_completed_at = now(),
      ready_to_ship_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.packed', 'user', auth.uid(),
    v_from, 'ready_to_ship', 'Packaging complete; ready to ship', '{}'::jsonb
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.ready_to_ship', 'Ready to ship',
    format('%s is ready for dispatch.', v_fo.fulfillment_number),
    'normal', true, false
  );

  return v_fo;
end;
$$;

revoke all on function public.pack_order(uuid) from public;
grant execute on function public.pack_order(uuid) to authenticated;

create or replace function public.mark_ready(
  p_fulfillment_id uuid
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Alias of pack completion for API clarity (AD design mark_ready)
  return public.pack_order(p_fulfillment_id);
end;
$$;

revoke all on function public.mark_ready(uuid) from public;
grant execute on function public.mark_ready(uuid) to authenticated;

create or replace function public.mark_shipped(
  p_fulfillment_id uuid,
  p_tracking_reference text default null
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_supplier() then raise exception 'Only suppliers can mark shipped'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.supplier_company_id) then raise exception 'Unauthorized'; end if;
  if v_fo.status <> 'ready_to_ship' then
    raise exception 'Shipment can only start from ready_to_ship';
  end if;

  v_from := v_fo.status;

  update public.fulfillment_orders fo
  set status = 'shipped',
      tracking_reference = coalesce(nullif(btrim(coalesce(p_tracking_reference, '')), ''), fo.tracking_reference),
      shipped_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.shipped', 'user', auth.uid(),
    v_from, 'shipped', 'Order shipped',
    jsonb_build_object('tracking_reference', v_fo.tracking_reference)
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.shipped', 'Shipment dispatched',
    format('%s has been shipped.', v_fo.fulfillment_number),
    'high', true, false
  );

  return v_fo;
end;
$$;

revoke all on function public.mark_shipped(uuid, text) from public;
grant execute on function public.mark_shipped(uuid, text) to authenticated;

create or replace function public.mark_in_transit(
  p_fulfillment_id uuid,
  p_tracking_reference text default null
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_supplier() then raise exception 'Only suppliers can mark in transit'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.supplier_company_id) then raise exception 'Unauthorized'; end if;
  if v_fo.status <> 'shipped' then
    raise exception 'In-transit can only follow shipped';
  end if;

  v_from := v_fo.status;

  update public.fulfillment_orders fo
  set status = 'in_transit',
      tracking_reference = coalesce(nullif(btrim(coalesce(p_tracking_reference, '')), ''), fo.tracking_reference),
      in_transit_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.in_transit', 'user', auth.uid(),
    v_from, 'in_transit', 'Shipment in transit', '{}'::jsonb
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.in_transit', 'In transit',
    format('%s is in transit.', v_fo.fulfillment_number),
    'normal', true, false
  );

  return v_fo;
end;
$$;

revoke all on function public.mark_in_transit(uuid, text) from public;
grant execute on function public.mark_in_transit(uuid, text) to authenticated;

create or replace function public.mark_delivered(
  p_fulfillment_id uuid
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
  v_is_buyer boolean;
  v_is_supplier boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;

  v_is_buyer := public.user_owns_company(v_fo.buyer_company_id);
  v_is_supplier := public.user_owns_company(v_fo.supplier_company_id);

  if not (v_is_buyer or v_is_supplier) then
    raise exception 'Unauthorized';
  end if;

  if v_fo.status not in ('shipped', 'in_transit') then
    raise exception 'Delivery can only be marked from shipped or in_transit';
  end if;

  v_from := v_fo.status;

  update public.fulfillment_orders fo
  set status = 'delivered',
      delivered_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.delivered', 'user', auth.uid(),
    v_from, 'delivered', 'Delivery recorded',
    jsonb_build_object('by_buyer', v_is_buyer, 'by_supplier', v_is_supplier)
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.delivered', 'Delivered',
    format('%s marked delivered.', v_fo.fulfillment_number),
    'high', true, true
  );

  return v_fo;
end;
$$;

revoke all on function public.mark_delivered(uuid) from public;
grant execute on function public.mark_delivered(uuid) to authenticated;

create or replace function public.complete_fulfillment(
  p_fulfillment_id uuid
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_buyer() then raise exception 'Only buyers can complete fulfillment'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.buyer_company_id) then raise exception 'Unauthorized'; end if;
  if v_fo.status <> 'delivered' then
    raise exception 'Only delivered fulfillments can be completed';
  end if;
  if v_fo.is_disputed then
    raise exception 'Cannot complete a disputed fulfillment';
  end if;

  v_from := v_fo.status;

  update public.fulfillment_orders fo
  set status = 'completed',
      completed_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.completed', 'user', auth.uid(),
    v_from, 'completed', 'Fulfillment completed by buyer', '{}'::jsonb
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.completed', 'Fulfillment completed',
    format('%s has been completed.', v_fo.fulfillment_number),
    'high', true, true
  );

  return v_fo;
end;
$$;

revoke all on function public.complete_fulfillment(uuid) from public;
grant execute on function public.complete_fulfillment(uuid) to authenticated;

create or replace function public.cancel_fulfillment(
  p_fulfillment_id uuid,
  p_reason text default null
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
  v_reason text;
  v_is_buyer boolean;
  v_is_supplier boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;

  v_is_buyer := public.user_owns_company(v_fo.buyer_company_id);
  v_is_supplier := public.user_owns_company(v_fo.supplier_company_id);

  if not (v_is_buyer or v_is_supplier) then raise exception 'Unauthorized'; end if;

  -- AD-3.2-005
  if v_is_supplier and not v_is_buyer then
    if v_fo.status <> 'opened' then
      raise exception 'Suppliers can only cancel fulfillments in opened status';
    end if;
  elsif v_is_buyer then
    if v_fo.status not in ('opened', 'in_production', 'quality_check', 'packaging', 'ready_to_ship') then
      raise exception 'Buyers can only cancel before shipment';
    end if;
  end if;

  v_from := v_fo.status;
  v_reason := nullif(btrim(coalesce(p_reason, '')), '');

  update public.fulfillment_orders fo
  set status = 'cancelled',
      cancel_reason = v_reason,
      cancelled_at = now(),
      is_paused = false,
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.cancelled', 'user', auth.uid(),
    v_from, 'cancelled',
    coalesce(v_reason, 'Fulfillment cancelled'), '{}'::jsonb
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.cancelled', 'Fulfillment cancelled',
    format('%s was cancelled.', v_fo.fulfillment_number),
    'high', true, true
  );

  return v_fo;
end;
$$;

revoke all on function public.cancel_fulfillment(uuid, text) from public;
grant execute on function public.cancel_fulfillment(uuid, text) to authenticated;

create or replace function public.fail_production(
  p_fulfillment_id uuid,
  p_reason text
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_from text;
  v_reason text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_supplier() then raise exception 'Only suppliers can fail production'; end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then raise exception 'A failure reason is required'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.supplier_company_id) then raise exception 'Unauthorized'; end if;
  if v_fo.status <> 'in_production' then
    raise exception 'Production can only fail from in_production';
  end if;

  v_from := v_fo.status;

  update public.fulfillment_orders fo
  set status = 'failed',
      fail_reason = v_reason,
      failed_at = now(),
      is_paused = false,
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.failed', 'user', auth.uid(),
    v_from, 'failed', v_reason, '{}'::jsonb
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.failed', 'Fulfillment failed',
    format('%s failed: %s', v_fo.fulfillment_number, v_reason),
    'high', true, true
  );

  return v_fo;
end;
$$;

revoke all on function public.fail_production(uuid, text) from public;
grant execute on function public.fail_production(uuid, text) to authenticated;

create or replace function public.raise_fulfillment_dispute(
  p_fulfillment_id uuid,
  p_reason text
)
returns public.fulfillment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_reason text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_buyer() then raise exception 'Only buyers can raise disputes'; end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then raise exception 'A dispute reason is required'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id for update;
  if not found then raise exception 'Fulfillment not found'; end if;
  if not public.user_owns_company(v_fo.buyer_company_id) then raise exception 'Unauthorized'; end if;
  if v_fo.status not in ('shipped', 'in_transit', 'delivered') then
    raise exception 'Disputes can only be raised after shipment';
  end if;
  if v_fo.is_disputed then
    raise exception 'Fulfillment is already disputed';
  end if;

  update public.fulfillment_orders fo
  set is_disputed = true,
      dispute_reason = v_reason,
      disputed_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where fo.id = p_fulfillment_id
  returning * into v_fo;

  perform public._append_fulfillment_event(
    v_fo.id, 'fulfillment.disputed', 'user', auth.uid(),
    v_fo.status, v_fo.status, v_reason,
    jsonb_build_object('is_disputed', true)
  );

  perform public._notify_fulfillment_parties(
    v_fo, 'fulfillment.disputed', 'Delivery disputed',
    format('Buyer disputed %s: %s', v_fo.fulfillment_number, v_reason),
    'high', false, true
  );

  return v_fo;
end;
$$;

revoke all on function public.raise_fulfillment_dispute(uuid, text) from public;
grant execute on function public.raise_fulfillment_dispute(uuid, text) to authenticated;

create or replace function public.get_fulfillment(
  p_fulfillment_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_fo from public.fulfillment_orders fo where fo.id = p_fulfillment_id;
  if not found then return null; end if;

  if not (
    public.user_owns_company(v_fo.buyer_company_id)
    or public.user_owns_company(v_fo.supplier_company_id)
    or public.is_admin()
  ) then
    raise exception 'Fulfillment not found';
  end if;

  select jsonb_build_object(
    'fulfillment_order', to_jsonb(v_fo),
    'events', coalesce(
      (
        select jsonb_agg(to_jsonb(e) order by e.created_at desc)
        from public.fulfillment_order_events e
        where e.fulfillment_order_id = v_fo.id
      ),
      '[]'::jsonb
    ),
    'documents', coalesce(
      (
        select jsonb_agg(to_jsonb(d) order by d.created_at desc)
        from public.fulfillment_order_documents d
        where d.fulfillment_order_id = v_fo.id
      ),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_fulfillment(uuid) from public;
grant execute on function public.get_fulfillment(uuid) to authenticated;

create or replace function public.list_fulfillments(
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
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  v_limit := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset := greatest(0, coalesce(p_offset, 0));
  v_status := nullif(btrim(coalesce(p_status, '')), '');

  if public.is_buyer() then
    select coalesce(jsonb_agg(to_jsonb(fo) order by fo.updated_at desc), '[]'::jsonb)
    into v_rows
    from (
      select fo.*
      from public.fulfillment_orders fo
      where public.user_owns_company(fo.buyer_company_id)
        and (v_status is null or fo.status = v_status)
      order by fo.updated_at desc
      limit v_limit offset v_offset
    ) fo;
  elsif public.is_supplier() then
    select coalesce(jsonb_agg(to_jsonb(fo) order by fo.updated_at desc), '[]'::jsonb)
    into v_rows
    from (
      select fo.*
      from public.fulfillment_orders fo
      where public.user_owns_company(fo.supplier_company_id)
        and (v_status is null or fo.status = v_status)
      order by fo.updated_at desc
      limit v_limit offset v_offset
    ) fo;
  elsif public.is_admin() then
    select coalesce(jsonb_agg(to_jsonb(fo) order by fo.updated_at desc), '[]'::jsonb)
    into v_rows
    from (
      select fo.*
      from public.fulfillment_orders fo
      where (v_status is null or fo.status = v_status)
      order by fo.updated_at desc
      limit v_limit offset v_offset
    ) fo;
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

revoke all on function public.list_fulfillments(text, integer, integer) from public;
grant execute on function public.list_fulfillments(text, integer, integer) to authenticated;

commit;
