"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, BarChart3, ListTodo } from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { FixedSizeList } from "react-window";
import type { ListChildComponentProps } from "react-window";
import { toast } from "sonner";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks, useUpdateTask, useReorderTask } from "@/hooks/useSitePlanTasks";
import { useProjectDelayLogs } from "@/hooks/useSitePlanDelays";
import { useSitePlanBaselines } from "@/hooks/useSitePlanBaselines";
import { computeWorkProgress } from "@/types/siteplan";
import type { SitePlanTaskNode, SitePlanTask, TaskType } from "@/types/siteplan";
import { useTaskTree } from "@/hooks/useTaskTree";
import { useTaskFiltering } from "@/hooks/useTaskFiltering";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { DelayLogDialog } from "../components/DelayLogDialog";
import { ImportPanel } from "../components/ImportPanel";
import { SitePlanToolbar, EMPTY_FILTER, isFilterActive } from "../components/SitePlanToolbar";
import { BaselineDialog } from "../components/BaselineDialog";
import { AddTaskFAB } from "../components/AddTaskFAB";
import { CreateTaskSheet } from "../components/CreateTaskSheet";
import { ProgressBar } from "../components/ProgressSlider";
import { TaskListSkeleton } from "../components/Skeleton";
import { DESKTOP_ROW_HEIGHT, GanttWrapper } from "../components/GanttWrapper";
import type { TaskListItem } from "../components/GanttWrapper";
import { SitePlanMobileView } from "../components/SitePlanMobileView";
import { QueryProvider } from "@/components/QueryProvider";
import { supabase } from "@/lib/supabase";
import { TaskRow } from "../components/TaskRow";
import { InlineTaskCreateRow } from "../components/InlineTaskCreateRow";
import { TaskListHeader } from "../components/TaskListHeader";
import { useUndoRedo } from "../hooks/useUndoRedo";
import { useSitePlanUrl } from "../hooks/useSitePlanUrl";
import { useColumnSettings } from "../hooks/useColumnSettings";
import { useTaskActions } from "../hooks/useTaskActions";

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
          onCreated={() => data.setInlineInput(null)}
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
            dragHandleProps={dragProvided.dragHandleProps}
            isDragging={dragSnapshot.isDragging}
            depth={data.depthMap.get(node.id) ?? 0}
            rootIndex={data.rootIndexMap.get(node.id) ?? 0}
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
  const handleMutateError = useCallback(() => {
    toast.error("Failed to save. Please try again.");
  }, []);

  const { data: delayLogs } = useProjectDelayLogs(projectId);
  const { data: baselines } = useSitePlanBaselines(projectId);
  const { pushUndo } = useUndoRedo(updateTask);
  const {
    updateSearchParams,
    mobileTab,
    handleMobileTabChange,
    desktopView,
    filter,
    setFilter,
    taskIdParam,
    expandedIdsParam,
  } = useSitePlanUrl({ searchParams, pathname, router });
  const activeBaselineTasks = useMemo(
    () =>
      ((baselines?.[0]?.snapshot as unknown as SitePlanTask[] | undefined) ??
        []),
    [baselines]
  );

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

  // Derive expandedIds from URL and initialise the task tree hook
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

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskIdParam);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [showBaselines, setShowBaselines] = useState(false);
  const [zoom, setZoom] = useState<"day" | "week" | "month" | "quarter">("week");
  const [showDeps, setShowDeps] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [todayTrigger, setTodayTrigger] = useState(0);
  const [projectName, setProjectName] = useState("");
  const lastServerProjectNameRef = useRef("");
  const [delayTask, setDelayTask] = useState<SitePlanTaskNode | null>(null);
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Virtual list state ──────────────────────────────────────
  const leftScrollRef = useRef<HTMLDivElement | null>(null);

  const { hiddenColumns, columnWidths, handleToggleColumn, handleColumnResize } = useColumnSettings();
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [lastSelectedRowNumber, setLastSelectedRowNumber] = useState<number | null>(null);

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
    if (!project?.name) return;
    setProjectName((current) => {
      if (current === "" || current === lastServerProjectNameRef.current) {
        return project.name;
      }
      return current;
    });
    lastServerProjectNameRef.current = project.name;
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
      lastServerProjectNameRef.current = name;
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
    [tasks, parentIdSet]
  );

  const {
    handleSelect,
    handleUpdateTaskInline,
    handleRowNumberClick,
    handleRowAddBelow,
    handleRowAddSubtask,
    handleFABAdd,
    startInlineAdd,
    handleIndent,
    handleOutdent,
    handleDragEnd,
    handleGanttTaskClick,
    handleGanttDateChange,
    openBottomInlineRow,
  } = useTaskActions({
    tasks,
    visibleRows,
    flatTasks,
    selectedTask,
    setSelectedTask,
    setInlineInput,
    projectId,
    updateTask,
    reorderTask,
    openCreateSheet,
    pushUndo,
    handleMutateError,
    setSelectedRowIds,
    lastSelectedRowNumber,
    setLastSelectedRowNumber,
  });

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
    columnWidths,
    delayCountMap,
    expandedIds,
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
    visibleRows,
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
            <div className="flex-1 min-h-0 md:flex">
              <div className="flex-1 overflow-auto pb-20 md:pb-4">
                <TaskListSkeleton />
              </div>
              <div className="hidden md:flex flex-1 items-center justify-center border-l border-slate-200 text-slate-400 text-sm">
                Loading Gantt chart…
              </div>
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
                    No tasks yet. Add your first phase or import a programme.
                  </p>
                  <button
                    onClick={() => openCreateSheet("phase", null, 0)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg min-h-[44px]"
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
                  isLoading={isLoading}
                  baselines={activeBaselineTasks}
                  delayLogs={delayLogs ?? []}
                  visibleRows={visibleRows}
                  listItems={listItems}
                  zoom={zoom}
                  showDeps={showDeps}
                  showCriticalPath={showCriticalPath}
                  todayTrigger={todayTrigger}
                  selectedTaskId={selectedTaskId}
                  hoveredTaskId={hoveredTaskId}
                  onTaskClick={handleGanttTaskClick}
                  onDateChange={handleGanttDateChange}
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
                mobileInlineInput={inlineInput}
                onMobileInlineCreated={() => setInlineInput(null)}
                onMobileInlineCancel={() => setInlineInput(null)}
                zoom={zoom}
                showDeps={showDeps}
                showCriticalPath={showCriticalPath}
                selectedTaskId={selectedTaskId}
                hoveredTaskId={hoveredTaskId}
                todayTrigger={todayTrigger}
                onGanttTaskClick={handleGanttTaskClick}
                onGanttDateChange={handleGanttDateChange}
              />
            </DragDropContext>
          )}
          </div>
          </div>

          {/* Task edit panel (desktop, non-edit mode) */}
          <div
            className={`hidden xl:block overflow-hidden transition-all duration-200 ${
              selectedTask ? "w-[340px] shrink-0" : "w-0"
            }`}
          >
            {selectedTask && (
              <TaskEditPanel
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                hasChildren={hasChildrenForSelected}
                className="w-[340px] shrink-0 border-l border-slate-200"
                onAddSubtask={() =>
                  openCreateSheet("task", selectedTask.id, selectedTask.children.length, selectedTask)
                }
                onLogDelay={() => setDelayTask(selectedTask)}
              />
            )}
          </div>
        </div>

      {/* Mobile/tablet task edit panel */}
      {selectedTask && (
        <div className="xl:hidden">
          <TaskEditPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            hasChildren={hasChildrenForSelected}
            onAddSubtask={() =>
              startInlineAdd("task", selectedTask.id)
            }
            onLogDelay={() => setDelayTask(selectedTask)}
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
