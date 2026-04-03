/**
 * Marketing Module Registry — single source of truth for public-facing module metadata.
 * Used by homepage, pricing, module pages, and dashboard marketing surfaces.
 * Framework-agnostic: no JSX, icon names only as strings.
 */

export type ModuleStatus = "live" | "beta" | "coming-soon";
export type ModuleColor = "amber" | "blue" | "sky" | "violet" | "emerald" | "orange";

export interface MarketingModule {
    id: string;
    name: string;
    tagline: string;
    description: string;
    color: ModuleColor;
    status: ModuleStatus;
    href: string;
    features: string[];
    icon: string; // Lucide icon name only
    beforeState: string;
    afterState: string;
}

export const MARKETING_MODULES: MarketingModule[] = [
    {
        id: "sitesign",
        name: "SiteSign",
        tagline: "Know exactly who's on your site, right now",
        description:
            "Replace paper sign-in sheets with QR codes workers scan from their phones. Get instant headcounts, emergency muster reports, and full site history without chasing paper.",
        color: "amber",
        status: "live",
        href: "/sitesign",
        features: ["QR code sign-in", "Real-time register", "Emergency exports", "WhatsApp reminders"],
        icon: "clipboard-check",
        beforeState:
            "Supervisors waste 20 minutes every morning tracking down who's actually on site, and another 20 at knock-off reconciling paper sheets.",
        afterState:
            "Open your phone and see every worker, subcontractor, and visitor on site right now—with automatic checkout reminders and instant emergency lists.",
    },
    {
        id: "siteplan",
        name: "SitePlan",
        tagline: "Build programmes that actually match your delivery",
        description:
            "Plan civil programmes with realistic durations, track daily progress against planned dates, and catch delays before they blow out your contract milestones.",
        color: "blue",
        status: "live",
        href: "/siteplan",
        features: ["Gantt programmes", "Progress tracking", "Delay logging", "Weather records"],
        icon: "calendar-days",
        beforeState:
            "PMs update Excel programmes once a week if they're lucky, and site crews work from outdated whiteboards that don't reflect rain days or equipment breakdowns.",
        afterState:
            "Supervisors update task progress on their phones daily, and PMs see exactly where the programme slipped before it threatens next week's pour.",
    },
    {
        id: "sitecapture",
        name: "SiteCapture",
        tagline: "Capture everything that happens on site—one form at a time",
        description:
            "SiteCapture is an immersive form system to capture everything that happens on site. Start with the daily diary form for weather, work, delays, and photos. More capture forms coming for inspections, incidents, and quality records.",
        color: "sky",
        status: "live",
        href: "/sitecapture",
        features: ["Daily diary form", "Progress photos", "GPS tagging", "Weather logging", "E1A exports"],
        icon: "book-open",
        beforeState:
            "Supervisors juggle paper diaries, WhatsApp updates, and scattered photos—nothing connects and nothing's defensible when the variation claim lands.",
        afterState:
            "One capture system for daily records, progress photos, and site events. Everything GPS-tagged, timestamped, and export-ready for your PC or lawyer.",
    },
    {
        id: "siteitp",
        name: "SiteITP",
        tagline: "Hold points signed off without the paperwork chase",
        description:
            "Build ITP checklists with AI or from scratch, assign hold and witness points to specific tasks, and let subcontractors sign off via QR code—no apps, no accounts.",
        color: "violet",
        status: "live",
        href: "/siteitp",
        features: ["AI checklist builder", "Hold & witness points", "QR sign-off", "ITP exports"],
        icon: "list-checks",
        beforeState:
            "Quality checklists get written from scratch for every job, and chasing engineers to sign hold points delays pours while concrete trucks queue.",
        afterState:
            "Generate ITPs from your scope in minutes, and engineers sign hold points on their phones—no apps, no chasing, concrete pour stays on schedule.",
    },
    {
        id: "sitedocs",
        name: "SiteDocs",
        tagline: "Turn rough notes into professional site documents",
        description:
            "Paste informal meeting minutes or incident summaries and let AI structure them into professional reports. Export to PDF or Word for your principal contractor.",
        color: "orange",
        status: "live",
        href: "/sitedocs",
        features: ["AI document writer", "Meeting minutes", "Incident reports", "PDF export"],
        icon: "file-text",
        beforeState:
            "Supervisors spend their evenings typing up meeting minutes and incident reports from scratch because there's no one else to do it.",
        afterState:
            "Dictate rough notes on the drive home and get a professional, formatted report ready to send to the PM before you walk in the door.",
    },
];

export function getMarketingModule(id: string): MarketingModule | undefined {
    return MARKETING_MODULES.find((m) => m.id === id);
}

export function getLiveMarketingModules(): MarketingModule[] {
    return MARKETING_MODULES.filter((m) => m.status === "live");
}

export function getModulesByStatus(status: ModuleStatus): MarketingModule[] {
    return MARKETING_MODULES.filter((m) => m.status === status);
}

export function getModulesByColor(color: ModuleColor): MarketingModule[] {
    return MARKETING_MODULES.filter((m) => m.color === color);
}
