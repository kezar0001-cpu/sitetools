"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Loader2, Search, X } from "lucide-react";
import { ACTION_STATUS_LABELS, ACTION_STATUS_OPTIONS, type ActionStatus, type SiteActionItem } from "@/lib/site-docs/types";
import { loadJsPDF, preloadJsPDF } from "@/lib/dynamicImports";

type StatusFilter = ActionStatus | "all";

interface PublicLinkInfo {
    id: string;
    project_name: string;
    company_name: string;
    recipient_name: string | null;
    recipient_email: string | null;
    recipient_organisation: string | null;
    role: string;
    identity_confirmed_at: string | null;
}

interface StatusModalState {
    action: SiteActionItem;
    newStatus: ActionStatus;
    comment: string;
}

// Filter out council-response-provided as it doesn't make sense for client view
const CLIENT_STATUS_OPTIONS = ACTION_STATUS_OPTIONS.filter((opt) => opt.value !== "council-response-provided");

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All Statuses" },
    ...CLIENT_STATUS_OPTIONS,
    // Add explicit closed filter since closed is hidden by default
    { value: "closed", label: "Closed Only" },
];

const STATUS_STYLES: Record<ActionStatus, string> = {
    open: "border-amber-300 bg-amber-50 text-amber-700",
    "in-progress": "border-blue-300 bg-blue-50 text-blue-700",
    "council-response-provided": "border-violet-300 bg-violet-50 text-violet-700",
    closed: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

// Exclude council-response-provided from client view styles
const CLIENT_STATUS_STYLES: Record<Exclude<ActionStatus, "council-response-provided">, string> = {
    open: "border-amber-300 bg-amber-50 text-amber-700",
    "in-progress": "border-blue-300 bg-blue-50 text-blue-700",
    closed: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

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

export default function ClientActionRegisterPage({ linkId, token }: { linkId: string; token: string }) {
    const [link, setLink] = useState<PublicLinkInfo | null>(null);
    const [actions, setActions] = useState<SiteActionItem[]>([]);
    const [identityConfirmed, setIdentityConfirmed] = useState(false);
    const [identityForm, setIdentityForm] = useState({ name: "", organisation: "", email: "" });
    const [loading, setLoading] = useState(true);
    const [savingIdentity, setSavingIdentity] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [statusModal, setStatusModal] = useState<StatusModalState | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [completionMode, setCompletionMode] = useState(false);
    const [updatedCount, setUpdatedCount] = useState(0);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/client/action-register/${linkId}?token=${encodeURIComponent(token)}`);
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data.error || "Unable to load action register");
                setLink(data.link);
                setIdentityConfirmed(!!data.identityConfirmed);
                setActions(data.actions ?? []);
                // Pre-fill form with saved recipient details for returning users
                if (data.link?.recipient_name) {
                    setIdentityForm({
                        name: data.link.recipient_name ?? "",
                        organisation: data.link.recipient_organisation ?? "",
                        email: data.link.recipient_email ?? "",
                    });
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to load action register");
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, [linkId, token]);

    const filteredActions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return actions.filter((action) => {
            // Default view: hide closed actions unless explicitly filtered
            if (statusFilter === "all" && action.status === "closed") return false;
            // Hide council-response-provided from client view entirely
            if (action.status === "council-response-provided") return false;
            if (statusFilter !== "all" && action.status !== statusFilter) return false;
            if (!query) return true;
            return [
                action.description,
                action.responsible ?? "",
                action.source_document_title ?? "Manual action",
                action.source_document_reference ?? "",
                action.latest_update?.comment ?? "",
                action.latest_update?.updated_by_name ?? "",
            ].some((value) => value.toLowerCase().includes(query));
        });
    }, [actions, searchQuery, statusFilter]);

    // Count visible vs total for "showing X of Y" indicator
    const visibleCount = filteredActions.length;
    const totalOpenCount = actions.filter((a) => a.status !== "closed" && a.status !== "council-response-provided").length;
    const closedCount = actions.filter((a) => a.status === "closed").length;

    // Selection helpers
    const selectedVisibleActions = useMemo(
        () => filteredActions.filter((action) => selectedActionIds.has(action.id)),
        [filteredActions, selectedActionIds]
    );
    const allVisibleSelected = visibleCount > 0 && selectedVisibleActions.length === visibleCount;

    function toggleActionSelection(actionId: string) {
        setSelectedActionIds((current) => {
            const next = new Set(current);
            if (next.has(actionId)) {
                next.delete(actionId);
            } else {
                next.add(actionId);
            }
            return next;
        });
    }

    function toggleVisibleSelection() {
        if (allVisibleSelected) {
            // Deselect all visible
            setSelectedActionIds((current) => {
                const next = new Set(current);
                filteredActions.forEach((a) => next.delete(a.id));
                return next;
            });
        } else {
            // Select all visible
            setSelectedActionIds((current) => {
                const next = new Set(current);
                filteredActions.forEach((a) => next.add(a.id));
                return next;
            });
        }
    }

    async function confirmIdentity() {
        if (!identityForm.name.trim() || !identityForm.organisation.trim()) return;
        setSavingIdentity(true);
        setError(null);
        try {
            const response = await fetch(`/api/client/action-register/${linkId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, ...identityForm }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Failed to confirm identity");
            setLink(data.link);
            setActions(data.actions ?? []);
            setIdentityConfirmed(true);
            setNotice("Identity confirmed. You can now update action statuses.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to confirm identity");
        } finally {
            setSavingIdentity(false);
        }
    }

    function openStatusModal(action: SiteActionItem, newStatus: ActionStatus) {
        if (newStatus === action.status) return;
        setStatusModal({ action, newStatus, comment: "" });
    }

    async function saveStatusUpdate() {
        if (!statusModal || !statusModal.comment.trim()) return;
        setUpdatingId(statusModal.action.id);
        setError(null);
        setNotice(null);
        try {
            const response = await fetch(`/api/client/action-register/${linkId}/actions/${statusModal.action.id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, status: statusModal.newStatus, comment: statusModal.comment }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Failed to update status");
            setActions((current) => current.map((action) => action.id === data.action.id ? data.action : action));
            setStatusModal(null);
            setUpdatedCount((c) => c + 1);
            setLastSavedAt(new Date());
            setNotice("Saved. This update has been recorded against your name and is now visible to the project team.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    }

    async function exportSelectedPdf() {
        if (selectedVisibleActions.length === 0) {
            setError("Select at least one action to export.");
            return;
        }
        setExportingPdf(true);
        setError(null);
        try {
            const { jsPDF, autoTable } = await loadJsPDF();
            const doc = new jsPDF({ orientation: "landscape" });
            const generatedAt = new Date();
            const statusLabel = statusFilter === "all" ? "Open Actions" : STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "Filtered Actions";

            // Header
            doc.setFontSize(16);
            doc.text(`${link?.project_name ?? "Project"} - Action Register`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Generated: ${generatedAt.toLocaleString("en-AU")} | ${link?.company_name ?? "Buildstate"}`, 14, 28);
            doc.text(`Filter: ${statusLabel} (${selectedVisibleActions.length} of ${filteredActions.length} selected)`, 14, 34);

            // Table with continuous numbering
            autoTable(doc, {
                startY: 40,
                head: [["#", "Action", "Source", "Responsible", "Due", "Status"]],
                body: selectedVisibleActions.map((action, index) => [
                    String(index + 1),
                    action.description || "Untitled",
                    action.source === "manual" ? "Manual" : action.source_document_title ?? "SiteDocs",
                    action.responsible || "Unassigned",
                    formatDate(action.due_date),
                    ACTION_STATUS_LABELS[action.status],
                ]),
                styles: { fontSize: 9, cellPadding: 2 },
                headStyles: { fillColor: [59, 130, 246], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
            });

            doc.save(`${link?.project_name?.replace(/\s+/g, "_") ?? "Project"}_Action_Register_${generatedAt.toISOString().split("T")[0]}.pdf`);
            setNotice(`PDF exported with ${selectedVisibleActions.length} action${selectedVisibleActions.length === 1 ? "" : "s"}.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to export PDF");
        } finally {
            setExportingPdf(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-6 sm:py-10">
                <div className="mx-auto max-w-6xl rounded-2xl bg-white p-4 sm:p-6 shadow">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 px-3 py-4 sm:px-4 sm:py-8">
            <div className="mx-auto max-w-6xl rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        {identityConfirmed ? (
                            <>
                                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Secure project action update link</p>
                                <h1 className="mt-2 text-2xl font-bold text-slate-900">{link?.project_name ?? "Project action register"}</h1>
                                <p className="mt-1 text-sm text-slate-500">{link?.company_name ?? "Buildstate"}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Buildstate client action register</p>
                                <h1 className="mt-2 text-2xl font-bold text-slate-900">{link?.project_name ?? "Project action register"}</h1>
                                <p className="mt-1 text-sm text-slate-500">{link?.company_name ?? "Buildstate"}</p>
                            </>
                        )}
                    </div>
                    {identityConfirmed && link?.recipient_name && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            Updating as <span className="font-semibold">{link.recipient_name}</span>{link.recipient_organisation ? `, ${link.recipient_organisation}` : ""}
                        </div>
                    )}
                </div>

                {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                {notice && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

                {/* Fatal error state - don't show forms if link is invalid */}
                {error && !link ? (
                    <div className="mt-8 sm:mt-12 text-center">
                        <p className="text-slate-600">Unable to load action register. The link may have been revoked, expired, or the URL is incomplete.</p>
                        <p className="mt-2 text-sm text-slate-500">Please check the link or contact the project team for assistance.</p>
                    </div>
                ) : !identityConfirmed ? (
                    <div className="mt-6 sm:mt-8 max-w-xl rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                        <h2 className="text-base sm:text-lg font-semibold text-slate-900">Confirm your details</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            You are accessing a secure action update link shared by {link?.company_name ?? "the project team"}. Changes are saved immediately and recorded against your name.
                        </p>
                        <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-4">
                            <div><label className="text-sm font-medium text-slate-700">Name *</label><input value={identityForm.name} onChange={(event) => setIdentityForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">Organisation *</label><input value={identityForm.organisation} onChange={(event) => setIdentityForm((current) => ({ ...current, organisation: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">Email <span className="font-normal text-slate-400">recommended</span></label><input type="email" value={identityForm.email} onChange={(event) => setIdentityForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        </div>
                        <button type="button" onClick={() => void confirmIdentity()} disabled={!identityForm.name.trim() || !identityForm.organisation.trim() || savingIdentity} className="mt-4 sm:mt-5 w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2.5 sm:py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{savingIdentity ? "Saving..." : "Confirm and open register"}</button>
                    </div>
                ) : completionMode ? (
                    // Completion panel
                    <div className="mt-8 sm:mt-12 max-w-lg mx-auto text-center">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                            <h2 className="mt-4 text-xl font-semibold text-slate-900">Thanks, your updates have been saved.</h2>
                            <p className="mt-2 text-slate-600">Your latest changes are now visible to the project team.</p>
                            <p className="mt-1 text-sm text-slate-500">
                                {updatedCount > 0 && `You made ${updatedCount} update${updatedCount === 1 ? "" : "s"}.`}
                                {lastSavedAt && ` Last saved at ${lastSavedAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}.`}
                            </p>
                            <p className="mt-4 text-sm text-slate-600">You may now close this tab, or return to the register if you need to make another update.</p>
                            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    type="button"
                                    onClick={() => setCompletionMode(false)}
                                    className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Return to register
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.close();
                                        // If window.close() is blocked (most modern browsers), show message
                                        setTimeout(() => {
                                            // The button stays visible, user sees they can close manually
                                        }, 100);
                                    }}
                                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                >
                                    Close this tab
                                </button>
                            </div>
                            <p className="mt-3 text-xs text-slate-400">You can now close this tab.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mt-4 sm:mt-6 flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                                    <div className="relative flex-1 order-2 sm:order-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search actions, responsible people, comments..." className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                                    <div className="flex gap-2 order-1 sm:order-2">
                                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none">{STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                                        {(searchQuery || statusFilter !== "all") && <button type="button" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /><span className="hidden sm:inline">Clear</span></button>}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCompletionMode(true)}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
                                >
                                    Finish updates
                                </button>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs text-slate-500">
                                        Showing {visibleCount} of {totalOpenCount} open actions
                                        {closedCount > 0 && ` (${closedCount} closed hidden)`}
                                        {lastSavedAt && (
                                            <span className="ml-2 text-emerald-600">
                                                Last saved: {lastSavedAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {selectedVisibleActions.length} of {visibleCount} selected for PDF export
                                        {visibleCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={toggleVisibleSelection}
                                                className="ml-2 font-medium text-blue-600 hover:text-blue-700"
                                            >
                                                {allVisibleSelected ? "Clear visible" : "Select all visible"}
                                            </button>
                                        )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onMouseEnter={preloadJsPDF}
                                    onClick={() => void exportSelectedPdf()}
                                    disabled={exportingPdf || selectedVisibleActions.length === 0}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                    Export selected PDF
                                </button>
                            </div>
                        </div>

                        {filteredActions.length === 0 ? <div className="mt-6 sm:mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-medium text-slate-700">No actions match your filters</p></div> : (
                            <div className="mt-4 sm:mt-6">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="border-b border-slate-200">
                                            <th className="px-2 sm:px-3 py-3 text-center font-medium text-slate-700 w-10">#</th>
                                            <th className="px-2 sm:px-3 py-3 text-center font-medium text-slate-700 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={allVisibleSelected}
                                                    onChange={toggleVisibleSelection}
                                                    aria-label={allVisibleSelected ? "Deselect all visible" : "Select all visible"}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-2 sm:px-3 py-3 text-left font-medium text-slate-700">Action</th>
                                            <th className="px-2 sm:px-3 py-3 text-left font-medium text-slate-700 hidden sm:table-cell">Source</th>
                                            <th className="px-2 sm:px-3 py-3 text-left font-medium text-slate-700 hidden md:table-cell">Responsible</th>
                                            <th className="px-2 sm:px-3 py-3 text-left font-medium text-slate-700">Due</th>
                                            <th className="px-2 sm:px-3 py-3 text-left font-medium text-slate-700">Status</th>
                                            <th className="px-2 sm:px-3 py-3 text-left font-medium text-slate-700 hidden lg:table-cell">Latest update</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredActions.map((action, index) => {
                                            const isSelected = selectedActionIds.has(action.id);
                                            return (
                                                <tr key={action.id} className="hover:bg-slate-50">
                                                    <td className="px-2 sm:px-3 py-3 sm:py-4 text-center text-slate-500 text-xs">{index + 1}</td>
                                                    <td className="px-2 sm:px-3 py-3 sm:py-4 text-center align-top">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleActionSelection(action.id)}
                                                            aria-label={`Select action ${index + 1} for PDF export`}
                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-2 sm:px-3 py-3 sm:py-4 align-top">
                                                        <p className="font-medium text-slate-900 text-sm sm:text-base">{action.description}</p>
                                                        <p className="mt-1 text-xs text-slate-500 sm:hidden">{action.source === "manual" ? "Manual" : action.source_document_title ?? "SiteDocs"}</p>
                                                    </td>
                                                    <td className="px-2 sm:px-3 py-3 sm:py-4 align-top text-slate-600 whitespace-nowrap hidden sm:table-cell">{action.source === "manual" ? "Manual" : action.source_document_title ?? "SiteDocs"}</td>
                                                    <td className="px-2 sm:px-3 py-3 sm:py-4 align-top text-slate-600 whitespace-nowrap hidden md:table-cell">{action.responsible || "Unassigned"}</td>
                                                    <td className="px-2 sm:px-3 py-3 sm:py-4 align-top text-slate-600 whitespace-nowrap">{formatDate(action.due_date)}</td>
                                                    <td className="px-2 sm:px-3 py-3 sm:py-4 align-top whitespace-nowrap">
                                                        <select
                                                            value={action.status}
                                                            disabled={updatingId === action.id}
                                                            onChange={(event) => openStatusModal(action, event.target.value as ActionStatus)}
                                                            className={`rounded-full border px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${action.status === "council-response-provided" ? STATUS_STYLES["council-response-provided"] : CLIENT_STATUS_STYLES[action.status as Exclude<ActionStatus, "council-response-provided">]}`}
                                                        >
                                                            {CLIENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 sm:px-3 py-3 sm:py-4 align-top text-slate-600 hidden lg:table-cell">
                                                        {action.latest_update ? (
                                                            <div>
                                                                <p className="text-xs font-medium text-slate-700">{formatDateTime(action.latest_update.created_at)}</p>
                                                                <p className="text-xs text-slate-500">{action.latest_update.updated_by_name}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">No update</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Bottom finish CTA */}
                        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-sm text-slate-600">All updates are saved immediately. You can close this page when finished.</p>
                            <button
                                type="button"
                                onClick={() => setCompletionMode(true)}
                                className="w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                Done reviewing? Finish updates
                            </button>
                        </div>
                    </>
                )}

                {statusModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4"><div className="w-full max-w-lg rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"><h3 className="text-base sm:text-lg font-semibold text-slate-900">Add status update</h3><p className="mt-1 text-sm text-slate-500">A comment is required for every status change.</p><div className="mt-3 sm:mt-4 rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium text-slate-800 line-clamp-2">{statusModal.action.description}</p><p className="mt-2 text-slate-600">{ACTION_STATUS_LABELS[statusModal.action.status]} → {ACTION_STATUS_LABELS[statusModal.newStatus]}</p></div><label className="mt-3 sm:mt-4 block text-sm font-medium text-slate-700">Update comment</label><textarea value={statusModal.comment} onChange={(event) => setStatusModal((current) => current ? { ...current, comment: event.target.value } : current)} className="mt-2 min-h-24 sm:min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe the status update..." /><div className="mt-4 sm:mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2"><button type="button" onClick={() => setStatusModal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => void saveStatusUpdate()} disabled={!statusModal.comment.trim() || !!updatingId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{updatingId ? "Saving..." : "Save update"}</button></div></div></div>}
            </div>
        </div>
    );
}