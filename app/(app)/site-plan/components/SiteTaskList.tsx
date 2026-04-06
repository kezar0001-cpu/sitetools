"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { SitePlanDelayLog, SitePlanTask, SitePlanTaskNode } from "@/types/siteplan";
import { buildTaskTree } from "@/types/siteplan";
import { InlineTaskCreateRow } from "./InlineTaskCreateRow";

interface SiteTaskListProps {
  tasks: SitePlanTask[];
  delayLogs: SitePlanDelayLog[];
  onTaskSelect: (task: SitePlanTask) => void;
  projectId: string;
}

interface PhaseGroup {
  phase: SitePlanTaskNode;
  children: SitePlanTaskNode[];
  completionCount: number;
  totalCount: number;
}

const STATUS_DOT: Record<SitePlanTask["status"], string> = {
  not_started: "bg-slate-300",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  delayed: "bg-red-500",
  on_hold: "bg-amber-500",
};

const PHASE_DOT: string[] = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function dayStamp(dateLike: string | Date) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function flatten(nodes: SitePlanTaskNode[]): SitePlanTaskNode[] {
  const out: SitePlanTaskNode[] = [];
  const walk = (list: SitePlanTaskNode[]) => {
    for (const node of list) {
      out.push(node);
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

export function SiteTaskList({ tasks, delayLogs, onTaskSelect, projectId }: SiteTaskListProps) {
  void delayLogs;
  const router = useRouter();
  const [collapsedPhaseIds, setCollapsedPhaseIds] = useState<Set<string>>(new Set());
  const [inlinePhaseId, setInlinePhaseId] = useState<string | null>(null);
  const rowRefMap = useRef<Record<string, HTMLButtonElement | null>>({});

  const tree = useMemo(() => buildTaskTree(tasks), [tasks]);

  const phaseGroups = useMemo<PhaseGroup[]>(() => {
    return tree.map((phase) => {
      const descendants = flatten(phase.children);
      const leafTasks = descendants.filter((item) => item.type !== "phase");
      const totalCount = leafTasks.length;
      const completionCount = leafTasks.filter((item) => item.progress >= 100).length;
      return {
        phase,
        children: descendants,
        completionCount,
        totalCount,
      };
    });
  }, [tree]);

  const today = useMemo(() => dayStamp(new Date()), []);

  const todaysFocusTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.type === "phase") return false;
      const start = dayStamp(task.start_date);
      const end = dayStamp(task.end_date);
      return start <= today && today <= end;
    });
  }, [tasks, today]);

  const openTask = (task: SitePlanTask) => {
    onTaskSelect(task);
  };

  const handleFocusTap = (taskId: string) => {
    const row = rowRefMap.current[taskId];
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const collapseAll = () => {
    setCollapsedPhaseIds(new Set(phaseGroups.map((group) => group.phase.id)));
    setInlinePhaseId(null);
  };

  const firstInProgressPhase = useMemo(() => {
    return (
      phaseGroups.find((group) => group.phase.status === "in_progress") ??
      phaseGroups[0] ??
      null
    );
  }, [phaseGroups]);

  const firstInProgressSortOrder = useMemo(() => {
    if (!firstInProgressPhase) return 0;
    const directChildren = tasks.filter((task) => task.parent_id === firstInProgressPhase.phase.id);
    if (directChildren.length === 0) return 0;
    return Math.max(...directChildren.map((task) => task.sort_order)) + 1;
  }, [firstInProgressPhase, tasks]);

  return (
    <div className="md:hidden relative flex min-h-0 flex-1 flex-col bg-slate-50">
      <div className="flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom)+12px)]">
        {todaysFocusTasks.length > 0 ? (
          <section className="border-b border-slate-200 bg-white px-3 py-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Today&apos;s Focus</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {todaysFocusTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                  onClick={() => handleFocusTap(task.id)}
                >
                  {task.name} — {task.progress}%
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="space-y-2 pb-3">
          {phaseGroups.map((group, phaseIndex) => {
            const isCollapsed = collapsedPhaseIds.has(group.phase.id);
            const pct = group.totalCount > 0 ? Math.round((group.completionCount / group.totalCount) * 100) : group.phase.progress;
            return (
              <section key={group.phase.id} className="bg-white">
                <button
                  type="button"
                  className="sticky top-0 z-10 flex h-10 w-full items-center gap-2 border-b border-slate-200 bg-white px-3"
                  onClick={() => {
                    setCollapsedPhaseIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.phase.id)) next.delete(group.phase.id);
                      else next.add(group.phase.id);
                      return next;
                    });
                  }}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${PHASE_DOT[phaseIndex % PHASE_DOT.length]}`} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{group.phase.name}</span>
                  <span className="text-xs text-slate-500">{group.completionCount}/{group.totalCount}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{pct}%</span>
                  {isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>

                {!isCollapsed ? (
                  <div>
                    {group.children.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        ref={(el) => {
                          rowRefMap.current[task.id] = el;
                        }}
                        onClick={() => openTask(task)}
                        className="flex min-h-[64px] w-full flex-col border-b border-slate-100 px-3 py-2 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{task.name}</p>
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[task.status]}`} />
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs text-slate-400">{task.start_date} → {task.end_date}</p>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{task.progress}%</span>
                        </div>
                      </button>
                    ))}
                    {inlinePhaseId === group.phase.id ? (
                      <InlineTaskCreateRow
                        mobile
                        projectId={projectId}
                        parentId={group.phase.id}
                        type="task"
                        sortOrder={firstInProgressSortOrder}
                        onCancel={() => setInlinePhaseId(null)}
                        onCreated={() => setInlinePhaseId(null)}
                      />
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex h-16 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <button type="button" className="flex-1 text-sm font-medium text-slate-700" onClick={collapseAll}>
          Collapse All
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center"
          onClick={() => setInlinePhaseId(firstInProgressPhase?.phase.id ?? null)}
          disabled={!firstInProgressPhase}
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
            <Plus className="h-5 w-5" />
          </span>
        </button>
        <button
          type="button"
          className="flex-1 text-sm font-medium text-slate-700"
          onClick={() => router.push(`/site-plan/${projectId}/summary`)}
        >
          📊 Summary →
        </button>
      </div>
    </div>
  );
}
