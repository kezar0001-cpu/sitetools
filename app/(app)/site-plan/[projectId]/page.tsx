"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, HardHat, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import { QueryProvider } from "@/components/QueryProvider";
import { supabase } from "@/lib/supabase";
import type { SitePlanTask } from "@/types/siteplan";
import { useSitePlanProject } from "@/hooks/useSitePlan";
import { useSitePlanTasks, useUpdateTask } from "@/hooks/useSitePlanTasks";
import { useProjectDelayLogs } from "@/hooks/useSitePlanDelays";
import { useSaveBaseline, useSitePlanBaselines } from "@/hooks/useSitePlanBaselines";
import { useTaskTree } from "@/hooks/useTaskTree";
import { useTaskFiltering } from "@/hooks/useTaskFiltering";
import { EMPTY_FILTER } from "../lib/viewState";
import { TaskEditPanel } from "../components/TaskEditPanel";
import { ImportPanel } from "../components/ImportPanel";
import { SiteTaskList } from "../components/SiteTaskList";
import { SiteTaskPanel } from "../components/SiteTaskPanel";
import { GanttChart } from "../components/GanttChart";
import { PlanModeLayout } from "../components/PlanModeLayout";

function ProjectDetailInner() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { data: project } = useSitePlanProject(projectId);
  const { data: tasks = [] } = useSitePlanTasks(projectId);
  const { data: delayLogs = [] } = useProjectDelayLogs(projectId);
  const { data: baselines = [] } = useSitePlanBaselines(projectId);
  const saveBaseline = useSaveBaseline();
  const updateTask = useUpdateTask();

  const [mode, setMode] = useState<"plan" | "site">(() => {
    if (typeof window === "undefined") return "plan";
    return (localStorage.getItem("siteplan-mode-v1") as "plan" | "site") ?? "plan";
  });
  const [activeTab, setActiveTab] = useState<"tasks" | "gantt">("tasks");
  const [selectedTask, setSelectedTask] = useState<SitePlanTask | null>(null);
  const [projectName, setProjectName] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [zoom, setZoom] = useState<"day" | "week" | "month" | "quarter">("week");
  const [showDeps, setShowDeps] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [todayTrigger] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { tree, flatTasks, expandedIds, toggleExpand } = useTaskTree(tasks, {
    initialExpandedIds: new Set(),
    initialAllExpanded: true,
  });
  const allExpanded = true;
  const { visibleRows } = useTaskFiltering(tree, expandedIds, allExpanded, EMPTY_FILTER);

  useEffect(() => {
    if (!project?.name) return;
    setProjectName(project.name);
  }, [project?.name]);

  const handleProjectNameSave = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed === project?.name) return;
      const { error } = await supabase.from("projects").update({ name: trimmed }).eq("id", projectId);
      if (error) {
        toast.error("Couldn't rename project");
        setProjectName(project?.name ?? "");
        return;
      }
      toast.success("Project renamed");
    },
    [project?.name, projectId]
  );

  const handleCaptureBaseline = useCallback(async () => {
    if (tasks.length === 0) {
      toast.error("No tasks to baseline");
      return;
    }
    try {
      await saveBaseline.mutateAsync({
        projectId,
        name: `Baseline ${new Date().toLocaleString("en-AU")}`,
        tasks,
      });
      toast.success("Baseline captured");
    } catch {
      toast.error("Failed to capture baseline");
    }
  }, [projectId, saveBaseline, tasks]);

  const handleDateChange = useCallback(
    (task: SitePlanTask, start: string, end: string) => {
      updateTask.mutate({ id: task.id, projectId, updates: { start_date: start, end_date: end } });
    },
    [projectId, updateTask]
  );

  const activeBaselineTasks = useMemo(
    () => ((baselines?.[0]?.snapshot as unknown as SitePlanTask[] | undefined) ?? []),
    [baselines]
  );

  return (
    <div className="h-screen overflow-hidden bg-white">
      <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b bg-white px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/site-plan" className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={(e) => void handleProjectNameSave(e.target.value)}
            className="w-60 rounded border border-transparent px-2 py-1 text-sm font-semibold hover:border-slate-200 focus:border-slate-300 focus:outline-none"
          />
        </div>

        <div className="mx-auto inline-flex rounded-full bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`rounded-full px-3 py-1 text-sm ${activeTab === "tasks" ? "bg-blue-600 text-white" : "text-slate-600"}`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("gantt")}
            className={`rounded-full px-3 py-1 text-sm ${activeTab === "gantt" ? "bg-blue-600 text-white" : "text-slate-600"}`}
          >
            Gantt
          </button>
          <button
            onClick={() => router.push(`/site-plan/${projectId}/summary`)}
            className="rounded-full px-3 py-1 text-sm text-slate-600"
          >
            Summary
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex rounded-full border border-slate-300 p-0.5 text-xs">
            <button
              onClick={() => {
                setMode("plan");
                localStorage.setItem("siteplan-mode-v1", "plan");
              }}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${mode === "plan" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              <Pencil className="h-3.5 w-3.5" /> Plan
            </button>
            <button
              onClick={() => {
                setMode("site");
                localStorage.setItem("siteplan-mode-v1", "site");
              }}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${mode === "site" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              <HardHat className="h-3.5 w-3.5" /> Site
            </button>
          </div>

          <details className="relative">
            <summary className="list-none cursor-pointer rounded-md p-1.5 hover:bg-slate-100">
              <MoreHorizontal className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 top-8 z-30 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              <button onClick={() => setShowImport(true)} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100">Import</button>
              <button onClick={() => void handleCaptureBaseline()} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100">Capture Baseline</button>
              <div className="my-1 h-px bg-slate-200" />
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-100">
                <input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />
                Edit Mode
              </label>
              <div className="my-1 h-px bg-slate-200" />
              <div className="px-2 py-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-700">Zoom</span>
                  <div className="inline-flex items-center gap-1">
                    {(["day", "week", "month", "quarter"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setZoom(level)}
                        className={`rounded px-2 py-0.5 text-xs ${
                          zoom === level ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {level === "day" ? "Day" : level === "week" ? "Week" : level === "month" ? "Month" : "Quarter"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-100">
                <input type="checkbox" checked={showDeps} onChange={(e) => setShowDeps(e.target.checked)} />
                Show Dependencies
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-100">
                <input type="checkbox" checked={showCriticalPath} onChange={(e) => setShowCriticalPath(e.target.checked)} />
                <span className={showCriticalPath ? "text-red-600" : ""}>Critical Path</span>
              </label>
            </div>
          </details>
        </div>
      </header>

      <div className="h-[calc(100vh-48px)] overflow-hidden">
        {activeTab === "tasks" && mode === "plan" && (
          <div className="flex h-full">
            <PlanModeLayout
              projectId={projectId}
              tasks={tasks}
              visibleRows={visibleRows}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onTaskClick={(task) => setSelectedTask(task)}
              selectedTaskId={selectedTask?.id ?? null}
              zoom={zoom}
              showDeps={showDeps}
              showCriticalPath={showCriticalPath}
              todayTrigger={todayTrigger}
              scrollContainerRef={scrollContainerRef}
              onDateChange={handleDateChange}
              editMode={editMode}
              baselineTasks={activeBaselineTasks}
              delayLogs={delayLogs}
            />
            {selectedTask && (
              <TaskEditPanel
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                hasChildren={flatTasks.some((t) => t.parent_id === selectedTask.id)}
                className="w-[340px] shrink-0 border-l border-slate-200"
              />
            )}
          </div>
        )}

        {activeTab === "tasks" && mode === "site" && (
          <div className="h-full">
            <SiteTaskList
              tasks={tasks}
              delayLogs={delayLogs}
              onTaskSelect={(task) => setSelectedTask(task)}
              projectId={projectId}
            />
            {selectedTask && <SiteTaskPanel task={selectedTask} onClose={() => setSelectedTask(null)} />}
          </div>
        )}

        {activeTab === "gantt" && (
          <GanttChart
            tasks={tasks}
            visibleRows={visibleRows}
            baselines={activeBaselineTasks}
            delayLogs={delayLogs}
            zoom={zoom}
            showDependencies={showDeps}
            showCriticalPath={showCriticalPath}
            selectedTaskId={selectedTask?.id ?? null}
            onTaskClick={(task) => setSelectedTask(task)}
            onDateChange={handleDateChange}
            todayTrigger={todayTrigger}
            scrollContainerRef={scrollContainerRef}
          />
        )}
      </div>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
            <ImportPanel projectId={projectId} onClose={() => setShowImport(false)} />
          </div>
        </div>
      )}
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
