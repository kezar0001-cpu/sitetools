"use client";

import { useState, useRef } from "react";
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";
import { X, AlertCircle, Check, FileSpreadsheet } from "lucide-react";
import type { ImportedRow, TaskType } from "@/types/siteplan";
import { useHierarchicalImport } from "@/hooks/useSitePlanTasks";
import type { HierarchicalTask } from "@/hooks/useSitePlanTasks";
import { parseCsvToTasks, resolvePredecessorIndices } from "@/lib/csvParser";

interface ImportPanelProps {
  projectId: string;
  onClose: () => void;
}

// ─── MS Project XML Parser ──────────────────────────────────

function parseMSProjectXML(text: string): ImportedRow[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");

  // MS Project XML uses <Task> elements
  const taskEls = doc.querySelectorAll("Task");
  const rows: ImportedRow[] = [];

  taskEls.forEach((el) => {
    const name = el.querySelector("Name")?.textContent ?? "";
    if (!name.trim()) return;

    const outlineLevel = parseInt(
      el.querySelector("OutlineLevel")?.textContent ?? "0",
      10
    );
    // Skip the project summary task (outline level 0)
    if (outlineLevel === 0) return;

    const summary = el.querySelector("Summary")?.textContent === "1";
    const start = el.querySelector("Start")?.textContent ?? "";
    const finish = el.querySelector("Finish")?.textContent ?? "";
    const durationRaw = el.querySelector("Duration")?.textContent ?? "";
    const resource = el.querySelector("ResourceNames")?.textContent ??
      el.querySelector("ResourceName")?.textContent ?? "";

    // Extract predecessor links
    const predEls = el.querySelectorAll("PredecessorLink");
    const preds: string[] = [];
    predEls.forEach((p) => {
      const predId = p.querySelector("PredecessorUID")?.textContent;
      if (predId) preds.push(predId);
    });
    const predecessors = preds.join(", ");

    // Notes/comments
    const notes = el.querySelector("Notes")?.textContent ?? "";

    // Parse PT duration (e.g. "PT40H0M0S" = 5 days, "P5D" = 5 days)
    let durationDays = 7;
    if (durationRaw.startsWith("PT")) {
      const hours = parseInt(durationRaw.match(/(\d+)H/)?.[1] ?? "0", 10);
      durationDays = Math.max(1, Math.round(hours / 8));
    } else if (durationRaw.startsWith("P")) {
      const days = parseInt(durationRaw.match(/(\d+)D/)?.[1] ?? "0", 10);
      durationDays = Math.max(1, days);
    }

    // Determine type from outline level
    let taskType: TaskType = "task";
    if (summary || outlineLevel === 1) taskType = "phase";
    else if (outlineLevel === 2) taskType = "task";
    else taskType = "subtask";

    // Normalize dates to YYYY-MM-DD
    const startDate = start ? start.split("T")[0] : "";
    const endDate = finish ? finish.split("T")[0] : "";

    rows.push({
      name: name.trim(),
      type: taskType,
      parent_name: "",
      start_date: startDate,
      end_date: endDate,
      duration: durationDays,
      predecessors,
      responsible: resource,
      assigned_to: resource,
      comments: notes,
      outline_level: outlineLevel,
    });
  });

  return rows;
}

// ─── .mpp binary extraction (basic CFB parsing via text extraction) ──

function parseMPPBinary(buffer: ArrayBuffer): ImportedRow[] {
  // MPP files are OLE2 Compound Binary files. We extract readable text
  // and attempt to find task names and dates from the binary content.
  // For production use, a server-side parser would be more robust.
  const bytes = new Uint8Array(buffer);
  const textChunks: string[] = [];

  // Extract UTF-16LE strings (MS Office format)
  let current = "";
  for (let i = 0; i < bytes.length - 1; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (code >= 32 && code < 127) {
      current += String.fromCharCode(code);
    } else if (current.length > 2) {
      textChunks.push(current);
      current = "";
    } else {
      current = "";
    }
  }
  if (current.length > 2) textChunks.push(current);

  // Also extract ASCII strings
  current = "";
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i];
    if (code >= 32 && code < 127) {
      current += String.fromCharCode(code);
    } else if (current.length > 2) {
      textChunks.push(current);
      current = "";
    } else {
      current = "";
    }
  }
  if (current.length > 2) textChunks.push(current);

  // Filter likely task names (heuristic: strings 3-100 chars, not file paths, not code)
  const datePattern = /\d{4}-\d{2}-\d{2}/;
  const taskNames: string[] = [];
  const dates: string[] = [];

  for (const chunk of textChunks) {
    if (datePattern.test(chunk)) {
      const match = chunk.match(datePattern);
      if (match) dates.push(match[0]);
    }
    // Filter task-like names
    if (
      chunk.length >= 3 &&
      chunk.length <= 100 &&
      !chunk.includes("\\") &&
      !chunk.includes("/") &&
      !chunk.includes("{") &&
      !chunk.includes("}") &&
      !chunk.startsWith("Microsoft") &&
      !chunk.startsWith("http")
    ) {
      taskNames.push(chunk);
    }
  }

  // Deduplicate and create rows
  const uniqueNames = Array.from(new Set(taskNames)).slice(0, 200);
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  return uniqueNames.map((name, i) => ({
    name,
    type: "task" as TaskType,
    parent_name: "",
    start_date: dates[i * 2] ?? today,
    end_date: dates[i * 2 + 1] ?? nextWeek,
    duration: 7,
    predecessors: "",
    responsible: "",
    assigned_to: "",
    comments: "",
    outline_level: 2,
  }));
}

// ─── Import router ──────────────────────────────────────────

async function parseFile(
  file: File
): Promise<{ rows: ImportedRow[]; format: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "csv") {
    const text = await file.text();
    return { rows: parseCsvToTasks(text), format: "CSV" };
  }

  if (ext === "xml") {
    const text = await file.text();
    // Check if it's MS Project XML
    if (text.includes("<Project") && text.includes("<Task")) {
      return { rows: parseMSProjectXML(text), format: "MS Project XML" };
    }
    // Generic XML — try to extract task-like elements
    return { rows: parseMSProjectXML(text), format: "XML" };
  }

  if (ext === "mpp") {
    const buffer = await file.arrayBuffer();
    return { rows: parseMPPBinary(buffer), format: "MS Project (.mpp)" };
  }

  // Fallback: try as CSV
  const text = await file.text();
  return { rows: parseCsvToTasks(text), format: "CSV" };
}

// ─── Hierarchy builder ──────────────────────────────────────

function buildHierarchyFromOutline(rows: ImportedRow[]): ImportedRow[] {
  // Auto-assign type from outline levels if they exist
  if (rows.every((r) => r.outline_level >= 0)) {
    const minLevel = Math.min(...rows.map((r) => r.outline_level));
    return rows.map((r) => {
      const adjustedLevel = r.outline_level - minLevel;
      let type: TaskType = "task";
      if (adjustedLevel === 0) type = "phase";
      else if (adjustedLevel === 1) type = "task";
      else type = "subtask";
      return { ...r, type };
    });
  }
  return rows;
}

// ─── Component ──────────────────────────────────────────────

export function ImportPanel({ projectId, onClose }: ImportPanelProps) {
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [format, setFormat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hierarchicalImport = useHierarchicalImport();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setRows([]);

    try {
      const result = await parseFile(file);
      if (result.rows.length === 0) {
        setError("No tasks found in this file. Check the format.");
        return;
      }
      const processed = buildHierarchyFromOutline(result.rows);
      setRows(processed);
      setFormat(result.format);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const handleImport = () => {
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .split("T")[0];

    // Resolve predecessor references (names / row numbers) → flat indices
    const predIndicesByRow = resolvePredecessorIndices(rows);

    // Build hierarchical tasks with _tempIndex and _parentIndex.
    // We use a stack that tracks the outline_level → _tempIndex mapping
    // so each row knows who its parent is.
    const parentStack: { level: number; tempIndex: number }[] = [];
    const tasks: HierarchicalTask[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Pop stack until we find a parent whose level is strictly less
      while (
        parentStack.length > 0 &&
        parentStack[parentStack.length - 1].level >= row.outline_level
      ) {
        parentStack.pop();
      }

      const parentIndex =
        parentStack.length > 0
          ? parentStack[parentStack.length - 1].tempIndex
          : -1;

      tasks.push({
        _tempIndex: i,
        _parentIndex: parentIndex,
        _predecessorIndices: predIndicesByRow[i],
        name: row.name,
        type: row.type,
        start_date: row.start_date || today,
        end_date: row.end_date || nextWeek,
        responsible: row.responsible || undefined,
        assigned_to: row.assigned_to || undefined,
        comments: row.comments || undefined,
        sort_order: i,
      });

      parentStack.push({ level: row.outline_level, tempIndex: i });
    }

    hierarchicalImport.mutate(
      { projectId, tasks },
      {
        onSuccess: () => setImported(true),
        onError: (err) =>
          setError(err instanceof Error ? err.message : "Import failed"),
      }
    );
  };

  if (imported) {
    return (
      <div className="p-6 space-y-4 text-center">
        <Check className="h-12 w-12 text-green-500 mx-auto" />
        <p className="text-sm font-medium text-slate-700">
          {rows.length} tasks imported from {format}!
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg min-h-[44px]"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <ComponentErrorBoundary>
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Import Programme
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-slate-500">
          Supported formats:
        </p>
        <div className="flex flex-wrap gap-2">
          {[".csv", ".xml (MS Project)", ".mpp (MS Project)"].map((f) => (
            <span
              key={f}
              className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xml,.mpp"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 w-full justify-center py-4 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500 min-h-[44px]"
      >
        <FileSpreadsheet className="h-5 w-5" />
        Choose file to import
      </button>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600">
              Preview — {rows.length} tasks from {format}
            </p>
          </div>
          <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-left sticky top-0">
                  <th className="px-3 py-2 font-medium text-slate-500">Name</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Type</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Start</th>
                  <th className="px-3 py-2 font-medium text-slate-500">End</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Dur.</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Resp.</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td
                      className="px-3 py-2"
                      style={{
                        paddingLeft: `${12 + (row.outline_level > 0 ? (row.outline_level - 1) * 16 : 0)}px`,
                      }}
                    >
                      {row.type === "phase" ? (
                        <span className="font-semibold">{row.name}</span>
                      ) : (
                        row.name
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{row.type}</td>
                    <td className="px-3 py-2">{row.start_date || "—"}</td>
                    <td className="px-3 py-2">{row.end_date || "—"}</td>
                    <td className="px-3 py-2">{row.duration}d</td>
                    <td className="px-3 py-2">{row.responsible || "—"}</td>
                  </tr>
                ))}
                {rows.length > 50 && (
                  <tr className="border-t border-slate-100">
                    <td
                      colSpan={6}
                      className="px-3 py-2 text-slate-400 text-center"
                    >
                      ...and {rows.length - 50} more tasks
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={hierarchicalImport.isPending}
            className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg min-h-[44px]"
          >
            {hierarchicalImport.isPending
              ? "Importing..."
              : `Import ${rows.length} tasks`}
          </button>
        </>
      )}
    </div>
    </ComponentErrorBoundary>
  );
}
