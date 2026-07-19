-- Trade Grid Global: Fulfillment Domain Phase B operational collaboration
-- Additive hardening over migration 018. No commercial, Trust, or Logistics changes.

begin;

-- ---------------------------------------------------------------------------
-- 1) Append-only milestones
-- ---------------------------------------------------------------------------
create or replace function public.add_fulfillment_milestone(
  p_fulfillment_id uuid,
  p_milestone_type text,
  p_notes text default null,
  p_occurred_at timestamptz default now()
)
returns public.fulfillment_order_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_type text;
  v_notes text;
  v_occurred_at timestamptz;
  v_not_before timestamptz;
  v_event public.fulfillment_order_events;
  v_label text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_supplier() then
    raise exception 'Only suppliers can add fulfillment milestones';
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
  if v_fo.status in ('completed', 'cancelled', 'failed') then
    raise exception 'Milestones cannot be added to terminal fulfillments';
  end if;

  v_type := lower(btrim(coalesce(p_milestone_type, '')));
  if v_type not in (
    'container_loaded',
    'shipment_booked',
    'departed_port',
    'arrived_destination'
  ) then
    raise exception 'Unsupported fulfillment milestone';
  end if;

  if
    (v_type = 'container_loaded' and v_fo.status not in (
      'ready_to_ship', 'shipped', 'in_transit', 'delivered'
    ))
    or (v_type = 'departed_port' and v_fo.status not in (
      'shipped', 'in_transit', 'delivered'
    ))
    or (v_type = 'arrived_destination' and v_fo.status not in (
      'in_transit', 'delivered'
    ))
  then
    raise exception 'Milestone is not valid for the current fulfillment status';
  end if;

  if exists (
    select 1
    from public.fulfillment_order_events e
    where e.fulfillment_order_id = v_fo.id
      and e.event_type = 'fulfillment.milestone_completed'
      and e.metadata->>'milestone_type' = v_type
  ) then
    raise exception 'Milestone has already been recorded';
  end if;

  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if length(coalesce(v_notes, '')) > 2000 then
    raise exception 'Milestone notes must be 2000 characters or fewer';
  end if;

  v_not_before := case v_type
    when 'container_loaded' then coalesce(v_fo.ready_to_ship_at, v_fo.opened_at)
    when 'shipment_booked' then v_fo.opened_at
    when 'departed_port' then coalesce(v_fo.shipped_at, v_fo.opened_at)
    when 'arrived_destination' then coalesce(v_fo.in_transit_at, v_fo.opened_at)
    else v_fo.opened_at
  end;

  v_occurred_at := coalesce(p_occurred_at, now());
  if v_occurred_at < v_not_before or v_occurred_at > now() then
    raise exception 'Milestone timestamp is outside the fulfillment lifecycle';
  end if;

  v_label := initcap(replace(v_type, '_', ' '));
  v_event := public._append_fulfillment_event(
    v_fo.id,
    'fulfillment.milestone_completed',
    'user',
    auth.uid(),
    v_fo.status,
    v_fo.status,
    coalesce(v_notes, v_label),
    jsonb_build_object(
      'milestone_type', v_type,
      'occurred_at', v_occurred_at
    )
  );

  update public.fulfillment_orders fo
  set updated_by = auth.uid(),
      updated_at = now()
  where fo.id = v_fo.id
  returning * into v_fo;

  perform public._notify_fulfillment_parties(
    v_fo,
    'fulfillment.milestone_completed',
    v_label,
    format('%s reached milestone: %s.', v_fo.fulfillment_number, v_label),
    'normal',
    true,
    false
  );

  return v_event;
end;
$$;

revoke all on function public.add_fulfillment_milestone(
  uuid, text, text, timestamptz
) from public;
grant execute on function public.add_fulfillment_milestone(
  uuid, text, text, timestamptz
) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Party comments as immutable timeline events
-- ---------------------------------------------------------------------------
create or replace function public.add_fulfillment_comment(
  p_fulfillment_id uuid,
  p_comment text
)
returns public.fulfillment_order_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fo public.fulfillment_orders;
  v_comment text;
  v_is_buyer boolean;
  v_is_supplier boolean;
  v_event public.fulfillment_order_events;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_comment := nullif(btrim(coalesce(p_comment, '')), '');
  if v_comment is null then
    raise exception 'A comment is required';
  end if;
  if length(v_comment) > 2000 then
    raise exception 'Comments must be 2000 characters or fewer';
  end if;

  select * into v_fo
  from public.fulfillment_orders fo
  where fo.id = p_fulfillment_id
  for update;

  if not found then
    raise exception 'Fulfillment not found';
  end if;

  v_is_buyer := public.user_owns_company(v_fo.buyer_company_id);
  v_is_supplier := public.user_owns_company(v_fo.supplier_company_id);
  if not (v_is_buyer or v_is_supplier) then
    raise exception 'Fulfillment not found';
  end if;

  v_event := public._append_fulfillment_event(
    v_fo.id,
    'fulfillment.comment_added',
    'user',
    auth.uid(),
    v_fo.status,
    v_fo.status,
    v_comment,
    jsonb_build_object(
      'comment_author', case when v_is_buyer then 'buyer' else 'supplier' end
    )
  );

  update public.fulfillment_orders fo
  set updated_by = auth.uid(),
      updated_at = now()
  where fo.id = v_fo.id
  returning * into v_fo;

  perform public._notify_fulfillment_parties(
    v_fo,
    'fulfillment.comment_added',
    'New fulfillment comment',
    format('A %s added a comment to %s.',
      case when v_is_buyer then 'buyer' else 'supplier' end,
      v_fo.fulfillment_number
    ),
    'normal',
    v_is_supplier,
    v_is_buyer
  );

  return v_event;
end;
$$;

revoke all on function public.add_fulfillment_comment(uuid, text) from public;
grant execute on function public.add_fulfillment_comment(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Require a reason for every permitted cancellation
-- ---------------------------------------------------------------------------
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

  select * into v_fo
  from public.fulfillment_orders fo
  where fo.id = p_fulfillment_id
  for update;

  if not found then raise exception 'Fulfillment not found'; end if;

  v_is_buyer := public.user_owns_company(v_fo.buyer_company_id);
  v_is_supplier := public.user_owns_company(v_fo.supplier_company_id);
  if not (v_is_buyer or v_is_supplier) then raise exception 'Unauthorized'; end if;

  if v_is_supplier and not v_is_buyer then
    if v_fo.status <> 'opened' then
      raise exception 'Suppliers can only cancel fulfillments in opened status';
    end if;
  elsif v_is_buyer then
    if v_fo.status not in (
      'opened', 'in_production', 'quality_check', 'packaging', 'ready_to_ship'
    ) then
      raise exception 'Buyers can only cancel before shipment';
    end if;
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'A cancellation reason is required';
  end if;
  if length(v_reason) > 2000 then
    raise exception 'Cancellation reason must be 2000 characters or fewer';
  end if;

  v_from := v_fo.status;

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
    v_fo.id,
    'fulfillment.cancelled',
    'user',
    auth.uid(),
    v_from,
    'cancelled',
    v_reason,
    '{}'::jsonb
  );

  perform public._notify_fulfillment_parties(
    v_fo,
    'fulfillment.cancelled',
    'Fulfillment cancelled',
    format('%s was cancelled: %s', v_fo.fulfillment_number, v_reason),
    'high',
    true,
    true
  );

  return v_fo;
end;
$$;

revoke all on function public.cancel_fulfillment(uuid, text) from public;
grant execute on function public.cancel_fulfillment(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Aggregate timeline in chronological operational order
-- ---------------------------------------------------------------------------
create or replace function public._fulfillment_event_time(
  p_metadata jsonb,
  p_fallback timestamptz
)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  v_occurred_at text;
begin
  v_occurred_at := nullif(p_metadata->>'occurred_at', '');
  if v_occurred_at is null then
    return p_fallback;
  end if;

  begin
    return v_occurred_at::timestamptz;
  exception when invalid_datetime_format or datetime_field_overflow then
    return p_fallback;
  end;
end;
$$;

revoke all on function public._fulfillment_event_time(jsonb, timestamptz)
  from public, anon, authenticated;

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

  select * into v_fo
  from public.fulfillment_orders fo
  where fo.id = p_fulfillment_id;

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
        select jsonb_agg(
          to_jsonb(e)
          order by
            public._fulfillment_event_time(e.metadata, e.created_at) asc,
            e.created_at asc,
            e.id asc
        )
        from public.fulfillment_order_events e
        where e.fulfillment_order_id = v_fo.id
      ),
      '[]'::jsonb
    ),
    'documents', coalesce(
      (
        select jsonb_agg(to_jsonb(d) order by d.created_at asc, d.id asc)
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

commit;

notify pgrst, 'reload schema';
