"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Search, X } from "lucide-react";
import { ACTION_STATUS_LABELS, ACTION_STATUS_OPTIONS, type ActionStatus, type SiteActionItem } from "@/lib/site-docs/types";

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

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All Statuses" },
    ...ACTION_STATUS_OPTIONS,
];

const STATUS_STYLES: Record<ActionStatus, string> = {
    open: "border-amber-300 bg-amber-50 text-amber-700",
    "in-progress": "border-blue-300 bg-blue-50 text-blue-700",
    "council-response-provided": "border-violet-300 bg-violet-50 text-violet-700",
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
            setNotice("Action status updated.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    }

    if (loading) {
        return <div className="min-h-screen bg-slate-100 px-4 py-10"><div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div></div>;
    }

    return (
        <div className="min-h-screen bg-slate-100 px-4 py-8">
            <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Buildstate client action register</p>
                        <h1 className="mt-2 text-2xl font-bold text-slate-900">{link?.project_name ?? "Project action register"}</h1>
                        <p className="mt-1 text-sm text-slate-500">{link?.company_name ?? "Buildstate"}</p>
                    </div>
                    {identityConfirmed && link?.recipient_name && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            Updating as <span className="font-semibold">{link.recipient_name}</span>{link.recipient_organisation ? `, ${link.recipient_organisation}` : ""}
                        </div>
                    )}
                </div>

                {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                {notice && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

                {!identityConfirmed ? (
                    <div className="mt-8 max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h2 className="text-lg font-semibold text-slate-900">Confirm your details</h2>
                        <p className="mt-1 text-sm text-slate-500">First time only. Your details are saved against this secure link so future updates are attributed correctly.</p>
                        <div className="mt-5 space-y-4">
                            <div><label className="text-sm font-medium text-slate-700">Name *</label><input value={identityForm.name} onChange={(event) => setIdentityForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">Organisation *</label><input value={identityForm.organisation} onChange={(event) => setIdentityForm((current) => ({ ...current, organisation: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">Email <span className="font-normal text-slate-400">recommended</span></label><input type="email" value={identityForm.email} onChange={(event) => setIdentityForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        </div>
                        <button type="button" onClick={() => void confirmIdentity()} disabled={!identityForm.name.trim() || !identityForm.organisation.trim() || savingIdentity} className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{savingIdentity ? "Saving..." : "Confirm and open register"}</button>
                    </div>
                ) : (
                    <>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search actions, responsible people, comments..." className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                            {(searchQuery || statusFilter !== "all") && <button type="button" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" />Clear</button>}
                        </div>

                        {filteredActions.length === 0 ? <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-medium text-slate-700">No actions match your filters</p></div> : (
                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50"><tr className="border-b border-slate-200"><th className="px-4 py-3 text-left font-medium text-slate-700">Action</th><th className="px-4 py-3 text-left font-medium text-slate-700">Source</th><th className="px-4 py-3 text-left font-medium text-slate-700">Responsible</th><th className="px-4 py-3 text-left font-medium text-slate-700">Due</th><th className="px-4 py-3 text-left font-medium text-slate-700">Status</th><th className="px-4 py-3 text-left font-medium text-slate-700">Latest update</th></tr></thead>
                                    <tbody className="divide-y divide-slate-200">{filteredActions.map((action) => <tr key={action.id} className="hover:bg-slate-50"><td className="max-w-md px-4 py-4 align-top"><p className="font-medium text-slate-900">{action.description}</p><p className="mt-1 text-xs text-slate-500">{action.action_number || "Action"}</p></td><td className="px-4 py-4 align-top text-slate-600">{action.source === "manual" ? "Manual" : action.source_document_title ?? "SiteDocs"}</td><td className="px-4 py-4 align-top text-slate-600">{action.responsible || "Unassigned"}</td><td className="px-4 py-4 align-top text-slate-600">{formatDate(action.due_date)}</td><td className="px-4 py-4 align-top"><select value={action.status} disabled={updatingId === action.id} onChange={(event) => openStatusModal(action, event.target.value as ActionStatus)} className={`rounded-full border px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${STATUS_STYLES[action.status]}`}>{ACTION_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td><td className="max-w-xs px-4 py-4 align-top text-slate-600">{action.latest_update ? <div><p className="text-xs font-medium text-slate-700">{formatDateTime(action.latest_update.created_at)} · {action.latest_update.updated_by_name}{action.latest_update.updated_by_organisation ? `, ${action.latest_update.updated_by_organisation}` : ""}</p><p className="mt-1">“{action.latest_update.comment}”</p></div> : <span className="text-xs text-slate-400">No update yet</span>}</td></tr>)}</tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {statusModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h3 className="text-lg font-semibold text-slate-900">Add status update</h3><p className="mt-1 text-sm text-slate-500">A comment is required for every status change.</p><div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium text-slate-800">{statusModal.action.description}</p><p className="mt-2 text-slate-600">{ACTION_STATUS_LABELS[statusModal.action.status]} → {ACTION_STATUS_LABELS[statusModal.newStatus]}</p></div><label className="mt-4 block text-sm font-medium text-slate-700">Update comment</label><textarea value={statusModal.comment} onChange={(event) => setStatusModal((current) => current ? { ...current, comment: event.target.value } : current)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe the status update..." /><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setStatusModal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => void saveStatusUpdate()} disabled={!statusModal.comment.trim() || !!updatingId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{updatingId ? "Saving..." : "Save update"}</button></div></div></div>}
            </div>
        </div>
    );
}