"use client";

import { ChevronRight, ChevronDown, GripVertical } from "lucide-react";
import type { SitePlanTaskNode, TaskStatus } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";
import type { DraggableProvided } from "@hello-pangea/dnd";

interface TaskRowProps {
  node: SitePlanTaskNode;
  rowNumber: number;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (task: SitePlanTaskNode) => void;
  dragProvided?: DraggableProvided;
  isDragging?: boolean;
}

// Distinctive backgrounds per type
const rowBg: Record<string, string> = {
  phase: "bg-slate-800",
  task: "bg-white",
  subtask: "bg-slate-50",
};

const rowText: Record<string, string> = {
  phase: "text-white",
  task: "text-slate-900",
  subtask: "text-slate-600",
};

// Status dot colors for compact inline badge
const statusDot: Record<TaskStatus, string> = {
  not_started: "bg-slate-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  delayed: "bg-red-500",
  on_hold: "bg-amber-500",
};

const statusBadgeCls: Record<TaskStatus, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  delayed: "bg-red-50 text-red-700",
  on_hold: "bg-amber-50 text-amber-700",
};

// Phase uses inverted badge colors
const statusBadgePhase: Record<TaskStatus, string> = {
  not_started: "bg-slate-600 text-slate-200",
  in_progress: "bg-blue-500/20 text-blue-200",
  completed: "bg-green-500/20 text-green-200",
  delayed: "bg-red-500/20 text-red-200",
  on_hold: "bg-amber-500/20 text-amber-200",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

/** Vertical nesting guide lines */
function NestingGuides({ depth }: { depth: number }) {
  if (depth === 0) return null;
  return (
    <div className="flex shrink-0" aria-hidden>
      {Array.from({ length: depth }, (_, i) => (
        <div
          key={i}
          className="w-5 shrink-0 relative"
        >
          <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-300/60" />
        </div>
      ))}
    </div>
  );
}

export function TaskRow({
  node,
  rowNumber,
  expanded,
  onToggle,
  onSelect,
  dragProvided,
  isDragging,
}: TaskRowProps) {
  const hasChildren = node.children.length > 0;
  const isPhase = node.type === "phase";
  const isSubtask = node.type === "subtask";
  const indentLevel = isPhase ? 0 : node.type === "task" ? 1 : 2;

  const bg = isDragging ? "bg-blue-50" : rowBg[node.type];
  const text = isDragging ? "text-slate-900" : rowText[node.type];
  const borderColor = isPhase ? "border-slate-700" : "border-slate-200";
  const dateCls = isPhase
    ? "text-slate-300 tabular-nums"
    : "text-slate-500 tabular-nums";

  return (
    <div
      ref={dragProvided?.innerRef}
      {...(dragProvided?.draggableProps ?? {})}
      className={`flex items-center border-b cursor-pointer transition-colors min-h-[40px] ${bg} ${borderColor} ${isDragging ? "shadow-lg ring-2 ring-blue-400 z-50" : ""} ${!isPhase && !isDragging ? "hover:bg-slate-100" : ""}`}
      onClick={() => onSelect(node)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(node);
      }}
    >
      {/* Drag handle */}
      <div
        {...(dragProvided?.dragHandleProps ?? {})}
        className={`w-7 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing ${isPhase ? "text-slate-500 hover:text-slate-300" : "text-slate-300 hover:text-slate-500"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Row number */}
      <div className={`w-8 shrink-0 text-center text-xs tabular-nums border-r ${isPhase ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-400"}`}>
        {rowNumber}
      </div>

      {/* Task Name — nesting guides + expand chevron */}
      <div className={`flex items-center min-w-0 flex-1 border-r px-1 py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        {/* Vertical nesting guide lines */}
        <NestingGuides depth={indentLevel} />

        {/* Expand/collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`p-0.5 rounded min-w-[20px] min-h-[20px] flex items-center justify-center shrink-0 mr-1 ${isPhase ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className={`h-3.5 w-3.5 ${isPhase ? "text-slate-300" : "text-slate-500"}`} />
            ) : (
              <ChevronRight className={`h-3.5 w-3.5 ${isPhase ? "text-slate-300" : "text-slate-500"}`} />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0 mr-1" />
        )}

        {/* Name */}
        <span
          className={`truncate text-sm ${text} ${
            isPhase
              ? "font-bold tracking-wide uppercase"
              : isSubtask
                ? "font-normal text-slate-500"
                : "font-medium"
          }`}
        >
          {node.name}
        </span>

        {/* Mobile status dot — always visible */}
        <span
          className={`ml-auto shrink-0 md:hidden w-2.5 h-2.5 rounded-full ${statusDot[node.status]}`}
          title={STATUS_LABELS[node.status]}
        />
      </div>

      {/* Duration */}
      <div className={`w-16 shrink-0 text-center text-xs border-r py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        <span className={isPhase ? "font-bold text-white" : isSubtask ? "text-slate-400" : "text-slate-600"}>
          {node.duration_days}d
        </span>
      </div>

      {/* Start Date */}
      <div className={`w-20 shrink-0 text-center text-xs border-r py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        <span className={dateCls}>
          {formatDate(node.start_date)}
        </span>
      </div>

      {/* End Date */}
      <div className={`w-20 shrink-0 text-center text-xs border-r py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        <span className={isPhase ? "text-red-300 font-semibold tabular-nums" : node.status === "delayed" ? "text-red-600 tabular-nums" : dateCls}>
          {formatDate(node.end_date)}
        </span>
      </div>

      {/* Predecessors — desktop only */}
      <div className={`hidden lg:block w-24 shrink-0 text-center text-xs border-r py-1.5 truncate px-1 ${isPhase ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
        {node.predecessors || ""}
      </div>

      {/* % Complete */}
      <div className={`w-16 shrink-0 text-center text-xs border-r py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        <span className={isPhase ? "font-bold text-white tabular-nums" : node.progress >= 100 ? "text-green-600 font-semibold tabular-nums" : "text-slate-600 tabular-nums"}>
          {node.progress}%
        </span>
      </div>

      {/* Status badge — visible on md+ as a pill, dot on mobile */}
      <div className={`hidden md:flex w-24 shrink-0 items-center justify-center border-r py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${isPhase ? statusBadgePhase[node.status] : statusBadgeCls[node.status]}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[node.status]}`} />
          {STATUS_LABELS[node.status]}
        </span>
      </div>

      {/* Assigned To — desktop only */}
      <div className={`hidden lg:block w-24 shrink-0 text-xs py-1.5 truncate px-1 text-center ${isPhase ? "text-slate-400" : "text-slate-500"}`}>
        {node.assigned_to || node.responsible || ""}
      </div>
    </div>
  );
}

/** Column header matching MS Project spreadsheet style */
export function TaskListHeader() {
  return (
    <div className="flex items-center border-b-2 border-slate-300 bg-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-h-[32px] sticky top-0 z-10">
      {/* Drag handle spacer */}
      <div className="w-7 shrink-0" />

      {/* Row # */}
      <div className="w-8 shrink-0 text-center border-r border-slate-300 py-1.5">
        #
      </div>

      {/* Task Name */}
      <div className="flex-1 min-w-0 px-2 py-1.5 border-r border-slate-300">
        Task Name
      </div>

      {/* Duration */}
      <div className="w-16 shrink-0 text-center py-1.5 border-r border-slate-300">
        Dur.
      </div>

      {/* Start Date */}
      <div className="w-20 shrink-0 text-center py-1.5 border-r border-slate-300">
        Start
      </div>

      {/* End Date */}
      <div className="w-20 shrink-0 text-center py-1.5 border-r border-slate-300">
        Finish
      </div>

      {/* Predecessors */}
      <div className="hidden lg:block w-24 shrink-0 text-center py-1.5 border-r border-slate-300">
        Pred.
      </div>

      {/* % Complete */}
      <div className="w-16 shrink-0 text-center py-1.5 border-r border-slate-300">
        %
      </div>

      {/* Status */}
      <div className="hidden md:block w-24 shrink-0 text-center py-1.5 border-r border-slate-300">
        Status
      </div>

      {/* Assigned To */}
      <div className="hidden lg:block w-24 shrink-0 text-center py-1.5">
        Assigned
      </div>
    </div>
  );
}
