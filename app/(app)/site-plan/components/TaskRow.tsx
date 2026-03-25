"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronRight, ChevronDown, GripVertical, Calendar, User, AlertTriangle, BarChart2, Pencil, Columns, Plus } from "lucide-react";
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
  const bg = isDragging ? "bg-blue-50" : isHighlighted ? "bg-yellow-100" : isPhase ? phaseBg : rowBg[node.type] ?? "bg-white";
  const text = isDragging ? "text-slate-900" : isHighlighted ? "text-slate-900" : rowText[node.type];
  const borderColor = isPhase ? "border-white/10" : "border-slate-200";
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

  // Row-level add menu (desktop only)
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (plusButtonRef.current && !plusButtonRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddMenu]);

  const handlePlusClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (plusButtonRef.current) {
      const rect = plusButtonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 2, left: rect.left });
    }
    setShowAddMenu((v) => !v);
  };

  return (
    <div
      className={`group hidden md:flex items-stretch border-b cursor-pointer transition-colors min-h-[40px] ${bg} ${borderColor} ${accentBorder} ${stickyStyle} ${isDragging ? "shadow-lg ring-2 ring-blue-400 z-50" : ""} ${!isPhase && !isDragging ? "hover:bg-slate-100" : ""}`}
      onClick={(e) => {
        if (editMode && e.shiftKey) {
          onCheck?.(node, !isChecked);
        } else {
          onSelect(node);
        }
      }}
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
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
      <div className={`w-8 shrink-0 text-center text-[10px] tabular-nums border-r flex items-center justify-center ${isPhase ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-400"}`}>
        {node.wbs_code || rowNumber}
      </div>

      {/* Task Name — nesting guides + expand chevron */}
      <div className={`flex items-start min-w-[80px] flex-1 border-r px-1 py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
        {/* Vertical nesting guide lines */}
        <NestingGuides depth={indentLevel} />

        {/* Expand/collapse or milestone diamond */}
        {node.type === "milestone" ? (
          <span
            className="w-5 shrink-0 mr-1 flex items-center justify-center text-amber-500 text-xs leading-none"
            aria-label="Milestone"
          >
            ◆
          </span>
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
        ) : (
          <span className="w-5 shrink-0 mr-1" />
        )}

        {/* Name — wraps to multiple lines */}
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
              ref={plusButtonRef}
              onClick={handlePlusClick}
              className={`rounded p-0.5 flex items-center justify-center min-w-[20px] min-h-[20px] transition-opacity ${isPhase ? "text-white/50 hover:text-white hover:bg-white/15" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"} ${showAddMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}`}
              aria-label="Add task"
              title="Add task…"
            >
              <Plus className="h-3 w-3" />
            </button>

            {showAddMenu && dropdownPos && (
              <div
                style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left }}
                className="z-[9999] bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]"
              >
                {onAddBelow && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddMenu(false);
                      onAddBelow(node);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left"
                  >
                    Add task below
                  </button>
                )}
                {onAddSubtask && node.type !== "subtask" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddMenu(false);
                      onAddSubtask(node);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left"
                  >
                    Add subtask
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Duration */}
      {show("dur") && (
        <div className={`w-16 shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
          <span className={isPhase ? "font-bold text-white" : isSubtask ? "text-slate-400" : "text-slate-600"}>
            {node.duration_days}d
          </span>
        </div>
      )}

      {/* Start Date */}
      {show("start") && (
        <div className={`w-20 shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
          <span className={dateCls}>
            {formatDate(displayStartDate)}
          </span>
        </div>
      )}

      {/* End Date */}
      {show("finish") && (
        <div className={`w-20 shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
          <span className={isPhase ? "text-white/80 font-semibold tabular-nums" : node.status === "delayed" ? "text-red-600 tabular-nums" : dateCls}>
            {formatDate(displayEndDate)}
          </span>
        </div>
      )}

      {/* Predecessors — desktop only */}
      {show("pred") && (
        <div className={`hidden lg:flex w-24 shrink-0 text-center text-xs border-r py-1.5 items-center justify-center px-1 ${isPhase ? "border-white/10 text-white/60" : "border-slate-200 text-slate-500"}`}>
          <span className="break-words min-w-0">{node.predecessors || ""}</span>
        </div>
      )}

      {/* % Complete */}
      {show("pct") && (
        <div className={`w-16 shrink-0 text-center text-xs border-r py-1.5 flex items-center justify-center ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
          <span className={isPhase ? "font-bold text-white tabular-nums" : node.progress >= 100 ? "text-green-600 font-semibold tabular-nums" : "text-slate-600 tabular-nums"}>
            {displayProgress}%
          </span>
        </div>
      )}

      {/* Status badge — visible on lg+ as a pill, dot on mobile */}
      {show("status") && (
        <div className={`hidden lg:flex w-24 shrink-0 items-center justify-center border-r py-1.5 ${isPhase ? "border-slate-700" : "border-slate-200"}`}>
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
        <div className={`hidden lg:flex w-24 shrink-0 text-xs py-1.5 items-center justify-center px-1 ${isPhase ? "text-white/60" : "text-slate-500"}`}>
          <span className="break-words min-w-0 text-center">{node.assigned_to || node.responsible || ""}</span>
        </div>
      )}
    </div>
  );
}

// ─── Column visibility context menu ─────────────────────────

function ColumnMenu({
  hiddenColumns,
  onToggleColumn,
  onClose,
}: {
  hiddenColumns: Set<string>;
  onToggleColumn: (col: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[180px]">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 mb-1">
          Show / Hide Columns
        </div>
        {COLUMN_DEFS.map((col) => (
          <button
            key={col.id}
            onClick={() => onToggleColumn(col.id)}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded"
          >
            <span
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                !hiddenColumns.has(col.id)
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-slate-300"
              }`}
            >
              {!hiddenColumns.has(col.id) && (
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {col.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** Column header matching MS Project spreadsheet style */
export function TaskListHeader({
  hiddenColumns = new Set(),
  onToggleColumn,
}: {
  hiddenColumns?: Set<string>;
  onToggleColumn?: (col: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const show = (col: string) => !hiddenColumns.has(col);

  // Click a column header to hide it; show tooltip hint
  const handleColClick = (col: string) => {
    onToggleColumn?.(col);
  };

  const handleContextMenu = (e: React.MouseEvent, col: string) => {
    e.preventDefault();
    // Right-click opens the full column menu
    setShowMenu(true);
    void col;
  };

  const colHeaderCls = "shrink-0 text-center py-1.5 border-r border-slate-300 cursor-pointer select-none hover:bg-slate-200 transition-colors group relative";

  return (
    <div
      className="hidden md:flex items-center border-b-2 border-slate-300 bg-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-h-[32px] sticky top-0 z-10"
      onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
    >
      {/* Drag handle spacer */}
      <div className="w-7 shrink-0" />

      {/* Row # */}
      <div className="w-8 shrink-0 text-center border-r border-slate-300 py-1.5">
        #
      </div>

      {/* Task Name — not hideable */}
      <div className="flex-1 min-w-[80px] px-2 py-1.5 border-r border-slate-300">
        Task Name
      </div>

      {/* Duration */}
      {show("dur") && (
        <div
          className={`w-16 ${colHeaderCls}`}
          onClick={() => handleColClick("dur")}
          onContextMenu={(e) => handleContextMenu(e, "dur")}
          title="Click to hide"
        >
          Dur.
        </div>
      )}

      {/* Start Date */}
      {show("start") && (
        <div
          className={`w-20 ${colHeaderCls}`}
          onClick={() => handleColClick("start")}
          onContextMenu={(e) => handleContextMenu(e, "start")}
          title="Click to hide"
        >
          Start
        </div>
      )}

      {/* End Date */}
      {show("finish") && (
        <div
          className={`w-20 ${colHeaderCls}`}
          onClick={() => handleColClick("finish")}
          onContextMenu={(e) => handleContextMenu(e, "finish")}
          title="Click to hide"
        >
          Finish
        </div>
      )}

      {/* Predecessors */}
      {show("pred") && (
        <div
          className={`hidden lg:block w-24 ${colHeaderCls}`}
          onClick={() => handleColClick("pred")}
          onContextMenu={(e) => handleContextMenu(e, "pred")}
          title="Click to hide"
        >
          Pred.
        </div>
      )}

      {/* % Complete */}
      {show("pct") && (
        <div
          className={`w-16 ${colHeaderCls}`}
          onClick={() => handleColClick("pct")}
          onContextMenu={(e) => handleContextMenu(e, "pct")}
          title="Click to hide"
        >
          %
        </div>
      )}

      {/* Status */}
      {show("status") && (
        <div
          className={`hidden lg:block w-24 ${colHeaderCls}`}
          onClick={() => handleColClick("status")}
          onContextMenu={(e) => handleContextMenu(e, "status")}
          title="Click to hide"
        >
          Status
        </div>
      )}

      {/* Delays */}
      {show("delays") && (
        <div
          className={`w-12 ${colHeaderCls}`}
          onClick={() => handleColClick("delays")}
          onContextMenu={(e) => handleContextMenu(e, "delays")}
          title="Click to hide"
        >
          Delays
        </div>
      )}

      {/* Assigned To */}
      {show("assigned") && (
        <div
          className={`hidden lg:block w-24 ${colHeaderCls} border-r-0`}
          onClick={() => handleColClick("assigned")}
          onContextMenu={(e) => handleContextMenu(e, "assigned")}
          title="Click to hide"
        >
          Assigned
        </div>
      )}

      {/* Column visibility toggle button */}
      <div className="relative shrink-0 ml-auto">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          title="Show/hide columns"
          className="p-1.5 hover:bg-slate-200 rounded flex items-center justify-center text-slate-400 hover:text-slate-600"
        >
          <Columns className="h-3.5 w-3.5" />
        </button>
        {showMenu && (
          <ColumnMenu
            hiddenColumns={hiddenColumns}
            onToggleColumn={(col) => { onToggleColumn?.(col); }}
            onClose={() => setShowMenu(false)}
          />
        )}
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
  onUpdateProgress?: (task: SitePlanTaskNode) => void;
  delayCount?: number;
  mobileExpanded: boolean;
  onToggleMobileExpand: () => void;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  isDragging?: boolean;
  isHighlighted?: boolean;
}

export function MobileTaskCard({
  node,
  onSelect,
  onLogDelay,
  onUpdateProgress,
  delayCount = 0,
  mobileExpanded,
  onToggleMobileExpand,
  dragHandleProps,
  isDragging,
  isHighlighted = false,
}: MobileTaskCardProps) {
  // Swipe-left gesture state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeThreshold = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    // Only detect horizontal swipe
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) {
      setSwipeOffset(Math.max(dx, -150));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset < -swipeThreshold) {
      setSwipeOffset(-150); // Snap open
    } else {
      setSwipeOffset(0); // Snap closed
    }
    touchStartRef.current = null;
  }, [swipeOffset]);
  const isPhase = node.type === "phase";
  const isSubtask = node.type === "subtask";
  const person = node.assigned_to || node.responsible || null;

  // Derive display values for phases from their children
  const phaseStats = isPhase ? computePhaseStats(node.children) : null;
  const displayProgress = phaseStats?.progress ?? node.progress;
  const displayStartDate = phaseStats?.startDate ?? node.start_date;
  const displayEndDate = phaseStats?.endDate ?? node.end_date;
  const displayStatus = phaseStats?.status ?? node.status;

  // Visual indent: tasks get a left border tie to their phase; subtasks get deeper indent
  const indentCls = isPhase
    ? ""
    : isSubtask
      ? "border-l-4 border-l-slate-300 ml-6"
      : "border-l-4 border-l-slate-600";

  return (
    <div
      className={`md:hidden border-b border-slate-200 relative overflow-hidden ${
        isDragging ? "bg-white" : isHighlighted ? "bg-yellow-100" : isPhase ? "bg-slate-800" : isSubtask ? "bg-slate-50" : "bg-white"
      } ${indentCls} ${isDragging ? "shadow-lg ring-2 ring-blue-400 z-50" : ""}`}
    >
      {/* Swipe-revealed quick actions */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch z-0">
        <button
          onClick={() => { onLogDelay?.(node); setSwipeOffset(0); }}
          className="w-[50px] bg-red-500 text-white flex flex-col items-center justify-center text-[10px] font-medium gap-0.5"
        >
          <AlertTriangle className="h-4 w-4" />
          Delay
        </button>
        <button
          onClick={() => { onSelect(node); setSwipeOffset(0); }}
          className="w-[50px] bg-blue-500 text-white flex flex-col items-center justify-center text-[10px] font-medium gap-0.5"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={() => { onUpdateProgress?.(node); setSwipeOffset(0); }}
          className="w-[50px] bg-emerald-500 text-white flex flex-col items-center justify-center text-[10px] font-medium gap-0.5"
        >
          <BarChart2 className="h-4 w-4" />
          Progress
        </button>
      </div>
      <div
        className={`relative z-[1] ${isPhase ? "bg-slate-800" : isSubtask ? "bg-slate-50" : "bg-white"}`}
        style={{ transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 || swipeOffset === -150 ? "transform 0.2s ease-out" : "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
                  ? statusBadgePhase[displayStatus]
                  : statusBadgeCls[node.status]
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusDot[displayStatus]}`}
              />
              {STATUS_LABELS[displayStatus]}
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
      </div>{/* end swipe wrapper */}
    </div>
  );
}
