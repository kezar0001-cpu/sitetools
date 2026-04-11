/**
 * CMS credential store — server-only, never import from client components.
 *
 * Priority for reads:
 *   1. cms_settings table in Supabase  (written by /cms/recover)
 *   2. CMS_ADMIN_* environment variables
 *   3. Hard-coded development defaults  (admin / admin123)
 *
 * Writes always go to Supabase so they survive serverless cold-starts
 * and work on read-only filesystems (e.g. Vercel).
 */

import { createClient } from "@supabase/supabase-js";

interface CmsCredentials {
  username: string;
  password: string;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getCmsCredentials(): Promise<CmsCredentials> {
  const admin = getAdminClient();
  if (admin) {
    const { data } = await admin
      .from("cms_settings")
      .select("key, value")
      .in("key", ["cms_admin_username", "cms_admin_password"]);

    if (data && data.length === 2) {
      const row = (k: string) => data.find((r: { key: string; value: string }) => r.key === k)?.value;
      const username = row("cms_admin_username");
      const password = row("cms_admin_password");
      if (username && password) return { username, password };
    }
  }

  // Fall back to environment variables / hardcoded defaults.
  return {
    username: process.env.CMS_ADMIN_USERNAME ?? "admin",
    password: process.env.CMS_ADMIN_PASSWORD ?? "admin123",
  };
}

export async function writeCmsCredentials(credentials: CmsCredentials): Promise<void> {
  const admin = getAdminClient();
  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Add it to your environment variables (Vercel dashboard → Settings → Environment Variables) and redeploy.",
    );
  }

  const now = new Date().toISOString();
  const rows = [
    { key: "cms_admin_username", value: credentials.username, updated_at: now },
    { key: "cms_admin_password", value: credentials.password, updated_at: now },
  ];

  const { error } = await admin.from("cms_settings").upsert(rows, { onConflict: "key" });

  if (error) {
    throw new Error(`Failed to save credentials: ${error.message}`);
  }
}

/** Returns true when a recovery token has been configured in the environment. */
export function recoveryEnabled(): boolean {
  return (process.env.CMS_RECOVERY_TOKEN ?? "").length >= 16;
}

/** Validates the supplied token against the environment variable. */
export function validateRecoveryToken(token: string): boolean {
  const configured = process.env.CMS_RECOVERY_TOKEN ?? "";
  if (configured.length < 16) return false;
  return token === configured;
}
