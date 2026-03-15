"use client";

import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { useSitePlanProjects } from "@/hooks/useSitePlan";
import { useSitePlanTasks } from "@/hooks/useSitePlanTasks";
import { computeProjectHealth } from "@/types/siteplan";
import type { Project, ProjectHealth } from "@/types/siteplan";
import { HealthBadge } from "./components/StatusBadge";
import { ProgressBar } from "./components/ProgressSlider";
import { ProjectGridSkeleton } from "./components/Skeleton";
import { QueryProvider } from "@/components/QueryProvider";

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const { data: tasks } = useSitePlanTasks(project.id);

  const overallProgress =
    tasks && tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
      : 0;

  const health: ProjectHealth = tasks
    ? computeProjectHealth(tasks)
    : "on_track";

  const taskCount = tasks?.length ?? 0;

  return (
    <button
      onClick={() => router.push(`/site-plan/${project.id}`)}
      className="text-left rounded-xl border border-slate-200 bg-white p-5 space-y-3 hover:border-blue-300 hover:shadow-sm transition-all w-full min-h-[44px]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
          {project.name}
        </h3>
        <HealthBadge health={health} />
      </div>
      {project.description && (
        <p className="text-xs text-slate-400 line-clamp-1">
          {project.description}
        </p>
      )}
      <ProgressBar value={overallProgress} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 tabular-nums">
          {overallProgress}% complete
        </p>
        <p className="text-xs text-slate-400">
          {taskCount} {taskCount === 1 ? "task" : "tasks"}
        </p>
      </div>
    </button>
  );
}

function SitePlanDashboardInner() {
  const { data: projects, isLoading } = useSitePlanProjects();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">SitePlan</h1>
          <p className="text-sm text-slate-500">
            Select a project to manage its programme
          </p>
        </div>
      </div>

      {/* Project grid */}
      {isLoading ? (
        <ProjectGridSkeleton />
      ) : !projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-base font-semibold text-slate-700">
            No projects found
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-6 max-w-md">
            Create a project in your Buildstate workspace first, then come back
            here to build your construction programme.
          </p>
          <a
            href="/dashboard/projects"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg min-h-[44px]"
          >
            Go to Projects
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SitePlanDashboard() {
  return (
    <QueryProvider>
      <SitePlanDashboardInner />
    </QueryProvider>
  );
}
