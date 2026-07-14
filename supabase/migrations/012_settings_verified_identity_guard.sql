-- Trade Grid Global: Settings security — verified identity guard
--
-- Enforces:
--   1) Owner sensitive identity changes on verified or under_review companies
--      automatically reset verification_status to pending (DB layer).
--   2) Non-admin users cannot self-assign verification_status via direct UPDATE.
--      The only user path into under_review is submit_company_for_verification().
--   3) Admin direct UPDATE remains compatible via public.is_admin().
--   4) Emits re-verification / review-invalidation notifications once per event.
--
-- Depends on migration 011 (_create_system_notification, _notify_all_admins).
-- Additive only. Does not modify migrations 001–011.

begin;

-- ---------------------------------------------------------------------------
-- 1) BEFORE UPDATE guard on companies
-- ---------------------------------------------------------------------------
create or replace function public.trg_companies_settings_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rpc_submit_company_id text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  rpc_submit_company_id :=
    coalesce(current_setting('tradegrid.verification_submit', true), '');

  -- Block non-admin verification_status manipulation on direct client UPDATE.
  if new.verification_status is distinct from old.verification_status
     and not public.is_admin() then
    if rpc_submit_company_id = new.id::text
       and old.verification_status in ('pending', 'rejected')
       and new.verification_status = 'under_review' then
      null;
    elsif auth.uid() = old.user_id
          and old.verification_status in ('verified', 'under_review')
          and new.verification_status = 'pending'
          and (
            new.company_name is distinct from old.company_name
            or new.country is distinct from old.country
          ) then
      null;
    else
      new.verification_status := old.verification_status;
    end if;
  end if;

  -- Owner identity invalidation (automatic pending reset; user does not choose).
  if auth.uid() = old.user_id
     and old.verification_status in ('verified', 'under_review') then
    if new.company_name is distinct from old.company_name
       or new.country is distinct from old.country then
      new.verification_status := 'pending';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.trg_companies_settings_guard() from public;
revoke all on function public.trg_companies_settings_guard() from anon;
revoke all on function public.trg_companies_settings_guard() from authenticated;

drop trigger if exists companies_settings_guard on public.companies;

create trigger companies_settings_guard
  before update on public.companies
  for each row
  execute function public.trg_companies_settings_guard();

-- ---------------------------------------------------------------------------
-- 2) Trusted submission RPC — only path into under_review for ordinary users
--    Replaces 011 body to set a transaction-local flag read by the guard.
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
-- 3) AFTER UPDATE notifications for identity invalidation
-- ---------------------------------------------------------------------------
create or replace function public.trg_companies_reverification_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  company_label text;
  identity_changed boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  identity_changed :=
    new.company_name is distinct from old.company_name
    or new.country is distinct from old.country;

  if not identity_changed then
    return new;
  end if;

  company_label := coalesce(nullif(btrim(new.company_name), ''), 'A company');

  if old.verification_status = 'verified'
     and new.verification_status = 'pending' then
    perform public._create_system_notification(
      new.user_id,
      'verification.reverification_required',
      'Re-verification required',
      'Your company identity information changed. Submit verification again to restore your verified status.',
      'company',
      new.id,
      '/onboarding/verification',
      jsonb_build_object(
        'company_id', new.id,
        'company_name', new.company_name,
        'previous_status', old.verification_status
      ),
      'high'
    );

    perform public._notify_all_admins(
      'verification.admin_review_required',
      'Company re-verification required',
      company_label || ' changed verified identity fields and requires re-verification.',
      'company',
      new.id,
      '/dashboard/admin/verification',
      jsonb_build_object(
        'company_id', new.id,
        'company_name', new.company_name,
        'reason', 'identity_change'
      ),
      'high'
    );
  elsif old.verification_status = 'under_review'
        and new.verification_status = 'pending' then
    perform public._create_system_notification(
      new.user_id,
      'verification.review_invalidated',
      'Verification review invalidated',
      'Your in-progress verification was cancelled because company identity information changed. Submit again when ready.',
      'company',
      new.id,
      '/onboarding/verification',
      jsonb_build_object(
        'company_id', new.id,
        'company_name', new.company_name,
        'previous_status', old.verification_status
      ),
      'high'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.trg_companies_reverification_notifications() from public;
revoke all on function public.trg_companies_reverification_notifications() from anon;
revoke all on function public.trg_companies_reverification_notifications() from authenticated;

drop trigger if exists companies_reverification_notifications on public.companies;

create trigger companies_reverification_notifications
  after update on public.companies
  for each row
  execute function public.trg_companies_reverification_notifications();

commit;

notify pgrst, 'reload schema';
