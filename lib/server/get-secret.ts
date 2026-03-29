import { SupabaseClient } from "@supabase/supabase-js";

const cache = new Map<string, { value: string; expiresAt: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve a secret by name.
 * 1. Check process.env (local dev / platform env vars)
 * 2. Check in-memory cache
 * 3. Query the Supabase vault (vault.decrypted_secrets view)
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

  // 3. Supabase vault
  try {
    const { data, error } = await supabaseAdmin
      .schema("vault")
      .from("decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", name)
      .maybeSingle();

    if (error || !data?.decrypted_secret) return null;

    cache.set(name, {
      value: data.decrypted_secret,
      expiresAt: Date.now() + TTL_MS,
    });
    return data.decrypted_secret;
  } catch {
    return null;
  }
}
