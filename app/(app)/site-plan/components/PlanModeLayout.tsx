"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Delete, Indent, Outdent } from "lucide-react";
import type { SitePlanDelayLog, SitePlanTask, SitePlanTaskNode } from "@/types/siteplan";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/hooks/useSitePlanTasks";
import { GanttChart } from "./GanttChart";
import { InlineTaskCreateRow } from "./InlineTaskCreateRow";

interface PlanModeLayoutProps {
  projectId: string;
  tasks: SitePlanTask[];
  visibleRows: SitePlanTaskNode[];
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onTaskClick: (task: SitePlanTask) => void;
  selectedTaskId: string | null;
  zoom: "day" | "week" | "month" | "quarter";
  showDeps: boolean;
  showCriticalPath: boolean;
  todayTrigger: number;
  scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  onDateChange: (task: SitePlanTask, start: string, end: string) => void;
  editMode?: boolean;
  baselineTasks?: SitePlanTask[];
  delayLogs?: SitePlanDelayLog[];
}

type EditableField = "name" | "dur" | "start" | "finish" | "pct";

const PHASE_COLORS = ["border-blue-500", "border-violet-500", "border-emerald-500", "border-amber-500", "border-rose-500", "border-cyan-500"];

export function PlanModeLayout({
  projectId,
  tasks,
  visibleRows,
  expandedIds,
  toggleExpand,
  onTaskClick,
  selectedTaskId,
  zoom,
  showDeps,
  showCriticalPath,
  todayTrigger,
  scrollContainerRef,
  onDateChange,
  baselineTasks = [],
  delayLogs = [],
}: PlanModeLayoutProps) {
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const [editing, setEditing] = useState<{ id: string; field: EditableField } | null>(null);
  const [draft, setDraft] = useState("");
  const [inlinePhaseId, setInlinePhaseId] = useState<string | null>(null);

  const rootPhases = useMemo(() => visibleRows.filter((r) => r.parent_id === null && r.children.length > 0), [visibleRows]);

  const depthMap = useMemo(() => {
    const map = new Map<string, number>();
    const walk = (n: SitePlanTaskNode, d: number) => {
      map.set(n.id, d);
      n.children.forEach((c) => walk(c, d + 1));
    };
    visibleRows.forEach((r) => {
      if (r.parent_id === null) walk(r, 0);
    });
    return map;
  }, [visibleRows]);

  const commitEdit = (node: SitePlanTaskNode) => {
    if (!editing) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      setEditing(null);
      return;
    }

    if (editing.field === "name" && trimmed !== node.name) {
      updateTask.mutate({ id: node.id, projectId: node.project_id, updates: { name: trimmed } });
    }
    if (editing.field === "dur") {
      const days = Number(trimmed);
      if (!Number.isNaN(days) && days > 0) {
        const start = new Date(node.start_date);
        start.setDate(start.getDate() + days - 1);
        const end = start.toISOString().slice(0, 10);
        updateTask.mutate({ id: node.id, projectId: node.project_id, updates: { end_date: end } });
      }
    }
    if (editing.field === "start") onDateChange(node, trimmed, node.end_date);
    if (editing.field === "finish") onDateChange(node, node.start_date, trimmed);
    if (editing.field === "pct") {
      const value = Math.max(0, Math.min(100, Number(trimmed)));
      if (!Number.isNaN(value)) updateTask.mutate({ id: node.id, projectId: node.project_id, updates: { progress: value } });
    }
    setEditing(null);
  };

  const focusNameInput = (taskId: string) => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const nextInput = document.querySelector<HTMLInputElement>(
        `input[data-task-name-input="true"][data-task-id="${taskId}"]`
      );
      nextInput?.focus();
      nextInput?.select();
    });
  };

  const findPhaseOf = (node: SitePlanTaskNode) => {
    if (node.parent_id === null) return node;
    let current = node;
    while (current.parent_id) {
      const parent = visibleRows.find((n) => n.id === current.parent_id);
      if (!parent) break;
      current = parent;
    }
    return current;
  };

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex w-[360px] shrink-0 flex-col border-r border-slate-200">
        <div className="sticky top-0 flex h-9 items-center border-b bg-slate-50 text-[11px] font-semibold text-slate-500">
          <div className="w-8 px-1">#</div><div className="flex-1">Task Name</div><div className="w-16">Dur</div><div className="w-24">Start</div><div className="w-24">Finish</div><div className="w-14">%</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleRows.map((node, index) => {
            const depth = depthMap.get(node.id) ?? 0;
            const isSummary = node.children.length > 0 && depth === 0;

            if (isSummary) {
              const isOpen = expandedIds.has(node.id);
              const phaseIndex = rootPhases.findIndex((p) => p.id === node.id);
              return (
                <div key={node.id}>
                  <div className={`sticky top-0 z-[5] flex h-9 items-center border-l-[3px] ${PHASE_COLORS[phaseIndex % PHASE_COLORS.length]} bg-slate-50 px-2`}>
                    <button onClick={() => toggleExpand(node.id)} className="mr-1">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
                    <button onClick={() => onTaskClick(node)} className="min-w-0 flex-1 text-left text-sm font-bold">{node.name}</button>
                    <div className="mr-2 h-2 w-16 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-500" style={{ width: `${node.progress}%` }} /></div>
                    <span className="text-xs">{node.progress}%</span>
                  </div>
                  {isOpen ? (
                    inlinePhaseId === node.id ? (
                      <InlineTaskCreateRow
                        projectId={node.project_id}
                        parentId={node.id}
                        type="task"
                        sortOrder={node.children.length + 1}
                        onCreated={() => setInlinePhaseId(null)}
                        onCancel={() => setInlinePhaseId(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setInlinePhaseId(node.id)}
                        className="h-8 w-full border-b border-slate-100 px-4 text-left text-xs italic text-slate-400 hover:bg-slate-50"
                      >
                        + Add task
                      </button>
                    )
                  ) : null}
                </div>
              );
            }

            return (
              <div key={node.id} className={`group flex h-9 items-center border-b border-slate-100 hover:bg-slate-50 ${selectedTaskId === node.id ? "bg-blue-50" : ""}`}>
                <div className="w-8 px-1 text-[10px] text-slate-400">{index + 1}</div>
                <button onClick={() => onTaskClick(node)} className="flex flex-1 items-center text-left" style={{ paddingLeft: `${Math.max(0, depth - 1) * 14}px` }}>
                  {editing?.id === node.id && editing.field === "name" ? (
                    <input
                      autoFocus
                      data-task-name-input="true"
                      data-task-id={node.id}
                      className="w-full rounded border px-1 text-xs"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commitEdit(node)}
                      onKeyDown={(e) => {
                        const currentIndex = visibleRows.findIndex((row) => row.id === node.id);

                        if (e.key === "Tab" && !e.shiftKey) {
                          e.preventDefault();
                          const above = currentIndex > 0 ? visibleRows[currentIndex - 1] : null;
                          if (above) {
                            updateTask.mutate({
                              id: node.id,
                              projectId: node.project_id,
                              updates: { parent_id: above.id },
                            });
                          }
                          return;
                        }

                        if (e.key === "Tab" && e.shiftKey) {
                          e.preventDefault();
                          const parent = node.parent_id
                            ? visibleRows.find((row) => row.id === node.parent_id)
                            : null;
                          updateTask.mutate({
                            id: node.id,
                            projectId: node.project_id,
                            updates: { parent_id: parent?.parent_id ?? null },
                          });
                          return;
                        }

                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitEdit(node);
                          const next = currentIndex >= 0 ? visibleRows[currentIndex + 1] : null;
                          if (next) {
                            setEditing({ id: next.id, field: "name" });
                            setDraft(next.name);
                            focusNameInput(next.id);
                          }
                        }
                      }}
                    />
                  ) : (
                    <span className="truncate text-xs" onClick={() => { setEditing({ id: node.id, field: "name" }); setDraft(node.name); }}>{node.name}</span>
                  )}
                </button>
                <div className="w-16 text-xs">
                  {editing?.id === node.id && editing.field === "dur" ? <input autoFocus className="w-full border px-1 text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => commitEdit(node)} /> : <span onClick={() => { setEditing({ id: node.id, field: "dur" }); setDraft(String(node.duration_days)); }}>{node.duration_days}</span>}
                </div>
                <div className="w-24 text-xs">{editing?.id === node.id && editing.field === "start" ? <input autoFocus type="date" className="w-full border px-1 text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => commitEdit(node)} /> : <span onClick={() => { setEditing({ id: node.id, field: "start" }); setDraft(node.start_date); }}>{fmtDate(node.start_date)}</span>}</div>
                <div className="w-24 text-xs">{editing?.id === node.id && editing.field === "finish" ? <input autoFocus type="date" className="w-full border px-1 text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => commitEdit(node)} /> : <span onClick={() => { setEditing({ id: node.id, field: "finish" }); setDraft(node.end_date); }}>{fmtDate(node.end_date)}</span>}</div>
                <div className="w-14 text-xs">{editing?.id === node.id && editing.field === "pct" ? <input autoFocus type="number" min={0} max={100} className="w-full border px-1 text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => commitEdit(node)} /> : <span onClick={() => { setEditing({ id: node.id, field: "pct" }); setDraft(String(node.progress)); }}>{node.progress}</span>}</div>
                <div className="mr-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => {
                      const above = visibleRows[index - 1];
                      if (!above) return;
                      updateTask.mutate({ id: node.id, projectId: node.project_id, updates: { parent_id: above.id } });
                    }}
                    title="Indent"
                  ><Indent className="h-3.5 w-3.5" /></button>
                  <button
                    onClick={() => {
                      const phase = findPhaseOf(node);
                      updateTask.mutate({ id: node.id, projectId: node.project_id, updates: { parent_id: phase.parent_id } });
                    }}
                    title="Outdent"
                  ><Outdent className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteTask.mutate({ id: node.id, projectId: node.project_id })} title="Delete"><Delete className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => {
              const anyTask = tasks[0];
              const today = new Date().toISOString().slice(0, 10);
              createTask.mutate({
                project_id: projectId,
                parent_id: null,
                name: "New Phase",
                type: "summary" as unknown as SitePlanTask["type"],
                start_date: anyTask?.start_date ?? today,
                end_date: anyTask?.end_date ?? today,
                sort_order: rootPhases.length,
              });
            }}
            className="h-9 w-full border-t border-slate-200 px-3 text-left text-sm text-blue-600"
          >
            + Add phase
          </button>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <GanttChart
          tasks={tasks}
          visibleRows={visibleRows}
          baselines={baselineTasks}
          delayLogs={delayLogs}
          zoom={zoom}
          showDependencies={showDeps}
          showCriticalPath={showCriticalPath}
          selectedTaskId={selectedTaskId}
          onTaskClick={onTaskClick}
          onDateChange={onDateChange}
          todayTrigger={todayTrigger}
          scrollContainerRef={scrollContainerRef}
        />
      </div>
    </div>
  );
}
