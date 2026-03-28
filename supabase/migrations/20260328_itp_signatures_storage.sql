-- =============================================================
-- Move ITP signatures from inline base64 to Supabase Storage
-- =============================================================

-- Create the storage bucket for ITP signatures (private, not public)
insert into storage.buckets (id, name, public)
values ('itp-signatures', 'itp-signatures', false)
on conflict (id) do nothing;

-- Allow service_role full access (the API route uses service role)
-- No public/anon access needed — signed URLs are generated server-side

-- Allow authenticated users to read signature files for their company's sessions
create policy itp_signatures_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'itp-signatures'
    and (storage.foldername(name))[1] in (
      select s.id::text from public.itp_sessions s
      where s.company_id in (select public.get_my_company_ids())
    )
  );
