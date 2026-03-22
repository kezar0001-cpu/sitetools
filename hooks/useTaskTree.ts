import { useState, useMemo, useCallback } from "react";
import type { SitePlanTask, SitePlanTaskNode } from "@/types/siteplan";
import { buildTaskTree, flattenTree } from "@/types/siteplan";

interface UseTaskTreeOptions {
  initialExpandedIds?: Set<string>;
  initialAllExpanded?: boolean;
}

/**
 * Manages task tree structure and expansion state.
 * Handles tree building from flat tasks, WBS-ordered flattening, and
 * per-node / global expand/collapse for both desktop and mobile views.
 */
export function useTaskTree(
  tasks: SitePlanTask[] | undefined,
  options: UseTaskTreeOptions = {}
) {
  const { initialExpandedIds, initialAllExpanded } = options;

  const tree = useMemo(
    () => (tasks ? buildTaskTree(tasks) : []),
    [tasks]
  );

  const flatTasks = useMemo(() => flattenTree(tree), [tree]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => initialExpandedIds ?? new Set()
  );
  const [allExpanded, setAllExpanded] = useState<boolean>(
    initialAllExpanded !== undefined ? initialAllExpanded : true
  );
  const [mobileExpandedIds, setMobileExpandedIds] = useState<Set<string>>(
    new Set()
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setAllExpanded((prev) => !prev);
    setExpandedIds(new Set());
  }, []);

  const toggleMobileExpand = useCallback((id: string) => {
    setMobileExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return {
    tree,
    flatTasks,
    expandedIds,
    setExpandedIds,
    allExpanded,
    setAllExpanded,
    mobileExpandedIds,
    toggleExpand,
    toggleAll,
    toggleMobileExpand,
  };
}

export type { SitePlanTaskNode };
