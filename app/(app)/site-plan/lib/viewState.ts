import type { TaskStatus, TaskType } from "@/types/siteplan";

export type MobileTab = "today" | "all" | "gantt";

export interface TaskFilter {
  status: TaskStatus[];
  type: TaskType[];
  assignedTo: string;
  search: string;
}

export const EMPTY_FILTER: TaskFilter = {
  status: [],
  type: [],
  assignedTo: "",
  search: "",
};

export function isFilterActive(f: TaskFilter): boolean {
  return f.status.length > 0 || f.type.length > 0 || f.assignedTo !== "" || f.search !== "";
}
