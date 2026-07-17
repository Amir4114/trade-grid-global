-- Trade Grid Global: Supplier Quotation System (Module 2)
--
-- Builds on RFQ Foundation (014). Adds quotation threads, immutable versioned
-- offers, attachments, events, private storage, and trusted RPCs.
-- Awarding, negotiation messages, matching, orders, payments, AI are OUT OF SCOPE.
--
-- Depends on: is_admin(), is_buyer(), is_supplier(), user_owns_company(),
--             supplier_can_access_rfq(), _create_system_notification(),
--             _append_rfq_event() (optional RFQ status sync).
-- Additive / idempotent / fail-closed. Does NOT modify migrations 001–014.
--
-- Pre-delivery review: all multi-table SQL and RLS policies fully qualify
-- shared column names (status, id, *_id, timestamps). SECURITY DEFINER
-- functions set search_path = public. PL/pgSQL vars use v_ prefixes.

begin;

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
create table if not exists public.quotation_threads (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'withdrawn', 'awarded', 'closed')),
  current_offer_id uuid,
  awarded_offer_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rfq_id, supplier_company_id)
);

create index if not exists quotation_threads_rfq_id_idx
  on public.quotation_threads (rfq_id);

create index if not exists quotation_threads_supplier_idx
  on public.quotation_threads (supplier_company_id, status);

create table if not exists public.quotation_offers (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.quotation_threads(id) on delete cascade,
  revision_no integer not null,
  offered_by text not null default 'supplier'
    check (offered_by in ('supplier', 'buyer')),
  supersedes_offer_id uuid references public.quotation_offers(id) on delete set null,
  currency text not null default 'USD',
  unit_price numeric,
  price_unit text not null default '',
  total_price numeric,
  incoterm text not null default '',
  lead_time_min integer,
  lead_time_max integer,
  lead_time_unit text not null default 'days',
  moq_quantity numeric,
  moq_unit text not null default '',
  validity_until timestamptz,
  notes text not null default '',
  linked_product_id uuid references public.products(id) on delete set null,
  status text not null default 'draft'
    check (status in (
      'draft', 'submitted', 'withdrawn', 'rejected',
      'superseded', 'awarded', 'not_selected'
    )),
  created_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (thread_id, revision_no)
);

create unique index if not exists quotation_offers_one_draft_per_thread_idx
  on public.quotation_offers (thread_id)
  where status = 'draft';

create index if not exists quotation_offers_thread_idx
  on public.quotation_offers (thread_id, revision_no desc);

create index if not exists quotation_offers_status_idx
  on public.quotation_offers (status);

-- Soft FK for current_offer_id (avoid circular create dependency)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quotation_threads_current_offer_fk'
  ) then
    alter table public.quotation_threads
      add constraint quotation_threads_current_offer_fk
      foreign key (current_offer_id) references public.quotation_offers(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quotation_threads_awarded_offer_fk'
  ) then
    alter table public.quotation_threads
      add constraint quotation_threads_awarded_offer_fk
      foreign key (awarded_offer_id) references public.quotation_offers(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.quotation_attachments (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.quotation_offers(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null default '',
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists quotation_attachments_offer_idx
  on public.quotation_attachments (offer_id);

create table if not exists public.quotation_events (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.quotation_threads(id) on delete cascade,
  offer_id uuid references public.quotation_offers(id) on delete set null,
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

create index if not exists quotation_events_thread_idx
  on public.quotation_events (thread_id, created_at desc);

revoke all on table public.quotation_threads from public;
revoke all on table public.quotation_offers from public;
revoke all on table public.quotation_attachments from public;
revoke all on table public.quotation_events from public;

grant select on table public.quotation_threads to authenticated;
grant select on table public.quotation_offers to authenticated;
grant select on table public.quotation_attachments to authenticated;
grant select on table public.quotation_events to authenticated;
grant select, insert, delete on table public.quotation_attachments to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Helpers
-- ---------------------------------------------------------------------------
create or replace function public._append_quotation_event(
  p_thread_id uuid,
  p_offer_id uuid,
  p_event_type text,
  p_actor_type text,
  p_actor_user_id uuid,
  p_from_status text default null,
  p_to_status text default null,
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.quotation_events
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.quotation_events;
begin
  insert into public.quotation_events (
    thread_id, offer_id, event_type, actor_type, actor_user_id,
    from_status, to_status, message, metadata
  )
  values (
    p_thread_id, p_offer_id, p_event_type, p_actor_type, p_actor_user_id,
    p_from_status, p_to_status, p_message, coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into created;
  return created;
end;
$$;

revoke all on function public._append_quotation_event(
  uuid, uuid, text, text, uuid, text, text, text, jsonb
) from public, anon, authenticated;

create or replace function public._recompute_rfq_quote_status(p_rfq_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.rfqs;
  v_active_count integer;
begin
  select * into v_rfq from public.rfqs r where r.id = p_rfq_id for update;
  if not found then
    return;
  end if;

  if v_rfq.status not in ('open', 'quoted') then
    return;
  end if;

  select count(*) into v_active_count
  from public.quotation_offers o
  join public.quotation_threads t on t.id = o.thread_id
  where t.rfq_id = p_rfq_id
    and o.status = 'submitted'
    and o.offered_by = 'supplier';

  if coalesce(v_active_count, 0) > 0 and v_rfq.status = 'open' then
    update public.rfqs r
    set status = 'quoted', updated_at = now()
    where r.id = p_rfq_id;

    perform public._append_rfq_event(
      p_rfq_id, 'rfq.quoted', 'system', null, 'open', 'quoted',
      'RFQ received an active quotation', '{}'::jsonb
    );
  elsif coalesce(v_active_count, 0) = 0 and v_rfq.status = 'quoted' then
    update public.rfqs r
    set status = 'open', updated_at = now()
    where r.id = p_rfq_id;

    perform public._append_rfq_event(
      p_rfq_id, 'rfq.reopened', 'system', null, 'quoted', 'open',
      'No active quotations remain', '{}'::jsonb
    );
  end if;
end;
$$;

revoke all on function public._recompute_rfq_quote_status(uuid) from public, anon, authenticated;

create or replace function public._supplier_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.companies c
  where c.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public._supplier_company_id() from public;
grant execute on function public._supplier_company_id() to authenticated;

create or replace function public.can_access_quotation_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quotation_threads t
    join public.rfqs r on r.id = t.rfq_id
    where t.id = p_thread_id
      and (
        public.is_admin()
        or public.user_owns_company(r.buyer_company_id)
        or public.user_owns_company(t.supplier_company_id)
      )
  );
$$;

revoke all on function public.can_access_quotation_thread(uuid) from public;
grant execute on function public.can_access_quotation_thread(uuid) to authenticated;

create or replace function public._assert_supplier_can_quote(p_rfq_id uuid)
returns public.rfqs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.rfqs;
  v_onboarding boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_supplier() then
    raise exception 'Only suppliers can submit quotations';
  end if;

  if not public.supplier_can_access_rfq(p_rfq_id) then
    raise exception 'You are not eligible to quote on this RFQ';
  end if;

  select * into v_rfq from public.rfqs r where r.id = p_rfq_id;
  if not found then
    raise exception 'RFQ not found';
  end if;

  if v_rfq.status not in ('open', 'quoted') then
    raise exception 'Quotations are only accepted on open or quoted RFQs';
  end if;

  if v_rfq.quote_deadline_at is not null and v_rfq.quote_deadline_at <= now() then
    raise exception 'Quote deadline has passed';
  end if;

  select c.onboarding_completed into v_onboarding
  from public.companies c
  where c.user_id = auth.uid();

  if not coalesce(v_onboarding, false) then
    raise exception 'Complete company onboarding before submitting quotations';
  end if;

  return v_rfq;
end;
$$;

revoke all on function public._assert_supplier_can_quote(uuid) from public, anon, authenticated;

create or replace function public._ensure_quotation_thread(p_rfq_id uuid)
returns public.quotation_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_thread public.quotation_threads;
begin
  v_company_id := public._supplier_company_id();
  if v_company_id is null then
    raise exception 'Supplier company profile is required';
  end if;

  select * into v_thread
  from public.quotation_threads qt
  where qt.rfq_id = p_rfq_id
    and qt.supplier_company_id = v_company_id;

  if found then
    return v_thread;
  end if;

  insert into public.quotation_threads (
    rfq_id, supplier_company_id, status, created_by
  )
  values (p_rfq_id, v_company_id, 'draft', auth.uid())
  returning * into v_thread;

  perform public._append_quotation_event(
    v_thread.id, null, 'thread.created', 'user', auth.uid(),
    null, 'draft', 'Quotation thread created', '{}'::jsonb
  );

  return v_thread;
end;
$$;

revoke all on function public._ensure_quotation_thread(uuid) from public, anon, authenticated;

create or replace function public._notify_rfq_buyer_quotation(
  p_rfq_id uuid,
  p_thread_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_priority text default 'high'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_user_id uuid;
begin
  select c.user_id into v_buyer_user_id
  from public.rfqs r
  join public.companies c on c.id = r.buyer_company_id
  where r.id = p_rfq_id;

  if v_buyer_user_id is null then
    return;
  end if;

  perform public._create_system_notification(
    v_buyer_user_id,
    p_type,
    p_title,
    p_message,
    'quotation',
    p_thread_id,
    format('/dashboard/buyer/rfqs/%s/quotations/%s', p_rfq_id, p_thread_id),
    jsonb_build_object('rfq_id', p_rfq_id, 'thread_id', p_thread_id),
    p_priority
  );
end;
$$;

revoke all on function public._notify_rfq_buyer_quotation(
  uuid, uuid, text, text, text, text
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) RLS
-- ---------------------------------------------------------------------------
alter table public.quotation_threads enable row level security;
alter table public.quotation_offers enable row level security;
alter table public.quotation_attachments enable row level security;
alter table public.quotation_events enable row level security;

drop policy if exists "Buyers read quotation threads for own rfqs" on public.quotation_threads;
create policy "Buyers read quotation threads for own rfqs"
  on public.quotation_threads for select
  using (
    exists (
      select 1 from public.rfqs r
      where r.id = quotation_threads.rfq_id
        and public.user_owns_company(r.buyer_company_id)
    )
  );

drop policy if exists "Suppliers read own quotation threads" on public.quotation_threads;
create policy "Suppliers read own quotation threads"
  on public.quotation_threads for select
  using (public.user_owns_company(quotation_threads.supplier_company_id));

drop policy if exists "Admins read all quotation threads" on public.quotation_threads;
create policy "Admins read all quotation threads"
  on public.quotation_threads for select
  using (public.is_admin());

drop policy if exists "Buyers read offers on own rfqs" on public.quotation_offers;
create policy "Buyers read offers on own rfqs"
  on public.quotation_offers for select
  using (
    exists (
      select 1
      from public.quotation_threads t
      join public.rfqs r on r.id = t.rfq_id
      where t.id = quotation_offers.thread_id
        and public.user_owns_company(r.buyer_company_id)
        -- buyers do not see supplier drafts
        and quotation_offers.status <> 'draft'
    )
  );

drop policy if exists "Suppliers read own offers" on public.quotation_offers;
create policy "Suppliers read own offers"
  on public.quotation_offers for select
  using (
    exists (
      select 1 from public.quotation_threads t
      where t.id = quotation_offers.thread_id
        and public.user_owns_company(t.supplier_company_id)
    )
  );

drop policy if exists "Admins read all offers" on public.quotation_offers;
create policy "Admins read all offers"
  on public.quotation_offers for select
  using (public.is_admin());

drop policy if exists "Parties read quotation attachments" on public.quotation_attachments;
create policy "Parties read quotation attachments"
  on public.quotation_attachments for select
  using (
    exists (
      select 1
      from public.quotation_offers o
      join public.quotation_threads t on t.id = o.thread_id
      join public.rfqs r on r.id = t.rfq_id
      where o.id = quotation_attachments.offer_id
        and (
          public.is_admin()
          or public.user_owns_company(t.supplier_company_id)
          or (
            public.user_owns_company(r.buyer_company_id)
            and o.status <> 'draft'
          )
        )
    )
  );

drop policy if exists "Suppliers insert draft quotation attachments" on public.quotation_attachments;
create policy "Suppliers insert draft quotation attachments"
  on public.quotation_attachments for insert
  with check (
    exists (
      select 1
      from public.quotation_offers o
      join public.quotation_threads t on t.id = o.thread_id
      where o.id = quotation_attachments.offer_id
        and o.status = 'draft'
        and public.user_owns_company(t.supplier_company_id)
    )
    and quotation_attachments.uploaded_by = auth.uid()
  );

drop policy if exists "Suppliers delete draft quotation attachments" on public.quotation_attachments;
create policy "Suppliers delete draft quotation attachments"
  on public.quotation_attachments for delete
  using (
    exists (
      select 1
      from public.quotation_offers o
      join public.quotation_threads t on t.id = o.thread_id
      where o.id = quotation_attachments.offer_id
        and o.status = 'draft'
        and public.user_owns_company(t.supplier_company_id)
    )
  );

drop policy if exists "Parties read quotation events" on public.quotation_events;
create policy "Parties read quotation events"
  on public.quotation_events for select
  using (public.can_access_quotation_thread(quotation_events.thread_id));

-- ---------------------------------------------------------------------------
-- 4) Storage (private)
-- Path: quotations/<supplier_company_id>/<thread_id>/<filename>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quotation-docs',
  'quotation-docs',
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

create or replace function public.supplier_owns_quotation_storage_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[];
  company_uuid uuid;
  thread_uuid uuid;
begin
  parts := storage.foldername(object_name);
  if array_length(parts, 1) is null or array_length(parts, 1) < 3 then
    return false;
  end if;
  if parts[1] is distinct from 'quotations' then
    return false;
  end if;
  begin
    company_uuid := parts[2]::uuid;
    thread_uuid := parts[3]::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1 from public.quotation_threads t
    where t.id = thread_uuid
      and t.supplier_company_id = company_uuid
      and public.user_owns_company(t.supplier_company_id)
  );
end;
$$;

revoke all on function public.supplier_owns_quotation_storage_path(text) from public;
grant execute on function public.supplier_owns_quotation_storage_path(text) to authenticated;

create or replace function public.can_read_quotation_storage_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[];
  thread_uuid uuid;
begin
  parts := storage.foldername(object_name);
  if array_length(parts, 1) is null or array_length(parts, 1) < 3 then
    return false;
  end if;
  if parts[1] is distinct from 'quotations' then
    return false;
  end if;
  begin
    thread_uuid := parts[3]::uuid;
  exception when others then
    return false;
  end;

  return public.can_access_quotation_thread(thread_uuid);
end;
$$;

revoke all on function public.can_read_quotation_storage_path(text) from public;
grant execute on function public.can_read_quotation_storage_path(text) to authenticated;

drop policy if exists "Suppliers upload quotation docs" on storage.objects;
create policy "Suppliers upload quotation docs"
  on storage.objects for insert
  with check (
    bucket_id = 'quotation-docs'
    and public.is_supplier()
    and public.supplier_owns_quotation_storage_path(name)
  );

drop policy if exists "Suppliers update quotation docs" on storage.objects;
create policy "Suppliers update quotation docs"
  on storage.objects for update
  using (
    bucket_id = 'quotation-docs'
    and public.supplier_owns_quotation_storage_path(name)
  )
  with check (
    bucket_id = 'quotation-docs'
    and public.supplier_owns_quotation_storage_path(name)
  );

drop policy if exists "Suppliers delete quotation docs" on storage.objects;
create policy "Suppliers delete quotation docs"
  on storage.objects for delete
  using (
    bucket_id = 'quotation-docs'
    and public.supplier_owns_quotation_storage_path(name)
  );

drop policy if exists "Parties read quotation docs" on storage.objects;
create policy "Parties read quotation docs"
  on storage.objects for select
  using (
    bucket_id = 'quotation-docs'
    and (
      public.is_admin()
      or public.can_read_quotation_storage_path(name)
    )
  );

-- ---------------------------------------------------------------------------
-- 5) RPCs
-- ---------------------------------------------------------------------------
create or replace function public.create_draft_quotation(
  p_rfq_id uuid,
  p_currency text default 'USD',
  p_unit_price numeric default null,
  p_price_unit text default '',
  p_total_price numeric default null,
  p_incoterm text default '',
  p_lead_time_min integer default null,
  p_lead_time_max integer default null,
  p_lead_time_unit text default 'days',
  p_moq_quantity numeric default null,
  p_moq_unit text default '',
  p_validity_until timestamptz default null,
  p_notes text default '',
  p_linked_product_id uuid default null
)
returns public.quotation_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.rfqs;
  v_thread public.quotation_threads;
  v_offer public.quotation_offers;
  v_next_rev integer;
begin
  v_rfq := public._assert_supplier_can_quote(p_rfq_id);
  v_thread := public._ensure_quotation_thread(p_rfq_id);

  if v_thread.status = 'withdrawn' then
    raise exception 'Withdrawn quotation threads cannot accept new drafts';
  end if;

  if exists (
    select 1 from public.quotation_offers o
    where o.thread_id = v_thread.id and o.status = 'draft'
  ) then
    raise exception 'A draft quotation already exists for this RFQ. Update or submit it.';
  end if;

  select coalesce(max(o.revision_no), 0) + 1 into v_next_rev
  from public.quotation_offers o
  where o.thread_id = v_thread.id;

  insert into public.quotation_offers (
    thread_id, revision_no, offered_by, currency, unit_price, price_unit,
    total_price, incoterm, lead_time_min, lead_time_max, lead_time_unit,
    moq_quantity, moq_unit, validity_until, notes, linked_product_id,
    status, created_by
  )
  values (
    v_thread.id, v_next_rev, 'supplier',
    coalesce(nullif(btrim(p_currency), ''), 'USD'),
    p_unit_price, coalesce(p_price_unit, ''), p_total_price,
    coalesce(p_incoterm, ''), p_lead_time_min, p_lead_time_max,
    coalesce(nullif(btrim(p_lead_time_unit), ''), 'days'),
    p_moq_quantity, coalesce(p_moq_unit, ''), p_validity_until,
    coalesce(p_notes, ''), p_linked_product_id, 'draft', auth.uid()
  )
  returning * into v_offer;

  update public.quotation_threads qt
  set current_offer_id = v_offer.id,
      status = case when qt.status = 'active' then qt.status else 'draft' end,
      updated_at = now()
  where qt.id = v_thread.id;

  perform public._append_quotation_event(
    v_thread.id, v_offer.id, 'offer.draft_created', 'user', auth.uid(),
    null, 'draft', 'Draft quotation created',
    jsonb_build_object('revision_no', v_offer.revision_no, 'rfq_id', v_rfq.id)
  );

  return v_offer;
end;
$$;

revoke all on function public.create_draft_quotation(
  uuid, text, numeric, text, numeric, text, integer, integer, text, numeric, text,
  timestamptz, text, uuid
) from public;
grant execute on function public.create_draft_quotation(
  uuid, text, numeric, text, numeric, text, integer, integer, text, numeric, text,
  timestamptz, text, uuid
) to authenticated;

create or replace function public.update_draft_quotation(
  p_offer_id uuid,
  p_currency text default null,
  p_unit_price numeric default null,
  p_price_unit text default null,
  p_total_price numeric default null,
  p_incoterm text default null,
  p_lead_time_min integer default null,
  p_lead_time_max integer default null,
  p_lead_time_unit text default null,
  p_moq_quantity numeric default null,
  p_moq_unit text default null,
  p_validity_until timestamptz default null,
  p_clear_validity boolean default false,
  p_notes text default null,
  p_linked_product_id uuid default null,
  p_clear_linked_product boolean default false
)
returns public.quotation_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.quotation_offers;
  v_thread public.quotation_threads;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_offer from public.quotation_offers o where o.id = p_offer_id;
  if not found then
    raise exception 'Quotation offer not found';
  end if;

  select * into v_thread from public.quotation_threads qt where qt.id = v_offer.thread_id;

  if not public.user_owns_company(v_thread.supplier_company_id) then
    raise exception 'You cannot update a quotation you do not own';
  end if;

  if v_offer.status <> 'draft' then
    raise exception 'Only draft quotations can be updated in place';
  end if;

  -- Ensure RFQ still quotable
  perform public._assert_supplier_can_quote(v_thread.rfq_id);

  update public.quotation_offers o
  set
    currency = coalesce(nullif(btrim(p_currency), ''), o.currency),
    unit_price = coalesce(p_unit_price, o.unit_price),
    price_unit = coalesce(p_price_unit, o.price_unit),
    total_price = coalesce(p_total_price, o.total_price),
    incoterm = coalesce(p_incoterm, o.incoterm),
    lead_time_min = coalesce(p_lead_time_min, o.lead_time_min),
    lead_time_max = coalesce(p_lead_time_max, o.lead_time_max),
    lead_time_unit = coalesce(p_lead_time_unit, o.lead_time_unit),
    moq_quantity = coalesce(p_moq_quantity, o.moq_quantity),
    moq_unit = coalesce(p_moq_unit, o.moq_unit),
    validity_until = case
      when p_clear_validity then null
      when p_validity_until is not null then p_validity_until
      else o.validity_until
    end,
    notes = coalesce(p_notes, o.notes),
    linked_product_id = case
      when p_clear_linked_product then null
      when p_linked_product_id is not null then p_linked_product_id
      else o.linked_product_id
    end,
    updated_at = now()
  where o.id = p_offer_id
  returning * into v_offer;

  perform public._append_quotation_event(
    v_thread.id, v_offer.id, 'offer.draft_updated', 'user', auth.uid(),
    'draft', 'draft', 'Draft quotation updated', '{}'::jsonb
  );

  return v_offer;
end;
$$;

revoke all on function public.update_draft_quotation(
  uuid, text, numeric, text, numeric, text, integer, integer, text, numeric, text,
  timestamptz, boolean, text, uuid, boolean
) from public;
grant execute on function public.update_draft_quotation(
  uuid, text, numeric, text, numeric, text, integer, integer, text, numeric, text,
  timestamptz, boolean, text, uuid, boolean
) to authenticated;

create or replace function public.submit_quotation(
  p_rfq_id uuid default null,
  p_offer_id uuid default null,
  p_currency text default 'USD',
  p_unit_price numeric default null,
  p_price_unit text default '',
  p_total_price numeric default null,
  p_incoterm text default '',
  p_lead_time_min integer default null,
  p_lead_time_max integer default null,
  p_lead_time_unit text default 'days',
  p_moq_quantity numeric default null,
  p_moq_unit text default '',
  p_validity_until timestamptz default null,
  p_notes text default '',
  p_linked_product_id uuid default null
)
returns public.quotation_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.quotation_offers;
  v_thread public.quotation_threads;
  v_rfq public.rfqs;
  v_rfq_id uuid;
  v_from text;
begin
  if p_offer_id is not null then
    select * into v_offer from public.quotation_offers o where o.id = p_offer_id;
    if not found then
      raise exception 'Quotation offer not found';
    end if;

    select * into v_thread from public.quotation_threads qt where qt.id = v_offer.thread_id;
    if not public.user_owns_company(v_thread.supplier_company_id) then
      raise exception 'You cannot submit a quotation you do not own';
    end if;

    if v_offer.status <> 'draft' then
      raise exception 'Only draft quotations can be submitted via offer id';
    end if;

    v_rfq := public._assert_supplier_can_quote(v_thread.rfq_id);
    v_rfq_id := v_thread.rfq_id;

    if p_unit_price is null and v_offer.unit_price is null then
      raise exception 'Unit price is required to submit a quotation';
    end if;

    -- Optional field overlays before submit
    update public.quotation_offers o
    set
      currency = coalesce(nullif(btrim(p_currency), ''), o.currency),
      unit_price = coalesce(p_unit_price, o.unit_price),
      price_unit = coalesce(nullif(btrim(p_price_unit), ''), o.price_unit),
      total_price = coalesce(p_total_price, o.total_price),
      incoterm = coalesce(nullif(btrim(p_incoterm), ''), o.incoterm),
      lead_time_min = coalesce(p_lead_time_min, o.lead_time_min),
      lead_time_max = coalesce(p_lead_time_max, o.lead_time_max),
      lead_time_unit = coalesce(nullif(btrim(p_lead_time_unit), ''), o.lead_time_unit),
      moq_quantity = coalesce(p_moq_quantity, o.moq_quantity),
      moq_unit = coalesce(nullif(btrim(p_moq_unit), ''), o.moq_unit),
      validity_until = coalesce(p_validity_until, o.validity_until),
      notes = coalesce(p_notes, o.notes),
      linked_product_id = coalesce(p_linked_product_id, o.linked_product_id),
      status = 'submitted',
      submitted_at = now(),
      updated_at = now()
    where o.id = p_offer_id
    returning * into v_offer;
  else
    if p_rfq_id is null then
      raise exception 'p_rfq_id or p_offer_id is required';
    end if;

    if p_unit_price is null then
      raise exception 'Unit price is required to submit a quotation';
    end if;

    v_rfq := public._assert_supplier_can_quote(p_rfq_id);
    v_rfq_id := p_rfq_id;
    v_thread := public._ensure_quotation_thread(p_rfq_id);

    if v_thread.status = 'withdrawn' then
      raise exception 'Withdrawn quotation threads cannot submit new quotes. Create a revision after reopen is supported.';
    end if;

    if exists (
      select 1 from public.quotation_offers o
      where o.thread_id = v_thread.id and o.status = 'submitted'
    ) then
      raise exception 'An active quotation already exists. Use create_quotation_revision to revise.';
    end if;

    if exists (
      select 1 from public.quotation_offers o
      where o.thread_id = v_thread.id and o.status = 'draft'
    ) then
      raise exception 'A draft exists. Submit it with p_offer_id or update it first.';
    end if;

    insert into public.quotation_offers (
      thread_id, revision_no, offered_by, currency, unit_price, price_unit,
      total_price, incoterm, lead_time_min, lead_time_max, lead_time_unit,
      moq_quantity, moq_unit, validity_until, notes, linked_product_id,
      status, created_by, submitted_at
    )
    values (
      v_thread.id,
      (select coalesce(max(o.revision_no), 0) + 1 from public.quotation_offers o where o.thread_id = v_thread.id),
      'supplier',
      coalesce(nullif(btrim(p_currency), ''), 'USD'),
      p_unit_price, coalesce(p_price_unit, ''), p_total_price,
      coalesce(p_incoterm, ''), p_lead_time_min, p_lead_time_max,
      coalesce(nullif(btrim(p_lead_time_unit), ''), 'days'),
      p_moq_quantity, coalesce(p_moq_unit, ''), p_validity_until,
      coalesce(p_notes, ''), p_linked_product_id,
      'submitted', auth.uid(), now()
    )
    returning * into v_offer;
  end if;

  v_from := v_thread.status;

  update public.quotation_threads qt
  set status = 'active',
      current_offer_id = v_offer.id,
      updated_at = now()
  where qt.id = v_thread.id;

  perform public._append_quotation_event(
    v_thread.id, v_offer.id, 'offer.submitted', 'user', auth.uid(),
    'draft', 'submitted', 'Quotation submitted',
    jsonb_build_object('revision_no', v_offer.revision_no)
  );

  perform public._recompute_rfq_quote_status(v_rfq_id);

  perform public._notify_rfq_buyer_quotation(
    v_rfq_id,
    v_thread.id,
    'quotation.submitted',
    'New quotation received',
    format('A supplier submitted a quotation on RFQ "%s".', v_rfq.title),
    'high'
  );

  return v_offer;
end;
$$;

revoke all on function public.submit_quotation(
  uuid, uuid, text, numeric, text, numeric, text, integer, integer, text, numeric, text,
  timestamptz, text, uuid
) from public;
grant execute on function public.submit_quotation(
  uuid, uuid, text, numeric, text, numeric, text, integer, integer, text, numeric, text,
  timestamptz, text, uuid
) to authenticated;

create or replace function public.create_quotation_revision(
  p_thread_id uuid,
  p_currency text default 'USD',
  p_unit_price numeric default null,
  p_price_unit text default '',
  p_total_price numeric default null,
  p_incoterm text default '',
  p_lead_time_min integer default null,
  p_lead_time_max integer default null,
  p_lead_time_unit text default 'days',
  p_moq_quantity numeric default null,
  p_moq_unit text default '',
  p_validity_until timestamptz default null,
  p_notes text default '',
  p_linked_product_id uuid default null
)
returns public.quotation_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.quotation_threads;
  v_rfq public.rfqs;
  v_prev public.quotation_offers;
  v_offer public.quotation_offers;
  v_next_rev integer;
begin
  select * into v_thread from public.quotation_threads qt where qt.id = p_thread_id;
  if not found then
    raise exception 'Quotation thread not found';
  end if;

  if not public.user_owns_company(v_thread.supplier_company_id) then
    raise exception 'You cannot revise a quotation you do not own';
  end if;

  if v_thread.status = 'withdrawn' then
    raise exception 'Cannot revise a withdrawn quotation thread';
  end if;

  v_rfq := public._assert_supplier_can_quote(v_thread.rfq_id);

  if p_unit_price is null then
    raise exception 'Unit price is required for a quotation revision';
  end if;

  select * into v_prev
  from public.quotation_offers o
  where o.thread_id = v_thread.id
    and o.status = 'submitted'
  order by o.revision_no desc
  limit 1;

  if not found then
    raise exception 'No submitted quotation to revise. Use submit_quotation first.';
  end if;

  if exists (
    select 1 from public.quotation_offers o
    where o.thread_id = v_thread.id and o.status = 'draft'
  ) then
    raise exception 'Resolve or submit the existing draft before creating a revision';
  end if;

  update public.quotation_offers o
  set status = 'superseded', updated_at = now()
  where o.id = v_prev.id;

  select coalesce(max(o.revision_no), 0) + 1 into v_next_rev
  from public.quotation_offers o
  where o.thread_id = v_thread.id;

  insert into public.quotation_offers (
    thread_id, revision_no, offered_by, supersedes_offer_id, currency, unit_price,
    price_unit, total_price, incoterm, lead_time_min, lead_time_max, lead_time_unit,
    moq_quantity, moq_unit, validity_until, notes, linked_product_id,
    status, created_by, submitted_at
  )
  values (
    v_thread.id, v_next_rev, 'supplier', v_prev.id,
    coalesce(nullif(btrim(p_currency), ''), 'USD'),
    p_unit_price, coalesce(p_price_unit, ''), p_total_price,
    coalesce(p_incoterm, ''), p_lead_time_min, p_lead_time_max,
    coalesce(nullif(btrim(p_lead_time_unit), ''), 'days'),
    p_moq_quantity, coalesce(p_moq_unit, ''), p_validity_until,
    coalesce(p_notes, ''), p_linked_product_id,
    'submitted', auth.uid(), now()
  )
  returning * into v_offer;

  update public.quotation_threads qt
  set current_offer_id = v_offer.id,
      status = 'active',
      updated_at = now()
  where qt.id = v_thread.id;

  perform public._append_quotation_event(
    v_thread.id, v_offer.id, 'offer.revised', 'user', auth.uid(),
    'submitted', 'submitted', 'Quotation revised',
    jsonb_build_object(
      'revision_no', v_offer.revision_no,
      'supersedes_offer_id', v_prev.id
    )
  );

  perform public._notify_rfq_buyer_quotation(
    v_thread.rfq_id,
    v_thread.id,
    'quotation.updated',
    'Quotation updated',
    format('A supplier revised their quotation on RFQ "%s".', v_rfq.title),
    'high'
  );

  return v_offer;
end;
$$;

revoke all on function public.create_quotation_revision(
  uuid, text, numeric, text, numeric, text, integer, integer, text, numeric, text,
  timestamptz, text, uuid
) from public;
grant execute on function public.create_quotation_revision(
  uuid, text, numeric, text, numeric, text, integer, integer, text, numeric, text,
  timestamptz, text, uuid
) to authenticated;

create or replace function public.withdraw_quotation(p_thread_id uuid)
returns public.quotation_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.quotation_threads;
  v_rfq public.rfqs;
  v_offer public.quotation_offers;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_thread from public.quotation_threads qt where qt.id = p_thread_id for update;
  if not found then
    raise exception 'Quotation thread not found';
  end if;

  if not public.user_owns_company(v_thread.supplier_company_id) then
    raise exception 'You cannot withdraw a quotation you do not own';
  end if;

  if v_thread.status = 'withdrawn' then
    raise exception 'Quotation thread is already withdrawn';
  end if;

  select * into v_rfq from public.rfqs r where r.id = v_thread.rfq_id;

  -- Withdraw active submitted + any draft
  update public.quotation_offers o
  set status = 'withdrawn',
      withdrawn_at = now(),
      updated_at = now()
  where o.thread_id = v_thread.id
    and o.status in ('draft', 'submitted');

  select * into v_offer
  from public.quotation_offers o
  where o.thread_id = v_thread.id
  order by o.revision_no desc
  limit 1;

  update public.quotation_threads qt
  set status = 'withdrawn', updated_at = now()
  where qt.id = p_thread_id
  returning * into v_thread;

  perform public._append_quotation_event(
    v_thread.id, v_offer.id, 'thread.withdrawn', 'user', auth.uid(),
    'active', 'withdrawn', 'Quotation withdrawn', '{}'::jsonb
  );

  perform public._recompute_rfq_quote_status(v_thread.rfq_id);

  if exists (
    select 1 from public.quotation_offers o
    where o.thread_id = v_thread.id
      and o.status = 'withdrawn'
      and o.submitted_at is not null
  ) then
    perform public._notify_rfq_buyer_quotation(
      v_thread.rfq_id,
      v_thread.id,
      'quotation.withdrawn',
      'Quotation withdrawn',
      format('A supplier withdrew their quotation on RFQ "%s".', v_rfq.title),
      'normal'
    );
  end if;

  return v_thread;
end;
$$;

revoke all on function public.withdraw_quotation(uuid) from public;
grant execute on function public.withdraw_quotation(uuid) to authenticated;

create or replace function public.get_quotation_thread(p_thread_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.quotation_threads;
  v_rfq public.rfqs;
  v_result jsonb;
  v_is_buyer boolean;
  v_is_supplier_owner boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_thread from public.quotation_threads qt where qt.id = p_thread_id;
  if not found then
    raise exception 'Quotation thread not found';
  end if;

  select * into v_rfq from public.rfqs r where r.id = v_thread.rfq_id;

  v_is_buyer := public.user_owns_company(v_rfq.buyer_company_id);
  v_is_supplier_owner := public.user_owns_company(v_thread.supplier_company_id);

  if not (public.is_admin() or v_is_buyer or v_is_supplier_owner) then
    raise exception 'Access denied';
  end if;

  select jsonb_build_object(
    'thread', to_jsonb(v_thread),
    'rfq', jsonb_build_object(
      'id', v_rfq.id,
      'title', v_rfq.title,
      'product_name', v_rfq.product_name,
      'status', v_rfq.status,
      'visibility', v_rfq.visibility,
      'buyer_company_id', v_rfq.buyer_company_id
    ),
    'offers', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.revision_no)
      from public.quotation_offers o
      where o.thread_id = v_thread.id
        and (
          v_is_supplier_owner
          or public.is_admin()
          or o.status <> 'draft'
        )
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from public.quotation_events e
      where e.thread_id = v_thread.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_quotation_thread(uuid) from public;
grant execute on function public.get_quotation_thread(uuid) to authenticated;

commit;
