import { supabase } from "@/lib/supabase";
import { calculateDurationDays, normalizePercent } from "./validation";
import {
  PlanPhase,
  PlanTask,
  PlannerPlanWithContext,
  ProjectPlan,
  TaskStatus,
  TaskUpdate,
  PublicHoliday,
  WeatherDelayLog,
  TaskDependency,
} from "./types";

// ─── Plans ───

export async function fetchPlannerPlans(companyId: string): Promise<PlannerPlanWithContext[]> {
  const { data, error } = await supabase
    .from("project_plans")
    .select("*, projects(id,name), project_plan_sites(sites(id,name))")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (!error) return (data ?? []) as PlannerPlanWithContext[];

  // Fallback: project_plan_sites table or FK relationship may not exist yet
  const msg = (error as { message?: string }).message ?? "";
  if (msg.includes("project_plan_sites") || msg.includes("PGRST200") || msg.includes("relationship")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("project_plans")
      .select("*, projects(id,name)")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });

    if (!fallbackError) {
      return (fallbackData ?? []).map((p) => ({
        ...(p as Record<string, unknown>),
        project_plan_sites: [],
      })) as unknown as PlannerPlanWithContext[];
    }

    // If projects FK also missing, fall back to plain select
    const { data: plainData, error: plainError } = await supabase
      .from("project_plans")
      .select("*")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });

    if (plainError) throw plainError;
    return (plainData ?? []).map((p) => ({
      ...(p as Record<string, unknown>),
      projects: null,
      project_plan_sites: [],
    })) as unknown as PlannerPlanWithContext[];
  }

  throw error;
}

/** Plans scoped to a specific project */
export async function fetchProjectPlans(projectId: string): Promise<PlannerPlanWithContext[]> {
  const { data, error } = await supabase
    .from("project_plans")
    .select("*, projects(id,name), project_plan_sites(sites(id,name))")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (!error) return (data ?? []) as PlannerPlanWithContext[];

  // Fallback: project_plan_sites table or FK relationship may not exist yet
  const msg = (error as { message?: string }).message ?? "";
  if (msg.includes("project_plan_sites") || msg.includes("PGRST200") || msg.includes("relationship")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("project_plans")
      .select("*, projects(id,name)")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });

    if (!fallbackError) {
      return (fallbackData ?? []).map((p) => ({
        ...(p as Record<string, unknown>),
        project_plan_sites: [],
      })) as unknown as PlannerPlanWithContext[];
    }
  }

  throw error;
}

export async function createPlannerPlan(input: {
  companyId: string;
  projectId?: string | null;
  siteIds?: string[];
  name: string;
  description?: string;
  userId?: string | null;
}): Promise<ProjectPlan> {
  const { data, error } = await supabase
    .from("project_plans")
    .insert({
      company_id: input.companyId,
      project_id: input.projectId ?? null,
      name: input.name,
      description: input.description?.trim() || null,
      created_by: input.userId ?? null,
      updated_by: input.userId ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  if ((input.siteIds ?? []).length > 0) {
    const { error: siteError } = await supabase.from("project_plan_sites").insert(
      (input.siteIds ?? []).map((siteId) => ({
        plan_id: data.id,
        site_id: siteId,
      }))
    );
    if (siteError) throw siteError;
  }

  return data as ProjectPlan;
}

export async function deletePlannerPlan(planId: string): Promise<void> {
  const { error } = await supabase.from("project_plans").delete().eq("id", planId);
  if (error) throw error;
}

export async function updatePlannerPlan(
  planId: string,
  patch: { name?: string; description?: string; status?: string; project_id?: string | null; updated_by?: string | null }
): Promise<void> {
  const { error } = await supabase.from("project_plans").update(patch).eq("id", planId);
  if (error) throw error;
}

export async function updatePlanSites(planId: string, siteIds: string[]): Promise<void> {
  const { error: delError } = await supabase.from("project_plan_sites").delete().eq("plan_id", planId);
  if (delError) throw delError;
  if (siteIds.length > 0) {
    const { error: insError } = await supabase.from("project_plan_sites").insert(
      siteIds.map((siteId) => ({ plan_id: planId, site_id: siteId }))
    );
    if (insError) throw insError;
  }
}

export async function fetchPlanById(planId: string): Promise<PlannerPlanWithContext | null> {
  const { data, error } = await supabase
    .from("project_plans")
    .select("*, projects(id,name), project_plan_sites(sites(id,name))")
    .eq("id", planId)
    .maybeSingle();

  if (error) throw error;
  return (data as PlannerPlanWithContext | null) ?? null;
}

// ─── Phases ───

export async function fetchPlanPhases(planId: string): Promise<PlanPhase[]> {
  const { data, error } = await supabase
    .from("plan_phases")
    .select("*")
    .eq("plan_id", planId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanPhase[];
}

export async function createPlanPhase(input: {
  planId: string;
  name: string;
  sortOrder?: number;
  color?: string;
  userId?: string | null;
}): Promise<PlanPhase> {
  const { data, error } = await supabase
    .from("plan_phases")
    .insert({
      plan_id: input.planId,
      name: input.name,
      sort_order: input.sortOrder ?? 0,
      color: input.color ?? null,
      created_by: input.userId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as PlanPhase;
}

export async function updatePlanPhase(
  phaseId: string,
  patch: { name?: string; color?: string | null; sort_order?: number }
): Promise<void> {
  const { error } = await supabase
    .from("plan_phases")
    .update(patch)
    .eq("id", phaseId);
  if (error) throw error;
}

export async function deletePlanPhase(phaseId: string): Promise<void> {
  // Unassign tasks from this phase before deleting
  await supabase.from("plan_tasks").update({ phase_id: null }).eq("phase_id", phaseId);
  const { error } = await supabase.from("plan_phases").delete().eq("id", phaseId);
  if (error) throw error;
}

export async function reorderPlanPhases(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from("plan_phases").update({ sort_order: index }).eq("id", id)
  );
  await Promise.all(updates);
}

// ─── Tasks ───

export async function fetchPlanTasks(planId: string): Promise<PlanTask[]> {
  const { data, error } = await supabase
    .from("plan_tasks")
    .select("*")
    .eq("plan_id", planId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PlanTask[];
}

export async function createPlanTask(input: {
  planId: string;
  title: string;
  phaseId?: string | null;
  siteId?: string | null;
  parentTaskId?: string | null;
  indentLevel?: number;
  sortOrder?: number;
  plannedStart?: string | null;
  plannedFinish?: string | null;
  durationDays?: number | null;
  isMilestone?: boolean;
  userId?: string | null;
}): Promise<PlanTask> {
  const duration =
    input.durationDays ??
    calculateDurationDays(input.plannedStart ?? null, input.plannedFinish ?? null);

  const { data, error } = await supabase
    .from("plan_tasks")
    .insert({
      plan_id: input.planId,
      phase_id: input.phaseId ?? null,
      site_id: input.siteId ?? null,
      parent_task_id: input.parentTaskId ?? null,
      indent_level: input.indentLevel ?? 0,
      title: input.title,
      sort_order: input.sortOrder ?? 0,
      planned_start: input.plannedStart ?? null,
      planned_finish: input.plannedFinish ?? null,
      duration_days: duration,
      is_milestone: input.isMilestone ?? false,
      created_by: input.userId ?? null,
      updated_by: input.userId ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as PlanTask;
}

export async function updatePlanTask(
  taskId: string,
  patch: Partial<Omit<PlanTask, "id" | "plan_id" | "created_at" | "updated_at">> & { updated_by?: string | null }
): Promise<PlanTask> {
  const payload: Record<string, unknown> = { ...patch };

  if (typeof patch.percent_complete === "number") {
    payload.percent_complete = normalizePercent(patch.percent_complete);
  }

  if (patch.planned_start !== undefined || patch.planned_finish !== undefined) {
    const duration = calculateDurationDays(
      (patch.planned_start as string | null | undefined) ?? null,
      (patch.planned_finish as string | null | undefined) ?? null
    );
    payload.duration_days = duration;
  }

  const { data, error } = await supabase
    .from("plan_tasks")
    .update(payload)
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data as PlanTask;
}

export async function deletePlanTask(taskId: string): Promise<void> {
  const { error } = await supabase.from("plan_tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function bulkCreateTasks(
  planId: string,
  tasks: Array<{
    title: string;
    sortOrder: number;
    phaseId?: string | null;
    plannedStart?: string | null;
    plannedFinish?: string | null;
    durationDays?: number | null;
    indentLevel?: number;
    wbsCode?: string | null;
    notes?: string | null;
    percentComplete?: number;
  }>,
  userId?: string | null
): Promise<void> {
  const rows = tasks.map((t) => ({
    plan_id: planId,
    title: t.title,
    sort_order: t.sortOrder,
    phase_id: t.phaseId ?? null,
    planned_start: t.plannedStart ?? null,
    planned_finish: t.plannedFinish ?? null,
    duration_days: t.durationDays ?? calculateDurationDays(t.plannedStart ?? null, t.plannedFinish ?? null),
    indent_level: t.indentLevel ?? 0,
    wbs_code: t.wbsCode ?? null,
    notes: t.notes ?? null,
    percent_complete: normalizePercent(t.percentComplete ?? 0),
    status: normalizePercent(t.percentComplete ?? 0) >= 100 ? "done" : normalizePercent(t.percentComplete ?? 0) > 0 ? "in-progress" : "not-started",
    actual_start: normalizePercent(t.percentComplete ?? 0) > 0 ? (t.plannedStart ?? new Date().toISOString().slice(0, 10)) : null,
    actual_finish: normalizePercent(t.percentComplete ?? 0) >= 100 ? (t.plannedFinish ?? new Date().toISOString().slice(0, 10)) : null,
    created_by: userId ?? null,
    updated_by: userId ?? null,
  }));

  const { error } = await supabase.from("plan_tasks").insert(rows);
  if (error) throw error;
}

// ─── Task Updates ───

export async function fetchTaskUpdates(planId: string): Promise<TaskUpdate[]> {
  const { data, error } = await supabase
    .from("task_updates")
    .select("*")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TaskUpdate[];
}

export async function createTaskUpdate(input: {
  planId: string;
  taskId: string;
  status?: TaskStatus;
  percentComplete?: number;
  note?: string;
  delayReason?: string;
  blocked?: boolean;
  userId?: string | null;
}): Promise<TaskUpdate> {
  const { data, error } = await supabase
    .from("task_updates")
    .insert({
      plan_id: input.planId,
      task_id: input.taskId,
      status: input.status,
      percent_complete: input.percentComplete,
      note: input.note?.trim() || null,
      delay_reason: input.delayReason?.trim() || null,
      blocked: !!input.blocked,
      created_by: input.userId ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as TaskUpdate;
}


export async function logTaskDelayEvent(input: {
  planId: string;
  taskId: string;
  delayType: string;
  delayReason?: string;
  userId?: string | null;
  councilWaitingOn?: string | null;
  weatherHoursLost?: number | null;
  delayDate?: string;
}): Promise<void> {
  const delayReason = input.delayReason?.trim() || null;

  await createTaskUpdate({
    planId: input.planId,
    taskId: input.taskId,
    status: "blocked",
    note: delayReason ?? undefined,
    delayReason: delayReason ?? undefined,
    blocked: true,
    userId: input.userId ?? null,
  });

  const taskPatch: Partial<PlanTask> & { updated_by?: string | null } = {
    status: "blocked",
    delay_type: input.delayType as PlanTask["delay_type"],
    delay_reason: delayReason,
    updated_by: input.userId ?? null,
  };

  if (input.delayType === "council") {
    taskPatch.council_waiting_on = input.councilWaitingOn?.trim() || null;
    taskPatch.council_submitted_date = input.delayDate ?? new Date().toISOString().slice(0, 10);
  }

  if (input.delayType === "weather") {
    const hoursLost = Math.max(0, Number(input.weatherHoursLost ?? 0));
    await createWeatherDelay({
      planId: input.planId,
      taskId: input.taskId,
      delayDate: input.delayDate,
      hoursLost,
      reason: delayReason ?? undefined,
      userId: input.userId ?? null,
    });
    taskPatch.weather_delay_days = Number((hoursLost / 8).toFixed(2));
  }

  if (input.delayType === "redesign") {
    taskPatch.redesign_reason = delayReason;
  }

  await updatePlanTask(input.taskId, taskPatch);
}

// ─── Revisions ───

export async function createPlanRevision(input: {
  planId: string;
  summary: string;
  revisionType: string;
  payload?: Record<string, unknown>;
  userId?: string | null;
}) {
  const { data: latestRows, error: latestError } = await supabase
    .from("plan_revisions")
    .select("revision_no")
    .eq("plan_id", input.planId)
    .order("revision_no", { ascending: false })
    .limit(1);

  if (latestError) throw latestError;

  const nextRevision = ((latestRows?.[0]?.revision_no as number | undefined) ?? 0) + 1;
  const { error } = await supabase.from("plan_revisions").insert({
    plan_id: input.planId,
    revision_no: nextRevision,
    revision_type: input.revisionType,
    summary: input.summary,
    payload: input.payload ?? null,
    created_by: input.userId ?? null,
  });
  if (error) throw error;
}

// ─── Civil Starter Activities ───

export async function seedCivilStarterTasks(planId: string, userId?: string | null) {
  const phaseNames = ["Mobilisation", "Civil Works", "Concrete & Finishes", "Handover"];
  const { data: phaseRows, error: phaseError } = await supabase
    .from("plan_phases")
    .insert(
      phaseNames.map((name, idx) => ({
        plan_id: planId,
        name,
        sort_order: idx,
        created_by: userId ?? null,
      }))
    )
    .select("id,name");

  if (phaseError) throw phaseError;
  const phaseMap = new Map((phaseRows ?? []).map((p) => [p.name as string, p.id as string]));

  const taskTemplates = [
    ["Mobilisation", "Site establishment + traffic control staging"],
    ["Mobilisation", "Survey / setout"],
    ["Civil Works", "Demolition + sawcutting"],
    ["Civil Works", "Excavation + service proving"],
    ["Civil Works", "Conduit and pit installation"],
    ["Civil Works", "Subgrade prep + kerb prep"],
    ["Concrete & Finishes", "Concrete pour + curing"],
    ["Concrete & Finishes", "Reinstatement + line marking"],
    ["Handover", "Defect rectification + authority closeout"],
  ] as const;

  const { error: taskError } = await supabase.from("plan_tasks").insert(
    taskTemplates.map(([phaseName, title], idx) => ({
      plan_id: planId,
      phase_id: phaseMap.get(phaseName) ?? null,
      title,
      sort_order: idx,
      created_by: userId ?? null,
      updated_by: userId ?? null,
    }))
  );

  if (taskError) throw taskError;
}

// ─── Public Holidays ───

export async function fetchPublicHolidays(companyId?: string | null): Promise<PublicHoliday[]> {
  let query = supabase
    .from("public_holidays")
    .select("*")
    .order("holiday_date", { ascending: true });

  if (companyId) {
    query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
  } else {
    query = query.is("company_id", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PublicHoliday[];
}

// ─── Weather Delay Log ───

export async function fetchWeatherDelays(planId: string): Promise<WeatherDelayLog[]> {
  const { data, error } = await supabase
    .from("weather_delay_log")
    .select("*")
    .eq("plan_id", planId)
    .order("delay_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WeatherDelayLog[];
}

export async function createWeatherDelay(input: {
  planId: string;
  taskId?: string | null;
  delayDate?: string;
  hoursLost: number;
  reason?: string;
  userId?: string | null;
}): Promise<WeatherDelayLog> {
  const { data, error } = await supabase
    .from("weather_delay_log")
    .insert({
      plan_id: input.planId,
      task_id: input.taskId ?? null,
      delay_date: input.delayDate ?? new Date().toISOString().slice(0, 10),
      hours_lost: input.hoursLost,
      reason: input.reason?.trim() || null,
      logged_by: input.userId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as WeatherDelayLog;
}
