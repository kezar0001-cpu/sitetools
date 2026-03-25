"use client";

import { useState, useRef, useEffect, type ElementType, type RefObject, type KeyboardEvent } from "react";
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
  Download,
  ChevronsUpDown,
  Bookmark,
  Pencil,
  Check,
  X,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import type { TaskType, TaskStatus, SitePlanTaskNode } from "@/types/siteplan";
import { STATUS_LABELS } from "@/types/siteplan";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
  undoLabel?: string;
  redoLabel?: string;

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

  // Export
  onExportCsv: () => void;
  onExportMsProject: () => void;

  // Add — single button, inserts at same indent as selected row
  onAddRow: () => void;

  // Baselines
  onSaveBaseline: () => void;
  baselineCount: number;

  // Edit mode
  editMode: boolean;
  onToggleEditMode: () => void;

  // Fullscreen
  isFullscreen: boolean;
  onToggleFullscreen: () => void;

  // View toggle (desktop only)
  view?: "list" | "gantt" | "split";
  onViewChange?: (view: "list" | "gantt" | "split") => void;
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
  icon: ElementType;
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
      className={`p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors ${
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

// ─── Filter controls ────────────────────────────────────────

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
        onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
        placeholder="Search task names..."
        className={inputCls}
      />

      {/* Status */}
      <div>
        <span className={`font-medium text-slate-500 uppercase ${mobile ? "text-xs" : "text-[10px]"}`}>
          Status
        </span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([val, label]) => (
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
          ))}
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
          onChange={(e) => onFilterChange({ ...filter, assignedTo: e.target.value })}
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
      <FilterControls filter={filter} onFilterChange={onFilterChange} onClose={onClose} />
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
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto p-4 safe-area-pb">
        <FilterControls filter={filter} onFilterChange={onFilterChange} onClose={onClose} mobile />
      </div>
    </>
  );
}

// ─── Mobile More menu ────────────────────────────────────────

interface MenuItem {
  icon: ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: number;
}

/** Keyboard-accessible dropdown for secondary actions on mobile */
function MobileMoreMenu({
  items,
  onClose,
  triggerRef,
}: {
  items: MenuItem[];
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstItem = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])'
    );
    firstItem?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    const menuItems: HTMLElement[] = menuRef.current
      ? Array.from(
          menuRef.current.querySelectorAll<HTMLElement>(
            '[role="menuitem"]:not([aria-disabled="true"])'
          )
        )
      : [];
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        menuItems[(currentIndex + 1) % menuItems.length]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        menuItems[(currentIndex - 1 + menuItems.length) % menuItems.length]?.focus();
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
        break;
      case "Tab":
        onClose();
        break;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        ref={menuRef}
        role="menu"
        aria-label="More actions"
        onKeyDown={handleKeyDown}
        className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                item.onClick();
                onClose();
              }}
              disabled={item.disabled}
              aria-disabled={item.disabled}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:bg-slate-100"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Export dropdown ────────────────────────────────────────

function ExportDropdown({
  onExportCsv,
  onExportMsProject,
  onClose,
}: {
  onExportCsv: () => void;
  onExportMsProject: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
        <button
          onClick={() => { onExportCsv(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-400" />
          Export as CSV
        </button>
        <button
          onClick={() => { onExportMsProject(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4 shrink-0 text-slate-400" />
          Export as MS Project XML
        </button>
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
    undoLabel,
    redoLabel,
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
    onExportCsv,
    onExportMsProject,
    onAddRow,
    onSaveBaseline,
    baselineCount,
    editMode,
    onToggleEditMode,
    isFullscreen,
    onToggleFullscreen,
    view,
    onViewChange,
  } = props;

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [showFilter, setShowFilter] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const canIndent = selectedTask !== null;
  const canOutdent = selectedTask !== null && selectedTask.parent_id !== null;
  const hasSelectedPredecessors =
    editMode && selectedTask !== null && !!selectedTask.predecessors;

  // Items shown in the mobile More... dropdown
  const moreMenuItems: MenuItem[] = [
    { icon: Undo2, label: undoLabel ? `Undo: ${undoLabel}` : "Undo", onClick: onUndo, disabled: !canUndo },
    { icon: Redo2, label: redoLabel ? `Redo: ${redoLabel}` : "Redo", onClick: onRedo, disabled: !canRedo },
    {
      icon: ChevronsUpDown,
      label: allExpanded ? "Collapse All" : "Expand All",
      onClick: onToggleAll,
    },
    { icon: FileSpreadsheet, label: "Import", onClick: onImport },
    { icon: Download, label: "Export CSV", onClick: onExportCsv },
    { icon: Download, label: "Export MS Project XML", onClick: onExportMsProject },
    {
      icon: Bookmark,
      label: "Baselines",
      onClick: onSaveBaseline,
      badge: baselineCount,
    },
    {
      icon: editMode ? Check : Pencil,
      label: editMode ? "Done Editing" : "Edit Mode",
      onClick: onToggleEditMode,
    },
    ...(editMode
      ? [
          {
            icon: IndentDecrease,
            label: "Outdent",
            onClick: onOutdent,
            disabled: !canOutdent,
          },
          {
            icon: IndentIncrease,
            label: "Indent",
            onClick: onIndent,
            disabled: !canIndent,
          },
          {
            icon: Link2,
            label: "Link Tasks",
            onClick: onLinkTasks,
            disabled: !selectedTask,
          },
          {
            icon: Unlink2,
            label: "Unlink",
            onClick: onUnlinkTask,
            disabled: !hasSelectedPredecessors,
          },
        ]
      : []),
    {
      icon: isFullscreen ? Minimize2 : Maximize2,
      label: isFullscreen ? "Exit Fullscreen" : "Fullscreen",
      onClick: onToggleFullscreen,
    },
  ];

  // ── Mobile layout ──────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilter(!showFilter)}
              title="Filter"
              aria-pressed={isFilterActive(filter)}
              className={`p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
                isFilterActive(filter)
                  ? "bg-blue-100 text-blue-600"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Filter className="h-5 w-5" />
            </button>
            {isFilterActive(filter) && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true" />
            )}
          </div>

          {/* Add */}
          <button
            onClick={onAddRow}
            title="Add Row"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg min-h-[44px] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>

          <div className="flex-1" />

          {/* More... */}
          <div className="relative">
            <button
              ref={moreButtonRef}
              onClick={() => setShowMore(!showMore)}
              aria-haspopup="menu"
              aria-expanded={showMore}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg min-h-[44px] transition-colors ${
                showMore
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <MoreHorizontal className="h-4 w-4" />
              More
            </button>
            {showMore && (
              <MobileMoreMenu
                items={moreMenuItems}
                onClose={() => setShowMore(false)}
                triggerRef={moreButtonRef}
              />
            )}
          </div>
        </div>

        {/* Filter bottom sheet */}
        {showFilter && (
          <MobileFilterSheet
            filter={filter}
            onFilterChange={onFilterChange}
            onClose={() => setShowFilter(false)}
          />
        )}
      </>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────
  return (
    <>
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 overflow-x-auto">
        <TBtn icon={Undo2} label={undoLabel ? `Undo: ${undoLabel}` : "Undo"} onClick={onUndo} disabled={!canUndo} />
        <TBtn icon={Redo2} label={redoLabel ? `Redo: ${redoLabel}` : "Redo"} onClick={onRedo} disabled={!canRedo} />
        <Divider />
        <TBtn
          icon={ChevronsUpDown}
          label={allExpanded ? "Collapse All" : "Expand All"}
          onClick={onToggleAll}
        />

        <Divider />

        {/* Edit mode toggle */}
        <button
          onClick={onToggleEditMode}
          title={editMode ? "Exit Edit Mode" : "Edit Mode"}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md min-h-[28px] transition-colors ${
            editMode
              ? "bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          {editMode ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Done
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </>
          )}
        </button>

        {/* Indent/Outdent — always available when a task is selected */}
        <Divider />
        <TBtn
          icon={IndentDecrease}
          label="Outdent (Shift+Tab)"
          onClick={onOutdent}
          disabled={!canOutdent}
        />
        <TBtn
          icon={IndentIncrease}
          label="Indent (Tab)"
          onClick={onIndent}
          disabled={!canIndent}
        />

        {/* Edit-mode controls — only shown when editing */}
        {editMode && (
          <>
            <Divider />
            <TBtn
              icon={Link2}
              label="Link Tasks"
              onClick={onLinkTasks}
              disabled={!selectedTask}
            />
            <TBtn
              icon={Unlink2}
              label="Unlink"
              onClick={onUnlinkTask}
              disabled={!hasSelectedPredecessors}
            />
          </>
        )}

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
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true" />
          )}
          {showFilter && (
            <FilterDropdown
              filter={filter}
              onFilterChange={onFilterChange}
              onClose={() => setShowFilter(false)}
            />
          )}
        </div>

        <Divider />

        <TBtn icon={FileSpreadsheet} label="Import" onClick={onImport} />

        <div className="relative">
          <button
            onClick={() => setShowExport(!showExport)}
            title="Export"
            className={`flex items-center gap-0.5 p-1.5 rounded hover:bg-slate-200 min-w-[32px] min-h-[32px] transition-colors ${
              showExport ? "bg-slate-200 text-slate-700" : "text-slate-600"
            }`}
          >
            <Download className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </button>
          {showExport && (
            <ExportDropdown
              onExportCsv={onExportCsv}
              onExportMsProject={onExportMsProject}
              onClose={() => setShowExport(false)}
            />
          )}
        </div>

        <button
          onClick={onAddRow}
          title="Add Row"
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded min-h-[28px]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>

        <div className="flex-1" />

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

        {/* View toggle */}
        {onViewChange && (
          <div className="flex items-center border border-slate-200 rounded overflow-hidden mr-0.5">
            {(["list", "gantt", "split"] as const).map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                title={`${v.charAt(0).toUpperCase() + v.slice(1)} view`}
                className={`px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                  view === v
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {v === "list" ? "List" : v === "gantt" ? "Gantt" : "Split"}
              </button>
            ))}
          </div>
        )}

        <TBtn
          icon={isFullscreen ? Minimize2 : Maximize2}
          label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          onClick={onToggleFullscreen}
        />
      </div>
    </>
  );
}
