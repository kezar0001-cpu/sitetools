"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SitePlanTask, SitePlanTaskNode, TaskType } from "@/types/siteplan";
import { computeWorkProgress } from "@/types/siteplan";
import { DEPTH_ZERO_DOT_COLORS } from "@/lib/sitePlanColors";
import { GanttChart } from "./GanttChart";

export const DESKTOP_ROW_HEIGHT = 40;

export type TaskListItem =
  | { kind: "task"; node: SitePlanTaskNode; taskIndex: number }
  | { kind: "add_row_trigger" }
  | { kind: "inline_input"; parentId: string | null; type: TaskType; sortOrder: number };

const ROOT_DOT_COLORS = DEPTH_ZERO_DOT_COLORS;

function collectLeaves(nodes: SitePlanTaskNode[]): SitePlanTaskNode[] {
  const leaves: SitePlanTaskNode[] = [];
  const walk = (branch: SitePlanTaskNode[]) => {
    for (const node of branch) {
      if (node.children.length > 0) {
        walk(node.children);
      } else if (node.children.length === 0) {
        leaves.push(node);
      } else {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return leaves;
}

function computePhaseStats(children: SitePlanTaskNode[]) {
  if (children.length === 0) {
    return { totalTasks: 0, progress: 0 };
  }

  const leaves = collectLeaves(children);
  const sources = leaves.length > 0 ? leaves : children;
  return {
    totalTasks: sources.length,
    progress: Math.round(computeWorkProgress(sources)),
  };
}

interface GanttWrapperProps {
  tasks: SitePlanTask[];
  visibleRows: SitePlanTaskNode[];
  listItems: TaskListItem[];
  zoom: "day" | "week" | "month" | "quarter";
  showDeps: boolean;
  showCriticalPath: boolean;
  todayTrigger: number;
  selectedTaskId: string | null;
  hoveredTaskId: string | null;
  onTaskClick: (task: SitePlanTask) => void;
  renderLeftRows: (args: {
    height: number;
    onScroll: ({ scrollOffset }: { scrollOffset: number }) => void;
    setOuterRef: (el: HTMLDivElement | null) => void;
  }) => React.ReactNode;
  onRightPanelScroll?: (scrollTop: number) => void;
  leftScrollRef: React.MutableRefObject<HTMLDivElement | null>;
  leftHeader?: React.ReactNode;
  expandedIds: Set<string>;
  allExpanded: boolean;
  toggleExpand: (id: string) => void;
  handleSelect: (node: SitePlanTaskNode) => void;
  setDelayTask: (node: SitePlanTaskNode | null) => void;
  delayCountMap: Map<string, number>;
  openBottomInlineRow: () => void;
  onRowAddBelow: (node: SitePlanTaskNode) => void;
  onRowAddSubtask: (node: SitePlanTaskNode) => void;
  projectId: string;
  setInlineInput: React.Dispatch<React.SetStateAction<{ type: TaskType; parentId: string | null; afterIndex: number; afterTaskId: string | null } | null>>;
  highlightedTaskIds: Set<string>;
  selectedRowIds: Set<string>;
  onRowNumberClick: (node: SitePlanTaskNode, rowNumber: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onUpdateTaskInline: (taskId: string, updates: Partial<SitePlanTaskNode>) => void;
  onHoverTask: (taskId: string | null) => void;
}

export function GanttWrapper(props: GanttWrapperProps) {
  const {
    tasks,
    visibleRows,
    listItems,
    zoom,
    showDeps,
    showCriticalPath,
    todayTrigger,
    selectedTaskId,
    hoveredTaskId,
    onTaskClick,
    renderLeftRows,
    onRightPanelScroll,
    leftScrollRef,
  } = props;

  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScrollRef = useRef(false);
  const [desktopListHeight, setDesktopListHeight] = useState(500);
  const [stickyPhaseNode, setStickyPhaseNode] = useState<SitePlanTaskNode | null>(null);
  const stickyPhaseIndex = stickyPhaseNode ? visibleRows.filter((n) => n.children.length > 0 && n.parent_id === null).findIndex((n) => n.id === stickyPhaseNode.id) : 0;
  const stickyPhaseStats = stickyPhaseNode ? computePhaseStats(stickyPhaseNode.children) : null;

  useEffect(() => {
    const el = desktopContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setDesktopListHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedTaskId || !leftScrollRef.current) return;
    const selectedIndex = visibleRows.findIndex((row) => row.id === selectedTaskId);
    if (selectedIndex < 0) return;
    leftScrollRef.current.scrollTo({ top: selectedIndex * DESKTOP_ROW_HEIGHT, behavior: "smooth" });
  }, [selectedTaskId, visibleRows, leftScrollRef]);

  const handleVirtualScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    const topItemIndex = Math.floor(scrollOffset / DESKTOP_ROW_HEIGHT);
    if (topItemIndex === 0) return setStickyPhaseNode(null);
    const topItem = listItems[topItemIndex];
    if (topItem?.kind === "task" && topItem.node.children.length > 0 && topItem.node.parent_id === null) return setStickyPhaseNode(null);
    let found: SitePlanTaskNode | null = null;
    for (let i = topItemIndex - 1; i >= 0; i--) {
      const item = listItems[i];
      if (item?.kind === "task" && item.node.children.length > 0 && item.node.parent_id === null) {
        found = item.node;
        break;
      }
    }
    setStickyPhaseNode((prev) => (prev?.id === found?.id ? prev : found));
  }, [listItems]);

  const handleRightPanelScroll = useCallback((scrollTop: number) => {
    if (isSyncingScrollRef.current || !leftScrollRef.current) return;
    isSyncingScrollRef.current = true;
    leftScrollRef.current.scrollTop = scrollTop;
    onRightPanelScroll?.(scrollTop);
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }, [leftScrollRef, onRightPanelScroll]);

  useEffect(() => {
    const leftEl = leftScrollRef.current;
    if (!leftEl || !rightScrollRef.current) return;
    const onLeftScroll = () => {
      if (isSyncingScrollRef.current || !rightScrollRef.current) return;
      isSyncingScrollRef.current = true;
      rightScrollRef.current.scrollTop = leftEl.scrollTop;
      requestAnimationFrame(() => {
        isSyncingScrollRef.current = false;
      });
    };
    leftEl.addEventListener("scroll", onLeftScroll, { passive: true });
    return () => leftEl.removeEventListener("scroll", onLeftScroll);
  }, [leftScrollRef, desktopListHeight, listItems.length]);

  const phaseBanner = (
    <div
      className={`shrink-0 overflow-hidden transition-all duration-200 ${
        stickyPhaseNode ? "h-7 opacity-100" : "h-0 opacity-0"
      }`}
    >
      <div className="h-7 bg-slate-800 px-3 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2 w-2 rounded-full ${
              ROOT_DOT_COLORS[stickyPhaseIndex % ROOT_DOT_COLORS.length]
            }`}
            aria-hidden
          />
          <span className="text-xs font-bold truncate">
            {stickyPhaseNode?.name ?? ""}
          </span>
        </div>
        <span className="text-xs whitespace-nowrap">
          {stickyPhaseStats?.totalTasks ?? 0} tasks · {stickyPhaseStats?.progress ?? 0}% complete
        </span>
      </div>
    </div>
  );

  return (
    <div className="hidden md:flex flex-1 min-w-0 overflow-hidden">
      <div className="flex flex-col min-w-0 flex-1">
        {props.leftHeader}
        {phaseBanner}
        <div className="flex-1 min-h-0" ref={desktopContainerRef}>
          {renderLeftRows({
            height: desktopListHeight,
            onScroll: handleVirtualScroll,
            setOuterRef: (el) => {
              leftScrollRef.current = el;
            },
          })}
        </div>
      </div>
      <div className="w-px shrink-0 bg-slate-200" />
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {phaseBanner}
        <div className="min-h-0 flex-1">
        {tasks.length > 0 ? (
          <GanttChart
            tasks={tasks}
            zoom={zoom}
            showDependencies={showDeps}
            showCriticalPath={showCriticalPath}
            selectedTaskId={selectedTaskId}
            hoveredTaskId={hoveredTaskId}
            onTaskClick={onTaskClick}
            todayTrigger={todayTrigger}
            scrollContainerRef={rightScrollRef}
            onVerticalScroll={handleRightPanelScroll}
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full text-slate-400 text-sm">Add tasks to see the Gantt chart.</div>
        )}
        </div>
      </div>
    </div>
  );
}
