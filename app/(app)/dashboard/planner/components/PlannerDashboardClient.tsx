"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { fetchCompanyProjects, fetchCompanySites } from "@/lib/workspace/client";
import {
  createPlannerPlan,
  deletePlannerPlan,
  fetchPlannerPlans,
  seedCivilStarterTasks,
} from "@/lib/planner/client";
import { PlannerPlanWithContext, PlanStatus } from "@/lib/planner/types";
import { Project, Site } from "@/lib/workspace/types";
import { PlannerCreatePlanForm } from "./PlannerCreatePlanForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// ── Status config ──
const STATUS_CFG: Record<PlanStatus, { label: string; bar: string; badge: string; dot: string }> = {
  draft:      { label: "Draft",      bar: "bg-slate-300",   badge: "bg-slate-100 text-slate-600",    dot: "bg-slate-400"   },
  active:     { label: "Active",     bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  "on-hold":  { label: "On Hold",   bar: "bg-amber-400",   badge: "bg-amber-50 text-amber-700",     dot: "bg-amber-500"   },
  completed:  { label: "Completed",  bar: "bg-blue-500",    badge: "bg-blue-50 text-blue-700",       dot: "bg-blue-500"    },
  archived:   { label: "Archived",   bar: "bg-slate-200",   badge: "bg-slate-50 text-slate-400",     dot: "bg-slate-300"   },
};

type FilterKey = PlanStatus | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "active",    label: "Active"    },
  { key: "draft",     label: "Draft"     },
  { key: "on-hold",   label: "On Hold"   },
  { key: "completed", label: "Completed" },
];

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff}d ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// ── Main component ──
export function PlannerDashboardClient() {
  const { loading: authLoading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });
  const [plans,    setPlans]    = useState<PlannerPlanWithContext[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites,    setSites]    = useState<Site[]>([]);
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter,   setFilter]   = useState<FilterKey>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PlannerPlanWithContext | null>(null);

  const companyId = summary?.activeMembership?.company_id ?? null;
  const userId    = summary?.userId ?? null;

  async function loadAll(cId: string) {
    const [p, pr, s] = await Promise.all([
      fetchPlannerPlans(cId),
      fetchCompanyProjects(cId),
      fetchCompanySites(cId),
    ]);
    setPlans(p); setProjects(pr); setSites(s);
  }

  useEffect(() => {
    if (!companyId) return;
    setBusy(true);
    loadAll(companyId)
      .catch((e) => setError(e?.message ?? (e instanceof Error ? e.message : "Failed to load")))
      .finally(() => setBusy(false));
  }, [companyId]);

  const counts = useMemo(() => ({
    all:       plans.filter(p => p.status !== "archived").length,
    active:    plans.filter(p => p.status === "active").length,
    draft:     plans.filter(p => p.status === "draft").length,
    "on-hold": plans.filter(p => p.status === "on-hold").length,
    completed: plans.filter(p => p.status === "completed").length,
  }), [plans]);

  const visible = useMemo(() =>
    filter === "all"
      ? plans.filter(p => p.status !== "archived")
      : plans.filter(p => p.status === filter),
    [plans, filter]
  );

  const archived = useMemo(() => plans.filter(p => p.status === "archived"), [plans]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const plan = pendingDelete;
    setPendingDelete(null);
    setDeletingId(plan.id);
    try {
      await deletePlannerPlan(plan.id);
      await loadAll(companyId!);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate(input: {
    name: string; description: string;
    projectId: string | null; siteIds: string[]; withStarter: boolean;
  }) {
    if (!companyId) return;
    setBusy(true);
    try {
      const plan = await createPlannerPlan({
        companyId, name: input.name, description: input.description,
        projectId: input.projectId, siteIds: input.siteIds, userId,
      });
      if (input.withStarter) await seedCivilStarterTasks(plan.id, userId);
      await loadAll(companyId);
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Sticky page header ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Title row */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-500">SitePlan</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                Project Planner
              </h1>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm rounded-xl shadow-sm transition-colors flex-shrink-0"
            >
              <span className="text-base leading-none font-black">+</span>
              <span className="hidden sm:inline">New Plan</span>
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 pb-3 overflow-x-auto scrollbar-none">
            {FILTERS.map(({ key, label }) => {
              const count = counts[key as keyof typeof counts] ?? 0;
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {label}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Plan cards */}
        {busy && plans.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 h-52 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-bold text-slate-700">
              {filter === "all" ? "No plans yet" : `No ${filter} plans`}
            </h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              {filter === "all"
                ? "Create your first programme to get started."
                : `You have no plans with status "${filter}".`}
            </p>
            {filter === "all" && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-5 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 transition-colors"
              >
                Create first plan
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isDeleting={deletingId === plan.id}
                onDelete={() => setPendingDelete(plan)}
              />
            ))}
          </div>
        )}

        {/* Archived accordion */}
        {archived.length > 0 && filter !== "archived" && (
          <details className="group">
            <summary className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-slate-600 transition-colors select-none list-none w-fit">
              <span className="transition-transform group-open:rotate-90 text-xs">▶</span>
              <span>Archived plans ({archived.length})</span>
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {archived.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isDeleting={deletingId === plan.id}
                  onDelete={() => setPendingDelete(plan)}
                />
              ))}
            </div>
          </details>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name}"?`}
        description="All tasks and history will be removed. This cannot be undone."
        confirmLabel="Delete Plan"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {/* ── Create plan modal ── */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">New Plan</h2>
                <p className="text-slate-500 text-xs mt-0.5">Set up a project programme</p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <PlannerCreatePlanForm
                projects={projects}
                sites={sites}
                creating={busy}
                onCreate={handleCreate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plan card component ──
function PlanCard({
  plan,
  isDeleting,
  onDelete,
}: {
  plan: PlannerPlanWithContext;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  const sc = STATUS_CFG[plan.status] ?? STATUS_CFG.draft;
  const siteNames = (plan.project_plan_sites ?? [])
    .map((s) => s.sites?.name)
    .filter(Boolean) as string[];

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col ${
        isDeleting ? "opacity-40 pointer-events-none" : ""
      }`}
    >
      {/* Status colour bar */}
      <div className={`h-1.5 ${sc.bar}`} />

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {plan.projects?.name && (
              <p className="text-xs text-slate-400 font-medium mb-0.5 truncate">
                {plan.projects.name}
              </p>
            )}
            <h3 className="font-bold text-slate-900 text-base leading-snug">
              {plan.name}
            </h3>
          </div>
          <span className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold ${sc.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        {/* Sites */}
        {siteNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {siteNames.slice(0, 3).map((name) => (
              <span
                key={name}
                className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
              >
                {name}
              </span>
            ))}
            {siteNames.length > 3 && (
              <span className="text-[11px] text-slate-400 self-center">
                +{siteNames.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto space-y-3">
          <p className="text-[11px] text-slate-400">
            Updated {relativeDate(plan.updated_at)}
          </p>

          {/* Actions */}
          <div className="flex gap-2 items-center">
            <Link
              href={`/dashboard/planner/${plan.id}`}
              className="flex-1 text-center py-2 text-sm font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors"
            >
              Open Plan
            </Link>
            <Link
              href={`/dashboard/planner/${plan.id}/gantt`}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              title="Gantt chart"
            >
              Gantt
            </Link>
            <Link
              href={`/dashboard/planner/${plan.id}/today`}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              title="Site view (mobile)"
            >
              Site
            </Link>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors"
              title="Delete plan"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
