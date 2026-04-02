"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, FileText, Download, Save, Loader2 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { generateDocumentContent, createDocument, exportDocument, downloadBlob } from "@/lib/site-docs/client";
import { getTemplatePrompt } from "@/lib/site-docs/templates";
import type { DocumentTemplate, GeneratedContent, SiteDocument } from "@/lib/site-docs/types";

interface DocumentGeneratorProps {
    template: DocumentTemplate;
    companyId: string;
    onCancel: () => void;
    onComplete: () => void;
}

// localStorage key generator
const getStorageKey = (companyId: string, templateId: string) => 
    `sitedocs_draft_${companyId}_${templateId}`;

export function DocumentGenerator({ template, companyId, onCancel }: DocumentGeneratorProps) {
    const { summary } = useWorkspace();
    const [step, setStep] = useState<"input" | "generating" | "preview" | "saving">("input");
    const [summaryInput, setSummaryInput] = useState("");
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [document, setDocument] = useState<SiteDocument | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Metadata form state
    const [metadata, setMetadata] = useState({
        project_name: "",
        location: "",
        date: new Date().toISOString().split("T")[0],
        prepared_by: summary?.profile?.full_name || "",
        organization: summary?.activeMembership?.companies?.name || "",
    });

    // Load draft from localStorage on mount
    useEffect(() => {
        const storageKey = getStorageKey(companyId, template.id);
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                if (draft.summaryInput) setSummaryInput(draft.summaryInput);
                if (draft.metadata) setMetadata(draft.metadata);
                if (draft.generatedContent) setGeneratedContent(draft.generatedContent);
                if (draft.step === "preview") setStep("preview");
            } catch {
                // Ignore parse errors
            }
        }
        setIsLoaded(true);
    }, [companyId, template.id]);

    // Auto-save to localStorage when form changes
    useEffect(() => {
        if (!isLoaded) return;
        const storageKey = getStorageKey(companyId, template.id);
        const draft = {
            summaryInput,
            metadata,
            generatedContent,
            step,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
    }, [summaryInput, metadata, generatedContent, step, companyId, template.id, isLoaded]);

    // Clear draft when document is saved
    const clearDraft = () => {
        const storageKey = getStorageKey(companyId, template.id);
        localStorage.removeItem(storageKey);
    };

    async function handleGenerate() {
        if (!summaryInput.trim()) return;

        setStep("generating");
        setError(null);

        try {
            const prompt = getTemplatePrompt(template.id, summaryInput);
            const content = await generateDocumentContent({
                document_type: template.id,
                summary: prompt,
                metadata_override: metadata,
            });

            setGeneratedContent(content);
            setStep("preview");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate document");
            setStep("input");
        }
    }

    async function handleSave() {
        if (!generatedContent) return;

        setStep("saving");
        setError(null);

        try {
            const doc = await createDocument({
                company_id: companyId,
                document_type: template.id,
                title: generatedContent.metadata.document_title || `${template.name} — ${new Date().toLocaleDateString()}`,
                summary_input: summaryInput,
                generated_content: generatedContent,
            });

            setDocument(doc);
            clearDraft(); // Clear localStorage after successful save
            setStep("preview");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save document");
            setStep("preview");
        }
    }

    async function handleExport(format: "pdf" | "docx") {
        if (!document) {
            // Save first if not saved
            await handleSave();
        }
        if (!document?.id) return;

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

    // Input step
    if (step === "input") {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={onCancel}
                            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{template.name}</h1>
                            <p className="text-sm text-slate-500">Paste your notes and let AI structure them</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Quick Metadata */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Project/Subject</label>
                                <input
                                    type="text"
                                    value={metadata.project_name}
                                    onChange={(e) => setMetadata({ ...metadata, project_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Depena Reserve Upgrade"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={metadata.location}
                                    onChange={(e) => setMetadata({ ...metadata, location: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Site Office"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={metadata.date}
                                    onChange={(e) => setMetadata({ ...metadata, date: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Text Input */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Your Summary / Notes
                        </label>
                        <textarea
                            value={summaryInput}
                            onChange={(e) => setSummaryInput(e.target.value)}
                            placeholder={`Paste your informal notes here. Include:
• Who was there (names, companies, roles)
• What was discussed
• Decisions made
• Action items with who does what by when
• Any issues or concerns raised

The AI will convert this into a professional ${template.name.toLowerCase()}.`}
                            className="w-full h-80 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                        />
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                {summaryInput.length} characters
                            </p>
                            <button
                                onClick={handleGenerate}
                                disabled={!summaryInput.trim()}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Sparkles className="h-5 w-5" />
                                Generate Document
                            </button>
                        </div>
                    </div>

                    {/* Template Hint */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-700">
                            <strong>Tip:</strong> {template.description}. The more details you include (names, dates, specific items), the better the result.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Generating step
    if (step === "generating") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">Generating your document...</h2>
                    <p className="text-slate-500 mt-1">AI is structuring your notes into professional format</p>
                </div>
            </div>
        );
    }

    // Preview step
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setStep("input")}
                            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Preview & Edit</h1>
                            <p className="text-sm text-slate-500">Review the generated document before saving</p>
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
                        {!document && (
                            <button
                                onClick={handleSave}
                                disabled={step === "saving"}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                {step === "saving" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Save
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Document Preview */}
                {generatedContent && (
                    <DocumentPreview content={generatedContent} template={template} />
                )}
            </div>
        </div>
    );
}

// ── Document Preview Component ──

function DocumentPreview({ content, template }: { content: GeneratedContent; template: DocumentTemplate }) {
    const { metadata, sections, actionItems, attendees, signatories } = content;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {/* Document Header */}
            <div className="p-8 border-b border-slate-200">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{template.name}</p>
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
    );
}
