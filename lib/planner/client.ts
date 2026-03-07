import { supabase } from "@/lib/supabase";
import { calculateDurationDays, normalizePercent } from "./validation";
import { PlanPhase, PlanTask, PlannerPlanWithContext, ProjectPlan, TaskStatus, TaskUpdate } from "./types";

export async function fetchPlannerPlans(companyId: string): Promise<PlannerPlanWithContext[]> {
  const { data, error } = await supabase
    .from("project_plans")
    .select("*, projects(id,name), project_plan_sites(sites(id,name))")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PlannerPlanWithContext[];
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

export async function fetchPlanById(planId: string): Promise<PlannerPlanWithContext | null> {
  const { data, error } = await supabase
    .from("project_plans")
    .select("*, projects(id,name), project_plan_sites(sites(id,name))")
    .eq("id", planId)
    .maybeSingle();

  if (error) throw error;
  return (data as PlannerPlanWithContext | null) ?? null;
}

export async function fetchPlanPhases(planId: string): Promise<PlanPhase[]> {
  const { data, error } = await supabase.from("plan_phases").select("*").eq("plan_id", planId).order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanPhase[];
}

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
  sortOrder?: number;
  userId?: string | null;
}): Promise<PlanTask> {
  const { data, error } = await supabase
    .from("plan_tasks")
    .insert({
      plan_id: input.planId,
      phase_id: input.phaseId ?? null,
      title: input.title,
      sort_order: input.sortOrder ?? 0,
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

  const { data, error } = await supabase.from("plan_tasks").update(payload).eq("id", taskId).select("*").single();

  if (error) throw error;
  return data as PlanTask;
}

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
