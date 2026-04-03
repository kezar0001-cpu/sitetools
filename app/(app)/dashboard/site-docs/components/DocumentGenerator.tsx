"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, Download, Save, Loader2, Mic, MicOff } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { generateDocumentContent, createDocument, exportDocument } from "@/lib/site-docs/client";
import { getProjects } from "@/lib/workspace/client";
import type { Project } from "@/lib/workspace/types";
import { getTemplatePrompt } from "@/lib/site-docs/templates";
import type { DocumentTemplate, GeneratedContent, SiteDocument } from "@/lib/site-docs/types";
import { DocumentPreview } from "./DocumentPreview";
import { useVoiceToText } from "@/hooks/useVoiceToText";

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
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [projectSearch, setProjectSearch] = useState("");
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Load projects for dropdown
    useEffect(() => {
        async function loadProjects() {
            setLoadingProjects(true);
            try {
                const projectsList = await getProjects(companyId);
                setProjects(projectsList);
            } catch (err) {
                console.error("Failed to load projects:", err);
            } finally {
                setLoadingProjects(false);
            }
        }
        loadProjects();
    }, [companyId]);
    const { isListening, isSupported, transcript, startListening, stopListening } = useVoiceToText();

    // Append transcript to summaryInput when voice recognition updates
    useEffect(() => {
        if (transcript) {
            setSummaryInput(prev => {
                const separator = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
                return prev + separator + transcript;
            });
        }
    }, [transcript]);

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
                project_id: selectedProjectId,
            });

            setDocument(doc);
            setStep("preview");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save document");
            setStep("preview");
        }
    }

    async function handleExport() {
        if (!document) {
            // Save first if not saved
            await handleSave();
        }
        if (!document?.id) return;

        setExporting(true);
        try {
            await exportDocument(document.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Export failed");
        } finally {
            setExporting(false);
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Link to Project</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={projectSearch}
                                        onChange={(e) => setProjectSearch(e.target.value)}
                                        placeholder="Search projects..."
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {projectSearch && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                                            {loadingProjects ? (
                                                <div className="p-2 text-sm text-slate-500">Loading...</div>
                                            ) : projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 ? (
                                                <div className="p-2 text-sm text-slate-500">No projects found</div>
                                            ) : (
                                                projects
                                                    .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                                                    .map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => {
                                                                setSelectedProjectId(p.id);
                                                                setProjectSearch(p.name);
                                                            }}
                                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                                                        >
                                                            {p.name}
                                                        </button>
                                                    ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                {selectedProjectId && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        Selected: {projects.find(p => p.id === selectedProjectId)?.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Text Input */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Your Summary / Notes
                        </label>
                        <div className="relative">
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
                                className={`w-full h-80 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm transition-all ${
                                    isListening
                                        ? 'border-red-500 ring-2 ring-red-200 animate-pulse'
                                        : 'border-slate-300'
                                }`}
                            />
                            {isSupported && (
                                <button
                                    type="button"
                                    onClick={isListening ? stopListening : startListening}
                                    className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors ${
                                        isListening
                                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                    title={isListening ? 'Stop recording' : 'Start voice recording'}
                                >
                                    {isListening ? (
                                        <MicOff className="h-5 w-5" />
                                    ) : (
                                        <Mic className="h-5 w-5" />
                                    )}
                                </button>
                            )}
                        </div>
                        {isListening && (
                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                Listening... Speak now
                            </p>
                        )}
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
                            onClick={handleExport}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {exporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            PDF
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
                    <DocumentPreview 
                        content={generatedContent} 
                        template={template}
                        editable={true}
                        onChange={setGeneratedContent}
                    />
                )}
            </div>
        </div>
    );
}
