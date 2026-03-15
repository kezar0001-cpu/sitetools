"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchProjectSites, fetchCompanyProjects } from "@/lib/workspace/client";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { Site, Project } from "@/lib/workspace/types";

export default function ProjectOverviewPage() {
    const params = useParams<{ projectId: string }>();
    const { summary, loading } = useWorkspace({ requireAuth: true, requireCompany: true });
    const [project, setProject] = useState<Project | null>(null);
    const [sites, setSites] = useState<Site[]>([]);
    const [busy, setBusy] = useState(true);

    const companyId = summary?.activeMembership?.company_id ?? null;
    const base = `/dashboard/projects/${params.projectId}`;

    useEffect(() => {
        if (!companyId) return;
        setBusy(true);
        Promise.all([
            fetchCompanyProjects(companyId),
            fetchProjectSites(params.projectId),
        ])
            .then(([projects, siteRows]) => {
                setProject(projects.find((p) => p.id === params.projectId) ?? null);
                setSites(siteRows);
            })
            .finally(() => setBusy(false));
    }, [companyId, params.projectId]);

    if (loading || busy) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="h-7 w-7 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                    { label: "Sites", value: sites.length, icon: "🏗️", href: `${base}/sites` },
                    { label: "SitePlan", value: "→", icon: "📋", href: "/site-plan" },
                ].map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-amber-300 hover:shadow-md transition-all group"
                    >
                        <div className="text-2xl mb-2">{stat.icon}</div>
                        <p className="text-3xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                            {stat.value}
                        </p>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">{stat.label}</p>
                    </Link>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Sites panel */}
                <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-bold text-slate-900">Sites</h2>
                        <Link
                            href={`${base}/sites`}
                            className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                        >
                            Manage →
                        </Link>
                    </div>
                    {sites.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                            <p className="text-3xl mb-2">🏗️</p>
                            <p className="text-sm text-slate-500">No sites yet.</p>
                            <Link
                                href={`${base}/sites`}
                                className="mt-3 inline-block px-4 py-2 text-xs font-bold bg-amber-400 text-amber-900 rounded-xl hover:bg-amber-500 transition-colors"
                            >
                                Add a Site
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {sites.slice(0, 5).map((site) => (
                                <li key={site.id} className="px-5 py-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{site.name}</p>
                                        <p className="text-xs text-slate-400">{site.slug}</p>
                                    </div>
                                    <Link
                                        href={`/print-qr/${site.slug}`}
                                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                                    >
                                        QR
                                    </Link>
                                </li>
                            ))}
                            {sites.length > 5 && (
                                <li className="px-5 py-3">
                                    <Link href={`${base}/sites`} className="text-xs text-slate-400 hover:text-slate-600">
                                        +{sites.length - 5} more sites →
                                    </Link>
                                </li>
                            )}
                        </ul>
                    )}
                </section>

                {/* SitePlan link panel */}
                <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-bold text-slate-900">Programme Tracker</h2>
                        <Link
                            href="/site-plan"
                            className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                        >
                            Open SitePlan →
                        </Link>
                    </div>
                    <div className="px-5 py-8 text-center">
                        <p className="text-3xl mb-2">📋</p>
                        <p className="text-sm text-slate-500">Manage your construction programmes in SitePlan.</p>
                        <Link
                            href="/site-plan"
                            className="mt-3 inline-block px-4 py-2 text-xs font-bold bg-amber-400 text-amber-900 rounded-xl hover:bg-amber-500 transition-colors"
                        >
                            Go to SitePlan
                        </Link>
                    </div>
                </section>

                {project?.description && (
                    <section className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <h2 className="font-bold text-slate-900 mb-2">About this Project</h2>
                        <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
                    </section>
                )}
            </div>
        </div>
    );
}
