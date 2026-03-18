"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks, useUpdateTask, useUpdateProgress, useCreateTask } from "@/hooks/useSitePlanTasks";
import { useSitePlanBaselines } from "@/hooks/useSitePlanBaselines";
import { useProjectDelayLogs } from "@/hooks/useSitePlanDelays";
import type { SitePlanTask, TaskType } from "@/types/siteplan";
import { GanttChart } from "../../components/GanttChart";
import { TaskEditPanel } from "../../components/TaskEditPanel";
import { DelayLogDialog } from "../../components/DelayLogDialog";
import { SitePlanBottomNav } from "../../components/SitePlanBottomNav";
import { ProgressBar } from "../../components/ProgressSlider";
import { TaskListSkeleton } from "../../components/Skeleton";
import { QueryProvider } from "@/components/QueryProvider";

function GanttPageInner() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { data: project } = useSitePlanProject(projectId);
  const { data: tasks, isLoading } = useSitePlanTasks(projectId);
  const { data: baselines } = useSitePlanBaselines(projectId);
  const { data: delayLogs } = useProjectDelayLogs(projectId);
  const updateTask = useUpdateTask();
  const updateProgress = useUpdateProgress();
  const createTask = useCreateTask();
  const [selectedTask, setSelectedTask] = useState<SitePlanTask | null>(null);
  const [delayTask, setDelayTask] = useState<SitePlanTask | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Gantt event callbacks
  const handleDateChange = useCallback(
    (task: SitePlanTask, start_date: string, end_date: string) => {
      updateTask.mutate(
        { id: task.id, projectId, updates: { start_date, end_date } },
        { onSuccess: () => toast.success("Dates updated") }
      );
    },
    [updateTask, projectId]
  );

  const handleDoubleClick = useCallback(
    (task: SitePlanTask) => {
      setSelectedTask(task);
    },
    []
  );

  const handleProgressChange = useCallback(
    (task: SitePlanTask, progress: number) => {
      updateProgress.mutate({
        taskId: task.id,
        projectId,
        progressBefore: task.progress,
        progressAfter: progress,
      });
    },
    [updateProgress, projectId]
  );

  const workItems = (tasks ?? []).filter((t) => t.type !== "phase");
  const overallProgress =
    workItems.length > 0
      ? Math.round(workItems.reduce((s, t) => s + t.progress, 0) / workItems.length)
      : 0;

  const hasChildren = selectedTask
    ? (tasks ?? []).some((t) => t.parent_id === selectedTask.id)
    : false;

  // Get latest baseline snapshot for comparison
  const latestBaseline = baselines && baselines.length > 0
    ? baselines[0].snapshot
    : undefined;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push(`/site-plan/${projectId}`)}
              className="p-1.5 rounded-lg hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5 text-slate-400" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-slate-900 truncate">
                {project?.name ?? "Loading..."} — Gantt
              </h1>
            </div>
            <span className="text-sm font-semibold text-slate-700 tabular-nums">
              {overallProgress}%
            </span>
          </div>
          <ProgressBar value={overallProgress} />

          {/* View toggles (desktop) */}
          <div className="hidden md:flex items-center gap-2 mt-3">
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </button>
            <div className="flex items-center border border-slate-200 rounded-md ml-auto">
              <button
                onClick={() => router.push(`/site-plan/${projectId}`)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-l-md"
              >
                List
              </button>
              <span className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50">
                Gantt
              </span>
              <button
                onClick={() => router.push(`/site-plan/${projectId}/summary`)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-r-md"
              >
                Summary
              </button>
            </div>
          </div>
        </div>

        {/* Gantt chart */}
        <div className="flex-1 overflow-hidden pb-14 md:pb-0">
          {isLoading ? (
            <TaskListSkeleton />
          ) : (
            <GanttChart
              tasks={tasks ?? []}
              baselines={latestBaseline}
              delayLogs={delayLogs}
              onTaskClick={(t) => setSelectedTask(t)}
              onDoubleClick={handleDoubleClick}
              onDateChange={handleDateChange}
              onProgressChange={handleProgressChange}
              onLogDelay={(t) => setDelayTask(t)}
              canEdit={true}
            />
          )}
        </div>
      </div>

      {/* Task edit panel */}
      {selectedTask && (
        <TaskEditPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          hasChildren={hasChildren}
        />
      )}

      {/* Delay dialog */}
      {delayTask && (
        <DelayLogDialog
          task={delayTask}
          allTasks={tasks ?? []}
          projectId={projectId}
          onClose={() => setDelayTask(null)}
        />
      )}

      {/* Quick-add task dialog */}
      {showAddDialog && (
        <QuickAddTaskDialog
          projectId={projectId}
          sortOrder={(tasks ?? []).length}
          onClose={() => setShowAddDialog(false)}
          onCreate={createTask}
        />
      )}

      <SitePlanBottomNav projectId={projectId} />
    </div>
  );
}

function QuickAddTaskDialog({
  projectId,
  sortOrder,
  onClose,
  onCreate,
}: {
  projectId: string;
  sortOrder: number;
  onClose: () => void;
  onCreate: ReturnType<typeof useCreateTask>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TaskType>("task");
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate.mutate(
      {
        project_id: projectId,
        name: name.trim(),
        type,
        start_date: startDate,
        end_date: endDate,
        sort_order: sortOrder,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed z-50 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 inset-x-0 bottom-0 md:inset-auto md:w-[420px] bg-white rounded-t-2xl md:rounded-xl shadow-xl">
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Add Task</h3>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder="Task name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="phase">Phase</option>
              <option value="task">Task</option>
              <option value="subtask">Subtask</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={!name.trim() || onCreate.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {onCreate.isPending ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function GanttPage() {
  return (
    <QueryProvider>
      <GanttPageInner />
    </QueryProvider>
  );
}
