"use client";

import { useState } from "react";
import {
  Undo2,
  Redo2,
  Filter,
  IndentIncrease,
  IndentDecrease,
  Link2,
  Unlink2,
  Maximize2,
  Minimize2,
  Plus,
  FileSpreadsheet,
  ChevronsUpDown,
  BarChart3,
  List,
  PieChart,
  Bookmark,
  X,
} from "lucide-react";
import type { TaskType, TaskStatus, SitePlanTaskNode } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";

// ─── Filter types ───────────────────────────────────────────

export interface TaskFilter {
  status: TaskStatus[];
  type: TaskType[];
  assignedTo: string;
  search: string;
}

export const EMPTY_FILTER: TaskFilter = {
  status: [],
  type: [],
  assignedTo: "",
  search: "",
};

export function isFilterActive(f: TaskFilter): boolean {
  return (
    f.status.length > 0 ||
    f.type.length > 0 ||
    f.assignedTo !== "" ||
    f.search !== ""
  );
}

// ─── Toolbar props ──────────────────────────────────────────

interface ToolbarProps {
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  // Expand/Collapse
  allExpanded: boolean;
  onToggleAll: () => void;

  // Selected task
  selectedTask: SitePlanTaskNode | null;

  // Indent/Outdent
  onIndent: () => void;
  onOutdent: () => void;

  // Link tasks
  onLinkTasks: () => void;
  onUnlinkTask: () => void;

  // Filter
  filter: TaskFilter;
  onFilterChange: (f: TaskFilter) => void;

  // Import
  onImport: () => void;

  // Add — single button, inserts at same indent as selected row
  onAddRow: () => void;

  // Baselines
  onSaveBaseline: () => void;
  baselineCount: number;

  // View
  currentView: "list" | "gantt" | "summary";
  onViewChange: (view: "list" | "gantt" | "summary") => void;

  // Fullscreen
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

// ─── Toolbar button ─────────────────────────────────────────

function TBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  className,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center transition-colors ${
        active ? "bg-blue-100 text-blue-600" : "text-slate-600"
      } ${className ?? ""}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-slate-200 mx-1" />;
}

// ─── Filter dropdown ────────────────────────────────────────

/** Shared filter controls used by both desktop dropdown and mobile sheet */
function FilterControls({
  filter,
  onFilterChange,
  onClose,
  mobile,
}: {
  filter: TaskFilter;
  onFilterChange: (f: TaskFilter) => void;
  onClose: () => void;
  mobile?: boolean;
}) {
  const toggleStatus = (s: TaskStatus) => {
    const next = filter.status.includes(s)
      ? filter.status.filter((x) => x !== s)
      : [...filter.status, s];
    onFilterChange({ ...filter, status: next });
  };

  const toggleType = (t: TaskType) => {
    const next = filter.type.includes(t)
      ? filter.type.filter((x) => x !== t)
      : [...filter.type, t];
    onFilterChange({ ...filter, type: next });
  };

  const btnSize = mobile ? "min-h-[44px] px-3 py-2.5 text-sm" : "px-2 py-1 text-[10px]";
  const inputCls = mobile
    ? "w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
    : "w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`font-semibold text-slate-700 ${mobile ? "text-base" : "text-xs"}`}>
          Filters
        </span>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={filter.search}
        onChange={(e) =>
          onFilterChange({ ...filter, search: e.target.value })
        }
        placeholder="Search task names..."
        className={inputCls}
      />

      {/* Status */}
      <div>
        <span className={`font-medium text-slate-500 uppercase ${mobile ? "text-xs" : "text-[10px]"}`}>
          Status
        </span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(
            ([val, label]) => (
              <button
                key={val}
                onClick={() => toggleStatus(val)}
                className={`font-medium rounded-md border ${btnSize} ${
                  filter.status.includes(val)
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Type */}
      <div>
        <span className={`font-medium text-slate-500 uppercase ${mobile ? "text-xs" : "text-[10px]"}`}>
          Type
        </span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {(["phase", "task", "subtask"] as TaskType[]).map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`font-medium rounded-md border capitalize ${btnSize} ${
                filter.type.includes(t)
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Assigned To */}
      <div>
        <span className={`font-medium text-slate-500 uppercase ${mobile ? "text-xs" : "text-[10px]"}`}>
          Assigned To
        </span>
        <input
          type="text"
          value={filter.assignedTo}
          onChange={(e) =>
            onFilterChange({ ...filter, assignedTo: e.target.value })
          }
          placeholder="Filter by person..."
          className={`${inputCls} mt-1`}
        />
      </div>

      {/* Clear */}
      {isFilterActive(filter) && (
        <button
          onClick={() => onFilterChange(EMPTY_FILTER)}
          className={`w-full text-red-600 hover:text-red-700 font-medium ${mobile ? "text-sm py-2.5 min-h-[44px]" : "text-xs py-1"}`}
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}

/** Desktop: absolute dropdown */
function FilterDropdown({
  filter,
  onFilterChange,
  onClose,
}: {
  filter: TaskFilter;
  onFilterChange: (f: TaskFilter) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-3">
      <FilterControls
        filter={filter}
        onFilterChange={onFilterChange}
        onClose={onClose}
      />
    </div>
  );
}

/** Mobile: bottom sheet */
function MobileFilterSheet({
  filter,
  onFilterChange,
  onClose,
}: {
  filter: TaskFilter;
  onFilterChange: (f: TaskFilter) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto p-4 safe-area-pb">
        <FilterControls
          filter={filter}
          onFilterChange={onFilterChange}
          onClose={onClose}
          mobile
        />
      </div>
    </>
  );
}

// ─── Main toolbar ───────────────────────────────────────────

export function SitePlanToolbar(props: ToolbarProps) {
  const {
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    allExpanded,
    onToggleAll,
    selectedTask,
    onIndent,
    onOutdent,
    onLinkTasks,
    onUnlinkTask,
    filter,
    onFilterChange,
    onImport,
    onAddRow,
    onSaveBaseline,
    baselineCount,
    currentView,
    onViewChange,
    isFullscreen,
    onToggleFullscreen,
  } = props;

  const [showFilter, setShowFilter] = useState(false);

  const canIndent =
    selectedTask !== null && selectedTask.type !== "subtask";
  const canOutdent =
    selectedTask !== null && selectedTask.type !== "phase";
  const hasSelectedPredecessors =
    selectedTask !== null && !!selectedTask.predecessors;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 overflow-x-auto">
      {/* Undo / Redo */}
      <TBtn icon={Undo2} label="Undo" onClick={onUndo} disabled={!canUndo} />
      <TBtn icon={Redo2} label="Redo" onClick={onRedo} disabled={!canRedo} />

      <Divider />

      {/* Expand/Collapse */}
      <TBtn
        icon={ChevronsUpDown}
        label={allExpanded ? "Collapse All" : "Expand All"}
        onClick={onToggleAll}
      />

      {/* View toggles */}
      <div className="hidden md:flex items-center border border-slate-200 rounded-md ml-1">
        <button
          onClick={() => onViewChange("list")}
          title="List View"
          className={`p-1.5 rounded-l-md ${
            currentView === "list"
              ? "bg-blue-50 text-blue-600"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onViewChange("gantt")}
          title="Gantt View"
          className={`p-1.5 ${
            currentView === "gantt"
              ? "bg-blue-50 text-blue-600"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onViewChange("summary")}
          title="Summary View"
          className={`p-1.5 rounded-r-md ${
            currentView === "summary"
              ? "bg-blue-50 text-blue-600"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          <PieChart className="h-3.5 w-3.5" />
        </button>
      </div>

      <Divider />

      {/* Filter */}
      <div className="relative">
        <TBtn
          icon={Filter}
          label="Filter"
          onClick={() => setShowFilter(!showFilter)}
          active={isFilterActive(filter)}
        />
        {isFilterActive(filter) && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
        )}
        {/* Desktop: dropdown */}
        {showFilter && (
          <div className="hidden md:block">
            <FilterDropdown
              filter={filter}
              onFilterChange={onFilterChange}
              onClose={() => setShowFilter(false)}
            />
          </div>
        )}
      </div>
      {/* Mobile: bottom sheet filter */}
      {showFilter && (
        <MobileFilterSheet
          filter={filter}
          onFilterChange={onFilterChange}
          onClose={() => setShowFilter(false)}
        />
      )}

      <Divider />

      {/* Indent / Outdent */}
      <TBtn
        icon={IndentDecrease}
        label="Outdent (promote)"
        onClick={onOutdent}
        disabled={!canOutdent}
      />
      <TBtn
        icon={IndentIncrease}
        label="Indent (demote)"
        onClick={onIndent}
        disabled={!canIndent}
      />

      <Divider />

      {/* Link / Unlink tasks */}
      <TBtn
        icon={Link2}
        label="Link Tasks (set predecessor)"
        onClick={onLinkTasks}
        disabled={!selectedTask}
      />
      <TBtn
        icon={Unlink2}
        label="Unlink (clear predecessors)"
        onClick={onUnlinkTask}
        disabled={!hasSelectedPredecessors}
      />

      <Divider />

      {/* Import */}
      <TBtn icon={FileSpreadsheet} label="Import" onClick={onImport} />

      {/* Add Row */}
      <div className="hidden md:flex items-center gap-0.5">
        <button
          onClick={onAddRow}
          title="Add Row (same indent as selected)"
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded min-h-[28px]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Baselines */}
      <div className="hidden md:flex items-center">
        <button
          onClick={onSaveBaseline}
          title="Save Baseline"
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 rounded min-h-[28px]"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Baselines
          {baselineCount > 0 && (
            <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full ml-0.5">
              {baselineCount}
            </span>
          )}
        </button>
      </div>

      {/* Fullscreen */}
      <TBtn
        icon={isFullscreen ? Minimize2 : Maximize2}
        label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        onClick={onToggleFullscreen}
      />
    </div>
  );
}
