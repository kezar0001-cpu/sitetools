export type PlanStatus = "draft" | "active" | "on-hold" | "completed" | "archived";
export type TaskStatus = "not-started" | "in-progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface ProjectPlan {
  id: string;
  company_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  status: PlanStatus;
  version_no: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPlanSite {
  id: string;
  plan_id: string;
  site_id: string;
  created_at: string;
}

export interface PlanPhase {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanTask {
  id: string;
  plan_id: string;
  phase_id: string | null;
  title: string;
  description: string | null;
  sort_order: number;
  status: TaskStatus;
  priority: TaskPriority;
  percent_complete: number;
  planned_start: string | null;
  planned_finish: string | null;
  actual_start: string | null;
  actual_finish: string | null;
  duration_days: number | null;
  manual_dates: boolean;
  assigned_to: string | null;
  constraint_note: string | null;
  delay_reason: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskUpdate {
  id: string;
  plan_id: string;
  task_id: string;
  update_date: string;
  status: TaskStatus | null;
  percent_complete: number | null;
  note: string | null;
  delay_reason: string | null;
  blocked: boolean;
  created_by: string | null;
  created_at: string;
}

export interface PlannerPlanWithContext extends ProjectPlan {
  projects?: { id: string; name: string } | null;
  project_plan_sites?: Array<{ sites: { id: string; name: string } | null }>;
}

export const TASK_STATUSES: TaskStatus[] = ["not-started", "in-progress", "blocked", "done"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];
