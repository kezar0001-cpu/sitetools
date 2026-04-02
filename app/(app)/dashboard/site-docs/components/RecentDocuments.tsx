"use client";

import { useState, useEffect } from "react";
import { FileText, ChevronRight } from "lucide-react";
import { fetchCompanyDocuments } from "@/lib/site-docs/client";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_ICONS, DOCUMENT_TYPE_COLORS, DOCUMENT_STATUS_BADGE, type SiteDocument, type DocumentType } from "@/lib/site-docs/types";

interface RecentDocumentsProps {
    companyId: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "file-text": FileText,
};

const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
    violet: "bg-violet-100 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-100 text-indigo-600",
    orange: "bg-orange-100 text-orange-600",
};

export function RecentDocuments({ companyId }: RecentDocumentsProps) {
    const [documents, setDocuments] = useState<SiteDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDocuments();
    }, [companyId]);

    async function loadDocuments() {
        setLoading(true);
        try {
            const docs = await fetchCompanyDocuments(companyId, { limit: 5 });
            setDocuments(docs);
        } catch (err) {
            console.error("Failed to load documents:", err);
        } finally {
            setLoading(false);
        }
    }

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
                    <DocumentRow key={doc.id} document={doc} />
                ))}
            </div>
        </div>
    );
}

function DocumentRow({ document }: { document: SiteDocument }) {
    const docType = document.document_type as DocumentType;
    const label = DOCUMENT_TYPE_LABELS[docType] || docType;
    const color = DOCUMENT_TYPE_COLORS[docType] || "slate";
    const colorClass = colorMap[color];
    const statusClass = DOCUMENT_STATUS_BADGE[document.status];

    return (
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 cursor-pointer">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                    <FileText className="h-5 w-5" />
                </div>
                <div>
                    <p className="font-medium text-slate-900">{document.title}</p>
                    <p className="text-sm text-slate-500">
                        {label} • {new Date(document.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusClass}`}>
                    {document.status}
                </span>
                <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>
        </div>
    );
}
