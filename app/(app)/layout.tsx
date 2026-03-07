"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { useWorkspace } from "@/lib/workspace/useWorkspace";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, error, summary } = useWorkspace({
    requireAuth: true,
    requireCompany: true,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-xl bg-white border border-red-200 rounded-2xl p-6">
          <h1 className="text-lg font-bold text-red-700">Workspace load failed</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary || summary.memberships.length === 0) {
    return null;
  }

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 selection:bg-amber-200">
      <AppSidebar />
      <div className="flex flex-col flex-1 md:ml-64 relative min-w-0 h-screen overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto hidden-scrollbar bg-slate-50/50 relative">{children}</main>
      </div>
    </div>
  );
}
