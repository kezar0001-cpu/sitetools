"use client";

import { getPrimaryNavModules, getSecondaryNavModules, type AppModule } from "@/lib/modules";
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
    LogIn,
    LogOut,
    CheckCircle,
    AlertTriangle,
    AlertCircle,
    MessageSquare,
    SearchCheck,
    PenTool,
    Image as ImageIcon,
} from "lucide-react";
import { ModuleLoadingState } from "@/components/loading/ModuleLoadingState";
import { fetchDashboardStats, fetchRecentActivity } from "@/lib/dashboard/client";
import { ActivityFeedItem, ActivityType, DashboardStats } from "@/lib/dashboard/types";

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
    { label: "Active Sites",     Icon: MapPin,         iconColor: "text-amber-400",  key: "activeSites" as const },
    { label: "On Site Today",    Icon: Users,          iconColor: "text-blue-400",   key: "onSiteToday" as const },
    { label: "Open ITPs",        Icon: ClipboardCheck, iconColor: "text-violet-400", key: "openItps" as const },
    { label: "Photos This Week", Icon: Camera,         iconColor: "text-sky-400",    key: "photosThisWeek" as const },
] as const;

function GettingStartedGuide({ isAdmin }: { isAdmin: boolean }) {
    const STEPS = [
        {
            number: "01",
            title: "Create your first project and site",
            description: "Set up a project, then add a physical site where your team will sign in and record activity.",
            href: "/dashboard/sites",
            icon: <Building2 className="h-5 w-5 text-amber-400" />,
            adminOnly: true,
            cta: "Create project and site →",
        },
        {
            number: "02",
            title: "Invite your team",
            description: "Add supervisors, safety officers, and crew to access your connected toolkit.",
            href: "/dashboard/team",
            icon: <Users className="h-5 w-5 text-sky-400" />,
            adminOnly: false,
            cta: "Invite members →",
        },
        {
            number: "03",
            title: "Start with SiteSign",
            description: "Launch QR-based site sign-in with inductions and daily safety briefings.",
            href: "/dashboard/site-sign-in",
            icon: <ClipboardCheck className="h-5 w-5 text-amber-400" />,
            adminOnly: false,
            cta: "Open SiteSign →",
        },
        {
            number: "04",
            title: "Add quality and docs",
            description: "Once SiteSign is running, activate SiteITP and SiteDocs for quality and reporting.",
            href: "/dashboard",
            icon: <ListChecks className="h-5 w-5 text-violet-400" />,
            adminOnly: false,
            cta: "View workflows →",
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
                    {isAdmin ? "Activate your workspace" : "Welcome to your workspace"}
                </h2>
                <p className="text-sm text-zinc-400 max-w-lg leading-relaxed">
                    {isAdmin
                        ? "Complete these steps to set up projects, invite your team, and launch SiteSign."
                        : "An admin is setting up the first project and site. You'll receive access once it's ready."}
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
                        Create your first project and site
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

function getActivityIcon(type: ActivityType) {
    const iconClass = "h-4 w-4";
    switch (type) {
        case "diary_created":
        case "diary_completed":
            return <BookOpen className={`${iconClass} text-sky-400`} />;
        case "photo_uploaded":
            return <ImageIcon className={`${iconClass} text-sky-400`} />;
        case "prestart_submitted":
            return <ClipboardCheck className={`${iconClass} text-emerald-400`} />;
        case "inspection_completed":
            return <SearchCheck className={`${iconClass} text-cyan-400`} />;
        case "incident_reported":
            return <AlertTriangle className={`${iconClass} text-red-400`} />;
        case "toolbox_talk":
            return <MessageSquare className={`${iconClass} text-amber-400`} />;
        case "sign_in":
            return <LogIn className={`${iconClass} text-green-400`} />;
        case "sign_out":
            return <LogOut className={`${iconClass} text-zinc-400`} />;
        case "itp_signed":
            return <PenTool className={`${iconClass} text-violet-400`} />;
        case "defect_reported":
            return <AlertTriangle className={`${iconClass} text-orange-400`} />;
        default:
            return <CheckCircle className={`${iconClass} text-zinc-400`} />;
    }
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function ActivityRow({ activity }: { activity: ActivityFeedItem }) {
    const icon = getActivityIcon(activity.type);

    return (
        <div className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-800/50 transition-colors">
            <div className={`mt-0.5 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">
                    {activity.title}
                </p>
                {activity.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                        {activity.description}
                    </p>
                )}
                {(activity.siteName || activity.projectName) && (
                    <div className="flex items-center gap-2 mt-1.5">
                        {activity.siteName && (
                            <span className="text-xs text-zinc-600 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {activity.siteName}
                            </span>
                        )}
                        {activity.projectName && (
                            <span className="text-xs text-zinc-600">
                                {activity.siteName ? "•" : ""} {activity.projectName}
                            </span>
                        )}
                    </div>
                )}
            </div>
            <span className="text-xs text-zinc-600 shrink-0 tabular-nums">
                {formatRelativeTime(activity.createdAt)}
            </span>
        </div>
    );
}

export default function DashboardHome() {
    const { loading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });
    const [sitesLoading, setSitesLoading] = useState(true);
    const [hasSites, setHasSites] = useState<boolean | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
    const [activitiesError, setActivitiesError] = useState<string | null>(null);
    const [activitiesLoading, setActivitiesLoading] = useState(false);

    const activeCompanyId = summary?.activeMembership?.company_id;
    const userRole = summary?.activeMembership?.role;
    const isAdmin = canManageSites(userRole, summary?.profile?.email);

    const userName = summary?.profile?.full_name
        ? summary.profile.full_name.split(" ")[0]
        : summary?.profile?.email?.split("@")[0] ?? "there";
    const companyName = summary?.activeMembership?.companies?.name ?? "";
    const companyLogo = summary?.activeMembership?.companies?.logo_url;

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

    // Fetch dashboard stats
    useEffect(() => {
        if (!activeCompanyId) return;

        setStatsLoading(true);
        setStatsError(null);
        fetchDashboardStats(activeCompanyId)
            .then(result => {
                if (result.success) {
                    setStats(result.data);
                    setStatsError(null);
                } else {
                    setStatsError(result.error);
                    setStats(null);
                }
            })
            .catch(err => {
                console.error("Failed to fetch dashboard stats", err);
                setStatsError(err instanceof Error ? err.message : "Failed to load statistics");
                setStats(null);
            })
            .finally(() => {
                setStatsLoading(false);
            });
    }, [activeCompanyId]);

    // Fetch recent activity
    useEffect(() => {
        if (!activeCompanyId) return;

        setActivitiesLoading(true);
        setActivitiesError(null);
        fetchRecentActivity(activeCompanyId)
            .then(result => {
                if (result.success) {
                    setActivities(result.data);
                    setActivitiesError(null);
                } else {
                    setActivitiesError(result.error);
                    setActivities([]);
                }
            })
            .catch(err => {
                console.error("Failed to fetch recent activity", err);
                setActivitiesError(err instanceof Error ? err.message : "Failed to load activity");
                setActivities([]);
            })
            .finally(() => {
                setActivitiesLoading(false);
            });
    }, [activeCompanyId]);

    const isLoading = loading || (sitesLoading && hasSites === null);
    const isStatsLoading = statsLoading || loading;
    // Show SiteSign plus all live secondary modules as the connected toolkit
    const quickLaunchModules = [...getPrimaryNavModules(), ...getSecondaryNavModules()].filter(
        (m: AppModule) => m.id !== "planner" && m.id !== "dashboard",
    );

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">

            {/* ── Welcome Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    {isLoading ? (
                        <ModuleLoadingState variant="skeleton" count={2} className="max-w-xs" />
                    ) : (
                        <div className="flex items-center gap-3">
                            {companyLogo && (
                                <img
                                    src={companyLogo}
                                    alt={`${companyName} logo`}
                                    className="w-12 h-12 rounded-xl object-contain border border-zinc-700 bg-white"
                                />
                            )}
                            <div>
                                <h1 className="text-2xl font-black text-zinc-50 tracking-tight">
                                    Hey, {userName}.
                                </h1>
                                {companyName && (
                                    <p className="text-sm text-zinc-500 mt-0.5 font-medium">{companyName}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Stat Cards (returning users with sites) ── */}
            {(isLoading || hasSites) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {STAT_CARDS.map(({ label, Icon, iconColor, key }) => (
                        <div
                            key={label}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3"
                        >
                            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                                <Icon className={`h-5 w-5 ${iconColor}`} />
                            </div>
                            {isStatsLoading ? (
                                <div className="space-y-2">
                                    <div className="h-8 w-14 rounded bg-zinc-800 animate-pulse" />
                                    <div className="h-3 w-24 rounded bg-zinc-800 animate-pulse" />
                                </div>
                            ) : statsError ? (
                                <div>
                                    <div className="flex items-center gap-1.5 text-red-400">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="text-xs font-semibold">Error</span>
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mt-1">
                                        {label}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-3xl font-black text-zinc-50">
                                        {stats?.[key] ?? 0}
                                    </p>
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
                    Site Operations
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickLaunchModules.map((module: AppModule) => {
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
                {isLoading || activitiesLoading ? (
                    <ModuleLoadingState variant="skeleton" count={5} />
                ) : activitiesError ? (
                    <div className="px-6 py-10 text-center">
                        <div className="inline-flex items-center gap-2 text-red-400 mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Unable to load activity</span>
                        </div>
                        <p className="text-xs text-zinc-600">{activitiesError}</p>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                        <p className="text-zinc-500 text-sm font-medium">No recent activity yet</p>
                        <p className="text-zinc-600 text-xs mt-1">Activity appears as your team uses SiteSign, SiteITP, and other site tools.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800">
                        {activities.map((activity) => (
                            <ActivityRow key={activity.id} activity={activity} />
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
