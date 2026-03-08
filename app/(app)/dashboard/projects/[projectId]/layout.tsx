"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCompanyProjects } from "@/lib/workspace/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { Project } from "@/lib/workspace/types";

const NAV_ITEMS = [
    { label: "Overview", href: "" },
    { label: "Sites", href: "/sites" },
    { label: "Planner", href: "/planner" },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    const params = useParams<{ projectId: string }>();
    const pathname = usePathname();
    const { summary, loading } = useWorkspace({ requireAuth: true, requireCompany: true });
    const [project, setProject] = useState<Project | null>(null);

    const companyId = summary?.activeMembership?.company_id ?? null;
    const base = `/dashboard/projects/${params.projectId}`;

    useEffect(() => {
        if (!companyId) return;
        fetchCompanyProjects(companyId).then((projects) => {
            const found = projects.find((p) => p.id === params.projectId) ?? null;
            setProject(found);
        });
    }, [companyId, params.projectId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="h-7 w-7 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full">
            {/* Project header + breadcrumb */}
            <div className="bg-white border-b border-slate-200 px-6 md:px-10 pt-6 pb-0">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                    <Link href="/dashboard" className="hover:text-slate-700 transition-colors">
                        Dashboard
                    </Link>
                    <span>/</span>
                    <Link href="/dashboard/projects" className="hover:text-slate-700 transition-colors">
                        Projects
                    </Link>
                    <span>/</span>
                    <span className="text-slate-800 font-semibold truncate max-w-[200px]">
                        {project?.name ?? params.projectId}
                    </span>
                </nav>

                {/* Project title + status */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {project?.name ?? "Project"}
                        </h1>
                        {project?.description && (
                            <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">{project.description}</p>
                        )}
                    </div>
                    {project && (
                        <span
                            className={`mt-1 shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${project.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : project.status === "completed"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : project.status === "on-hold"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${project.status === "active"
                                        ? "bg-emerald-500"
                                        : project.status === "completed"
                                            ? "bg-blue-500"
                                            : project.status === "on-hold"
                                                ? "bg-amber-500"
                                                : "bg-slate-400"
                                    }`}
                            />
                            {project.status}
                        </span>
                    )}
                </div>

                {/* Sub-nav tabs */}
                <nav className="flex gap-1 -mb-px">
                    {NAV_ITEMS.map((item) => {
                        const href = `${base}${item.href}`;
                        const isActive = item.href === "" ? pathname === base : pathname.startsWith(href);
                        return (
                            <Link
                                key={item.href}
                                href={href}
                                className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${isActive
                                        ? "border-amber-500 text-amber-700 bg-amber-50/50"
                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Page content */}
            <div className="flex-1 bg-slate-50/50">{children}</div>
        </div>
    );
}
