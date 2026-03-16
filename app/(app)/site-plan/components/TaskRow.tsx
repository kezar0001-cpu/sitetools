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

const rowBg: Record<string, string> = {
  phase: "bg-yellow-50",
  task: "bg-white",
  subtask: "bg-white",
};

const statusColor: Record<TaskStatus, string> = {
  not_started: "text-slate-500",
  in_progress: "text-blue-600",
  completed: "text-green-600",
  delayed: "text-red-600",
  on_hold: "text-amber-600",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
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

  // Indent depth: phase=0, task=1, subtask=2
  const indentLevel = node.type === "phase" ? 0 : node.type === "task" ? 1 : 2;

  return (
    <div
      ref={dragProvided?.innerRef}
      {...(dragProvided?.draggableProps ?? {})}
      className={`flex items-center border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors min-h-[38px] ${rowBg[node.type]} ${isDragging ? "shadow-lg ring-2 ring-blue-400 bg-blue-50 z-50" : ""}`}
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
        className="w-7 shrink-0 flex items-center justify-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Row number */}
      <div className="w-8 shrink-0 text-center text-xs text-slate-400 tabular-nums border-r border-slate-200">
        {rowNumber}
      </div>

      {/* Task Name — with indent + expand chevron */}
      <div className="flex items-center min-w-0 flex-1 border-r border-slate-200 px-2 py-1.5">
        {/* Indent spacer */}
        {indentLevel > 0 && (
          <span
            style={{ width: `${indentLevel * 20}px` }}
            className="shrink-0"
          />
        )}

        {/* Expand/collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-0.5 rounded hover:bg-slate-200 min-w-[20px] min-h-[20px] flex items-center justify-center shrink-0 mr-1"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0 mr-1" />
        )}

        {/* Name */}
        <span
          className={`truncate text-sm ${
            isPhase
              ? "font-bold text-slate-900"
              : "font-normal text-slate-700"
          }`}
        >
          {node.name}
        </span>
      </div>

      {/* Duration */}
      <div className="w-16 shrink-0 text-center text-xs tabular-nums border-r border-slate-200 py-1.5">
        <span className={isPhase ? "font-bold text-slate-900" : "text-slate-600"}>
          {node.duration_days}d
        </span>
      </div>

      {/* Start Date */}
      <div className="w-20 shrink-0 text-center text-xs tabular-nums border-r border-slate-200 py-1.5">
        <span className={isPhase ? "font-bold text-slate-900" : "text-slate-600"}>
          {formatDate(node.start_date)}
        </span>
      </div>

      {/* End Date */}
      <div className="w-20 shrink-0 text-center text-xs tabular-nums border-r border-slate-200 py-1.5">
        <span className={isPhase ? "font-bold text-red-600" : "text-slate-600"}>
          {formatDate(node.end_date)}
        </span>
      </div>

      {/* Predecessors — desktop only */}
      <div className="hidden lg:block w-24 shrink-0 text-center text-xs text-slate-500 border-r border-slate-200 py-1.5 truncate px-1">
        {node.predecessors || ""}
      </div>

      {/* % Complete */}
      <div className="w-16 shrink-0 text-center text-xs tabular-nums border-r border-slate-200 py-1.5">
        <span className={isPhase ? "font-bold text-red-600" : "text-slate-600"}>
          {node.progress}%
        </span>
      </div>

      {/* Status — desktop only */}
      <div className="hidden md:block w-20 shrink-0 text-center text-xs border-r border-slate-200 py-1.5 truncate">
        <span className={statusColor[node.status]}>
          {STATUS_LABELS[node.status]}
        </span>
      </div>

      {/* Assigned To — desktop only */}
      <div className="hidden lg:block w-24 shrink-0 text-xs text-slate-500 border-r border-slate-200 py-1.5 truncate px-1 text-center">
        {node.assigned_to || node.responsible || ""}
      </div>

      {/* Comments — desktop only */}
      <div className="hidden xl:block w-28 shrink-0 text-xs text-slate-500 py-1.5 truncate px-2">
        {node.comments || ""}
      </div>
    </div>
  );
}

/** Column header matching MS Project spreadsheet style */
export function TaskListHeader() {
  return (
    <div className="flex items-center border-b-2 border-slate-300 bg-slate-100 text-xs font-semibold text-slate-600 min-h-[36px] sticky top-0 z-10">
      {/* Drag handle spacer */}
      <div className="w-7 shrink-0" />

      {/* Row # */}
      <div className="w-8 shrink-0 text-center border-r border-slate-300 py-2">
        #
      </div>

      {/* Task Name */}
      <div className="flex-1 min-w-0 px-2 py-2 border-r border-slate-300">
        Task Name
      </div>

      {/* Duration */}
      <div className="w-16 shrink-0 text-center py-2 border-r border-slate-300">
        Duration
      </div>

      {/* Start Date */}
      <div className="w-20 shrink-0 text-center py-2 border-r border-slate-300">
        Start Date
      </div>

      {/* End Date */}
      <div className="w-20 shrink-0 text-center py-2 border-r border-slate-300">
        End Date
      </div>

      {/* Predecessors */}
      <div className="hidden lg:block w-24 shrink-0 text-center py-2 border-r border-slate-300">
        Predecessors
      </div>

      {/* % Complete */}
      <div className="w-16 shrink-0 text-center py-2 border-r border-slate-300">
        % Complete
      </div>

      {/* Status */}
      <div className="hidden md:block w-20 shrink-0 text-center py-2 border-r border-slate-300">
        Status
      </div>

      {/* Assigned To */}
      <div className="hidden lg:block w-24 shrink-0 text-center py-2 border-r border-slate-300">
        Assigned To
      </div>

      {/* Comments */}
      <div className="hidden xl:block w-28 shrink-0 text-center py-2">
        Comments
      </div>
    </div>
  );
}
