"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Sparkles, Download, Save, Loader2, Mic, MicOff, CheckCircle, FileText, FolderOpen, AlertCircle, ChevronRight, Lightbulb } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { generateDocumentContent, createDocument, exportDocument } from "@/lib/site-docs/client";
import { getProjects } from "@/lib/workspace/client";
import type { Project } from "@/lib/workspace/types";
import { getTemplatePrompt } from "@/lib/site-docs/templates";
import type { DocumentTemplate, GeneratedContent, SiteDocument } from "@/lib/site-docs/types";
import { DocumentPreview } from "./DocumentPreview";
import { useVoiceToText } from "@/hooks/useVoiceToText";

// ── Input Quality Helper ──

interface InputQuality {
  score: number; // 0-100
  checks: { label: string; passed: boolean; hint: string }[];
  level: "weak" | "fair" | "good" | "excellent";
}

function analyzeInputQuality(input: string, templateId: string): InputQuality {
  const checks = [
    { label: "Has content", test: input.length > 20, hint: "Add at least a few sentences" },
    { label: "Includes names", test: /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(input), hint: "Include people names (e.g., 'John Smith')" },
    { label: "Includes dates/times", test: /\d{1,2}[\/\-\.]\d{1,2}|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|today|yesterday|tomorrow|AM|PM/i.test(input), hint: "Add dates or times" },
    { label: "Specific details", test: input.length > 100, hint: "Add more specific details" },
    { label: "Action items", test: /\b(action|task|follow.up|do|complete|check|review|send|call|email)\b/i.test(input), hint: "Mention any actions or follow-ups" },
  ];

  // Template-specific checks
  if (templateId === "meeting-minutes") {
    checks.push({ label: "Meeting purpose", test: /\b(discuss|meeting|agenda|talked about|went over)\b/i.test(input), hint: "Mention what was discussed" });
  } else if (templateId === "incident-report") {
    checks.push({ label: "Incident details", test: /\b(incident|accident|happened|occurred|saw|witness)\b/i.test(input), hint: "Describe what happened" });
  }

  const passedChecks = checks.filter(c => c.test);
  const score = Math.round((passedChecks.length / checks.length) * 100);

  let level: InputQuality["level"] = "weak";
  if (score >= 80) level = "excellent";
  else if (score >= 60) level = "good";
  else if (score >= 40) level = "fair";

  return {
    score,
    level,
    checks: checks.map(c => ({ label: c.label, passed: c.test, hint: c.hint })),
  };
}

function getQualityColor(level: InputQuality["level"]): string {
  switch (level) {
    case "excellent": return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "good": return "text-blue-600 bg-blue-50 border-blue-200";
    case "fair": return "text-amber-600 bg-amber-50 border-amber-200";
    case "weak": return "text-slate-600 bg-slate-50 border-slate-200";
  }
}

interface DocumentGeneratorProps {
    template: DocumentTemplate;
    companyId: string;
    onCancel: () => void;
    onComplete: () => void;
}

export function DocumentGenerator({ template, companyId, onCancel }: DocumentGeneratorProps) {
    const { summary } = useWorkspace();
    const [step, setStep] = useState<"input" | "generating" | "preview" | "saving" | "saved">("input");
    const [summaryInput, setSummaryInput] = useState("");
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [document, setDocument] = useState<SiteDocument | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [projectSearch, setProjectSearch] = useState("");
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [completedAction, setCompletedAction] = useState<"saved" | "exported" | null>(null);

    // Compute input quality
    const inputQuality = useMemo(() => analyzeInputQuality(summaryInput, template.id), [summaryInput, template.id]);

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
        client: "",
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
            setCompletedAction("saved");
            setStep("saved");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save document");
            setStep("preview");
        }
    }

    async function handleExport() {
        setExporting(true);
        setError(null);
        try {
            let docId = document?.id;

            // Save first if not yet saved, and capture the returned doc id directly
            if (!docId) {
                const saved = await createDocument({
                    company_id: companyId,
                    document_type: template.id,
                    title: generatedContent?.metadata.document_title
                        || `${template.name} — ${new Date().toLocaleDateString()}`,
                    summary_input: summaryInput,
                    generated_content: generatedContent!,
                    project_id: selectedProjectId,
                });
                setDocument(saved);
                docId = saved.id;
            }

            await exportDocument(docId);
            setCompletedAction("exported");
            setStep("saved");
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
                    {/* Header with Step Indicator */}
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={onCancel}
                            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-slate-900">{template.name}</h1>
                            <p className="text-sm text-slate-500">Paste your notes and let AI structure them</p>
                        </div>
                        {/* Step Progress */}
                        <div className="hidden sm:flex items-center gap-2 text-sm">
                            <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                                Input
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                            <span className="flex items-center gap-1 px-3 py-1 text-slate-400">
                                <span className="w-5 h-5 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-xs">2</span>
                                Review
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                            <span className="flex items-center gap-1 px-3 py-1 text-slate-400">
                                <span className="w-5 h-5 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-xs">3</span>
                                Export
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Project Linking - Prominent Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FolderOpen className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900">Link to Project</h3>
                                <p className="text-sm text-slate-500">Connect this document to a project for easy organization</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                    placeholder="Search your projects..."
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
                            {selectedProjectId ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                    <span className="text-sm text-emerald-700 font-medium">
                                        Linked to: {projects.find(p => p.id === selectedProjectId)?.name}
                                    </span>
                                    <button
                                        onClick={() => { setSelectedProjectId(null); setProjectSearch(""); }}
                                        className="ml-auto text-xs text-emerald-600 hover:text-emerald-800"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                                    <span className="text-sm text-slate-500">Optional — documents can be unlinked</span>
                                </div>
                            )}
                        </div>
                    </div>

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

                    {/* Text Input with Quality Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
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
                                <div className="flex items-center gap-3">
                                    <p className="text-sm text-slate-500">
                                        {summaryInput.length} characters
                                    </p>
                                    {summaryInput.length > 0 && (
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getQualityColor(inputQuality.level)}`}>
                                            {inputQuality.level === "excellent" ? "Excellent input" :
                                             inputQuality.level === "good" ? "Good input" :
                                             inputQuality.level === "fair" ? "Fair input" : "Add more details"}
                                        </span>
                                    )}
                                </div>
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

                        {/* Quality Guidance Panel */}
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-slate-900 flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-amber-500" />
                                    Input Quality
                                </h3>
                                {summaryInput.length > 0 && (
                                    <span className="text-lg font-bold text-slate-700">{inputQuality.score}%</span>
                                )}
                            </div>

                            {/* Progress bar */}
                            {summaryInput.length > 0 && (
                                <div className="w-full h-2 bg-slate-200 rounded-full mb-4 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                            inputQuality.level === "excellent" ? "bg-emerald-500 w-full" :
                                            inputQuality.level === "good" ? "bg-blue-500" :
                                            inputQuality.level === "fair" ? "bg-amber-500" : "bg-slate-400"
                                        }`}
                                        style={{ width: `${inputQuality.score}%` }}
                                    />
                                </div>
                            )}

                            <p className="text-sm text-slate-600 mb-3">
                                {template.description}
                            </p>

                            <div className="space-y-2">
                                {inputQuality.checks.map((check, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                        {check.passed ? (
                                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <span className={check.passed ? "text-slate-700" : "text-slate-400"}>
                                                {check.label}
                                            </span>
                                            {!check.passed && summaryInput.length > 0 && (
                                                <p className="text-xs text-slate-400 mt-0.5">{check.hint}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="text-xs text-slate-500">
                                    <strong>Why this matters:</strong> More detailed input produces more accurate and professional documents.
                                </p>
                            </div>
                        </div>
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

    // Saved/Completed step
    if (step === "saved") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="max-w-lg w-full mx-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="h-10 w-10 text-emerald-600" />
                        </div>

                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            {completedAction === "exported" ? "PDF Exported!" : "Document Saved!"}
                        </h2>
                        <p className="text-slate-600 mb-6">
                            {completedAction === "exported"
                                ? "Your document has been saved and the PDF is downloading."
                                : "Your document is now saved and ready to use."}
                        </p>

                        {document && (
                            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
                                <p className="text-sm text-slate-500 mb-1">Document</p>
                                <p className="font-medium text-slate-900">{document.title}</p>
                                {selectedProjectId && (
                                    <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                                        <FolderOpen className="h-3 w-3" />
                                        Linked to: {projects.find(p => p.id === selectedProjectId)?.name}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <p className="text-sm font-medium text-slate-700 mb-3">What would you like to do next?</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onCancel()}
                                    className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                >
                                    <FileText className="h-6 w-6 text-blue-600" />
                                    <span className="text-sm font-medium text-slate-700">Create Another</span>
                                </button>
                                {document && (
                                    <a
                                        href={`/dashboard/site-docs/${document.id}`}
                                        className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                    >
                                        <Sparkles className="h-6 w-6 text-violet-600" />
                                        <span className="text-sm font-medium text-slate-700">View Document</span>
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <p className="text-xs text-slate-500">
                                Documents are automatically organized in your library and can be edited or exported anytime.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Preview step
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header with Step Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setStep("input")}
                            className="p-2 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Preview & Edit</h1>
                            <p className="text-sm text-slate-500">Review the generated document before saving</p>
                        </div>
                    </div>
                    {/* Step Progress */}
                    <div className="hidden sm:flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                            <CheckCircle className="h-4 w-4" />
                            Input
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                        <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                            <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                            Review
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                        <span className="flex items-center gap-1 px-3 py-1 text-slate-400">
                            <span className="w-5 h-5 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-xs">3</span>
                            Export
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Next Steps Guidance */}
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-blue-900">Review and finalize</p>
                            <p className="text-sm text-blue-700 mt-1">
                                You can edit any field directly. When ready, save to your library or export as PDF.
                                {selectedProjectId && " This document will be linked to your selected project."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Document Preview - Editable */}
                {generatedContent && (
                    <DocumentPreview
                        content={generatedContent}
                        template={template}
                        editable={true}
                        onChange={setGeneratedContent}
                    />
                )}

                {/* Action Bar */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-sm text-slate-500">
                        {document ? (
                            <span className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                Already saved — changes auto-save
                            </span>
                        ) : (
                            "Ready to finalize?"
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            disabled={exporting || !generatedContent}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {exporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            Export PDF
                        </button>
                        {!document && (
                            <button
                                onClick={handleSave}
                                disabled={step === "saving"}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                {step === "saving" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Save to Library
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
