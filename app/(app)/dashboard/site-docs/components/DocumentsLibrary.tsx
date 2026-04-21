"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FileText, ChevronRight, Download, Trash2, Search, Filter, Calendar, ArrowUpDown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchCompanyDocuments, deleteDocument, exportDocument } from "@/lib/site-docs/client";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_COLORS, DOCUMENT_STATUS_BADGE, type SiteDocument, type DocumentType } from "@/lib/site-docs/types";

interface DocumentsLibraryProps {
    companyId: string;
    onDocumentClick?: (doc: SiteDocument) => void;
    onRefresh?: () => void;
}

type SortOption = "newest" | "oldest" | "az";

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

const DOCUMENT_TYPES: { value: DocumentType | "all"; label: string }[] = [
    { value: "all", label: "All Types" },
    { value: "meeting-minutes", label: "Meeting Minutes" },
    { value: "incident-report", label: "Incident Report" },
    { value: "corrective-action", label: "Corrective Action" },
    { value: "safety-report", label: "Safety Report" },
    { value: "rfi", label: "RFI" },
    { value: "inspection-checklist", label: "Inspection Checklist" },
    { value: "toolbox-talk", label: "Toolbox Talk" },
    { value: "variation", label: "Variation" },
    { value: "ncr", label: "NCR" },
    { value: "site-instruction", label: "Site Instruction" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "az", label: "A–Z" },
];

export function DocumentsLibrary({ companyId, onDocumentClick }: DocumentsLibraryProps) {
    const [documents, setDocuments] = useState<SiteDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<DocumentType | "all">("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("newest");
    const router = useRouter();

    const loadDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const docs = await fetchCompanyDocuments(companyId);
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

    // Filter and sort documents
    const filteredDocuments = useMemo(() => {
        let result = [...documents];

        // Search filter (title only)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(doc =>
                doc.title.toLowerCase().includes(query)
            );
        }

        // Document type filter
        if (selectedType !== "all") {
            result = result.filter(doc => doc.document_type === selectedType);
        }

        // Date range filter
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            result = result.filter(doc => new Date(doc.created_at) >= fromDate);
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            result = result.filter(doc => new Date(doc.created_at) <= toDate);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case "newest":
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case "oldest":
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case "az":
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        return result;
    }, [documents, searchQuery, selectedType, dateFrom, dateTo, sortBy]);

    const handleDocumentClick = (doc: SiteDocument) => {
        if (onDocumentClick) {
            onDocumentClick(doc);
        } else {
            router.push(`/dashboard/site-docs/${doc.id}`);
        }
    };

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedType("all");
        setDateFrom("");
        setDateTo("");
        setSortBy("newest");
    };

    const hasActiveFilters = searchQuery || selectedType !== "all" || dateFrom || dateTo;

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Documents Library</h2>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Documents Library</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"} found
                    </p>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                    >
                        <X className="h-4 w-4" />
                        Clear filters
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="space-y-4 mb-6">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Filter Row - Stack on mobile, wrap on tablet+ */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                    {/* Document Type */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value as DocumentType | "all")}
                            className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            {DOCUMENT_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range - Stack on mobile, inline on sm+ */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="flex-1 sm:w-auto px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="From"
                            />
                        </div>
                        <div className="flex items-center gap-2 sm:pl-0">
                            <span className="text-slate-400 hidden sm:inline">–</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="flex-1 sm:w-auto px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="To"
                            />
                        </div>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
                        <ArrowUpDown className="h-4 w-4 text-slate-400 shrink-0" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            {SORT_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Document List */}
            {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    {hasActiveFilters ? (
                        <>
                            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">No documents match your filters</p>
                            <button
                                onClick={clearFilters}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Clear all filters
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="h-8 w-8 text-blue-600" />
                            </div>
                            <p className="text-slate-700 font-medium">No documents yet</p>
                            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                                Select a template below to create your first professional document from your notes.
                            </p>
                            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                                    AI-powered formatting
                                </span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                    Instant PDF export
                                </span>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredDocuments.map((doc) => (
                        <DocumentRow 
                            key={doc.id} 
                            document={doc} 
                            onClick={() => handleDocumentClick(doc)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function DocumentRow({ document, onClick }: { document: SiteDocument; onClick: () => void }) {
    const docType = document.document_type as DocumentType;
    const label = DOCUMENT_TYPE_LABELS[docType] || docType;
    const color = DOCUMENT_TYPE_COLORS[docType] || "slate";
    const colorClass = colorMap[color];
    const statusClass = DOCUMENT_STATUS_BADGE[document.status];

    const handleExport = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await exportDocument(document.id);
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
            className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 cursor-pointer gap-3"
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
                    <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">{document.title}</p>
                    <p className="text-sm text-slate-500 truncate">
                        {label} • {new Date(document.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${statusClass}`}>
                    {document.status}
                </span>
                
                {/* Action buttons - visible on hover, hidden on mobile */}
                <div className="hidden sm:group-hover:flex items-center gap-1">
                    <button
                        onClick={handleExport}
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
                
                <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
            </div>
        </div>
    );
}
