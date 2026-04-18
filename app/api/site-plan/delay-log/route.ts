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

  // Verify user has access to the project's company
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("company_id")
    .eq("id", targetTask.project_id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", project.company_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
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
  let propagationWarning: string | undefined;

  if (impacts_completion === true && delay_days > 0) {
    try {
      const { data: projectTasks, error: tasksErr } = await supabaseAdmin
        .from("siteplan_tasks")
        .select("*")
        .eq("project_id", targetTask.project_id);

      if (tasksErr || !projectTasks) {
        throw new Error("Failed to load project tasks");
      }

      const updates = computeDelayPropagation(
        task_id,
        delay_days,
        projectTasks as SitePlanTask[]
      );

      if (updates.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from("siteplan_tasks")
          .upsert(
            updates.map((u) => ({
              id: u.taskId,
              start_date: u.newStartDate,
              end_date: u.newEndDate,
            }))
          );

        if (upsertError) throw upsertError;

        affectedTaskIds = updates.map((u) => u.taskId);

        await supabaseAdmin
          .from("siteplan_delay_logs")
          .update({ affected_task_ids: affectedTaskIds })
          .eq("id", delayLog.id);
      }
    } catch {
      propagationWarning = "Could not push dates";
    }
  }

  return NextResponse.json({
    success: true,
    delay_log: {
      ...delayLog,
      affected_task_ids: affectedTaskIds,
    },
    affected_task_ids: affectedTaskIds,
    ...(propagationWarning ? { propagationWarning } : {}),
  });
}
