-- Trade Grid Global: verification submission and owner-field hardening
--
-- Enforces:
--   1) Required, storage-backed company evidence before trusted submission.
--   2) Owner-created document metadata always starts pending.
--   3) Authenticated owners cannot change marketplace role/account type/risk.
--
-- Additive only. Depends on migrations 001-018.

begin;

create or replace function public.trg_documents_owner_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owns_company boolean;
begin
  select exists (
    select 1
      from public.companies c
     where c.id = new.company_id
       and c.user_id = auth.uid()
  ) into owns_company;

  if owns_company and not public.is_admin() then
    if nullif(btrim(new.doc_type), '') is null then
      raise exception 'Document type is required';
    end if;

    if nullif(btrim(new.document_name), '') is null then
      raise exception 'Document name is required';
    end if;

    if new.file_url not like 'documents/' || new.company_id::text || '/%' then
      raise exception 'Document storage path does not belong to this company';
    end if;

    if not exists (
      select 1
        from storage.objects o
       where o.bucket_id = 'company-docs'
         and o.name = new.file_url
    ) then
      raise exception 'Document storage object does not exist';
    end if;

    new.status := 'pending';
    new.uploaded_at := now();
  end if;

  return new;
end;
$$;

revoke all on function public.trg_documents_owner_guard() from public;
revoke all on function public.trg_documents_owner_guard() from anon;
revoke all on function public.trg_documents_owner_guard() from authenticated;

drop trigger if exists documents_owner_guard on public.documents;
create trigger documents_owner_guard
  before insert on public.documents
  for each row
  execute function public.trg_documents_owner_guard();

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
     and new.role is distinct from old.role then
    raise exception 'Marketplace role cannot be changed after registration'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.trg_marketplace_role_guard() from public;
revoke all on function public.trg_marketplace_role_guard() from anon;
revoke all on function public.trg_marketplace_role_guard() from authenticated;

drop trigger if exists marketplace_role_guard on public.profiles;
create trigger marketplace_role_guard
  before update on public.profiles
  for each row
  execute function public.trg_marketplace_role_guard();

create or replace function public.trg_company_protected_fields_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.user_id and not public.is_admin() then
    if new.user_id is distinct from old.user_id
       or (
         new.account_type is distinct from old.account_type
         and not (
           old.account_type is null
           and new.account_type in ('buyer', 'supplier')
           and exists (
             select 1
               from public.profiles p
              where p.id = auth.uid()
                and p.role = new.account_type
           )
         )
       )
       or new.risk_score is distinct from old.risk_score then
      raise exception 'Protected company fields cannot be changed by the owner'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.trg_company_protected_fields_guard() from public;
revoke all on function public.trg_company_protected_fields_guard() from anon;
revoke all on function public.trg_company_protected_fields_guard() from authenticated;

drop trigger if exists company_protected_fields_guard on public.companies;
create trigger company_protected_fields_guard
  before update on public.companies
  for each row
  execute function public.trg_company_protected_fields_guard();

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

  select * into co from public.companies where id = $1;
  if not found then
    raise exception 'Company not found';
  end if;

  if co.user_id <> auth.uid() then
    raise exception 'You cannot submit verification for a company you do not own';
  end if;

  if co.verification_status not in ('pending', 'rejected') then
    raise exception 'Only pending or rejected companies can be submitted for verification';
  end if;

  if not exists (
    select 1
      from public.documents d
      join storage.objects o
        on o.bucket_id = 'company-docs'
       and o.name = d.file_url
     where d.company_id = $1
       and d.doc_type = 'Trade License'
       and d.status in ('pending', 'approved')
       and d.file_url like 'documents/' || $1::text || '/%'
  ) then
    raise exception 'A valid Trade License document is required';
  end if;

  if not exists (
    select 1
      from public.documents d
      join storage.objects o
        on o.bucket_id = 'company-docs'
       and o.name = d.file_url
     where d.company_id = $1
       and d.doc_type = 'Company Registration'
       and d.status in ('pending', 'approved')
       and d.file_url like 'documents/' || $1::text || '/%'
  ) then
    raise exception 'A valid Company Registration document is required';
  end if;

  perform set_config('tradegrid.verification_submit', $1::text, true);

  update public.companies
     set verification_status = 'under_review',
         updated_at = now()
   where id = $1
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

revoke all on function public.submit_company_for_verification(uuid) from public;
revoke all on function public.submit_company_for_verification(uuid) from anon;
grant execute on function public.submit_company_for_verification(uuid) to authenticated;

create or replace function public.get_company_verification_feedback(company_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  feedback text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
      from public.companies c
     where c.id = $1
       and c.user_id = auth.uid()
  ) then
    raise exception 'You cannot read verification feedback for this company';
  end if;

  select vc.decision_reason
    into feedback
    from public.verification_cases vc
   where vc.case_type = 'company_verification'
     and vc.entity_id = $1
     and vc.subject_user_id = auth.uid()
     and vc.status = 'rejected'
   order by vc.decided_at desc nulls last, vc.updated_at desc
   limit 1;

  return feedback;
end;
$$;

revoke all on function public.get_company_verification_feedback(uuid) from public;
revoke all on function public.get_company_verification_feedback(uuid) from anon;
grant execute on function public.get_company_verification_feedback(uuid) to authenticated;

commit;
