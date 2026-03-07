import { TaskStatus } from "./types";

export function normalizePercent(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function statusFromPercent(value: number, current: TaskStatus): TaskStatus {
  if (value >= 100) return "done";
  if (value <= 0 && current === "done") return "in-progress";
  if (value > 0 && current === "not-started") return "in-progress";
  return current;
}

export function calculateDurationDays(plannedStart: string | null, plannedFinish: string | null): number | null {
  if (!plannedStart || !plannedFinish) return null;
  const start = new Date(plannedStart);
  const finish = new Date(plannedFinish);
  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) return null;
  const ms = finish.getTime() - start.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
