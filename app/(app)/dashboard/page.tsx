"use client";

import { getPrimaryNavModules } from "@/lib/modules";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { useEffect, useState } from "react";
import { fetchCompanySites } from "@/lib/workspace/client";
import { canManageSites } from "@/lib/workspace/permissions";
import Link from "next/link";
import {
    MapPin,
    Users,
    ClipboardCheck,
    Camera,
    BookOpen,
    CalendarDays,
    FileText,
    ListChecks,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

type ColorKey = "amber" | "indigo" | "sky" | "violet" | "cyan";

const MODULE_COLORS: Record<ColorKey, { icon: string; hoverBorder: string }> = {
    amber:  { icon: "text-amber-400",  hoverBorder: "hover:border-amber-400/50"  },
    indigo: { icon: "text-indigo-400", hoverBorder: "hover:border-indigo-400/50" },
    sky:    { icon: "text-sky-400",    hoverBorder: "hover:border-sky-400/50"    },
    violet: { icon: "text-violet-400", hoverBorder: "hover:border-violet-400/50" },
    cyan:   { icon: "text-cyan-400",   hoverBorder: "hover:border-cyan-400/50"   },
};

function getModuleIcon(moduleId: string, className: string) {
    switch (moduleId) {
        case "site-sign-in": return <ClipboardCheck className={className} />;
        case "planner":      return <CalendarDays className={className} />;
        case "site-capture": return <BookOpen className={className} />;
        case "itp-builder":  return <ListChecks className={className} />;
        case "site-docs":    return <FileText className={className} />;
        default:             return <ClipboardCheck className={className} />;
    }
}

const STAT_CARDS = [
    { label: "Active Sites",     Icon: MapPin,         iconColor: "text-amber-400"  },
    { label: "On Site Today",    Icon: Users,          iconColor: "text-blue-400"   },
    { label: "Open ITPs",        Icon: ClipboardCheck, iconColor: "text-violet-400" },
    { label: "Photos This Week", Icon: Camera,         iconColor: "text-sky-400"    },
] as const;

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

    const isLoading = loading || (sitesLoading && hasSites === null);
    const primaryModules = getPrimaryNavModules();
    const quickLaunchModules = primaryModules.slice(0, 4);

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {STAT_CARDS.map(({ label, Icon, iconColor }) => (
                    <div
                        key={label}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3"
                    >
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                            <Icon className={`h-5 w-5 ${iconColor}`} />
                        </div>
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-14 rounded" />
                                <Skeleton className="h-3 w-24 rounded" />
                            </div>
                        ) : (
                            <div>
                                <p className="text-3xl font-black text-zinc-50">–</p>
                                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mt-1">
                                    {label}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Empty-state banner (admin, no sites yet) ── */}
            {!isLoading && !hasSites && isAdmin && (
                <div className="bg-zinc-900 border border-amber-400/20 rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none">
                        <svg
                            className="h-full w-full text-zinc-400"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <pattern id="dashGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M0 40V0H40V40z" fill="none" stroke="currentColor" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#dashGrid)" />
                        </svg>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-1 space-y-3">
                            <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full">
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                                <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
                                    Setup Required
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-zinc-50 tracking-tight">
                                Your workspace is{" "}
                                <span className="text-amber-400">waiting.</span>
                            </h2>
                            <p className="text-zinc-400 text-sm font-medium max-w-lg leading-relaxed">
                                Buildstate is site-first. Register your first physical site to start
                                tracking workforce occupancy, building project plans, and recording
                                daily progress.
                            </p>
                        </div>
                        <Link
                            href="/dashboard/sites"
                            className="inline-flex items-center gap-3 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black px-6 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 shrink-0 shadow-lg shadow-amber-400/20"
                        >
                            Create your first site
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            )}

            {/* ── Module Quick-Launch 2 × 2 ── */}
            <div className="grid grid-cols-2 gap-4">
                {quickLaunchModules.map((module) => {
                    const colors = MODULE_COLORS[module.color as ColorKey] ?? MODULE_COLORS.amber;
                    return (
                        <Link
                            key={module.id}
                            href={module.href}
                            className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:bg-zinc-800/50 ${colors.hoverBorder} transition-all cursor-pointer block`}
                        >
                            <div className="mb-4">
                                {getModuleIcon(module.id, `h-8 w-8 ${colors.icon}`)}
                            </div>
                            <p className="text-base font-black text-zinc-50 mb-1">{module.name}</p>
                            <p className="text-sm text-zinc-400 line-clamp-1">{module.tagline}</p>
                        </Link>
                    );
                })}
            </div>

            {/* ── Recent Activity Feed ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800">
                    <h2 className="text-base font-black text-zinc-50">Recent Activity</h2>
                </div>
                {isLoading ? (
                    <div className="divide-y divide-zinc-800">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4">
                                <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                                <Skeleton className="h-4 flex-1 rounded" />
                                <Skeleton className="h-3 w-16 rounded" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="px-6 py-10 text-center">
                        <p className="text-zinc-500 text-sm font-medium">No recent activity yet</p>
                    </div>
                )}
            </div>

        </div>
    );
}
