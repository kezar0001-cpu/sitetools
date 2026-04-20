"use client";

import { useState } from "react";
import { completeDiary } from "@/lib/site-capture/client";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type CompletableDiary = {
  id: string;
  status: string;
  date: string;
  auto_archive_at?: string | null;
};

interface CompleteExportPanelProps<TDiary extends CompletableDiary> {
  diary: TDiary;
  onUpdate: (updated: TDiary) => void;
}

export function CompleteExportPanel<TDiary extends CompletableDiary>({
  diary,
  onUpdate,
}: CompleteExportPanelProps<TDiary>) {
  const isCompleted = diary.status === "completed";
  const canComplete = diary.status === "draft" || diary.status === "archived";

  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);

  async function handleComplete() {
    if (!canComplete) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const updated = await completeDiary(diary.id);
      const next = { ...diary, ...updated } as TDiary;
      onUpdate(next);
      setShowExportOptions(true);
      toast.success("Diary completed.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to complete diary.";
      setCompleteError(message);
      toast.error(message);
    } finally {
      setCompleting(false);
    }
  }

  async function handleExport(format: "pdf" | "docx") {
    setExporting(format);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You must be signed in to export.");

      const response = await fetch(`/api/diary-export/${diary.id}?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Export failed");

      const contentType = response.headers.get("Content-Type") || "";
      const contentDisposition = response.headers.get("Content-Disposition");
      const suggestedFilename =
        contentDisposition?.match(/filename="?([^";]+)"?/)?.[1] ||
        `site-capture-${diary.date}.${format === "docx" ? "doc" : "html"}`;

      if (format === "pdf" && contentType.includes("text/html")) {
        const html = await response.text();
        const printWindow = window.open("", "_blank", "noopener,noreferrer");
        if (!printWindow) {
          throw new Error("Pop-up blocked. Please allow pop-ups to export PDF.");
        }

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        toast.success("Printable export opened. Use Print → Save as PDF.");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(format === "docx" ? "Word export downloaded." : `${format.toUpperCase()} export downloaded.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      console.error("Export error:", err);
      toast.error(message);
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      {/* ── Complete bar ── */}
      {canComplete && (
        <div className="space-y-2">
          {completeError && (
            <p className="text-sm text-red-600 text-center">{completeError}</p>
          )}
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 text-white text-base font-bold shadow-lg hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {completing ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            Complete Diary
          </button>
          <p className="text-xs text-center text-slate-500">
            Completing locks the diary and enables export options. It will be auto-archived after 30 days.
          </p>
        </div>
      )}

      {/* ── Export options (shown after complete or for completed diaries) ── */}
      {(isCompleted || showExportOptions) && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Export Diary</p>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {exporting === "pdf" ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Open PDF Export
            </button>
            <button
              type="button"
              onClick={() => handleExport("docx")}
              disabled={exporting !== null}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {exporting === "docx" ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Download Word
            </button>
          </div>
          
          {diary.auto_archive_at && (
            <p className="text-xs text-slate-500">
              Auto-archive scheduled: {new Date(diary.auto_archive_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* ── Completed indicator ── */}
      {isCompleted && (
        <div className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Diary Completed
        </div>
      )}
    </>
  );
}
