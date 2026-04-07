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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Preparing your workspace…</p>
          <p className="mt-2 text-sm text-slate-500">This should only take a moment.</p>
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
