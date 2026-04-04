"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, GripVertical, AlertTriangle, Pencil, Plus, Folder } from "lucide-react";
import type { SitePlanTaskNode, TaskStatus } from "@/types/siteplan";
import { STATUS_LABELS, computeWorkProgress } from "@/types/siteplan";
import type { DraggableProvided } from "@hello-pangea/dnd";
import { ProgressBar } from "./ProgressSlider";
import {
  PHASE_ACCENT_COLORS,
  PHASE_BG_COLORS,
  STATUS_DOT_STYLES,
  STATUS_TASK_BADGE_STYLES,
  STATUS_PHASE_BADGE_STYLES,
} from "@/lib/sitePlanColors";

// ─── Column definitions ─────────────────────────────────────

export const COLUMN_DEFS: { id: string; label: string }[] = [
  { id: "dur", label: "Duration" },
  { id: "start", label: "Start" },
  { id: "finish", label: "Finish" },
  { id: "pred", label: "Predecessors" },
  { id: "pct", label: "% Complete" },
  { id: "status", label: "Status" },
  { id: "delays", label: "Delays" },
  { id: "assigned", label: "Assigned" },
];

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
  phaseIndex?: number;
  /** When true, show checkbox and suppress expand-to-edit behaviour */
  editMode?: boolean;
  isChecked?: boolean;
  onCheck?: (task: SitePlanTaskNode, checked: boolean) => void;
  hiddenColumns?: Set<string>;
  /** Highlight the row with a yellow background (used to show cascade delay impact) */
  isHighlighted?: boolean;
  /** Opens CreateTaskSheet to insert a sibling row immediately below this one */
  onAddBelow?: (node: SitePlanTaskNode) => void;
  /** Opens CreateTaskSheet to insert a child row under this task */
  onAddSubtask?: (node: SitePlanTaskNode) => void;
  /** Whether this row is currently selected */
  isSelected?: boolean;
  selectedRowIds?: Set<string>;
  onRowNumberClick?: (node: SitePlanTaskNode, rowNumber: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onUpdateTask?: (taskId: string, updates: Partial<SitePlanTaskNode>) => void;
  columnWidths?: Record<string, number>;
  onHoverStart?: (taskId: string) => void;
  onHoverEnd?: () => void;
  isLastVisibleRow?: boolean;
  onEnterAddBelow?: () => void;
}

// Distinctive backgrounds per type (phase bg is computed dynamically from phaseIndex)
const rowBg: Record<string, string> = {
  task: "bg-white",
  subtask: "bg-slate-50",
  milestone: "bg-white",
};

const rowText: Record<string, string> = {
  phase: "text-white",
  task: "text-slate-900",
  subtask: "text-slate-500",
  milestone: "text-slate-900",
};

// Aliases for local readability
const statusDot = STATUS_DOT_STYLES;
const statusBadgeCls = STATUS_TASK_BADGE_STYLES;
const statusBadgePhase = STATUS_PHASE_BADGE_STYLES;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

/**
 * Collect all leaf descendants (nodes with no children) from a subtree.
 * For a phase→task→subtask hierarchy this ensures progress is always
 * derived from actual work items, not intermediate container rows.
 */
function collectLeaves(nodes: SitePlanTaskNode[]): SitePlanTaskNode[] {
  const leaves: SitePlanTaskNode[] = [];
  const walk = (ns: SitePlanTaskNode[]) => {
    for (const n of ns) {
      // Phases are containers — never count them as work items
      if (n.type === "phase") {
        walk(n.children);
      } else if (n.children.length === 0) {
        leaves.push(n);
      } else {
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return leaves;
}

/**
 * Compute phase-level stats by walking the full subtree.
 * Progress = average of all leaf-node progress values.
 * Date range = earliest start → latest end across all leaves.
 * Status is derived from the computed progress.
 */
function computePhaseStats(children: SitePlanTaskNode[]) {
  if (children.length === 0) return null;

  // Use leaf tasks so progress rolls up through the full hierarchy
  const leaves = collectLeaves(children);
  // Fall back to direct children if somehow there are no leaves
  const sources = leaves.length > 0 ? leaves : children;

  // Use canonical computeWorkProgress (excludes any residual phase nodes)
  const progress = computeWorkProgress(sources);
  const startDate = sources.reduce(
    (min, c) => (c.start_date < min ? c.start_date : min),
    sources[0].start_date
  );
  const endDate = sources.reduce(
    (max, c) => (c.end_date > max ? c.end_date : max),
    sources[0].end_date
  );

  // Derive status from computed progress
  const status: TaskStatus =
    progress >= 100
      ? "completed"
      : progress > 0
        ? "in_progress"
        : "not_started";

  return { progress, startDate, endDate, status };
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
  phaseIndex = 0,
  editMode = false,
  isChecked = false,
  onCheck,
  hiddenColumns = new Set(),
  isHighlighted = false,
  onAddBelow,
  onAddSubtask,
  isSelected = false,
  selectedRowIds = new Set(),
  onRowNumberClick,
  onUpdateTask,
  columnWidths,
  onHoverStart,
  onHoverEnd,
  isLastVisibleRow = false,
  onEnterAddBelow,
}: TaskRowProps) {
  const hasChildren = node.children.length > 0;
  const isPhase = node.type === "phase";
  const isSubtask = node.type === "subtask";
  // Compute indent level based on task type (subtasks get extra indent for visual hierarchy)
  const indentLevel = node.type === "phase" ? 0 : node.type === "task" ? 1 : node.type === "subtask" ? 3 : 2;

  // For phases, derive display values from children so the phase reflects actual child data
  const phaseStats = isPhase ? computePhaseStats(node.children) : null;
  const displayProgress = phaseStats?.progress ?? node.progress;
  const displayStartDate = phaseStats?.startDate ?? node.start_date;
  const displayEndDate = phaseStats?.endDate ?? node.end_date;
  const displayStatus = phaseStats?.status ?? node.status;

  const phaseBg = PHASE_BG_COLORS[phaseIndex % PHASE_BG_COLORS.length];
  const isRowSelected = isSelected || selectedRowIds.has(node.id);
  const bg = isDragging ? "bg-blue-50" : isHighlighted ? "bg-yellow-100" : isRowSelected ? "bg-blue-50" : isPhase ? phaseBg : rowBg[node.type] ?? "bg-white";
  const text = isDragging ? "text-slate-900" : isHighlighted ? "text-slate-900" : rowText[node.type];
  const borderColor = isPhase ? "border-white/10" : isRowSelected ? "border-blue-100" : "border-slate-200";
  const dateCls = isPhase
    ? "text-white/70 tabular-nums"
    : "text-slate-500 tabular-nums";

  // Phase accent border color
  const accentBorder = isPhase
    ? `border-l-[3px] ${PHASE_ACCENT_COLORS[phaseIndex % PHASE_ACCENT_COLORS.length]}`
    : "";

  // Phase rows get sticky positioning so they stay visible during scrolling
  const stickyStyle = isPhase
    ? "sticky top-[32px] z-[5]"
    : "";

  const show = (col: string) => !hiddenColumns.has(col);
  const colW = (col: string, fallback: number) => columnWidths?.[col] ?? fallback;
  const editableOrder = ["name", "start", "finish", "dur", "pct", "assigned"] as const;
  const [activeCell, setActiveCell] = useState<(typeof editableOrder)[number] | null>(null);
  const [editValue, setEditValue] = useState("");

  const canEdit = (col: (typeof editableOrder)[number]) => {
    if (isPhase && (col === "start" || col === "finish" || col === "dur" || col === "pct")) return false;
    return true;
  };
  const getCellValue = (col: (typeof editableOrder)[number]) => {
    if (col === "name") return node.name;
    if (col === "start") return displayStartDate;
    if (col === "finish") return displayEndDate;
    if (col === "dur") return String(node.duration_days);
    if (col === "pct") return String(displayProgress);
    return node.assigned_to || node.responsible || "";
  };
  const startEdit = (col: (typeof editableOrder)[number]) => {
    if (!canEdit(col)) return;
    setActiveCell(col);
    setEditValue(getCellValue(col));
  };
  const moveCell = (col: (typeof editableOrder)[number], reverse = false) => {
    const idx = editableOrder.indexOf(col);
    const nextIdx = reverse ? idx - 1 : idx + 1;
    const next = editableOrder[nextIdx];
    if (next && canEdit(next)) startEdit(next);
    else setActiveCell(null);
  };
  const commitEdit = (col: (typeof editableOrder)[number], moveNext = false, reverse = false) => {
    if (!onUpdateTask) {
      setActiveCell(null);
      return;
    }
    const trimmed = editValue.trim();
    if (col === "name" && trimmed && trimmed !== node.name) onUpdateTask(node.id, { name: trimmed });
    if (col === "start" && trimmed && trimmed !== node.start_date) onUpdateTask(node.id, { start_date: trimmed });
    if (col === "finish" && trimmed && trimmed !== node.end_date) onUpdateTask(node.id, { end_date: trimmed });
    if (col === "dur") {
      const days = Number(trimmed);
      if (!Number.isNaN(days) && days > 0 && days !== node.duration_days) {
        const start = new Date(node.start_date);
        const end = new Date(start);
        end.setDate(start.getDate() + days - 1);
        onUpdateTask(node.id, { end_date: end.toISOString().slice(0, 10) });
      }
    }
    if (col === "pct") {
      const pct = Number(trimmed);
      if (!Number.isNaN(pct) && pct >= 0 && pct <= 100 && pct !== node.progress) onUpdateTask(node.id, { progress: Math.round(pct) });
    }
    if (col === "assigned" && trimmed !== (node.assigned_to || node.responsible || "")) onUpdateTask(node.id, { assigned_to: trimmed || null });

    if (moveNext) moveCell(col, reverse);
    else setActiveCell(null);
  };

  const handlePlusClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onAddBelow?.(node);
  };

  return (
    <div
      className={`group hidden md:flex items-stretch border-b cursor-pointer transition-colors min-h-[40px] ${bg} ${borderColor} ${accentBorder} ${stickyStyle} ${isRowSelected && !isPhase ? "border-l-2 border-l-blue-500" : ""} ${isDragging ? "shadow-lg ring-2 ring-blue-400 z-50" : ""} ${!isPhase && !isDragging ? "hover:bg-slate-100" : ""}`}
      onClick={(e) => {
        if (editMode && e.shiftKey) {
          onCheck?.(node, !isChecked);
        } else {
          onSelect(node);
        }
      }}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? expanded : undefined}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (isLastVisibleRow && onEnterAddBelow) {
            e.preventDefault();
            onEnterAddBelow();
            return;
          }
          onSelect(node);
        } else if (e.key === " ") {
          e.preventDefault();
          if (hasChildren) {
            onToggle();
          } else {
            onSelect(node);
          }
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const rows = Array.from(document.querySelectorAll('[role="treeitem"]'));
          const idx = rows.indexOf(e.currentTarget as Element);
          const next = e.key === "ArrowDown" ? rows[idx + 1] : rows[idx - 1];
          (next as HTMLElement)?.focus();
        }
      }}
      onMouseEnter={() => onHoverStart?.(node.id)}
      onMouseLeave={() => onHoverEnd?.()}
    >
      {/* Checkbox (edit mode) or Drag handle */}
      {editMode ? (
        <div
          className={`w-7 shrink-0 flex items-center justify-center`}
          onClick={(e) => { e.stopPropagation(); onCheck?.(node, !isChecked); }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => { e.stopPropagation(); onCheck?.(node, e.target.checked); }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-slate-400 accent-blue-600 cursor-pointer"
          />
        </div>
      ) : (
        <div
          {...(dragHandleProps ?? {})}
          className={`w-7 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing self-center ${isPhase ? "text-white/40 hover:text-white/70" : "text-slate-300 hover:text-slate-500"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      )}

      {/* WBS code */}
      <button
        className={`sticky left-0 z-[4] w-10 shrink-0 text-center text-[10px] tabular-nums border-r flex items-center justify-center ${isPhase ? "border-slate-700 text-slate-300 bg-slate-800" : isRowSelected ? "border-blue-200 text-blue-700 bg-blue-50" : "border-slate-200 text-slate-400 bg-white"}`}
        onClick={(e) => {
          e.stopPropagation();
          onRowNumberClick?.(node, rowNumber, e);
        }}
      >
        {rowNumber}
      </button>

      {/* Task Name — nesting guides + expand chevron */}
      <div
        className={`flex items-start min-w-[120px] border-r px-1 py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}
        style={{ width: colW("name", 300) }}
        onClick={(e) => { e.stopPropagation(); startEdit("name"); }}
      >
        {/* Vertical nesting guide lines */}
        <NestingGuides depth={indentLevel} />

        <div style={{ width: `${indentLevel * 20}px` }} className="shrink-0" />
        {/* Expand/collapse or milestone/task type icon */}
        {node.type === "milestone" ? (
          <span
            className="w-5 shrink-0 mr-1 flex items-center justify-center text-amber-500 text-xs leading-none"
            aria-label="Milestone"
          >
            ◆
          </span>
        ) : isPhase ? (
          <Folder className={`h-3.5 w-3.5 shrink-0 mr-1 mt-0.5 ${isPhase ? "text-white/80" : "text-slate-500"}`} />
        ) : hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`p-0.5 rounded min-w-[20px] min-h-[20px] flex items-center justify-center shrink-0 mr-1 ${isPhase ? "hover:bg-white/10" : "hover:bg-slate-200"}`}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className={`h-3.5 w-3.5 ${isPhase ? "text-white/70" : "text-slate-500"}`} />
            ) : (
              <ChevronRight className={`h-3.5 w-3.5 ${isPhase ? "text-white/70" : "text-slate-500"}`} />
            )}
          </button>
        ) : node.type === "task" ? (
          <span className={`w-5 shrink-0 mr-1 text-xs ${isPhase ? "text-white/80" : "text-slate-500"}`}>-</span>
        ) : (
          <span className="w-5 shrink-0 mr-1" />
        )}

        {/* Name — inline editable */}
        {activeCell === "name" ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => commitEdit("name")}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitEdit("name", true); }
              else if (e.key === "Tab") { e.preventDefault(); commitEdit("name", true, e.shiftKey); }
              else if (e.key === "Escape") { e.preventDefault(); setActiveCell(null); }
            }}
            className="w-full min-w-0 text-xs border border-blue-300 rounded px-1 py-0.5"
          />
        ) : (
          <span
            className={`break-words min-w-0 ${text} ${
              isPhase
                ? "font-bold text-sm tracking-wide uppercase"
                : isSubtask
                  ? "text-xs font-light text-slate-400"
                  : "text-xs font-medium"
            }`}
          >
            {node.name}
          </span>
        )}

        {/* Phase inline mini progress bar */}
        {isPhase && (
          <div className="ml-2 flex items-center gap-1.5 shrink-0 self-center">
            <div className="w-16 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/75 transition-all"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-white/60 tabular-nums">{displayProgress}%</span>
          </div>
        )}

        {/* Mobile status dot — always visible */}
        <span
          className={`ml-auto shrink-0 md:hidden w-2.5 h-2.5 rounded-full ${statusDot[node.status]}`}
          title={STATUS_LABELS[node.status]}
        />

        {/* Desktop row-level add action — visible on hover */}
        {!editMode && (onAddBelow || onAddSubtask) && (
          <div className="relative shrink-0 self-center hidden md:block ml-1">
            <button
              onClick={handlePlusClick}
              className={`rounded p-0.5 flex items-center justify-center min-w-[20px] min-h-[20px] transition-opacity ${isPhase ? "text-white/50 hover:text-white hover:bg-white/15" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"} opacity-0 group-hover:opacity-100 focus:opacity-100`}
              aria-label="Add task"
              title="Add task below"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Duration */}
      {show("dur") && (
        <div
          className={`shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`}
          style={{ width: colW("dur", 90) }}
          onClick={(e) => { e.stopPropagation(); startEdit("dur"); }}
        >
          {activeCell === "dur" ? <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => commitEdit("dur")} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitEdit("dur", true); } else if (e.key === "Tab") { e.preventDefault(); commitEdit("dur", true, e.shiftKey); } else if (e.key === "Escape") { e.preventDefault(); setActiveCell(null); } }} className="w-[64px] text-xs border border-blue-300 rounded px-1 py-0.5 text-center" /> : (
          <span className={isPhase ? "font-bold text-white" : isSubtask ? "text-slate-400" : "text-slate-600"}>
            {node.duration_days}d
          </span>
          )}
        </div>
      )}

      {/* Start Date */}
      {show("start") && (
        <div className={`shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`} style={{ width: colW("start", 110) }} onClick={(e) => { e.stopPropagation(); startEdit("start"); }}>
          {activeCell === "start" ? <input type="date" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => commitEdit("start")} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitEdit("start", true); } else if (e.key === "Tab") { e.preventDefault(); commitEdit("start", true, e.shiftKey); } else if (e.key === "Escape") { e.preventDefault(); setActiveCell(null); } }} className="w-[108px] text-xs border border-blue-300 rounded px-1 py-0.5" /> : <span className={dateCls}>{formatDate(displayStartDate)}</span>}
        </div>
      )}

      {/* End Date */}
      {show("finish") && (
        <div className={`shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`} style={{ width: colW("finish", 110) }} onClick={(e) => { e.stopPropagation(); startEdit("finish"); }}>
          {activeCell === "finish" ? <input type="date" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => commitEdit("finish")} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitEdit("finish", true); } else if (e.key === "Tab") { e.preventDefault(); commitEdit("finish", true, e.shiftKey); } else if (e.key === "Escape") { e.preventDefault(); setActiveCell(null); } }} className="w-[108px] text-xs border border-blue-300 rounded px-1 py-0.5" /> : <span className={isPhase ? "text-white/80 font-semibold tabular-nums" : node.status === "delayed" ? "text-red-600 tabular-nums" : dateCls}>{formatDate(displayEndDate)}</span>}
        </div>
      )}

      {/* Predecessors — desktop only */}
      {show("pred") && (
        <div className={`hidden lg:flex shrink-0 text-center text-xs border-r py-1.5 items-center justify-center px-1 ${isPhase ? "border-white/10 text-white/60" : "border-slate-200 text-slate-500"}`} style={{ width: colW("pred", 120) }}>
          <span className="break-words min-w-0">{node.predecessors || ""}</span>
        </div>
      )}

      {/* % Complete */}
      {show("pct") && (
        <div className={`shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`} style={{ width: colW("pct", 90) }} onClick={(e) => { e.stopPropagation(); startEdit("pct"); }}>
          {activeCell === "pct" ? <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => commitEdit("pct")} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitEdit("pct", true); } else if (e.key === "Tab") { e.preventDefault(); commitEdit("pct", true, e.shiftKey); } else if (e.key === "Escape") { e.preventDefault(); setActiveCell(null); } }} className="w-[64px] text-xs border border-blue-300 rounded px-1 py-0.5 text-center" /> : (
          <span className={isPhase ? "font-bold text-white tabular-nums" : node.progress >= 100 ? "text-green-600 font-semibold tabular-nums" : "text-slate-600 tabular-nums"}>
            {displayProgress}%
          </span>
          )}
        </div>
      )}

      {/* Status badge — visible on lg+ as a pill, dot on mobile */}
      {show("status") && (
        <div className={`hidden lg:flex shrink-0 items-center justify-center border-r py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`} style={{ width: colW("status", 120) }}>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${isPhase ? statusBadgePhase[displayStatus] : statusBadgeCls[node.status]}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[displayStatus]}`} />
            {STATUS_LABELS[displayStatus]}
          </span>
        </div>
      )}

      {/* Delay badge + log action */}
      {show("delays") && (
        <div className={`shrink-0 flex items-center justify-center border-r py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`} style={{ width: colW("delays", 80) }}>
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
              className={`min-w-[32px] min-h-[28px] flex items-center justify-center rounded ${isPhase ? "text-white/40 hover:text-white/70 hover:bg-white/10" : "text-slate-300 hover:text-slate-500 hover:bg-slate-200/50"}`}
              title="Log Delay"
            >
              <AlertTriangle className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Assigned To — desktop only */}
      {show("assigned") && (
        <div className={`hidden lg:flex shrink-0 text-xs py-1.5 items-center justify-center px-1 ${isPhase ? "text-white/60" : "text-slate-500"}`} style={{ width: colW("assigned", 140) }} onClick={(e) => { e.stopPropagation(); startEdit("assigned"); }}>
          {activeCell === "assigned" ? <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => commitEdit("assigned")} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitEdit("assigned", true); } else if (e.key === "Tab") { e.preventDefault(); commitEdit("assigned", true, e.shiftKey); } else if (e.key === "Escape") { e.preventDefault(); setActiveCell(null); } }} className="w-full text-xs border border-blue-300 rounded px-1 py-0.5" /> : <span className="break-words min-w-0 text-center">{node.assigned_to || node.responsible || ""}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Card View ───────────────────────────────────────

interface MobileTaskCardProps {
  node: SitePlanTaskNode;
  onSelect: (task: SitePlanTaskNode) => void;
  onLogDelay?: (task: SitePlanTaskNode) => void;
  onProgressTap?: (task: SitePlanTaskNode) => void;
  delayCount?: number;
  mobileExpanded: boolean;
  onToggleMobileExpand: () => void;
  phaseIndex?: number;
}

export function MobileTaskCard({
  node,
  onSelect,
  onLogDelay,
  onProgressTap,
  delayCount = 0,
  mobileExpanded,
  onToggleMobileExpand,
  phaseIndex = 0,
}: MobileTaskCardProps) {
  const isPhase = node.type === "phase";
  const person = node.assigned_to || node.responsible || null;

  // Derive display values for phases from their children
  const phaseStats = isPhase ? computePhaseStats(node.children) : null;
  const displayProgress = phaseStats?.progress ?? node.progress;
  const displayStartDate = phaseStats?.startDate ?? node.start_date;
  const displayEndDate = phaseStats?.endDate ?? node.end_date;
  const displayStatus = phaseStats?.status ?? node.status;
  const phaseDotColors = ["bg-indigo-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500"];
  const mobileStatusPill: Record<TaskStatus, string> = {
    not_started: "bg-slate-100 text-slate-600",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    delayed: "bg-red-100 text-red-700",
    on_hold: "bg-amber-100 text-amber-700",
  };
  const mobileStatusLabel: Record<TaskStatus, string> = {
    not_started: "Not started",
    in_progress: "In progress",
    completed: "Completed",
    delayed: "Delayed",
    on_hold: "On hold",
  };

  return (
    <div
      className="md:hidden border-b border-slate-200 bg-white"
    >
      <div className="px-3 py-2.5 min-h-[72px]">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${phaseDotColors[phaseIndex % phaseDotColors.length]}`}
            aria-hidden
          />
          <button
            className="min-w-0 flex-1 text-left"
            onClick={() => onSelect(node)}
          >
            <span className={`block truncate text-sm ${isPhase ? "font-semibold text-slate-900" : "font-medium text-slate-900"}`}>
              {node.name}
            </span>
          </button>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${mobileStatusPill[displayStatus]}`}
          >
            {mobileStatusLabel[displayStatus]}
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>{formatDate(displayStartDate)} → {formatDate(displayEndDate)}</span>
          <span className="truncate">{person || "Unassigned"}</span>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onProgressTap?.(node);
            }}
            className="flex min-h-[44px] flex-1 items-center gap-2 rounded-md px-1"
            aria-label="Open progress"
          >
            <ProgressBar value={displayProgress} className="flex-1" />
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
              {displayProgress}%
            </span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMobileExpand();
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white"
            aria-label={mobileExpanded ? "Collapse actions" : "Expand actions"}
          >
            <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${mobileExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {mobileExpanded && (
          <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</p>
              <p className="mt-0.5 text-xs text-slate-700">{node.notes?.trim() ? node.notes : "No notes added."}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLogDelay?.(node);
                }}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md bg-red-50 px-3 text-xs font-medium text-red-700"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Delay log
                {delayCount > 0 ? ` (${delayCount})` : ""}
              </button>
              <button
                onClick={() => onSelect(node)}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md bg-slate-100 px-3 text-xs font-medium text-slate-700"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
