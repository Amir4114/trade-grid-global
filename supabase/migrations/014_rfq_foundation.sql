-- Trade Grid Global: RFQ Foundation (Sprint 14.1 Phase A)
--
-- Adds buyer RFQ lifecycle (draft → open → closed/cancelled), visibility model,
-- invites, attachments metadata, immutable events, private storage, and
-- trusted notifications. Quotations, negotiation, and matching are OUT OF SCOPE.
--
-- Depends on: is_admin(), is_supplier(), user_owns_company(),
--             _create_system_notification (011).
-- Additive / idempotent / fail-closed. Does NOT modify migrations 001–013.

begin;

-- ---------------------------------------------------------------------------
-- 1) Role helper
-- ---------------------------------------------------------------------------
create or replace function public.is_buyer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'buyer'
  );
$$;

revoke all on function public.is_buyer() from public;
grant execute on function public.is_buyer() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Core tables
-- ---------------------------------------------------------------------------
create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  product_name text not null,
  category text not null,
  description text not null default '',
  quantity_value numeric,
  quantity_unit text not null default '',
  packaging_requirement text not null default '',
  target_country text not null default '',
  delivery_port text not null default '',
  required_certifications text[] not null default '{}',
  preferred_incoterms text[] not null default '{}',
  quote_deadline_at timestamptz,
  notes text not null default '',
  linked_product_id uuid references public.products(id) on delete set null,
  visibility text not null default 'verified_suppliers_only'
    check (visibility in ('public', 'verified_suppliers_only', 'invite_only')),
  status text not null default 'draft'
    check (status in (
      'draft', 'open', 'quoted', 'awarded', 'closed', 'cancelled', 'expired'
    )),
  published_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rfqs_buyer_company_id_idx
  on public.rfqs (buyer_company_id);

create index if not exists rfqs_status_deadline_idx
  on public.rfqs (status, quote_deadline_at);

create index if not exists rfqs_category_status_idx
  on public.rfqs (category, status)
  where status in ('open', 'quoted');

create index if not exists rfqs_target_country_idx
  on public.rfqs (target_country);

create index if not exists rfqs_visibility_status_idx
  on public.rfqs (visibility, status)
  where status in ('open', 'quoted');

create table if not exists public.rfq_attachments (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null default '',
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists rfq_attachments_rfq_id_idx
  on public.rfq_attachments (rfq_id);

create table if not exists public.rfq_events (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
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

create index if not exists rfq_events_rfq_created_idx
  on public.rfq_events (rfq_id, created_at desc);

create table if not exists public.rfq_invites (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_company_id uuid not null references public.companies(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (rfq_id, supplier_company_id)
);

create index if not exists rfq_invites_supplier_idx
  on public.rfq_invites (supplier_company_id, status);

create index if not exists rfq_invites_rfq_idx
  on public.rfq_invites (rfq_id);

revoke all on table public.rfqs from public;
revoke all on table public.rfq_attachments from public;
revoke all on table public.rfq_events from public;
revoke all on table public.rfq_invites from public;

grant select on table public.rfqs to authenticated;
grant select on table public.rfq_attachments to authenticated;
grant select on table public.rfq_events to authenticated;
grant select, insert, delete on table public.rfq_invites to authenticated;
grant select, insert, delete on table public.rfq_attachments to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Access helpers
-- ---------------------------------------------------------------------------
create or replace function public._append_rfq_event(
  p_rfq_id uuid,
  p_event_type text,
  p_actor_type text,
  p_actor_user_id uuid,
  p_from_status text default null,
  p_to_status text default null,
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.rfq_events
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.rfq_events;
begin
  insert into public.rfq_events (
    rfq_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    message,
    metadata
  )
  values (
    p_rfq_id,
    p_event_type,
    p_actor_type,
    p_actor_user_id,
    p_from_status,
    p_to_status,
    p_message,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into created;

  return created;
end;
$$;

revoke all on function public._append_rfq_event(
  uuid, text, text, uuid, text, text, text, jsonb
) from public;
revoke all on function public._append_rfq_event(
  uuid, text, text, uuid, text, text, text, jsonb
) from anon;
revoke all on function public._append_rfq_event(
  uuid, text, text, uuid, text, text, text, jsonb
) from authenticated;

create or replace function public.supplier_can_access_rfq(p_rfq_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rfqs r
    where r.id = p_rfq_id
      and r.status in ('open', 'quoted')
      and public.is_supplier()
      and (
        r.visibility = 'public'
        or (
          r.visibility = 'verified_suppliers_only'
          and exists (
            select 1
            from public.companies c
            where c.user_id = auth.uid()
              and c.verification_status = 'verified'
          )
        )
        or (
          r.visibility = 'invite_only'
          and exists (
            select 1
            from public.rfq_invites i
            join public.companies c on c.id = i.supplier_company_id
            where i.rfq_id = r.id
              and c.user_id = auth.uid()
              and i.status in ('pending', 'accepted')
          )
        )
      )
  );
$$;

revoke all on function public.supplier_can_access_rfq(uuid) from public;
grant execute on function public.supplier_can_access_rfq(uuid) to authenticated;

create or replace function public._replace_draft_rfq_invites(
  p_rfq_id uuid,
  p_supplier_company_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier_id uuid;
  v_account_type text;
begin
  delete from public.rfq_invites where rfq_id = p_rfq_id;

  if p_supplier_company_ids is null then
    return;
  end if;

  foreach v_supplier_id in array p_supplier_company_ids
  loop
    if v_supplier_id is null then
      continue;
    end if;

    select account_type into v_account_type
    from public.companies
    where id = v_supplier_id;

    if v_account_type is null then
      raise exception 'Invite target company not found: %', v_supplier_id;
    end if;

    if v_account_type is distinct from 'supplier' then
      raise exception 'Only supplier companies can be invited';
    end if;

    insert into public.rfq_invites (
      rfq_id,
      supplier_company_id,
      invited_by,
      status
    )
    values (
      p_rfq_id,
      v_supplier_id,
      auth.uid(),
      'pending'
    )
    on conflict (rfq_id, supplier_company_id) do nothing;
  end loop;
end;
$$;

revoke all on function public._replace_draft_rfq_invites(uuid, uuid[]) from public;
revoke all on function public._replace_draft_rfq_invites(uuid, uuid[]) from anon;
revoke all on function public._replace_draft_rfq_invites(uuid, uuid[]) from authenticated;

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
alter table public.rfqs enable row level security;
alter table public.rfq_attachments enable row level security;
alter table public.rfq_events enable row level security;
alter table public.rfq_invites enable row level security;

drop policy if exists "Buyers read own rfqs" on public.rfqs;
create policy "Buyers read own rfqs"
  on public.rfqs for select
  using (public.user_owns_company(buyer_company_id));

drop policy if exists "Suppliers read discoverable rfqs" on public.rfqs;
create policy "Suppliers read discoverable rfqs"
  on public.rfqs for select
  using (public.supplier_can_access_rfq(id));

drop policy if exists "Admins read all rfqs" on public.rfqs;
create policy "Admins read all rfqs"
  on public.rfqs for select
  using (public.is_admin());

-- No direct INSERT/UPDATE/DELETE on rfqs — lifecycle via SECURITY DEFINER RPCs.

drop policy if exists "Parties read rfq attachments" on public.rfq_attachments;
create policy "Parties read rfq attachments"
  on public.rfq_attachments for select
  using (
    exists (
      select 1 from public.rfqs r
      where r.id = rfq_id
        and (
          public.user_owns_company(r.buyer_company_id)
          or public.supplier_can_access_rfq(r.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists "Buyers insert draft rfq attachments" on public.rfq_attachments;
create policy "Buyers insert draft rfq attachments"
  on public.rfq_attachments for insert
  with check (
    exists (
      select 1 from public.rfqs r
      where r.id = rfq_id
        and r.status = 'draft'
        and public.user_owns_company(r.buyer_company_id)
    )
    and uploaded_by = auth.uid()
  );

drop policy if exists "Buyers delete draft rfq attachments" on public.rfq_attachments;
create policy "Buyers delete draft rfq attachments"
  on public.rfq_attachments for delete
  using (
    exists (
      select 1 from public.rfqs r
      where r.id = rfq_id
        and r.status = 'draft'
        and public.user_owns_company(r.buyer_company_id)
    )
  );

drop policy if exists "Parties read rfq events" on public.rfq_events;
create policy "Parties read rfq events"
  on public.rfq_events for select
  using (
    exists (
      select 1 from public.rfqs r
      where r.id = rfq_id
        and (
          public.user_owns_company(r.buyer_company_id)
          or public.supplier_can_access_rfq(r.id)
          or public.is_admin()
        )
    )
  );

drop policy if exists "Buyers read own rfq invites" on public.rfq_invites;
create policy "Buyers read own rfq invites"
  on public.rfq_invites for select
  using (
    exists (
      select 1 from public.rfqs r
      where r.id = rfq_id
        and public.user_owns_company(r.buyer_company_id)
    )
  );

drop policy if exists "Suppliers read own invites" on public.rfq_invites;
create policy "Suppliers read own invites"
  on public.rfq_invites for select
  using (
    exists (
      select 1 from public.companies c
      where c.id = supplier_company_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Admins read all rfq invites" on public.rfq_invites;
create policy "Admins read all rfq invites"
  on public.rfq_invites for select
  using (public.is_admin());

drop policy if exists "Buyers manage draft rfq invites" on public.rfq_invites;
create policy "Buyers manage draft rfq invites"
  on public.rfq_invites for insert
  with check (
    exists (
      select 1 from public.rfqs r
      where r.id = rfq_id
        and r.status = 'draft'
        and public.user_owns_company(r.buyer_company_id)
    )
  );

drop policy if exists "Buyers delete draft rfq invites" on public.rfq_invites;
create policy "Buyers delete draft rfq invites"
  on public.rfq_invites for delete
  using (
    exists (
      select 1 from public.rfqs r
      where r.id = rfq_id
        and r.status = 'draft'
        and public.user_owns_company(r.buyer_company_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Storage bucket (private)
-- Path: rfqs/<buyer_company_id>/<rfq_id>/<filename>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rfq-docs',
  'rfq-docs',
  false,
  10485760, -- 10 MB
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

create or replace function public.buyer_owns_rfq_storage_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[];
  company_id_text text;
  rfq_id_text text;
  company_uuid uuid;
  rfq_uuid uuid;
begin
  parts := storage.foldername(object_name);
  if array_length(parts, 1) is null or array_length(parts, 1) < 3 then
    return false;
  end if;

  if parts[1] is distinct from 'rfqs' then
    return false;
  end if;

  company_id_text := parts[2];
  rfq_id_text := parts[3];

  begin
    company_uuid := company_id_text::uuid;
    rfq_uuid := rfq_id_text::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1
    from public.rfqs r
    where r.id = rfq_uuid
      and r.buyer_company_id = company_uuid
      and public.user_owns_company(r.buyer_company_id)
  );
end;
$$;

revoke all on function public.buyer_owns_rfq_storage_path(text) from public;
grant execute on function public.buyer_owns_rfq_storage_path(text) to authenticated;

drop policy if exists "Buyers upload rfq docs" on storage.objects;
create policy "Buyers upload rfq docs"
  on storage.objects for insert
  with check (
    bucket_id = 'rfq-docs'
    and public.is_buyer()
    and public.buyer_owns_rfq_storage_path(name)
  );

drop policy if exists "Buyers update own rfq docs" on storage.objects;
create policy "Buyers update own rfq docs"
  on storage.objects for update
  using (
    bucket_id = 'rfq-docs'
    and public.buyer_owns_rfq_storage_path(name)
  )
  with check (
    bucket_id = 'rfq-docs'
    and public.buyer_owns_rfq_storage_path(name)
  );

drop policy if exists "Buyers delete own rfq docs" on storage.objects;
create policy "Buyers delete own rfq docs"
  on storage.objects for delete
  using (
    bucket_id = 'rfq-docs'
    and public.buyer_owns_rfq_storage_path(name)
  );

create or replace function public.supplier_can_read_rfq_storage_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[];
  rfq_id_text text;
  rfq_uuid uuid;
begin
  if not public.is_supplier() then
    return false;
  end if;

  parts := storage.foldername(object_name);
  if array_length(parts, 1) is null or array_length(parts, 1) < 3 then
    return false;
  end if;

  if parts[1] is distinct from 'rfqs' then
    return false;
  end if;

  rfq_id_text := parts[3];
  begin
    rfq_uuid := rfq_id_text::uuid;
  exception when others then
    return false;
  end;

  return public.supplier_can_access_rfq(rfq_uuid);
end;
$$;

revoke all on function public.supplier_can_read_rfq_storage_path(text) from public;
grant execute on function public.supplier_can_read_rfq_storage_path(text) to authenticated;

drop policy if exists "Parties read rfq docs" on storage.objects;
create policy "Parties read rfq docs"
  on storage.objects for select
  using (
    bucket_id = 'rfq-docs'
    and (
      public.buyer_owns_rfq_storage_path(name)
      or public.is_admin()
      or public.supplier_can_read_rfq_storage_path(name)
    )
  );

-- ---------------------------------------------------------------------------
-- 6) Lifecycle RPCs
-- ---------------------------------------------------------------------------
create or replace function public.create_draft_rfq(
  p_title text,
  p_product_name text,
  p_category text,
  p_description text default '',
  p_quantity_value numeric default null,
  p_quantity_unit text default '',
  p_packaging_requirement text default '',
  p_target_country text default '',
  p_delivery_port text default '',
  p_required_certifications text[] default '{}',
  p_preferred_incoterms text[] default '{}',
  p_quote_deadline_at timestamptz default null,
  p_notes text default '',
  p_visibility text default 'verified_suppliers_only',
  p_linked_product_id uuid default null,
  p_invite_supplier_ids uuid[] default '{}'
)
returns public.rfqs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_rfq public.rfqs;
  v_visibility text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can create RFQs';
  end if;

  select id into v_company_id
  from public.companies
  where user_id = auth.uid();

  if v_company_id is null then
    raise exception 'Buyer company profile is required';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'Title is required';
  end if;

  if p_product_name is null or btrim(p_product_name) = '' then
    raise exception 'Product name is required';
  end if;

  if p_category is null or btrim(p_category) = '' then
    raise exception 'Category is required';
  end if;

  v_visibility := coalesce(nullif(btrim(p_visibility), ''), 'verified_suppliers_only');
  if v_visibility not in ('public', 'verified_suppliers_only', 'invite_only') then
    raise exception 'Invalid visibility';
  end if;

  if p_linked_product_id is not null then
    if not exists (
      select 1 from public.products
      where id = p_linked_product_id
        and status = 'published'
    ) then
      raise exception 'linked_product_id must reference a published product';
    end if;
  end if;

  insert into public.rfqs (
    buyer_company_id,
    created_by,
    title,
    product_name,
    category,
    description,
    quantity_value,
    quantity_unit,
    packaging_requirement,
    target_country,
    delivery_port,
    required_certifications,
    preferred_incoterms,
    quote_deadline_at,
    notes,
    linked_product_id,
    visibility,
    status
  )
  values (
    v_company_id,
    auth.uid(),
    btrim(p_title),
    btrim(p_product_name),
    btrim(p_category),
    coalesce(p_description, ''),
    p_quantity_value,
    coalesce(p_quantity_unit, ''),
    coalesce(p_packaging_requirement, ''),
    coalesce(p_target_country, ''),
    coalesce(p_delivery_port, ''),
    coalesce(p_required_certifications, '{}'),
    coalesce(p_preferred_incoterms, '{}'),
    p_quote_deadline_at,
    coalesce(p_notes, ''),
    p_linked_product_id,
    v_visibility,
    'draft'
  )
  returning * into v_rfq;

  perform public._replace_draft_rfq_invites(v_rfq.id, p_invite_supplier_ids);

  perform public._append_rfq_event(
    v_rfq.id,
    'rfq.created',
    'user',
    auth.uid(),
    null,
    'draft',
    'Draft RFQ created',
    jsonb_build_object('visibility', v_rfq.visibility)
  );

  return v_rfq;
end;
$$;

revoke all on function public.create_draft_rfq(
  text, text, text, text, numeric, text, text, text, text, text[], text[],
  timestamptz, text, text, uuid, uuid[]
) from public;
grant execute on function public.create_draft_rfq(
  text, text, text, text, numeric, text, text, text, text, text[], text[],
  timestamptz, text, text, uuid, uuid[]
) to authenticated;

create or replace function public.update_draft_rfq(
  p_rfq_id uuid,
  p_title text default null,
  p_product_name text default null,
  p_category text default null,
  p_description text default null,
  p_quantity_value numeric default null,
  p_quantity_unit text default null,
  p_packaging_requirement text default null,
  p_target_country text default null,
  p_delivery_port text default null,
  p_required_certifications text[] default null,
  p_preferred_incoterms text[] default null,
  p_quote_deadline_at timestamptz default null,
  p_clear_quote_deadline boolean default false,
  p_notes text default null,
  p_visibility text default null,
  p_linked_product_id uuid default null,
  p_clear_linked_product boolean default false,
  p_invite_supplier_ids uuid[] default null
)
returns public.rfqs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.rfqs;
  v_visibility text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can update RFQs';
  end if;

  select * into v_rfq from public.rfqs where id = p_rfq_id;
  if not found then
    raise exception 'RFQ not found';
  end if;

  if not public.user_owns_company(v_rfq.buyer_company_id) then
    raise exception 'You cannot update an RFQ you do not own';
  end if;

  if v_rfq.status <> 'draft' then
    raise exception 'Only draft RFQs can be updated';
  end if;

  if p_visibility is not null then
    v_visibility := btrim(p_visibility);
    if v_visibility not in ('public', 'verified_suppliers_only', 'invite_only') then
      raise exception 'Invalid visibility';
    end if;
  else
    v_visibility := v_rfq.visibility;
  end if;

  if p_linked_product_id is not null then
    if not exists (
      select 1 from public.products
      where id = p_linked_product_id
        and status = 'published'
    ) then
      raise exception 'linked_product_id must reference a published product';
    end if;
  end if;

  update public.rfqs
  set
    title = coalesce(nullif(btrim(p_title), ''), title),
    product_name = coalesce(nullif(btrim(p_product_name), ''), product_name),
    category = coalesce(nullif(btrim(p_category), ''), category),
    description = coalesce(p_description, description),
    quantity_value = case
      when p_quantity_value is not null then p_quantity_value
      else quantity_value
    end,
    quantity_unit = coalesce(p_quantity_unit, quantity_unit),
    packaging_requirement = coalesce(p_packaging_requirement, packaging_requirement),
    target_country = coalesce(p_target_country, target_country),
    delivery_port = coalesce(p_delivery_port, delivery_port),
    required_certifications = coalesce(p_required_certifications, required_certifications),
    preferred_incoterms = coalesce(p_preferred_incoterms, preferred_incoterms),
    quote_deadline_at = case
      when p_clear_quote_deadline then null
      when p_quote_deadline_at is not null then p_quote_deadline_at
      else quote_deadline_at
    end,
    notes = coalesce(p_notes, notes),
    visibility = v_visibility,
    linked_product_id = case
      when p_clear_linked_product then null
      when p_linked_product_id is not null then p_linked_product_id
      else linked_product_id
    end,
    updated_at = now()
  where id = p_rfq_id
  returning * into v_rfq;

  if p_invite_supplier_ids is not null then
    perform public._replace_draft_rfq_invites(v_rfq.id, p_invite_supplier_ids);
  end if;

  perform public._append_rfq_event(
    v_rfq.id,
    'rfq.updated',
    'user',
    auth.uid(),
    'draft',
    'draft',
    'Draft RFQ updated',
    jsonb_build_object('visibility', v_rfq.visibility)
  );

  return v_rfq;
end;
$$;

revoke all on function public.update_draft_rfq(
  uuid, text, text, text, text, numeric, text, text, text, text, text[], text[],
  timestamptz, boolean, text, text, uuid, boolean, uuid[]
) from public;
grant execute on function public.update_draft_rfq(
  uuid, text, text, text, text, numeric, text, text, text, text, text[], text[],
  timestamptz, boolean, text, text, uuid, boolean, uuid[]
) to authenticated;

create or replace function public.publish_rfq(p_rfq_id uuid)
returns public.rfqs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.rfqs;
  v_onboarding boolean;
  v_owner_user_id uuid;
  v_invite record;
  v_invite_count integer;
  v_supplier_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can publish RFQs';
  end if;

  select * into v_rfq from public.rfqs where id = p_rfq_id for update;
  if not found then
    raise exception 'RFQ not found';
  end if;

  if not public.user_owns_company(v_rfq.buyer_company_id) then
    raise exception 'You cannot publish an RFQ you do not own';
  end if;

  if v_rfq.status <> 'draft' then
    raise exception 'Only draft RFQs can be published';
  end if;

  select onboarding_completed, user_id
    into v_onboarding, v_owner_user_id
  from public.companies
  where id = v_rfq.buyer_company_id;

  if not coalesce(v_onboarding, false) then
    raise exception 'Complete your company onboarding before publishing RFQs';
  end if;

  if v_rfq.quote_deadline_at is not null
     and v_rfq.quote_deadline_at <= now() then
    raise exception 'Quote deadline must be in the future';
  end if;

  if v_rfq.visibility = 'invite_only' then
    select count(*) into v_invite_count
    from public.rfq_invites
    where rfq_id = v_rfq.id
      and status in ('pending', 'accepted');

    if coalesce(v_invite_count, 0) < 1 then
      raise exception 'Invite-only RFQs require at least one supplier invite';
    end if;
  end if;

  update public.rfqs
  set
    status = 'open',
    published_at = now(),
    updated_at = now()
  where id = p_rfq_id
  returning * into v_rfq;

  perform public._append_rfq_event(
    v_rfq.id,
    'rfq.published',
    'user',
    auth.uid(),
    'draft',
    'open',
    'RFQ published',
    jsonb_build_object('visibility', v_rfq.visibility)
  );

  perform public._create_system_notification(
    v_owner_user_id,
    'rfq.published',
    'RFQ published',
    format('Your RFQ "%s" is now open for supplier quotations.', v_rfq.title),
    'rfq',
    v_rfq.id,
    format('/dashboard/buyer/rfqs/%s', v_rfq.id),
    jsonb_build_object('visibility', v_rfq.visibility),
    'normal'
  );

  for v_invite in
    select *
    from public.rfq_invites
    where rfq_id = v_rfq.id
      and status in ('pending', 'accepted')
  loop
    select user_id into v_supplier_user_id
    from public.companies
    where id = v_invite.supplier_company_id;

    if v_supplier_user_id is not null then
      perform public._create_system_notification(
        v_supplier_user_id,
        'rfq.invited',
        'You are invited to quote',
        format('A buyer invited your company to quote on RFQ "%s".', v_rfq.title),
        'rfq',
        v_rfq.id,
        format('/dashboard/supplier/rfqs/%s', v_rfq.id),
        jsonb_build_object(
          'invite_id', v_invite.id,
          'visibility', v_rfq.visibility
        ),
        'high'
      );
    end if;
  end loop;

  return v_rfq;
end;
$$;

revoke all on function public.publish_rfq(uuid) from public;
grant execute on function public.publish_rfq(uuid) to authenticated;

create or replace function public.cancel_rfq(
  p_rfq_id uuid,
  p_reason text default null
)
returns public.rfqs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.rfqs;
  v_from_status text;
  v_owner_user_id uuid;
  v_invite record;
  v_supplier_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can cancel RFQs';
  end if;

  select * into v_rfq from public.rfqs where id = p_rfq_id for update;
  if not found then
    raise exception 'RFQ not found';
  end if;

  if not public.user_owns_company(v_rfq.buyer_company_id) then
    raise exception 'You cannot cancel an RFQ you do not own';
  end if;

  if v_rfq.status not in ('draft', 'open', 'quoted') then
    raise exception 'Only draft, open, or quoted RFQs can be cancelled';
  end if;

  if v_rfq.status = 'awarded' then
    raise exception 'Awarded RFQs cannot be cancelled';
  end if;

  v_from_status := v_rfq.status;

  select user_id into v_owner_user_id
  from public.companies
  where id = v_rfq.buyer_company_id;

  update public.rfqs
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = nullif(btrim(coalesce(p_reason, '')), ''),
    updated_at = now()
  where id = p_rfq_id
  returning * into v_rfq;

  perform public._append_rfq_event(
    v_rfq.id,
    'rfq.cancelled',
    'user',
    auth.uid(),
    v_from_status,
    'cancelled',
    coalesce(v_rfq.cancellation_reason, 'RFQ cancelled'),
    '{}'::jsonb
  );

  perform public._create_system_notification(
    v_owner_user_id,
    'rfq.cancelled',
    'RFQ cancelled',
    format('Your RFQ "%s" has been cancelled.', v_rfq.title),
    'rfq',
    v_rfq.id,
    format('/dashboard/buyer/rfqs/%s', v_rfq.id),
    jsonb_build_object('from_status', v_from_status),
    'normal'
  );

  if v_from_status in ('open', 'quoted') then
    for v_invite in
      select *
      from public.rfq_invites
      where rfq_id = v_rfq.id
        and status in ('pending', 'accepted')
    loop
      select user_id into v_supplier_user_id
      from public.companies
      where id = v_invite.supplier_company_id;

      if v_supplier_user_id is not null then
        perform public._create_system_notification(
          v_supplier_user_id,
          'rfq.cancelled',
          'RFQ cancelled',
          format('RFQ "%s" was cancelled by the buyer.', v_rfq.title),
          'rfq',
          v_rfq.id,
          '/dashboard/supplier/rfqs',
          jsonb_build_object('from_status', v_from_status),
          'normal'
        );
      end if;
    end loop;
  end if;

  return v_rfq;
end;
$$;

revoke all on function public.cancel_rfq(uuid, text) from public;
grant execute on function public.cancel_rfq(uuid, text) to authenticated;

-- close_rfq (defined after cancel for final CREATE OR REPLACE)
create or replace function public.close_rfq(p_rfq_id uuid)
returns public.rfqs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.rfqs;
  v_from_status text;
  v_owner_user_id uuid;
  v_invite record;
  v_supplier_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can close RFQs';
  end if;

  select * into v_rfq from public.rfqs where id = p_rfq_id for update;
  if not found then
    raise exception 'RFQ not found';
  end if;

  if not public.user_owns_company(v_rfq.buyer_company_id) then
    raise exception 'You cannot close an RFQ you do not own';
  end if;

  if v_rfq.status not in ('open', 'quoted') then
    raise exception 'Only open or quoted RFQs can be closed';
  end if;

  v_from_status := v_rfq.status;

  select user_id into v_owner_user_id
  from public.companies
  where id = v_rfq.buyer_company_id;

  update public.rfqs
  set
    status = 'closed',
    closed_at = now(),
    updated_at = now()
  where id = p_rfq_id
  returning * into v_rfq;

  perform public._append_rfq_event(
    v_rfq.id,
    'rfq.closed',
    'user',
    auth.uid(),
    v_from_status,
    'closed',
    'RFQ closed',
    '{}'::jsonb
  );

  perform public._create_system_notification(
    v_owner_user_id,
    'rfq.closed',
    'RFQ closed',
    format('Your RFQ "%s" has been closed.', v_rfq.title),
    'rfq',
    v_rfq.id,
    format('/dashboard/buyer/rfqs/%s', v_rfq.id),
    '{}'::jsonb,
    'normal'
  );

  for v_invite in
    select *
    from public.rfq_invites
    where rfq_id = v_rfq.id
      and status in ('pending', 'accepted')
  loop
    select user_id into v_supplier_user_id
    from public.companies
    where id = v_invite.supplier_company_id;

    if v_supplier_user_id is not null then
      perform public._create_system_notification(
        v_supplier_user_id,
        'rfq.closed',
        'RFQ closed',
        format('RFQ "%s" is no longer open for quotations.', v_rfq.title),
        'rfq',
        v_rfq.id,
        format('/dashboard/supplier/rfqs/%s', v_rfq.id),
        '{}'::jsonb,
        'normal'
      );
    end if;
  end loop;

  return v_rfq;
end;
$$;

revoke all on function public.close_rfq(uuid) from public;
grant execute on function public.close_rfq(uuid) to authenticated;

commit;
