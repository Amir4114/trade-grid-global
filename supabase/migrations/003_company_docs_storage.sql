-- Trade Grid Global: company document storage bucket and policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-docs',
  'company-docs',
  false,
  5242880,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload own company documents"
  on storage.objects for insert
  with check (
    bucket_id = 'company-docs'
    and (storage.foldername(name))[1] = 'documents'
    and exists (
      select 1
      from public.companies
      where companies.id::text = (storage.foldername(name))[2]
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can read own company documents"
  on storage.objects for select
  using (
    bucket_id = 'company-docs'
    and exists (
      select 1
      from public.companies
      where companies.user_id = auth.uid()
        and name like 'documents/' || companies.id::text || '/%'
    )
  );

create policy "Admins can read all company documents"
  on storage.objects for select
  using (
    bucket_id = 'company-docs'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
