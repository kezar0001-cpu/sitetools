"use client";

import { useCallback, useRef, useState } from "react";
import { parseMspXml, parseSimpleCsv, ImportedTask, ImportResult } from "@/lib/planner/import-parser";

interface Props {
    onImport: (tasks: ImportedTask[], projectName: string | null) => Promise<void>;
    onClose: () => void;
}

function isBinaryMpp(buffer: ArrayBuffer): boolean {
    // .mpp files start with the OLE Compound Document signature D0 CF 11 E0
    const bytes = new Uint8Array(buffer.slice(0, 8));
    return bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0;
}

export function PlannerImportDialog({ onImport, onClose }: Props) {
    const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
    const [result, setResult] = useState<ImportResult | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [parsing, setParsing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        setError(null);
        setParsing(true);

        try {
            // First check binary signature for actual .mpp files
            const headerBuf = await file.slice(0, 8).arrayBuffer();
            if (isBinaryMpp(headerBuf)) {
                setError(
                    "This appears to be a binary .mpp file, which cannot be read directly.\n\n" +
                    "To import: open the file in Microsoft Project → File → Save As → XML Format (.xml), then upload the .xml file here."
                );
                setParsing(false);
                return;
            }

            // Read as text — use a Worker-compatible approach via Promise to avoid blocking
            const text = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string ?? "");
                reader.onerror = () => reject(new Error("Failed to read file"));
                reader.readAsText(file, "utf-8");
            });

            if (!text.trim()) {
                setError("The file appears to be empty.");
                setParsing(false);
                return;
            }

            // Parse — wrapped in setTimeout to yield to the browser before heavy parsing
            await new Promise<void>((resolve) => setTimeout(resolve, 10));

            let parsed: ImportResult;
            const lowerName = file.name.toLowerCase();

            if (lowerName.endsWith(".xml") || lowerName.endsWith(".mpp")) {
                parsed = parseMspXml(text);
            } else if (lowerName.endsWith(".csv") || lowerName.endsWith(".tsv") || lowerName.endsWith(".txt")) {
                parsed = parseSimpleCsv(text);
            } else {
                // Auto-detect: try XML then CSV
                parsed = parseMspXml(text);
                if (parsed.tasks.length === 0) {
                    parsed = parseSimpleCsv(text);
                }
            }

            if (parsed.errors.length > 0 && parsed.tasks.length === 0) {
                setError(parsed.errors.join("\n\n"));
                setParsing(false);
                return;
            }

            setResult(parsed);
            // Auto-select non-summary tasks
            setSelectedTasks(new Set(parsed.tasks.filter((t) => !t.summary).map((t) => t.uid)));
            setStep("preview");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse file.");
        } finally {
            setParsing(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        // Reset so same file can be re-selected
        e.target.value = "";
    }, [handleFile]);

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

    const reset = () => {
        setStep("upload");
        setResult(null);
        setError(null);
        setSelectedTasks(new Set());
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Import Project Plan</h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {step === "upload" && "Upload an MS Project XML (.xml) or CSV file."}
                            {step === "preview" && `${result?.tasks.length ?? 0} rows found — select tasks to import.`}
                            {step === "importing" && "Saving tasks to planner..."}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">✕</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-5 min-h-0">
                    {step === "upload" && (
                        <div className="space-y-4">
                            {/* Drop zone */}
                            <div
                                className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragActive ? "border-amber-400 bg-amber-50" : "border-slate-300 hover:border-amber-400 hover:bg-slate-50"
                                    } ${parsing ? "pointer-events-none opacity-50" : ""}`}
                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xml,.csv,.tsv,.txt,.mpp"
                                    onChange={handleInputChange}
                                    className="hidden"
                                />
                                {parsing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-3" />
                                        <p className="font-semibold text-slate-700">Parsing file...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-5xl mb-3">📥</div>
                                        <p className="font-semibold text-slate-700 text-lg">Drop your project file here</p>
                                        <p className="text-sm text-slate-500 mt-1">or click to browse files</p>
                                        <p className="text-xs text-slate-400 mt-3">Supports .xml (MSPDI), .csv, .tsv</p>
                                    </>
                                )}
                            </div>

                            {/* Format guide */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                <h3 className="font-semibold text-slate-800 text-sm">Supported formats</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <div className="bg-white rounded-lg p-3 border border-amber-200 ring-1 ring-amber-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-amber-700">.xml (MS Project MSPDI)</span>
                                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold">RECOMMENDED</span>
                                        </div>
                                        <p className="text-slate-500">From MS Project: <span className="font-mono bg-slate-100 px-1">File → Save As → XML Format</span></p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                                        <p className="font-bold text-slate-700 mb-1">.csv / .tsv</p>
                                        <p className="text-slate-500">Headers needed: Task Name, Duration, Start, Finish, % Complete</p>
                                    </div>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                    <strong>⚠ Binary .mpp files cannot be imported directly.</strong> You must export from MS Project as XML first. Go to File → Save As → choose <em>XML Format (*.xml)</em>.
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 whitespace-pre-line">
                                    <strong className="block mb-1">Import error</strong>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {step === "preview" && result && (
                        <div className="space-y-3">
                            {result.projectName && (
                                <div className="bg-slate-50 rounded-lg p-3 text-sm flex flex-wrap gap-4">
                                    <span><span className="font-medium text-slate-600">Project:</span> <span className="font-bold text-slate-900">{result.projectName}</span></span>
                                    {result.projectStart && <span className="text-slate-500">Start: {result.projectStart}</span>}
                                    {result.projectFinish && <span className="text-slate-500">Finish: {result.projectFinish}</span>}
                                    <span className="text-slate-500">{result.tasks.filter(t => !t.summary).length} tasks, {result.tasks.filter(t => t.summary).length} groups</span>
                                </div>
                            )}

                            {result.errors.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                                    ⚠ {result.errors.join(", ")}
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
                            )}

                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-2 w-8">
                                                <input
                                                    type="checkbox"
                                                    checked={result.tasks.filter(t => !t.summary).length > 0 && selectedTasks.size === result.tasks.filter(t => !t.summary).length}
                                                    onChange={toggleAll}
                                                />
                                            </th>
                                            <th className="text-left p-2 min-w-[180px]">Task Name</th>
                                            <th className="text-left p-2 w-20 hidden md:table-cell">WBS</th>
                                            <th className="text-left p-2 w-20">Duration</th>
                                            <th className="text-left p-2 w-24 hidden sm:table-cell">Start</th>
                                            <th className="text-left p-2 w-24 hidden sm:table-cell">Finish</th>
                                            <th className="text-left p-2 w-12">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.tasks.map((task) => (
                                            <tr
                                                key={task.uid}
                                                className={`border-t border-slate-100 ${task.summary ? "bg-slate-800 text-white" : ""
                                                    } ${!selectedTasks.has(task.uid) && !task.summary ? "opacity-40" : ""}`}
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
                                                <td className="p-2" style={{ paddingLeft: `${8 + task.outlineLevel * 14}px` }}>
                                                    {task.milestone && <span className="text-purple-400 mr-1">◆</span>}
                                                    <span className={task.summary ? "font-bold text-xs uppercase tracking-wide" : "text-sm"}>{task.name}</span>
                                                </td>
                                                <td className="p-2 text-xs font-mono text-slate-400 hidden md:table-cell">{task.wbsCode ?? ""}</td>
                                                <td className="p-2 text-xs text-slate-500">{task.durationDays != null ? `${task.durationDays}d` : "—"}</td>
                                                <td className="p-2 text-xs text-slate-500 hidden sm:table-cell">{task.start ?? "—"}</td>
                                                <td className="p-2 text-xs text-slate-500 hidden sm:table-cell">{task.finish ?? "—"}</td>
                                                <td className="p-2 text-xs text-slate-500">{task.percentComplete}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === "importing" && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4" />
                            <p className="text-slate-700 font-semibold">Importing {selectedTasks.size} tasks...</p>
                            <p className="text-slate-400 text-sm mt-1">This may take a moment for large plans.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
                    {step === "preview" ? (
                        <>
                            <button onClick={reset} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                                ← Back
                            </button>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-500">{selectedTasks.size} of {result?.tasks.filter(t => !t.summary).length ?? 0} tasks selected</span>
                                <button
                                    disabled={selectedTasks.size === 0}
                                    onClick={handleImport}
                                    className="px-5 py-2.5 rounded-lg bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40"
                                >
                                    Import {selectedTasks.size} Tasks
                                </button>
                            </div>
                        </>
                    ) : (
                        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors ml-auto">
                            {step === "importing" ? "Cancel" : "Close"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
