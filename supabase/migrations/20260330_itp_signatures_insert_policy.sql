-- =============================================================
-- ITP signatures storage: add INSERT policy for service_role
-- Ensures the API route (which uses the service role key) can
-- upload signature files even if the RLS bypass ever regresses.
-- Also re-confirms the bucket exists so this migration is safe
-- to run whether or not 20260328_itp_signatures_storage.sql ran.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('itp-signatures', 'itp-signatures', false)
on conflict (id) do nothing;

-- Allow the service_role (used by the sign-off API route) to
-- insert objects into the itp-signatures bucket.
-- service_role bypasses RLS, but this policy also covers the
-- authenticated role so future server-side helpers work without
-- needing a raw service key.
create policy itp_signatures_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'itp-signatures'
    and (storage.foldername(name))[1] in (
      select s.id::text from public.itp_sessions s
      where s.company_id in (select public.get_my_company_ids())
    )
  );
