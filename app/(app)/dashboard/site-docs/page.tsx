"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, FolderOpen } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { getAllTemplates, getTemplate } from "@/lib/site-docs/templates";
import type { DocumentType, DocumentTemplate } from "@/lib/site-docs/types";
import { DocumentGenerator } from "./components/DocumentGenerator";
import { TemplateCard } from "./components/TemplateCard";
import { RecentDocuments } from "./components/RecentDocuments";

// ── Main Dashboard ──

export default function SiteDocsPage() {
    const router = useRouter();
    const { loading, summary } = useWorkspace({
        requireAuth: true,
        requireCompany: true,
    });

    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
    const templates = getAllTemplates();

    if (loading || !summary) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
            </div>
        );
    }

    const activeCompanyId = summary.activeMembership?.company_id;
    if (!activeCompanyId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">No organization found</p>
                    <p className="text-sm text-slate-400 mt-1">Please join or create an organization first</p>
                </div>
            </div>
        );
    }

    // Document generator view
    if (selectedTemplate) {
        return (
            <DocumentGenerator
                template={selectedTemplate}
                companyId={activeCompanyId}
                onCancel={() => setSelectedTemplate(null)}
                onComplete={() => {
                    setSelectedTemplate(null);
                }}
            />
        );
    }

    // Template selection view
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">SiteDocs</h1>
                    <p className="text-slate-500 mt-1">
                        Convert text summaries into professional construction documents
                    </p>
                </div>

                {/* Recent Documents */}
                <RecentDocuments companyId={activeCompanyId} />

                {/* Template Selection */}
                <div className="mt-10">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Choose a Document Template</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {templates.map((template) => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onClick={() => setSelectedTemplate(template)}
                            />
                        ))}
                    </div>
                </div>

                {/* Quick Start Hint */}
                <div className="mt-10 p-6 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-blue-900">How it works</h3>
                            <ol className="mt-2 text-sm text-blue-700 space-y-1 list-decimal list-inside">
                                <li>Select a template (Meeting Minutes, Incident Report, etc.)</li>
                                <li>Type or paste your informal summary into the text box</li>
                                <li>AI converts your notes into a professional document structure</li>
                                <li>Review, edit, and export to PDF or Word</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
