import { SupabaseClient } from "@supabase/supabase-js";

const cache = new Map<string, { value: string; expiresAt: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve a secret by name.
 * 1. Check process.env (local dev / platform env vars)
 * 2. Check in-memory cache
 * 3. Query the Supabase vault via the read_vault_secret RPC function
 */
export async function getSecret(
  name: string,
  supabaseAdmin: SupabaseClient
): Promise<string | null> {
  // 1. Environment variable takes priority (local dev)
  const envValue = process.env[name];
  if (envValue) return envValue;

  // 2. In-memory cache
  const cached = cache.get(name);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  // 3. Supabase vault via RPC
  try {
    const { data, error } = await supabaseAdmin.rpc("read_vault_secret", {
      secret_name: name,
    });

    if (error || !data) return null;

    const secret = typeof data === "string" ? data : null;
    if (!secret) return null;

    cache.set(name, {
      value: secret,
      expiresAt: Date.now() + TTL_MS,
    });
    return secret;
  } catch {
    return null;
  }
}
