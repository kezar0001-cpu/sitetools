"use client";

import { useState } from "react";
import { Toaster } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useWorkspace } from "@/lib/workspace/useWorkspace";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { loading, error, summary, refresh } = useWorkspace({
    requireAuth: true,
    requireCompany: true,
  });

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center shadow-xl">
          <div className="w-2 h-2 rounded-sm bg-amber-400 mx-auto mb-5" />
          <p className="text-sm font-bold text-zinc-100">Preparing your workspace…</p>
          <p className="mt-1.5 text-sm text-zinc-500">This should only take a moment.</p>
          <div className="mt-5 h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full w-2/5 bg-amber-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-xl bg-white border border-red-200 rounded-2xl p-6">
          <h1 className="text-lg font-bold text-red-700">Workspace load failed</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 text-sm font-semibold text-amber-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!summary || summary.memberships.length === 0) {
    return null;
  }

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 selection:bg-amber-200">
      <AppSidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex flex-col flex-1 md:ml-64 relative min-w-0 h-screen overflow-hidden">
        <AppTopbar onMenuToggle={() => setMobileSidebarOpen((open) => !open)} />
        <main className="flex-1 overflow-y-auto hidden-scrollbar bg-slate-50/50 relative">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
