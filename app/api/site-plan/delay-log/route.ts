import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeDelayPropagation } from "@/lib/delayPropagation";
import type { CreateDelayLogPayload, SitePlanTask } from "@/types/siteplan";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: CreateDelayLogPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const {
    task_id,
    delay_days,
    delay_reason,
    delay_category,
    impacts_completion,
  } = body;

  if (!task_id || !delay_reason || !delay_category || delay_days == null) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { data: targetTask, error: targetErr } = await supabaseAdmin
    .from("siteplan_tasks")
    .select("id, project_id")
    .eq("id", task_id)
    .single();

  if (targetErr || !targetTask) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const { data: delayLog, error: insertErr } = await supabaseAdmin
    .from("siteplan_delay_logs")
    .insert({
      task_id,
      delay_days,
      delay_reason,
      delay_category,
      impacts_completion,
      logged_by: user.id,
      affected_task_ids: [],
    })
    .select("id, task_id, delay_days, delay_reason, delay_category, impacts_completion, affected_task_ids")
    .single();

  if (insertErr || !delayLog) {
    return NextResponse.json({ error: "Failed to save delay log." }, { status: 500 });
  }

  let affectedTaskIds: string[] = [];

  if (impacts_completion === true && delay_days > 0) {
    const { data: projectTasks, error: tasksErr } = await supabaseAdmin
      .from("siteplan_tasks")
      .select("*")
      .eq("project_id", targetTask.project_id);

    if (tasksErr || !projectTasks) {
      return NextResponse.json({ error: "Failed to load project tasks." }, { status: 500 });
    }

    const updates = computeDelayPropagation(
      task_id,
      delay_days,
      projectTasks as SitePlanTask[]
    );

    if (updates.length > 0) {
      const updateResults = await Promise.all(
        updates.map((u) =>
          supabaseAdmin
            .from("siteplan_tasks")
            .update({ start_date: u.newStartDate, end_date: u.newEndDate })
            .eq("id", u.taskId)
        )
      );

      const failed = updateResults.find((r) => !!r.error);
      if (failed?.error) {
        return NextResponse.json({ error: "Failed to update affected tasks." }, { status: 500 });
      }

      affectedTaskIds = updates.map((u) => u.taskId);

      await supabaseAdmin
        .from("siteplan_delay_logs")
        .update({ affected_task_ids: affectedTaskIds })
        .eq("id", delayLog.id);
    }
  }

  return NextResponse.json({
    delay_log: {
      ...delayLog,
      affected_task_ids: affectedTaskIds,
    },
    affected_task_ids: affectedTaskIds,
  });
}
