"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2, Trash2, RefreshCw, X } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { fetchDocument, deleteDocument, exportDocument, downloadBlob, regenerateDocument, updateActionItemStatus } from "@/lib/site-docs/client";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_BADGE, type SiteDocument } from "@/lib/site-docs/types";
import { DocumentPreview } from "../components/DocumentPreview";

export default function DocumentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { summary } = useWorkspace();
    const [document, setDocument] = useState<SiteDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // Regenerate state
    const [regenerateDrawerOpen, setRegenerateDrawerOpen] = useState(false);
    const [regenerateSummary, setRegenerateSummary] = useState("");
    const [regenerating, setRegenerating] = useState(false);

    const documentId = params.documentId as string;
    const companyId = summary?.activeMembership?.company_id;

    useEffect(() => {
        if (!documentId || !companyId) {
            setLoading(false);
            return;
        }

        async function loadDocument() {
            try {
                const doc = await fetchDocument(documentId);
                if (!doc) {
                    setError("Document not found");
                } else if (doc.company_id !== companyId) {
                    setError("You don't have access to this document");
                } else {
                    setDocument(doc);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load document");
            } finally {
                setLoading(false);
            }
        }

        loadDocument();
    }, [documentId, companyId]);

    async function handleExport(format: "pdf" | "docx") {
        if (!document) return;

        setExporting(format);
        try {
            const blob = await exportDocument(document.id, format);
            downloadBlob(blob, `${document.title}.${format}`);
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

    async function handleRegenerate() {
        if (!document) return;

        setRegenerating(true);
        setError(null);
        
        try {
            const newContent = await regenerateDocument(
                document.id,
                document.document_type,
                regenerateSummary,
                document.project_id,
                document.site_id
            );
            
            // Update the document state with new content
            setDocument({
                ...document,
                summary_input: regenerateSummary,
                generated_content: newContent,
                updated_at: new Date().toISOString(),
            });
            
            // Close drawer and reset
            setRegenerateDrawerOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Regeneration failed");
        } finally {
            setRegenerating(false);
        }
    }

    function openRegenerateDrawer() {
        if (document) {
            setRegenerateSummary(document.summary_input);
            setRegenerateDrawerOpen(true);
        }
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
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/dashboard/site-docs")}
                            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900">{document.title}</h1>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusClass}`}>
                                    {DOCUMENT_STATUS_LABELS[document.status]}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500">{typeLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={openRegenerateDrawer}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Regenerate
                        </button>
                        <button
                            onClick={() => handleExport("pdf")}
                            disabled={exporting !== null}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {exporting === "pdf" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            PDF
                        </button>
                        <button
                            onClick={openDeleteModal}
                            disabled={deleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                            {deleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Document Preview */}
                {document && (
                    <DocumentPreview
                        content={document.generated_content}
                        template={{ id: document.document_type, name: typeLabel, description: "", icon: "", color: "", prompt_template: "", required_fields: [], optional_fields: [], default_sections: [] }}
                        editable={false}
                    />
                )}

                {/* Original Input */}
                <div className="mt-6 bg-slate-100 rounded-lg p-4">
                    <h3 className="font-medium text-slate-700 mb-2">Original Input</h3>
                    <div className="bg-white rounded border border-slate-200 p-4">
                        <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">{document.summary_input}</pre>
                    </div>
                </div>

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

                {/* Regenerate Slide-over Drawer */}
                {regenerateDrawerOpen && (
                    <div className="fixed inset-0 z-50 flex">
                        {/* Backdrop */}
                        <div 
                            className="absolute inset-0 bg-black/50"
                            onClick={() => !regenerating && setRegenerateDrawerOpen(false)}
                        />
                        
                        {/* Drawer */}
                        <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                                <h2 className="text-lg font-semibold text-slate-900">Regenerate Document</h2>
                                <button
                                    onClick={() => !regenerating && setRegenerateDrawerOpen(false)}
                                    disabled={regenerating}
                                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                                >
                                    <X className="h-5 w-5 text-slate-500" />
                                </button>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 px-6 py-6 overflow-y-auto">
                                <p className="text-sm text-slate-600 mb-4">
                                    Edit the original notes below to regenerate the document with updated content. 
                                    The current version will be saved before regeneration.
                                </p>
                                
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Original Notes
                                </label>
                                <textarea
                                    value={regenerateSummary}
                                    onChange={(e) => setRegenerateSummary(e.target.value)}
                                    disabled={regenerating}
                                    className="w-full h-64 px-4 py-3 text-slate-700 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-slate-100"
                                    placeholder="Enter your notes for document generation..."
                                />
                                
                                {error && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>
                            
                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-200">
                                <button
                                    onClick={handleRegenerate}
                                    disabled={regenerating || !regenerateSummary.trim()}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {regenerating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Regenerating...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4" />
                                            Regenerate Document
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
