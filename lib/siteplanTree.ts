import type { SitePlanTask } from "@/types/siteplan";

type ReorderMove = {
  id: string;
  parent_id: string | null;
  sort_order: number;
};

export function getAncestorIds(tasks: SitePlanTask[], taskId: string): string[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ancestors: string[] = [];
  let current = byId.get(taskId) ?? null;

  while (current?.parent_id) {
    const parent = byId.get(current.parent_id);
    if (!parent) break;
    ancestors.push(parent.id);
    current = parent;
  }

  return ancestors;
}

export function wouldCreateHierarchyCycle(
  tasks: SitePlanTask[],
  taskId: string,
  nextParentId: string | null
): boolean {
  if (!nextParentId) return false;
  if (taskId === nextParentId) return true;

  const childrenByParent = new Map<string, string[]>();
  tasks.forEach((task) => {
    if (!task.parent_id) return;
    const existing = childrenByParent.get(task.parent_id) ?? [];
    existing.push(task.id);
    childrenByParent.set(task.parent_id, existing);
  });

  const stack = [...(childrenByParent.get(taskId) ?? [])];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (current === nextParentId) return true;
    stack.push(...(childrenByParent.get(current) ?? []));
  }

  return false;
}

export function applyReorderMoves(
  tasks: SitePlanTask[],
  moves: ReorderMove[]
): SitePlanTask[] {
  if (moves.length === 0) return tasks;
  const moveMap = new Map(moves.map((move) => [move.id, move]));
  return tasks.map((task) => {
    const move = moveMap.get(task.id);
    if (!move) return task;
    return {
      ...task,
      parent_id: move.parent_id,
      sort_order: move.sort_order,
    };
  });
}

export function normalizeSiblingSortOrders(tasks: SitePlanTask[]): ReorderMove[] {
  const buckets = new Map<string | null, SitePlanTask[]>();
  tasks.forEach((task) => {
    const existing = buckets.get(task.parent_id) ?? [];
    existing.push(task);
    buckets.set(task.parent_id, existing);
  });

  const normalizedMoves: ReorderMove[] = [];

  for (const [parentId, siblings] of buckets.entries()) {
    const sorted = [...siblings].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.created_at.localeCompare(b.created_at);
    });

    sorted.forEach((task, index) => {
      const nextOrder = index + 1;
      if (task.sort_order !== nextOrder) {
        normalizedMoves.push({
          id: task.id,
          parent_id: parentId,
          sort_order: nextOrder,
        });
      }
    });
  }

  return normalizedMoves;
}
