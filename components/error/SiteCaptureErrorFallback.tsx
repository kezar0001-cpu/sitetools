"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, ClipboardList, Home, FileText, RotateCcw } from "lucide-react";
import { getAllDrafts, DraftDiary } from "@/lib/site-capture/offline";

interface SiteCaptureErrorFallbackProps {
  onRetry?: () => void;
  error?: Error | null;
  companyId?: string;
}

export function SiteCaptureErrorFallback({ onRetry, error, companyId }: SiteCaptureErrorFallbackProps) {
  const [drafts, setDrafts] = useState<DraftDiary[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  useEffect(() => {
    async function loadDrafts() {
      try {
        const allDrafts = await getAllDrafts();
        // Filter to current company's unsubmitted drafts
        const unsubmitted = allDrafts.filter(
          (d) => !d.submitted && (!companyId || d.companyId === companyId)
        );
        setDrafts(unsubmitted.slice(0, 3)); // Show max 3 most recent
      } catch {
        // Silent fail - draft recovery is best-effort
      } finally {
        setLoadingDrafts(false);
      }
    }
    loadDrafts();
  }, [companyId]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const navigateToDraft = (draftId: string) => {
    window.location.href = `/dashboard/site-capture/${draftId}`;
  };

  const hasDrafts = drafts.length > 0;

  return (
    <div className="flex flex-1 items-center justify-center p-8 min-h-[500px]">
      <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-8 shadow-sm">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-sky-500" />
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-800 text-center">
          SiteCapture temporarily unavailable
        </h2>

        <p className="mt-2 text-sm text-slate-500 text-center">
          We couldn&apos;t load your field records. Your data is safe and any unsaved drafts are preserved locally.
        </p>

        {error && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-mono text-slate-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Draft Recovery Section */}
        {hasDrafts && (
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-900">
                Recoverable Drafts ({drafts.length})
              </h3>
            </div>
            <div className="space-y-2">
              {drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => navigateToDraft(draft.id)}
                  className="w-full text-left p-3 bg-white rounded-lg border border-amber-200 hover:border-amber-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      Draft from {new Date(draft.date).toLocaleDateString("en-AU")}
                    </span>
                    <RotateCcw className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Last edited {new Date(draft.updatedAt).toLocaleTimeString("en-AU")}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-amber-700">
              Click a draft above to recover your work, or retry loading below.
            </p>
          </div>
        )}

        {!hasDrafts && !loadingDrafts && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                No recoverable drafts found. If you were working on an entry, it may have been saved successfully before the error occurred.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handleRetry}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white hover:bg-sky-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry loading records
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh page
            </button>

            <button
              onClick={() => window.location.href = "/dashboard"}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-start gap-2 text-xs text-slate-500">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              SiteCapture automatically saves drafts locally. Your work is preserved even if the server is temporarily unavailable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
