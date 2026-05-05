"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    ArrowUpRight,
    Check,
    CheckCircle2,
    Clipboard,
    ClipboardList,
    Copy,
    Download,
    ExternalLink,
    FolderOpen,
    Link2,
    Loader2,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { loadJsPDF, preloadJsPDF } from "@/lib/dynamicImports";
import {
    createActionRegisterClientLink,
    fetchActionRegisterClientLinks,
    revokeActionRegisterClientLink,
    regenerateActionRegisterClientLink,
    createManualAction,
    fetchActionRegisterItems,
    updateRegisterActionStatus,
} from "@/lib/site-docs/client";
import {
    ACTION_STATUS_LABELS,
    ACTION_STATUS_OPTIONS,
    DOCUMENT_TYPE_LABELS,
    type ActionStatus,
    type SiteActionItem,
    type SiteActionRegisterLink,
} from "@/lib/site-docs/types";
import { getProjects } from "@/lib/workspace/client";
import type { Project } from "@/lib/workspace/types";

// ── Robust Clipboard Copy Utility ──

interface CopyResult {
    success: boolean;
    error?: string;
}

async function copyToClipboard(text: string): Promise<CopyResult> {
    // Try modern Clipboard API first
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return { success: true };
        } catch {
            // Fall through to fallback - err not needed
        }
    }

    // Fallback: use textarea + execCommand
    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        textarea.setAttribute("readonly", "");
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (successful) {
            return { success: true };
        }
        return { success: false, error: "Copy command failed" };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Copy failed",
        };
    }
}

function getLinkStatus(link: SiteActionRegisterLink): "active" | "expired" | "revoked" {
    if (link.revoked_at) return "revoked";
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return "expired";
    return "active";
}

function formatLinkDateTime(dateValue: string | null | undefined): string {
    if (!dateValue) return "—";
    return new Date(dateValue).toLocaleString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

interface ActionRegisterProps {
    companyId: string;
}

// Extended link type that includes joined project data from API
type SiteActionRegisterLinkWithProject = SiteActionRegisterLink & {
    projects?: { name?: string | null } | { name?: string | null }[] | null;
};

type StatusFilter = ActionStatus | "all";
type ProjectFilter = string | "all" | "unassigned";

interface StatusModalState {
    action: SiteActionItem;
    newStatus: ActionStatus;
    comment: string;
}

interface ManualActionForm {
    description: string;
    responsible: string;
    due_date: string;
    status: ActionStatus;
    project_id: string;
}

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All Statuses" },
    ...ACTION_STATUS_OPTIONS,
];

const STATUS_STYLES: Record<ActionStatus, string> = {
    open: "border-amber-300 bg-amber-50 text-amber-700",
    "in-progress": "border-blue-300 bg-blue-50 text-blue-700",
    closed: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

function getActionKey(action: Pick<SiteActionItem, "id">): string {
    return action.id;
}

function formatDate(dateValue: string | null | undefined): string {
    return dateValue ? new Date(dateValue).toLocaleDateString("en-AU") : "No date";
}

function formatDateTime(dateValue: string | null | undefined): string {
    if (!dateValue) return "";
    return new Date(dateValue).toLocaleString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatLatestUpdate(action: SiteActionItem): string {
    const update = action.latest_update;
    if (!update) return "No updates yet";
    const byline = [update.updated_by_name, update.updated_by_organisation].filter(Boolean).join(", ");
    return `${formatDateTime(update.created_at)} — ${byline}: “${update.comment}”`;
}

export function ActionRegister({ companyId }: ActionRegisterProps) {
    const router = useRouter();
    const [actions, setActions] = useState<SiteActionItem[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
    const [updatingKey, setUpdatingKey] = useState<string | null>(null);
    const [selectedActionKeys, setSelectedActionKeys] = useState<Set<string>>(new Set());
    const [selectionInitialized, setSelectionInitialized] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [statusModal, setStatusModal] = useState<StatusModalState | null>(null);
    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [manualForm, setManualForm] = useState<ManualActionForm>({
        description: "",
        responsible: "",
        due_date: "",
        status: "open",
        project_id: "",
    });
    const [creatingAction, setCreatingAction] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareProjectId, setShareProjectId] = useState("");
    const [shareRecipient, setShareRecipient] = useState({ name: "", email: "", organisation: "" });
    const [shareUrl, setShareUrl] = useState("");
    const [creatingLink, setCreatingLink] = useState(false);
    const [clientLinks, setClientLinks] = useState<SiteActionRegisterLinkWithProject[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [linksError, setLinksError] = useState<string | null>(null);
    const [revokingLinkId, setRevokingLinkId] = useState<string | null>(null);
    const [openingLinkId, setOpeningLinkId] = useState<string | null>(null);
    const [regeneratedUrls, setRegeneratedUrls] = useState<Map<string, string>>(new Map());
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
    const [copyError, setCopyError] = useState<string | null>(null);

    const loadRegisterData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [actionItems, projectList] = await Promise.all([
                fetchActionRegisterItems(companyId),
                getProjects(companyId),
            ]);
            setActions(actionItems);
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

    useEffect(() => {
        if (projects.length === 1 && !manualForm.project_id) {
            setManualForm((current) => ({ ...current, project_id: projects[0].id }));
        }
        if (projects.length === 1 && !shareProjectId) {
            setShareProjectId(projects[0].id);
        }
    }, [manualForm.project_id, projects, shareProjectId]);

    const projectNameById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

    useEffect(() => {
        setSelectedActionKeys((currentKeys) => {
            const availableKeys = new Set(actions.map(getActionKey));
            const nextKeys = new Set<string>();

            for (const action of actions) {
                const key = getActionKey(action);
                if (!selectionInitialized || currentKeys.has(key)) nextKeys.add(key);
            }

            for (const key of Array.from(currentKeys)) {
                if (availableKeys.has(key)) nextKeys.add(key);
            }

            return nextKeys;
        });
        if (actions.length > 0 && !selectionInitialized) setSelectionInitialized(true);
    }, [actions, selectionInitialized]);

    const filteredActions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return actions
            .filter((action) => {
                if (statusFilter !== "all" && action.status !== statusFilter) return false;
                if (projectFilter === "unassigned" && action.project_id) return false;
                if (projectFilter !== "all" && projectFilter !== "unassigned" && action.project_id !== projectFilter) return false;
                if (!query) return true;

                const projectName = action.project_id ? projectNameById.get(action.project_id) ?? "" : "";
                return [
                    action.description,
                    action.responsible ?? "",
                    action.source_document_title ?? "Manual action",
                    action.source_document_reference ?? "",
                    projectName,
                    action.latest_update?.comment ?? "",
                    action.latest_update?.updated_by_name ?? "",
                    action.latest_update?.updated_by_organisation ?? "",
                ].some((value) => value.toLowerCase().includes(query));
            })
            .sort((a, b) => {
                const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
                const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
                if (aDue !== bDue) return aDue - bDue;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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

    const visibleActionKeys = useMemo(() => filteredActions.map(getActionKey), [filteredActions]);
    const selectedVisibleActions = useMemo(
        () => filteredActions.filter((action) => selectedActionKeys.has(getActionKey(action))),
        [filteredActions, selectedActionKeys]
    );
    const allVisibleSelected = visibleActionKeys.length > 0 && visibleActionKeys.every((key) => selectedActionKeys.has(key));
    const hasActiveFilters = searchQuery || statusFilter !== "all" || projectFilter !== "all";

    function getProjectName(projectId: string | null): string {
        return projectId ? projectNameById.get(projectId) ?? "Unknown project" : "No project";
    }

    function clearFilters() {
        setSearchQuery("");
        setStatusFilter("all");
        setProjectFilter("all");
    }

    function toggleActionSelection(action: SiteActionItem) {
        const actionKey = getActionKey(action);
        setSelectedActionKeys((currentKeys) => {
            const nextKeys = new Set(currentKeys);
            if (nextKeys.has(actionKey)) nextKeys.delete(actionKey);
            else nextKeys.add(actionKey);
            return nextKeys;
        });
    }

    function toggleVisibleSelection() {
        setSelectedActionKeys((currentKeys) => {
            const nextKeys = new Set(currentKeys);
            if (allVisibleSelected) visibleActionKeys.forEach((key) => nextKeys.delete(key));
            else visibleActionKeys.forEach((key) => nextKeys.add(key));
            return nextKeys;
        });
    }

    function openStatusModal(action: SiteActionItem, newStatus: ActionStatus) {
        if (newStatus === action.status) return;
        setStatusModal({ action, newStatus, comment: "" });
    }

    async function saveStatusUpdate() {
        if (!statusModal || !statusModal.comment.trim()) return;
        const updateKey = getActionKey(statusModal.action);
        setUpdatingKey(updateKey);
        setError(null);
        setNotice(null);

        try {
            const updatedAction = await updateRegisterActionStatus(
                statusModal.action.id,
                statusModal.newStatus,
                statusModal.comment
            );
            setActions((current) => current.map((item) => (item.id === updatedAction.id ? updatedAction : item)));
            setStatusModal(null);
            setNotice("Action status updated with comment.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update action status");
        } finally {
            setUpdatingKey(null);
        }
    }

    async function handleCreateManualAction() {
        if (!manualForm.description.trim()) return;
        setCreatingAction(true);
        setError(null);
        setNotice(null);

        try {
            const action = await createManualAction({
                company_id: companyId,
                project_id: manualForm.project_id || null,
                description: manualForm.description,
                responsible: manualForm.responsible || null,
                due_date: manualForm.due_date || null,
                status: manualForm.status,
            });
            setActions((current) => [action, ...current]);
            setManualModalOpen(false);
            setManualForm({ description: "", responsible: "", due_date: "", status: "open", project_id: projects[0]?.id ?? "" });
            setNotice("Manual action created.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create manual action");
        } finally {
            setCreatingAction(false);
        }
    }

    async function handleCreateClientLink() {
        if (!shareProjectId) {
            setError("Select a project before creating a client link.");
            return;
        }
        setCreatingLink(true);
        setError(null);
        setNotice(null);
        setShareUrl("");
        setCopyError(null);

        try {
            const result = await createActionRegisterClientLink({
                company_id: companyId,
                project_id: shareProjectId,
                recipient_name: shareRecipient.name || null,
                recipient_email: shareRecipient.email || null,
                recipient_organisation: shareRecipient.organisation || null,
            });
            setShareUrl(result.url);
            // Add new link to the list immediately
            setClientLinks((current) => [result.link, ...current]);
            setNotice("Client link created successfully.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create client link");
        } finally {
            setCreatingLink(false);
        }
    }

    async function copyShareUrl() {
        if (!shareUrl) return;
        setCopyError(null);
        const result = await copyToClipboard(shareUrl);
        if (result.success) {
            setCopiedLinkId("new");
            setTimeout(() => setCopiedLinkId(null), 2000);
        } else {
            setCopyError(result.error || "Copy failed. Please select and copy manually.");
        }
    }

    async function loadClientLinks() {
        setLoadingLinks(true);
        setLinksError(null);
        try {
            const links = await fetchActionRegisterClientLinks(companyId);
            setClientLinks(links);
        } catch (err) {
            setLinksError(err instanceof Error ? err.message : "Failed to load client links");
        } finally {
            setLoadingLinks(false);
        }
    }

    async function handleRevokeLink(linkId: string) {
        if (!confirm("Are you sure you want to revoke this client link? The recipient will no longer be able to access the action register.")) {
            return;
        }
        setRevokingLinkId(linkId);
        setError(null);
        try {
            const result = await revokeActionRegisterClientLink(linkId, companyId);
            // Update the link in the list without full reload
            setClientLinks((current) =>
                current.map((link) => (link.id === linkId ? result.link : link))
            );
            setNotice("Client link revoked successfully.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to revoke link");
        } finally {
            setRevokingLinkId(null);
        }
    }

    async function handleOpenLink(linkId: string) {
        setOpeningLinkId(linkId);
        setError(null);
        try {
            const result = await regenerateActionRegisterClientLink(linkId, companyId);
            // Store the regenerated URL for copying
            setRegeneratedUrls((current) => {
                const next = new Map(current);
                next.set(linkId, result.url);
                return next;
            });
            // Open the fresh URL in a new tab
            window.open(result.url, "_blank");
            // Update the link in the list to reflect any changes
            setClientLinks((current) =>
                current.map((link) => (link.id === linkId ? { ...link, ...result.link } : link))
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to open link");
        } finally {
            setOpeningLinkId(null);
        }
    }

    async function copyExistingLinkUrl(linkId: string, url: string | null | undefined) {
        if (!url) {
            setCopyError("Click 'Open link' first to regenerate the URL, then you can copy it.");
            return;
        }
        setCopyError(null);
        const result = await copyToClipboard(url);
        if (result.success) {
            setCopiedLinkId(linkId);
            setTimeout(() => setCopiedLinkId(null), 2000);
        } else {
            setCopyError(result.error || "Copy failed. Please select and copy manually.");
        }
    }

    function openShareModal() {
        setShareModalOpen(true);
        setShareUrl("");
        setCopyError(null);
        setCopiedLinkId(null);
        // Load existing links when opening modal
        void loadClientLinks();
    }

    async function exportSelectedPdf() {
        // If nothing is explicitly selected, export ALL visible (filtered) actions
        const actionsToExport = selectedVisibleActions.length > 0 ? selectedVisibleActions : filteredActions;

        if (actionsToExport.length === 0) {
            setError("No action items to export. Adjust your filters or add actions.");
            return;
        }

        setExportingPdf(true);
        setError(null);

        try {
            const { jsPDF, autoTable } = await loadJsPDF();
            const doc = new jsPDF({ orientation: "landscape" });
            const generatedAt = new Date();
            const statusLabel = STATUS_FILTER_OPTIONS.find((option) => option.value === statusFilter)?.label ?? "All Statuses";
            const isSelected = selectedVisibleActions.length > 0;

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Action Register", 14, 16);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(95);
            doc.text(`Generated: ${generatedAt.toLocaleString("en-AU")} | Items: ${actionsToExport.length}${isSelected ? " (selected)" : ""} | Status: ${statusLabel}`, 14, 23);
            doc.setTextColor(0);

            autoTable(doc, {
                head: [["#", "Action", "Project", "Source", "Responsible", "Due", "Status", "Latest Update"]],
                body: actionsToExport.map((action, index) => {
                    return [
                        String(index + 1),
                        action.description || "Untitled action",
                        getProjectName(action.project_id),
                        action.source === "manual"
                            ? "Manual"
                            : `${action.source_document_title ?? "SiteDocs"}${action.source_document_reference ? ` (${action.source_document_reference})` : ""}`,
                        action.responsible || "Unassigned",
                        formatDate(action.due_date),
                        ACTION_STATUS_LABELS[action.status],
                        formatLatestUpdate(action),
                    ];
                }),
                startY: 28,
                styles: { fontSize: 7, cellPadding: 2.5, overflow: "linebreak" },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 16 },
                    1: { cellWidth: 60 },
                    2: { cellWidth: 34 },
                    3: { cellWidth: 40 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 22 },
                    6: { cellWidth: 24 },
                    7: { cellWidth: 48 },
                },
                margin: { left: 14, right: 14 },
            });

            doc.save(`action-register-${generatedAt.toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to export action register PDF");
        } finally {
            setExportingPdf(false);
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
                        Track SiteDocs meeting-minute actions and manual project actions in one shared register.
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                        {STATUS_FILTER_OPTIONS.map((option) => (
                            <button key={option.value} type="button" onClick={() => setStatusFilter(option.value)} className={`rounded-lg border px-3 py-2 text-left transition-colors ${statusFilter === option.value ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
                                <span className="block text-xs font-medium">{option.label}</span>
                                <span className="text-lg font-semibold">{counts[option.value]}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setManualModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">
                            <Plus className="h-4 w-4" />
                            Add Action
                        </button>
                        <button type="button" onClick={() => openShareModal()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100">
                            <Link2 className="h-4 w-4" />
                            Client link
                        </button>
                        <button type="button" onMouseEnter={preloadJsPDF} onClick={() => void exportSelectedPdf()} disabled={exportingPdf || filteredActions.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                            {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            Export PDF
                        </button>

                    </div>
                </div>
            </div>

            {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

            <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search actions, reports, responsible people, latest comments..." className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value as ProjectFilter)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Projects</option>
                    <option value="unassigned">No Project</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {hasActiveFilters && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" />Clear</button>}
            </div>

            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>{selectedVisibleActions.length > 0 ? `${selectedVisibleActions.length} of ${filteredActions.length} visible actions selected` : `${filteredActions.length} visible actions`}{hasActiveFilters ? " (filtered)" : ""}</span>
                {filteredActions.length > 0 && <button type="button" onClick={toggleVisibleSelection} className="text-left font-medium text-blue-600 hover:text-blue-700 sm:text-right">{allVisibleSelected ? "Clear selection" : "Select all visible"}</button>}
            </div>

            {filteredActions.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-medium text-slate-700">{actions.length === 0 ? "No action items found" : "No actions match your filters"}</p>
                    <p className="mt-1 text-sm text-slate-500">{actions.length === 0 ? "Generated SiteDocs actions and manual actions will appear here." : "Adjust the project, status, or search filters to widen the register."}</p>
                </div>
            ) : (
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                                <th className="w-12 px-4 py-3 text-left font-medium text-slate-700"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} aria-label="Select all visible actions for PDF export" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></th>
                                <th className="w-14 px-3 py-3 text-left font-medium text-slate-700">#</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Action</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Project</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Source</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Responsible</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Due</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                                <th className="px-4 py-3 text-left font-medium text-slate-700">Latest Update</th>
                                <th className="px-4 py-3 text-right font-medium text-slate-700">Open</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredActions.map((action, index) => {
                                const updateKey = getActionKey(action);
                                const isUpdating = updatingKey === updateKey;
                                const isSelected = selectedActionKeys.has(updateKey);
                                const canOpenSource = !!action.source_document_id;
                                const update = action.latest_update;

                                return (
                                    <tr key={updateKey} className="hover:bg-slate-50">
                                        <td className="px-4 py-4 align-top"><input type="checkbox" checked={isSelected} onChange={() => toggleActionSelection(action)} aria-label={`Include ${action.description || "action"} in PDF export`} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></td>
                                        <td className="w-14 px-3 py-4 align-top text-xs font-medium text-slate-500">{index + 1}</td>
                                        <td className="max-w-md px-4 py-4 align-top"><p className="font-medium text-slate-900">{action.description || "Untitled action"}</p></td>
                                        <td className="px-4 py-4 align-top text-slate-600"><span className="inline-flex items-center gap-1.5"><FolderOpen className="h-3.5 w-3.5 text-slate-400" />{getProjectName(action.project_id)}</span></td>
                                        <td className="max-w-xs px-4 py-4 align-top"><p className="font-medium text-slate-800">{action.source === "manual" ? "Manual" : action.source_document_title ?? "SiteDocs document"}</p><p className="mt-1 text-xs text-slate-500">{action.source === "manual" ? "Created in register" : `${DOCUMENT_TYPE_LABELS["meeting-minutes"]}${action.source_document_reference ? ` - ${action.source_document_reference}` : ""}`}</p></td>
                                        <td className="px-4 py-4 align-top text-slate-600">{action.responsible || "Unassigned"}</td>
                                        <td className="px-4 py-4 align-top text-slate-600">{formatDate(action.due_date)}</td>
                                        <td className="px-4 py-4 align-top"><select value={action.status} disabled={isUpdating} onChange={(event) => openStatusModal(action, event.target.value as ActionStatus)} className={`rounded-full border px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${STATUS_STYLES[action.status]}`} aria-label={`Update status for ${action.description}`}>{ACTION_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{isUpdating && <span className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Loader2 className="h-3 w-3 animate-spin" />Updating</span>}</td>
                                        <td className="max-w-xs px-4 py-4 align-top text-slate-600">{update ? <div><p className="text-xs font-medium text-slate-700">{formatDateTime(update.created_at)} · {update.updated_by_name}{update.updated_by_organisation ? `, ${update.updated_by_organisation}` : ""}</p><p className="mt-1 text-sm text-slate-700">“{update.comment}”</p></div> : <span className="text-xs text-slate-400">No update yet</span>}</td>
                                        <td className="px-4 py-4 text-right align-top">{canOpenSource ? <button type="button" onClick={() => router.push(`/dashboard/site-docs/${action.source_document_id}`)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50">Report<ArrowUpRight className="h-4 w-4" /></button> : <span className="text-xs text-slate-400">—</span>}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {statusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-900">Add status update</h3>
                        <p className="mt-1 text-sm text-slate-500">A comment is required for every status change.</p>
                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium text-slate-800">{statusModal.action.description}</p><p className="mt-2 text-slate-600">{ACTION_STATUS_LABELS[statusModal.action.status]} → {ACTION_STATUS_LABELS[statusModal.newStatus]}</p></div>
                        <label className="mt-4 block text-sm font-medium text-slate-700">Update comment</label>
                        <textarea value={statusModal.comment} onChange={(event) => setStatusModal((current) => current ? { ...current, comment: event.target.value } : current)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe what changed and who provided the update..." />
                        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setStatusModal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => void saveStatusUpdate()} disabled={!statusModal.comment.trim() || !!updatingKey} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{updatingKey ? "Saving..." : "Save update"}</button></div>
                    </div>
                </div>
            )}

            {manualModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-900">Add manual action</h3>
                        <p className="mt-1 text-sm text-slate-500">Create a project action without a source document.</p>
                        <div className="mt-5 space-y-4">
                            <div><label className="text-sm font-medium text-slate-700">Project</label><select value={manualForm.project_id} onChange={(event) => setManualForm((current) => ({ ...current, project_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
                            <div><label className="text-sm font-medium text-slate-700">Description *</label><textarea value={manualForm.description} onChange={(event) => setManualForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><div><label className="text-sm font-medium text-slate-700">Responsible</label><input value={manualForm.responsible} onChange={(event) => setManualForm((current) => ({ ...current, responsible: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="text-sm font-medium text-slate-700">Due date</label><input type="date" value={manualForm.due_date} onChange={(event) => setManualForm((current) => ({ ...current, due_date: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="text-sm font-medium text-slate-700">Status</label><select value={manualForm.status} onChange={(event) => setManualForm((current) => ({ ...current, status: event.target.value as ActionStatus }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{ACTION_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setManualModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => void handleCreateManualAction()} disabled={!manualForm.description.trim() || creatingAction} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{creatingAction ? "Creating..." : "Create action"}</button></div>
                    </div>
                </div>
            )}

            {shareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Client Access Links</h3>
                                <p className="mt-1 text-sm text-slate-500">Create and manage project-scoped client links. Recipients confirm their identity on first use.</p>
                            </div>
                            <button type="button" onClick={() => setShareModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Create New Link Section */}
                        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h4 className="text-sm font-semibold text-slate-900">Create New Link</h4>
                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Project *</label>
                                    <select value={shareProjectId} onChange={(event) => setShareProjectId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Select project</option>
                                        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Recipient Name</label>
                                    <input value={shareRecipient.name} onChange={(event) => setShareRecipient((current) => ({ ...current, name: event.target.value }))} placeholder="e.g., John Smith" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Email</label>
                                    <input type="email" value={shareRecipient.email} onChange={(event) => setShareRecipient((current) => ({ ...current, email: event.target.value }))} placeholder="recipient@example.com" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Organisation</label>
                                    <input value={shareRecipient.organisation} onChange={(event) => setShareRecipient((current) => ({ ...current, organisation: event.target.value }))} placeholder="e.g., ABC Consulting" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>

                            {/* Newly Created Link Display */}
                            {shareUrl && (
                                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                    <div className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-600" />
                                        <p className="text-sm font-medium text-emerald-800">Link created successfully</p>
                                    </div>
                                    <div className="mt-2">
                                        <input type="text" readOnly value={shareUrl} className="w-full rounded border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none" />
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void copyShareUrl()}
                                            disabled={copiedLinkId === "new"}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {copiedLinkId === "new" ? (
                                                <><Check className="h-3.5 w-3.5" />Copied!</>
                                            ) : (
                                                <><Copy className="h-3.5 w-3.5" />Copy Link</>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => window.open(shareUrl, "_blank")}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Open Link
                                        </button>
                                    </div>
                                </div>
                            )}

                            {copyError && (
                                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                        <span>{copyError}</span>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => void handleCreateClientLink()}
                                    disabled={!shareProjectId || creatingLink}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {creatingLink ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : <><Link2 className="h-4 w-4" />Generate Link</>}
                                </button>
                            </div>
                        </div>

                        {/* Existing Links List */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-slate-900">Existing Client Links</h4>
                                <button
                                    type="button"
                                    onClick={() => void loadClientLinks()}
                                    disabled={loadingLinks}
                                    className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                                >
                                    {loadingLinks ? "Loading..." : "Refresh"}
                                </button>
                            </div>

                            {linksError && (
                                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                        <span>{linksError}</span>
                                    </div>
                                </div>
                            )}

                            {loadingLinks ? (
                                <div className="mt-4 flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                    <span className="ml-2 text-sm text-slate-500">Loading links...</span>
                                </div>
                            ) : clientLinks.filter((l) => !l.revoked_at).length === 0 ? (
                                <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8 text-center">
                                    <Link2 className="mx-auto h-8 w-8 text-slate-300" />
                                    <p className="mt-2 text-sm text-slate-600">No active client links</p>
                                    <p className="text-xs text-slate-500">Create a new link above to share project access</p>
                                </div>
                            ) : (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr className="border-b border-slate-200">
                                                <th className="px-3 py-2 text-left font-medium text-slate-700">Recipient</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700">Project</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700">Created</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700">Status</th>
                                                <th className="px-3 py-2 text-right font-medium text-slate-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {clientLinks
                                                .filter((link) => !link.revoked_at)
                                                .map((link) => {
                                                    const status = getLinkStatus(link);
                                                    const projectName = Array.isArray(link.projects) ? link.projects[0]?.name : link.projects?.name;
                                                    const isRevoking = revokingLinkId === link.id;
                                                    const isOpening = openingLinkId === link.id;
                                                    const isCopied = copiedLinkId === link.id;

                                                    return (
                                                    <tr key={link.id} className="hover:bg-slate-50">
                                                        <td className="px-3 py-3">
                                                            <div className="font-medium text-slate-900">{link.recipient_name || "Unnamed recipient"}</div>
                                                            {link.recipient_email && <div className="text-xs text-slate-500">{link.recipient_email}</div>}
                                                            {link.recipient_organisation && <div className="text-xs text-slate-500">{link.recipient_organisation}</div>}
                                                        </td>
                                                        <td className="px-3 py-3 text-slate-700">{projectName || "Unknown project"}</td>
                                                        <td className="px-3 py-3 text-slate-600">{formatLinkDateTime(link.created_at)}</td>
                                                        <td className="px-3 py-3">
                                                            {status === "active" && (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                                    <Check className="h-3 w-3" /> Active
                                                                </span>
                                                            )}
                                                            {status === "expired" && (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                                    <AlertCircle className="h-3 w-3" /> Expired
                                                                </span>
                                                            )}
                                                            {status === "revoked" && (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                                                    <X className="h-3 w-3" /> Revoked
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {status === "active" && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => void handleOpenLink(link.id)}
                                                                            disabled={isOpening}
                                                                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                                                            title={isOpening ? "Opening..." : "Open link (regenerates token)"}
                                                                        >
                                                                            {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => void copyExistingLinkUrl(link.id, regeneratedUrls.get(link.id))}
                                                                            disabled={isCopied}
                                                                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                                                            title={isCopied ? "Copied!" : regeneratedUrls.has(link.id) ? "Copy URL" : "Open link first to enable copy"}
                                                                        >
                                                                            {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Clipboard className="h-4 w-4" />}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => void handleRevokeLink(link.id)}
                                                                            disabled={isRevoking}
                                                                            className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                                                            title="Revoke link"
                                                                        >
                                                                            {isRevoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
                            <button type="button" onClick={() => setShareModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}