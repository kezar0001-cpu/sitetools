"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlannerCreatePlanForm } from "./PlannerCreatePlanForm";
import { PlannerImportDialog } from "./PlannerImportDialog";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { fetchCompanyProjects, fetchCompanySites } from "@/lib/workspace/client";
import { bulkCreateTasks, createPlanRevision, createPlannerPlan, deletePlannerPlan, fetchPlannerPlans, seedCivilStarterTasks } from "@/lib/planner/client";
import { PlannerPlanWithContext, PlanStatus } from "@/lib/planner/types";
import { Project, Site } from "@/lib/workspace/types";
import { ImportedTask } from "@/lib/planner/import-parser";

const STATUS_BADGE: Record<PlanStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "on-hold": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  completed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  archived: { bg: "bg-slate-50", text: "text-slate-400", dot: "bg-slate-300" },
};

export function PlannerDashboardClient() {
  const { loading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });
  const [plans, setPlans] = useState<PlannerPlanWithContext[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const companyId = summary?.activeMembership?.company_id ?? null;
  const userId = summary?.userId ?? null;

  async function loadAll(activeCompanyId: string) {
    const [nextPlans, nextProjects, nextSites] = await Promise.all([
      fetchPlannerPlans(activeCompanyId),
      fetchCompanyProjects(activeCompanyId),
      fetchCompanySites(activeCompanyId),
    ]);
    setPlans(nextPlans);
    setProjects(nextProjects);
    setSites(nextSites);
  }

  useEffect(() => {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    loadAll(companyId)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load planner."))
      .finally(() => setBusy(false));
  }, [companyId]);

  const planStats = useMemo(() => {
    const active = plans.filter((p) => p.status === "active").length;
    const draft = plans.filter((p) => p.status === "draft").length;
    const completed = plans.filter((p) => p.status === "completed").length;
    const archived = plans.filter((p) => p.status === "archived").length;
    return { total: plans.length, active, draft, completed, archived };
  }, [plans]);

  const visiblePlans = useMemo(
    () => showArchived ? plans : plans.filter((p) => p.status !== "archived"),
    [plans, showArchived]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  async function handleDelete(plan: PlannerPlanWithContext) {
    if (!confirm(`Permanently delete "${plan.name}"?\nAll tasks and history will be removed. This cannot be undone.`)) return;
    setDeletingId(plan.id);
    try {
      await deletePlannerPlan(plan.id);
      await loadAll(companyId!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete plan.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate(input: {
    name: string;
    description: string;
    projectId: string | null;
    siteIds: string[];
    withStarter: boolean;
  }) {
    if (!companyId) return;

    setBusy(true);
    setError(null);
    try {
      const plan = await createPlannerPlan({
        companyId,
        name: input.name,
        description: input.description,
        projectId: input.projectId,
        siteIds: input.siteIds,
        userId,
      });

      if (input.withStarter) {
        await seedCivilStarterTasks(plan.id, userId);
      }

      await loadAll(companyId);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan.");
    } finally {
      setBusy(false);
    }
  }


  async function handleCreateFromImport(importedTasks: ImportedTask[], projectName: string | null) {
    if (!companyId) return;

    setBusy(true);
    setError(null);
    try {
      const plan = await createPlannerPlan({
        companyId,
        name: projectName?.trim() || `Imported Programme ${new Date().toLocaleDateString("en-AU")}`,
        description: "Imported into Buildstate Planner",
        userId,
      });

      const taskRows = importedTasks.map((t, idx) => ({
        title: t.name,
        sortOrder: idx,
        plannedStart: t.start,
        plannedFinish: t.finish,
        durationDays: t.durationDays,
        indentLevel: t.outlineLevel,
        wbsCode: t.wbsCode,
        notes: t.notes,
      }));

      await bulkCreateTasks(plan.id, taskRows, userId);
      await createPlanRevision({
        planId: plan.id,
        revisionType: "import",
        summary: `Imported ${importedTasks.length} tasks${projectName ? ` from "${projectName}"` : ""}` ,
        payload: { source: "external_programme", imported_task_count: importedTasks.length },
        userId,
      });

      await loadAll(companyId);
      setShowImport(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import programme.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 md:p-8 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ganttPattern" width="60" height="30" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="40" height="8" rx="2" fill="currentColor" opacity="0.5" />
                <rect x="15" y="14" width="30" height="8" rx="2" fill="currentColor" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ganttPattern)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Buildstate Planner</span>
            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">v5</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Project Planner
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-sm md:text-base">
            Plan, schedule, and track civil construction projects. Sheet view, Gantt chart,
            daily site updates — one integrated planner for office and field.
          </p>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg">
            {[
              { label: "Total Plans", value: planStats.total, accent: "text-white" },
              { label: "Active", value: planStats.active, accent: "text-emerald-400" },
              { label: "Draft", value: planStats.draft, accent: "text-slate-300" },
              { label: "Completed", value: planStats.completed, accent: "text-blue-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
                <p className={`text-2xl font-black ${s.accent}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-slate-900">Your Plans</h2>
        <div className="flex items-center gap-2">
          {planStats.archived > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showArchived ? "bg-slate-200 text-slate-800" : "border border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
                }`}
            >
              📦 Archived ({planStats.archived})
            </button>
          )}
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
          >
            📥 Import Programme
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors shadow-sm"
          >
            {showCreate ? "Cancel" : "+ New Plan"}
          </button>
        </div>
      </div>

      {/* Create form (collapsible) */}
      {showCreate && (
        <PlannerCreatePlanForm
          projects={projects}
          sites={sites}
          creating={busy}
          onCreate={handleCreate}
        />
      )}

      {/* Plan list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-700">Plan Name</th>
                <th className="text-left p-3 font-semibold text-slate-700">Project</th>
                <th className="text-left p-3 font-semibold text-slate-700">Sites</th>
                <th className="text-left p-3 font-semibold text-slate-700">Status</th>
                <th className="text-left p-3 font-semibold text-slate-700">Updated</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {visiblePlans.map((plan) => {
                const badge = STATUS_BADGE[plan.status] ?? STATUS_BADGE.draft;
                const isDeleting = deletingId === plan.id;
                return (
                  <tr key={plan.id} className={`border-t border-slate-100 hover:bg-amber-50/20 transition-colors ${isDeleting ? "opacity-40" : ""}`}>
                    <td className="p-3">
                      <Link
                        href={`/dashboard/planner/${plan.id}`}
                        className="font-semibold text-slate-900 hover:text-amber-600 transition-colors"
                      >
                        {plan.name}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-600">{plan.projects?.name ?? "—"}</td>
                    <td className="p-3 text-slate-600">
                      {(plan.project_plan_sites ?? [])
                        .map((s) => s.sites?.name)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {plan.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-xs">
                      {new Date(plan.updated_at).toLocaleDateString("en-AU")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/planner/${plan.id}`} className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors" title="Sheet view">▤</Link>
                        <Link href={`/dashboard/planner/${plan.id}/gantt`} className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors" title="Gantt">▰</Link>
                        <Link href={`/dashboard/planner/${plan.id}/today`} className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors" title="Today">◉</Link>
                        <Link href={`/dashboard/planner/${plan.id}/print`} target="_blank" className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors" title="Export PDF">🖨︎</Link>
                        <button
                          onClick={() => handleDelete(plan)}
                          disabled={isDeleting || !!deletingId}
                          className="px-2 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-1"
                          title="Delete plan"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-slate-500 text-sm">No plans yet. Create your first programme to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showImport && (
        <PlannerImportDialog onImport={handleCreateFromImport} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
