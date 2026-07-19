-- Trade Grid Global: owner management of unsubmitted company evidence
--
-- Owners may delete only pending evidence that has never been frozen into a
-- verification case. Rejected, approved, and case-linked evidence remains
-- immutable. Storage deletion is authorized before metadata deletion so the
-- Storage API can remove the physical object.
--
-- Additive only. Depends on migrations 001-021.

begin;

create or replace function public.can_delete_pending_company_document_file(
  p_storage_path text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.documents d
      join public.companies c on c.id = d.company_id
     where d.file_url = p_storage_path
       and d.status = 'pending'
       and c.user_id = auth.uid()
       and c.verification_status in ('pending', 'rejected')
       and not exists (
         select 1
           from public.verification_case_documents vcd
          where vcd.document_id = d.id
       )
  );
$$;

revoke all on function public.can_delete_pending_company_document_file(text)
  from public;
revoke all on function public.can_delete_pending_company_document_file(text)
  from anon;
grant execute on function public.can_delete_pending_company_document_file(text)
  to authenticated;

create or replace function public.can_delete_pending_company_document_metadata(
  p_document_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select exists (
    select 1
      from public.documents d
      join public.companies c on c.id = d.company_id
     where d.id = p_document_id
       and d.status = 'pending'
       and c.user_id = auth.uid()
       and c.verification_status in ('pending', 'rejected')
       and not exists (
         select 1
           from public.verification_case_documents vcd
          where vcd.document_id = d.id
       )
       and not exists (
         select 1
           from storage.objects o
          where o.bucket_id = 'company-docs'
            and o.name = d.file_url
       )
  );
$$;

revoke all on function public.can_delete_pending_company_document_metadata(uuid)
  from public;
revoke all on function public.can_delete_pending_company_document_metadata(uuid)
  from anon;
grant execute on function public.can_delete_pending_company_document_metadata(uuid)
  to authenticated;

drop policy if exists "Users can delete own pending company document files"
  on storage.objects;
create policy "Users can delete own pending company document files"
  on storage.objects for delete
  using (
    bucket_id = 'company-docs'
    and public.can_delete_pending_company_document_file(storage.objects.name)
  );

drop policy if exists "Users can delete own pending company documents"
  on public.documents;
create policy "Users can delete own pending company documents"
  on public.documents for delete
  using (
    public.can_delete_pending_company_document_metadata(documents.id)
  );

commit;

notify pgrst, 'reload schema';
