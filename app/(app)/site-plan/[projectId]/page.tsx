"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronsUpDown,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks } from "@/hooks/useSitePlanTasks";
import { buildTaskTree } from "@/types/siteplan";
import type { SitePlanTaskNode, TaskType } from "@/types/siteplan";
import { TaskRow, TaskListHeader } from "../components/TaskRow";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { InlineTaskInput } from "../components/InlineTaskInput";
import { ImportPanel } from "../components/ImportPanel";
import { SitePlanBottomNav } from "../components/SitePlanBottomNav";
import { AddTaskFAB } from "../components/AddTaskFAB";
import { ProgressBar } from "../components/ProgressSlider";
import { TaskListSkeleton } from "../components/Skeleton";
import { QueryProvider } from "@/components/QueryProvider";

function ProjectDetailInner() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { data: project } = useSitePlanProject(projectId);
  const { data: tasks, isLoading } = useSitePlanTasks(projectId);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);
  const [selectedTask, setSelectedTask] = useState<SitePlanTaskNode | null>(
    null
  );
  const [showImport, setShowImport] = useState(false);

  // Inline input state: which context to add into
  const [inlineInput, setInlineInput] = useState<{
    type: TaskType;
    parentId: string | null;
    afterIndex: number;
  } | null>(null);

  const tree = useMemo(() => (tasks ? buildTaskTree(tasks) : []), [tasks]);

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
    return rows;
  }, [tree, expandedIds, allExpanded]);

  const overallProgress = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    return Math.round(
      tasks.reduce((s, t) => s + t.progress, 0) / tasks.length
    );
  }, [tasks]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
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

  const handleFABAdd = (type: TaskType) => {
    // Show inline input at the bottom
    setInlineInput({
      type,
      parentId: null,
      afterIndex: (tasks?.length ?? 0),
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
      afterIndex: (tasks?.length ?? 0),
    });
    setSelectedTask(null);
  };

  const hasChildrenForSelected = selectedTask
    ? (tasks ?? []).some((t) => t.parent_id === selectedTask.id)
    : false;

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push("/site-plan")}
              className="p-1.5 rounded-lg hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5 text-slate-400" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {project?.name ?? "Loading..."}
              </h1>
              {project?.description && (
                <p className="text-xs text-slate-400 truncate">
                  {project.description}
                </p>
              )}
            </div>
            <span className="text-sm font-semibold text-slate-700 tabular-nums">
              {overallProgress}%
            </span>
          </div>
          <ProgressBar value={overallProgress} />

          {/* Toolbar */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-md min-h-[32px]"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {allExpanded ? "Collapse All" : "Expand All"}
            </button>

            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-md min-h-[32px]"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Import
            </button>

            {/* Desktop: add buttons */}
            <div className="hidden md:flex items-center gap-2 ml-auto">
              <button
                onClick={() => startInlineAdd("phase")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md min-h-[32px]"
              >
                <Plus className="h-3.5 w-3.5" />
                Phase
              </button>
              <button
                onClick={() => startInlineAdd("task")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md min-h-[32px]"
              >
                <Plus className="h-3.5 w-3.5" />
                Task
              </button>

              {/* View toggles (desktop) */}
              <div className="flex items-center border border-slate-200 rounded-md ml-2">
                <span className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-l-md">
                  List
                </span>
                <button
                  onClick={() =>
                    router.push(`/site-plan/${projectId}/gantt`)
                  }
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                >
                  Gantt
                </button>
                <button
                  onClick={() =>
                    router.push(`/site-plan/${projectId}/summary`)
                  }
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-r-md"
                >
                  Summary
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-4">
          {isLoading ? (
            <TaskListSkeleton />
          ) : visibleRows.length === 0 && !inlineInput ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
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
            </div>
          ) : (
            <>
              {/* Column headers */}
              <TaskListHeader />

              {visibleRows.map((node, idx) => (
                <div key={node.id}>
                  <TaskRow
                    node={node}
                    rowNumber={idx + 1}
                    expanded={allExpanded || expandedIds.has(node.id)}
                    onToggle={() => toggleExpand(node.id)}
                    onSelect={handleSelect}
                  />

                  {/* Inline "Add Task" link at end of each phase's children */}
                  {node.type === "phase" &&
                    (allExpanded || expandedIds.has(node.id)) && (
                      <>
                        {/* Show children, then add-task link */}
                        {idx === visibleRows.length - 1 ||
                        (visibleRows[idx + 1] &&
                          visibleRows[idx + 1].type === "phase") ? (
                          <button
                            onClick={() =>
                              startInlineAdd("task", node.id)
                            }
                            className="w-full text-left pl-16 py-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 min-h-[32px]"
                          >
                            + Add Task
                          </button>
                        ) : null}
                      </>
                    )}
                </div>
              ))}

              {/* Inline input at the bottom */}
              {inlineInput && (
                <InlineTaskInput
                  projectId={projectId}
                  contextParentId={inlineInput.parentId}
                  contextType={inlineInput.type}
                  sortOrder={inlineInput.afterIndex}
                  onCancel={() => setInlineInput(null)}
                />
              )}

              {/* Always show a bottom "add" link */}
              {!inlineInput && visibleRows.length > 0 && (
                <button
                  onClick={() => startInlineAdd("phase")}
                  className="w-full text-left pl-10 py-2.5 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 border-b border-slate-100 min-h-[36px]"
                >
                  + Add Phase
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right panel (desktop) — task edit */}
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

      {/* Mobile task edit panel */}
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

      {/* Mobile FAB */}
      <AddTaskFAB onAdd={handleFABAdd} />

      {/* Mobile bottom nav */}
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
