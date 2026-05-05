"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2, Trash2, FolderOpen, Save, FileEdit } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { fetchDocument, deleteDocument, exportDocument, updateDocument } from "@/lib/site-docs/client";
import { getProjects } from "@/lib/workspace/client";
import type { Project } from "@/lib/workspace/types";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_BADGE, type ActionStatus, type SiteDocument } from "@/lib/site-docs/types";
import { DocumentPreview } from "../components/DocumentPreview";
import type { ActionItem } from "@/lib/site-docs/types";

// ── Action Item Tracker Sub-component ──

interface ActionItemTrackerProps {
    actionItems: ActionItem[];
    onUpdate: (items: ActionItem[]) => Promise<void> | void;
}

function ActionItemTracker({ actionItems, onUpdate }: ActionItemTrackerProps) {
    const [updating, setUpdating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleStatusChange(itemId: string, newStatus: ActionStatus) {
        setUpdating(itemId);
        setError(null);
        
        try {
            const updatedItems = actionItems.map(item =>
                item.id === itemId
                    ? { ...item, status: newStatus, updated_at: new Date().toISOString() }
                    : item
            );
            await onUpdate(updatedItems);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update status");
        } finally {
            setUpdating(null);
        }
    }

    function formatTimestamp(timestamp?: string): string {
        if (!timestamp) return "—";
        const date = new Date(timestamp);
        return date.toLocaleString("en-AU", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getStatusColor(status: string): string {
        switch (status) {
            case "open": return "bg-amber-100 text-amber-700 border-amber-300";
            case "in-progress": return "bg-blue-100 text-blue-700 border-blue-300";
            case "closed": return "bg-emerald-100 text-emerald-700 border-emerald-300";
            default: return "bg-slate-100 text-slate-700 border-slate-300";
        }
    }

    return (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Action Items</h3>
                <p className="text-sm text-slate-500 mt-1">Track and update the status of each action item</p>
            </div>
            
            {error && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}
            
            <div className="p-6">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">#</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Description</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Responsible</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Due Date</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {actionItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="py-4 px-4 text-sm font-medium text-slate-900">{item.number}</td>
                                    <td className="py-4 px-4 text-sm text-slate-700">{item.description}</td>
                                    <td className="py-4 px-4 text-sm text-slate-600">{item.responsible || "—"}</td>
                                    <td className="py-4 px-4 text-sm text-slate-600">
                                        {item.due_date ? new Date(item.due_date).toLocaleDateString("en-AU") : "—"}
                                    </td>
                                    <td className="py-4 px-4">
                                        <select
                                            value={item.status}
                                            onChange={(e) => handleStatusChange(item.id, e.target.value as ActionStatus)}
                                            disabled={updating === item.id}
                                            className={`text-sm font-medium rounded-full border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 ${getStatusColor(item.status)}`}
                                        >
                                            <option value="open">Open</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-slate-500">
                                        {updating === item.id ? (
                                            <span className="flex items-center gap-1">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Updating...
                                            </span>
                                        ) : (
                                            formatTimestamp(item.updated_at)
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function DocumentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { loading: workspaceLoading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });
    const [document, setDocument] = useState<SiteDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState<null | "pdf" | "docx">(null);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [project, setProject] = useState<Project | null>(null);
    const [saving, setSaving] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionValue, setRevisionValue] = useState("Rev A");
    const [editingRevision, setEditingRevision] = useState(false);
    const latestGeneratedContentRef = useRef<SiteDocument["generated_content"] | null>(null);
    const latestUpdatedAtRef = useRef<string | null>(null);

    function applyGeneratedContentUpdate(
        updater: (current: SiteDocument["generated_content"]) => SiteDocument["generated_content"]
    ) {
        const baseContent = latestGeneratedContentRef.current ?? document?.generated_content;
        if (baseContent) {
            latestGeneratedContentRef.current = updater(baseContent);
        }

        setDocument((prev) => {
            if (!prev) return prev;
            const nextGeneratedContent = latestGeneratedContentRef.current ?? updater(prev.generated_content);
            latestGeneratedContentRef.current = nextGeneratedContent;
            setUnsavedChanges(true);
            return {
                ...prev,
                generated_content: nextGeneratedContent,
                updated_at: new Date().toISOString(),
            };
        });
    }

    async function persistLatestGeneratedContent() {
        if (!document) return;
        const latestGeneratedContent = latestGeneratedContentRef.current ?? document.generated_content;
        setSaving(true);
        try {
            const updatedDoc = await updateDocument(
                document.id,
                { generated_content: latestGeneratedContent },
                { expectedUpdatedAt: latestUpdatedAtRef.current ?? document.updated_at }
            );
            latestGeneratedContentRef.current = updatedDoc.generated_content;
            latestUpdatedAtRef.current = updatedDoc.updated_at;
            setDocument(updatedDoc);
            setUnsavedChanges(false);
            setLastSavedAt(updatedDoc.updated_at);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save document");
            throw err;
        } finally {
            setSaving(false);
        }
    }

    const documentId = params.documentId as string;
    const companyId = summary?.activeMembership?.company_id;

    useEffect(() => {
        if (!documentId) {
            setError("Invalid document");
            setLoading(false);
            return;
        }
        // Wait for workspace to finish loading before attempting fetch
        if (!companyId) return;

        async function loadDocument() {
            try {
                const doc = await fetchDocument(documentId);
                if (!doc) {
                    setError("Document not found");
                } else {
                    setDocument(doc);
                    latestGeneratedContentRef.current = doc.generated_content;
                    latestUpdatedAtRef.current = doc.updated_at;
                    setLastSavedAt(doc.updated_at);
                    setRevisionValue(doc.revision || "Rev A");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load document");
            } finally {
                setLoading(false);
            }
        }

        loadDocument();
    }, [documentId, companyId]);

    // Fetch project details if document has project_id
    useEffect(() => {
        async function fetchProject() {
            if (!document?.project_id) {
                setProject(null);
                return;
            }
            const companyId = summary?.activeMembership?.company_id;
            if (!companyId) return;
            try {
                const projects = await getProjects(companyId);
                const foundProject = projects.find(p => p.id === document.project_id);
                setProject(foundProject || null);
            } catch (err) {
                console.error("Failed to load project:", err);
            }
        }
        if (document && summary?.activeMembership?.company_id) {
            fetchProject();
        }
    }, [document, document?.project_id, summary?.activeMembership?.company_id]);

    async function handleExport(format: "pdf" | "docx") {
        if (!document) return;

        setExporting(format);
        try {
            const activeElement = typeof window !== "undefined" ? window.document.activeElement : null;
            if (activeElement instanceof HTMLElement) {
                activeElement.blur();
                await new Promise((resolve) => setTimeout(resolve, 0));
            }

            // Flush any in-progress edits before export
            await persistLatestGeneratedContent();
            await exportDocument(document.id, format);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Export failed");
        } finally {
            setExporting(null);
        }
    }

    async function handleDelete() {
        if (!document) return;

        setDeleting(true);
        setShowDeleteModal(false);
        
        try {
            await deleteDocument(document.id);
            router.push("/dashboard/site-docs");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
            setDeleting(false);
        }
    }

    function openDeleteModal() {
        setShowDeleteModal(true);
    }

    function closeDeleteModal() {
        if (!deleting) {
            setShowDeleteModal(false);
        }
    }

    async function handleRevisionUpdate() {
        if (!document) return;

        const nextRevision = revisionValue.trim() || "Rev A";

        setEditingRevision(true);
        setError(null);

        try {
            const updatedDoc = await updateDocument(
                document.id,
                { revision: nextRevision },
                { expectedUpdatedAt: latestUpdatedAtRef.current ?? document.updated_at }
            );

            latestGeneratedContentRef.current = updatedDoc.generated_content;
            latestUpdatedAtRef.current = updatedDoc.updated_at;
            setDocument(updatedDoc);
            setRevisionValue(updatedDoc.revision || "Rev A");
            setLastSavedAt(updatedDoc.updated_at);
            setShowRevisionModal(false);
            setUnsavedChanges(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update revision");
        } finally {
            setEditingRevision(false);
        }
    }

    if (workspaceLoading || !summary) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading document...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-2">⚠️</div>
                    <p className="text-red-700 font-medium">{error}</p>
                    <button
                        onClick={() => router.push("/dashboard/site-docs")}
                        className="mt-4 text-blue-600 hover:text-blue-700"
                    >
                        ← Back to SiteDocs
                    </button>
                </div>
            </div>
        );
    }

    if (!document) return null;

    const typeLabel = DOCUMENT_TYPE_LABELS[document.document_type];
    const statusClass = DOCUMENT_STATUS_BADGE[document.status];

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => router.push("/dashboard/site-docs")}
                            className="p-2 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </button>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg font-bold text-slate-900 truncate">{document.title}</h1>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border shrink-0 ${statusClass}`}>
                                    {DOCUMENT_STATUS_LABELS[document.status]}
                                </span>
                                {project && (
                                    <button
                                        onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                                        className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200 hover:bg-blue-100 transition-colors shrink-0"
                                    >
                                        <FolderOpen className="h-3 w-3" />
                                        {project.name}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowRevisionModal(true)}
                                    className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-300 hover:bg-slate-200 transition-colors shrink-0"
                                    title="Click to change revision"
                                >
                                    <FileEdit className="h-3 w-3" />
                                    {document.revision || "Rev A"}
                                </button>
                            </div>
                            <p className="text-sm text-slate-500">{typeLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                        <button
                            onClick={() => void persistLatestGeneratedContent()}
                            disabled={saving || !unsavedChanges}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Save changes
                        </button>
                        <button
                            onClick={() => handleExport("pdf")}
                            disabled={exporting !== null || saving}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {exporting === "pdf" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            PDF
                        </button>
                        <button
                            onClick={() => handleExport("docx")}
                            disabled={exporting !== null || saving}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {exporting === "docx" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4" />
                            )}
                            Word
                        </button>
                        <button
                            onClick={openDeleteModal}
                            disabled={deleting}
                            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                            {deleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">Delete</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                <div className="mb-4 text-sm text-slate-500">
                    {saving
                        ? "Saving latest changes..."
                        : unsavedChanges
                            ? "You have unsaved changes."
                            : lastSavedAt
                                ? `All changes saved at ${new Date(lastSavedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                                : "No saved changes yet."}
                </div>

                {/* Document Preview */}
                {document && (
                    <DocumentPreview
                        content={document.generated_content}
                        template={{ id: document.document_type, name: typeLabel, description: "", icon: "", color: "", prompt_template: "", required_fields: [], optional_fields: [], default_sections: [] }}
                        editable={true}
                        documentId={document.id}
                        persistOnBlur={false}
                        onChange={(newContent) => {
                            applyGeneratedContentUpdate(() => newContent);
                        }}
                    />
                )}

                {/* Action Item Tracker */}
                {document?.generated_content.actionItems && document.generated_content.actionItems.length > 0 && (
                    <ActionItemTracker
                        actionItems={document.generated_content.actionItems}
                        onUpdate={async (updatedItems) => {
                            applyGeneratedContentUpdate((currentContent) => ({
                                ...currentContent,
                                actionItems: updatedItems,
                            }));
                            await persistLatestGeneratedContent();
                        }}
                    />
                )}

                {/* Original Input */}
                <div className="mt-6 bg-slate-100 rounded-lg p-4">
                    <h3 className="font-medium text-slate-700 mb-2">Original Input</h3>
                    <div className="bg-white rounded border border-slate-200 p-4">
                        <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">{document.summary_input}</pre>
                    </div>
                </div>

                {/* Revision Edit Modal */}
                {showRevisionModal && document && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div 
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setShowRevisionModal(false)}
                        />
                        
                        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                            <div className="text-center">
                                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <FileEdit className="h-6 w-6 text-blue-600" />
                                </div>
                                
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                    Edit Document Revision
                                </h3>
                                
                                <p className="text-sm text-slate-600 mb-4">
                                    Update the revision identifier for this document (e.g., Rev A, Rev B, Rev C).
                                </p>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Revision
                                    </label>
                                    <input
                                        type="text"
                                        value={revisionValue}
                                        onChange={(e) => setRevisionValue(e.target.value)}
                                        placeholder="Rev A"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-medium"
                                    />
                                </div>
                                
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setShowRevisionModal(false)}
                                        disabled={editingRevision}
                                        className="px-4 py-2 text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRevisionUpdate}
                                        disabled={editingRevision}
                                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                    >
                                        {editingRevision ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            "Save Revision"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && document && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        {/* Backdrop */}
                        <div 
                            className="absolute inset-0 bg-black/50"
                            onClick={closeDeleteModal}
                        />
                        
                        {/* Modal */}
                        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                            <div className="text-center">
                                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <Trash2 className="h-6 w-6 text-red-600" />
                                </div>
                                
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                    Delete Document
                                </h3>
                                
                                <p className="text-sm text-slate-600 mb-4">
                                    Are you sure you want to delete <strong>{document.title}</strong>? 
                                    This action cannot be undone and the document will be permanently removed.
                                </p>
                                
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={closeDeleteModal}
                                        disabled={deleting}
                                        className="px-4 py-2 text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                    >
                                        {deleting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            "Delete Document"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
