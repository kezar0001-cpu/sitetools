"use client";

import type { SitePlanDelayLog, SitePlanTask, SitePlanTaskNode, TaskType } from "@/types/siteplan";
import { SiteTaskList } from "./SiteTaskList";

export type MobileTab = "today" | "all" | "gantt";
export const MOBILE_TABS: readonly MobileTab[] = ["today", "all", "gantt"];

export interface SitePlanMobileViewProps {
  projectId: string;
  tasks: SitePlanTask[];
  delayLogs?: SitePlanDelayLog[];
  onTaskSelect?: (task: SitePlanTask) => void;
  onTaskClick?: (task: SitePlanTask) => void;

  // legacy props intentionally tolerated
  rows?: SitePlanTaskNode[];
  activeTab?: MobileTab;
  onTabChange?: (tab: MobileTab) => void;
  onSelectTask?: (task: SitePlanTaskNode) => void;
  onLogDelay?: (task: SitePlanTaskNode) => void;
  mobileExpandedIds?: Set<string>;
  onToggleMobileExpand?: (id: string) => void;
  delayCountMap?: Map<string, number>;
  refetch?: () => Promise<unknown>;
  depthMap?: Map<string, number>;
  rootIndexMap?: Map<string, number>;
  mobileInlineInput?: {
    type: TaskType;
    parentId: string | null;
    afterIndex: number;
    afterTaskId: string | null;
  } | null;
  onMobileInlineCreated?: () => void;
  onMobileInlineCancel?: () => void;
  zoom?: "day" | "week" | "month" | "quarter";
  showDeps?: boolean;
  showCriticalPath?: boolean;
  selectedTaskId?: string | null;
  hoveredTaskId?: string | null;
  todayTrigger?: number;
  onGanttTaskClick?: (task: SitePlanTask) => void;
  onGanttDateChange?: (task: SitePlanTask, start_date: string, end_date: string) => void;
}

export function SitePlanMobileView(props: SitePlanMobileViewProps) {
  return (
    <SiteTaskList
      tasks={props.tasks}
      delayLogs={props.delayLogs ?? []}
      onTaskSelect={props.onTaskSelect ?? props.onTaskClick ?? (() => undefined)}
      projectId={props.projectId}
    />
  );
}
