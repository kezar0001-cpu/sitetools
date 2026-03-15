// ── Enums ──
export type PlanStatus = "draft" | "active" | "on-hold" | "completed" | "archived";
export type TaskStatus = "not-started" | "in-progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type DelayType = "weather" | "redesign" | "council" | "rfi" | "utility" | "client" | "supply" | "other";
export type DependencyType = "FS" | "FF" | "SS" | "SF";

// ── Core Entities ──
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
  deleted_at: string | null;
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
  site_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  wbs_code: string | null;
  sort_order: number;
  indent_level: number;
  is_milestone: boolean;
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
  // Delay tracking
  delay_reason: string | null;
  delay_type: DelayType | null;
  weather_delay_days: number;
  redesign_delay_days: number;
  redesign_reason: string | null;
  // Council tracking
  council_waiting_on: string | null;
  council_submitted_date: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TaskDependency {
  id: string;
  plan_id: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: string;
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

export interface PlanRevision {
  id: string;
  plan_id: string;
  revision_no: number;
  revision_type: string;
  summary: string | null;
  payload: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

// ── V5 New Tables ──
export interface PublicHoliday {
  id: string;
  company_id: string | null;
  holiday_date: string;
  name: string;
  state_code: string | null;
  is_national: boolean;
  created_at: string;
}

export interface WeatherDelayLog {
  id: string;
  plan_id: string;
  task_id: string | null;
  delay_date: string;
  hours_lost: number;
  reason: string | null;
  logged_by: string | null;
  created_at: string;
}

// ── Composite / View Types ──
export interface PlannerPlanWithContext extends ProjectPlan {
  projects?: { id: string; name: string } | null;
  project_plan_sites?: Array<{ sites: { id: string; name: string } | null }>;
}

export interface DeletedPlanSummary {
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
  deleted_at: string;
  project_name: string | null;
}

export interface GanttViewConfig {
  zoomLevel: "day" | "week" | "month";
  showDependencies: boolean;
  showMilestones: boolean;
  showHolidays: boolean;
  showTodayLine: boolean;
}

// ── Constants ──
export const TASK_STATUSES: TaskStatus[] = ["not-started", "in-progress", "blocked", "done"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];
export const DELAY_TYPES: DelayType[] = ["weather", "redesign", "council", "rfi", "utility", "client", "supply", "other"];
export const DEPENDENCY_TYPES: DependencyType[] = ["FS", "FF", "SS", "SF"];

export const DELAY_TYPE_LABELS: Record<DelayType, string> = {
  weather: "Weather",
  redesign: "Redesign Required",
  council: "Waiting on Council",
  rfi: "RFI Outstanding",
  utility: "Utility Authority",
  client: "Client Direction",
  supply: "Supply Chain",
  other: "Other",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  "not-started": "#94a3b8",
  "in-progress": "#3b82f6",
  "blocked": "#ef4444",
  "done": "#22c55e",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "#94a3b8",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};
