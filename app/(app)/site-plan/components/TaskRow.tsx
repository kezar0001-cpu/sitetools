"use client";

import { ChevronRight, ChevronDown } from "lucide-react";
import type { SitePlanTaskNode } from "@/types/siteplan";
import { getBarPosition } from "@/types/siteplan";
import { StatusBadge } from "./StatusBadge";

const statusBarColors: Record<string, string> = {
  not_started: "bg-slate-300",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  delayed: "bg-red-500",
  on_hold: "bg-amber-400",
};

const statusProgressColors: Record<string, string> = {
  not_started: "bg-slate-400",
  in_progress: "bg-blue-700",
  completed: "bg-green-700",
  delayed: "bg-red-700",
  on_hold: "bg-amber-600",
};

interface TaskRowProps {
  node: SitePlanTaskNode;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (task: SitePlanTaskNode) => void;
  rangeStart: Date;
  rangeEnd: Date;
}

const rowStyles = {
  phase:
    "bg-slate-100 dark:bg-slate-800 border-l-4 border-blue-500 font-semibold",
  task: "bg-white dark:bg-slate-900",
  subtask: "bg-slate-50 dark:bg-slate-850",
};

const indentPx = {
  phase: "pl-2",
  task: "pl-8",
  subtask: "pl-14",
};

const textStyles = {
  phase: "text-sm font-semibold text-slate-900",
  task: "text-sm font-normal text-slate-800",
  subtask: "text-xs text-slate-500",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function TaskRow({
  node,
  expanded,
  onToggle,
  onSelect,
  rangeStart,
  rangeEnd,
}: TaskRowProps) {
  const hasChildren = node.children.length > 0;
  const bar = getBarPosition(node.start_date, node.end_date, rangeStart, rangeEnd);
  const barColor = statusBarColors[node.status] ?? "bg-slate-300";
  const progressColor = statusProgressColors[node.status] ?? "bg-slate-400";

  return (
    <div
      className={`flex items-center border-b border-slate-100 cursor-pointer hover:bg-slate-50/80 transition-colors min-h-[44px] ${rowStyles[node.type]}`}
      onClick={() => onSelect(node)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(node);
      }}
    >
      {/* Left: task info columns */}
      <div className="flex items-center gap-1 py-2 px-2 min-w-0 w-[55%] md:w-[50%] shrink-0">
        {/* Indent + chevron */}
        <div className={`flex items-center shrink-0 ${indentPx[node.type]}`}>
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="p-0.5 rounded hover:bg-slate-200 min-w-[24px] min-h-[24px] flex items-center justify-center"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>
          ) : (
            <span className="w-6" />
          )}
        </div>

        {/* Task name */}
        <span className={`truncate ${textStyles[node.type]}`}>
          {node.name}
        </span>
      </div>

      {/* Duration */}
      <span className="hidden md:flex text-xs text-slate-400 tabular-nums w-14 shrink-0 justify-center">
        {node.duration_days}d
      </span>

      {/* Start date */}
      <span className="text-xs text-slate-400 tabular-nums w-16 md:w-20 shrink-0 text-center">
        {formatDate(node.start_date)}
      </span>

      {/* End date */}
      <span className="text-xs text-slate-400 tabular-nums w-16 md:w-20 shrink-0 text-center">
        {formatDate(node.end_date)}
      </span>

      {/* Inline mini Gantt bar — desktop only */}
      <div className="hidden md:flex flex-1 items-center px-3 min-w-0">
        <div className="relative w-full h-5 bg-slate-50 rounded overflow-hidden">
          {/* Task bar */}
          <div
            className={`absolute top-0 h-full rounded ${barColor} opacity-50`}
            style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
          />
          {/* Progress fill inside bar */}
          {node.progress > 0 && (
            <div
              className={`absolute top-0 h-full rounded-l ${progressColor}`}
              style={{
                left: `${bar.left}%`,
                width: `${bar.width * (node.progress / 100)}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Status badge — mobile visible, compact */}
      <div className="md:hidden px-2 shrink-0">
        <StatusBadge status={node.status} />
      </div>
    </div>
  );
}

/** Column header for the task list */
export function TaskListHeader() {
  return (
    <div className="flex items-center border-b-2 border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider min-h-[36px]">
      <div className="w-[55%] md:w-[50%] shrink-0 px-2 py-2">Task Name</div>
      <div className="hidden md:flex w-14 shrink-0 justify-center">Dur.</div>
      <div className="w-16 md:w-20 shrink-0 text-center">Start</div>
      <div className="w-16 md:w-20 shrink-0 text-center">End</div>
      <div className="hidden md:flex flex-1 px-3 justify-center">Gantt</div>
      <div className="md:hidden px-2 shrink-0">Status</div>
    </div>
  );
}
