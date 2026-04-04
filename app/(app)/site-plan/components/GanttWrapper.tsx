"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { FixedSizeList } from "react-window";
import type { ListChildComponentProps } from "react-window";
import type { SitePlanTask, SitePlanTaskNode, TaskType } from "@/types/siteplan";
import { TaskRow } from "./TaskRow";
import { TaskListHeader } from "./TaskListHeader";
import { GanttChart } from "./GanttChart";
import { InlineTaskCreateRow } from "./InlineTaskCreateRow";

export const DESKTOP_ROW_HEIGHT = 40;

type TaskListItem =
  | { kind: "task"; node: SitePlanTaskNode; taskIndex: number }
  | { kind: "add_row_trigger" }
  | { kind: "inline_input"; parentId: string | null; type: TaskType; sortOrder: number };

interface GanttWrapperProps {
  tasks: SitePlanTask[];
  flatTasks: SitePlanTaskNode[];
  visibleRows: SitePlanTaskNode[];
  listItems: TaskListItem[];
  zoom: "day" | "week" | "month" | "quarter";
  showDeps: boolean;
  showCriticalPath: boolean;
  todayTrigger: number;
  selectedTaskId: string | null;
  hoveredTaskId: string | null;
  onTaskClick: (task: SitePlanTask) => void;
  onRightPanelScroll?: (scrollTop: number) => void;
  leftScrollRef: React.MutableRefObject<HTMLDivElement | null>;
  hiddenColumns: Set<string>;
  columnWidths: Record<string, number>;
  onToggleColumn: (col: string) => void;
  onColumnResize: (col: string, width: number) => void;
  phaseIndexMap: Map<string, number>;
  expandedIds: Set<string>;
  allExpanded: boolean;
  toggleExpand: (id: string) => void;
  handleSelect: (node: SitePlanTaskNode) => void;
  setDelayTask: (node: SitePlanTaskNode | null) => void;
  delayCountMap: Map<string, number>;
  editMode: boolean;
  checkedIds: Set<string>;
  handleCheck: (node: SitePlanTaskNode, checked: boolean) => void;
  openBottomInlineRow: () => void;
  onRowAddBelow: (node: SitePlanTaskNode) => void;
  onRowAddSubtask: (node: SitePlanTaskNode) => void;
  projectId: string;
  setInlineInput: React.Dispatch<React.SetStateAction<{ type: TaskType; parentId: string | null; afterIndex: number; afterTaskId: string | null } | null>>;
  highlightedTaskIds: Set<string>;
  selectedRowIds: Set<string>;
  onRowNumberClick: (node: SitePlanTaskNode, rowNumber: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onUpdateTaskInline: (taskId: string, updates: Partial<SitePlanTaskNode>) => void;
  onHoverTask: (taskId: string | null) => void;
}

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
    openBottomInlineRow,
    onRowAddBelow,
    onRowAddSubtask,
    projectId,
    setInlineInput,
    highlightedTaskIds,
    selectedRowIds,
    onRowNumberClick,
    onUpdateTaskInline,
    columnWidths,
    selectedTaskId,
    onHoverTask,
    lastTaskIndex,
  } = data;

  if (index >= listItems.length) return <div style={style} />;
  const item = listItems[index];

  if (item.kind === "add_row_trigger") {
    return (
      <div style={style} className="overflow-hidden">
        <button
          onClick={openBottomInlineRow}
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
          projectId={projectId}
          parentId={item.parentId}
          type={item.type}
          sortOrder={item.sortOrder}
          hiddenColumns={hiddenColumns}
          columnWidths={columnWidths}
          autoFocusName
          onCreated={(created) => {
            setInlineInput((prev) => (prev ? { ...prev, afterTaskId: created.id, afterIndex: prev.afterIndex + 1 } : prev));
          }}
          onCancel={() => setInlineInput(null)}
        />
      </div>
    );
  }

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
            isSelected={selectedTaskId === node.id}
            onHoverStart={(taskId) => onHoverTask(taskId)}
            onHoverEnd={() => onHoverTask(null)}
            isLastVisibleRow={item.taskIndex === lastTaskIndex}
            onEnterAddBelow={openBottomInlineRow}
          />
        </div>
      )}
    </Draggable>
  );
}

export function GanttWrapper(props: GanttWrapperProps) {
  const {
    tasks,
    visibleRows,
    listItems,
    zoom,
    showDeps,
    showCriticalPath,
    todayTrigger,
    selectedTaskId,
    hoveredTaskId,
    onTaskClick,
    onRightPanelScroll,
    leftScrollRef,
  } = props;

  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<FixedSizeList<VirtualRowData>>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScrollRef = useRef(false);
  const [desktopListHeight, setDesktopListHeight] = useState(500);
  const [stickyPhaseNode, setStickyPhaseNode] = useState<SitePlanTaskNode | null>(null);

  const rowData = useMemo<VirtualRowData>(() => ({
    listItems,
    allExpanded: props.allExpanded,
    expandedIds: props.expandedIds,
    toggleExpand: props.toggleExpand,
    handleSelect: props.handleSelect,
    setDelayTask: props.setDelayTask,
    delayCountMap: props.delayCountMap,
    phaseIndexMap: props.phaseIndexMap,
    editMode: props.editMode,
    checkedIds: props.checkedIds,
    handleCheck: props.handleCheck,
    hiddenColumns: props.hiddenColumns,
    openBottomInlineRow: props.openBottomInlineRow,
    onRowAddBelow: props.onRowAddBelow,
    onRowAddSubtask: props.onRowAddSubtask,
    projectId: props.projectId,
    setInlineInput: props.setInlineInput,
    highlightedTaskIds: props.highlightedTaskIds,
    selectedRowIds: props.selectedRowIds,
    onRowNumberClick: props.onRowNumberClick,
    onUpdateTaskInline: props.onUpdateTaskInline,
    columnWidths: props.columnWidths,
    selectedTaskId,
    onHoverTask: props.onHoverTask,
    lastTaskIndex: visibleRows.length - 1,
  }), [listItems, props, selectedTaskId, visibleRows.length]);

  useEffect(() => {
    const el = desktopContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setDesktopListHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedTaskId || !leftScrollRef.current) return;
    const selectedIndex = visibleRows.findIndex((row) => row.id === selectedTaskId);
    if (selectedIndex < 0) return;
    leftScrollRef.current.scrollTo({ top: selectedIndex * DESKTOP_ROW_HEIGHT, behavior: "smooth" });
  }, [selectedTaskId, visibleRows, leftScrollRef]);

  const handleVirtualScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    const topItemIndex = Math.floor(scrollOffset / DESKTOP_ROW_HEIGHT);
    if (topItemIndex === 0) return setStickyPhaseNode(null);
    const topItem = listItems[topItemIndex];
    if (topItem?.kind === "task" && topItem.node.type === "phase") return setStickyPhaseNode(null);
    let found: SitePlanTaskNode | null = null;
    for (let i = topItemIndex - 1; i >= 0; i--) {
      const item = listItems[i];
      if (item?.kind === "task" && item.node.type === "phase") {
        found = item.node;
        break;
      }
    }
    setStickyPhaseNode((prev) => (prev?.id === found?.id ? prev : found));
  }, [listItems]);

  const handleRightPanelScroll = useCallback((scrollTop: number) => {
    if (isSyncingScrollRef.current || !leftScrollRef.current) return;
    isSyncingScrollRef.current = true;
    leftScrollRef.current.scrollTop = scrollTop;
    onRightPanelScroll?.(scrollTop);
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }, [leftScrollRef, onRightPanelScroll]);

  useEffect(() => {
    const leftEl = leftScrollRef.current;
    if (!leftEl || !rightScrollRef.current) return;
    const onLeftScroll = () => {
      if (isSyncingScrollRef.current || !rightScrollRef.current) return;
      isSyncingScrollRef.current = true;
      rightScrollRef.current.scrollTop = leftEl.scrollTop;
      requestAnimationFrame(() => {
        isSyncingScrollRef.current = false;
      });
    };
    leftEl.addEventListener("scroll", onLeftScroll, { passive: true });
    return () => leftEl.removeEventListener("scroll", onLeftScroll);
  }, [leftScrollRef, desktopListHeight, listItems.length]);

  return (
    <div className="hidden md:flex flex-1 min-w-0 overflow-hidden">
      <div className="flex flex-col min-w-0 flex-1">
        <TaskListHeader
          hiddenColumns={props.hiddenColumns}
          onToggleColumn={props.onToggleColumn}
          columnWidths={props.columnWidths}
          onColumnResize={props.onColumnResize}
        />
        {stickyPhaseNode && (
          <div className="shrink-0 bg-slate-800 border-b border-slate-700 px-3 py-1 flex items-center gap-2 z-[5]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phase</span>
            <span className="text-xs font-semibold text-white truncate">{stickyPhaseNode.name}</span>
          </div>
        )}
        <div className="flex-1 min-h-0" ref={desktopContainerRef}>
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
                      phaseIndex={props.phaseIndexMap.get(srcNode.id) ?? 0}
                      hiddenColumns={props.hiddenColumns}
                      selectedRowIds={props.selectedRowIds}
                      onRowNumberClick={props.onRowNumberClick}
                      onUpdateTask={props.onUpdateTaskInline}
                      columnWidths={props.columnWidths}
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
                outerRef={(el) => {
                  provided.innerRef(el);
                  leftScrollRef.current = el;
                }}
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
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        {tasks.length > 0 ? (
          <GanttChart
            tasks={tasks}
            zoom={zoom}
            showDependencies={showDeps}
            showCriticalPath={showCriticalPath}
            selectedTaskId={selectedTaskId}
            hoveredTaskId={hoveredTaskId}
            onTaskClick={onTaskClick}
            todayTrigger={todayTrigger}
            scrollContainerRef={rightScrollRef}
            onVerticalScroll={handleRightPanelScroll}
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full text-slate-400 text-sm">Add tasks to see the Gantt chart.</div>
        )}
      </div>
    </div>
  );
}
