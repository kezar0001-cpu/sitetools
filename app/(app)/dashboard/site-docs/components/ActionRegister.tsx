"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, ClipboardList, FolderOpen, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchCompanyDocuments, updateActionItemStatus } from "@/lib/site-docs/client";
import {
    DOCUMENT_TYPE_LABELS,
    type ActionItem,
    type DocumentType,
    type SiteDocument,
} from "@/lib/site-docs/types";
import { getProjects } from "@/lib/workspace/client";
import type { Project } from "@/lib/workspace/types";

interface ActionRegisterProps {
    companyId: string;
}

type ActionStatus = ActionItem["status"];
type StatusFilter = ActionStatus | "all";
type ProjectFilter = string | "all" | "unassigned";

interface RegisterAction extends ActionItem {
    documentId: string;
    documentTitle: string;
    documentType: DocumentType;
    documentReference: string | null;
    documentCreatedAt: string;
    projectId: string | null;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All Statuses" },
    { value: "open", label: "Open" },
    { value: "in-progress", label: "In Progress" },
    { value: "closed", label: "Closed" },
];

const STATUS_STYLES: Record<ActionStatus, string> = {
    open: "border-amber-300 bg-amber-50 text-amber-700",
    "in-progress": "border-blue-300 bg-blue-50 text-blue-700",
    closed: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

const STATUS_LABELS: Record<ActionStatus, string> = {
    open: "Open",
    "in-progress": "In Progress",
    closed: "Closed",
};

export function ActionRegister({ companyId }: ActionRegisterProps) {
    const router = useRouter();
    const [documents, setDocuments] = useState<SiteDocument[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
    const [updatingKey, setUpdatingKey] = useState<string | null>(null);

    const loadRegisterData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [docs, projectList] = await Promise.all([
                fetchCompanyDocuments(companyId),
                getProjects(companyId),
            ]);
            setDocuments(docs);
            setProjects(projectList);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load action register");
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        void loadRegisterData();
    }, [loadRegisterData]);

    const projectNameById = useMemo(() => {
        return new Map(projects.map((project) => [project.id, project.name]));
    }, [projects]);

    const actions = useMemo<RegisterAction[]>(() => {
        return documents.flatMap((document) => {
            const actionItems = document.generated_content.actionItems ?? [];

            return actionItems.map((item) => ({
                ...item,
                documentId: document.id,
                documentTitle: document.title,
                documentType: document.document_type,
                documentReference: document.reference_number,
                documentCreatedAt: document.created_at,
                projectId: document.project_id,
            }));
        });
    }, [documents]);

    const filteredActions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return actions
            .filter((action) => {
                if (statusFilter !== "all" && action.status !== statusFilter) return false;
                if (projectFilter === "unassigned" && action.projectId) return false;
                if (projectFilter !== "all" && projectFilter !== "unassigned" && action.projectId !== projectFilter) return false;

                if (!query) return true;

                const projectName = action.projectId ? projectNameById.get(action.projectId) ?? "" : "";
                return [
                    action.description,
                    action.responsible ?? "",
                    action.documentTitle,
                    action.documentReference ?? "",
                    projectName,
                ].some((value) => value.toLowerCase().includes(query));
            })
            .sort((a, b) => {
                const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
                const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
                if (aDue !== bDue) return aDue - bDue;
                return new Date(b.documentCreatedAt).getTime() - new Date(a.documentCreatedAt).getTime();
            });
    }, [actions, projectFilter, projectNameById, searchQuery, statusFilter]);

    const counts = useMemo<Record<StatusFilter, number>>(() => {
        return actions.reduce(
            (acc, action) => {
                acc.all += 1;
                acc[action.status] += 1;
                return acc;
            },
            { all: 0, open: 0, "in-progress": 0, closed: 0 }
        );
    }, [actions]);

    const hasActiveFilters = searchQuery || statusFilter !== "all" || projectFilter !== "all";

    function clearFilters() {
        setSearchQuery("");
        setStatusFilter("all");
        setProjectFilter("all");
    }

    async function handleStatusChange(action: RegisterAction, status: ActionStatus) {
        const updateKey = `${action.documentId}:${action.id}`;
        setUpdatingKey(updateKey);
        setError(null);

        try {
            const { updated_at } = await updateActionItemStatus(action.documentId, action.id, status);
            setDocuments((currentDocuments) =>
                currentDocuments.map((document) => {
                    if (document.id !== action.documentId) return document;

                    return {
                        ...document,
                        updated_at,
                        generated_content: {
                            ...document.generated_content,
                            actionItems: (document.generated_content.actionItems ?? []).map((item) =>
                                item.id === action.id ? { ...item, status, updated_at } : item
                            ),
                        },
                    };
                })
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update action status");
        } finally {
            setUpdatingKey(null);
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-700">Loading action register...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-slate-900">Action Register</h2>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Track action items collected from every SiteDocs report.
                    </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {STATUS_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setStatusFilter(option.value)}
                            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                                statusFilter === option.value
                                    ? "border-blue-300 bg-blue-50 text-blue-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            <span className="block text-xs font-medium">{option.label}</span>
                            <span className="text-lg font-semibold">{counts[option.value]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search actions, reports, responsible people..."
                        className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={projectFilter}
                    onChange={(event) => setProjectFilter(event.target.value as ProjectFilter)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Projects</option>
                    <option value="unassigned">No Project</option>
                    {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.name}
                        </option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                        <X className="h-4 w-4" />
                        Clear
                    </button>
                )}
            </div>

            {filteredActions.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-medium text-slate-700">
                        {actions.length === 0 ? "No action items found" : "No actions match your filters"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        {actions.length === 0
                            ? "Generated report actions will appear here once documents include action items."
                            : "Adjust the project, status, or search filters to widen the register."}
                    </p>
                </div>
            ) : (
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Action</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Project</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Report</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Responsible</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Due</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                                <th className="px-4 py-3 text-right font-medium text-slate-700">Open</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredActions.map((action) => {
                                const updateKey = `${action.documentId}:${action.id}`;
                                const isUpdating = updatingKey === updateKey;
                                const projectName = action.projectId
                                    ? projectNameById.get(action.projectId) ?? "Unknown project"
                                    : "No project";

                                return (
                                    <tr key={updateKey} className="hover:bg-slate-50">
                                        <td className="max-w-md px-4 py-4 align-top">
                                            <p className="font-medium text-slate-900">{action.description || "Untitled action"}</p>
                                            <p className="mt-1 text-xs text-slate-500">Action #{action.number}</p>
                                        </td>
                                        <td className="px-4 py-4 align-top text-slate-600">
                                            <span className="inline-flex items-center gap-1.5">
                                                <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                                                {projectName}
                                            </span>
                                        </td>
                                        <td className="max-w-xs px-4 py-4 align-top">
                                            <p className="font-medium text-slate-800">{action.documentTitle}</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {DOCUMENT_TYPE_LABELS[action.documentType] ?? action.documentType}
                                                {action.documentReference ? ` · ${action.documentReference}` : ""}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4 align-top text-slate-600">
                                            {action.responsible || "Unassigned"}
                                        </td>
                                        <td className="px-4 py-4 align-top text-slate-600">
                                            {action.due_date
                                                ? new Date(action.due_date).toLocaleDateString("en-AU")
                                                : "No date"}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <select
                                                value={action.status}
                                                disabled={isUpdating}
                                                onChange={(event) => void handleStatusChange(action, event.target.value as ActionStatus)}
                                                className={`rounded-full border px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${STATUS_STYLES[action.status]}`}
                                                aria-label={`Update status for ${action.description}`}
                                            >
                                                <option value="open">{STATUS_LABELS.open}</option>
                                                <option value="in-progress">{STATUS_LABELS["in-progress"]}</option>
                                                <option value="closed">{STATUS_LABELS.closed}</option>
                                            </select>
                                            {isUpdating && (
                                                <span className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    Updating
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right align-top">
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/dashboard/site-docs/${action.documentId}`)}
                                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                                            >
                                                Report
                                                <ArrowUpRight className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
