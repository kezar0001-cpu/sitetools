"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronsUpDown,
  Upload,
  Plus,
} from "lucide-react";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks } from "@/hooks/useSitePlanTasks";
import { buildTaskTree } from "@/types/siteplan";
import type { SitePlanTaskNode, TaskType } from "@/types/siteplan";
import { TaskRow } from "../components/TaskRow";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { CreateTaskSheet } from "../components/CreateTaskSheet";
import { CSVImportPanel } from "../components/CSVImportPanel";
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
  const [selectedTask, setSelectedTask] = useState<SitePlanTaskNode | null>(null);
  const [showCreate, setShowCreate] = useState<{
    type: TaskType;
    parentId?: string;
  } | null>(null);
  const [showCSVImport, setShowCSVImport] = useState(false);

  const tree = useMemo(() => (tasks ? buildTaskTree(tasks) : []), [tasks]);

  // Visible rows based on expanded state
  const visibleRows = useMemo(() => {
    const rows: SitePlanTaskNode[] = [];
    const walk = (nodes: SitePlanTaskNode[], depth: number) => {
      for (const node of nodes) {
        rows.push(node);
        if (node.children.length > 0 && (allExpanded || expandedIds.has(node.id))) {
          walk(node.children, depth + 1);
        }
      }
    };
    walk(tree, 0);
    return rows;
  }, [tree, expandedIds, allExpanded]);

  const overallProgress = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    return Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length);
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
    setShowCreate(null);
    setShowCSVImport(false);
  };

  const handleFABAdd = (type: TaskType) => {
    setShowCreate({ type });
    setSelectedTask(null);
    setShowCSVImport(false);
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
              {project && (
                <p className="text-xs text-slate-400">
                  {new Date(project.start_date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  –{" "}
                  {new Date(project.end_date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <span className="text-sm font-semibold text-slate-700 tabular-nums">
              {overallProgress}%
            </span>
          </div>
          <ProgressBar value={overallProgress} />

          {/* Toolbar */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-md min-h-[32px]"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {allExpanded ? "Collapse All" : "Expand All"}
            </button>

            <button
              onClick={() => setShowCSVImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-md min-h-[32px]"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>

            {/* Desktop: add task buttons */}
            <div className="hidden md:flex items-center gap-2 ml-auto">
              <button
                onClick={() => setShowCreate({ type: "phase" })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md min-h-[32px]"
              >
                <Plus className="h-3.5 w-3.5" />
                Phase
              </button>
              <button
                onClick={() => setShowCreate({ type: "task" })}
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
                  onClick={() => router.push(`/site-plan/${projectId}/gantt`)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                >
                  Gantt
                </button>
                <button
                  onClick={() => router.push(`/site-plan/${projectId}/summary`)}
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
          ) : visibleRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <p className="text-sm text-slate-500 mb-4">
                No tasks yet. Add a phase to get started.
              </p>
              <button
                onClick={() => setShowCreate({ type: "phase" })}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                Add Phase
              </button>
            </div>
          ) : (
            <>
              {visibleRows.map((node) => (
                <TaskRow
                  key={node.id}
                  node={node}
                  expanded={allExpanded || expandedIds.has(node.id)}
                  onToggle={() => toggleExpand(node.id)}
                  onSelect={handleSelect}
                />
              ))}

              {/* Per-phase "Add Task" buttons */}
              {tree.map((phase) => (
                <div key={`add-${phase.id}`}>
                  {(allExpanded || expandedIds.has(phase.id)) && (
                    <button
                      onClick={() =>
                        setShowCreate({ type: "task", parentId: phase.id })
                      }
                      className="w-full text-left pl-12 py-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50/50"
                    >
                      + Add Task to {phase.name}
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Right panel (desktop) — task edit or CSV import */}
      {selectedTask && (
        <div className="hidden md:block">
          <TaskEditPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            hasChildren={hasChildrenForSelected}
            onAddSubtask={() =>
              setShowCreate({ type: "subtask", parentId: selectedTask.id })
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
              setShowCreate({ type: "subtask", parentId: selectedTask.id })
            }
          />
        </div>
      )}

      {/* Create task sheet */}
      {showCreate && (
        <CreateTaskSheet
          projectId={projectId}
          type={showCreate.type}
          parentId={showCreate.parentId}
          onClose={() => setShowCreate(null)}
        />
      )}

      {/* CSV import */}
      {showCSVImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <CSVImportPanel
              projectId={projectId}
              onClose={() => setShowCSVImport(false)}
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
