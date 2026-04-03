"use client";

import { getPrimaryNavModules, getSecondaryNavModules, getRoadmapModules } from "@/lib/modules";
import { ModuleCard } from "@/components/modules/ModuleCard";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { useEffect, useState } from "react";
import { fetchCompanySites } from "@/lib/workspace/client";
import { canManageSites } from "@/lib/workspace/permissions";
import Link from "next/link";

export default function DashboardHome() {
    const { loading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });
    const [sitesLoading, setSitesLoading] = useState(true);
    const [hasSites, setHasSites] = useState<boolean | null>(null);

    const activeCompanyId = summary?.activeMembership?.company_id;
    const userRole = summary?.activeMembership?.role;
    const isAdmin = canManageSites(userRole);

    useEffect(() => {
        if (!activeCompanyId) return;
        
        setSitesLoading(true);
        fetchCompanySites(activeCompanyId)
            .then(sites => {
                setHasSites(sites.length > 0);
            })
            .catch(err => {
                console.error("Failed to fetch sites for dashboard empty state", err);
                setHasSites(true); // Fallback to avoid showing empty state on error
            })
            .finally(() => {
                setSitesLoading(false);
            });
    }, [activeCompanyId]);

    if (loading || (sitesLoading && hasSites === null)) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <div className="h-10 w-10 rounded-full border-4 border-slate-100 border-t-amber-500 animate-spin"></div>
            </div>
        );
    }

    const primaryModules = getPrimaryNavModules();
    const secondaryModules = getSecondaryNavModules();
    const roadmapModules = getRoadmapModules();

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12">
            {!hasSites && isAdmin ? (
                <div className="bg-white border-2 border-amber-100 rounded-[2.5rem] p-4 md:p-6 shadow-2xl shadow-amber-900/5 overflow-hidden group">
                    <div className="bg-slate-900 rounded-[2rem] p-8 md:p-14 text-white relative overflow-hidden">
                        {/* Premium Background Pattern */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                            <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <pattern id="gridLarge" width="80" height="80" patternUnits="userSpaceOnUse">
                                        <path d="M0 80V0H80V80z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                    </pattern>
                                    <radialGradient id="fadeGradient" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="white" stopOpacity="1" />
                                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                                    </radialGradient>
                                    <mask id="mask">
                                        <rect width="100%" height="100%" fill="url(#fadeGradient)" />
                                    </mask>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#gridLarge)" mask="url(#mask)" />
                            </svg>
                        </div>

                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-10">
                            <div className="flex-1 space-y-6">
                                <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-full">
                                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                                    <span className="text-amber-400 text-xs font-black uppercase tracking-widest">Setup Required</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1]">
                                    Your workspace is <span className="text-amber-400">waiting.</span>
                                </h1>
                                <p className="text-lg md:text-xl text-slate-400 font-medium max-w-xl leading-relaxed">
                                    Buildstate is site-first. To start tracking workforce occupancy or building project plans, you need to register your first physical site location.
                                </p>
                                <div className="pt-4">
                                    <Link 
                                        href="/dashboard/sites" 
                                        className="inline-flex items-center gap-4 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black px-8 py-5 rounded-2xl text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-amber-400/20"
                                    >
                                        Create your first site
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>

                            <div className="lg:w-80 h-80 relative flex items-center justify-center shrink-0">
                                {/* Decorative elements */}
                                <div className="absolute inset-0 bg-amber-400/10 blur-3xl rounded-full animate-pulse" />
                                <div className="relative w-64 h-64 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-sm shadow-2xl flex items-center justify-center rotate-6 group-hover:rotate-0 transition-transform duration-700">
                                    <div className="w-32 h-32 bg-amber-400 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-amber-400/40">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-amber-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    
                                    {/* Small floating bits */}
                                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-slate-800 border border-white/10 rounded-2xl shadow-xl flex items-center justify-center -rotate-12">
                                        <div className="w-6 h-1 bg-amber-400 rounded-full" />
                                    </div>
                                    <div className="absolute -bottom-6 -left-2 w-16 h-16 bg-slate-800 border border-white/10 rounded-2xl shadow-xl flex items-center justify-center rotate-12">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M0 40V0H40V40z" fill="none" stroke="currentColor" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>

                    <div className="relative z-10">
                        <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-3">Module Centre</p>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-balance">
                            Your Workspace
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 font-medium max-w-2xl leading-relaxed text-balance">
                            Choose a module to get started. SiteSign for gate sign-in and headcount, SitePlan for programme delivery, SiteCapture for daily records, and SiteITP for inspection checklists.
                        </p>
                    </div>
                </div>
            )}

            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Modules</h2>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-200">Live</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {primaryModules.map((m) => (
                        <div key={m.id} className="ring-2 ring-amber-400 rounded-3xl overflow-hidden shadow-lg shadow-amber-900/5">
                            <ModuleCard module={m} />
                        </div>
                    ))}
                </div>
            </section>

            {secondaryModules.length > 0 && (
                <section className="pt-8 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Explore Other Tools</h2>
                            <p className="text-slate-500 font-medium text-sm">Additional tools available for your workspace.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-90">
                        {secondaryModules.map((m) => (
                            <ModuleCard key={m.id} module={m} />
                        ))}
                    </div>
                </section>
            )}

            {roadmapModules.length > 0 && (
                <section className="pt-8 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Coming Soon</h2>
                            <p className="text-slate-500 font-medium text-sm">Modules currently in development for the platform suite.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-75 grayscale hover:grayscale-0 transition-all">
                        {roadmapModules.map((m) => (
                            <ModuleCard key={m.id} module={m} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

