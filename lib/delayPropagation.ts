import type { SitePlanTask } from "@/types/siteplan";
import { addDays } from "@/lib/siteplanDateUtils";

export interface DelayPropagationUpdate {
  taskId: string;
  newStartDate: string;
  newEndDate: string;
}

const MAX_DEPTH = 10;

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parsePredecessors(predecessors: string | null): string[] {
  if (!predecessors) return [];
  return predecessors
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function shiftDate(ymd: string, delayDays: number): string {
  return formatYmd(addDays(new Date(`${ymd}T00:00:00`), delayDays));
}

export function computeDelayPropagation(
  taskId: string,
  delayDays: number,
  allTasks: SitePlanTask[]
): DelayPropagationUpdate[] {
  if (!taskId || delayDays <= 0 || allTasks.length === 0) return [];

  const tasksById = new Map<string, SitePlanTask>(allTasks.map((t) => [t.id, t]));
  const target = tasksById.get(taskId);
  if (!target) return [];

  const updates = new Map<string, DelayPropagationUpdate>();

  updates.set(target.id, {
    taskId: target.id,
    newStartDate: target.start_date,
    newEndDate: shiftDate(target.end_date, delayDays),
  });

  const visited = new Set<string>([target.id]);

  const walk = (sourceTaskId: string, depth: number) => {
    if (depth >= MAX_DEPTH) return;
    const sourceTask = tasksById.get(sourceTaskId);
    if (!sourceTask) return;
    const sourceCode = sourceTask.wbs_code;
    if (!sourceCode) return;

    const dependents = allTasks.filter((task) => {
      const predecessors = parsePredecessors(task.predecessors);
      return predecessors.includes(sourceCode);
    });

    for (const dependent of dependents) {
      if (!updates.has(dependent.id)) {
        updates.set(dependent.id, {
          taskId: dependent.id,
          newStartDate: shiftDate(dependent.start_date, delayDays),
          newEndDate: shiftDate(dependent.end_date, delayDays),
        });
      }

      if (visited.has(dependent.id)) continue;
      visited.add(dependent.id);
      walk(dependent.id, depth + 1);
    }
  };

  walk(target.id, 0);

  return Array.from(updates.values());
}
