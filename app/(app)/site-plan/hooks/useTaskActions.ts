import { useCallback } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import type { SitePlanTask, SitePlanTaskNode, TaskType } from "@/types/siteplan";
import { useReorderTask, useUpdateTask } from "@/hooks/useSitePlanTasks";
import type { UndoEntry } from "./useUndoRedo";

interface UseTaskActionsParams {
  tasks: SitePlanTask[] | undefined;
  visibleRows: SitePlanTaskNode[];
  flatTasks: SitePlanTaskNode[];
  selectedTask: SitePlanTaskNode | null;
  setSelectedTask: (task: SitePlanTaskNode | null) => void;
  setInlineInput: React.Dispatch<React.SetStateAction<{ type: TaskType; parentId: string | null; afterIndex: number; afterTaskId: string | null } | null>>;
  projectId: string;
  updateTask: ReturnType<typeof useUpdateTask>;
  reorderTask: ReturnType<typeof useReorderTask>;
  openCreateSheet: (type: TaskType, parentId: string | null, sortOrder: number, parentNode?: SitePlanTaskNode | null) => void;
  pushUndo: (entry: UndoEntry) => void;
  handleMutateError: () => void;
  setSelectedRowIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  lastSelectedRowNumber: number | null;
  setLastSelectedRowNumber: React.Dispatch<React.SetStateAction<number | null>>;
}

export function useTaskActions({
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
}: UseTaskActionsParams) {
  const handleSelect = useCallback((node: SitePlanTaskNode) => {
    setSelectedTask(node);
    setInlineInput(null);
  }, [setSelectedTask, setInlineInput]);

  const handleUpdateTaskInline = useCallback((taskId: string, updates: Partial<SitePlanTaskNode>) => {
    updateTask.mutate({ id: taskId, projectId, updates }, { onError: handleMutateError });
  }, [updateTask, projectId, handleMutateError]);

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
  }, [lastSelectedRowNumber, visibleRows, setSelectedTask, setInlineInput, setSelectedRowIds, setLastSelectedRowNumber]);

  const openBottomInlineRow = useCallback(() => {
    const parentId = selectedTask?.parent_id ?? null;
    const type: TaskType = "task";
    const sortOrder = (tasks ?? []).filter((row) => row.parent_id === parentId).length;
    setInlineInput({
      type,
      parentId,
      afterIndex: sortOrder,
      afterTaskId: null,
    });
    setSelectedTask(null);
  }, [selectedTask, tasks, setSelectedTask, setInlineInput]);

  const handleRowAddBelow = useCallback((node: SitePlanTaskNode) => {
    const siblings = (tasks ?? [])
      .filter((task) => task.parent_id === node.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const siblingIndex = siblings.findIndex((task) => task.id === node.id);
    const sortOrder = siblingIndex >= 0 ? siblingIndex + 1 : siblings.length;
    setInlineInput({
      type: node.type,
      parentId: node.parent_id,
      afterIndex: sortOrder,
      afterTaskId: node.id,
    });
    setSelectedTask(null);
  }, [tasks, setSelectedTask, setInlineInput]);

  const handleRowAddSubtask = useCallback((node: SitePlanTaskNode) => {
    openCreateSheet("task", node.id, node.children.length, node);
  }, [openCreateSheet]);

  const handleFABAdd = useCallback((type: TaskType) => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      openCreateSheet(type, null, tasks?.length ?? 0);
      setSelectedTask(null);
      return;
    }

    setInlineInput({
      type,
      parentId: null,
      afterIndex: tasks?.length ?? 0,
      afterTaskId: null,
    });
    setSelectedTask(null);
  }, [openCreateSheet, tasks, setSelectedTask, setInlineInput]);

  const startInlineAdd = useCallback((
    type: TaskType,
    parentId: string | null = null,
    afterTaskId: string | null = null
  ) => {
    let resolvedAfterTaskId = afterTaskId;
    if (afterTaskId) {
      const phaseIdx = visibleRows.findIndex((r) => r.id === afterTaskId);
      if (phaseIdx >= 0) {
        let lastIdx = phaseIdx;
        for (let i = phaseIdx + 1; i < visibleRows.length; i++) {
          const row = visibleRows[i];
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
  }, [visibleRows, tasks, setSelectedTask, setInlineInput]);

  const handleIndent = useCallback(() => {
    if (!selectedTask) return;
    const taskIndex = visibleRows.findIndex((r) => r.id === selectedTask.id);
    if (taskIndex <= 0) return;
    const above = visibleRows[taskIndex - 1];
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
    }, {
      onError: handleMutateError,
    });
  }, [selectedTask, visibleRows, projectId, pushUndo, updateTask, handleMutateError]);

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
    }, {
      onError: handleMutateError,
    });
  }, [selectedTask, flatTasks, projectId, pushUndo, updateTask, handleMutateError]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination || source.index === destination.index) return;
      if (source.droppableId !== destination.droppableId) return;

      const rows = [...visibleRows];
      const [moved] = rows.splice(source.index, 1);
      rows.splice(destination.index, 0, moved);

      const parentSortOrder = new Map<string, number>();
      const moves = rows.map((row) => {
        const parentKey = row.parent_id ?? "__root__";
        const nextSortOrder = parentSortOrder.get(parentKey) ?? 0;
        parentSortOrder.set(parentKey, nextSortOrder + 1);
        return {
          id: row.id,
          sort_order: nextSortOrder,
          parent_id: row.parent_id,
        };
      });

      reorderTask.mutate({ projectId, moves }, { onError: handleMutateError });
    },
    [visibleRows, projectId, reorderTask, handleMutateError]
  );

  const handleGanttTaskClick = useCallback(
    (task: SitePlanTask) => {
      const node = flatTasks.find((t) => t.id === task.id);
      if (node) setSelectedTask(node);
    },
    [flatTasks, setSelectedTask]
  );

  const handleGanttDateChange = useCallback(
    (task: SitePlanTask, start_date: string, end_date: string) => {
      updateTask.mutate({
        id: task.id,
        projectId,
        updates: {
          start_date,
          end_date,
        },
      }, {
        onError: handleMutateError,
      });
    },
    [projectId, updateTask, handleMutateError]
  );

  return {
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
  };
}
