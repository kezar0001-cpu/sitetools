"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks } from "@/hooks/useSitePlanTasks";
import { useProjectDelayLogs } from "@/hooks/useSitePlanDelays";
import type { SitePlanTask } from "@/types/siteplan";
import { GanttWrapper } from "../../components/GanttWrapper";
import { TaskEditPanel } from "../../components/TaskEditPanel";
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
  const { data: delayLogs } = useProjectDelayLogs(projectId);
  const [selectedTask, setSelectedTask] = useState<SitePlanTask | null>(null);

  const overallProgress =
    tasks && tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
      : 0;

  const hasChildren = selectedTask
    ? (tasks ?? []).some((t) => t.parent_id === selectedTask.id)
    : false;

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
        <div className="flex-1 overflow-auto pb-20 md:pb-4">
          {isLoading ? (
            <TaskListSkeleton />
          ) : (
            <GanttWrapper
              tasks={tasks ?? []}
              delayLogs={delayLogs}
              onTaskClick={(t) => setSelectedTask(t)}
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

      <SitePlanBottomNav projectId={projectId} />
    </div>
  );
}

export default function GanttPage() {
  return (
    <QueryProvider>
      <GanttPageInner />
    </QueryProvider>
  );
}
