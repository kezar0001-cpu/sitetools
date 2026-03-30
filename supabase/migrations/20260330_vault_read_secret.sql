-- Expose a server-side-only function to read secrets from the Supabase vault.
-- Only callable with the service_role key (used by API routes), not from the
-- client. The vault extension must already be enabled in the project.

create or replace function read_vault_secret(secret_name text)
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = secret_name
  limit 1;
$$;

-- Revoke public access — only service_role (postgres) can call this
revoke execute on function read_vault_secret(text) from public;
revoke execute on function read_vault_secret(text) from anon;
revoke execute on function read_vault_secret(text) from authenticated;
