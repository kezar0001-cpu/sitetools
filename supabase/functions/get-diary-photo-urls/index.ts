import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight first
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Now check auth for actual requests
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let diary_id: string | undefined;
  try {
    const body = await req.json();
    diary_id = body.diary_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!diary_id) {
    return new Response(JSON.stringify({ error: "diary_id is required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // User-scoped client — queries respect RLS so callers only see their own diary's photos
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service-role client — used only for storage signed URL generation
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: photos, error: photosError } = await userClient
    .from("site_diary_photos")
    .select("*")
    .eq("diary_id", diary_id)
    .order("created_at", { ascending: true });

  if (photosError) {
    return new Response(JSON.stringify({ error: photosError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!photos || photos.length === 0) {
    return new Response(JSON.stringify({ photos: [] }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Batch-generate signed URLs with 7-day TTL via service role
  const paths = photos.map((p: { storage_path: string }) => p.storage_path);
  const { data: signedData, error: signedError } = await serviceClient.storage
    .from("diary_media")
    .createSignedUrls(paths, SIGNED_URL_TTL);

  if (signedError) {
    // Return photos without signed URLs rather than failing entirely
    console.warn("[get-diary-photo-urls] Failed to generate signed URLs:", signedError.message);
    return new Response(JSON.stringify({ photos }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const urlMap = new Map<string, string>(
    (signedData ?? [])
      .filter((s: { path: string | null; signedUrl: string }) => s.path !== null)
      .map((s: { path: string; signedUrl: string }) => [s.path, s.signedUrl])
  );

  const photosWithUrls = photos.map((p: { storage_path: string }) => ({
    ...p,
    signedUrl: urlMap.get(p.storage_path) ?? undefined,
  }));

  return new Response(JSON.stringify({ photos: photosWithUrls }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
