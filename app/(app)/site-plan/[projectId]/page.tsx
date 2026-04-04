"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, BarChart3, ListTodo } from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { FixedSizeList } from "react-window";
import type { ListChildComponentProps } from "react-window";
import { toast } from "sonner";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks, useUpdateTask, useReorderTask } from "@/hooks/useSitePlanTasks";
import { useProjectDelayLogs } from "@/hooks/useSitePlanDelays";
import { computeWorkProgress } from "@/types/siteplan";
import type { SitePlanTaskNode, SitePlanTask, TaskType, TaskStatus } from "@/types/siteplan";
import { useTaskTree } from "@/hooks/useTaskTree";
import { useTaskFiltering } from "@/hooks/useTaskFiltering";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { DelayLogDialog } from "../components/DelayLogDialog";
import { ImportPanel } from "../components/ImportPanel";
import { SitePlanToolbar, EMPTY_FILTER, isFilterActive } from "../components/SitePlanToolbar";
import type { TaskFilter } from "../components/SitePlanToolbar";
import { BaselineDialog } from "../components/BaselineDialog";
import { LinkTasksDialog } from "../components/LinkTasksDialog";
import { AddTaskFAB } from "../components/AddTaskFAB";
import { CreateTaskSheet } from "../components/CreateTaskSheet";
import { ProgressBar } from "../components/ProgressSlider";
import { TaskListSkeleton } from "../components/Skeleton";
import { DESKTOP_ROW_HEIGHT, GanttWrapper } from "../components/GanttWrapper";
import type { TaskListItem } from "../components/GanttWrapper";
import { SitePlanMobileView } from "../components/SitePlanMobileView";
import type { MobileTab } from "../components/SitePlanMobileView";
import { QueryProvider } from "@/components/QueryProvider";
import { supabase } from "@/lib/supabase";
import { TaskRow } from "../components/TaskRow";
import { InlineTaskCreateRow } from "../components/InlineTaskCreateRow";
import { TaskListHeader } from "../components/TaskListHeader";

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

interface VirtualRowData {
  listItems: TaskListItem[];
  allExpanded: boolean;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  handleSelect: (node: SitePlanTaskNode) => void;
  setDelayTask: (node: SitePlanTaskNode | null) => void;
  delayCountMap: Map<string, number>;
  depthMap: Map<string, number>;
  rootIndexMap: Map<string, number>;
  editMode: boolean;
  checkedIds: Set<string>;
  handleCheck: (node: SitePlanTaskNode, checked: boolean) => void;
  hiddenColumns: Set<string>;
  openBottomInlineRow: () => void;
  onRowAddBelow: (node: SitePlanTaskNode) => void;
  onRowAddSubtask: (node: SitePlanTaskNode) => void;
  projectId: string;
  setInlineInput: React.Dispatch<React.SetStateAction<{ type: TaskType; parentId: string | null; afterIndex: number; afterTaskId: string | null } | null>>;
  highlightedTaskIds: Set<string>;
  selectedRowIds: Set<string>;
  onRowNumberClick: (node: SitePlanTaskNode, rowNumber: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onUpdateTaskInline: (taskId: string, updates: Partial<SitePlanTaskNode>) => void;
  columnWidths: Record<string, number>;
  selectedTaskId: string | null;
  onHoverTask: (taskId: string | null) => void;
  lastTaskIndex: number;
}

function VirtualRow({ index, style, data }: ListChildComponentProps<VirtualRowData>) {
  if (index >= data.listItems.length) return <div style={style} />;
  const item = data.listItems[index];

  if (item.kind === "add_row_trigger") {
    return (
      <div style={style} className="overflow-hidden">
        <button
          onClick={data.openBottomInlineRow}
          className="w-full h-full text-left pl-10 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 hidden md:flex items-center border-b border-slate-100"
        >
          + Add Row
        </button>
      </div>
    );
  }

  if (item.kind === "inline_input") {
    return (
      <div style={style} className="overflow-hidden">
        <InlineTaskCreateRow
          projectId={data.projectId}
          parentId={item.parentId}
          type={item.type}
          sortOrder={item.sortOrder}
          hiddenColumns={data.hiddenColumns}
          columnWidths={data.columnWidths}
          autoFocusName
          onCreated={(created) => {
            data.setInlineInput((prev) => (prev ? { ...prev, afterTaskId: created.id, afterIndex: prev.afterIndex + 1 } : prev));
          }}
          onCancel={() => data.setInlineInput(null)}
        />
      </div>
    );
  }

  const node = item.node;
  const expanded = data.allExpanded || data.expandedIds.has(node.id);

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
            onToggle={() => data.toggleExpand(node.id)}
            onSelect={data.handleSelect}
            onLogDelay={data.setDelayTask}
            delayCount={data.delayCountMap.get(node.id) ?? 0}
            dragHandleProps={data.editMode ? undefined : dragProvided.dragHandleProps}
            isDragging={dragSnapshot.isDragging}
            depth={data.depthMap.get(node.id) ?? 0}
            rootIndex={data.rootIndexMap.get(node.id) ?? 0}
            editMode={data.editMode}
            isChecked={data.checkedIds.has(node.id)}
            onCheck={data.handleCheck}
            hiddenColumns={data.hiddenColumns}
            isHighlighted={data.highlightedTaskIds.has(node.id)}
            onAddBelow={data.onRowAddBelow}
            onAddSubtask={data.onRowAddSubtask}
            selectedRowIds={data.selectedRowIds}
            onRowNumberClick={data.onRowNumberClick}
            onUpdateTask={data.onUpdateTaskInline}
            columnWidths={data.columnWidths}
            isSelected={data.selectedTaskId === node.id}
            onHoverStart={(taskId) => data.onHoverTask(taskId)}
            onHoverEnd={() => data.onHoverTask(null)}
            isLastVisibleRow={item.taskIndex === data.lastTaskIndex}
            onEnterAddBelow={data.openBottomInlineRow}
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

  const { data: delayLogs } = useProjectDelayLogs(projectId);
  const { pushUndo } = useUndoRedo(updateTask);

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

  // Desktop view mode (URL param): list | gantt | split (default: split)
  const viewParam = searchParams.get("view");
  const desktopView = (viewParam === "list" || viewParam === "gantt" || viewParam === "split" ? viewParam : "split") as "list" | "gantt" | "split";

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

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskIdParam);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [showBaselines, setShowBaselines] = useState(false);
  const [zoom, setZoom] = useState<"day" | "week" | "month" | "quarter">("week");
  const [showDeps, setShowDeps] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [todayTrigger, setTodayTrigger] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [delayTask, setDelayTask] = useState<SitePlanTaskNode | null>(null);
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // ─── Virtual list state ──────────────────────────────────────
  const leftScrollRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (project?.name) setProjectName(project.name);
  }, [project?.name]);

  const handleProjectNameSave = useCallback(
    async (name: string) => {
      const prev = projectName;
      setProjectName(name);
      const { error } = await supabase.from("projects").update({ name }).eq("id", projectId);
      if (error) {
        setProjectName(prev);
        toast.error("Couldn't rename project");
        return;
      }
      toast.success("Project renamed");
    },
    [projectId, projectName]
  );

  const openCreateSheet = useCallback((type: TaskType, parentId: string | null, sortOrder: number, parentNode?: SitePlanTaskNode | null) => {
    setCreateSheetState({ type, parentId, sortOrder, parentNode });
  }, []);

  useEffect(() => {
    setSelectedTaskId(taskIdParam);
  }, [taskIdParam]);

  // Resolve selected task from single selectedTaskId state
  const selectedTask = useMemo(() => {
    if (!selectedTaskId || flatTasks.length === 0) return null;
    return flatTasks.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, flatTasks]);

  const setSelectedTask = useCallback(
    (task: SitePlanTaskNode | null) => {
      setSelectedTaskId(task?.id ?? null);
      updateSearchParams({ task: task?.id ?? null });
    },
    [updateSearchParams]
  );

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

  const { visibleRows } = useTaskFiltering(
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


  const depthMap = useMemo(() => {
    const map = new Map<string, number>();
    const visit = (node: SitePlanTaskNode, d: number) => {
      map.set(node.id, d);
      node.children.forEach((c) => visit(c, d + 1));
    };
    tree.forEach((root) => visit(root, 0));
    return map;
  }, [tree]);

  const rootIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    tree.forEach((root, i) => {
      const mark = (node: SitePlanTaskNode) => {
        map.set(node.id, i);
        node.children.forEach(mark);
      };
      mark(root);
    });
    return map;
  }, [tree]);

  const parentIdSet = useMemo(() => {
    const set = new Set<string>();
    flatTasks.forEach((t) => { if (t.children.length > 0) set.add(t.id); });
    return set;
  }, [flatTasks]);

  const overallProgress = useMemo(
    () => computeWorkProgress(tasks ?? [], parentIdSet),
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

  const openBottomInlineRow = useCallback(() => {
    const parentId = selectedTask?.parent_id ?? null;
    const type: TaskType = "task";
    const sortOrder = visibleRows.filter((row) => row.parent_id === parentId).length;
    setInlineInput({
      type,
      parentId,
      afterIndex: sortOrder,
      afterTaskId: visibleRows.length > 0 ? visibleRows[visibleRows.length - 1].id : null,
    });
    setSelectedTask(null);
  }, [selectedTask, visibleRows, setSelectedTask]);

  /** Row "+" → "Add task below": insert sibling with same type & parent, after the row's subtree */
  const handleRowAddBelow = useCallback((node: SitePlanTaskNode) => {
    const idx = visibleRows.findIndex((r) => r.id === node.id);
    // Walk forward to find the last visible row belonging to this node's subtree
    let lastIdx = idx;
    for (let i = idx + 1; i < visibleRows.length; i++) {
      const row = visibleRows[i];
      // Stop when we reach a sibling or ancestor-level row
      if (row.parent_id === node.parent_id && row.id !== node.id) break;

      lastIdx = i;
    }
    setInlineInput({
      type: node.type,
      parentId: node.parent_id,
      afterIndex: lastIdx + 1,
      afterTaskId: visibleRows[lastIdx]?.id ?? node.id,
    });
    setSelectedTask(null);
  }, [visibleRows, setSelectedTask]);

  /** Row "+" → "Add subtask": insert first/next child under this node */
  const handleRowAddSubtask = useCallback((node: SitePlanTaskNode) => {
    openCreateSheet("task", node.id, node.children.length, node);
  }, [openCreateSheet]);

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
          if (row.parent_id === visibleRows[phaseIdx].parent_id && row.id !== visibleRows[phaseIdx].id) break;
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
  const handleIndent = useCallback(() => {
    if (!selectedTask) return;
    const taskIndex = flatTasks.findIndex((r) => r.id === selectedTask.id);
    if (taskIndex <= 0) return;
    const above = flatTasks[taskIndex - 1];
    if (!above) return;

    pushUndo({
      taskId: selectedTask.id,
      projectId,
      before: { parent_id: selectedTask.parent_id },
      after: { parent_id: above.id },
    });

    updateTask.mutate({
      id: selectedTask.id,
      projectId,
      updates: { parent_id: above.id },
    });
  }, [selectedTask, flatTasks, projectId, pushUndo, updateTask]);

  const handleOutdent = useCallback(() => {
    if (!selectedTask || !selectedTask.parent_id) return;
    const parent = flatTasks.find((r) => r.id === selectedTask.parent_id);
    const grandparentId = parent?.parent_id ?? null;

    pushUndo({
      taskId: selectedTask.id,
      projectId,
      before: { parent_id: selectedTask.parent_id },
      after: { parent_id: grandparentId },
    });

    updateTask.mutate({
      id: selectedTask.id,
      projectId,
      updates: { parent_id: grandparentId },
    });
  }, [selectedTask, flatTasks, projectId, pushUndo, updateTask]);

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

      const moves = rows.map((row, idx) => ({
        id: row.id,
        sort_order: idx,
        parent_id: row.parent_id,
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
  const listItems = useMemo(() => {
    const items: TaskListItem[] = [];
    let taskIndex = 0;
    for (const node of visibleRows) {
      items.push({ kind: "task", node, taskIndex: taskIndex++ });
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
    if (visibleRows.length > 0) {
      items.push({ kind: "add_row_trigger" });
      if (inlineInput && inlineInput.afterTaskId === null) {
        items.push({
          kind: "inline_input",
          parentId: inlineInput.parentId,
          type: inlineInput.type,
          sortOrder: inlineInput.afterIndex,
        });
      }
    }
    return items;
  }, [visibleRows, inlineInput]);

  const rowData = useMemo<VirtualRowData>(() => ({
    listItems,
    allExpanded,
    expandedIds,
    toggleExpand,
    handleSelect,
    setDelayTask,
    delayCountMap,
    depthMap,
    rootIndexMap,
    editMode,
    checkedIds,
    handleCheck,
    hiddenColumns,
    openBottomInlineRow,
    onRowAddBelow: handleRowAddBelow,
    onRowAddSubtask: handleRowAddSubtask,
    projectId,
    setInlineInput,
    highlightedTaskIds,
    selectedRowIds,
    onRowNumberClick: handleRowNumberClick,
    onUpdateTaskInline: handleUpdateTaskInline,
    columnWidths,
    selectedTaskId,
    onHoverTask: setHoveredTaskId,
    lastTaskIndex: visibleRows.length - 1,
  }), [
    allExpanded,
    checkedIds,
    columnWidths,
    delayCountMap,
    editMode,
    expandedIds,
    handleCheck,
    handleRowAddBelow,
    handleRowAddSubtask,
    handleRowNumberClick,
    handleSelect,
    handleUpdateTaskInline,
    hiddenColumns,
    highlightedTaskIds,
    listItems,
    openBottomInlineRow,
    depthMap,
    rootIndexMap,
    projectId,
    selectedRowIds,
    selectedTaskId,
    toggleExpand,
    visibleRows.length,
  ]);

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
      if (firstIdx >= 0 && leftScrollRef.current) {
        leftScrollRef.current.scrollTo({ top: firstIdx * DESKTOP_ROW_HEIGHT, behavior: "smooth" });
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
  }, [listItems]);


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







  const hasChildrenForSelected = selectedTask
    ? (tasks ?? []).some((t) => t.parent_id === selectedTask.id)
    : false;

  return (
    <>
      <div className="relative flex h-full flex-col bg-white">
        {/* Toolbar */}
        <SitePlanToolbar
          projectName={projectName || project?.name || "Loading..."}
          onProjectNameSave={handleProjectNameSave}
          zoom={zoom}
          setZoom={setZoom}
          showDeps={showDeps}
          setShowDeps={setShowDeps}
          showCriticalPath={showCriticalPath}
          setShowCriticalPath={setShowCriticalPath}
          onOpenBaseline={() => setShowBaselines(true)}
          onOpenImport={() => setShowImport(true)}
          onToday={() => setTodayTrigger((v) => v + 1)}
        />
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-1.5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 tabular-nums">{overallProgress}%</span>
            <div className="flex-1">
              <ProgressBar value={overallProgress} />
            </div>
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() =>
                updateSearchParams({ mobileTab: mobileTab === "gantt" ? null : "gantt" })
              }
              title={mobileTab === "gantt" ? "Switch to list view" : "Switch to timeline view"}
            >
              {mobileTab === "gantt" ? (
                <ListTodo className="h-4 w-4 text-slate-500" />
              ) : (
                <BarChart3 className="h-4 w-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {/* Panes area: horizontal layout for task list and/or Gantt */}
        <div
          className="flex flex-1 min-h-0"
        >
          {/* Left pane: task list (hidden on desktop in gantt-only view) */}
          <div className={`flex flex-col min-w-0 ${
            desktopView === "gantt" ? "md:hidden" : ""
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
                    onClick={() => openCreateSheet("task", null, 0)}
                    className="hidden md:flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg min-h-[44px]"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Phase
                  </button>
                  <button
                    onClick={() => startInlineAdd("task")}
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
              {desktopView !== "list" && (
                <GanttWrapper
                  tasks={tasks ?? []}
                  visibleRows={visibleRows}
                  listItems={listItems}
                  zoom={zoom}
                  showDeps={showDeps}
                  showCriticalPath={showCriticalPath}
                  todayTrigger={todayTrigger}
                  selectedTaskId={selectedTaskId}
                  hoveredTaskId={hoveredTaskId}
                  onTaskClick={handleGanttTaskClick}
                  renderLeftRows={({ height, onScroll, setOuterRef }) => (
                    <Droppable
                      droppableId="task-list"
                      mode="virtual"
                      renderClone={(provided, _snapshot, rubric) => {
                        const srcNode = visibleRows[rubric.source.index];
                        return (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ height: DESKTOP_ROW_HEIGHT, overflow: "hidden", ...provided.draggableProps.style }}>
                            {srcNode && (
                              <TaskRow
                                node={srcNode}
                                rowNumber={rubric.source.index + 1}
                                expanded={false}
                                onToggle={() => {}}
                                onSelect={() => {}}
                                isDragging
                                depth={depthMap.get(srcNode.id) ?? 0}
                                rootIndex={rootIndexMap.get(srcNode.id) ?? 0}
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
                          height={height}
                          itemCount={listItems.length + (snapshot.isUsingPlaceholder ? 1 : 0)}
                          itemSize={DESKTOP_ROW_HEIGHT}
                          outerRef={(el) => {
                            provided.innerRef(el);
                            setOuterRef(el);
                          }}
                          itemData={rowData}
                          onScroll={onScroll}
                          width="100%"
                          overscanCount={5}
                        >
                          {VirtualRow}
                        </FixedSizeList>
                      )}
                    </Droppable>
                  )}
                  onRightPanelScroll={() => {}}
                  leftScrollRef={leftScrollRef}
                  leftHeader={(
                    <TaskListHeader
                      hiddenColumns={hiddenColumns}
                      columnWidths={columnWidths}
                      onToggleColumn={handleToggleColumn}
                      onColumnResize={handleColumnResize}
                    />
                  )}
                  expandedIds={expandedIds}
                  allExpanded={allExpanded}
                  toggleExpand={toggleExpand}
                  handleSelect={handleSelect}
                  setDelayTask={setDelayTask}
                  delayCountMap={delayCountMap}
                  editMode={editMode}
                  checkedIds={checkedIds}
                  handleCheck={handleCheck}
                  openBottomInlineRow={openBottomInlineRow}
                  onRowAddBelow={handleRowAddBelow}
                  onRowAddSubtask={handleRowAddSubtask}
                  projectId={projectId}
                  setInlineInput={setInlineInput}
                  highlightedTaskIds={highlightedTaskIds}
                  selectedRowIds={selectedRowIds}
                  onRowNumberClick={handleRowNumberClick}
                  onUpdateTaskInline={handleUpdateTaskInline}
                  onHoverTask={setHoveredTaskId}
                />
              )}

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
                depthMap={depthMap}
                rootIndexMap={rootIndexMap}
                refetch={refetch}
              />
            </DragDropContext>
          )}
          </div>
          </div>

          {/* Task edit panel (desktop, non-edit mode) */}
          <div
            className={`hidden xl:block overflow-hidden transition-all duration-200 ${
              selectedTask && !editMode ? "w-[340px] shrink-0" : "w-0"
            }`}
          >
            {selectedTask && !editMode && (
              <TaskEditPanel
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                hasChildren={hasChildrenForSelected}
                className="w-[340px] shrink-0 border-l border-slate-200"
                onAddSubtask={() =>
                  openCreateSheet("task", selectedTask.id, selectedTask.children.length, selectedTask)
                }
              />
            )}
          </div>
        </div>

      {/* Mobile/tablet task edit panel (non-edit mode only) */}
      {selectedTask && !editMode && (
        <div className="xl:hidden">
          <TaskEditPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            hasChildren={hasChildrenForSelected}
            onAddSubtask={() =>
              startInlineAdd("task", selectedTask.id)
            }
          />
        </div>
      )}

      {/* Desktop task creation sheet */}
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
