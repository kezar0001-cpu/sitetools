// ─── SitePlan Types ─────────────────────────────────────────
// Uses existing Project type from workspace for project data.

import type { Project } from "@/lib/workspace/types";

export type { Project };

export type TaskType = "phase" | "task" | "subtask";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "delayed"
  | "on_hold";

export interface SitePlanTask {
  id: string;
  project_id: string;
  parent_id: string | null;
  wbs_code: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  start_date: string;
  end_date: string;
  actual_start: string | null;
  actual_end: string | null;
  progress: number;
  duration_days: number;
  predecessors: string | null;
  responsible: string | null;
  assigned_to: string | null;
  comments: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SitePlanProgressLog {
  id: string;
  task_id: string;
  progress_before: number;
  progress_after: number;
  note: string | null;
  logged_by: string;
  logged_at: string;
}

// ─── Delay log types ────────────────────────────────────────

export type DelayCategory =
  | "Weather"
  | "Subcontractor"
  | "Materials"
  | "Design Change"
  | "Authority / Council"
  | "Scope Change"
  | "Other";

export const DELAY_CATEGORIES: DelayCategory[] = [
  "Weather",
  "Subcontractor",
  "Materials",
  "Design Change",
  "Authority / Council",
  "Scope Change",
  "Other",
];

export interface SitePlanDelayLog {
  id: string;
  task_id: string;
  delay_days: number;
  delay_reason: string;
  delay_category: DelayCategory;
  logged_by: string;
  logged_at: string;
  impacts_completion: boolean;
}

export interface CreateDelayLogPayload {
  task_id: string;
  delay_days: number;
  delay_reason: string;
  delay_category: DelayCategory;
  impacts_completion: boolean;
}

// ─── Derived / UI types ─────────────────────────────────────

export interface SitePlanTaskNode extends SitePlanTask {
  children: SitePlanTaskNode[];
}

export type ProjectHealth = "on_track" | "at_risk" | "delayed";

export interface CreateTaskPayload {
  project_id: string;
  parent_id?: string | null;
  name: string;
  type: TaskType;
  start_date: string;
  end_date: string;
  predecessors?: string;
  responsible?: string;
  assigned_to?: string;
  comments?: string;
  notes?: string;
  sort_order?: number;
}

export interface UpdateTaskPayload {
  name?: string;
  type?: TaskType;
  parent_id?: string | null;
  status?: TaskStatus;
  start_date?: string;
  end_date?: string;
  actual_start?: string | null;
  actual_end?: string | null;
  progress?: number;
  predecessors?: string | null;
  responsible?: string | null;
  assigned_to?: string | null;
  comments?: string | null;
  notes?: string | null;
  sort_order?: number;
}

export interface ImportedRow {
  name: string;
  type: TaskType;
  parent_name: string;
  start_date: string;
  end_date: string;
  duration: number;
  predecessors: string;
  responsible: string;
  assigned_to: string;
  comments: string;
  outline_level: number;
}

// ─── Helpers ────────────────────────────────────────────────

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
  on_hold: "On Hold",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: "slate",
  in_progress: "blue",
  completed: "green",
  delayed: "red",
  on_hold: "amber",
};

/**
 * Canonical progress calculation: average progress of non-phase tasks only.
 * Used by the list page header, summary page, and the RPC to ensure consistency.
 */
export function computeWorkProgress(tasks: SitePlanTask[]): number {
  const workItems = tasks.filter((t) => t.type !== "phase");
  if (workItems.length === 0) return 0;
  return Math.round(
    workItems.reduce((sum, t) => sum + t.progress, 0) / workItems.length
  );
}

export function computeTaskStatus(
  progress: number,
  endDate: string
): TaskStatus {
  if (progress === 0) return "not_started";
  if (progress >= 100) return "completed";
  if (new Date(endDate) < new Date() && progress < 100) return "delayed";
  return "in_progress";
}

export function computeProjectHealth(
  tasks: SitePlanTask[]
): ProjectHealth {
  if (tasks.length === 0) return "on_track";
  const hasDelayed = tasks.some((t) => t.status === "delayed");
  if (hasDelayed) return "delayed";

  const avgProgress =
    tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length;

  const now = new Date();
  const latestEnd = Math.max(
    ...tasks.map((t) => new Date(t.end_date).getTime())
  );
  const earliestStart = Math.min(
    ...tasks.map((t) => new Date(t.start_date).getTime())
  );
  const totalSpan = latestEnd - earliestStart;
  const elapsed = now.getTime() - earliestStart;

  if (totalSpan > 0 && elapsed / totalSpan > 0.7 && avgProgress < 50) {
    return "at_risk";
  }

  return "on_track";
}

export function buildTaskTree(tasks: SitePlanTask[]): SitePlanTaskNode[] {
  const map = new Map<string, SitePlanTaskNode>();
  const roots: SitePlanTaskNode[] = [];

  for (const t of tasks) {
    map.set(t.id, { ...t, children: [] });
  }

  for (const t of tasks) {
    const node = map.get(t.id)!;
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortChildren = (nodes: SitePlanTaskNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);

  return roots;
}

export function flattenTree(roots: SitePlanTaskNode[]): SitePlanTaskNode[] {
  const result: SitePlanTaskNode[] = [];
  const walk = (nodes: SitePlanTaskNode[]) => {
    for (const n of nodes) {
      result.push(n);
      walk(n.children);
    }
  };
  walk(roots);
  return result;
}

export function generateWbsCode(
  parentWbs: string | null,
  index: number
): string {
  const idx = index + 1;
  return parentWbs ? `${parentWbs}.${idx}` : `${idx}`;
}

// ─── Date helpers for inline Gantt ──────────────────────────

export function getProjectDateRange(tasks: SitePlanTask[]): {
  start: Date;
  end: Date;
} {
  if (tasks.length === 0) {
    const now = new Date();
    return { start: now, end: new Date(now.getTime() + 30 * 86400000) };
  }
  const starts = tasks.map((t) => new Date(t.start_date).getTime());
  const ends = tasks.map((t) => new Date(t.end_date).getTime());
  return {
    start: new Date(Math.min(...starts)),
    end: new Date(Math.max(...ends)),
  };
}

export function getBarPosition(
  taskStart: string,
  taskEnd: string,
  rangeStart: Date,
  rangeEnd: Date
): { left: number; width: number } {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  if (totalMs <= 0) return { left: 0, width: 100 };
  const startMs = new Date(taskStart).getTime() - rangeStart.getTime();
  const endMs = new Date(taskEnd).getTime() - rangeStart.getTime();
  const left = Math.max(0, (startMs / totalMs) * 100);
  const right = Math.min(100, (endMs / totalMs) * 100);
  return { left, width: Math.max(1, right - left) };
}
