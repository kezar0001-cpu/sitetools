"use client";

import { getLiveModules } from "@/lib/modules";
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
    LayoutDashboard,
    Settings,
    Building2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

type ColorKey = "amber" | "indigo" | "sky" | "violet" | "cyan" | "zinc";

const MODULE_COLORS: Record<ColorKey, { icon: string; hoverBorder: string }> = {
    amber:  { icon: "text-amber-400",  hoverBorder: "hover:border-amber-400/50"  },
    indigo: { icon: "text-indigo-400", hoverBorder: "hover:border-indigo-400/50" },
    sky:    { icon: "text-sky-400",    hoverBorder: "hover:border-sky-400/50"    },
    violet: { icon: "text-violet-400", hoverBorder: "hover:border-violet-400/50" },
    cyan:   { icon: "text-cyan-400",   hoverBorder: "hover:border-cyan-400/50"   },
    zinc:   { icon: "text-zinc-300",   hoverBorder: "hover:border-zinc-500/50"   },
};

function getModuleIcon(moduleId: string, className: string) {
    switch (moduleId) {
        case "site-sign-in": return <ClipboardCheck className={className} />;
        case "planner":      return <CalendarDays className={className} />;
        case "site-capture": return <BookOpen className={className} />;
        case "itp-builder":  return <ListChecks className={className} />;
        case "site-docs":    return <FileText className={className} />;
        case "dashboard":    return <LayoutDashboard className={className} />;
        case "sites-projects": return <Building2 className={className} />;
        case "team": return <Users className={className} />;
        case "settings": return <Settings className={className} />;
        default:             return <ClipboardCheck className={className} />;
    }
}

const STAT_CARDS = [
    { label: "Active Sites",     Icon: MapPin,         iconColor: "text-amber-400"  },
    { label: "On Site Today",    Icon: Users,          iconColor: "text-blue-400"   },
    { label: "Open ITPs",        Icon: ClipboardCheck, iconColor: "text-violet-400" },
    { label: "Photos This Week", Icon: Camera,         iconColor: "text-sky-400"    },
] as const;

function GettingStartedGuide({ isAdmin }: { isAdmin: boolean }) {
    const STEPS = [
        {
            number: "01",
            title: "Create your first site",
            description: "Sites are the foundation. Register a physical location to start tracking attendance, records, and plans.",
            href: "/dashboard/sites",
            icon: <Building2 className="h-5 w-5 text-amber-400" />,
            adminOnly: true,
            cta: "Create site →",
        },
        {
            number: "02",
            title: "Invite your team",
            description: "Add site managers, supervisors, and workers so they can access the modules they need.",
            href: "/dashboard/team",
            icon: <Users className="h-5 w-5 text-sky-400" />,
            adminOnly: false,
            cta: "Invite members →",
        },
        {
            number: "03",
            title: "Open a module",
            description: "SiteSign tracks attendance, SitePlan manages your programme, SiteCapture records daily activity.",
            href: "/dashboard/site-sign-in",
            icon: <ClipboardCheck className="h-5 w-5 text-violet-400" />,
            adminOnly: false,
            cta: "Explore modules →",
        },
    ];

    const visibleSteps = STEPS.filter((s) => isAdmin || !s.adminOnly);

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-8">
            {/* Header */}
            <div className="space-y-3">
                <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full">
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
                        Getting Started
                    </span>
                </div>
                <h2 className="text-2xl font-black text-zinc-50 tracking-tight">
                    Welcome to Buildstate.
                </h2>
                <p className="text-sm text-zinc-400 max-w-lg leading-relaxed">
                    {isAdmin
                        ? "Your workspace is ready. Follow these steps to get your first site operational."
                        : "Your workspace is set up. An admin will create your first site — meanwhile, explore the modules below."}
                </p>
            </div>

            {/* Step cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {visibleSteps.map((step) => (
                    <Link
                        key={step.number}
                        href={step.href}
                        className="group flex flex-col gap-4 bg-zinc-800/50 border border-zinc-700 hover:border-amber-400/40 rounded-xl p-5 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-zinc-600 tabular-nums">{step.number}</span>
                            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
                                {step.icon}
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-zinc-100 mb-1">{step.title}</p>
                            <p className="text-xs text-zinc-500 leading-relaxed">{step.description}</p>
                        </div>
                        <span className="text-xs font-bold text-amber-400 group-hover:underline">
                            {step.cta}
                        </span>
                    </Link>
                ))}
            </div>

            {/* Primary CTA — admin only */}
            {isAdmin && (
                <div className="flex">
                    <Link
                        href="/dashboard/sites"
                        className="inline-flex items-center gap-3 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black px-6 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-400/20"
                    >
                        Create your first site
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function DashboardHome() {
    const { loading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });
    const [sitesLoading, setSitesLoading] = useState(true);
    const [hasSites, setHasSites] = useState<boolean | null>(null);

    const activeCompanyId = summary?.activeMembership?.company_id;
    const userRole = summary?.activeMembership?.role;
    const isAdmin = canManageSites(userRole);

    const userName = summary?.profile?.full_name
        ? summary.profile.full_name.split(" ")[0]
        : summary?.profile?.email?.split("@")[0] ?? "there";
    const companyName = summary?.activeMembership?.companies?.name ?? "";

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
    const quickLaunchModules = getLiveModules().filter((module) => module.id !== "dashboard");

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">

            {/* ── Welcome Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-48 rounded" />
                            <Skeleton className="h-4 w-32 rounded" />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-black text-zinc-50 tracking-tight">
                                Hey, {userName}.
                            </h1>
                            {companyName && (
                                <p className="text-sm text-zinc-500 mt-0.5 font-medium">{companyName}</p>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Stat Cards (returning users with sites) ── */}
            {(isLoading || hasSites) && (
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
            )}

            {/* ── Getting Started (new workspaces only) ── */}
            {!isLoading && !hasSites && (
                <GettingStartedGuide isAdmin={isAdmin} />
            )}

            {/* ── Module Quick-Launch ── */}
            <div className="space-y-4">
                <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest">
                    {!isLoading && !hasSites ? "Explore Modules" : "Quick Launch"}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
