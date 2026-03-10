import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIcon } from "@/components/icons/getIcon";
import { MODULES, getModule } from "@/lib/modules";
import { getPublicMediaSlot } from "@/lib/publicSiteMedia";

type WorkflowStep = {
    title: string;
    description: string;
};

type RoiPoint = {
    title: string;
    detail: string;
};

type LiveLandingContent = {
    badge: string;
    heroTitle: string;
    heroSummary: string;
    personaLabel: string;
    personaTitle: string;
    personaSummary: string;
    workflowTitle: string;
    workflowSummary: string;
    workflowSteps: WorkflowStep[];
    roiTitle: string;
    roiSummary: string;
    roiPoints: RoiPoint[];
    primaryCtaLabel: string;
    mediaSlots: Array<keyof ReturnType<typeof getMediaSlots>>;
};

function getMediaSlots() {
    return {
        siteSignHero: getPublicMediaSlot("siteSignHero"),
        sitePlanWorkflow: getPublicMediaSlot("sitePlanWorkflow"),
        workspaceApps: getPublicMediaSlot("workspaceApps"),
    };
}

const LIVE_LANDING_CONTENT: Record<string, LiveLandingContent> = {
    "site-sign-in": {
        badge: "SiteSign | Workforce attendance",
        heroTitle: "Get every worker signed in within minutes at project entry.",
        heroSummary:
            "Designed for supervisors and leading hands who need reliable attendance records without paper sheets. SiteSign turns QR scans into live workforce visibility.",
        personaLabel: "Best for",
        personaTitle: "Supervisors running busy civil site access points",
        personaSummary:
            "Run consistent onboarding at the gate, verify who is on site right now, and support compliance conversations with one clean digital register.",
        workflowTitle: "Attendance workflow from gate to report",
        workflowSummary:
            "SiteSign keeps the field process simple while preserving audit-ready records inside your shared Buildstate workspace.",
        workflowSteps: [
            {
                title: "Share your site QR sign-in",
                description: "Place one QR at each access point and workers sign in from their own phone in seconds.",
            },
            {
                title: "Track site occupancy live",
                description: "Supervisors can instantly see active workers, sign-out gaps, and who still needs follow-up.",
            },
            {
                title: "Export records for payroll and compliance",
                description: "Download CSV, Excel, or PDF attendance records without manual cleanup.",
            },
        ],
        roiTitle: "ROI and value drivers",
        roiSummary: "Replace manual sign-in administration with a repeatable process that improves supervision quality.",
        roiPoints: [
            {
                title: "Cut paper-chasing time",
                detail: "Less admin before toolbox talks and fewer end-of-day register cleanups.",
            },
            {
                title: "Reduce attendance disputes",
                detail: "Timestamped digital entries improve confidence in who was onsite and when.",
            },
            {
                title: "Improve compliance readiness",
                detail: "Keep attendance records stored with site context inside `/dashboard/site-sign-in`.",
            },
        ],
        primaryCtaLabel: "Start free for Site Sign In",
        mediaSlots: ["siteSignHero", "workspaceApps"],
    },
    planner: {
        badge: "SitePlan | Project controls",
        heroTitle: "Turn your programme into a daily delivery system for crews.",
        heroSummary:
            "Built for project engineers and delivery leads who need practical planning control. SitePlan keeps your baseline, daily progress, and milestones connected.",
        personaLabel: "Best for",
        personaTitle: "Engineers and PMs managing programme certainty",
        personaSummary:
            "Move from disconnected spreadsheets to one planning workspace where schedule updates, dependencies, and critical milestones stay visible.",
        workflowTitle: "Planning workflow from setup to progress tracking",
        workflowSummary:
            "SitePlan supports the full cycle from initial plan creation through ongoing day-to-day delivery checks.",
        workflowSteps: [
            {
                title: "Build or import a practical programme",
                description: "Set dates, dependencies, and owners so field and office teams work from one source of truth.",
            },
            {
                title: "Track progress against milestones",
                description: "Review delays early and keep forward visibility on what needs action this week.",
            },
            {
                title: "Share dashboard views for decision making",
                description: "Use `/dashboard/planner` views to align engineers, supervisors, and leadership on delivery status.",
            },
        ],
        roiTitle: "ROI and value drivers",
        roiSummary: "Create a faster planning rhythm with less rework and clearer delivery communication.",
        roiPoints: [
            {
                title: "Fewer planning blind spots",
                detail: "Milestone and dependency visibility helps teams surface risk earlier.",
            },
            {
                title: "Less version confusion",
                detail: "One shared workspace replaces scattered programme files and side spreadsheets.",
            },
            {
                title: "Stronger weekly coordination",
                detail: "Clear status views support faster planning meetings and practical action tracking.",
            },
        ],
        primaryCtaLabel: "Start free for Planner",
        mediaSlots: ["sitePlanWorkflow", "workspaceApps"],
    },
};

export function generateStaticParams() {
    return MODULES.map((module) => ({ moduleId: module.id }));
}

export default function ToolDetailPage({ params }: { params: { moduleId: string } }) {
    const moduleItem = getModule(params.moduleId);

    if (!moduleItem) {
        notFound();
    }

    const isLive = moduleItem.status === "live";
    const liveContent = isLive ? LIVE_LANDING_CONTENT[moduleItem.id] : null;

    if (isLive && liveContent) {
        const mediaSlots = getMediaSlots();

        return (
            <div className="bg-slate-50 min-h-full py-12">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                    <Link href="/workspace" className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Back to workspace overview</Link>

                    <section className="rounded-3xl bg-slate-950 text-white overflow-hidden border border-slate-900">
                        <div className="grid lg:grid-cols-2 gap-0">
                            <div className="p-8 md:p-10 space-y-5">
                                <p className="text-xs uppercase tracking-[0.2em] font-bold text-amber-300">{liveContent.badge}</p>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">{liveContent.heroTitle}</h1>
                                <p className="text-slate-300 text-lg">{liveContent.heroSummary}</p>

                                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 space-y-2">
                                    <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">{liveContent.personaLabel}</p>
                                    <p className="text-xl font-bold text-white">{liveContent.personaTitle}</p>
                                    <p className="text-slate-300">{liveContent.personaSummary}</p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <Link href={moduleItem.id === "planner" ? "/login?signup=1&intent=siteplan" : "/login?signup=1&intent=sitesign"} className="px-5 py-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl">
                                        {liveContent.primaryCtaLabel}
                                    </Link>
                                    <Link href={moduleItem.href} className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-white font-semibold rounded-xl">
                                        Open {moduleItem.name}
                                    </Link>
                                </div>
                            </div>

                            <div className="bg-slate-900 border-l border-slate-800">
                                <Image
                                    src={mediaSlots[liveContent.mediaSlots[0]].src}
                                    alt={mediaSlots[liveContent.mediaSlots[0]].alt}
                                    width={mediaSlots[liveContent.mediaSlots[0]].width}
                                    height={mediaSlots[liveContent.mediaSlots[0]].height}
                                    className="w-full h-full object-cover min-h-[320px]"
                                    priority
                                />
                            </div>
                        </div>
                    </section>

                    <section className="grid lg:grid-cols-2 gap-6">
                        <article className="bg-white rounded-2xl border border-slate-200 p-7 space-y-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">{liveContent.workflowTitle}</h2>
                                <p className="text-slate-600 mt-2">{liveContent.workflowSummary}</p>
                            </div>
                            <ol className="space-y-4">
                                {liveContent.workflowSteps.map((step, idx) => (
                                    <li key={step.title} className="flex gap-3">
                                        <span className="h-7 w-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                                        <div>
                                            <p className="font-semibold text-slate-900">{step.title}</p>
                                            <p className="text-sm text-slate-600">{step.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </article>

                        <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <Image
                                src={mediaSlots[liveContent.mediaSlots[1]].src}
                                alt={mediaSlots[liveContent.mediaSlots[1]].alt}
                                width={mediaSlots[liveContent.mediaSlots[1]].width}
                                height={mediaSlots[liveContent.mediaSlots[1]].height}
                                className="w-full h-56 object-cover"
                            />
                            <div className="p-7 space-y-4">
                                <h2 className="text-2xl font-black text-slate-900">{liveContent.roiTitle}</h2>
                                <p className="text-slate-600">{liveContent.roiSummary}</p>
                                <ul className="space-y-3">
                                    {liveContent.roiPoints.map((point) => (
                                        <li key={point.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="font-semibold text-slate-900">{point.title}</p>
                                            <p className="text-sm text-slate-600 mt-1">{point.detail}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </article>
                    </section>

                    <section className="bg-white rounded-2xl border border-slate-200 p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="max-w-3xl">
                            <h2 className="text-2xl font-black text-slate-900">Single login, shared workspace architecture</h2>
                            <p className="text-slate-600 mt-2">
                                Keep one auth path at <span className="font-mono text-slate-800">/login</span>, then route teams through
                                product workspaces under <span className="font-mono text-slate-800">/dashboard/site-sign-in</span> and <span className="font-mono text-slate-800">/dashboard/planner</span> for consistent onboarding and easier campaign targeting.
                            </p>
                        </div>
                        <Link href={moduleItem.id === "planner" ? "/login?intent=siteplan" : "/login?intent=sitesign"} className="px-5 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-center whitespace-nowrap">
                            {liveContent.primaryCtaLabel}
                        </Link>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-full py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <Link href="/workspace" className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Back to workspace overview</Link>

                <section className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                                {getIcon(moduleItem.icon, "h-5 w-5")}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-widest text-slate-500">Workspace tool</p>
                                <h1 className="text-3xl font-black tracking-tight text-slate-900">{moduleItem.name}</h1>
                            </div>
                        </div>
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                isLive ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                        >
                            {isLive ? "Workspace" : "Planned"}
                        </span>
                    </div>

                    <p className="text-slate-700 text-lg">{moduleItem.tagline}</p>
                    <p className="text-slate-600">{moduleItem.description}</p>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
                        <h2 className="font-bold text-slate-900 mb-2">How it fits into delivery workflows</h2>
                        <p className="text-sm text-slate-600">
                            This tool is designed for workspace use, so teams can save records and keep account, organisation, project, and site context connected.
                        </p>
                    </div>

                    <Link href="/dashboard/site-sign-in" className="inline-flex px-5 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl">
                        Open SiteSign workspace
                    </Link>
                </section>
            </div>
        </div>
    );
}
