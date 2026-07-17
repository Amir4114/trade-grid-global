-- Trade Grid Global: Award & Supplier Selection (Module 2B)
--
-- Completes the RFQ → quotation → award procurement path.
-- Depends on migrations 014–015. Does NOT redesign existing tables.
-- Purchase orders, payments, negotiation chat, logistics, AI are OUT OF SCOPE.
--
-- Pre-delivery: multi-table SQL and RLS fully qualify shared column names.
-- SECURITY DEFINER functions set search_path = public. Vars use v_ prefixes.

begin;

-- ---------------------------------------------------------------------------
-- 1) Extend supplier RFQ read access for participants after award
--    (quoting still gated by _assert_supplier_can_quote → open|quoted only)
-- ---------------------------------------------------------------------------
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
      and public.is_supplier()
      and (
        -- Discoverable / quotable RFQs
        (
          r.status in ('open', 'quoted')
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
        )
        -- Or supplier already has a quotation thread (post-award visibility)
        or exists (
          select 1
          from public.quotation_threads t
          join public.companies c on c.id = t.supplier_company_id
          where t.rfq_id = r.id
            and c.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.supplier_can_access_rfq(uuid) from public;
grant execute on function public.supplier_can_access_rfq(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Tables
-- ---------------------------------------------------------------------------
create table if not exists public.quotation_awards (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  thread_id uuid not null references public.quotation_threads(id) on delete restrict,
  offer_id uuid not null references public.quotation_offers(id) on delete restrict,
  supplier_company_id uuid not null references public.companies(id) on delete restrict,
  awarded_by uuid references auth.users(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  notes text not null default '',
  awarded_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quotation_awards_one_active_per_rfq_idx
  on public.quotation_awards (rfq_id)
  where status = 'active';

create index if not exists quotation_awards_rfq_id_idx
  on public.quotation_awards (rfq_id, awarded_at desc);

create index if not exists quotation_awards_supplier_idx
  on public.quotation_awards (supplier_company_id, status);

create index if not exists quotation_awards_thread_idx
  on public.quotation_awards (thread_id);

create table if not exists public.award_events (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null references public.quotation_awards(id) on delete cascade,
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

create index if not exists award_events_award_idx
  on public.award_events (award_id, created_at desc);

revoke all on table public.quotation_awards from public;
revoke all on table public.award_events from public;

grant select on table public.quotation_awards to authenticated;
grant select on table public.award_events to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Helpers
-- ---------------------------------------------------------------------------
create or replace function public._append_award_event(
  p_award_id uuid,
  p_event_type text,
  p_actor_type text,
  p_actor_user_id uuid,
  p_from_status text default null,
  p_to_status text default null,
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.award_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created public.award_events;
begin
  insert into public.award_events (
    award_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    message,
    metadata
  )
  values (
    p_award_id,
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

revoke all on function public._append_award_event(
  uuid, text, text, uuid, text, text, text, jsonb
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
alter table public.quotation_awards enable row level security;
alter table public.award_events enable row level security;

drop policy if exists "Buyers read awards for own rfqs" on public.quotation_awards;
create policy "Buyers read awards for own rfqs"
  on public.quotation_awards for select
  using (
    exists (
      select 1
      from public.rfqs r
      where r.id = quotation_awards.rfq_id
        and public.user_owns_company(r.buyer_company_id)
    )
  );

drop policy if exists "Suppliers read own awards" on public.quotation_awards;
create policy "Suppliers read own awards"
  on public.quotation_awards for select
  using (public.user_owns_company(quotation_awards.supplier_company_id));

drop policy if exists "Admins read all awards" on public.quotation_awards;
create policy "Admins read all awards"
  on public.quotation_awards for select
  using (public.is_admin());

drop policy if exists "Buyers read award events for own rfqs" on public.award_events;
create policy "Buyers read award events for own rfqs"
  on public.award_events for select
  using (
    exists (
      select 1
      from public.quotation_awards a
      join public.rfqs r on r.id = a.rfq_id
      where a.id = award_events.award_id
        and public.user_owns_company(r.buyer_company_id)
    )
  );

drop policy if exists "Suppliers read own award events" on public.award_events;
create policy "Suppliers read own award events"
  on public.award_events for select
  using (
    exists (
      select 1
      from public.quotation_awards a
      where a.id = award_events.award_id
        and public.user_owns_company(a.supplier_company_id)
    )
  );

drop policy if exists "Admins read all award events" on public.award_events;
create policy "Admins read all award events"
  on public.award_events for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5) RPCs
-- ---------------------------------------------------------------------------
create or replace function public.award_supplier(
  p_rfq_id uuid,
  p_thread_id uuid,
  p_notes text default null
)
returns public.quotation_awards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.rfqs;
  v_thread public.quotation_threads;
  v_offer public.quotation_offers;
  v_award public.quotation_awards;
  v_buyer_user_id uuid;
  v_winner_user_id uuid;
  v_loser record;
  v_loser_user_id uuid;
  v_from_rfq_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_buyer() then
    raise exception 'Only buyers can award suppliers';
  end if;

  select * into v_rfq
  from public.rfqs r
  where r.id = p_rfq_id
  for update;

  if not found then
    raise exception 'RFQ not found';
  end if;

  if not public.user_owns_company(v_rfq.buyer_company_id) then
    raise exception 'You cannot award an RFQ you do not own';
  end if;

  if v_rfq.status = 'awarded' then
    raise exception 'This RFQ has already been awarded';
  end if;

  if v_rfq.status not in ('open', 'quoted') then
    raise exception 'Only open or quoted RFQs can be awarded';
  end if;

  if exists (
    select 1
    from public.quotation_awards a
    where a.rfq_id = p_rfq_id
      and a.status = 'active'
  ) then
    raise exception 'An active award already exists for this RFQ';
  end if;

  select * into v_thread
  from public.quotation_threads t
  where t.id = p_thread_id
  for update;

  if not found then
    raise exception 'Quotation thread not found';
  end if;

  if v_thread.rfq_id is distinct from p_rfq_id then
    raise exception 'Quotation thread does not belong to this RFQ';
  end if;

  if v_thread.status = 'withdrawn' then
    raise exception 'Cannot award a withdrawn quotation';
  end if;

  select * into v_offer
  from public.quotation_offers o
  where o.thread_id = v_thread.id
    and o.status = 'submitted'
    and o.offered_by = 'supplier'
  order by o.revision_no desc
  limit 1;

  if not found then
    raise exception 'No submitted quotation available to award on this thread';
  end if;

  v_from_rfq_status := v_rfq.status;

  insert into public.quotation_awards (
    rfq_id,
    thread_id,
    offer_id,
    supplier_company_id,
    awarded_by,
    status,
    notes,
    awarded_at
  )
  values (
    p_rfq_id,
    v_thread.id,
    v_offer.id,
    v_thread.supplier_company_id,
    auth.uid(),
    'active',
    coalesce(p_notes, ''),
    now()
  )
  returning * into v_award;

  -- Winning offer + thread
  update public.quotation_offers o
  set status = 'awarded',
      updated_at = now()
  where o.id = v_offer.id;

  update public.quotation_threads t
  set status = 'awarded',
      awarded_offer_id = v_offer.id,
      current_offer_id = v_offer.id,
      updated_at = now()
  where t.id = v_thread.id;

  -- Losing active submitted offers / threads on the same RFQ
  update public.quotation_offers o
  set status = 'not_selected',
      updated_at = now()
  from public.quotation_threads t
  where o.thread_id = t.id
    and t.rfq_id = p_rfq_id
    and t.id is distinct from v_thread.id
    and o.status = 'submitted'
    and o.offered_by = 'supplier';

  -- Withdraw leftover drafts on other threads
  update public.quotation_offers o
  set status = 'withdrawn',
      withdrawn_at = coalesce(o.withdrawn_at, now()),
      updated_at = now()
  from public.quotation_threads t
  where o.thread_id = t.id
    and t.rfq_id = p_rfq_id
    and t.id is distinct from v_thread.id
    and o.status = 'draft';

  update public.quotation_threads t
  set status = case
        when t.status = 'withdrawn' then t.status
        else 'closed'
      end,
      updated_at = now()
  where t.rfq_id = p_rfq_id
    and t.id is distinct from v_thread.id
    and t.status in ('draft', 'active');

  -- Lock RFQ
  update public.rfqs r
  set status = 'awarded',
      closed_at = coalesce(r.closed_at, now()),
      updated_at = now()
  where r.id = p_rfq_id
  returning * into v_rfq;

  perform public._append_award_event(
    v_award.id,
    'award.created',
    'user',
    auth.uid(),
    null,
    'active',
    'Supplier awarded',
    jsonb_build_object(
      'rfq_id', p_rfq_id,
      'thread_id', v_thread.id,
      'offer_id', v_offer.id,
      'supplier_company_id', v_thread.supplier_company_id
    )
  );

  perform public._append_rfq_event(
    p_rfq_id,
    'rfq.awarded',
    'user',
    auth.uid(),
    v_from_rfq_status,
    'awarded',
    'RFQ awarded to a supplier',
    jsonb_build_object(
      'award_id', v_award.id,
      'thread_id', v_thread.id,
      'offer_id', v_offer.id
    )
  );

  perform public._append_quotation_event(
    v_thread.id,
    v_offer.id,
    'offer.awarded',
    'user',
    auth.uid(),
    'submitted',
    'awarded',
    'Quotation awarded',
    jsonb_build_object('award_id', v_award.id)
  );

  select c.user_id into v_buyer_user_id
  from public.companies c
  where c.id = v_rfq.buyer_company_id;

  select c.user_id into v_winner_user_id
  from public.companies c
  where c.id = v_thread.supplier_company_id;

  if v_buyer_user_id is not null then
    perform public._create_system_notification(
      v_buyer_user_id,
      'rfq.awarded',
      'RFQ awarded',
      format('You awarded a supplier on RFQ "%s".', v_rfq.title),
      'rfq',
      p_rfq_id,
      format('/dashboard/buyer/rfqs/%s', p_rfq_id),
      jsonb_build_object('award_id', v_award.id, 'thread_id', v_thread.id),
      'high'
    );
  end if;

  if v_winner_user_id is not null then
    perform public._create_system_notification(
      v_winner_user_id,
      'quotation.awarded',
      'Quotation awarded',
      format('Congratulations! Your quotation on RFQ "%s" has been awarded.', v_rfq.title),
      'quotation',
      v_thread.id,
      format('/dashboard/supplier/quotations/%s', v_thread.id),
      jsonb_build_object('award_id', v_award.id, 'rfq_id', p_rfq_id),
      'urgent'
    );
  end if;

  for v_loser in
    select t.id as thread_id, t.supplier_company_id
    from public.quotation_threads t
    where t.rfq_id = p_rfq_id
      and t.id is distinct from v_thread.id
      and exists (
        select 1
        from public.quotation_offers o
        where o.thread_id = t.id
          and o.status = 'not_selected'
      )
  loop
    select c.user_id into v_loser_user_id
    from public.companies c
    where c.id = v_loser.supplier_company_id;

    perform public._append_quotation_event(
      v_loser.thread_id,
      null,
      'offer.not_selected',
      'system',
      auth.uid(),
      'submitted',
      'not_selected',
      'RFQ awarded to another supplier',
      jsonb_build_object('award_id', v_award.id, 'winning_thread_id', v_thread.id)
    );

    if v_loser_user_id is not null then
      perform public._create_system_notification(
        v_loser_user_id,
        'quotation.not_selected',
        'RFQ awarded to another supplier',
        format('This RFQ "%s" has been awarded to another supplier.', v_rfq.title),
        'quotation',
        v_loser.thread_id,
        format('/dashboard/supplier/quotations/%s', v_loser.thread_id),
        jsonb_build_object('award_id', v_award.id, 'rfq_id', p_rfq_id),
        'normal'
      );
    end if;
  end loop;

  return v_award;
end;
$$;

revoke all on function public.award_supplier(uuid, uuid, text) from public;
grant execute on function public.award_supplier(uuid, uuid, text) to authenticated;

create or replace function public.get_award(p_rfq_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.rfqs;
  v_award public.quotation_awards;
  v_is_buyer boolean;
  v_is_participant boolean;
  v_is_winner boolean;
  v_own_thread_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_rfq from public.rfqs r where r.id = p_rfq_id;
  if not found then
    raise exception 'RFQ not found';
  end if;

  v_is_buyer := public.user_owns_company(v_rfq.buyer_company_id);

  select t.id into v_own_thread_id
  from public.quotation_threads t
  where t.rfq_id = p_rfq_id
    and public.user_owns_company(t.supplier_company_id)
  limit 1;

  v_is_participant := v_own_thread_id is not null;

  if not (public.is_admin() or v_is_buyer or v_is_participant) then
    raise exception 'Access denied';
  end if;

  select * into v_award
  from public.quotation_awards a
  where a.rfq_id = p_rfq_id
    and a.status = 'active'
  order by a.awarded_at desc
  limit 1;

  if not found then
    -- Buyer/admin may inspect revoked history; suppliers only when they were the awardee
    if public.is_admin() or v_is_buyer then
      select * into v_award
      from public.quotation_awards a
      where a.rfq_id = p_rfq_id
      order by a.awarded_at desc
      limit 1;
    else
      select * into v_award
      from public.quotation_awards a
      where a.rfq_id = p_rfq_id
        and public.user_owns_company(a.supplier_company_id)
      order by a.awarded_at desc
      limit 1;
    end if;
  end if;

  if not found then
    if v_rfq.status = 'awarded' and v_is_participant then
      return jsonb_build_object(
        'awarded', true,
        'is_winner', false,
        'award', null,
        'events', '[]'::jsonb
      );
    end if;
    return null;
  end if;

  v_is_winner := public.user_owns_company(v_award.supplier_company_id);

  -- Losing suppliers: confirm award existence without exposing peer commercial identifiers
  if not public.is_admin() and not v_is_buyer and not v_is_winner then
    return jsonb_build_object(
      'awarded', v_award.status = 'active',
      'is_winner', false,
      'award', null,
      'events', '[]'::jsonb,
      'own_thread_id', v_own_thread_id
    );
  end if;

  select jsonb_build_object(
    'awarded', v_award.status = 'active',
    'is_winner', v_is_winner,
    'award', to_jsonb(v_award),
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from public.award_events e
      where e.award_id = v_award.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_award(uuid) from public;
grant execute on function public.get_award(uuid) to authenticated;

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

  update public.quotation_awards a
  set status = 'revoked',
      revoked_at = now(),
      revoke_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where a.id = p_award_id
  returning * into v_award;

  -- Re-open RFQ for quotations (history preserved on award + offer statuses)
  update public.rfqs r
  set status = 'quoted',
      updated_at = now()
  where r.id = v_award.rfq_id;

  -- Winning thread returns to active with submitted commercial head
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

  -- Restore not_selected offers to submitted so buyer can re-award
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
