"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2, Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { fetchDocument, deleteDocument, exportDocument, downloadBlob } from "@/lib/site-docs/client";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_BADGE, type SiteDocument } from "@/lib/site-docs/types";

export default function DocumentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { summary } = useWorkspace();
    const [document, setDocument] = useState<SiteDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
    const [deleting, setDeleting] = useState(false);

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

        if (!confirm("Are you sure you want to delete this document?")) {
            return;
        }

        setDeleting(true);
        try {
            await deleteDocument(document.id);
            router.push("/dashboard/site-docs");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
            setDeleting(false);
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

    const { metadata, sections, actionItems, attendees, signatories } = document.generated_content;
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
                            onClick={() => handleExport("docx")}
                            disabled={exporting !== null}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {exporting === "docx" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4" />
                            )}
                            Word
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
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
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    {/* Document Header */}
                    <div className="p-8 border-b border-slate-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{typeLabel}</p>
                                <h2 className="text-2xl font-bold text-slate-900 mt-1">{metadata.document_title}</h2>
                            </div>
                            <div className="text-right">
                                {metadata.reference && (
                                    <p className="text-sm font-medium text-slate-700">{metadata.reference}</p>
                                )}
                                {metadata.date && (
                                    <p className="text-sm text-slate-500">{new Date(metadata.date).toLocaleDateString()}</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                            {metadata.project_name && (
                                <div>
                                    <span className="text-slate-500">Project:</span>
                                    <span className="ml-2 font-medium text-slate-900">{metadata.project_name}</span>
                                </div>
                            )}
                            {metadata.location && (
                                <div>
                                    <span className="text-slate-500">Location:</span>
                                    <span className="ml-2 font-medium text-slate-900">{metadata.location}</span>
                                </div>
                            )}
                            {metadata.prepared_by && (
                                <div>
                                    <span className="text-slate-500">Prepared by:</span>
                                    <span className="ml-2 font-medium text-slate-900">{metadata.prepared_by}</span>
                                </div>
                            )}
                            {metadata.organization && (
                                <div>
                                    <span className="text-slate-500">Organization:</span>
                                    <span className="ml-2 font-medium text-slate-900">{metadata.organization}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attendees */}
                    {attendees && attendees.length > 0 && (
                        <div className="p-8 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900 mb-4">Attendees</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Organization</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Role</th>
                                            <th className="px-4 py-2 text-center font-medium text-slate-700">Present</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {attendees.map((attendee) => (
                                            <tr key={attendee.id}>
                                                <td className="px-4 py-2 font-medium text-slate-900">{attendee.name}</td>
                                                <td className="px-4 py-2 text-slate-600">{attendee.organization || "—"}</td>
                                                <td className="px-4 py-2 text-slate-600">{attendee.role || "—"}</td>
                                                <td className="px-4 py-2 text-center">
                                                    {attendee.present ? (
                                                        <span className="text-emerald-600">✓</span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Sections */}
                    <div className="p-8 space-y-8">
                        {sections.map((section) => (
                            <div key={section.id}>
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-slate-900">{section.title}</h3>
                                    {section.status && (
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                            section.status === "open" ? "bg-amber-100 text-amber-700" :
                                            section.status === "closed" ? "bg-emerald-100 text-emerald-700" :
                                            section.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                                            "bg-slate-100 text-slate-600"
                                        }`}>
                                            {section.status}
                                        </span>
                                    )}
                                </div>
                                <div className="text-slate-700 whitespace-pre-wrap">{section.content}</div>
                            </div>
                        ))}
                    </div>

                    {/* Action Items */}
                    {actionItems && actionItems.length > 0 && (
                        <div className="p-8 border-t border-slate-200">
                            <h3 className="font-semibold text-slate-900 mb-4">Action Items</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700 w-12">#</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Action</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Responsible</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Due</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {actionItems.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3 font-medium text-slate-900">{item.number}</td>
                                                <td className="px-4 py-3 text-slate-700">{item.description}</td>
                                                <td className="px-4 py-3 text-slate-600">{item.responsible || "—"}</td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                        item.status === "open" ? "bg-amber-100 text-amber-700" :
                                                        item.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                                                        "bg-emerald-100 text-emerald-700"
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Sign-off */}
                    {signatories && signatories.length > 0 && (
                        <div className="p-8 border-t border-slate-200">
                            <h3 className="font-semibold text-slate-900 mb-4">Confirmation & Sign-off</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Organization</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Signature</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-700">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {signatories.map((sig) => (
                                            <tr key={sig.id}>
                                                <td className="px-4 py-3 font-medium text-slate-900">{sig.name}</td>
                                                <td className="px-4 py-3 text-slate-600">{sig.organization || "—"}</td>
                                                <td className="px-4 py-3 text-slate-400 italic">_________________</td>
                                                <td className="px-4 py-3 text-slate-400">____/____/______</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Original Input */}
                <div className="mt-6 bg-slate-100 rounded-lg p-4">
                    <h3 className="font-medium text-slate-700 mb-2">Original Input</h3>
                    <div className="bg-white rounded border border-slate-200 p-4">
                        <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">{document.summary_input}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
