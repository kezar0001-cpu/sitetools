"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, ChevronRight, Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchCompanyDocuments, deleteDocument, exportDocument } from "@/lib/site-docs/client";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_COLORS, DOCUMENT_STATUS_BADGE, type SiteDocument, type DocumentType } from "@/lib/site-docs/types";

interface RecentDocumentsProps {
    companyId: string;
    onDocumentClick?: (doc: SiteDocument) => void;
    onRefresh?: () => void;
}

const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
    violet: "bg-violet-100 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-100 text-indigo-600",
    orange: "bg-orange-100 text-orange-600",
    teal: "bg-teal-100 text-teal-600",
    rose: "bg-rose-100 text-rose-600",
    cyan: "bg-cyan-100 text-cyan-600",
    yellow: "bg-yellow-100 text-yellow-600",
};

export function RecentDocuments({ companyId, onDocumentClick }: RecentDocumentsProps) {
    const [documents, setDocuments] = useState<SiteDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const docs = await fetchCompanyDocuments(companyId, { limit: 5 });
            setDocuments(docs);
        } catch (err) {
            console.error("Failed to load documents:", err);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleDocumentClick = (doc: SiteDocument) => {
        if (onDocumentClick) {
            onDocumentClick(doc);
        } else {
            // Navigate to document detail page
            router.push(`/dashboard/site-docs/${doc.id}`);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Documents</h2>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Recent Documents</h2>
                <p className="text-sm text-slate-500">No documents yet. Select a template to get started.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Documents</h2>
            <div className="space-y-2">
                {documents.map((doc) => (
                    <DocumentRow 
                        key={doc.id} 
                        document={doc} 
                        onClick={() => handleDocumentClick(doc)}
                    />
                ))}
            </div>
        </div>
    );
}

function DocumentRow({ document, onClick }: { document: SiteDocument; onClick: () => void }) {
    const docType = document.document_type as DocumentType;
    const label = DOCUMENT_TYPE_LABELS[docType] || docType;
    const color = DOCUMENT_TYPE_COLORS[docType] || "slate";
    const colorClass = colorMap[color];
    const statusClass = DOCUMENT_STATUS_BADGE[document.status];

    const handleExport = async (e: React.MouseEvent, format: "html" | "pdf") => {
        e.stopPropagation();
        try {
            await exportDocument(document.id, format);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Export failed. Please try again.");
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete "${document.title}"? This action cannot be undone.`)) return;
        try {
            await deleteDocument(document.id);
            window.location.reload();
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed. Please try again.");
        }
    };

    return (
        <div 
            onClick={onClick}
            className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
                    <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{document.title}</p>
                    <p className="text-sm text-slate-500">
                        {label} • {new Date(document.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusClass}`}>
                    {document.status}
                </span>
                
                {/* Action buttons - visible on hover */}
                <div className="hidden group-hover:flex items-center gap-1">
                    <button
                        onClick={(e) => handleExport(e, "pdf")}
                        className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                        title="Export PDF"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded hover:bg-red-100 text-slate-500 hover:text-red-600"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
                
                <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>
        </div>
    );
}
