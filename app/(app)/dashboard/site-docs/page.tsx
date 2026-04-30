"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, FileText, FolderOpen, Sparkles, CheckCircle, Lightbulb, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { getAllTemplates } from "@/lib/site-docs/templates";
import type { DocumentTemplate } from "@/lib/site-docs/types";
import { DocumentGenerator } from "./components/DocumentGenerator";
import { TemplateCard } from "./components/TemplateCard";
import { DocumentsLibrary } from "./components/DocumentsLibrary";

// ── Main Dashboard ──

export default function SiteDocsPage() {
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
                        Convert rough notes into professional construction documents with AI
                    </p>
                    <div className="mt-4">
                        <Link
                            href="/dashboard/site-docs/actions"
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                        >
                            <ClipboardList className="h-4 w-4" />
                            Action Register
                        </Link>
                    </div>
                </div>

                {/* Documents Library */}
                <DocumentsLibrary companyId={activeCompanyId} />

                {/* Template Selection */}
                <div className="mt-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Choose a Document Template</h2>
                        <span className="text-sm text-slate-500">{templates.length} templates available</span>
                    </div>
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

                {/* First-Use Guidance Cards */}
                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Quick Start */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                <Sparkles className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-slate-900">How it works</h3>
                        </div>
                        <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                            <li>Select a template for your document type</li>
                            <li>Paste your informal notes or speak them</li>
                            <li>AI structures them into professional format</li>
                            <li>Review, edit, and export as PDF</li>
                        </ol>
                    </div>

                    {/* Input Tips */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                                <Lightbulb className="h-5 w-5 text-amber-600" />
                            </div>
                            <h3 className="font-semibold text-slate-900">Better results</h3>
                        </div>
                        <ul className="text-sm text-slate-600 space-y-2">
                            <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                Include names of people present
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                Mention dates, times, locations
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                Note action items with who/when
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                Be specific — details help
                            </li>
                        </ul>
                    </div>

                    {/* What You Get */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-emerald-600" />
                            </div>
                            <h3 className="font-semibold text-slate-900">What you get</h3>
                        </div>
                        <ul className="text-sm text-slate-600 space-y-2">
                            <li className="flex items-start gap-2">
                                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                Professionally formatted documents
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                Structured sections and headers
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                Auto-extracted action items
                            </li>
                            <li className="flex items-start gap-2">
                                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                PDF export ready to send
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
