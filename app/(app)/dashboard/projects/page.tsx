"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import {
    fetchCompanyProjectsWithCounts,
    createProject,
    updateProject,
    deleteProject,
} from "@/lib/workspace/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { ProjectWithCounts } from "@/lib/workspace/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const STATUS_CONFIG = {
    active: { label: "Active", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    completed: { label: "Completed", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" },
    "on-hold": { label: "On Hold", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
    archived: { label: "Archived", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-500 border-slate-200" },
} as const;

type ProjectStatus = keyof typeof STATUS_CONFIG;

export default function ProjectsPage() {
    const { loading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });

    const companyId = summary?.activeMembership?.company_id ?? null;
    const userId = summary?.userId ?? null;
    const role = summary?.activeMembership?.role ?? null;
    const canManage = role === "owner" || role === "admin" || role === "manager";

    const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
    const [busy, setBusy] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<ProjectWithCounts | null>(null);

    // Create form
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [creating, setCreating] = useState(false);

    // Edit form
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editStatus, setEditStatus] = useState<ProjectStatus>("active");
    const [saving, setSaving] = useState(false);

    async function load() {
        if (!companyId) return;
        const rows = await fetchCompanyProjectsWithCounts(companyId);
        setProjects(rows);
    }

    useEffect(() => {
        if (!companyId) return;
        setBusy(true);
        load()
            .catch((err) => toast.error(err?.message ?? (err instanceof Error ? err.message : "Could not load projects.")))
            .finally(() => setBusy(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        if (!companyId || !newName.trim()) return;
        setCreating(true);
        try {
            await createProject(companyId, newName.trim(), newDesc.trim() || null, userId);
            setNewName("");
            setNewDesc("");
            setShowCreate(false);
            await load();
            toast.success("Project created.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create project.");
        } finally {
            setCreating(false);
        }
    }

    function startEdit(project: ProjectWithCounts) {
        setEditingId(project.id);
        setEditName(project.name);
        setEditDesc(project.description ?? "");
        setEditStatus(project.status as ProjectStatus);
    }

    async function handleSaveEdit(e: FormEvent) {
        e.preventDefault();
        if (!editingId || !editName.trim()) return;
        setSaving(true);
        try {
            await updateProject(editingId, {
                name: editName.trim(),
                description: editDesc.trim() || null,
                status: editStatus,
            });
            setEditingId(null);
            await load();
            toast.success("Project saved.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save.");
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        if (!pendingDelete) return;
        const project = pendingDelete;
        setPendingDelete(null);
        setDeletingId(project.id);
        try {
            await deleteProject(project.id);
            await load();
            toast.success("Project deleted.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete project.");
        } finally {
            setDeletingId(null);
        }
    }

    const visible = showArchived ? projects : projects.filter((p) => p.status !== "archived");
    const archivedCount = projects.filter((p) => p.status === "archived").length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
            {/* Hero */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-xl">
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="gridPat" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M0 40V0H40V40z" fill="none" stroke="currentColor" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#gridPat)" />
                    </svg>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Buildstate</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">Projects</h1>
                    <p className="text-slate-400 mt-2 text-sm md:text-base max-w-xl">
                        Projects are your top-level work containers. Each project holds its own sites and
                        planning programmes.
                    </p>
                    <div className="mt-5 grid grid-cols-3 gap-3 max-w-sm">
                        {[
                            { label: "Total", value: projects.length, color: "text-white" },
                            { label: "Active", value: projects.filter((p) => p.status === "active").length, color: "text-emerald-400" },
                            { label: "Completed", value: projects.filter((p) => p.status === "completed").length, color: "text-blue-400" },
                        ].map((s) => (
                            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
                                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-slate-500">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Actions bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">All Projects</h2>
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
                    {canManage && (
                        <button
                            onClick={() => { setShowCreate(!showCreate); setEditingId(null); }}
                            className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors shadow-sm"
                        >
                            {showCreate ? "Cancel" : "+ New Project"}
                        </button>
                    )}
                </div>
            </div>

            {/* Create form */}
            {showCreate && (
                <section className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4">New Project</h3>
                    <form className="space-y-4" onSubmit={handleCreate}>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                                    Project Name *
                                </label>
                                <input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Main St Stormwater Upgrade"
                                    className="w-full border-2 border-slate-200 focus:border-amber-400 outline-none rounded-xl px-4 py-3 text-sm transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                                    Description
                                </label>
                                <input
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="Optional short description"
                                    className="w-full border-2 border-slate-200 focus:border-amber-400 outline-none rounded-xl px-4 py-3 text-sm transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
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
                                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold text-sm"
                            >
                                {creating ? "Creating…" : "Create Project"}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* Project list */}
            {busy ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-7 w-7 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
                </div>
            ) : visible.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <div className="text-5xl mb-3">🏗️</div>
                    <p className="text-slate-500 font-medium">No projects yet.</p>
                    {canManage && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors"
                        >
                            Create your first project
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visible.map((project) => {
                        const sc = STATUS_CONFIG[project.status as ProjectStatus] ?? STATUS_CONFIG.active;
                        const isDeleting = deletingId === project.id;
                        const isEditing = editingId === project.id;

                        return (
                            <div
                                key={project.id}
                                className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-opacity ${isDeleting ? "opacity-40" : "border-slate-200 hover:border-amber-200 hover:shadow-md"
                                    } transition-all`}
                            >
                                {isEditing ? (
                                    <form className="p-5 space-y-3" onSubmit={handleSaveEdit}>
                                        <input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full border-2 border-amber-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
                                            required
                                        />
                                        <input
                                            value={editDesc}
                                            onChange={(e) => setEditDesc(e.target.value)}
                                            placeholder="Description"
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-300"
                                        />
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                        >
                                            <option value="active">Active</option>
                                            <option value="on-hold">On Hold</option>
                                            <option value="completed">Completed</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-900 font-bold text-xs hover:bg-amber-400"
                                            >
                                                {saving ? "Saving…" : "Save"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingId(null)}
                                                className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <Link href={`/dashboard/projects/${project.id}`} className="block p-5 hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-slate-900 truncate text-base">{project.name}</h3>
                                                    {project.description && (
                                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{project.description}</p>
                                                    )}
                                                </div>
                                                <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.badge}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                    {sc.label}
                                                </span>
                                            </div>

                                            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <span className="text-base">🏗️</span>
                                                    {project.site_count} {project.site_count === 1 ? "site" : "sites"}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="text-base">📋</span>
                                                    {project.plan_count} {project.plan_count === 1 ? "plan" : "plans"}
                                                </span>
                                            </div>
                                        </Link>

                                        {canManage && (
                                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                                                <Link
                                                    href={`/dashboard/projects/${project.id}/sites`}
                                                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                                                >
                                                    Sites
                                                </Link>
                                                <Link
                                                    href={`/dashboard/projects/${project.id}/planner`}
                                                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                                                >
                                                    Planner
                                                </Link>
                                                <div className="flex-1" />
                                                <button
                                                    onClick={() => startEdit(project)}
                                                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setPendingDelete(project)}
                                                    disabled={isDeleting || !!deletingId}
                                                    className="text-xs font-medium px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 border border-red-100 transition-colors disabled:opacity-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                open={!!pendingDelete}
                title={`Delete "${pendingDelete?.name}"?`}
                description={`Sites and plans linked to this project will lose their project connection. This cannot be undone.`}
                confirmLabel="Delete Project"
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
