// ─── SitePlan Types ─────────────────────────────────────────

export type TaskType = "phase" | "task" | "subtask";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "delayed"
  | "on_hold";

export interface SitePlanProject {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_by: string;
  org_id: string;
  created_at: string;
  updated_at: string;
}

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
  responsible: string | null;
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

// ─── Derived / UI types ─────────────────────────────────────

export interface SitePlanTaskNode extends SitePlanTask {
  children: SitePlanTaskNode[];
}

export type ProjectHealth = "on_track" | "at_risk" | "delayed";

export interface ProjectCardData extends SitePlanProject {
  overallProgress: number;
  health: ProjectHealth;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
}

export interface CreateTaskPayload {
  project_id: string;
  parent_id?: string | null;
  name: string;
  type: TaskType;
  start_date: string;
  end_date: string;
  responsible?: string;
  notes?: string;
  sort_order?: number;
}

export interface UpdateTaskPayload {
  name?: string;
  status?: TaskStatus;
  start_date?: string;
  end_date?: string;
  actual_start?: string | null;
  actual_end?: string | null;
  progress?: number;
  responsible?: string | null;
  notes?: string | null;
  sort_order?: number;
}

export interface CSVRow {
  name: string;
  type: TaskType;
  parent_name: string;
  start_date: string;
  end_date: string;
  responsible: string;
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
  tasks: SitePlanTask[],
  projectEndDate: string
): ProjectHealth {
  const now = new Date();
  const end = new Date(projectEndDate);
  const hasDelayed = tasks.some((t) => t.status === "delayed");
  if (hasDelayed) return "delayed";

  const totalDuration = end.getTime() - now.getTime();
  const avgProgress =
    tasks.length > 0
      ? tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length
      : 0;

  // At risk if past 70% of timeline but under 50% progress
  if (totalDuration > 0 && avgProgress < 50) {
    const projectStart = Math.min(
      ...tasks.map((t) => new Date(t.start_date).getTime())
    );
    const elapsed = now.getTime() - projectStart;
    const totalSpan = end.getTime() - projectStart;
    if (totalSpan > 0 && elapsed / totalSpan > 0.7) return "at_risk";
  }

  return "on_track";
}

export function buildTaskTree(tasks: SitePlanTask[]): SitePlanTaskNode[] {
  const map = new Map<string, SitePlanTaskNode>();
  const roots: SitePlanTaskNode[] = [];

  // Create nodes
  for (const t of tasks) {
    map.set(t.id, { ...t, children: [] });
  }

  // Build tree
  for (const t of tasks) {
    const node = map.get(t.id)!;
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by sort_order
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
