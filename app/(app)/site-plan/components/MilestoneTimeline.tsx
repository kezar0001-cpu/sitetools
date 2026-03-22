"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, List, GitBranch } from "lucide-react";
import type { SitePlanTask, SitePlanTaskNode, TaskStatus } from "@/types/siteplan";
import { buildTaskTree } from "@/types/siteplan";

// ─── Types ───────────────────────────────────────────────────

interface MilestoneTimelineProps {
  tasks: SitePlanTask[];
  onTaskClick?: (task: SitePlanTask) => void;
}

type DisplayMode = "summary" | "detailed";

// ─── Constants ───────────────────────────────────────────────

const STATUS_COLORS: Record<
  TaskStatus,
  { track: string; fill: string; text: string; dot: string; badge: string }
> = {
  not_started: {
    track: "#e2e8f0",
    fill: "#94a3b8",
    text: "#475569",
    dot: "#94a3b8",
    badge: "bg-slate-100 text-slate-600",
  },
  in_progress: {
    track: "#bfdbfe",
    fill: "#3b82f6",
    text: "#1d4ed8",
    dot: "#3b82f6",
    badge: "bg-blue-100 text-blue-700",
  },
  completed: {
    track: "#bbf7d0",
    fill: "#22c55e",
    text: "#15803d",
    dot: "#22c55e",
    badge: "bg-green-100 text-green-700",
  },
  delayed: {
    track: "#fecaca",
    fill: "#ef4444",
    text: "#b91c1c",
    dot: "#ef4444",
    badge: "bg-red-100 text-red-700",
  },
  on_hold: {
    track: "#fde68a",
    fill: "#f59e0b",
    text: "#92400e",
    dot: "#f59e0b",
    badge: "bg-amber-100 text-amber-700",
  },
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Done",
  delayed: "Delayed",
  on_hold: "On Hold",
};

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function durationDays(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.ceil((e - s) / 86400000));
}

// ─── Progress bar ────────────────────────────────────────────

function ProgressBar({
  progress,
  status,
  height = 8,
}: {
  progress: number;
  status: TaskStatus;
  height?: number;
}) {
  const c = STATUS_COLORS[status];
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: c.track }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: c.fill }}
      />
    </div>
  );
}

// ─── Task row within a phase ──────────────────────────────────

function TaskItem({
  task,
  isLast,
  connectorColor,
  onClick,
}: {
  task: SitePlanTaskNode;
  isLast: boolean;
  connectorColor: string;
  onClick?: () => void;
}) {
  const c = STATUS_COLORS[task.status];
  return (
    <button
      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 pl-5">
        {/* Vertical connector line + dot */}
        <div className="flex flex-col items-center shrink-0 pt-1">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: c.dot }}
          />
          {!isLast && (
            <div
              className="w-px flex-1 mt-1 min-h-[24px]"
              style={{ background: connectorColor }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0 pb-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-slate-800 truncate leading-snug">
              {task.name}
            </span>
            <span
              className="shrink-0 text-[10px] font-semibold tabular-nums"
              style={{ color: c.text }}
            >
              {task.progress}%
            </span>
          </div>

          <div className="text-[10px] text-slate-400 mb-1.5">
            {formatDate(task.start_date)} → {formatDate(task.end_date)}
            <span className="ml-1 text-slate-300">
              · {durationDays(task.start_date, task.end_date)}d
            </span>
          </div>

          <ProgressBar progress={task.progress} status={task.status} height={5} />
        </div>
      </div>
    </button>
  );
}

// ─── Phase card ──────────────────────────────────────────────

function PhaseCard({
  phase,
  showTasks,
  onPhaseClick,
  onTaskClick,
}: {
  phase: SitePlanTaskNode;
  showTasks: boolean;
  onPhaseClick?: () => void;
  onTaskClick?: (task: SitePlanTask) => void;
}) {
  const c = STATUS_COLORS[phase.status];
  const tasks = phase.children ?? [];
  const taskCount = tasks.length;

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Phase header */}
      <button
        className="w-full text-left px-4 pt-4 pb-3 active:bg-slate-50 transition-colors"
        onClick={onPhaseClick}
      >
        {/* Top row: dot + name + badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="shrink-0 w-3 h-3 rounded-full mt-0.5"
              style={{ background: c.fill }}
            />
            <span className="text-sm font-semibold text-slate-900 leading-snug truncate">
              {phase.name}
            </span>
          </div>
          <span
            className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.badge}`}
          >
            {STATUS_LABELS[phase.status]}
          </span>
        </div>

        {/* Date + task count */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2.5 pl-5">
          <span>{formatDate(phase.start_date)}</span>
          <span className="text-slate-300">→</span>
          <span>{formatDate(phase.end_date)}</span>
          <span className="text-slate-300">·</span>
          <span>{durationDays(phase.start_date, phase.end_date)}d</span>
          {taskCount > 0 && (
            <>
              <span className="text-slate-300 ml-auto">·</span>
              <span className="ml-auto text-slate-400">
                {taskCount} task{taskCount !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        {/* Phase progress bar */}
        <div className="pl-5">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ProgressBar progress={phase.progress} status={phase.status} height={8} />
            </div>
            <span
              className="text-xs font-bold tabular-nums w-9 text-right"
              style={{ color: c.text }}
            >
              {phase.progress}%
            </span>
          </div>
        </div>
      </button>

      {/* Tasks — only shown in detailed mode */}
      {showTasks && tasks.length > 0 && (
        <div className="pb-2">
          {tasks.map((task, idx) => (
            <TaskItem
              key={task.id}
              task={task}
              isLast={idx === tasks.length - 1}
              connectorColor={c.track}
              onClick={() => onTaskClick?.(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export function MilestoneTimeline({ tasks, onTaskClick }: MilestoneTimelineProps) {
  const [mode, setMode] = useState<DisplayMode>("detailed");
  const [activePhasedIdx, setActivePhasedIdx] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const phaseRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Build phase tree
  const tree = useMemo(() => buildTaskTree(tasks), [tasks]);
  const phases = useMemo(
    () => tree.filter((n) => n.type === "phase" || n.type === "milestone"),
    [tree]
  );

  // ── Navigation ───────────────────────────────────────────────

  const scrollToPhase = useCallback((phaseId: string) => {
    const el = phaseRefs.current.get(phaseId);
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const jumpToPhase = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(phases.length - 1, idx));
      setActivePhasedIdx(clamped);
      if (phases[clamped]) scrollToPhase(phases[clamped].id);
    },
    [phases, scrollToPhase]
  );

  // ── Swipe gesture ────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      // Only respond to predominantly horizontal swipes (≥50px)
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      jumpToPhase(dx < 0 ? activePhasedIdx + 1 : activePhasedIdx - 1);
    },
    [activePhasedIdx, jumpToPhase]
  );

  // ── Scroll-based active phase tracking ───────────────────────

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const containerTop = scrollContainerRef.current.getBoundingClientRect().top;
    let closestIdx = 0;
    let closestDist = Infinity;
    phases.forEach((phase, idx) => {
      const el = phaseRefs.current.get(phase.id);
      if (!el) return;
      const dist = Math.abs(el.getBoundingClientRect().top - containerTop);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    setActivePhasedIdx(closestIdx);
  }, [phases]);

  // ── Empty state ──────────────────────────────────────────────

  if (phases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <GitBranch className="h-10 w-10 text-slate-200 mb-3" />
        <p className="text-sm font-medium text-slate-500 mb-1">No phases yet</p>
        <p className="text-xs text-slate-400">Add phases in the Plan view to see them here.</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header: phase navigator + mode toggle ── */}
      <div className="shrink-0 bg-white border-b border-slate-100">
        {/* Mode toggle */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {phases.length} Phase{phases.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 gap-0.5">
            <button
              onClick={() => setMode("summary")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                mode === "summary"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="h-3 w-3" />
              Summary
            </button>
            <button
              onClick={() => setMode("detailed")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                mode === "detailed"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <GitBranch className="h-3 w-3" />
              Detailed
            </button>
          </div>
        </div>

        {/* Phase navigator pills */}
        <div className="flex overflow-x-auto gap-1.5 px-4 pb-2 scrollbar-none">
          {phases.map((phase, idx) => {
            const c = STATUS_COLORS[phase.status];
            const isActive = idx === activePhasedIdx;
            return (
              <button
                key={phase.id}
                onClick={() => jumpToPhase(idx)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: isActive ? "white" : c.fill }}
                />
                {phase.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Swipe navigation hint (left/right arrows) ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-slate-50 border-b border-slate-100">
        <button
          onClick={() => jumpToPhase(activePhasedIdx - 1)}
          disabled={activePhasedIdx === 0}
          className="flex items-center gap-1 text-xs text-slate-500 disabled:text-slate-300 hover:text-slate-700 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[36px]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {activePhasedIdx > 0 ? (
            <span className="truncate max-w-[90px]">{phases[activePhasedIdx - 1]?.name}</span>
          ) : (
            <span>Previous</span>
          )}
        </button>

        <span className="text-[10px] text-slate-400 font-medium">
          {activePhasedIdx + 1} / {phases.length}
        </span>

        <button
          onClick={() => jumpToPhase(activePhasedIdx + 1)}
          disabled={activePhasedIdx === phases.length - 1}
          className="flex items-center gap-1 text-xs text-slate-500 disabled:text-slate-300 hover:text-slate-700 disabled:cursor-not-allowed transition-colors justify-end min-w-[44px] min-h-[36px]"
        >
          {activePhasedIdx < phases.length - 1 ? (
            <span className="truncate max-w-[90px]">{phases[activePhasedIdx + 1]?.name}</span>
          ) : (
            <span>Next</span>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Timeline body ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-20"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onScroll={handleScroll}
      >
        {phases.map((phase, idx) => (
          <div
            key={phase.id}
            ref={(el) => {
              if (el) phaseRefs.current.set(phase.id, el);
              else phaseRefs.current.delete(phase.id);
            }}
          >
            {/* Phase index label */}
            <div className="px-4 pt-3 pb-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Phase {idx + 1}
              </span>
            </div>

            <PhaseCard
              phase={phase}
              showTasks={mode === "detailed"}
              onPhaseClick={() => onTaskClick?.(phase)}
              onTaskClick={onTaskClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
