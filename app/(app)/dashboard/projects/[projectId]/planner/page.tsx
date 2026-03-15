"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { fetchCompanyProjects, fetchProjectSites } from "@/lib/workspace/client";
import { createPlannerPlan, deletePlannerPlan, fetchProjectPlans, seedCivilStarterTasks } from "@/lib/planner/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { Project, Site } from "@/lib/workspace/types";
import { PlannerPlanWithContext, PlanStatus } from "@/lib/planner/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const STATUS_BADGE: Record<PlanStatus, { bg: string; text: string; dot: string }> = {
    draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
    active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    "on-hold": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    completed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    archived: { bg: "bg-slate-50", text: "text-slate-400", dot: "bg-slate-300" },
};

export default function ProjectPlannerPage() {
    const params = useParams<{ projectId: string }>();
    const { loading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });

    const companyId = summary?.activeMembership?.company_id ?? null;
    const userId = summary?.userId ?? null;

    const [project, setProject] = useState<Project | null>(null);
    const [plans, setPlans] = useState<PlannerPlanWithContext[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<PlannerPlanWithContext | null>(null);

    // New plan form state
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
    const [withStarter, setWithStarter] = useState(false);
    const [creating, setCreating] = useState(false);

    async function loadAll() {
        if (!companyId) return;
        const [projects, planRows, siteRows] = await Promise.all([
            fetchCompanyProjects(companyId),
            fetchProjectPlans(params.projectId),
            fetchProjectSites(params.projectId),
        ]);
        setProject(projects.find((p) => p.id === params.projectId) ?? null);
        setPlans(planRows);
        setSites(siteRows);
    }

    useEffect(() => {
        if (!companyId) return;
        setBusy(true);
        setError(null);
        loadAll()
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load planner."))
            .finally(() => setBusy(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, params.projectId]);

    const visiblePlans = useMemo(
        () => (showArchived ? plans : plans.filter((p) => p.status !== "archived")),
        [plans, showArchived]
    );

    const archivedCount = plans.filter((p) => p.status === "archived").length;

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!companyId || !newName.trim()) return;

        setCreating(true);
        setError(null);
        try {
            const plan = await createPlannerPlan({
                companyId,
                projectId: params.projectId,
                siteIds: selectedSiteIds,
                name: newName.trim(),
                description: newDesc.trim() || undefined,
                userId,
            });
            if (withStarter) {
                await seedCivilStarterTasks(plan.id, userId);
            }
            await loadAll();
            setShowCreate(false);
            setNewName("");
            setNewDesc("");
            setSelectedSiteIds([]);
            setWithStarter(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create plan.");
        } finally {
            setCreating(false);
        }
    }

    async function confirmDelete() {
        if (!pendingDelete) return;
        const plan = pendingDelete;
        setPendingDelete(null);
        setDeletingId(plan.id);
        try {
            await deletePlannerPlan(plan.id);
            await loadAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete plan.");
        } finally {
            setDeletingId(null);
        }
    }

    function toggleSite(siteId: string) {
        setSelectedSiteIds((prev) =>
            prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
        );
    }

    if (loading || busy) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="h-7 w-7 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-900">Plans</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {project?.name} — {plans.filter((p) => p.status !== "archived").length} active plan
                        {plans.filter((p) => p.status !== "archived").length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {archivedCount > 0 && (
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showArchived
                                    ? "bg-slate-200 text-slate-800"
                                    : "border border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
                                }`}
                        >
                            📦 Archived ({archivedCount})
                        </button>
                    )}
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors shadow-sm"
                    >
                        {showCreate ? "Cancel" : "+ New Plan"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
                </div>
            )}

            {/* Create plan form */}
            {showCreate && (
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4">New Plan for {project?.name}</h3>
                    <form className="space-y-4" onSubmit={handleCreate}>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                                Plan Name *
                            </label>
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g. Civil Works Programme — Stage 1"
                                className="w-full border-2 border-slate-200 focus:border-amber-400 outline-none rounded-xl px-4 py-3 text-sm transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                                Description
                            </label>
                            <textarea
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                rows={2}
                                placeholder="Optional description…"
                                className="w-full border-2 border-slate-200 focus:border-amber-400 outline-none rounded-xl px-4 py-3 text-sm transition-colors resize-none"
                            />
                        </div>
                        {sites.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                                    Include Sites
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {sites.map((site) => (
                                        <button
                                            key={site.id}
                                            type="button"
                                            onClick={() => toggleSite(site.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selectedSiteIds.includes(site.id)
                                                    ? "bg-amber-400 border-amber-400 text-amber-900"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                }`}
                                        >
                                            {selectedSiteIds.includes(site.id) ? "✓ " : ""}{site.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={withStarter}
                                onChange={(e) => setWithStarter(e.target.checked)}
                                className="w-4 h-4 accent-amber-500"
                            />
                            <span className="text-sm text-slate-700 font-medium">
                                Start with a civil construction starter template
                            </span>
                        </label>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating || !newName.trim()}
                                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold text-sm transition-colors"
                            >
                                {creating ? "Creating…" : "Create Plan"}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* Plan list */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
                            <tr>
                                <th className="text-left p-3 font-semibold text-slate-700">Plan Name</th>
                                <th className="text-left p-3 font-semibold text-slate-700">Sites</th>
                                <th className="text-left p-3 font-semibold text-slate-700">Status</th>
                                <th className="text-left p-3 font-semibold text-slate-700">Updated</th>
                                <th className="p-3 w-28" />
                            </tr>
                        </thead>
                        <tbody>
                            {visiblePlans.map((plan) => {
                                const badge = STATUS_BADGE[plan.status] ?? STATUS_BADGE.draft;
                                const isDeleting = deletingId === plan.id;
                                return (
                                    <tr
                                        key={plan.id}
                                        className={`border-t border-slate-100 hover:bg-amber-50/30 transition-colors ${isDeleting ? "opacity-40" : ""
                                            }`}
                                    >
                                        <td className="p-3">
                                            <Link
                                                href={`/dashboard/planner/${plan.id}`}
                                                className="font-semibold text-slate-900 hover:text-amber-600 transition-colors"
                                            >
                                                {plan.name}
                                            </Link>
                                            {plan.description && (
                                                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{plan.description}</p>
                                            )}
                                        </td>
                                        <td className="p-3 text-slate-500 text-xs">
                                            {(plan.project_plan_sites ?? [])
                                                .map((s) => s.sites?.name)
                                                .filter(Boolean)
                                                .join(", ") || "—"}
                                        </td>
                                        <td className="p-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                {plan.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-400 text-xs">
                                            {new Date(plan.updated_at).toLocaleDateString("en-AU")}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                <Link href={`/dashboard/planner/${plan.id}`} className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors" title="Sheet view">▤</Link>
                                                <Link href={`/dashboard/planner/${plan.id}/gantt`} className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors" title="Gantt">▰</Link>
                                                <Link href={`/dashboard/planner/${plan.id}/today`} className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors" title="Today">◉</Link>
                                                <Link href={`/dashboard/planner/${plan.id}/print`} target="_blank" className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors" title="Print">🖨︎</Link>
                                                <button
                                                    onClick={() => setPendingDelete(plan)}
                                                    disabled={isDeleting || !!deletingId}
                                                    className="px-2 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Delete plan"
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {visiblePlans.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center">
                                        <div className="text-4xl mb-2">📋</div>
                                        <p className="text-slate-500 text-sm">
                                            No plans yet. Create your first programme to get started.
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <ConfirmDialog
                open={!!pendingDelete}
                title={`Delete "${pendingDelete?.name}"?`}
                description="All tasks and history will be removed. This cannot be undone."
                confirmLabel="Delete Plan"
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
