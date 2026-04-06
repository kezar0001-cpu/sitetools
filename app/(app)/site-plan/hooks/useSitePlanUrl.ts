import { useCallback, useMemo } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { TaskStatus, TaskType } from "@/types/siteplan";
import type { MobileTab, TaskFilter } from "../lib/viewState";

interface UseSitePlanUrlParams {
  searchParams: ReadonlyURLSearchParams;
  pathname: string;
  router: {
    replace: (href: string, options?: { scroll?: boolean }) => void;
  };
}

export function useSitePlanUrl({ searchParams, pathname, router }: UseSitePlanUrlParams) {
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, val);
        }
      }
      const qs = newParams.toString();
      router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const mobileTab = (
    searchParams.get("mobileTab") === "today" ||
    searchParams.get("mobileTab") === "gantt"
      ? searchParams.get("mobileTab")
      : "all"
  ) as MobileTab;

  const handleMobileTabChange = useCallback(
    (nextTab: MobileTab) => {
      updateSearchParams({ mobileTab: nextTab === "all" ? null : nextTab });
    },
    [updateSearchParams]
  );

  const viewParam = searchParams.get("view");
  const desktopView = (viewParam === "list" || viewParam === "gantt" || viewParam === "split" ? viewParam : "split") as "list" | "gantt" | "split";

  const filter = useMemo<TaskFilter>(() => {
    const filterParam = searchParams.get("filter");
    const searchParam = searchParams.get("search");
    const assignedParam = searchParams.get("assignedTo");
    const typeParam = searchParams.get("type");

    if (filterParam === "overdue") {
      return { status: ["delayed" as const], type: [], assignedTo: "", search: "" };
    }
    if (filterParam === "due_this_week") {
      return { status: ["in_progress" as const, "not_started" as const], type: [], assignedTo: "", search: "" };
    }
    if (filterParam === "no_progress") {
      return { status: ["not_started" as const], type: [], assignedTo: "", search: "" };
    }

    const statusParam = searchParams.get("status");
    return {
      status: statusParam ? statusParam.split(",") as TaskStatus[] : [],
      type: typeParam ? typeParam.split(",") as TaskType[] : [],
      assignedTo: assignedParam ?? "",
      search: searchParam ?? "",
    };
  }, [searchParams]);

  const setFilter = useCallback(
    (f: TaskFilter) => {
      updateSearchParams({
        status: f.status.length > 0 ? f.status.join(",") : null,
        type: f.type.length > 0 ? f.type.join(",") : null,
        assignedTo: f.assignedTo || null,
        search: f.search || null,
        filter: null,
      });
    },
    [updateSearchParams]
  );

  const taskIdParam = searchParams.get("task");
  const expandedIdsParam = searchParams.get("expanded");

  return {
    updateSearchParams,
    mobileTab,
    handleMobileTabChange,
    desktopView,
    filter,
    setFilter,
    taskIdParam,
    expandedIdsParam,
  };
}
