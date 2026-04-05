"use client";

import { useMemo, useState, useRef } from "react";
import { BarChart2, List, Loader2, Sun, X } from "lucide-react";
import { useUpdateTask } from "@/hooks/useSitePlanTasks";
import type { SitePlanTask, SitePlanTaskNode } from "@/types/siteplan";
import { ProgressSlider } from "./ProgressSlider";
import { MobileTaskCard } from "./TaskRow";

export type MobileTab = "today" | "all" | "gantt";
export const MOBILE_TABS: readonly MobileTab[] = ["today", "all", "gantt"];

interface SitePlanMobileViewProps {
  projectId: string;
  tasks: SitePlanTask[];
  rows: SitePlanTaskNode[];
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onSelectTask: (task: SitePlanTaskNode) => void;
  onLogDelay: (task: SitePlanTaskNode) => void;
  mobileExpandedIds: Set<string>;
  onToggleMobileExpand: (id: string) => void;
  delayCountMap: Map<string, number>;
  refetch: () => Promise<unknown>;
  depthMap: Map<string, number>;
  rootIndexMap: Map<string, number>;
}

interface GroupedPhase {
  rootId: string;
  rootName: string;
  rootProgress: number;
  items: SitePlanTaskNode[];
}

interface GroupedTodayPhase extends GroupedPhase {
  activeItems: SitePlanTaskNode[];
}

const TAB_ORDER: MobileTab[] = [...MOBILE_TABS];

export function SitePlanMobileView({
  projectId,
  tasks,
  rows,
  activeTab,
  onTabChange,
  onSelectTask,
  onLogDelay,
  mobileExpandedIds,
  onToggleMobileExpand,
  delayCountMap,
  refetch,
  depthMap,
  rootIndexMap,
}: SitePlanMobileViewProps) {
  void tasks;
  const updateTask = useUpdateTask();
  const [progressTask, setProgressTask] = useState<SitePlanTaskNode | null>(null);
  const [sliderProgress, setSliderProgress] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const groupedByPhase = useMemo<GroupedPhase[]>(() => {
    const groups = new Map<string, GroupedPhase>();
    for (const node of rows) {
      const depth = depthMap.get(node.id) ?? 0;
      if (depth !== 0 || node.children.length === 0) continue;
      groups.set(node.id, {
        rootId: node.id,
        rootName: node.name,
        rootProgress: node.progress,
        items: rows.filter((r) => (rootIndexMap.get(r.id) ?? 0) === (rootIndexMap.get(node.id) ?? 0)),
      });
    }
    return Array.from(groups.values());
  }, [rows, depthMap, rootIndexMap]);

  const todaysTasks = useMemo(() => {
    return rows.filter((task) => {
      if (task.children.length > 0 || task.type === "milestone") return false;
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      const taskStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const taskEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const inRange = taskStart <= today && today <= taskEnd;
      const overdueOpen = taskEnd < today && task.progress < 100;
      return inRange || overdueOpen;
    });
  }, [rows, today]);

  const groupedTodayByPhase = useMemo<GroupedTodayPhase[]>(() => {
    const todaysTaskIds = new Set(todaysTasks.map((task) => task.id));

    return groupedByPhase
      .map((group) => {
        const activeItems = group.items.filter((task) => todaysTaskIds.has(task.id));
        return { ...group, activeItems };
      })
      .filter((group) => group.activeItems.length > 0);
  }, [groupedByPhase, todaysTasks]);

  const activeIndex = TAB_ORDER.indexOf(activeTab);
  const mobileTabs = [
    { id: "today" as const, label: "Today", icon: Sun },
    { id: "all" as const, label: "All Tasks", icon: List },
    { id: "gantt" as const, label: "Timeline", icon: BarChart2 },
  ];

  const openProgressSheet = (task: SitePlanTaskNode) => {
    setProgressTask(task);
    setSliderProgress(task.progress);
  };

  const commitProgress = (value: number) => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      if (!progressTask) return;
      updateTask.mutate({
        id: progressTask.id,
        projectId,
        updates: { progress: value },
      });
    }, 400);
    setProgressTask((prev) => (prev ? { ...prev, progress: value } : prev));
  };

  const markComplete = () => {
    const id = progressTask?.id;
    if (!id) return;
    setProgressTask(null);
    updateTask.mutate({
      id,
      projectId,
      updates: { progress: 100 },
    });
  };

  return (
    <div className="md:hidden flex flex-1 min-h-0 flex-col">
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div
          className="flex h-full w-[300%] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeIndex * (100 / 3)}%)` }}
        >
          <div className="w-1/3 shrink-0 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom)+16px)]">
            {groupedTodayByPhase.map((group) => (
              <section key={group.rootId}>
                <div className="sticky top-0 z-10 flex min-h-[44px] items-center justify-between border-y border-slate-200 bg-slate-50 px-3">
                  <p className="text-xs font-semibold text-slate-700">{group.rootName}</p>
                  <p className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {group.activeItems.length} active today
                  </p>
                </div>
                {group.activeItems.map((node) => (
                  <MobileTaskCard
                    key={node.id}
                    node={node}
                    onSelect={onSelectTask}
                    onLogDelay={onLogDelay}
                    onProgressTap={openProgressSheet}
                    delayCount={delayCountMap.get(node.id) ?? 0}
                    mobileExpanded={mobileExpandedIds.has(node.id)}
                    onToggleMobileExpand={() => onToggleMobileExpand(node.id)}
                    depth={depthMap.get(node.id) ?? 0}
                    rootIndex={rootIndexMap.get(node.id) ?? 0}
                  />
                ))}
              </section>
            ))}
            {groupedTodayByPhase.length === 0 && (
              <div className="flex h-48 flex-col items-center justify-center gap-3 px-6">
                <Sun className="h-10 w-10 text-amber-300" strokeWidth={1.5} />
                <p className="text-sm font-semibold text-slate-700">All clear for today</p>
                <p className="text-center text-xs text-slate-400">
                  No active or overdue tasks right now.
                </p>
              </div>
            )}
          </div>

          <div
            className="w-1/3 shrink-0 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom)+16px)]"
            onTouchStart={(e) => {
              if (e.currentTarget.scrollTop <= 0) {
                touchStartYRef.current = e.touches[0].clientY;
              }
            }}
            onTouchMove={(e) => {
              if (touchStartYRef.current === null) return;
              const pull = e.touches[0].clientY - touchStartYRef.current;
              if (pull > 40 && e.currentTarget.scrollTop <= 0) {
                setIsPulling(true);
              }
            }}
            onTouchEnd={() => {
              if (isPulling) {
                void refetch();
              }
              setIsPulling(false);
              touchStartYRef.current = null;
            }}
          >
            {isPulling && (
              <div className="flex items-center justify-center gap-2 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-xs text-blue-500">Refreshing…</span>
              </div>
            )}
            {groupedByPhase.map((group) => (
              <section key={group.rootId}>
                <div className="sticky top-0 z-10 flex min-h-[44px] items-center justify-between border-y border-slate-200 bg-slate-50 px-3">
                  <p className="text-xs font-semibold text-slate-700">{group.rootName}</p>
                  <p className="text-[11px] text-slate-500">
                    {group.rootProgress}% · {group.items.length} tasks
                  </p>
                </div>
                {group.items.map((node) => (
                  <MobileTaskCard
                    key={node.id}
                    node={node}
                    onSelect={onSelectTask}
                    onLogDelay={onLogDelay}
                    onProgressTap={openProgressSheet}
                    delayCount={delayCountMap.get(node.id) ?? 0}
                    mobileExpanded={mobileExpandedIds.has(node.id)}
                    onToggleMobileExpand={() => onToggleMobileExpand(node.id)}
                    depth={depthMap.get(node.id) ?? 0}
                    rootIndex={rootIndexMap.get(node.id) ?? 0}
                  />
                ))}
              </section>
            ))}
          </div>

          <div className="w-1/3 shrink-0 overflow-hidden">
            <div className="flex h-full items-center justify-center bg-white p-4 text-center">
              <p className="text-sm text-slate-500">
                Timeline view is currently unavailable on mobile.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-up md:hidden">
        <div className="grid grid-cols-3">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-semibold transition ${
                  isActive ? "text-blue-600" : "text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {progressTask && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close progress editor"
            className="absolute inset-0 bg-black/40"
            onClick={() => setProgressTask(null)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 truncate">{progressTask.name}</p>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] rounded-lg text-slate-500"
                onClick={() => setProgressTask(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="py-2">
              <ProgressSlider
                value={sliderProgress}
                onChange={(value) => {
                  setSliderProgress(value);
                  commitProgress(value);
                }}
              />
            </div>
            <button
              type="button"
              onClick={markComplete}
              className="mt-3 min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Mark Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
