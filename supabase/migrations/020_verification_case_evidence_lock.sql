-- Trade Grid Global: case-scoped verification evidence and decision integrity
--
-- Enforces:
--   1) Each verification case owns an immutable evidence snapshot.
--   2) Company decisions require an explicit in-review case.
--   3) Rejection reasons are mandatory and evidence statuses support replacement.
--   4) Material identity changes consistently invalidate verification.
--   5) Verification approval does not silently overwrite risk assessment.
--
-- Additive only. Depends on migrations 001-019.

begin;

-- Build canonical CHECK expressions on temporary tables so an existing
-- production constraint is reused only when PostgreSQL confirms that its
-- parsed expression is identical. No existing constraint is dropped or
-- rewritten.
create temporary table migration_020_expected_companies_constraints (
  verification_status text,
  risk_score integer,
  constraint companies_verification_status_check
    check (verification_status in ('pending', 'under_review', 'verified', 'rejected')),
  constraint companies_risk_score_check
    check (risk_score between 0 and 100)
) on commit drop;

create temporary table migration_020_expected_documents_constraints (
  status text,
  constraint documents_status_check
    check (status in ('pending', 'approved', 'rejected'))
) on commit drop;

do $$
declare
  actual_expression text;
  expected_expression text;
  constraint_validated boolean;
begin
  if exists (
    select 1
      from pg_constraint c
     where (
       (
         c.conrelid = 'public.companies'::regclass
         and c.conname in (
           'companies_verification_status_check',
           'companies_risk_score_check'
         )
       ) or (
         c.conrelid = 'public.documents'::regclass
         and c.conname = 'documents_status_check'
       )
     )
       and c.contype <> 'c'
  ) then
    raise exception
      'Migration 020 constraint name is already used by a non-CHECK constraint';
  end if;

  select pg_get_expr(c.conbin, c.conrelid), c.convalidated
    into actual_expression, constraint_validated
    from pg_constraint c
   where c.conrelid = 'public.companies'::regclass
     and c.conname = 'companies_verification_status_check'
     and c.contype = 'c';

  if not found then
    alter table public.companies
      add constraint companies_verification_status_check
      check (verification_status in ('pending', 'under_review', 'verified', 'rejected'));
  else
    select pg_get_expr(c.conbin, c.conrelid)
      into expected_expression
      from pg_constraint c
     where c.conrelid = 'pg_temp.migration_020_expected_companies_constraints'::regclass
       and c.conname = 'companies_verification_status_check'
       and c.contype = 'c';

    if actual_expression is distinct from expected_expression then
      raise exception
        'Existing companies_verification_status_check does not match migration 020. Existing: %, expected: %',
        actual_expression,
        expected_expression;
    end if;

    if not constraint_validated then
      alter table public.companies
        validate constraint companies_verification_status_check;
    end if;
  end if;

  select pg_get_expr(c.conbin, c.conrelid), c.convalidated
    into actual_expression, constraint_validated
    from pg_constraint c
   where c.conrelid = 'public.companies'::regclass
     and c.conname = 'companies_risk_score_check'
     and c.contype = 'c';

  if not found then
    alter table public.companies
      add constraint companies_risk_score_check
      check (risk_score between 0 and 100);
  else
    select pg_get_expr(c.conbin, c.conrelid)
      into expected_expression
      from pg_constraint c
     where c.conrelid = 'pg_temp.migration_020_expected_companies_constraints'::regclass
       and c.conname = 'companies_risk_score_check'
       and c.contype = 'c';

    if actual_expression is distinct from expected_expression then
      raise exception
        'Existing companies_risk_score_check does not match migration 020. Existing: %, expected: %',
        actual_expression,
        expected_expression;
    end if;

    if not constraint_validated then
      alter table public.companies
        validate constraint companies_risk_score_check;
    end if;
  end if;

  select pg_get_expr(c.conbin, c.conrelid), c.convalidated
    into actual_expression, constraint_validated
    from pg_constraint c
   where c.conrelid = 'public.documents'::regclass
     and c.conname = 'documents_status_check'
     and c.contype = 'c';

  if not found then
    alter table public.documents
      add constraint documents_status_check
      check (status in ('pending', 'approved', 'rejected'));
  else
    select pg_get_expr(c.conbin, c.conrelid)
      into expected_expression
      from pg_constraint c
     where c.conrelid = 'pg_temp.migration_020_expected_documents_constraints'::regclass
       and c.conname = 'documents_status_check'
       and c.contype = 'c';

    if actual_expression is distinct from expected_expression then
      raise exception
        'Existing documents_status_check does not match migration 020. Existing: %, expected: %',
        actual_expression,
        expected_expression;
    end if;

    if not constraint_validated then
      alter table public.documents
        validate constraint documents_status_check;
    end if;
  end if;
end;
$$;

create table if not exists public.verification_case_documents (
  case_id uuid not null
    references public.verification_cases(id) on delete restrict,
  document_id uuid not null
    references public.documents(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  primary key (case_id, document_id)
);

do $$
declare
  case_id_attribute smallint;
  document_id_attribute smallint;
  submitted_at_attribute smallint;
begin
  select a.attnum
    into case_id_attribute
    from pg_attribute a
   where a.attrelid = 'public.verification_case_documents'::regclass
     and a.attname = 'case_id'
     and a.atttypid = 'uuid'::regtype
     and a.attnotnull
     and not a.attisdropped;

  select a.attnum
    into document_id_attribute
    from pg_attribute a
   where a.attrelid = 'public.verification_case_documents'::regclass
     and a.attname = 'document_id'
     and a.atttypid = 'uuid'::regtype
     and a.attnotnull
     and not a.attisdropped;

  select a.attnum
    into submitted_at_attribute
    from pg_attribute a
   where a.attrelid = 'public.verification_case_documents'::regclass
     and a.attname = 'submitted_at'
     and a.atttypid = 'timestamp with time zone'::regtype
     and a.attnotnull
     and not a.attisdropped;

  if case_id_attribute is null
     or document_id_attribute is null
     or submitted_at_attribute is null
     or not exists (
       select 1
         from pg_attrdef d
        where d.adrelid = 'public.verification_case_documents'::regclass
          and d.adnum = submitted_at_attribute
          and pg_get_expr(d.adbin, d.adrelid) = 'now()'
     )
     or not exists (
       select 1
         from pg_constraint c
        where c.conrelid = 'public.verification_case_documents'::regclass
          and c.contype = 'p'
          and c.conkey = array[case_id_attribute, document_id_attribute]::smallint[]
     )
     or not exists (
       select 1
         from pg_constraint c
        where c.conrelid = 'public.verification_case_documents'::regclass
          and c.contype = 'f'
          and c.conkey = array[case_id_attribute]::smallint[]
          and c.confrelid = 'public.verification_cases'::regclass
          and c.confdeltype = 'r'
     )
     or not exists (
       select 1
         from pg_constraint c
        where c.conrelid = 'public.verification_case_documents'::regclass
          and c.contype = 'f'
          and c.conkey = array[document_id_attribute]::smallint[]
          and c.confrelid = 'public.documents'::regclass
          and c.confdeltype = 'r'
     ) then
    raise exception
      'Existing verification_case_documents table does not match migration 020';
  end if;
end;
$$;

create index if not exists verification_case_documents_document_idx
  on public.verification_case_documents (document_id);

do $$
declare
  document_id_attribute smallint;
begin
  select a.attnum
    into document_id_attribute
    from pg_attribute a
   where a.attrelid = 'public.verification_case_documents'::regclass
     and a.attname = 'document_id'
     and not a.attisdropped;

  if not exists (
    select 1
      from pg_index i
      join pg_class idx on idx.oid = i.indexrelid
     where idx.relnamespace = 'public'::regnamespace
       and idx.relname = 'verification_case_documents_document_idx'
       and i.indrelid = 'public.verification_case_documents'::regclass
       and i.indnkeyatts = 1
       and i.indkey[0] = document_id_attribute
       and i.indpred is null
       and i.indisvalid
  ) then
    raise exception
      'Existing verification_case_documents_document_idx does not match migration 020';
  end if;
end;
$$;

alter table public.verification_case_documents enable row level security;

do $$
declare
  existing_command text;
  existing_qualifier text;
begin
  select p.cmd, p.qual
    into existing_command, existing_qualifier
    from pg_policies p
   where p.schemaname = 'public'
     and p.tablename = 'verification_case_documents'
     and p.policyname = 'Admins can read verification case documents';

  if not found then
    create policy "Admins can read verification case documents"
      on public.verification_case_documents for select
      using (public.is_admin());
  elsif existing_command <> 'SELECT'
        or regexp_replace(existing_qualifier, '\s+', '', 'g')
           not in ('is_admin()', '(is_admin())', 'public.is_admin()', '(public.is_admin())') then
    raise exception
      'Existing verification_case_documents admin policy does not match migration 020';
  end if;
end;
$$;

revoke all on table public.verification_case_documents from public;
revoke all on table public.verification_case_documents from anon;
revoke insert, update, delete on table public.verification_case_documents from authenticated;
grant select on table public.verification_case_documents to authenticated;

-- Freeze the best available evidence set for reviews already active at apply
-- time. Historical terminal cases are intentionally not reconstructed because
-- their exact reviewed set cannot be proven retroactively.
insert into public.verification_case_documents (case_id, document_id, submitted_at)
select vc.id, d.id, vc.submitted_at
  from public.verification_cases vc
  join public.documents d
    on d.company_id = vc.entity_id
   and d.status in ('pending', 'approved')
  join storage.objects o
    on o.bucket_id = 'company-docs'
   and o.name = d.file_url
 where vc.case_type = 'company_verification'
   and vc.status in ('pending', 'in_review')
   and d.file_url like 'documents/' || vc.entity_id::text || '/%'
on conflict (case_id, document_id) do nothing;

create or replace function public.trg_company_protected_fields_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() <> 'service_role'
       and auth.uid() = new.user_id
       and not public.is_admin() then
      if new.account_type not in ('buyer', 'supplier')
         or not exists (
           select 1
             from public.profiles p
            where p.id = auth.uid()
              and p.role = new.account_type
         ) then
        raise exception 'Company account type must match the registered marketplace role'
          using errcode = '42501';
      end if;

      new.verification_status := 'pending';
      new.risk_score := 50;
    end if;

    return new;
  end if;

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

do $$
declare
  existing_trigger_type smallint;
  existing_trigger_function oid;
begin
  select t.tgtype, t.tgfoid
    into existing_trigger_type, existing_trigger_function
    from pg_trigger t
   where t.tgrelid = 'public.companies'::regclass
     and t.tgname = 'company_protected_fields_guard'
     and not t.tgisinternal;

  if not found then
    create trigger company_protected_fields_guard
      before insert or update on public.companies
      for each row
      execute function public.trg_company_protected_fields_guard();
  elsif existing_trigger_type <> 23
        or existing_trigger_function <>
           'public.trg_company_protected_fields_guard()'::regprocedure then
    drop trigger company_protected_fields_guard on public.companies;
    create trigger company_protected_fields_guard
      before insert or update on public.companies
      for each row
      execute function public.trg_company_protected_fields_guard();
  end if;
end;
$$;

create temporary table migration_020_expected_storage_objects (
  bucket_id text,
  name text
) on commit drop;

alter table migration_020_expected_storage_objects enable row level security;

create policy "Users can upload own company documents"
  on migration_020_expected_storage_objects for insert
  with check (
    bucket_id = 'company-docs'
    and (storage.foldername(name))[1] = 'documents'
    and exists (
      select 1
        from public.companies c
       where c.id::text = (storage.foldername(name))[2]
         and c.user_id = auth.uid()
         and c.verification_status in ('pending', 'rejected')
    )
  );

do $$
declare
  actual_expression text;
  expected_expression text;
  actual_command "char";
  actual_policy_found boolean;
begin
  select pg_get_expr(p.polwithcheck, p.polrelid), p.polcmd
    into actual_expression, actual_command
    from pg_policy p
   where p.polrelid = 'storage.objects'::regclass
     and p.polname = 'Users can upload own company documents';

  actual_policy_found := found;

  select pg_get_expr(p.polwithcheck, p.polrelid)
    into expected_expression
    from pg_policy p
   where p.polrelid = 'pg_temp.migration_020_expected_storage_objects'::regclass
     and p.polname = 'Users can upload own company documents';

  if not found or expected_expression is null then
    raise exception 'Unable to build migration 020 storage policy contract';
  end if;

  if not actual_policy_found then
    create policy "Users can upload own company documents"
      on storage.objects for insert
      with check (
        bucket_id = 'company-docs'
        and (storage.foldername(name))[1] = 'documents'
        and exists (
          select 1
            from public.companies c
           where c.id::text = (storage.foldername(name))[2]
             and c.user_id = auth.uid()
             and c.verification_status in ('pending', 'rejected')
        )
      );
  elsif actual_command <> 'a' or actual_expression is distinct from expected_expression then
    drop policy "Users can upload own company documents" on storage.objects;
    create policy "Users can upload own company documents"
      on storage.objects for insert
      with check (
        bucket_id = 'company-docs'
        and (storage.foldername(name))[1] = 'documents'
        and exists (
          select 1
            from public.companies c
           where c.id::text = (storage.foldername(name))[2]
             and c.user_id = auth.uid()
             and c.verification_status in ('pending', 'rejected')
        )
      );
  end if;
end;
$$;

create or replace function public.trg_documents_owner_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  company_status text;
begin
  select c.verification_status
    into company_status
    from public.companies c
   where c.id = new.company_id
     and c.user_id = auth.uid();

  if found and not public.is_admin() then
    if company_status not in ('pending', 'rejected') then
      raise exception 'Documents cannot be changed during or after verification';
    end if;

    if nullif(btrim(new.doc_type), '') is null then
      raise exception 'Document type is required';
    end if;

    if new.doc_type not in (
      'Trade License',
      'Company Registration',
      'Tax Certificate',
      'Halal Certificate',
      'ISO Certificate',
      'HACCP Certificate',
      'Health Certificate',
      'Phytosanitary Certificate',
      'Certificate of Origin',
      'Product Catalog',
      'Lab Test Report',
      'Export License'
    ) then
      raise exception 'Unsupported company document type';
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

create or replace function public.trg_companies_settings_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rpc_submit_company_id text;
  rpc_decision_company_id text;
  material_identity_changed boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  rpc_submit_company_id :=
    coalesce(current_setting('tradegrid.verification_submit', true), '');
  rpc_decision_company_id :=
    coalesce(current_setting('tradegrid.verification_decision', true), '');

  material_identity_changed :=
    new.company_name is distinct from old.company_name
    or new.country is distinct from old.country
    or new.business_type is distinct from old.business_type
    or new.company_structure is distinct from old.company_structure;

  if new.verification_status is distinct from old.verification_status then
    if auth.role() = 'service_role' then
      null;
    elsif rpc_submit_company_id = new.id::text
       and old.verification_status in ('pending', 'rejected')
       and new.verification_status = 'under_review' then
      null;
    elsif public.is_admin()
          and rpc_decision_company_id = new.id::text
          and old.verification_status = 'under_review'
          and new.verification_status in ('verified', 'rejected') then
      null;
    elsif auth.uid() = old.user_id
          and old.verification_status in ('verified', 'under_review')
          and new.verification_status = 'pending'
          and material_identity_changed then
      null;
    elsif public.is_admin() then
      raise exception 'Admins must use verification decision RPCs'
        using errcode = '42501';
    else
      new.verification_status := old.verification_status;
    end if;
  end if;

  if auth.role() <> 'service_role'
     and (auth.uid() = old.user_id or public.is_admin())
     and old.verification_status in ('verified', 'under_review')
     and material_identity_changed then
    new.verification_status := 'pending';
  end if;

  return new;
end;
$$;

revoke all on function public.trg_companies_settings_guard() from public;
revoke all on function public.trg_companies_settings_guard() from anon;
revoke all on function public.trg_companies_settings_guard() from authenticated;

create or replace function public.trg_companies_reverification_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  company_label text;
  material_identity_changed boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  material_identity_changed :=
    new.company_name is distinct from old.company_name
    or new.country is distinct from old.country
    or new.business_type is distinct from old.business_type
    or new.company_structure is distinct from old.company_structure;

  if not material_identity_changed then
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

create or replace function public.submit_company_for_verification(company_id uuid)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  co public.companies;
  verification_case public.verification_cases;
  company_label text;
  dashboard_path text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_admin() then
    raise exception 'Admins cannot submit company verification on behalf of users';
  end if;

  select *
    into co
    from public.companies
   where id = $1
   for update;

  if not found then
    raise exception 'Company not found';
  end if;

  if co.user_id <> auth.uid() then
    raise exception 'You cannot submit verification for a company you do not own';
  end if;

  if co.verification_status not in ('pending', 'rejected') then
    raise exception 'Only pending or rejected companies can be submitted for verification';
  end if;

  if not co.onboarding_completed
     or nullif(btrim(co.company_name), '') is null
     or nullif(btrim(co.country), '') is null
     or nullif(btrim(co.business_type), '') is null
     or nullif(btrim(co.company_structure), '') is null
     or co.account_type not in ('buyer', 'supplier') then
    raise exception 'Complete the legal company profile before verification submission';
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

  verification_case := public._open_or_refresh_verification_case(
    'company_verification',
    co.id,
    co.user_id,
    co.id,
    'user_submission'
  );

  insert into public.verification_case_documents (case_id, document_id)
  select verification_case.id, d.id
    from public.documents d
    join storage.objects o
      on o.bucket_id = 'company-docs'
     and o.name = d.file_url
   where d.company_id = co.id
     and d.status in ('pending', 'approved')
     and d.file_url like 'documents/' || co.id::text || '/%'
  on conflict (case_id, document_id) do nothing;

  company_label := coalesce(nullif(btrim(co.company_name), ''), 'A company');
  dashboard_path := '/dashboard/' || co.account_type;

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
      'company_name', co.company_name,
      'verification_case_id', verification_case.id
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
      'company_name', co.company_name,
      'verification_case_id', verification_case.id
    ),
    'high'
  );

  return co;
end;
$$;

revoke all on function public.submit_company_for_verification(uuid) from public;
revoke all on function public.submit_company_for_verification(uuid) from anon;
grant execute on function public.submit_company_for_verification(uuid) to authenticated;

create or replace function public.approve_company_verification(
  p_company_id uuid,
  p_risk_score integer default null
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  co public.companies;
  verification_case public.verification_cases;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve company verification';
  end if;

  if p_risk_score is not null then
    raise exception 'Risk score is managed independently from verification approval';
  end if;

  select *
    into co
    from public.companies
   where id = p_company_id
   for update;

  if not found then
    raise exception 'Company not found';
  end if;

  if co.verification_status <> 'under_review' then
    raise exception 'Only companies under review can be approved';
  end if;

  select *
    into verification_case
    from public.verification_cases vc
   where vc.case_type = 'company_verification'
     and vc.entity_id = p_company_id
     and vc.status = 'in_review'
   order by vc.submitted_at desc
   limit 1
   for update;

  if not found then
    raise exception 'Start the verification case review before approval';
  end if;

  if not exists (
    select 1
      from public.verification_case_documents vcd
      join public.documents d on d.id = vcd.document_id
     where vcd.case_id = verification_case.id
       and d.doc_type = 'Trade License'
       and d.status in ('pending', 'approved')
  ) or not exists (
    select 1
      from public.verification_case_documents vcd
      join public.documents d on d.id = vcd.document_id
     where vcd.case_id = verification_case.id
       and d.doc_type = 'Company Registration'
       and d.status in ('pending', 'approved')
  ) then
    raise exception 'The case does not contain all required verification evidence';
  end if;

  perform set_config('tradegrid.verification_decision', p_company_id::text, true);

  update public.companies
     set verification_status = 'verified',
         updated_at = now()
   where id = p_company_id
   returning * into co;

  update public.documents d
     set status = 'approved'
    from public.verification_case_documents vcd
   where vcd.case_id = verification_case.id
     and vcd.document_id = d.id
     and d.status = 'pending';

  perform public._resolve_verification_case(
    'company_verification',
    p_company_id,
    'approved',
    auth.uid(),
    null
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
  verification_case public.verification_cases;
  rejection_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject company verification';
  end if;

  if rejection_reason is null then
    raise exception 'A rejection reason is required';
  end if;

  select *
    into co
    from public.companies
   where id = p_company_id
   for update;

  if not found then
    raise exception 'Company not found';
  end if;

  if co.verification_status <> 'under_review' then
    raise exception 'Only companies under review can be rejected';
  end if;

  select *
    into verification_case
    from public.verification_cases vc
   where vc.case_type = 'company_verification'
     and vc.entity_id = p_company_id
     and vc.status = 'in_review'
   order by vc.submitted_at desc
   limit 1
   for update;

  if not found then
    raise exception 'Start the verification case review before rejection';
  end if;

  perform set_config('tradegrid.verification_decision', p_company_id::text, true);

  update public.companies
     set verification_status = 'rejected',
         updated_at = now()
   where id = p_company_id
   returning * into co;

  update public.documents d
     set status = 'rejected'
    from public.verification_case_documents vcd
   where vcd.case_id = verification_case.id
     and vcd.document_id = d.id
     and d.status = 'pending';

  perform public._resolve_verification_case(
    'company_verification',
    p_company_id,
    'rejected',
    auth.uid(),
    rejection_reason
  );

  return co;
end;
$$;

revoke all on function public.reject_company_verification(uuid, text) from public;
revoke all on function public.reject_company_verification(uuid, text) from anon;
grant execute on function public.reject_company_verification(uuid, text) to authenticated;

commit;

notify pgrst, 'reload schema';
