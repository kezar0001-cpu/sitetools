"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks, useUpdateTask, useReorderTask } from "@/hooks/useSitePlanTasks";
import { useSitePlanBaselines } from "@/hooks/useSitePlanBaselines";
import { useProjectDelayLogs } from "@/hooks/useSitePlanDelays";
import { buildTaskTree, flattenTree, computeWorkProgress } from "@/types/siteplan";
import type { SitePlanTaskNode, SitePlanTask, TaskType, TaskStatus } from "@/types/siteplan";
import { TaskRow, TaskListHeader, MobileTaskCard } from "../components/TaskRow";
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
import { ProgressBar } from "../components/ProgressSlider";
import { TaskListSkeleton } from "../components/Skeleton";
import { QueryProvider } from "@/components/QueryProvider";

// ─── Undo/Redo stack ────────────────────────────────────────

interface UndoEntry {
  taskId: string;
  projectId: string;
  before: Partial<SitePlanTask>;
  after: Partial<SitePlanTask>;
}

function useUndoRedo(updateTask: ReturnType<typeof useUpdateTask>) {
  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);
  const [revision, setRevision] = useState(0);

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

  return {
    pushUndo,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    revision,
  };
}

// ─── Filter logic ───────────────────────────────────────────

function applyFilter(
  rows: SitePlanTaskNode[],
  filter: TaskFilter
): SitePlanTaskNode[] {
  if (!isFilterActive(filter)) return rows;
  return rows.filter((node) => {
    if (filter.status.length > 0 && !filter.status.includes(node.status))
      return false;
    if (filter.type.length > 0 && !filter.type.includes(node.type))
      return false;
    if (
      filter.assignedTo &&
      !(node.assigned_to ?? "")
        .toLowerCase()
        .includes(filter.assignedTo.toLowerCase())
    )
      return false;
    if (
      filter.search &&
      !node.name.toLowerCase().includes(filter.search.toLowerCase())
    )
      return false;
    return true;
  });
}

// ─── Main page ──────────────────────────────────────────────

function ProjectDetailInner() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  const { data: project } = useSitePlanProject(projectId);
  const { data: tasks, isLoading } = useSitePlanTasks(projectId);
  const updateTask = useUpdateTask();
  const reorderTask = useReorderTask();
  const { data: baselines } = useSitePlanBaselines(projectId);

  const { data: delayLogs } = useProjectDelayLogs(projectId);
  const { pushUndo, undo, redo, canUndo, canRedo } = useUndoRedo(updateTask);

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

  // Derive filter from URL search params
  const filter = useMemo<TaskFilter>(() => {
    const filterParam = searchParams.get("filter");
    const searchParam = searchParams.get("search");
    const assignedParam = searchParams.get("assignedTo");
    const typeParam = searchParams.get("type");

    // Support predefined filter aliases (used by Summary page links)
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

  // Derive expandedIds from URL
  const expandedIdsParam = searchParams.get("expanded");
  const [expandedIds, setExpandedIdsState] = useState<Set<string>>(() =>
    expandedIdsParam ? new Set(expandedIdsParam.split(",")) : new Set()
  );
  const [allExpanded, setAllExpanded] = useState(!expandedIdsParam);
  const [mobileExpandedIds, setMobileExpandedIds] = useState<Set<string>>(new Set());

  // Derive selected task from URL
  const taskIdParam = searchParams.get("task");

  // Find selected task from URL param or local state
  const [selectedTaskLocal, setSelectedTaskLocal] = useState<SitePlanTaskNode | null>(null);

  const setExpandedIds = useCallback(
    (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      setExpandedIdsState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        // Persist to URL (but only if not all-expanded)
        const ids = Array.from(next).join(",");
        updateSearchParams({ expanded: ids || null });
        return next;
      });
    },
    [updateSearchParams]
  );

  const [showImport, setShowImport] = useState(false);
  const [showBaselines, setShowBaselines] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [delayTask, setDelayTask] = useState<SitePlanTaskNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inline input state
  const [inlineInput, setInlineInput] = useState<{
    type: TaskType;
    parentId: string | null;
    afterIndex: number;
  } | null>(null);

  const tree = useMemo(() => (tasks ? buildTaskTree(tasks) : []), [tasks]);

  // Flatten for link dialog
  const flatTasks = useMemo(() => flattenTree(tree), [tree]);

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

  // Visible rows based on expanded state
  const visibleRows = useMemo(() => {
    const rows: SitePlanTaskNode[] = [];
    const walk = (nodes: SitePlanTaskNode[]) => {
      for (const node of nodes) {
        rows.push(node);
        if (
          node.children.length > 0 &&
          (allExpanded || expandedIds.has(node.id))
        ) {
          walk(node.children);
        }
      }
    };
    walk(tree);
    return applyFilter(rows, filter);
  }, [tree, expandedIds, allExpanded, filter]);

  const overallProgress = useMemo(
    () => computeWorkProgress(tasks ?? []),
    [tasks]
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleMobileExpand = useCallback((id: string) => {
    setMobileExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = () => {
    setAllExpanded((prev) => !prev);
    setExpandedIds(new Set());
  };

  const handleSelect = (node: SitePlanTaskNode) => {
    setSelectedTask(node);
    setInlineInput(null);
  };

  /** Add a new row at the same indent level as the currently selected row */
  const handleAddRow = useCallback(() => {
    const type: TaskType = selectedTask?.type ?? "task";
    const parentId = selectedTask?.parent_id ?? null;
    setInlineInput({
      type,
      parentId,
      afterIndex: tasks?.length ?? 0,
    });
    setSelectedTask(null);
  }, [selectedTask, tasks]);

  const handleFABAdd = (type: TaskType) => {
    setInlineInput({
      type,
      parentId: null,
      afterIndex: tasks?.length ?? 0,
    });
    setSelectedTask(null);
  };

  const startInlineAdd = (
    type: TaskType,
    parentId: string | null = null
  ) => {
    setInlineInput({
      type,
      parentId,
      afterIndex: tasks?.length ?? 0,
    });
    setSelectedTask(null);
  };

  // ─── Indent / Outdent ──────────────────────────────────────

  const indentTask = useCallback(
    (taskId: string, newType: TaskType) => {
      // Determine new parent based on type
      let newParentId: string | null = null;
      if (newType === "task" || newType === "subtask") {
        const taskIndex = visibleRows.findIndex((r) => r.id === taskId);
        for (let i = taskIndex - 1; i >= 0; i--) {
          const prev = visibleRows[i];
          if (newType === "task" && prev.type === "phase") {
            newParentId = prev.id;
            break;
          }
          if (newType === "subtask" && prev.type === "task") {
            newParentId = prev.id;
            break;
          }
        }
      }

      updateTask.mutate({
        id: taskId,
        projectId,
        updates: { type: newType, parent_id: newParentId },
      });
    },
    [visibleRows, updateTask, projectId]
  );

  const handleIndent = useCallback(() => {
    if (!selectedTask) return;
    const newType: TaskType =
      selectedTask.type === "phase" ? "task" : "subtask";
    pushUndo({
      taskId: selectedTask.id,
      projectId,
      before: { type: selectedTask.type },
      after: { type: newType },
    });
    indentTask(selectedTask.id, newType);
  }, [selectedTask, projectId, pushUndo, indentTask]);

  const handleOutdent = useCallback(() => {
    if (!selectedTask) return;
    const newType: TaskType =
      selectedTask.type === "subtask" ? "task" : "phase";
    pushUndo({
      taskId: selectedTask.id,
      projectId,
      before: { type: selectedTask.type },
      after: { type: newType },
    });
    indentTask(selectedTask.id, newType);
  }, [selectedTask, projectId, pushUndo, indentTask]);

  // ─── Link / Unlink ────────────────────────────────────────

  const handleLinkTasks = () => {
    if (!selectedTask) return;
    setShowLinkDialog(true);
  };

  const handleUnlinkTask = () => {
    if (!selectedTask) return;
    pushUndo({
      taskId: selectedTask.id,
      projectId,
      before: { predecessors: selectedTask.predecessors },
      after: { predecessors: null },
    });
    updateTask.mutate({
      id: selectedTask.id,
      projectId,
      updates: { predecessors: null },
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

  // ─── View navigation ─────────────────────────────────────

  const handleViewChange = (view: "list" | "gantt" | "summary" | "daily") => {
    if (view === "list") return; // already on list
    router.push(`/site-plan/${projectId}/${view}`);
  };

  // ─── Drag and drop ──────────────────────────────────────────

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination || source.index === destination.index) return;

      const rows = [...visibleRows];
      const [moved] = rows.splice(source.index, 1);
      rows.splice(destination.index, 0, moved);

      // Determine the new parent_id based on surrounding rows
      let newParentId: string | null = moved.parent_id;
      const dest = destination.index;

      if (dest === 0) {
        // Dropped at top — becomes a root-level item (keep type)
        newParentId = null;
      } else {
        // Look at the row above the destination to infer parent
        const above = rows[dest - 1];
        if (moved.type === "subtask") {
          // Subtask should nest under a task
          if (above.type === "task") newParentId = above.id;
          else if (above.type === "subtask") newParentId = above.parent_id;
          else newParentId = null;
        } else if (moved.type === "task") {
          // Task nests under a phase
          if (above.type === "phase") newParentId = above.id;
          else if (above.type === "task" || above.type === "subtask")
            newParentId = above.parent_id;
          else newParentId = null;
        } else {
          // Phase — always root
          newParentId = null;
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
        if (selectedTask.type !== "subtask") handleIndent();
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        if (selectedTask.type !== "phase") handleOutdent();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedTask, handleIndent, handleOutdent]);

  // Compute phase index for accent coloring
  const phaseIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const row of visibleRows) {
      if (row.type === "phase") {
        map.set(row.id, idx);
        idx++;
      }
    }
    // For non-phase tasks, inherit from parent
    for (const row of visibleRows) {
      if (row.type !== "phase" && row.parent_id) {
        map.set(row.id, map.get(row.parent_id) ?? 0);
      }
    }
    return map;
  }, [visibleRows]);

  const hasChildrenForSelected = selectedTask
    ? (tasks ?? []).some((t) => t.parent_id === selectedTask.id)
    : false;

  return (
    <div
      ref={containerRef}
      className={`flex h-full bg-white ${isFullscreen ? "fixed inset-0 z-[100]" : ""}`}
    >
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Project header */}
        <div className="px-4 py-2 border-b border-slate-200 bg-white">
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
          onAddRow={handleAddRow}
          onSaveBaseline={() => setShowBaselines(true)}
          baselineCount={baselines?.length ?? 0}
          currentView="list"
          onViewChange={handleViewChange}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Task list */}
        <div className="flex-1 overflow-auto pb-20 md:pb-4">
          {isLoading ? (
            <TaskListSkeleton />
          ) : visibleRows.length === 0 && !inlineInput ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
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
                  <button
                    onClick={() => startInlineAdd("phase")}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg min-h-[44px]"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Phase
                  </button>
                </>
              )}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <TaskListHeader />

              <Droppable droppableId="task-list">
                {(droppableProvided) => (
                  <div
                    ref={droppableProvided.innerRef}
                    {...droppableProvided.droppableProps}
                  >
                    {visibleRows.map((node, idx) => (
                      <Draggable
                        key={node.id}
                        draggableId={node.id}
                        index={idx}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                          >
                            {/* Desktop: spreadsheet row */}
                            <TaskRow
                              node={node}
                              rowNumber={idx + 1}
                              expanded={
                                allExpanded || expandedIds.has(node.id)
                              }
                              onToggle={() => toggleExpand(node.id)}
                              onSelect={handleSelect}
                              onLogDelay={(t) => setDelayTask(t)}
                              delayCount={delayCountMap.get(node.id) ?? 0}
                              dragHandleProps={dragProvided.dragHandleProps}
                              isDragging={dragSnapshot.isDragging}
                              phaseIndex={phaseIndexMap.get(node.id) ?? 0}
                            />

                            {/* Mobile: card view */}
                            <MobileTaskCard
                              node={node}
                              onSelect={handleSelect}
                              onLogDelay={(t) => setDelayTask(t)}
                              delayCount={delayCountMap.get(node.id) ?? 0}
                              mobileExpanded={mobileExpandedIds.has(node.id)}
                              onToggleMobileExpand={() =>
                                toggleMobileExpand(node.id)
                              }
                              dragHandleProps={dragProvided.dragHandleProps}
                              isDragging={dragSnapshot.isDragging}
                            />

                            {!dragSnapshot.isDragging &&
                              node.type === "phase" &&
                              (allExpanded || expandedIds.has(node.id)) &&
                              (idx === visibleRows.length - 1 ||
                                visibleRows[idx + 1]?.type === "phase") && (
                                <button
                                  onClick={() =>
                                    startInlineAdd("task", node.id)
                                  }
                                  className="w-full text-left pl-16 py-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 min-h-[32px] md:border-l-0 border-l-4 border-l-slate-600"
                                >
                                  + Add Task
                                </button>
                              )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {droppableProvided.placeholder}
                  </div>
                )}
              </Droppable>

              {inlineInput && (
                <InlineTaskInput
                  projectId={projectId}
                  contextParentId={inlineInput.parentId}
                  contextType={inlineInput.type}
                  sortOrder={inlineInput.afterIndex}
                  onCancel={() => setInlineInput(null)}
                />
              )}

              {!inlineInput && visibleRows.length > 0 && (
                <button
                  onClick={() => startInlineAdd("phase")}
                  className="w-full text-left pl-10 py-2.5 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 border-b border-slate-100 min-h-[36px]"
                >
                  + Add Phase
                </button>
              )}
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Right panel — task edit */}
      {selectedTask && (
        <div className="hidden md:block">
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

      {selectedTask && (
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
          allTasks={tasks ?? []}
          projectId={projectId}
          onClose={() => setDelayTask(null)}
        />
      )}

      <AddTaskFAB onAdd={handleFABAdd} currentType={selectedTask?.type ?? "task"} />
      <SitePlanBottomNav projectId={projectId} />
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <QueryProvider>
      <ProjectDetailInner />
    </QueryProvider>
  );
}
