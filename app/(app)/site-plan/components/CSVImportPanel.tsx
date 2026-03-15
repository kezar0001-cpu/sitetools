"use client";

import { useState, useRef } from "react";
import { Upload, X, AlertCircle, Check } from "lucide-react";
import type { CSVRow, TaskType, CreateTaskPayload } from "@/types/siteplan";
import { useBulkCreateTasks } from "@/hooks/useSitePlanTasks";

interface CSVImportPanelProps {
  projectId: string;
  onClose: () => void;
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const typeIdx = headers.indexOf("type");
  const parentIdx = headers.indexOf("parent_name");
  const startIdx = headers.indexOf("start_date");
  const endIdx = headers.indexOf("end_date");
  const responsibleIdx = headers.indexOf("responsible");

  if (nameIdx === -1 || typeIdx === -1 || startIdx === -1 || endIdx === -1) {
    throw new Error(
      "CSV must have columns: name, type, start_date, end_date. Optional: parent_name, responsible"
    );
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return {
      name: cols[nameIdx] ?? "",
      type: (cols[typeIdx] ?? "task") as TaskType,
      parent_name: parentIdx >= 0 ? cols[parentIdx] ?? "" : "",
      start_date: cols[startIdx] ?? "",
      end_date: cols[endIdx] ?? "",
      responsible: responsibleIdx >= 0 ? cols[responsibleIdx] ?? "" : "",
    };
  });
}

export function CSVImportPanel({ projectId, onClose }: CSVImportPanelProps) {
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkCreate = useBulkCreateTasks();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setRows([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setError("No data rows found in CSV");
          return;
        }
        setRows(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    // Build tasks with parent mapping
    const parentMap = new Map<string, string>();
    const payloads: Omit<CreateTaskPayload, "project_id">[] = [];

    // First pass: create phases (no parent)
    let sortOrder = 0;
    for (const row of rows) {
      if (row.type === "phase") {
        payloads.push({
          name: row.name,
          type: row.type,
          start_date: row.start_date,
          end_date: row.end_date,
          responsible: row.responsible || undefined,
          sort_order: sortOrder++,
        });
      }
    }

    // For simplicity in CSV import, we insert all rows as flat tasks
    // and let the parent_name mapping work for tasks/subtasks
    for (const row of rows) {
      if (row.type !== "phase") {
        payloads.push({
          name: row.name,
          type: row.type,
          start_date: row.start_date,
          end_date: row.end_date,
          responsible: row.responsible || undefined,
          sort_order: sortOrder++,
          parent_id: parentMap.get(row.parent_name) ?? undefined,
        });
      }
    }

    bulkCreate.mutate(
      { projectId, tasks: payloads },
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
          {rows.length} tasks imported successfully!
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Import from CSV
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-slate-500">
        CSV columns: name, type (phase/task/subtask), parent_name, start_date,
        end_date, responsible
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 w-full justify-center py-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500 min-h-[44px]"
      >
        <Upload className="h-4 w-4" />
        Choose CSV file
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
          <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-3 py-2 font-medium text-slate-500">Name</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Type</th>
                  <th className="px-3 py-2 font-medium text-slate-500">
                    Parent
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-500">
                    Start
                  </th>
                  <th className="px-3 py-2 font-medium text-slate-500">End</th>
                  <th className="px-3 py-2 font-medium text-slate-500">
                    Responsible
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {row.parent_name || "—"}
                    </td>
                    <td className="px-3 py-2">{row.start_date}</td>
                    <td className="px-3 py-2">{row.end_date}</td>
                    <td className="px-3 py-2">{row.responsible || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={bulkCreate.isPending}
            className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg min-h-[44px]"
          >
            {bulkCreate.isPending
              ? "Importing..."
              : `Import ${rows.length} tasks`}
          </button>
        </>
      )}
    </div>
  );
}
