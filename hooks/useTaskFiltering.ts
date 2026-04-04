import { useMemo } from "react";
import type { SitePlanTaskNode } from "@/types/siteplan";
import { isFilterActive } from "@/app/(app)/site-plan/components/SitePlanToolbar";
import type { TaskFilter } from "@/app/(app)/site-plan/components/SitePlanToolbar";

/** Apply filter predicates to a flat list of visible task nodes. */
function applyFilter(
  rows: SitePlanTaskNode[],
  filter: TaskFilter
): SitePlanTaskNode[] {
  if (!isFilterActive(filter)) return rows;
  return rows.filter((node) => {
    if (filter.status.length > 0 && !filter.status.includes(node.status))
      return false;
    if (filter.type.length > 0 && !filter.type.includes(node.type))
      return false;
    if (
      filter.assignedTo &&
      !(node.assigned_to ?? "")
        .toLowerCase()
        .includes(filter.assignedTo.toLowerCase())
    )
      return false;
    if (
      filter.search &&
      !node.name.toLowerCase().includes(filter.search.toLowerCase())
    )
      return false;
    return true;
  });
}

/**
 * Derives the ordered list of visible task rows by walking the tree
 * respecting expansion state, then applying the active filter.
 */
export function useTaskFiltering(
  tree: SitePlanTaskNode[],
  expandedIds: Set<string>,
  allExpanded: boolean,
  filter: TaskFilter
) {
  const visibleRows = useMemo(() => {
    const rows: SitePlanTaskNode[] = [];
    const walk = (nodes: SitePlanTaskNode[]) => {
      for (const node of nodes) {
        rows.push(node);
        if (
          node.children.length > 0 &&
          (allExpanded || expandedIds.has(node.id))
        ) {
          walk(node.children);
        }
      }
    };
    walk(tree);
    return applyFilter(rows, filter);
  }, [tree, expandedIds, allExpanded, filter]);

  return { visibleRows };
}
