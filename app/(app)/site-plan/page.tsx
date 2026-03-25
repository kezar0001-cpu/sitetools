"use client";

import { useRouter } from "next/navigation";
import { useSitePlanProjects } from "@/hooks/useSitePlan";
import type { ProjectWithStats } from "@/hooks/useSitePlan";
import type { ProjectHealth } from "@/types/siteplan";
import { HealthBadge } from "./components/StatusBadge";
import { ProgressBar } from "./components/ProgressSlider";
import { ProjectGridSkeleton } from "./components/Skeleton";
import { SitePlanOnboardingEmptyState } from "./components/OnboardingEmptyState";
import { QueryProvider } from "@/components/QueryProvider";

function deriveHealth(p: ProjectWithStats): ProjectHealth {
  if (p.has_delayed) return "delayed";
  if (p.task_count > 0 && p.avg_progress < 50) {
    // Simple heuristic: if there are tasks but low progress, at risk
    return "at_risk";
  }
  return "on_track";
}

function ProjectCard({ project }: { project: ProjectWithStats }) {
  const router = useRouter();
  const health = deriveHealth(project);

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
      <ProgressBar value={project.avg_progress} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 tabular-nums">
          {project.avg_progress}% complete
        </p>
        <p className="text-xs text-slate-400">
          {project.task_count} {project.task_count === 1 ? "task" : "tasks"}
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
        <SitePlanOnboardingEmptyState />
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
