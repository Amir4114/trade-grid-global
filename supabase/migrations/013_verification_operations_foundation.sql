-- Trade Grid Global: Verification operations foundation (Phase 1)
--
-- Adds operational review cases, immutable audit events, assessment storage,
-- SLA timestamps, and trusted admin RPCs. Extends existing submission/moderation
-- RPCs without weakening migrations 001–012 protections.
--
-- Depends on: is_admin(), _create_system_notification, _notify_all_admins,
-- submit_company_for_verification (012), product moderation RPCs (011).

begin;

-- ---------------------------------------------------------------------------
-- 1) Core tables
-- ---------------------------------------------------------------------------
create table if not exists public.verification_cases (
  id uuid primary key default gen_random_uuid(),
  case_type text not null
    check (case_type in ('company_verification', 'product_review')),
  entity_id uuid not null,
  subject_user_id uuid references auth.users(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'approved', 'rejected', 'cancelled')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  submitted_at timestamptz not null default now(),
  review_started_at timestamptz,
  decided_at timestamptz,
  assigned_admin_id uuid references auth.users(id) on delete set null,
  decision_reason text,
  sla_due_at timestamptz not null,
  sla_breached_at timestamptz,
  source text not null default 'user_submission'
    check (source in ('user_submission', 'system', 'ai_assisted', 'automation')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists verification_cases_one_active_idx
  on public.verification_cases (case_type, entity_id)
  where status in ('pending', 'in_review');

create index if not exists verification_cases_status_idx
  on public.verification_cases (status, submitted_at desc);

create index if not exists verification_cases_sla_due_idx
  on public.verification_cases (sla_due_at)
  where status in ('pending', 'in_review');

create table if not exists public.verification_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.verification_cases(id) on delete cascade,
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

create index if not exists verification_case_events_case_idx
  on public.verification_case_events (case_id, created_at desc);

create table if not exists public.verification_assessments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.verification_cases(id) on delete cascade,
  assessor_type text not null
    check (assessor_type in ('rule', 'ai', 'admin')),
  assessor_name text not null,
  assessment_type text not null,
  result text not null
    check (result in ('pass', 'fail', 'warning', 'unknown')),
  confidence numeric,
  summary text,
  findings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists verification_assessments_case_idx
  on public.verification_assessments (case_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) Internal helpers (not client-callable)
-- ---------------------------------------------------------------------------
create or replace function public._verification_sla_interval(p_case_type text)
returns interval
language sql
immutable
set search_path = public
as $$
  select case p_case_type
    when 'company_verification' then interval '24 hours'
    when 'product_review' then interval '12 hours'
    else interval '24 hours'
  end;
$$;

revoke all on function public._verification_sla_interval(text) from public;
revoke all on function public._verification_sla_interval(text) from anon;
revoke all on function public._verification_sla_interval(text) from authenticated;

create or replace function public._verification_sla_due_at(
  p_case_type text,
  p_submitted_at timestamptz
)
returns timestamptz
language sql
immutable
set search_path = public
as $$
  select p_submitted_at + public._verification_sla_interval(p_case_type);
$$;

revoke all on function public._verification_sla_due_at(text, timestamptz) from public;
revoke all on function public._verification_sla_due_at(text, timestamptz) from anon;
revoke all on function public._verification_sla_due_at(text, timestamptz) from authenticated;

create or replace function public._touch_verification_case_sla(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.verification_cases
     set sla_breached_at = now(),
         updated_at = now()
   where id = p_case_id
     and status in ('pending', 'in_review')
     and sla_breached_at is null
     and now() > sla_due_at;
end;
$$;

revoke all on function public._touch_verification_case_sla(uuid) from public;
revoke all on function public._touch_verification_case_sla(uuid) from anon;
revoke all on function public._touch_verification_case_sla(uuid) from authenticated;

create or replace function public._append_verification_case_event(
  p_case_id uuid,
  p_event_type text,
  p_actor_type text,
  p_actor_user_id uuid,
  p_from_status text,
  p_to_status text,
  p_message text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.verification_case_events
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.verification_case_events;
begin
  insert into public.verification_case_events (
    case_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    message,
    metadata
  )
  values (
    p_case_id,
    p_event_type,
    p_actor_type,
    p_actor_user_id,
    p_from_status,
    p_to_status,
    p_message,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into ev;

  return ev;
end;
$$;

revoke all on function public._append_verification_case_event(uuid, text, text, uuid, text, text, text, jsonb) from public;
revoke all on function public._append_verification_case_event(uuid, text, text, uuid, text, text, text, jsonb) from anon;
revoke all on function public._append_verification_case_event(uuid, text, text, uuid, text, text, text, jsonb) from authenticated;

create or replace function public._cancel_active_verification_cases(
  p_case_type text,
  p_entity_id uuid,
  p_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.verification_cases;
begin
  for v_case in
    select *
    from public.verification_cases
    where case_type = p_case_type
      and entity_id = p_entity_id
      and status in ('pending', 'in_review')
  loop
    update public.verification_cases
       set status = 'cancelled',
           updated_at = now()
     where id = v_case.id;

    perform public._append_verification_case_event(
      v_case.id,
      'case.cancelled',
      'system',
      null,
      v_case.status,
      'cancelled',
      coalesce(p_message, 'Active review case cancelled.'),
      jsonb_build_object('case_type', p_case_type, 'entity_id', p_entity_id)
    );
  end loop;
end;
$$;

revoke all on function public._cancel_active_verification_cases(text, uuid, text) from public;
revoke all on function public._cancel_active_verification_cases(text, uuid, text) from anon;
revoke all on function public._cancel_active_verification_cases(text, uuid, text) from authenticated;

create or replace function public._open_or_refresh_verification_case(
  p_case_type text,
  p_entity_id uuid,
  p_subject_user_id uuid,
  p_company_id uuid,
  p_source text default 'user_submission'
)
returns public.verification_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.verification_cases;
  v_now timestamptz := now();
begin
  select * into v_case
  from public.verification_cases
  where case_type = p_case_type
    and entity_id = p_entity_id
    and status in ('pending', 'in_review')
  for update;

  if found then
    update public.verification_cases
       set submitted_at = v_now,
           sla_due_at = public._verification_sla_due_at(p_case_type, v_now),
           sla_breached_at = null,
           source = p_source,
           updated_at = v_now
     where id = v_case.id
     returning * into v_case;

    perform public._append_verification_case_event(
      v_case.id,
      'case.refreshed',
      'user',
      p_subject_user_id,
      v_case.status,
      v_case.status,
      'Submission refreshed the active review case.',
      jsonb_build_object('submitted_at', v_now)
    );
  else
    insert into public.verification_cases (
      case_type,
      entity_id,
      subject_user_id,
      company_id,
      status,
      priority,
      submitted_at,
      sla_due_at,
      source
    )
    values (
      p_case_type,
      p_entity_id,
      p_subject_user_id,
      p_company_id,
      'pending',
      'normal',
      v_now,
      public._verification_sla_due_at(p_case_type, v_now),
      p_source
    )
    returning * into v_case;

    perform public._append_verification_case_event(
      v_case.id,
      'case.submitted',
      'user',
      p_subject_user_id,
      null,
      'pending',
      case p_case_type
        when 'company_verification' then 'Company submitted for verification.'
        when 'product_review' then 'Product submitted for review.'
        else 'Case submitted.'
      end,
      jsonb_build_object('entity_id', p_entity_id)
    );
  end if;

  perform public._touch_verification_case_sla(v_case.id);
  return v_case;
end;
$$;

revoke all on function public._open_or_refresh_verification_case(text, uuid, uuid, uuid, text) from public;
revoke all on function public._open_or_refresh_verification_case(text, uuid, uuid, uuid, text) from anon;
revoke all on function public._open_or_refresh_verification_case(text, uuid, uuid, uuid, text) from authenticated;

create or replace function public._resolve_verification_case(
  p_case_type text,
  p_entity_id uuid,
  p_decision text,
  p_admin_id uuid,
  p_reason text default null
)
returns public.verification_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.verification_cases;
  v_now timestamptz := now();
  v_from_status text;
begin
  select * into v_case
  from public.verification_cases
  where case_type = p_case_type
    and entity_id = p_entity_id
    and status in ('pending', 'in_review')
  order by submitted_at desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  v_from_status := v_case.status;

  update public.verification_cases
     set status = p_decision,
         decided_at = v_now,
         assigned_admin_id = coalesce(assigned_admin_id, p_admin_id),
         decision_reason = nullif(trim(coalesce(p_reason, '')), ''),
         updated_at = v_now
   where id = v_case.id
   returning * into v_case;

  perform public._append_verification_case_event(
    v_case.id,
    case p_decision
      when 'approved' then 'case.approved'
      when 'rejected' then 'case.rejected'
      else 'case.updated'
    end,
    'admin',
    p_admin_id,
    v_from_status,
    p_decision,
    case p_decision
      when 'approved' then 'Case approved by admin.'
      when 'rejected' then 'Case rejected by admin.'
      else 'Case updated by admin.'
    end,
    jsonb_build_object(
      'decision_reason', v_case.decision_reason,
      'admin_id', p_admin_id
    )
  );

  return v_case;
end;
$$;

revoke all on function public._resolve_verification_case(text, uuid, text, uuid, text) from public;
revoke all on function public._resolve_verification_case(text, uuid, text, uuid, text) from anon;
revoke all on function public._resolve_verification_case(text, uuid, text, uuid, text) from authenticated;

-- Resolve an active case, or reconcile a terminal audit case when none exists
-- (covers in-flight entities at migration apply and legacy admin direct updates).
create or replace function public._resolve_or_reconcile_verification_case(
  p_case_type text,
  p_entity_id uuid,
  p_decision text,
  p_admin_id uuid,
  p_reason text default null,
  p_subject_user_id uuid default null,
  p_company_id uuid default null,
  p_submitted_at timestamptz default null
)
returns public.verification_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.verification_cases;
  v_now timestamptz := now();
  v_submitted timestamptz := coalesce(p_submitted_at, v_now);
begin
  v_case := public._resolve_verification_case(
    p_case_type,
    p_entity_id,
    p_decision,
    p_admin_id,
    p_reason
  );

  if v_case is not null then
    return v_case;
  end if;

  insert into public.verification_cases (
    case_type,
    entity_id,
    subject_user_id,
    company_id,
    status,
    priority,
    submitted_at,
    review_started_at,
    decided_at,
    assigned_admin_id,
    decision_reason,
    sla_due_at,
    source
  )
  values (
    p_case_type,
    p_entity_id,
    p_subject_user_id,
    p_company_id,
    p_decision,
    'normal',
    v_submitted,
    null,
    v_now,
    p_admin_id,
    nullif(trim(coalesce(p_reason, '')), ''),
    public._verification_sla_due_at(p_case_type, v_submitted),
    'system'
  )
  returning * into v_case;

  perform public._append_verification_case_event(
    v_case.id,
    'case.reconciled',
    'system',
    p_admin_id,
    null,
    p_decision,
    'Decision reconciled an in-flight or legacy review without an active case.',
    jsonb_build_object(
      'entity_id', p_entity_id,
      'decision_reason', v_case.decision_reason
    )
  );

  return v_case;
end;
$$;

revoke all on function public._resolve_or_reconcile_verification_case(text, uuid, text, uuid, text, uuid, uuid, timestamptz) from public;
revoke all on function public._resolve_or_reconcile_verification_case(text, uuid, text, uuid, text, uuid, uuid, timestamptz) from anon;
revoke all on function public._resolve_or_reconcile_verification_case(text, uuid, text, uuid, text, uuid, uuid, timestamptz) from authenticated;

-- ---------------------------------------------------------------------------
-- 3) SLA classification (admin/UI helper)
-- ---------------------------------------------------------------------------
create or replace function public.verification_case_sla_state(
  p_sla_due_at timestamptz,
  p_submitted_at timestamptz,
  p_status text
)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when p_status not in ('pending', 'in_review') then null
    when now() > p_sla_due_at then 'overdue'
    when now() > p_sla_due_at - (p_sla_due_at - p_submitted_at) * 0.25 then 'due_soon'
    else 'on_track'
  end;
$$;

revoke all on function public.verification_case_sla_state(timestamptz, timestamptz, text) from public;
grant execute on function public.verification_case_sla_state(timestamptz, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Cancel active company cases when entity verification resets to pending
-- ---------------------------------------------------------------------------
create or replace function public.trg_companies_verification_case_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.verification_status = 'pending'
     and old.verification_status in ('under_review', 'verified') then
    perform public._cancel_active_verification_cases(
      'company_verification',
      new.id,
      'Company verification reset to pending; active review case cancelled.'
    );
  end if;

  if public.is_admin()
     and new.verification_status is distinct from old.verification_status
     and new.verification_status in ('verified', 'rejected')
     and coalesce(current_setting('tradegrid.verification_decision', true), '') <> new.id::text then
    perform public._resolve_or_reconcile_verification_case(
      'company_verification',
      new.id,
      case when new.verification_status = 'verified' then 'approved' else 'rejected' end,
      auth.uid(),
      null,
      new.user_id,
      new.id,
      old.updated_at
    );
  end if;

  return new;
end;
$$;

revoke all on function public.trg_companies_verification_case_sync() from public;
revoke all on function public.trg_companies_verification_case_sync() from anon;
revoke all on function public.trg_companies_verification_case_sync() from authenticated;

drop trigger if exists companies_verification_case_sync on public.companies;

create trigger companies_verification_case_sync
  after update on public.companies
  for each row
  execute function public.trg_companies_verification_case_sync();

-- ---------------------------------------------------------------------------
-- 5) Admin operational RPCs
-- ---------------------------------------------------------------------------
create or replace function public.start_verification_case_review(p_case_id uuid)
returns public.verification_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.verification_cases;
  v_now timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Only admins can start case review';
  end if;

  select * into v_case
  from public.verification_cases
  where id = p_case_id
  for update;

  if not found then
    raise exception 'Verification case not found';
  end if;

  if v_case.status <> 'pending' then
    raise exception 'Only pending cases can be started';
  end if;

  update public.verification_cases
     set status = 'in_review',
         review_started_at = coalesce(review_started_at, v_now),
         assigned_admin_id = auth.uid(),
         updated_at = v_now
   where id = p_case_id
   returning * into v_case;

  perform public._append_verification_case_event(
    v_case.id,
    'case.review_started',
    'admin',
    auth.uid(),
    'pending',
    'in_review',
    'Admin started reviewing the case.',
    jsonb_build_object('assigned_admin_id', auth.uid())
  );

  perform public._touch_verification_case_sla(v_case.id);
  return v_case;
end;
$$;

revoke all on function public.start_verification_case_review(uuid) from public;
revoke all on function public.start_verification_case_review(uuid) from anon;
grant execute on function public.start_verification_case_review(uuid) to authenticated;

create or replace function public.set_verification_case_priority(
  p_case_id uuid,
  p_priority text
)
returns public.verification_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.verification_cases;
  v_old_priority text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change case priority';
  end if;

  if p_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid priority';
  end if;

  select * into v_case
  from public.verification_cases
  where id = p_case_id
  for update;

  if not found then
    raise exception 'Verification case not found';
  end if;

  if v_case.status not in ('pending', 'in_review') then
    raise exception 'Priority can only be changed on active cases';
  end if;

  v_old_priority := v_case.priority;

  update public.verification_cases
     set priority = p_priority,
         updated_at = now()
   where id = p_case_id
   returning * into v_case;

  perform public._append_verification_case_event(
    v_case.id,
    'case.priority_changed',
    'admin',
    auth.uid(),
    v_old_priority,
    p_priority,
    'Case priority updated.',
    jsonb_build_object('from_priority', v_old_priority, 'to_priority', p_priority)
  );

  return v_case;
end;
$$;

revoke all on function public.set_verification_case_priority(uuid, text) from public;
revoke all on function public.set_verification_case_priority(uuid, text) from anon;
grant execute on function public.set_verification_case_priority(uuid, text) to authenticated;

create or replace function public.approve_company_verification(
  p_company_id uuid,
  p_risk_score integer default 0
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  co public.companies;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve company verification';
  end if;

  select * into co from public.companies where id = p_company_id;
  if not found then
    raise exception 'Company not found';
  end if;

  if co.verification_status <> 'under_review' then
    raise exception 'Only companies under review can be approved';
  end if;

  perform set_config('tradegrid.verification_decision', p_company_id::text, true);

  update public.companies
     set verification_status = 'verified',
         risk_score = coalesce(p_risk_score, 0),
         updated_at = now()
   where id = p_company_id
   returning * into co;

  perform public._resolve_or_reconcile_verification_case(
    'company_verification',
    p_company_id,
    'approved',
    auth.uid(),
    null,
    co.user_id,
    co.id,
    co.updated_at
  );

  return co;
end;
$$;

revoke all on function public.approve_company_verification(uuid, integer) from public;
revoke all on function public.approve_company_verification(uuid, integer) from anon;
grant execute on function public.approve_company_verification(uuid, integer) to authenticated;

create or replace function public.reject_company_verification(
  p_company_id uuid,
  p_reason text default null
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  co public.companies;
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject company verification';
  end if;

  select * into co from public.companies where id = p_company_id;
  if not found then
    raise exception 'Company not found';
  end if;

  if co.verification_status <> 'under_review' then
    raise exception 'Only companies under review can be rejected';
  end if;

  perform set_config('tradegrid.verification_decision', p_company_id::text, true);

  update public.companies
     set verification_status = 'rejected',
         updated_at = now()
   where id = p_company_id
   returning * into co;

  perform public._resolve_or_reconcile_verification_case(
    'company_verification',
    p_company_id,
    'rejected',
    auth.uid(),
    p_reason,
    co.user_id,
    co.id,
    co.updated_at
  );

  return co;
end;
$$;

revoke all on function public.reject_company_verification(uuid, text) from public;
revoke all on function public.reject_company_verification(uuid, text) from anon;
grant execute on function public.reject_company_verification(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Extend trusted submission / moderation RPCs
-- ---------------------------------------------------------------------------
create or replace function public.submit_company_for_verification(company_id uuid)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  co public.companies;
  company_label text;
  dashboard_path text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_admin() then
    raise exception 'Admins cannot submit company verification on behalf of users';
  end if;

  select * into co from public.companies where id = company_id;
  if not found then
    raise exception 'Company not found';
  end if;

  if co.user_id <> auth.uid() then
    raise exception 'You cannot submit verification for a company you do not own';
  end if;

  if co.verification_status not in ('pending', 'rejected') then
    raise exception 'Only pending or rejected companies can be submitted for verification';
  end if;

  perform set_config('tradegrid.verification_submit', company_id::text, true);

  update public.companies
     set verification_status = 'under_review',
         updated_at = now()
   where id = company_id
   returning * into co;

  perform public._open_or_refresh_verification_case(
    'company_verification',
    co.id,
    co.user_id,
    co.id,
    'user_submission'
  );

  company_label := coalesce(nullif(btrim(co.company_name), ''), 'A company');
  dashboard_path := '/dashboard/' || coalesce(co.account_type, 'buyer');

  perform public._create_system_notification(
    co.user_id,
    'verification.submitted',
    'Verification submitted',
    'Your company profile has been submitted for review.',
    'company',
    co.id,
    dashboard_path,
    jsonb_build_object(
      'company_id', co.id,
      'company_name', co.company_name
    ),
    'normal'
  );

  perform public._notify_all_admins(
    'verification.admin_review_required',
    'Company verification required',
    company_label || ' has submitted its company profile for verification.',
    'company',
    co.id,
    '/dashboard/admin/verification',
    jsonb_build_object(
      'company_id', co.id,
      'company_name', co.company_name
    ),
    'high'
  );

  return co;
end;
$$;

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

  perform public._open_or_refresh_verification_case(
    'product_review',
    prod.id,
    auth.uid(),
    prod.company_id,
    'user_submission'
  );

  perform public._create_system_notification(
    auth.uid(),
    'product.submitted',
    'Product submitted for review',
    prod.name || ' is waiting for approval.',
    'product',
    prod.id,
    '/dashboard/supplier/products',
    jsonb_build_object('product_id', prod.id, 'product_name', prod.name),
    'normal'
  );

  perform public._notify_all_admins(
    'product.admin_review_required',
    'Product review required',
    prod.name || ' has been submitted for review.',
    'product',
    prod.id,
    '/dashboard/admin/products',
    jsonb_build_object('product_id', prod.id, 'product_name', prod.name),
    'high'
  );

  return prod;
end;
$$;

create or replace function public.approve_product(product_id uuid)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  prod public.products;
  supplier_user_id uuid;
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

  perform set_config('tradegrid.verification_decision', product_id::text, true);

  update public.products
     set status = 'published',
         published_at = now(),
         rejection_reason = null,
         updated_at = now()
   where id = product_id
   returning * into prod;

  select user_id into supplier_user_id
  from public.companies
  where id = prod.company_id;

  perform public._resolve_or_reconcile_verification_case(
    'product_review',
    prod.id,
    'approved',
    auth.uid(),
    null,
    supplier_user_id,
    prod.company_id,
    prod.updated_at
  );

  if supplier_user_id is not null then
    perform public._create_system_notification(
      supplier_user_id,
      'product.approved',
      'Product approved',
      prod.name || ' is now live on the marketplace.',
      'product',
      prod.id,
      '/dashboard/supplier/products',
      jsonb_build_object('product_id', prod.id, 'product_name', prod.name),
      'normal'
    );
  end if;

  return prod;
end;
$$;

create or replace function public.reject_product(product_id uuid, reason text)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  prod public.products;
  supplier_user_id uuid;
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

  perform set_config('tradegrid.verification_decision', product_id::text, true);

  update public.products
     set status = 'rejected',
         rejection_reason = nullif(trim(coalesce(reason, '')), ''),
         updated_at = now()
   where id = product_id
   returning * into prod;

  select user_id into supplier_user_id
  from public.companies
  where id = prod.company_id;

  perform public._resolve_or_reconcile_verification_case(
    'product_review',
    prod.id,
    'rejected',
    auth.uid(),
    reason,
    supplier_user_id,
    prod.company_id,
    prod.updated_at
  );

  if supplier_user_id is not null then
    perform public._create_system_notification(
      supplier_user_id,
      'product.rejected',
      'Product requires changes',
      prod.name || ' was not approved. Review the feedback, update it, and resubmit.',
      'product',
      prod.id,
      '/dashboard/supplier/products',
      jsonb_build_object('product_id', prod.id, 'product_name', prod.name),
      'high'
    );
  end if;

  return prod;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) RLS — admin read-only; mutations via SECURITY DEFINER RPCs only
-- ---------------------------------------------------------------------------
alter table public.verification_cases enable row level security;
alter table public.verification_case_events enable row level security;
alter table public.verification_assessments enable row level security;

drop policy if exists "Admins can read verification cases" on public.verification_cases;
create policy "Admins can read verification cases"
  on public.verification_cases for select
  using (public.is_admin());

drop policy if exists "Admins can read verification case events" on public.verification_case_events;
create policy "Admins can read verification case events"
  on public.verification_case_events for select
  using (public.is_admin());

drop policy if exists "Admins can read verification assessments" on public.verification_assessments;
create policy "Admins can read verification assessments"
  on public.verification_assessments for select
  using (public.is_admin());

revoke all on table public.verification_cases from anon;
revoke all on table public.verification_case_events from anon;
revoke all on table public.verification_assessments from anon;

revoke all on table public.verification_cases from public;
revoke all on table public.verification_case_events from public;
revoke all on table public.verification_assessments from public;

revoke insert, update, delete on table public.verification_cases from authenticated;
revoke insert, update, delete on table public.verification_case_events from authenticated;
revoke insert, update, delete on table public.verification_assessments from authenticated;

grant select on table public.verification_cases to authenticated;
grant select on table public.verification_case_events to authenticated;
grant select on table public.verification_assessments to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Idempotent backfill for in-flight reviews at apply time
-- ---------------------------------------------------------------------------
insert into public.verification_cases (
  case_type,
  entity_id,
  subject_user_id,
  company_id,
  status,
  priority,
  submitted_at,
  sla_due_at,
  source
)
select
  'company_verification',
  c.id,
  c.user_id,
  c.id,
  'pending',
  'normal',
  c.updated_at,
  public._verification_sla_due_at('company_verification', c.updated_at),
  'system'
from public.companies c
where c.verification_status = 'under_review'
  and not exists (
    select 1
    from public.verification_cases vc
    where vc.case_type = 'company_verification'
      and vc.entity_id = c.id
      and vc.status in ('pending', 'in_review')
  );

insert into public.verification_case_events (
  case_id,
  event_type,
  actor_type,
  message,
  metadata
)
select
  vc.id,
  'case.submitted',
  'system',
  'Backfilled active case for in-flight company verification.',
  jsonb_build_object('backfill', true, 'entity_id', vc.entity_id)
from public.verification_cases vc
where vc.source = 'system'
  and vc.case_type = 'company_verification'
  and not exists (
    select 1
    from public.verification_case_events ev
    where ev.case_id = vc.id
  );

insert into public.verification_cases (
  case_type,
  entity_id,
  subject_user_id,
  company_id,
  status,
  priority,
  submitted_at,
  sla_due_at,
  source
)
select
  'product_review',
  p.id,
  c.user_id,
  p.company_id,
  'pending',
  'normal',
  p.updated_at,
  public._verification_sla_due_at('product_review', p.updated_at),
  'system'
from public.products p
join public.companies c on c.id = p.company_id
where p.status = 'pending'
  and not exists (
    select 1
    from public.verification_cases vc
    where vc.case_type = 'product_review'
      and vc.entity_id = p.id
      and vc.status in ('pending', 'in_review')
  );

insert into public.verification_case_events (
  case_id,
  event_type,
  actor_type,
  message,
  metadata
)
select
  vc.id,
  'case.submitted',
  'system',
  'Backfilled active case for in-flight product review.',
  jsonb_build_object('backfill', true, 'entity_id', vc.entity_id)
from public.verification_cases vc
where vc.source = 'system'
  and vc.case_type = 'product_review'
  and not exists (
    select 1
    from public.verification_case_events ev
    where ev.case_id = vc.id
  );

-- ---------------------------------------------------------------------------
-- 9) Explicit EXECUTE grants on replaced submission/moderation RPCs
-- ---------------------------------------------------------------------------
revoke all on function public.submit_company_for_verification(uuid) from public;
revoke all on function public.submit_company_for_verification(uuid) from anon;
grant execute on function public.submit_company_for_verification(uuid) to authenticated;

revoke all on function public.submit_product_for_review(uuid) from public;
revoke all on function public.submit_product_for_review(uuid) from anon;
grant execute on function public.submit_product_for_review(uuid) to authenticated;

revoke all on function public.approve_product(uuid) from public;
revoke all on function public.approve_product(uuid) from anon;
grant execute on function public.approve_product(uuid) to authenticated;

revoke all on function public.reject_product(uuid, text) from public;
revoke all on function public.reject_product(uuid, text) from anon;
grant execute on function public.reject_product(uuid, text) to authenticated;

commit;

notify pgrst, 'reload schema';
