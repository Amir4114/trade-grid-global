-- Trade Grid Global: Notification foundation (persistent center + trusted events)
--
-- This migration:
--   * creates public.notifications with RLS (select own only; no client INSERT)
--   * adds internal SECURITY DEFINER helpers for trusted notification creation
--   * adds mark_notification_read / mark_all_notifications_read RPCs
--   * adds submit_company_for_verification RPC for trusted user submission events
--   * wires welcome trigger on profiles; admin outcome triggers on companies
--   * extends product moderation RPCs to emit supplier/admin notifications
--
-- This migration is:
--   * additive — does not modify migrations 001–010
--   * fail-closed — users cannot forge notifications or target other recipients
--   * non-destructive — no data deletion
--
-- Admin signup alerts are intentionally deferred: basic signup creates a user
-- welcome notification only. Actionable admin alerts fire on verification submit
-- and product review submission.

begin;

-- ---------------------------------------------------------------------------
-- 1) notifications table
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_user_id_idx
  on public.notifications (recipient_user_id);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_user_id, is_read)
  where is_read = false;

create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;

create policy "Users can read own notifications"
  on public.notifications
  for select
  using (auth.uid() = recipient_user_id);

-- No INSERT / UPDATE / DELETE policies: creation is trusted-only; mutations via RPC.

-- Table privilege defense-in-depth (H4): ordinary clients may SELECT only (RLS-scoped).
-- Trusted SECURITY DEFINER functions/triggers insert as the function owner and are
-- unaffected by revoking authenticated INSERT/UPDATE/DELETE.
revoke all on table public.notifications from public;
revoke all on table public.notifications from anon;
revoke all on table public.notifications from authenticated;
grant select on table public.notifications to authenticated;

alter table public.notifications replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Internal trusted creation helpers (NOT callable by clients)
-- ---------------------------------------------------------------------------
create or replace function public._create_system_notification(
  p_recipient_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_action_url text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_priority text default 'normal'
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.notifications;
begin
  if p_recipient_user_id is null then
    raise exception 'Notification recipient is required';
  end if;

  if p_type is null or btrim(p_type) = '' then
    raise exception 'Notification type is required';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'Notification title is required';
  end if;

  if p_message is null or btrim(p_message) = '' then
    raise exception 'Notification message is required';
  end if;

  insert into public.notifications (
    recipient_user_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    action_url,
    metadata,
    priority
  )
  values (
    p_recipient_user_id,
    p_type,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id,
    p_action_url,
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(nullif(p_priority, ''), 'normal')
  )
  returning * into created;

  return created;
end;
$$;

revoke all on function public._create_system_notification(
  uuid, text, text, text, text, uuid, text, jsonb, text
) from public;
revoke all on function public._create_system_notification(
  uuid, text, text, text, text, uuid, text, jsonb, text
) from anon;
revoke all on function public._create_system_notification(
  uuid, text, text, text, text, uuid, text, jsonb, text
) from authenticated;

create or replace function public._notify_all_admins(
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_action_url text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_priority text default 'high'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_row record;
  sent_count integer := 0;
begin
  for admin_row in
    select id
    from public.profiles
    where role = 'admin'
  loop
    perform public._create_system_notification(
      admin_row.id,
      p_type,
      p_title,
      p_message,
      p_entity_type,
      p_entity_id,
      p_action_url,
      p_metadata,
      p_priority
    );
    sent_count := sent_count + 1;
  end loop;

  return sent_count;
end;
$$;

revoke all on function public._notify_all_admins(
  text, text, text, text, uuid, text, jsonb, text
) from public;
revoke all on function public._notify_all_admins(
  text, text, text, text, uuid, text, jsonb, text
) from anon;
revoke all on function public._notify_all_admins(
  text, text, text, text, uuid, text, jsonb, text
) from authenticated;

-- ---------------------------------------------------------------------------
-- 3) User-facing read RPCs
-- ---------------------------------------------------------------------------
create or replace function public.mark_notification_read(notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.notifications;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into n
  from public.notifications
  where id = notification_id;

  if not found then
    raise exception 'Notification not found';
  end if;

  if n.recipient_user_id <> auth.uid() then
    raise exception 'You cannot mark another user''s notification as read';
  end if;

  if n.is_read then
    return n;
  end if;

  update public.notifications
     set is_read = true,
         read_at = now()
   where id = notification_id
   returning * into n;

  return n;
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_notification_read(uuid) from anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.notifications
     set is_read = true,
         read_at = now()
   where recipient_user_id = auth.uid()
     and is_read = false;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.mark_all_notifications_read() from anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Welcome notification on new buyer/supplier profile
-- ---------------------------------------------------------------------------
create or replace function public.trg_profiles_welcome_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'buyer' then
    perform public._create_system_notification(
      new.id,
      'account.welcome',
      'Welcome to Trade Grid Global',
      'Complete your company profile to unlock more features.',
      null,
      null,
      '/onboarding/buyer',
      jsonb_build_object('role', 'buyer'),
      'normal'
    );
  elsif new.role = 'supplier' then
    perform public._create_system_notification(
      new.id,
      'account.welcome',
      'Welcome to Trade Grid Global',
      'Complete your company profile to start listing and trading.',
      null,
      null,
      '/onboarding/supplier',
      jsonb_build_object('role', 'supplier'),
      'normal'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.trg_profiles_welcome_notification() from public;
revoke all on function public.trg_profiles_welcome_notification() from anon;
revoke all on function public.trg_profiles_welcome_notification() from authenticated;

drop trigger if exists profiles_welcome_notification on public.profiles;

create trigger profiles_welcome_notification
  after insert on public.profiles
  for each row
  execute function public.trg_profiles_welcome_notification();

-- ---------------------------------------------------------------------------
-- 5) Company verification submission RPC (H1)
--    Genuine user submission is NOT inferrable from status alone because admins
--    can also set under_review via direct UPDATE. Submission notifications are
--    emitted only through this RPC, called from lib/auth/onboarding.ts.
--
--    Legitimate transitions (current app):
--      pending  -> under_review  (first submission after signup default)
--      rejected -> under_review  (resubmit from onboarding/verification page)
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

  update public.companies
     set verification_status = 'under_review',
         updated_at = now()
   where id = company_id
   returning * into co;

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

revoke all on function public.submit_company_for_verification(uuid) from public;
revoke all on function public.submit_company_for_verification(uuid) from anon;
grant execute on function public.submit_company_for_verification(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Company verification admin outcome notifications (trigger)
--    under_review submission alerts are intentionally NOT handled here.
-- ---------------------------------------------------------------------------
create or replace function public.trg_companies_verification_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dashboard_path text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.verification_status is not distinct from new.verification_status then
    return new;
  end if;

  dashboard_path := '/dashboard/' || coalesce(new.account_type, 'buyer');

  if new.verification_status = 'verified' then
    perform public._create_system_notification(
      new.user_id,
      'verification.approved',
      'Company verified',
      'Your company verification has been approved.',
      'company',
      new.id,
      dashboard_path,
      jsonb_build_object('company_id', new.id),
      'normal'
    );
  elsif new.verification_status = 'rejected' then
    perform public._create_system_notification(
      new.user_id,
      'verification.rejected',
      'Verification requires attention',
      'Your company verification was not approved. Review the feedback and update your information.',
      'company',
      new.id,
      '/onboarding/verification',
      jsonb_build_object('company_id', new.id),
      'high'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.trg_companies_verification_notifications() from public;
revoke all on function public.trg_companies_verification_notifications() from anon;
revoke all on function public.trg_companies_verification_notifications() from authenticated;

drop trigger if exists companies_verification_notifications on public.companies;

create trigger companies_verification_notifications
  after update on public.companies
  for each row
  execute function public.trg_companies_verification_notifications();

-- ---------------------------------------------------------------------------
-- 7) Product moderation RPC extensions (atomic with state transition)
-- ---------------------------------------------------------------------------
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

revoke all on function public.submit_product_for_review(uuid) from public;
revoke all on function public.submit_product_for_review(uuid) from anon;
grant execute on function public.submit_product_for_review(uuid) to authenticated;

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

revoke all on function public.approve_product(uuid) from public;
revoke all on function public.approve_product(uuid) from anon;
grant execute on function public.approve_product(uuid) to authenticated;

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

  update public.products
     set status = 'rejected',
         rejection_reason = nullif(trim(coalesce(reason, '')), ''),
         updated_at = now()
   where id = product_id
   returning * into prod;

  select user_id into supplier_user_id
  from public.companies
  where id = prod.company_id;

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

revoke all on function public.reject_product(uuid, text) from public;
revoke all on function public.reject_product(uuid, text) from anon;
grant execute on function public.reject_product(uuid, text) to authenticated;

commit;

notify pgrst, 'reload schema';
