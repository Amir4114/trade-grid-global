-- Trade Grid Global: admin role hardening
--
-- SECURITY DEFECT:
-- public.profiles allows authenticated users to update their own row.
-- Because RLS is row-level, that policy alone does not prevent a buyer or
-- supplier from attempting to change profiles.role to 'admin'.
--
-- SECURITY INVARIANT:
-- Untrusted client requests must never be able to:
--   1. create a profile with role = 'admin', or
--   2. promote a non-admin profile to role = 'admin'.
--
-- Existing admins may update their own profile while retaining role='admin'.
-- Trusted database operations, including SQL Editor / privileged server-side
-- administration, may provision admins.
--
-- This migration is additive and does not modify migrations 001-006.

begin;

create or replace function public.enforce_admin_role_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  request_role text;
begin
  -- Read the JWT role when the operation comes through Supabase/PostgREST.
  -- current_setting(..., true) returns NULL when no JWT claim is present,
  -- such as direct privileged SQL execution.
  request_role := nullif(
    current_setting('request.jwt.claim.role', true),
    ''
  );

  -- Treat normal API client roles as untrusted.
  --
  -- We check BOTH the JWT request role and current_user so the guard does not
  -- depend on only one execution-context signal.
  if request_role in ('anon', 'authenticated')
     or current_user in ('anon', 'authenticated') then

    -- INSERT: an untrusted client may never create an admin profile.
    if tg_op = 'INSERT' and new.role = 'admin' then
      raise exception 'Not authorized to assign the admin role'
        using errcode = '42501';
    end if;

    -- UPDATE: an untrusted client may never promote a non-admin profile
    -- to admin.
    if tg_op = 'UPDATE'
       and new.role = 'admin'
       and old.role is distinct from 'admin' then
      raise exception 'Not authorized to assign the admin role'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- Trigger functions are not intended to be called directly.
revoke all on function public.enforce_admin_role_guard() from public;
revoke all on function public.enforce_admin_role_guard() from anon;
revoke all on function public.enforce_admin_role_guard() from authenticated;

drop trigger if exists enforce_admin_role_guard on public.profiles;

create trigger enforce_admin_role_guard
  before insert or update on public.profiles
  for each row
  execute function public.enforce_admin_role_guard();

commit;