"use client";

import { useState } from "react";
import { ArrowLeft, Sparkles, FileText, Download, Save, Loader2 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { generateDocumentContent, createDocument, exportDocument, downloadBlob } from "@/lib/site-docs/client";
import { getTemplatePrompt } from "@/lib/site-docs/templates";
import type { DocumentTemplate, GeneratedContent, SiteDocument, ActionItem, Attendee, Signatory, DocumentSection } from "@/lib/site-docs/types";

interface DocumentGeneratorProps {
    template: DocumentTemplate;
    companyId: string;
    onCancel: () => void;
    onComplete: () => void;
}

export function DocumentGenerator({ template, companyId, onCancel }: DocumentGeneratorProps) {
    const { summary } = useWorkspace();
    const [step, setStep] = useState<"input" | "generating" | "preview" | "saving">("input");
    const [summaryInput, setSummaryInput] = useState("");
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [document, setDocument] = useState<SiteDocument | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);

    // Metadata form state - initialize fresh each time (no persistence)
    const [metadata, setMetadata] = useState({
        project_name: "",
        location: "",
        date: new Date().toISOString().split("T")[0],
        prepared_by: summary?.profile?.full_name || "",
        organization: summary?.activeMembership?.companies?.name || "",
    });

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
            const errorMessage = err instanceof Error ? err.message : "Failed to generate document";
            // Provide more helpful error message for timeouts
            if (errorMessage.toLowerCase().includes("abort") || errorMessage.toLowerCase().includes("timeout")) {
                setError("Request timed out. The AI is taking longer than expected. Try with shorter notes or try again.");
            } else {
                setError(errorMessage);
            }
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

                {/* Document Preview - Editable */}
                {generatedContent && (
                    <EditableDocumentPreview 
                        content={generatedContent} 
                        template={template}
                        onChange={setGeneratedContent}
                    />
                )}
            </div>
        </div>
    );
}

// ── Editable Document Preview Component ──

interface EditableDocumentPreviewProps {
    content: GeneratedContent;
    template: DocumentTemplate;
    onChange: (content: GeneratedContent) => void;
}

function EditableDocumentPreview({ content, template, onChange }: EditableDocumentPreviewProps) {
    const { metadata, sections, actionItems, attendees, signatories } = content;

    const updateMetadata = (key: string, value: string) => {
        onChange({
            ...content,
            metadata: { ...metadata, [key]: value }
        });
    };

    const updateSection = (index: number, field: "title" | "content", value: string) => {
        const newSections = [...sections];
        newSections[index] = { ...newSections[index], [field]: value };
        onChange({ ...content, sections: newSections });
    };

    const updateActionItem = (index: number, field: keyof ActionItem, value: string) => {
        if (!actionItems) return;
        const newItems = [...actionItems];
        newItems[index] = { ...newItems[index], [field]: value };
        onChange({ ...content, actionItems: newItems });
    };

    const updateAttendee = (index: number, field: keyof Attendee, value: string | boolean) => {
        if (!attendees) return;
        const newAttendees = [...attendees];
        newAttendees[index] = { ...newAttendees[index], [field]: value };
        onChange({ ...content, attendees: newAttendees });
    };

    const updateSignatory = (index: number, field: keyof Signatory, value: string) => {
        if (!signatories) return;
        const newSigs = [...signatories];
        newSigs[index] = { ...newSigs[index], [field]: value };
        onChange({ ...content, signatories: newSigs });
    };

    const addSection = () => {
        const newSection = {
            id: `section-${Date.now()}`,
            title: "New Section",
            content: "",
            order: sections.length,
            status: "open" as const
        };
        onChange({ ...content, sections: [...sections, newSection] });
    };

    const removeSection = (index: number) => {
        const newSections = sections.filter((_, i) => i !== index);
        onChange({ ...content, sections: newSections });
    };

    const addActionItem = () => {
        const newItem = {
            id: `action-${Date.now()}`,
            number: (actionItems?.length || 0) + 1,
            description: "",
            responsible: "",
            due_date: "",
            status: "open" as const
        };
        onChange({ ...content, actionItems: [...(actionItems || []), newItem] });
    };

    const removeActionItem = (index: number) => {
        if (!actionItems) return;
        const newItems = actionItems.filter((_, i) => i !== index);
        onChange({ ...content, actionItems: newItems });
    };

    const addAttendee = () => {
        const newAttendee = {
            id: `attendee-${Date.now()}`,
            name: "",
            organization: "",
            role: "",
            present: false
        };
        onChange({ ...content, attendees: [...(attendees || []), newAttendee] });
    };

    const removeAttendee = (index: number) => {
        if (!attendees) return;
        const newAttendees = attendees.filter((_, i) => i !== index);
        onChange({ ...content, attendees: newAttendees });
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {/* Document Header - Editable */}
            <div className="p-8 border-b border-slate-200">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{template.name}</p>
                        <input
                            type="text"
                            value={metadata.document_title}
                            onChange={(e) => updateMetadata("document_title", e.target.value)}
                            className="w-full text-2xl font-bold text-slate-900 mt-1 border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                            placeholder="Document Title"
                        />
                    </div>
                    <div className="text-right ml-4">
                        <input
                            type="text"
                            value={metadata.reference || ""}
                            onChange={(e) => updateMetadata("reference", e.target.value)}
                            className="text-sm font-medium text-slate-700 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent text-right"
                            placeholder="Reference"
                        />
                        <input
                            type="date"
                            value={metadata.date || ""}
                            onChange={(e) => updateMetadata("date", e.target.value)}
                            className="text-sm text-slate-500 mt-1 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent block text-right"
                        />
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Project:</span>
                        <input
                            type="text"
                            value={metadata.project_name || ""}
                            onChange={(e) => updateMetadata("project_name", e.target.value)}
                            className="flex-1 font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                            placeholder="Project name"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Location:</span>
                        <input
                            type="text"
                            value={metadata.location || ""}
                            onChange={(e) => updateMetadata("location", e.target.value)}
                            className="flex-1 font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                            placeholder="Location"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Prepared by:</span>
                        <input
                            type="text"
                            value={metadata.prepared_by || ""}
                            onChange={(e) => updateMetadata("prepared_by", e.target.value)}
                            className="flex-1 font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                            placeholder="Name"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Organization:</span>
                        <input
                            type="text"
                            value={metadata.organization || ""}
                            onChange={(e) => updateMetadata("organization", e.target.value)}
                            className="flex-1 font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                            placeholder="Organization"
                        />
                    </div>
                </div>
            </div>

            {/* Attendees - Editable */}
            {attendees && attendees.length > 0 && (
                <div className="p-8 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900">Attendees</h3>
                        <button
                            onClick={addAttendee}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            + Add Attendee
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-700">Organization</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-700">Role</th>
                                    <th className="px-4 py-2 text-center font-medium text-slate-700">Present</th>
                                    <th className="px-4 py-2 text-center font-medium text-slate-700"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {attendees.map((attendee, idx) => (
                                    <tr key={attendee.id}>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={attendee.name}
                                                onChange={(e) => updateAttendee(idx, "name", e.target.value)}
                                                className="w-full font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                placeholder="Name"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={attendee.organization || ""}
                                                onChange={(e) => updateAttendee(idx, "organization", e.target.value)}
                                                className="w-full text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                placeholder="Organization"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={attendee.role || ""}
                                                onChange={(e) => updateAttendee(idx, "role", e.target.value)}
                                                className="w-full text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                placeholder="Role"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={attendee.present}
                                                onChange={(e) => updateAttendee(idx, "present", e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                onClick={() => removeAttendee(idx)}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sections - Editable */}
            <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Sections</h3>
                    <button
                        onClick={addSection}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        + Add Section
                    </button>
                </div>
                {sections.map((section, idx) => (
                    <div key={section.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <input
                                type="text"
                                value={section.title}
                                onChange={(e) => updateSection(idx, "title", e.target.value)}
                                className="flex-1 font-semibold text-slate-900 border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                placeholder="Section Title"
                            />
                            <select
                                value={section.status || ""}
                                onChange={(e) => {
                                    const newSections = [...sections];
                                    const status = e.target.value as DocumentSection["status"];
                                    newSections[idx] = { ...newSections[idx], status };
                                    onChange({ ...content, sections: newSections });
                                }}
                                className="text-xs font-medium rounded-full border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">No Status</option>
                                <option value="open">Open</option>
                                <option value="in-progress">In Progress</option>
                                <option value="closed">Closed</option>
                            </select>
                            <button
                                onClick={() => removeSection(idx)}
                                className="text-red-500 hover:text-red-700 text-sm px-2"
                            >
                                ✕
                            </button>
                        </div>
                        <textarea
                            value={section.content}
                            onChange={(e) => updateSection(idx, "content", e.target.value)}
                            className="w-full h-32 px-3 py-2 text-slate-700 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Section content..."
                        />
                    </div>
                ))}
            </div>

            {/* Action Items - Editable */}
            {actionItems && (
                <div className="p-8 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900">Action Items</h3>
                        <button
                            onClick={addActionItem}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            + Add Action Item
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-slate-700 w-12">#</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-700">Action</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-700">Responsible</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-700">Due</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
                                    <th className="px-4 py-2 text-center font-medium text-slate-700"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {actionItems.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 font-medium text-slate-900">{item.number}</td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => updateActionItem(idx, "description", e.target.value)}
                                                className="w-full text-slate-700 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                placeholder="Action description"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={item.responsible || ""}
                                                onChange={(e) => updateActionItem(idx, "responsible", e.target.value)}
                                                className="w-full text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                placeholder="Responsible person"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="date"
                                                value={item.due_date || ""}
                                                onChange={(e) => updateActionItem(idx, "due_date", e.target.value)}
                                                className="w-full text-slate-600 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={item.status}
                                                onChange={(e) => updateActionItem(idx, "status", e.target.value)}
                                                className="text-xs font-medium rounded-full border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="open">Open</option>
                                                <option value="in-progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => removeActionItem(idx)}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sign-off - Editable */}
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
                                {signatories.map((sig, idx) => (
                                    <tr key={sig.id}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={sig.name}
                                                onChange={(e) => updateSignatory(idx, "name", e.target.value)}
                                                className="w-full font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                placeholder="Name"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={sig.organization || ""}
                                                onChange={(e) => updateSignatory(idx, "organization", e.target.value)}
                                                className="w-full text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                placeholder="Organization"
                                            />
                                        </td>
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
