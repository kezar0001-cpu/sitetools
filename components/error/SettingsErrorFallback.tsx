"use client";

import { AlertCircle, RefreshCw, Settings, Home } from "lucide-react";

interface SettingsErrorFallbackProps {
  onRetry?: () => void;
  error?: Error | null;
}

export function SettingsErrorFallback({ onRetry, error }: SettingsErrorFallbackProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8 min-h-[500px]">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
            <Settings className="h-6 w-6 text-amber-500" />
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-800 text-center">
          Settings temporarily unavailable
        </h2>

        <p className="mt-2 text-sm text-slate-500 text-center">
          We couldn&apos;t load your settings. This might be due to a network issue or temporary service disruption.
        </p>

        {error && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-mono text-slate-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handleRetry}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-amber-950 hover:bg-amber-500 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry loading settings
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
              Your site sign-in and daily records remain active. Core services continue running even when settings are temporarily unavailable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
