"use client";

import { ChevronRight, ChevronDown, GripVertical, Calendar, User, AlertTriangle } from "lucide-react";
import type { SitePlanTaskNode, TaskStatus } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";
import type { DraggableProvided } from "@hello-pangea/dnd";
import { ProgressBar } from "./ProgressSlider";

interface TaskRowProps {
  node: SitePlanTaskNode;
  rowNumber: number;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (task: SitePlanTaskNode) => void;
  onLogDelay?: (task: SitePlanTaskNode) => void;
  delayCount?: number;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
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

/**
 * Compute phase-level stats from immediate children.
 * Progress = average of children's progress.
 * Date range = min start → max end across all children.
 */
function computePhaseStats(children: SitePlanTaskNode[]) {
  if (children.length === 0) return null;
  const progress = Math.round(
    children.reduce((s, c) => s + c.progress, 0) / children.length
  );
  const startDate = children.reduce(
    (min, c) => (c.start_date < min ? c.start_date : min),
    children[0].start_date
  );
  const endDate = children.reduce(
    (max, c) => (c.end_date > max ? c.end_date : max),
    children[0].end_date
  );
  return { progress, startDate, endDate };
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
  onLogDelay,
  delayCount = 0,
  dragHandleProps,
  isDragging,
}: TaskRowProps) {
  const hasChildren = node.children.length > 0;
  const isPhase = node.type === "phase";
  const isSubtask = node.type === "subtask";
  const indentLevel = isPhase ? 0 : node.type === "task" ? 1 : 2;

  // For phases, derive display values from children so the phase reflects actual child data
  const phaseStats = isPhase ? computePhaseStats(node.children) : null;
  const displayProgress = phaseStats?.progress ?? node.progress;
  const displayStartDate = phaseStats?.startDate ?? node.start_date;
  const displayEndDate = phaseStats?.endDate ?? node.end_date;

  const bg = isDragging ? "bg-blue-50" : rowBg[node.type];
  const text = isDragging ? "text-slate-900" : rowText[node.type];
  const borderColor = isPhase ? "border-slate-700" : "border-slate-200";
  const dateCls = isPhase
    ? "text-slate-300 tabular-nums"
    : "text-slate-500 tabular-nums";

  return (
    <div
      className={`hidden md:flex items-stretch border-b cursor-pointer transition-colors min-h-[40px] ${bg} ${borderColor} ${isDragging ? "shadow-lg ring-2 ring-blue-400 z-50" : ""} ${!isPhase && !isDragging ? "hover:bg-slate-100" : ""}`}
      onClick={() => onSelect(node)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(node);
      }}
    >
      {/* Drag handle */}
      <div
        {...(dragHandleProps ?? {})}
        className={`w-7 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing self-center ${isPhase ? "text-slate-500 hover:text-slate-300" : "text-slate-300 hover:text-slate-500"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Row number */}
      <div className={`w-8 shrink-0 text-center text-xs tabular-nums border-r flex items-center justify-center ${isPhase ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-400"}`}>
        {rowNumber}
      </div>

      {/* Task Name — nesting guides + expand chevron */}
      <div className={`flex items-start min-w-0 flex-1 border-r px-1 py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
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

        {/* Name — wraps to multiple lines */}
        <span
          className={`text-sm break-words min-w-0 ${text} ${
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
      <div className={`w-16 shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        <span className={isPhase ? "font-bold text-white" : isSubtask ? "text-slate-400" : "text-slate-600"}>
          {node.duration_days}d
        </span>
      </div>

      {/* Start Date */}
      <div className={`w-20 shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        <span className={dateCls}>
          {formatDate(displayStartDate)}
        </span>
      </div>

      {/* End Date */}
      <div className={`w-20 shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        <span className={isPhase ? "text-red-300 font-semibold tabular-nums" : node.status === "delayed" ? "text-red-600 tabular-nums" : dateCls}>
          {formatDate(displayEndDate)}
        </span>
      </div>

      {/* Predecessors — desktop only */}
      <div className={`hidden lg:flex w-24 shrink-0 text-center text-xs border-r py-1.5 items-center justify-center px-1 ${isPhase ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}>
        <span className="break-words min-w-0">{node.predecessors || ""}</span>
      </div>

      {/* % Complete */}
      <div className={`w-16 shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        <span className={isPhase ? "font-bold text-white tabular-nums" : node.progress >= 100 ? "text-green-600 font-semibold tabular-nums" : "text-slate-600 tabular-nums"}>
          {displayProgress}%
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

      {/* Delay badge + log action */}
      <div className={`w-12 shrink-0 flex items-center justify-center border-r py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        {delayCount > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogDelay?.(node);
            }}
            className="flex items-center gap-0.5 text-red-500 hover:text-red-600 min-w-[32px] min-h-[28px] justify-center"
            title={`${delayCount} delay${delayCount !== 1 ? "s" : ""} — click to view/add`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold">{delayCount}</span>
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogDelay?.(node);
            }}
            className={`min-w-[32px] min-h-[28px] flex items-center justify-center rounded hover:bg-slate-200/50 ${isPhase ? "text-slate-500 hover:text-slate-300" : "text-slate-300 hover:text-slate-500"}`}
            title="Log Delay"
          >
            <AlertTriangle className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Assigned To — desktop only */}
      <div className={`hidden lg:flex w-24 shrink-0 text-xs py-1.5 items-center justify-center px-1 ${isPhase ? "text-slate-400" : "text-slate-500"}`}>
        <span className="break-words min-w-0 text-center">{node.assigned_to || node.responsible || ""}</span>
      </div>
    </div>
  );
}

/** Column header matching MS Project spreadsheet style */
export function TaskListHeader() {
  return (
    <div className="hidden md:flex items-center border-b-2 border-slate-300 bg-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-h-[32px] sticky top-0 z-10">
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

      {/* Delays */}
      <div className="w-12 shrink-0 text-center py-1.5 border-r border-slate-300">
        Delays
      </div>

      {/* Assigned To */}
      <div className="hidden lg:block w-24 shrink-0 text-center py-1.5">
        Assigned
      </div>
    </div>
  );
}

// ─── Mobile Card View ───────────────────────────────────────

const typeBadgeCls: Record<string, string> = {
  phase: "bg-slate-700 text-white",
  task: "bg-slate-100 text-slate-600",
  subtask: "bg-slate-50 text-slate-400",
};

interface MobileTaskCardProps {
  node: SitePlanTaskNode;
  onSelect: (task: SitePlanTaskNode) => void;
  onLogDelay?: (task: SitePlanTaskNode) => void;
  delayCount?: number;
  mobileExpanded: boolean;
  onToggleMobileExpand: () => void;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  isDragging?: boolean;
}

export function MobileTaskCard({
  node,
  onSelect,
  onLogDelay,
  delayCount = 0,
  mobileExpanded,
  onToggleMobileExpand,
  dragHandleProps,
  isDragging,
}: MobileTaskCardProps) {
  const isPhase = node.type === "phase";
  const isSubtask = node.type === "subtask";
  const person = node.assigned_to || node.responsible || null;

  // Derive display values for phases from their children
  const phaseStats = isPhase ? computePhaseStats(node.children) : null;
  const displayProgress = phaseStats?.progress ?? node.progress;
  const displayStartDate = phaseStats?.startDate ?? node.start_date;
  const displayEndDate = phaseStats?.endDate ?? node.end_date;

  // Visual indent: tasks get a left border tie to their phase; subtasks get deeper indent
  const indentCls = isPhase
    ? ""
    : isSubtask
      ? "border-l-4 border-l-slate-300 ml-6"
      : "border-l-4 border-l-slate-600";

  return (
    <div
      className={`md:hidden border-b border-slate-200 ${
        isPhase ? "bg-slate-800" : isSubtask ? "bg-slate-50" : "bg-white"
      } ${indentCls} ${isDragging ? "shadow-lg ring-2 ring-blue-400 z-50" : ""}`}
    >
      {/* Primary row — always visible */}
      <div className="flex items-center gap-2 px-3 py-3 min-h-[56px]">
        {/* Drag handle */}
        <div
          {...(dragHandleProps ?? {})}
          className={`shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-grab active:cursor-grabbing ${
            isPhase ? "text-slate-500" : "text-slate-300"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Name + status + progress */}
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => onSelect(node)}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${typeBadgeCls[node.type]}`}
            >
              {node.type === "phase" ? "PH" : node.type === "task" ? "T" : "ST"}
            </span>
            <span
              className={`text-sm break-words min-w-0 ${
                isPhase
                  ? "font-bold text-white"
                  : node.type === "subtask"
                    ? "text-slate-500"
                    : "font-medium text-slate-900"
              }`}
            >
              {node.name}
            </span>
            <span
              className={`ml-auto shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${
                isPhase
                  ? statusBadgePhase[node.status]
                  : statusBadgeCls[node.status]
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusDot[node.status]}`}
              />
              {STATUS_LABELS[node.status]}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar value={displayProgress} className="flex-1" />
            <span
              className={`text-xs font-semibold tabular-nums shrink-0 ${
                isPhase
                  ? "text-slate-300"
                  : displayProgress >= 100
                    ? "text-green-600"
                    : "text-slate-600"
              }`}
            >
              {displayProgress}%
            </span>
          </div>
        </button>

        {/* Expand/collapse toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMobileExpand();
          }}
          className={`shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${
            isPhase ? "hover:bg-slate-700" : "hover:bg-slate-100"
          }`}
          aria-label={mobileExpanded ? "Show less" : "Show more"}
        >
          {mobileExpanded ? (
            <ChevronDown
              className={`h-5 w-5 ${isPhase ? "text-slate-400" : "text-slate-400"}`}
            />
          ) : (
            <ChevronRight
              className={`h-5 w-5 ${isPhase ? "text-slate-400" : "text-slate-400"}`}
            />
          )}
        </button>
      </div>

      {/* Expanded details */}
      {mobileExpanded && (
        <div
          className={`px-3 pb-3 pt-0 space-y-2 ${
            isPhase ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {/* Dates + Duration */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 opacity-50" />
              {formatDate(displayStartDate)} – {formatDate(displayEndDate)}
            </span>
            <span className="opacity-50">·</span>
            <span>{node.duration_days}d</span>
          </div>

          {/* Responsible / Assigned */}
          {person && (
            <div className="flex items-center gap-1 text-xs">
              <User className="h-3.5 w-3.5 opacity-50" />
              <span>{person}</span>
            </div>
          )}

          {/* Predecessors */}
          {node.predecessors && (
            <div className="text-xs">
              <span className="opacity-50">Predecessors: </span>
              {node.predecessors}
            </div>
          )}

          {/* Comments */}
          {node.comments && (
            <div className="text-xs">
              <span className="opacity-50">Comments: </span>
              <span className="line-clamp-2">{node.comments}</span>
            </div>
          )}

          {/* Notes */}
          {node.notes && (
            <div className="text-xs">
              <span className="opacity-50">Notes: </span>
              <span className="line-clamp-2">{node.notes}</span>
            </div>
          )}

          {/* Delay badge */}
          {delayCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-medium">{delayCount} delay{delayCount !== 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(node)}
              className={`flex-1 text-center text-xs font-medium py-2.5 rounded-lg min-h-[44px] ${
                isPhase
                  ? "bg-slate-700 text-slate-200 active:bg-slate-600"
                  : "bg-slate-100 text-slate-700 active:bg-slate-200"
              }`}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLogDelay?.(node);
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg min-h-[44px] active:bg-red-100"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Log Delay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
