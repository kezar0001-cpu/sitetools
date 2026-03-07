"use client";

import { useState } from "react";
import { PlannerPlanWithContext, PlanStatus } from "@/lib/planner/types";
import { Project, Site } from "@/lib/workspace/types";

const STATUS_OPTIONS: { value: PlanStatus; label: string; dot: string }[] = [
    { value: "draft", label: "Draft", dot: "bg-slate-400" },
    { value: "active", label: "Active", dot: "bg-emerald-500" },
    { value: "on-hold", label: "On Hold", dot: "bg-amber-500" },
    { value: "completed", label: "Completed", dot: "bg-blue-500" },
    { value: "archived", label: "Archived", dot: "bg-slate-300" },
];

interface Props {
    plan: PlannerPlanWithContext;
    projects: Project[];
    sites: Site[];
    saving: boolean;
    onUpdate: (patch: { name?: string; description?: string; status?: PlanStatus; project_id?: string | null }, siteIds?: string[] | null) => Promise<void>;
    onClose: () => void;
}

export function PlanSettingsPanel({ plan, projects, sites, saving, onUpdate, onClose }: Props) {
    const currentSiteIds = (plan.project_plan_sites ?? [])
        .map((s) => s.sites?.id)
        .filter((id): id is string => !!id);

    const [name, setName] = useState(plan.name);
    const [description, setDescription] = useState(plan.description ?? "");
    const [status, setStatus] = useState<PlanStatus>(plan.status);
    const [projectId, setProjectId] = useState<string>(plan.project_id ?? "");
    const [siteIds, setSiteIds] = useState<string[]>(currentSiteIds);

    const toggleSite = (siteId: string) => {
        setSiteIds((prev) =>
            prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
        );
    };

    const handleSave = async () => {
        await onUpdate(
            {
                name: name.trim(),
                description: description.trim() || undefined,
                status,
                project_id: projectId || null,
            },
            siteIds
        );
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Plan Settings</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Rename, reassign project/sites, or change status.</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-5 space-y-4 min-h-0">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Name</label>
                        <input
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none"
                            value={name}
                            onChange={(e) => { setName(e.target.value); }}
                            placeholder="Plan name"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                        <textarea
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[70px] resize-y focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none"
                            value={description}
                            onChange={(e) => { setDescription(e.target.value); }}
                            placeholder="Scope, constraints, notes..."
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {STATUS_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { setStatus(opt.value); }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${status === opt.value
                                        ? "border-slate-900 bg-slate-900 text-white"
                                        : "border-slate-200 text-slate-600 hover:border-slate-400"
                                        }`}
                                >
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === opt.value ? "bg-white" : opt.dot}`} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        {status === "archived" && (
                            <p className="text-xs text-slate-500 mt-1.5">Archived plans are hidden from the default plan list.</p>
                        )}
                    </div>

                    {/* Project */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Linked Project</label>
                        <select
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-amber-400 outline-none"
                            value={projectId}
                            onChange={(e) => { setProjectId(e.target.value); }}
                        >
                            <option value="">No linked project</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sites */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sites Included in This Plan</label>
                        {sites.length === 0 ? (
                            <p className="text-sm text-slate-400">No sites set up yet.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {sites.map((site) => (
                                    <button
                                        key={site.id}
                                        type="button"
                                        onClick={() => toggleSite(site.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm border font-medium transition-all ${siteIds.includes(site.id)
                                            ? "bg-amber-100 text-amber-900 border-amber-400"
                                            : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                                            }`}
                                    >
                                        {siteIds.includes(site.id) && <span className="mr-1">✓</span>}
                                        {site.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="px-5 py-2.5 rounded-lg bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-colors disabled:opacity-40"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
