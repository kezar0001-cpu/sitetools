import type { SitePlanTask } from "@/types/siteplan";

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
