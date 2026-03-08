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
    | "timesheets";

export interface BuildstateModule {
    id: ModuleId;
    name: string;
    tagline: string;
    description: string;
    icon: string; // Matches the icon key used in the UI
    status: ModuleStatus;
    href: string;
    color: string; // Tailwind color family name
}

export const MODULES: BuildstateModule[] = [
    {
        id: "planner",
        name: "SitePlan",
        tagline: "Project planning, programme tracking, and daily delivery for civil teams",
        description:
            "Build practical civil programmes, track progress daily, manage delays, and keep site delivery aligned with planned dates.",
        icon: "list-checks",
        status: "live",
        href: "/dashboard/planner",
        color: "indigo",
    },
    {
        id: "site-sign-in",
        name: "SiteSign",
        tagline: "QR-based sign in & out for every worker on site",
        description:
            "Digital sign-in sheets for construction sites. Workers scan a QR code, sign in on their phone, and you get a real-time site register with CSV/Excel/PDF exports and WhatsApp checkout reminders.",
        icon: "clipboard-check",
        status: "live",
        href: "/dashboard/site-sign-in",
        color: "amber",
    },
    {
        id: "site-diary",
        name: "Site Diary",
        tagline: "Daily records for weather, progress, and site events",
        description:
            "Record weather conditions, work completed, delays, instructions, and site photos. Generate professional daily reports for your principal contractor.",
        icon: "book-open",
        status: "coming-soon",
        href: "/dashboard/site-diary",
        color: "sky",
    },
    {
        id: "itp-builder",
        name: "ITP Builder",
        tagline: "Inspection & test plans, built for civil works",
        description:
            "Create, manage, and track inspection and test plans across your projects. Assign hold/witness points and capture sign-offs digitally.",
        icon: "list-checks",
        status: "coming-soon",
        href: "/dashboard/itp-builder",
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
        href: "/dashboard/incidents",
        color: "red",
    },
    {
        id: "timesheets",
        name: "Labour & Timesheets",
        tagline: "Track hours, dockets, and labour costs across crews",
        description:
            "Record daily labour hours by crew and task. Generate timesheet summaries, track day-work dockets, and export for payroll or cost reporting.",
        icon: "clock",
        status: "coming-soon",
        href: "/dashboard/timesheets",
        color: "teal",
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
