/**
 * Module Registry — single source of truth for all Buildstate modules.
 * Used by both the marketing site and the logged-in dashboard.
 */

export type ModuleStatus = "live" | "coming-soon" | "beta";
export type ModuleId =
    | "planner"
    | "site-sign-in"
    | "site-diary"
    | "itp-builder"
    | "inspections"
    | "plant-checks"
    | "incidents"
    | "timesheets"
    | "site-docs";

export type ModuleVisibility = "primary" | "secondary" | "roadmap" | "internal";

export interface BuildstateModule {
    id: ModuleId;
    name: string;
    tagline: string;
    description: string;
    icon: string; // Matches the icon key used in the UI
    status: ModuleStatus;
    visibility: ModuleVisibility;
    href: string;
    color: string; // Tailwind color family name
}

export const MODULES: BuildstateModule[] = [
    {
        id: "site-sign-in",
        name: "SiteSign",
        tagline: "QR-based sign in & out for every worker on site",
        description:
            "Digital sign-in sheets for construction sites. Workers scan a QR code, sign in on their phone, and you get a real-time site register with CSV/Excel/PDF exports and WhatsApp checkout reminders.",
        icon: "clipboard-check",
        status: "live",
        visibility: "primary",
        href: "/dashboard/site-sign-in",
        color: "amber",
    },
    {
        id: "planner",
        name: "SitePlan",
        tagline: "Project planning, programme tracking, and daily delivery for civil teams",
        description:
            "Build practical civil programmes, track progress daily, manage delays, and keep site delivery aligned with planned dates.",
        icon: "list-checks",
        status: "live",
        visibility: "primary",
        href: "/site-plan",
        color: "indigo",
    },
    {
        id: "site-diary",
        name: "Site Diary",
        tagline: "Daily records for weather, progress, and site events",
        description:
            "Record weather conditions, work completed, delays, instructions, and site photos. Generate professional daily reports for your principal contractor.",
        icon: "book-open",
        status: "live",
        visibility: "primary",
        href: "/dashboard/site-capture",
        color: "sky",
    },
    {
        id: "itp-builder",
        name: "SiteITP",
        tagline: "Hold & witness point checklists — AI-generated or built manually",
        description:
            "Create ITP checklists your way: let AI generate items from a task description, or build them manually with custom hold and witness points. Assign to a project and site, then share QR codes for sign-off — no app, no account required.",
        icon: "list-checks",
        status: "live",
        visibility: "primary",
        href: "/site-itp",
        color: "violet",
    },
    {
        id: "inspections",
        name: "Daily Inspections",
        tagline: "Pre-start checks and quality inspections on the go",
        description:
            "Run daily pre-start checklists, quality inspections, and environmental checks from your phone. Attach photos and generate reports instantly.",
        icon: "search-check",
        status: "coming-soon",
        visibility: "roadmap",
        href: "/dashboard/inspections",
        color: "emerald",
    },
    {
        id: "plant-checks",
        name: "Plant & Equipment",
        tagline: "Pre-start plant inspections and compliance tracking",
        description:
            "Digital pre-start checklists for excavators, trucks, cranes, and all site plant. Track compliance, flag defects, and maintain audit trails.",
        icon: "truck",
        status: "coming-soon",
        visibility: "roadmap",
        href: "/dashboard/plant-checks",
        color: "orange",
    },
    {
        id: "incidents",
        name: "Incident Reports",
        tagline: "Report, investigate, and close out site incidents",
        description:
            "Capture near-misses, injuries, and property damage on site. Attach photos, assign corrective actions, and generate reports for your safety team.",
        icon: "alert-triangle",
        status: "coming-soon",
        visibility: "roadmap",
        href: "/dashboard/incidents",
        color: "red",
    },
    {
        id: "site-docs",
        name: "SiteDocs",
        tagline: "Convert text summaries into professional documents",
        description:
            "Paste your informal notes and let AI structure them into professional meeting minutes, incident reports, corrective action reports, and more. Export to PDF or Word.",
        icon: "file-text",
        status: "live",
        visibility: "primary",
        href: "/dashboard/site-docs",
        color: "cyan",
    },
];

export function getModule(id: string): BuildstateModule | undefined {
    return MODULES.find((m) => m.id === id);
}

export function getLiveModules(): BuildstateModule[] {
    return MODULES.filter((m) => m.status === "live");
}

export function getComingSoonModules(): BuildstateModule[] {
    return MODULES.filter((m) => m.status === "coming-soon");
}

export function getPrimaryNavModules(): BuildstateModule[] {
    const isPrimaryEnabled = process.env.NEXT_PUBLIC_SITESIGN_PRIMARY !== "false";
    return MODULES.filter((m) => {
        if (!isPrimaryEnabled) return m.status === "live"; // fallback to standard view
        return m.visibility === "primary";
    });
}

export function getSecondaryNavModules(): BuildstateModule[] {
    const isPlannerEnabled = process.env.NEXT_PUBLIC_SHOW_PLANNER_PRIMARY === "true";
    return MODULES.filter((m) => {
        if (m.visibility === "primary") return false;
        if (m.id === "planner" && !isPlannerEnabled) return false;
        return m.visibility === "secondary";
    });
}

export function getRoadmapModules(): BuildstateModule[] {
    const isRoadmapEnabled = process.env.NEXT_PUBLIC_SHOW_ROADMAP_MODULES !== "false";
    if (!isRoadmapEnabled) return [];
    return MODULES.filter((m) => m.visibility === "roadmap");
}
