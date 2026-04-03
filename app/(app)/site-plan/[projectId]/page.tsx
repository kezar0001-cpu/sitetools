"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { FixedSizeList } from "react-window";
import type { ListChildComponentProps } from "react-window";
import { toast } from "sonner";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks, useUpdateTask, useReorderTask, useSetTaskPredecessors } from "@/hooks/useSitePlanTasks";
import { useSitePlanBaselines } from "@/hooks/useSitePlanBaselines";
import { useProjectDelayLogs } from "@/hooks/useSitePlanDelays";
import { computeWorkProgress } from "@/types/siteplan";
import type { SitePlanTaskNode, SitePlanTask, TaskType, TaskStatus } from "@/types/siteplan";
import { useTaskTree } from "@/hooks/useTaskTree";
import { useTaskFiltering } from "@/hooks/useTaskFiltering";
import { TaskRow } from "../components/TaskRow";
import { TaskListHeader } from "../components/TaskListHeader";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { DelayLogDialog } from "../components/DelayLogDialog";
import { InlineTaskInput } from "../components/InlineTaskInput";
import { ImportPanel } from "../components/ImportPanel";
import { SitePlanToolbar, EMPTY_FILTER, isFilterActive } from "../components/SitePlanToolbar";
import type { TaskFilter } from "../components/SitePlanToolbar";
import { BaselineDialog } from "../components/BaselineDialog";
import { LinkTasksDialog } from "../components/LinkTasksDialog";
import { SitePlanBottomNav } from "../components/SitePlanBottomNav";
import { AddTaskFAB } from "../components/AddTaskFAB";
import { CreateTaskSheet } from "../components/CreateTaskSheet";
import { ProgressBar } from "../components/ProgressSlider";
import { TaskListSkeleton } from "../components/Skeleton";
import { GanttWrapper } from "../components/GanttWrapper";
import { SitePlanMobileView, type MobileTab } from "../components/SitePlanMobileView";
import { QueryProvider } from "@/components/QueryProvider";
import { downloadCsv } from "@/lib/csvExporter";
import { downloadMsProjectXml } from "@/lib/msProjectExporter";

// ─── Undo/Redo stack ────────────────────────────────────────

interface UndoEntry {
  taskId: string;
  projectId: string;
  before: Partial<SitePlanTask>;
  after: Partial<SitePlanTask>;
}

function describeEntry(entry: UndoEntry): string {
  const keys = Object.keys(entry.before) as (keyof SitePlanTask)[];
  if (keys.includes("name") && entry.before.name !== undefined) {
    return `changed name of '${entry.before.name}'`;
  }
  if (keys.some((k) => k === "parent_id" || k === "type")) {
    return "changed indent level";
  }
  if (keys.includes("status")) {
    return "changed status";
  }
  if (keys.includes("start_date") || keys.includes("end_date")) {
    return "changed dates";
  }
  if (keys.includes("progress")) {
    return "changed progress";
  }
  const readableKey = keys[0]?.replace(/_/g, " ") ?? "field";
  return `changed ${readableKey}`;
}

function useUndoRedo(updateTask: ReturnType<typeof useUpdateTask>) {
  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);
  const [revision, setRevision] = useState(0);

  // NOTE: The stacks are intentionally NOT cleared on task selection changes.
  // UndoEntry includes taskId/projectId so mutations always target the correct task
  // regardless of which task is currently selected.

  const pushUndo = useCallback(
    (entry: UndoEntry) => {
      undoStack.current.push(entry);
      redoStack.current = [];
      setRevision((r) => r + 1);
    },
    []
  );

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push(entry);
    updateTask.mutate({
      id: entry.taskId,
      projectId: entry.projectId,
      updates: entry.before as Parameters<typeof updateTask.mutate>[0]["updates"],
    });
    setRevision((r) => r + 1);
  }, [updateTask]);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push(entry);
    updateTask.mutate({
      id: entry.taskId,
      projectId: entry.projectId,
      updates: entry.after as Parameters<typeof updateTask.mutate>[0]["updates"],
    });
    setRevision((r) => r + 1);
  }, [updateTask]);

  const undoTop = undoStack.current[undoStack.current.length - 1];
  const redoTop = redoStack.current[redoStack.current.length - 1];

  return {
    pushUndo,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    revision,
    undoLabel: undoTop ? describeEntry(undoTop) : undefined,
    redoLabel: redoTop ? describeEntry(redoTop) : undefined,
  };
}

// ─── Virtual task list ──────────────────────────────────────

const DESKTOP_ROW_HEIGHT = 40; // px — fixed row height for FixedSizeList

type TaskListItem =
  | { kind: "task"; node: SitePlanTaskNode; taskIndex: number }
  | { kind: "add_task"; phaseId: string; phaseNode: SitePlanTaskNode }
  | { kind: "inline_input"; parentId: string | null; type: TaskType; sortOrder: number };

interface VirtualRowData {
  listItems: TaskListItem[];
  allExpanded: boolean;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  handleSelect: (node: SitePlanTaskNode) => void;
  setDelayTask: (node: SitePlanTaskNode | null) => void;
  delayCountMap: Map<string, number>;
  phaseIndexMap: Map<string, number>;
  editMode: boolean;
  checkedIds: Set<string>;
  handleCheck: (node: SitePlanTaskNode, checked: boolean) => void;
  hiddenColumns: Set<string>;
  /** Opens CreateTaskSheet for the "+ Add Task" affordance inside phase rows (desktop) */
  openDesktopSheet: (type: TaskType, parentId: string | null, sortOrder: number) => void;
  /** Row-level: open sheet to insert sibling below */
  onRowAddBelow: (node: SitePlanTaskNode) => void;
  /** Row-level: open sheet to insert child */
  onRowAddSubtask: (node: SitePlanTaskNode) => void;
  projectId: string;
  setInlineInput: (v: null) => void;
  inlineAfterIndex: number;
  inlineParentId: string | null;
  inlineType: TaskType;
  highlightedTaskIds: Set<string>;
  selectedRowIds: Set<string>;
  onRowNumberClick: (node: SitePlanTaskNode, rowNumber: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onUpdateTaskInline: (taskId: string, updates: Partial<SitePlanTaskNode>) => void;
  columnWidths: Record<string, number>;
}

/** Rendered for every visible row in the FixedSizeList. Defined outside the page component so
 *  react-window can reuse it without remounting on every render. */
function VirtualRow({ index, style, data }: ListChildComponentProps<VirtualRowData>) {
  const {
    listItems,
    allExpanded,
    expandedIds,
    toggleExpand,
    handleSelect,
    setDelayTask,
    delayCountMap,
    phaseIndexMap,
    editMode,
    checkedIds,
    handleCheck,
    hiddenColumns,
    openDesktopSheet,
    onRowAddBelow,
    onRowAddSubtask,
    projectId,
    setInlineInput,
    inlineAfterIndex,
    inlineParentId,
    inlineType,
    highlightedTaskIds,
    selectedRowIds,
    onRowNumberClick,
    onUpdateTaskInline,
    columnWidths,
  } = data;

  // Placeholder row inserted when isUsingPlaceholder is true
  if (index >= listItems.length) return <div style={style} />;

  const item = listItems[index];

  if (item.kind === "add_task") {
    return (
      <div style={style} className="overflow-hidden">
        <button
          onClick={() => openDesktopSheet("task", item.phaseId, item.phaseNode.children.length)}
          className="w-full h-full text-left pl-16 py-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 hidden md:flex items-center border-b border-slate-100"
        >
          + Add Task
        </button>
      </div>
    );
  }

  if (item.kind === "inline_input") {
    return (
      <div style={style} className="overflow-hidden">
        <InlineTaskInput
          projectId={projectId}
          contextParentId={inlineParentId}
          contextType={inlineType}
          sortOrder={inlineAfterIndex}
          onCancel={() => setInlineInput(null)}
        />
      </div>
    );
  }

  // kind === "task"
  const node = item.node;
  const expanded = allExpanded || expandedIds.has(node.id);

  return (
    <Draggable draggableId={node.id} index={item.taskIndex} key={node.id}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          style={{ ...style, ...dragProvided.draggableProps.style }}
          className="overflow-hidden"
        >
          <TaskRow
            node={node}
            rowNumber={item.taskIndex + 1}
            expanded={expanded}
            onToggle={() => toggleExpand(node.id)}
            onSelect={handleSelect}
            onLogDelay={setDelayTask}
            delayCount={delayCountMap.get(node.id) ?? 0}
            dragHandleProps={editMode ? undefined : dragProvided.dragHandleProps}
            isDragging={dragSnapshot.isDragging}
            phaseIndex={phaseIndexMap.get(node.id) ?? 0}
            editMode={editMode}
            isChecked={checkedIds.has(node.id)}
            onCheck={handleCheck}
            hiddenColumns={hiddenColumns}
            isHighlighted={highlightedTaskIds.has(node.id)}
            onAddBelow={onRowAddBelow}
            onAddSubtask={onRowAddSubtask}
            selectedRowIds={selectedRowIds}
            onRowNumberClick={onRowNumberClick}
            onUpdateTask={onUpdateTaskInline}
            columnWidths={columnWidths}
          />
        </div>
      )}
    </Draggable>
  );
}

// ─── Main page ──────────────────────────────────────────────

function ProjectDetailInner() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  const { data: project } = useSitePlanProject(projectId);
  const { data: tasks, isLoading, refetch } = useSitePlanTasks(projectId);
  const updateTask = useUpdateTask();
  const reorderTask = useReorderTask();
  const setTaskPredecessors = useSetTaskPredecessors();
  const { data: baselines } = useSitePlanBaselines(projectId);

  const { data: delayLogs } = useProjectDelayLogs(projectId);
  const { pushUndo, undo, redo, canUndo, canRedo, undoLabel, redoLabel } = useUndoRedo(updateTask);

  // Compute delay count per task
  const delayCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (delayLogs) {
      for (const log of delayLogs) {
        map.set(log.task_id, (map.get(log.task_id) ?? 0) + 1);
      }
    }
    return map;
  }, [delayLogs]);

  // Helper to update URL search params
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, val);
        }
      }
      const qs = newParams.toString();
      router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const mobileTab = (
    searchParams.get("mobileTab") === "today" ||
    searchParams.get("mobileTab") === "gantt"
      ? searchParams.get("mobileTab")
      : "all"
  ) as MobileTab;
  const handleMobileTabChange = useCallback(
    (nextTab: MobileTab) => {
      updateSearchParams({ mobileTab: nextTab === "all" ? null : nextTab });
    },
    [updateSearchParams]
  );

  // Desktop view mode (URL param): list | gantt | split (default: list)
  const viewParam = searchParams.get("view");
  const desktopView = (viewParam === "gantt" || viewParam === "split" ? viewParam : "list") as "list" | "gantt" | "split";
  const handleViewChange = useCallback(
    (v: "list" | "gantt" | "split") => {
      updateSearchParams({ view: v === "list" ? null : v });
    },
    [updateSearchParams]
  );

  // Derive filter from URL search params
  const filter = useMemo<TaskFilter>(() => {
    const filterParam = searchParams.get("filter");
    const searchParam = searchParams.get("search");
    const assignedParam = searchParams.get("assignedTo");
    const typeParam = searchParams.get("type");

    // Support predefined filter aliases
    if (filterParam === "overdue") {
      return { status: ["delayed" as const], type: [], assignedTo: "", search: "" };
    }
    if (filterParam === "due_this_week") {
      return { status: ["in_progress" as const, "not_started" as const], type: [], assignedTo: "", search: "" };
    }
    if (filterParam === "no_progress") {
      return { status: ["not_started" as const], type: [], assignedTo: "", search: "" };
    }

    const statusParam = searchParams.get("status");
    return {
      status: statusParam ? statusParam.split(",") as TaskStatus[] : [],
      type: typeParam ? typeParam.split(",") as TaskType[] : [],
      assignedTo: assignedParam ?? "",
      search: searchParam ?? "",
    };
  }, [searchParams]);

  const setFilter = useCallback(
    (f: TaskFilter) => {
      updateSearchParams({
        status: f.status.length > 0 ? f.status.join(",") : null,
        type: f.type.length > 0 ? f.type.join(",") : null,
        assignedTo: f.assignedTo || null,
        search: f.search || null,
        filter: null, // clear predefined alias
      });
    },
    [updateSearchParams]
  );

  // Derive expandedIds from URL and initialise the task tree hook
  const expandedIdsParam = searchParams.get("expanded");
  const {
    tree,
    flatTasks,
    expandedIds,
    allExpanded,
    mobileExpandedIds,
    toggleExpand,
    toggleAll,
    toggleMobileExpand,
  } = useTaskTree(tasks, {
    initialExpandedIds: expandedIdsParam
      ? new Set(expandedIdsParam.split(","))
      : new Set(),
    initialAllExpanded: !expandedIdsParam,
  });

  // Sync expandedIds back to URL whenever they change
  useEffect(() => {
    const ids = Array.from(expandedIds).join(",");
    updateSearchParams({ expanded: ids || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedIds]);

  // Derive selected task from URL
  const taskIdParam = searchParams.get("task");

  // Find selected task from URL param or local state
  const [selectedTaskLocal, setSelectedTaskLocal] = useState<SitePlanTaskNode | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [showBaselines, setShowBaselines] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [delayTask, setDelayTask] = useState<SitePlanTaskNode | null>(null);
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Virtual list state ──────────────────────────────────────
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<FixedSizeList<VirtualRowData>>(null);
  const [desktopListHeight, setDesktopListHeight] = useState(500);
  const [stickyPhaseNode, setStickyPhaseNode] = useState<SitePlanTaskNode | null>(null);

  // Column visibility state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    name: 300,
    dur: 90,
    start: 110,
    finish: 110,
    pred: 120,
    pct: 90,
    status: 120,
    delays: 80,
    assigned: 140,
  });
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [lastSelectedRowNumber, setLastSelectedRowNumber] = useState<number | null>(null);
  const handleToggleColumn = useCallback((col: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }, []);
  const handleColumnResize = useCallback((col: string, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [col]: width }));
  }, []);

  // Inline input state (mobile only after refactor)
  const [inlineInput, setInlineInput] = useState<{
    type: TaskType;
    parentId: string | null;
    afterIndex: number;
    afterTaskId: string | null;
  } | null>(null);

  // Desktop creation sheet state
  const [createSheetState, setCreateSheetState] = useState<{
    type: TaskType;
    parentId: string | null;
    sortOrder: number;
    parentNode?: SitePlanTaskNode | null;
  } | null>(null);

  const openCreateSheet = useCallback((type: TaskType, parentId: string | null, sortOrder: number, parentNode?: SitePlanTaskNode | null) => {
    setCreateSheetState({ type, parentId, sortOrder, parentNode });
  }, []);

  // Resolve selected task: prefer URL param, fall back to local state
  const selectedTask = useMemo(() => {
    if (taskIdParam && flatTasks.length > 0) {
      return flatTasks.find((t) => t.id === taskIdParam) ?? selectedTaskLocal;
    }
    return selectedTaskLocal;
  }, [taskIdParam, flatTasks, selectedTaskLocal]);

  const setSelectedTask = useCallback(
    (task: SitePlanTaskNode | null) => {
      setSelectedTaskLocal(task);
      updateSearchParams({ task: task?.id ?? null });
    },
    [updateSearchParams]
  );

  // Toggle edit mode — clear selections on exit
  const handleToggleEditMode = useCallback(() => {
    setEditMode((prev) => {
      if (prev) {
        setCheckedIds(new Set());
        setSelectedTask(null);
      }
      return !prev;
    });
  }, [setSelectedTask]);

  // Check/uncheck a task — in edit mode this is "select for bulk action"
  const handleCheck = useCallback(
    (task: SitePlanTaskNode, checked: boolean) => {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(task.id);
          setSelectedTask(task);
        } else {
          next.delete(task.id);
          if (next.size === 0) setSelectedTask(null);
        }
        return next;
      });
    },
    [setSelectedTask]
  );

  // Visible rows + phase colour map
  const { visibleRows, phaseIndexMap } = useTaskFiltering(
    tree,
    expandedIds,
    allExpanded,
    filter
  );
  const { visibleRows: mobileRows } = useTaskFiltering(
    tree,
    new Set<string>(),
    true,
    filter
  );

  const overallProgress = useMemo(
    () => computeWorkProgress(tasks ?? []),
    [tasks]
  );

  const handleSelect = useCallback((node: SitePlanTaskNode) => {
    if (editMode) {
      handleCheck(node, !checkedIds.has(node.id));
    } else {
      setSelectedTask(node);
      setInlineInput(null);
    }
  }, [editMode, handleCheck, checkedIds, setSelectedTask]);

  const handleUpdateTaskInline = useCallback((taskId: string, updates: Partial<SitePlanTaskNode>) => {
    updateTask.mutate({ id: taskId, projectId, updates });
  }, [updateTask, projectId]);

  const handleRowNumberClick = useCallback((node: SitePlanTaskNode, rowNumber: number, e: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedTask(node);
    setInlineInput(null);
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelectedRowNumber !== null) {
        next.clear();
        const start = Math.min(lastSelectedRowNumber, rowNumber);
        const end = Math.max(lastSelectedRowNumber, rowNumber);
        visibleRows.slice(start - 1, end).forEach((r) => next.add(r.id));
      } else if (e.metaKey || e.ctrlKey) {
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
      } else {
        next.clear();
        next.add(node.id);
      }
      return next;
    });
    setLastSelectedRowNumber(rowNumber);
  }, [lastSelectedRowNumber, visibleRows, setSelectedTask]);

  /** Add a new row at the same indent level as the currently selected row, directly below it.
   *  On desktop this opens CreateTaskSheet; mobile uses InlineTaskInput via startInlineAdd. */
  const handleAddRow = useCallback(() => {
    const type: TaskType = selectedTask?.type ?? "task";
    const parentId = selectedTask?.parent_id ?? null;
    const selectedIdx = selectedTask
      ? visibleRows.findIndex((r) => r.id === selectedTask.id)
      : -1;
    const sortOrder = selectedIdx >= 0 ? selectedIdx + 1 : tasks?.length ?? 0;
    const parentNode = parentId ? flatTasks.find((t) => t.id === parentId) ?? null : null;
    openCreateSheet(type, parentId, sortOrder, parentNode);
    setSelectedTask(null);
  }, [selectedTask, tasks, visibleRows, flatTasks, setSelectedTask, openCreateSheet]);

  /** Row "+" → "Add task below": insert sibling with same type & parent, after the row's subtree */
  const handleRowAddBelow = useCallback((node: SitePlanTaskNode) => {
    const idx = visibleRows.findIndex((r) => r.id === node.id);
    // Walk forward to find the last visible row belonging to this node's subtree
    let lastIdx = idx;
    for (let i = idx + 1; i < visibleRows.length; i++) {
      const row = visibleRows[i];
      // Stop when we reach a sibling or ancestor-level row
      if (row.parent_id === node.parent_id && row.id !== node.id) break;
      if (row.type === "phase" && node.type !== "phase") break;
      lastIdx = i;
    }
    const parentNode = node.parent_id ? flatTasks.find((t) => t.id === node.parent_id) ?? null : null;
    openCreateSheet(node.type, node.parent_id, lastIdx + 1, parentNode);
  }, [visibleRows, flatTasks, openCreateSheet]);

  /** Row "+" → "Add subtask": insert first/next child under this node */
  const handleRowAddSubtask = useCallback((node: SitePlanTaskNode) => {
    const childType: TaskType = node.type === "phase" ? "task" : "subtask";
    openCreateSheet(childType, node.id, node.children.length, node);
  }, [openCreateSheet]);

  const handleExportCsv = useCallback(() => {
    const slug = (project?.name ?? "siteplan").replace(/\s+/g, "_");
    downloadCsv(visibleRows, `${slug}.csv`);
  }, [visibleRows, project]);

  const handleExportMsProject = useCallback(() => {
    const slug = (project?.name ?? "siteplan").replace(/\s+/g, "_");
    downloadMsProjectXml(visibleRows, `${slug}.xml`);
  }, [visibleRows, project]);

  const handleFABAdd = (type: TaskType) => {
    setInlineInput({
      type,
      parentId: null,
      afterIndex: tasks?.length ?? 0,
      afterTaskId: null,
    });
    setSelectedTask(null);
  };

  const startInlineAdd = useCallback((
    type: TaskType,
    parentId: string | null = null,
    afterTaskId: string | null = null
  ) => {
    // Find the last visible row belonging to the afterTaskId subtree
    let resolvedAfterTaskId = afterTaskId;
    if (afterTaskId) {
      const phaseIdx = visibleRows.findIndex((r) => r.id === afterTaskId);
      if (phaseIdx >= 0) {
        let lastIdx = phaseIdx;
        for (let i = phaseIdx + 1; i < visibleRows.length; i++) {
          const row = visibleRows[i];
          // Stop when we hit a sibling or parent-level phase
          if (row.type === "phase" && row.parent_id === visibleRows[phaseIdx].parent_id) break;
          lastIdx = i;
        }
        resolvedAfterTaskId = visibleRows[lastIdx].id;
      }
    }
    const afterIdx = resolvedAfterTaskId
      ? visibleRows.findIndex((r) => r.id === resolvedAfterTaskId)
      : -1;
    const sortOrder = afterIdx >= 0 ? afterIdx + 1 : tasks?.length ?? 0;
    setInlineInput({
      type,
      parentId,
      afterIndex: sortOrder,
      afterTaskId: resolvedAfterTaskId,
    });
    setSelectedTask(null);
  }, [visibleRows, tasks, setSelectedTask]);

  // ─── Indent / Outdent ──────────────────────────────────────
  // Allows flexible nesting: phases can contain phases, tasks can contain tasks/subtasks,
  // and subtasks can nest deeper. The indent operation makes the task a child of the row above it.

  const indentTask = useCallback(
    (taskId: string, newType: TaskType, newParentId: string | null) => {
      updateTask.mutate({
        id: taskId,
        projectId,
        updates: { type: newType, parent_id: newParentId },
      });
    },
    [updateTask, projectId]
  );

  const handleIndent = useCallback(() => {
    if (!selectedTask) return;
    // Use visibleRows to find the row visually above the selected task
    const taskIndex = visibleRows.findIndex((r) => r.id === selectedTask.id);
    if (taskIndex <= 0) return;

    // Find the nearest row above that can be a parent
    const above = visibleRows[taskIndex - 1];
    if (!above) return;

    // Determine new type based on what we're nesting under
    let newType: TaskType = selectedTask.type;
    if (above.type === "phase") {
      // Nesting under a phase: become task (or stay phase if phase-under-phase)
      newType = selectedTask.type === "phase" ? "phase" : "task";
    } else if (above.type === "task") {
      newType = "subtask";
    } else if (above.type === "subtask") {
      newType = "subtask";
    }

    pushUndo({
      taskId: selectedTask.id,
      projectId,
      before: { type: selectedTask.type, parent_id: selectedTask.parent_id },
      after: { type: newType, parent_id: above.id },
    });
    indentTask(selectedTask.id, newType, above.id);
  }, [selectedTask, visibleRows, projectId, pushUndo, indentTask]);

  const handleOutdent = useCallback(() => {
    if (!selectedTask || !selectedTask.parent_id) return;

    // Use flatTasks (all tasks) so parent lookup works even when rows are collapsed
    const parent = flatTasks.find((r) => r.id === selectedTask.parent_id);
    const grandparentId = parent?.parent_id ?? null;

    // Determine new type: promote one level up
    let newType: TaskType = selectedTask.type;
    if (grandparentId === null) {
      // Moving to root level
      newType = "phase";
    } else {
      const grandparent = flatTasks.find((r) => r.id === grandparentId);
      if (grandparent?.type === "phase") {
        newType = selectedTask.type === "phase" ? "phase" : "task";
      } else {
        newType = "subtask";
      }
    }

    pushUndo({
      taskId: selectedTask.id,
      projectId,
      before: { type: selectedTask.type, parent_id: selectedTask.parent_id },
      after: { type: newType, parent_id: grandparentId },
    });
    indentTask(selectedTask.id, newType, grandparentId);
  }, [selectedTask, flatTasks, projectId, pushUndo, indentTask]);

  // ─── Link / Unlink ────────────────────────────────────────

  const handleLinkTasks = () => {
    if (!selectedTask) return;
    setShowLinkDialog(true);
  };

  const handleUnlinkTask = () => {
    if (!selectedTask) return;
    setTaskPredecessors.mutate({
      taskId: selectedTask.id,
      predecessorIds: [],
      projectId,
    });
  };

  // ─── Fullscreen ───────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Gantt task click — open edit panel
  const handleGanttTaskClick = useCallback(
    (task: SitePlanTask) => {
      const node = flatTasks.find((t) => t.id === task.id);
      if (node) setSelectedTask(node);
    },
    [flatTasks, setSelectedTask]
  );

  // ─── Drag and drop ──────────────────────────────────────────

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination || source.index === destination.index) return;
      // Ignore drops between the desktop and mobile droppables
      if (source.droppableId !== destination.droppableId) return;

      const rows = [...visibleRows];
      const [moved] = rows.splice(source.index, 1);
      rows.splice(destination.index, 0, moved);

      // Determine the new parent_id based on surrounding rows
      let newParentId: string | null = moved.parent_id;
      const dest = destination.index;

      if (dest === 0) {
        // Dropped at top — becomes a root-level item
        newParentId = null;
      } else {
        // Look at the row above the destination to infer parent
        const above = rows[dest - 1];
        if (moved.type === "subtask") {
          // Subtask should nest under a task or subtask
          if (above.type === "task" || above.type === "subtask") newParentId = above.type === "subtask" ? above.parent_id : above.id;
          else if (above.type === "phase") newParentId = above.id;
          else newParentId = null;
        } else if (moved.type === "task") {
          // Task nests under a phase
          if (above.type === "phase") newParentId = above.id;
          else if (above.type === "task") newParentId = above.parent_id;
          else if (above.type === "subtask") newParentId = above.parent_id;
          else newParentId = null;
        } else {
          // Phase — can nest under another phase or be root
          if (above.type === "phase" && above.parent_id === null) {
            // Keep existing parent
          }
          newParentId = moved.parent_id;
        }
      }

      // Compute new sort_order values for all affected rows
      const moves = rows.map((row, idx) => ({
        id: row.id,
        sort_order: idx,
        parent_id: row.id === moved.id ? newParentId : row.parent_id,
      }));

      reorderTask.mutate({ projectId, moves });
    },
    [visibleRows, projectId, reorderTask]
  );

  // ─── Keyboard shortcuts (Tab / Shift+Tab for indent/outdent) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only when a task row is selected (not when editing an input)
      if (!selectedTask) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        handleIndent();
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        if (selectedTask.parent_id) handleOutdent();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedTask, handleIndent, handleOutdent]);

  // ─── Virtual list memos & effects ──────────────────────────

  /** Flat list for FixedSizeList: task rows + "Add Task" buttons + inline inputs */
  const listItems = useMemo<TaskListItem[]>(() => {
    const items: TaskListItem[] = [];
    let taskIndex = 0;
    for (const node of visibleRows) {
      items.push({ kind: "task", node, taskIndex: taskIndex++ });
      // "Add Task" affordance after each expanded phase
      if (node.type === "phase" && (allExpanded || expandedIds.has(node.id))) {
        items.push({ kind: "add_task", phaseId: node.id, phaseNode: node });
      }
      // Inline input inserted after its target row
      if (inlineInput?.afterTaskId === node.id) {
        items.push({
          kind: "inline_input",
          parentId: inlineInput.parentId,
          type: inlineInput.type,
          sortOrder: inlineInput.afterIndex,
        });
      }
    }
    return items;
  }, [visibleRows, allExpanded, expandedIds, inlineInput]);

  /** Called by DelayLogDialog when a cascade delay impacts successor tasks */
  const handleDelayImpact = useCallback((affectedTaskIds: string[]) => {
    if (affectedTaskIds.length === 0) return;

    const idSet = new Set(affectedTaskIds);
    setHighlightedTaskIds(idSet);

    // Clear any existing highlight timer
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedTaskIds(new Set());
    }, 3000);

    // Find the first affected task in the visible list and scroll to it
    const scrollToFirstImpacted = () => {
      const firstIdx = listItems.findIndex(
        (item) => item.kind === "task" && idSet.has(item.node.id)
      );
      if (firstIdx >= 0 && listRef.current) {
        listRef.current.scrollToItem(firstIdx, "smart");
      }
    };

    toast.success(
      `Delay cascaded to ${affectedTaskIds.length} successor task${affectedTaskIds.length !== 1 ? "s" : ""}`,
      {
        duration: 5000,
        action: {
          label: "View Impact",
          onClick: scrollToFirstImpacted,
        },
      }
    );
  }, [listItems, listRef]);

  /** Stable data object passed to every virtual row — only changes when content changes */
  const rowData = useMemo<VirtualRowData>(() => ({
    listItems,
    allExpanded,
    expandedIds,
    toggleExpand,
    handleSelect,
    setDelayTask,
    delayCountMap,
    phaseIndexMap,
    editMode,
    checkedIds,
    handleCheck,
    hiddenColumns,
    openDesktopSheet: openCreateSheet,
    onRowAddBelow: handleRowAddBelow,
    onRowAddSubtask: handleRowAddSubtask,
    projectId,
    setInlineInput,
    inlineAfterIndex: inlineInput?.afterIndex ?? 0,
    inlineParentId: inlineInput?.parentId ?? null,
    inlineType: inlineInput?.type ?? "task",
    highlightedTaskIds,
    selectedRowIds,
    onRowNumberClick: handleRowNumberClick,
    onUpdateTaskInline: handleUpdateTaskInline,
    columnWidths,
  }), [
    listItems, allExpanded, expandedIds, toggleExpand, handleSelect,
    setDelayTask, delayCountMap, phaseIndexMap, editMode, checkedIds,
    handleCheck, hiddenColumns, openCreateSheet, handleRowAddBelow,
    handleRowAddSubtask, projectId, inlineInput, highlightedTaskIds,
    selectedRowIds, handleRowNumberClick, handleUpdateTaskInline, columnWidths,
  ]);

  /** Track desktop list container height for FixedSizeList */
  useEffect(() => {
    const raw = localStorage.getItem("siteplan-col-widths");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, number>;
      setColumnWidths((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Ignore invalid local storage values.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("siteplan-col-widths", JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    const el = desktopContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDesktopListHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Scroll virtual list to inline input row when it's activated */
  useEffect(() => {
    if (!inlineInput?.afterTaskId || !listRef.current) return;
    const idx = listItems.findIndex((item) => item.kind === "inline_input");
    if (idx >= 0) listRef.current.scrollToItem(idx, "smart");
  }, [inlineInput, listItems]);

  /** Handle FixedSizeList scroll — update sticky phase banner without re-rendering items */
  const handleVirtualScroll = useCallback(
    ({ scrollOffset }: { scrollOffset: number }) => {
      const topItemIndex = Math.floor(scrollOffset / DESKTOP_ROW_HEIGHT);
      if (topItemIndex === 0) {
        setStickyPhaseNode(null);
        return;
      }
      const topItem = listItems[topItemIndex];
      // If top item is a phase row itself, no sticky banner needed
      if (topItem?.kind === "task" && topItem.node.type === "phase") {
        setStickyPhaseNode(null);
        return;
      }
      // Walk backwards to find the nearest phase above the top visible row
      let found: SitePlanTaskNode | null = null;
      for (let i = topItemIndex - 1; i >= 0; i--) {
        const item = listItems[i];
        if (item?.kind === "task" && item.node.type === "phase") {
          found = item.node;
          break;
        }
      }
      setStickyPhaseNode((prev) => (prev?.id === found?.id ? prev : found));
    },
    [listItems]
  );

  const hasChildrenForSelected = selectedTask
    ? (tasks ?? []).some((t) => t.parent_id === selectedTask.id)
    : false;

  return (
    <>
      <div
        ref={containerRef}
        className={`relative flex h-full flex-col bg-white ${isFullscreen ? "fixed inset-0 z-[100]" : ""}`}
      >
        {/* Project header */}
        <div className="px-4 py-2 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/site-plan")}
              className="p-1.5 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4 text-slate-400" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">
                {project?.name ?? "Loading..."}
              </h1>
            </div>
            <span className="text-xs font-semibold text-slate-600 tabular-nums">
              {overallProgress}%
            </span>
          </div>
          <div className="mt-1">
            <ProgressBar value={overallProgress} />
          </div>
        </div>

        {/* Toolbar */}
        <SitePlanToolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          undoLabel={undoLabel}
          redoLabel={redoLabel}
          allExpanded={allExpanded}
          onToggleAll={toggleAll}
          selectedTask={selectedTask}
          onIndent={handleIndent}
          onOutdent={handleOutdent}
          onLinkTasks={handleLinkTasks}
          onUnlinkTask={handleUnlinkTask}
          filter={filter}
          onFilterChange={setFilter}
          onImport={() => setShowImport(true)}
          onExportCsv={handleExportCsv}
          onExportMsProject={handleExportMsProject}
          onAddRow={handleAddRow}
          onSaveBaseline={() => setShowBaselines(true)}
          baselineCount={baselines?.length ?? 0}
          editMode={editMode}
          onToggleEditMode={handleToggleEditMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          view={desktopView}
          onViewChange={handleViewChange}
        />

        {/* Panes area: horizontal layout for task list and/or Gantt */}
        <div
          className="relative flex flex-1 min-h-0"
        >
          {/* Left pane: task list (hidden on desktop in gantt-only view) */}
          <div className={`flex flex-col min-w-0 ${
            desktopView !== "list" ? "md:hidden" : ""
          } flex-1`}>
          {/* Task list — desktop uses FixedSizeList virtualisation; mobile uses standard rendering */}
          <div className="flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex-1 overflow-auto pb-20 md:pb-4">
              <TaskListSkeleton />
            </div>
          ) : visibleRows.length === 0 && !inlineInput ? (
            <div className="flex-1 overflow-auto pb-20 md:pb-4 flex flex-col items-center justify-center py-20 text-center px-4">
              {isFilterActive(filter) ? (
                <>
                  <p className="text-sm text-slate-500 mb-4">
                    No tasks match the current filter.
                  </p>
                  <button
                    onClick={() => setFilter(EMPTY_FILTER)}
                    className="px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px]"
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500 mb-4">
                    No tasks yet. Start typing to build your programme.
                  </p>
                  {/* Desktop: open CreateTaskSheet; mobile: inline input */}
                  <button
                    onClick={() => openCreateSheet("phase", null, 0)}
                    className="hidden md:flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg min-h-[44px]"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Phase
                  </button>
                  <button
                    onClick={() => startInlineAdd("phase")}
                    className="md:hidden flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg min-h-[44px]"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Phase
                  </button>
                </>
              )}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              {/* ── Desktop: virtualised FixedSizeList (md+) ────────────── */}
              <div className="hidden md:flex flex-col flex-1 min-h-0">
                <TaskListHeader
                  hiddenColumns={hiddenColumns}
                  onToggleColumn={handleToggleColumn}
                  columnWidths={columnWidths}
                  onColumnResize={handleColumnResize}
                />

                {/* Sticky phase context banner — shown when a phase header has scrolled off-screen */}
                {stickyPhaseNode && (
                  <div className="shrink-0 bg-slate-800 border-b border-slate-700 px-3 py-1 flex items-center gap-2 z-[5]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phase</span>
                    <span className="text-xs font-semibold text-white truncate">{stickyPhaseNode.name}</span>
                  </div>
                )}

                {/* FixedSizeList container — fills remaining height */}
                <div className="flex-1 min-h-0" ref={desktopContainerRef}>
                  <Droppable
                    droppableId="task-list"
                    mode="virtual"
                    renderClone={(provided, _snapshot, rubric) => {
                      const srcNode = visibleRows[rubric.source.index];
                      return (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{ height: DESKTOP_ROW_HEIGHT, overflow: "hidden", ...provided.draggableProps.style }}
                        >
                          {srcNode && (
                            <TaskRow
                              node={srcNode}
                              rowNumber={rubric.source.index + 1}
                              expanded={false}
                              onToggle={() => {}}
                              onSelect={() => {}}
                              isDragging={true}
                              phaseIndex={phaseIndexMap.get(srcNode.id) ?? 0}
                              hiddenColumns={hiddenColumns}
                              selectedRowIds={selectedRowIds}
                              onRowNumberClick={handleRowNumberClick}
                              onUpdateTask={handleUpdateTaskInline}
                              columnWidths={columnWidths}
                            />
                          )}
                        </div>
                      );
                    }}
                  >
                    {(provided, snapshot) => (
                      <FixedSizeList
                        ref={listRef}
                        height={desktopListHeight}
                        itemCount={listItems.length + (snapshot.isUsingPlaceholder ? 1 : 0)}
                        itemSize={DESKTOP_ROW_HEIGHT}
                        outerRef={provided.innerRef}
                        itemData={rowData}
                        onScroll={handleVirtualScroll}
                        width="100%"
                        overscanCount={5}
                      >
                        {VirtualRow}
                      </FixedSizeList>
                    )}
                  </Droppable>
                </div>

                {/* Desktop: "Add Phase" opens CreateTaskSheet */}
                {visibleRows.length > 0 && (
                  <button
                    onClick={handleAddRow}
                    className="shrink-0 w-full text-left pl-10 py-2.5 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 border-b border-slate-100 min-h-[36px]"
                  >
                    + Add Row
                  </button>
                )}
              </div>

              {/* ── Mobile: dedicated site tracking tabs (< md) ── */}
              <SitePlanMobileView
                projectId={projectId}
                tasks={tasks ?? []}
                rows={mobileRows}
                activeTab={mobileTab}
                onTabChange={handleMobileTabChange}
                onSelectTask={handleSelect}
                onLogDelay={(task) => setDelayTask(task)}
                mobileExpandedIds={mobileExpandedIds}
                onToggleMobileExpand={toggleMobileExpand}
                delayCountMap={delayCountMap}
                refetch={refetch}
              />
            </DragDropContext>
          )}
          </div>
          </div>

          {/* Desktop synchronized split-pane view */}
          {desktopView !== "list" && (
            <div className="hidden md:flex flex-1 min-w-0 overflow-hidden">
              {!isLoading && tasks && tasks.length > 0 ? (
                <GanttWrapper tasks={tasks} onTaskClick={handleGanttTaskClick} />
              ) : (
                <div className="flex items-center justify-center h-full w-full text-slate-400 text-sm">
                  {isLoading ? "Loading..." : "Add tasks to see the Gantt chart."}
                </div>
              )}
            </div>
          )}

          {/* Task edit panel (desktop, non-edit mode) — overlays right side */}
          {selectedTask && !editMode && (
            <div
              className="hidden md:block absolute right-0 top-0 bottom-0 z-20"
              style={{ width: "min(400px, 40vw)" }}
            >
              <TaskEditPanel
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                hasChildren={hasChildrenForSelected}
                onAddSubtask={() =>
                  openCreateSheet("subtask", selectedTask.id, selectedTask.children.length, selectedTask)
                }
              />
            </div>
          )}
        </div>

      {/* Mobile task edit panel (non-edit mode only) */}
      {selectedTask && !editMode && (
        <div className="md:hidden">
          <TaskEditPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            hasChildren={hasChildrenForSelected}
            onAddSubtask={() =>
              startInlineAdd("subtask", selectedTask.id)
            }
          />
        </div>
      )}

      {/* Desktop task creation sheet — single primary creation path on md+ */}
      {createSheetState && (
        <div className="hidden md:block">
          <CreateTaskSheet
            projectId={projectId}
            type={createSheetState.type}
            parentId={createSheetState.parentId}
            parentNode={createSheetState.parentNode}
            sortOrder={createSheetState.sortOrder}
            onClose={() => setCreateSheetState(null)}
          />
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <ImportPanel
              projectId={projectId}
              onClose={() => setShowImport(false)}
            />
          </div>
        </div>
      )}

      {/* Baselines dialog */}
      {showBaselines && (
        <BaselineDialog
          projectId={projectId}
          tasks={tasks ?? []}
          onClose={() => setShowBaselines(false)}
        />
      )}

      {/* Link tasks dialog */}
      {showLinkDialog && selectedTask && (
        <LinkTasksDialog
          task={selectedTask}
          allTasks={flatTasks}
          onClose={() => setShowLinkDialog(false)}
        />
      )}

      {/* Delay log dialog */}
      {delayTask && (
        <DelayLogDialog
          task={delayTask}
          projectId={projectId}
          onClose={() => setDelayTask(null)}
          onImpact={handleDelayImpact}
        />
      )}

      <AddTaskFAB onAdd={handleFABAdd} currentType={selectedTask?.type ?? "task"} />
      <SitePlanBottomNav activeTab={mobileTab} onTabChange={handleMobileTabChange} />
    </div>
    </>
  );
}

export default function ProjectDetailPage() {
  return (
    <QueryProvider>
      <ProjectDetailInner />
    </QueryProvider>
  );
}
