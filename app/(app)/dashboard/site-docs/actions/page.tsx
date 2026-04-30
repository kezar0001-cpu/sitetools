"use client";

import { ArrowLeft, ClipboardList, FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { ActionRegister } from "../components/ActionRegister";

export default function SiteDocsActionRegisterPage() {
    const router = useRouter();
    const { loading, summary } = useWorkspace({
        requireAuth: true,
        requireCompany: true,
    });

    if (loading || !summary) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
            </div>
        );
    }

    const activeCompanyId = summary.activeMembership?.company_id;
    if (!activeCompanyId) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">No organization found</p>
                    <p className="text-sm text-slate-400 mt-1">Please join or create an organization first</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={() => router.push("/dashboard/site-docs")}
                            className="shrink-0 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-200"
                            aria-label="Back to SiteDocs"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-blue-600" />
                                <h1 className="text-2xl font-bold text-slate-900">Action Register</h1>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                Review, update, and export action items across every SiteDocs report.
                            </p>
                        </div>
                    </div>
                </div>

                <ActionRegister companyId={activeCompanyId} />
            </div>
        </div>
    );
}
