-- Trade Grid Global: atomic marketplace account provisioning
--
-- New marketplace signup is one database transaction:
--   auth.users -> public.profiles -> public.companies
--
-- The Auth insert is rolled back if either public record cannot be created.
-- An authenticated recovery RPC repairs legacy Auth users that were committed
-- before profile/company provisioning failed.
--
-- Additive only. Depends on migrations 001-020.

begin;

create or replace function public.trg_marketplace_role_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and auth.uid() = old.id
     and not public.is_admin()
     and new.role is distinct from old.role
     and current_setting('tradegrid.signup_recovery', true)
         is distinct from old.id::text
     and current_setting('tradegrid.signup_provisioning', true)
         is distinct from old.id::text then
    raise exception 'Marketplace role cannot be changed after registration'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.trg_marketplace_role_guard() from public;
revoke all on function public.trg_marketplace_role_guard() from anon;
revoke all on function public.trg_marketplace_role_guard() from authenticated;

create or replace function public._replace_marketplace_welcome_notification(
  p_user_id uuid,
  p_marketplace_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_marketplace_role not in ('buyer', 'supplier') then
    raise exception 'Marketplace role must be buyer or supplier';
  end if;

  delete from public.notifications n
   where n.recipient_user_id = p_user_id
     and n.type = 'account.welcome';

  perform public._create_system_notification(
    p_user_id,
    'account.welcome',
    'Welcome to Trade Grid Global',
    case
      when p_marketplace_role = 'supplier'
        then 'Complete your company profile to start listing and trading.'
      else 'Complete your company profile to unlock more features.'
    end,
    null,
    null,
    '/onboarding/' || p_marketplace_role,
    jsonb_build_object('role', p_marketplace_role),
    'normal'
  );
end;
$$;

revoke all on function public._replace_marketplace_welcome_notification(uuid, text)
  from public;
revoke all on function public._replace_marketplace_welcome_notification(uuid, text)
  from anon;
revoke all on function public._replace_marketplace_welcome_notification(uuid, text)
  from authenticated;

create or replace function public.provision_marketplace_account_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  marketplace_role text;
  full_name_value text;
  company_name_value text;
begin
  -- Auth users created by administration, OAuth, or future identity flows are
  -- not implicitly assigned a marketplace role.
  if new.raw_user_meta_data ->> 'tradegrid_marketplace_signup'
     is distinct from 'true' then
    return new;
  end if;

  marketplace_role := nullif(
    btrim(new.raw_user_meta_data ->> 'marketplace_role'),
    ''
  );
  full_name_value := nullif(
    btrim(new.raw_user_meta_data ->> 'full_name'),
    ''
  );
  company_name_value := nullif(
    btrim(new.raw_user_meta_data ->> 'company_name'),
    ''
  );

  if new.email is null or nullif(btrim(new.email), '') is null then
    raise exception 'A business email is required for marketplace signup';
  end if;

  if marketplace_role not in ('buyer', 'supplier') then
    raise exception 'Marketplace role must be buyer or supplier';
  end if;

  if full_name_value is null or char_length(full_name_value) > 200 then
    raise exception 'A valid full name is required';
  end if;

  if company_name_value is null or char_length(company_name_value) > 200 then
    raise exception 'A valid company name is required';
  end if;

  perform set_config('tradegrid.signup_provisioning', new.id::text, true);

  -- ON CONFLICT supports the legacy live Auth trigger that creates a default
  -- profile before this canonical trigger executes. Both operations remain in
  -- the same Auth transaction.
  insert into public.profiles (
    id,
    email,
    full_name,
    role
  )
  values (
    new.id,
    new.email,
    full_name_value,
    marketplace_role
  )
  on conflict (id) do update
     set email = excluded.email,
         full_name = excluded.full_name,
         role = excluded.role;

  insert into public.companies (
    user_id,
    company_name,
    country,
    business_type,
    company_structure,
    verification_status,
    risk_score,
    account_type,
    onboarding_completed,
    onboarding_step
  )
  values (
    new.id,
    company_name_value,
    '',
    '',
    '',
    'pending',
    50,
    marketplace_role,
    false,
    'business_info'
  )
  on conflict (user_id) do update
     set company_name = excluded.company_name,
         verification_status = 'pending',
         risk_score = 50,
         account_type = excluded.account_type,
         onboarding_completed = false,
         onboarding_step = 'business_info',
         updated_at = now();

  perform public._replace_marketplace_welcome_notification(
    new.id,
    marketplace_role
  );

  return new;
end;
$$;

revoke all on function public.provision_marketplace_account_from_auth() from public;
revoke all on function public.provision_marketplace_account_from_auth() from anon;
revoke all on function public.provision_marketplace_account_from_auth() from authenticated;

drop trigger if exists zzzz_tradegrid_provision_marketplace_account on auth.users;
create trigger zzzz_tradegrid_provision_marketplace_account
  after insert on auth.users
  for each row
  execute function public.provision_marketplace_account_from_auth();

do $$
begin
  if not exists (
    select 1
      from pg_trigger t
     where t.tgrelid = 'auth.users'::regclass
       and t.tgname = 'zzzz_tradegrid_provision_marketplace_account'
       and not t.tgisinternal
       and t.tgtype = 5
       and t.tgenabled <> 'D'
       and t.tgfoid =
           'public.provision_marketplace_account_from_auth()'::regprocedure
  ) then
    raise exception 'Canonical marketplace Auth provisioning trigger is invalid';
  end if;

  if exists (
    select 1
      from pg_trigger t
     where t.tgrelid = 'auth.users'::regclass
       and not t.tgisinternal
       and t.tgtype = 5
       and t.tgname > 'zzzz_tradegrid_provision_marketplace_account'
       and pg_get_functiondef(t.tgfoid) ~*
           '(insert[[:space:]]+into|update)[[:space:]]+(public[.])?(profiles|companies)'
  ) then
    raise exception
      'A later Auth trigger can overwrite canonical marketplace provisioning';
  end if;
end;
$$;

create or replace function public.recover_incomplete_marketplace_account(
  p_full_name text,
  p_company_name text,
  p_account_type text
)
returns public.companies
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  authenticated_user auth.users;
  existing_profile public.profiles;
  existing_company public.companies;
  recovered_company public.companies;
  profile_found boolean;
  company_found boolean;
  full_name_value text := nullif(btrim(p_full_name), '');
  company_name_value text := nullif(btrim(p_company_name), '');
  account_type_value text := nullif(btrim(p_account_type), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  if account_type_value not in ('buyer', 'supplier') then
    raise exception 'Marketplace role must be buyer or supplier';
  end if;

  if full_name_value is null or char_length(full_name_value) > 200 then
    raise exception 'A valid full name is required';
  end if;

  if company_name_value is null or char_length(company_name_value) > 200 then
    raise exception 'A valid company name is required';
  end if;

  select *
    into authenticated_user
    from auth.users u
   where u.id = auth.uid()
   for update;

  if not found or authenticated_user.email is null then
    raise exception 'Authenticated user not found'
      using errcode = '42501';
  end if;

  select *
    into existing_profile
    from public.profiles p
   where p.id = auth.uid()
   for update;
  profile_found := found;

  select *
    into existing_company
    from public.companies c
   where c.user_id = auth.uid()
   for update;
  company_found := found;

  if company_found then
    raise exception 'Marketplace account is already provisioned'
      using errcode = '23505';
  end if;

  if profile_found and existing_profile.role = 'admin' then
    raise exception 'Administrator accounts cannot use marketplace recovery'
      using errcode = '42501';
  end if;

  perform set_config('tradegrid.signup_recovery', auth.uid()::text, true);

  insert into public.profiles (
    id,
    email,
    full_name,
    role
  )
  values (
    auth.uid(),
    authenticated_user.email,
    full_name_value,
    account_type_value
  )
  on conflict (id) do update
     set email = excluded.email,
         full_name = excluded.full_name,
         role = excluded.role;

  insert into public.companies (
    user_id,
    company_name,
    country,
    business_type,
    company_structure,
    verification_status,
    risk_score,
    account_type,
    onboarding_completed,
    onboarding_step
  )
  values (
    auth.uid(),
    company_name_value,
    '',
    '',
    '',
    'pending',
    50,
    account_type_value,
    false,
    'business_info'
  )
  returning * into recovered_company;

  perform public._replace_marketplace_welcome_notification(
    auth.uid(),
    account_type_value
  );

  return recovered_company;
end;
$$;

revoke all on function public.recover_incomplete_marketplace_account(text, text, text)
  from public;
revoke all on function public.recover_incomplete_marketplace_account(text, text, text)
  from anon;
grant execute on function public.recover_incomplete_marketplace_account(text, text, text)
  to authenticated;

commit;

notify pgrst, 'reload schema';
