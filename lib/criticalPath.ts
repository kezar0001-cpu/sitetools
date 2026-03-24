import type { SitePlanTask } from "@/types/siteplan";

/**
 * Computes the Critical Path Method (CPM) for a set of tasks.
 *
 * Uses predecessor relationships (stored as comma-separated WBS codes) to:
 * 1. Forward pass: compute Earliest Start (ES) and Earliest Finish (EF)
 * 2. Backward pass: compute Latest Finish (LF) and Latest Start (LS)
 * 3. Return task IDs whose total float (LS - ES) is zero
 *
 * Tasks with zero float lie on the critical path — any delay to them
 * directly delays the project end date.
 */
export function computeCriticalPath(tasks: SitePlanTask[]): Set<string> {
  if (tasks.length === 0) return new Set();

  // Index tasks by WBS code and ID
  const byWbs = new Map<string, SitePlanTask>();
  const byId = new Map<string, SitePlanTask>();
  for (const t of tasks) {
    byWbs.set(t.wbs_code, t);
    byId.set(t.id, t);
  }

  // Parse predecessor task IDs from the comma-separated WBS code string
  const predIds = new Map<string, string[]>();
  for (const t of tasks) {
    const preds: string[] = [];
    if (t.predecessors) {
      for (const raw of t.predecessors.split(",")) {
        const code = raw.trim().replace(/FS$/i, ""); // strip "FS" relationship suffix
        const pred = byWbs.get(code);
        if (pred && pred.id !== t.id) preds.push(pred.id);
      }
    }
    predIds.set(t.id, preds);
  }

  // Build successor adjacency list for the forward pass and backward pass
  const successors = new Map<string, string[]>();
  for (const t of tasks) successors.set(t.id, []);
  for (const t of tasks) {
    for (const predId of predIds.get(t.id) ?? []) {
      successors.get(predId)?.push(t.id);
    }
  }

  // Duration in whole days (minimum 1)
  const dur = (t: SitePlanTask): number => {
    const ms = new Date(t.end_date).getTime() - new Date(t.start_date).getTime();
    return Math.max(1, Math.ceil(ms / 86_400_000));
  };

  // ── Topological sort (Kahn's algorithm) ──────────────────────
  const inDegree = new Map<string, number>();
  for (const t of tasks) {
    inDegree.set(t.id, (predIds.get(t.id) ?? []).length);
  }

  const queue: string[] = [];
  for (const t of tasks) {
    if ((inDegree.get(t.id) ?? 0) === 0) queue.push(t.id);
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    for (const succId of successors.get(id) ?? []) {
      const deg = (inDegree.get(succId) ?? 1) - 1;
      inDegree.set(succId, deg);
      if (deg === 0) queue.push(succId);
    }
  }

  // If there are cycles, only the tasks that made it into topoOrder are analysed
  const inTopo = new Set(topoOrder);

  // ── Forward pass ─────────────────────────────────────────────
  const es = new Map<string, number>(); // Earliest Start (days from t=0)
  const ef = new Map<string, number>(); // Earliest Finish

  for (const id of topoOrder) {
    const task = byId.get(id)!;
    const esVal = es.get(id) ?? 0;
    es.set(id, esVal);
    const efVal = esVal + dur(task);
    ef.set(id, efVal);

    for (const succId of successors.get(id) ?? []) {
      if (!inTopo.has(succId)) continue;
      es.set(succId, Math.max(es.get(succId) ?? 0, efVal));
    }
  }

  // Project end = maximum EF across all tasks
  const projectEnd = topoOrder.reduce((max, id) => Math.max(max, ef.get(id) ?? 0), 0);

  // ── Backward pass ────────────────────────────────────────────
  const lf = new Map<string, number>(); // Latest Finish
  const ls = new Map<string, number>(); // Latest Start

  // Seed LF for tasks with no successors (end tasks)
  for (const id of topoOrder) {
    const hasSuccessors = (successors.get(id) ?? []).some((s) => inTopo.has(s));
    if (!hasSuccessors) lf.set(id, projectEnd);
  }

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const id = topoOrder[i];
    const task = byId.get(id)!;
    const lfVal = lf.get(id) ?? projectEnd;
    const lsVal = lfVal - dur(task);
    ls.set(id, lsVal);

    // Propagate backwards: each predecessor's LF = min(LF, LS of this task)
    for (const predId of predIds.get(id) ?? []) {
      if (!inTopo.has(predId)) continue;
      const currentLf = lf.get(predId);
      if (currentLf === undefined || lsVal < currentLf) {
        lf.set(predId, lsVal);
      }
    }
  }

  // ── Identify critical path (float == 0) ──────────────────────
  const critical = new Set<string>();
  for (const id of topoOrder) {
    const floatVal = (ls.get(id) ?? 0) - (es.get(id) ?? 0);
    if (floatVal === 0) critical.add(id);
  }

  return critical;
}
