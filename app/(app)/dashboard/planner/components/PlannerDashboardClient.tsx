"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlannerCreatePlanForm } from "./PlannerCreatePlanForm";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { fetchCompanyProjects, fetchCompanySites } from "@/lib/workspace/client";
import { createPlannerPlan, fetchPlannerPlans, seedCivilStarterTasks } from "@/lib/planner/client";
import { PlannerPlanWithContext } from "@/lib/planner/types";
import { Project, Site } from "@/lib/workspace/types";

export function PlannerDashboardClient() {
  const { loading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });
  const [plans, setPlans] = useState<PlannerPlanWithContext[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return { total: plans.length, active, draft };
  }, [plans]);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading planner...</div>;
  }

  async function handleCreate(input: { name: string; description: string; projectId: string | null; siteIds: string[]; withStarter: boolean }) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-slate-900 text-white rounded-2xl p-6">
        <p className="text-xs uppercase tracking-wider text-amber-300 font-bold">Buildstate Planner</p>
        <h1 className="text-3xl font-black mt-1">Project Planner + Daily Delivery Tracker</h1>
        <p className="text-slate-300 mt-2 max-w-3xl">Plan phases, sequence work, then run daily site updates from the same plan.</p>
        <div className="mt-4 grid grid-cols-3 gap-3 max-w-md text-sm">
          <div className="bg-slate-800 rounded-lg p-3"><p className="text-slate-400">Total plans</p><p className="text-2xl font-bold">{planStats.total}</p></div>
          <div className="bg-slate-800 rounded-lg p-3"><p className="text-slate-400">Active</p><p className="text-2xl font-bold">{planStats.active}</p></div>
          <div className="bg-slate-800 rounded-lg p-3"><p className="text-slate-400">Draft</p><p className="text-2xl font-bold">{planStats.draft}</p></div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <PlannerCreatePlanForm projects={projects} sites={sites} creating={busy} onCreate={handleCreate} />

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">Plan list</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Plan</th><th className="text-left p-3">Project</th><th className="text-left p-3">Sites</th><th className="text-left p-3">Status</th><th className="text-left p-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-t border-slate-100">
                  <td className="p-3 font-semibold text-slate-900"><Link href={`/dashboard/planner/${plan.id}`} className="hover:underline">{plan.name}</Link></td>
                  <td className="p-3 text-slate-600">{plan.projects?.name ?? "—"}</td>
                  <td className="p-3 text-slate-600">{(plan.project_plan_sites ?? []).map((s) => s.sites?.name).filter(Boolean).join(", ") || "—"}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded-full bg-slate-100">{plan.status}</span></td>
                  <td className="p-3 text-slate-500">{new Date(plan.updated_at).toLocaleDateString("en-AU")}</td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">No plans yet. Create your first programme above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
