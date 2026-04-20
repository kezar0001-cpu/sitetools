"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchProjectSites, createProjectSite, updateSiteProject } from "@/lib/workspace/client";
import { canManageSites } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { Site } from "@/lib/workspace/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function ProjectSitesPage() {
    const params = useParams<{ projectId: string }>();
    const { loading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });

    const companyId = summary?.activeMembership?.company_id ?? null;
    const activeRole = summary?.activeMembership?.role ?? null;
    const canEdit = canManageSites(activeRole, summary?.profile?.email);

    const [sites, setSites] = useState<Site[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [name, setName] = useState("");
    const [creating, setCreating] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendingRemove, setPendingRemove] = useState<Site | null>(null);

    async function loadSites() {
        setPageLoading(true);
        try {
            const rows = await fetchProjectSites(params.projectId);
            setSites(rows);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load sites.");
        } finally {
            setPageLoading(false);
        }
    }

    useEffect(() => {
        if (!companyId) return;
        loadSites();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, params.projectId]);

    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        if (!companyId || !canEdit) return;

        setError(null);
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Site name is required.");
            return;
        }

        setCreating(true);
        try {
            await createProjectSite(params.projectId, companyId, trimmed);
            setName("");
            await loadSites();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create site.");
        } finally {
            setCreating(false);
        }
    }

    async function confirmRemove() {
        if (!pendingRemove) return;
        const site = pendingRemove;
        setPendingRemove(null);
        setRemovingId(site.id);
        try {
            await updateSiteProject(site.id, null);
            await loadSites();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove site.");
        } finally {
            setRemovingId(null);
        }
    }

    if (loading || pageLoading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="h-7 w-7 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Project Sites</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Sites are physical locations within this project. Tasks in the planner can be
                            assigned to a specific site.
                        </p>
                    </div>
                    <span className="shrink-0 bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full">
                        {sites.length} {sites.length === 1 ? "site" : "sites"}
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
                </div>
            )}

            {/* Site list */}
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {sites.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <div className="text-5xl mb-3">🏗️</div>
                        <p className="text-slate-500 text-sm font-medium">
                            No sites added to this project yet.
                        </p>
                        {canEdit && (
                            <p className="text-slate-400 text-xs mt-1">
                                Use the form below to add your first site.
                            </p>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {sites.map((site) => {
                            const isRemoving = removingId === site.id;
                            return (
                                <li
                                    key={site.id}
                                    className={`px-5 py-4 flex items-center justify-between gap-3 transition-opacity ${isRemoving ? "opacity-40" : ""
                                        }`}
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900 truncate">{site.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">/{site.slug}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Link
                                            href={`/print-qr/${site.slug}`}
                                            className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            Print QR
                                        </Link>
                                        {canEdit && (
                                            <button
                                                onClick={() => setPendingRemove(site)}
                                                disabled={!!removingId}
                                                className="text-xs font-medium px-3 py-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                                title="Remove from project (site not deleted)"
                                            >
                                                {isRemoving ? "Removing…" : "Remove"}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {/* Create site */}
            {canEdit ? (
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-1">Add a Site</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        A new site will be created and linked to this project.
                    </p>
                    <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleCreate}>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Lot 14 — Stormwater"
                            className="flex-1 border-2 border-slate-200 focus:border-amber-400 outline-none rounded-xl px-4 py-3 text-sm transition-colors"
                            disabled={creating}
                        />
                        <button
                            type="submit"
                            disabled={creating}
                            className="bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-amber-900 font-bold rounded-xl px-6 py-3 text-sm transition-colors"
                        >
                            {creating ? "Adding…" : "Add Site"}
                        </button>
                    </form>
                </section>
            ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                    Only Owner, Admin, or Manager roles can manage sites.
                </p>
            )}

            <ConfirmDialog
                open={!!pendingRemove}
                title={`Remove "${pendingRemove?.name}"?`}
                description="The site record will still exist, just unlinked from this project."
                confirmLabel="Remove Site"
                onConfirm={confirmRemove}
                onCancel={() => setPendingRemove(null)}
            />
        </div>
    );
}
