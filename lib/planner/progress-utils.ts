import { PlanTask } from "./types";

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getTaskScheduleVariance(task: Pick<PlanTask, "planned_finish" | "actual_finish" | "status">, now = new Date()): number | null {
  const plannedFinish = toDate(task.planned_finish);
  if (!plannedFinish) return null;

  const plannedDay = startOfDay(plannedFinish);

  if (task.status === "done") {
    const actualFinish = toDate(task.actual_finish);
    if (!actualFinish) return 0;
    const actualDay = startOfDay(actualFinish);
    return Math.round((actualDay.getTime() - plannedDay.getTime()) / 86400000);
  }

  const today = startOfDay(now);
  return Math.round((today.getTime() - plannedDay.getTime()) / 86400000);
}

export function getTaskVarianceLabel(task: Pick<PlanTask, "planned_finish" | "actual_finish" | "status">, now = new Date()): string {
  const varianceDays = getTaskScheduleVariance(task, now);
  if (varianceDays === null) return "No planned finish";
  if (varianceDays <= 0) return "On or ahead of plan";
  return `${varianceDays}d behind plan`;
}

export function calculatePlanHealth(tasks: PlanTask[], now = new Date()): {
  total: number;
  done: number;
  blocked: number;
  avgPercent: number;
  delayed: number;
  dueToday: number;
} {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const avgPercent = total > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.percent_complete, 0) / total) : 0;
  const delayed = tasks.filter((task) => {
    if (task.status === "done") return false;
    const variance = getTaskScheduleVariance(task, now);
    return variance !== null && variance > 0;
  }).length;

  const today = startOfDay(now);
  const dueToday = tasks.filter((task) => {
    if (task.status === "done") return false;
    const due = toDate(task.planned_finish);
    if (!due) return false;
    return startOfDay(due).getTime() === today.getTime();
  }).length;

  return { total, done, blocked, avgPercent, delayed, dueToday };
}
