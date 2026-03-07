"use client";

import { useCallback, useState } from "react";
import { parseMspXml, parseSimpleCsv, ImportedTask, ImportResult } from "@/lib/planner/import-parser";

interface Props {
    onImport: (tasks: ImportedTask[], projectName: string | null) => Promise<void>;
    onClose: () => void;
}

export function PlannerImportDialog({ onImport, onClose }: Props) {
    const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
    const [result, setResult] = useState<ImportResult | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = useCallback(async (file: File) => {
        setError(null);
        try {
            const text = await file.text();
            let parsed: ImportResult;

            if (file.name.endsWith(".xml") || file.name.endsWith(".mpp")) {
                parsed = parseMspXml(text);
            } else if (file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.name.endsWith(".txt")) {
                parsed = parseSimpleCsv(text);
            } else {
                // Try XML first, then CSV
                parsed = parseMspXml(text);
                if (parsed.tasks.length === 0) {
                    parsed = parseSimpleCsv(text);
                }
            }

            if (parsed.errors.length > 0 && parsed.tasks.length === 0) {
                setError(parsed.errors.join("\n"));
                return;
            }

            setResult(parsed);
            setSelectedTasks(new Set(parsed.tasks.filter((t) => !t.summary).map((t) => t.uid)));
            setStep("preview");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse file.");
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const toggleTask = (uid: string) => {
        setSelectedTasks((prev) => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    };

    const toggleAll = () => {
        if (!result) return;
        const nonSummary = result.tasks.filter((t) => !t.summary);
        if (selectedTasks.size === nonSummary.length) {
            setSelectedTasks(new Set());
        } else {
            setSelectedTasks(new Set(nonSummary.map((t) => t.uid)));
        }
    };

    const handleImport = async () => {
        if (!result) return;
        setStep("importing");
        try {
            const tasksToImport = result.tasks.filter((t) => selectedTasks.has(t.uid));
            await onImport(tasksToImport, result.projectName);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed.");
            setStep("preview");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Import Project Plan</h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {step === "upload" && "Upload an MS Project XML (.xml), exported .mpp, or CSV file."}
                            {step === "preview" && `${result?.tasks.length ?? 0} tasks found — select which to import.`}
                            {step === "importing" && "Importing tasks..."}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-5">
                    {step === "upload" && (
                        <div className="space-y-4">
                            <div
                                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragActive ? "border-amber-400 bg-amber-50" : "border-slate-300 hover:border-slate-400"
                                    }`}
                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleDrop}
                            >
                                <div className="text-4xl mb-3">📄</div>
                                <p className="font-semibold text-slate-700">Drag & drop your project file here</p>
                                <p className="text-sm text-slate-500 mt-1">or click to browse</p>
                                <input
                                    type="file"
                                    accept=".xml,.mpp,.csv,.tsv,.txt"
                                    onChange={handleInputChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    style={{ position: "relative", marginTop: "12px" }}
                                />
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                <h3 className="font-semibold text-slate-800 text-sm">Supported formats</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                                        <p className="font-bold text-slate-700">.xml (MSPDI)</p>
                                        <p className="text-slate-500 mt-1">MS Project XML export. File → Save As → XML format.</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-amber-200 ring-1 ring-amber-100">
                                        <p className="font-bold text-amber-700">.mpp (Exported XML)</p>
                                        <p className="text-slate-500 mt-1">Export your .mpp as XML from MS Project, then upload here.</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                                        <p className="font-bold text-slate-700">.csv / .tsv</p>
                                        <p className="text-slate-500 mt-1">Comma or tab delimited with headers: Task Name, Duration, Start, Finish.</p>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
                            )}
                        </div>
                    )}

                    {step === "preview" && result && (
                        <div className="space-y-3">
                            {result.projectName && (
                                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                                    <span className="font-medium text-slate-600">Project: </span>
                                    <span className="font-bold text-slate-900">{result.projectName}</span>
                                    {result.projectStart && (
                                        <> • <span className="text-slate-500">Start: {result.projectStart}</span></>
                                    )}
                                    {result.projectFinish && (
                                        <> • <span className="text-slate-500">Finish: {result.projectFinish}</span></>
                                    )}
                                </div>
                            )}

                            {result.errors.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                                    ⚠ {result.errors.join(", ")}
                                </div>
                            )}

                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="p-2 w-8">
                                                <input type="checkbox" checked={selectedTasks.size === result.tasks.filter((t) => !t.summary).length} onChange={toggleAll} />
                                            </th>
                                            <th className="text-left p-2">Task Name</th>
                                            <th className="text-left p-2 w-20">WBS</th>
                                            <th className="text-left p-2 w-20">Duration</th>
                                            <th className="text-left p-2 w-24">Start</th>
                                            <th className="text-left p-2 w-24">Finish</th>
                                            <th className="text-left p-2 w-16">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.tasks.map((task) => (
                                            <tr
                                                key={task.uid}
                                                className={`border-t border-slate-100 ${task.summary ? "bg-slate-50 font-semibold" : ""} ${!selectedTasks.has(task.uid) && !task.summary ? "opacity-40" : ""
                                                    }`}
                                            >
                                                <td className="p-2 text-center">
                                                    {!task.summary && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTasks.has(task.uid)}
                                                            onChange={() => toggleTask(task.uid)}
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-2" style={{ paddingLeft: `${8 + task.outlineLevel * 16}px` }}>
                                                    {task.milestone && <span className="text-purple-500 mr-1">◆</span>}
                                                    {task.name}
                                                </td>
                                                <td className="p-2 text-xs text-slate-500 font-mono">{task.wbsCode ?? "—"}</td>
                                                <td className="p-2 text-xs text-slate-500">{task.durationDays != null ? `${task.durationDays}d` : "—"}</td>
                                                <td className="p-2 text-xs text-slate-500">{task.start ?? "—"}</td>
                                                <td className="p-2 text-xs text-slate-500">{task.finish ?? "—"}</td>
                                                <td className="p-2 text-xs text-slate-500">{task.percentComplete}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === "importing" && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mb-4" />
                            <p className="text-slate-600 font-medium">Importing {selectedTasks.size} tasks...</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === "preview" && (
                    <div className="p-5 border-t border-slate-200 flex items-center justify-between">
                        <button
                            onClick={() => { setStep("upload"); setResult(null); setError(null); }}
                            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            ← Back
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-500">{selectedTasks.size} selected</span>
                            <button
                                disabled={selectedTasks.size === 0}
                                onClick={handleImport}
                                className="px-5 py-2.5 rounded-lg bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40"
                            >
                                Import {selectedTasks.size} Tasks
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
