// Supabase Edge Function: Auto-archive completed diaries
// This function runs daily via cron and archives diaries that have been completed for 30+ days

import { createClient } from "@supabase/supabase-js";

interface DiaryRow {
  id: string;
  status: string;
  auto_archive_at: string | null;
}

Deno.serve(async (req) => {
  // Verify this is a cron job or authorized request
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date().toISOString();

  try {
    // Find completed diaries where auto_archive_at has passed
    const { data: diariesToArchive, error: fetchError } = await supabase
      .from("site_diaries")
      .select("id, status, auto_archive_at")
      .eq("status", "completed")
      .lte("auto_archive_at", now);

    if (fetchError) {
      console.error("[auto-archive] Error fetching diaries:", fetchError);
      throw fetchError;
    }

    const diaries = (diariesToArchive || []) as DiaryRow[];

    if (diaries.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          archived: 0,
          message: "No diaries to archive" 
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Archive all eligible diaries
    const diaryIds = diaries.map((d) => d.id);
    
    const { error: updateError } = await supabase
      .from("site_diaries")
      .update({ status: "archived" })
      .in("id", diaryIds);

    if (updateError) {
      console.error("[auto-archive] Error archiving diaries:", updateError);
      throw updateError;
    }

    console.log(`[auto-archive] Archived ${diaryIds.length} diaries:`, diaryIds);

    return new Response(
      JSON.stringify({
        success: true,
        archived: diaryIds.length,
        diaryIds,
        timestamp: now,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[auto-archive] Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
        timestamp: now,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
