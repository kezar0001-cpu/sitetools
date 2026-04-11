/**
 * Single source of truth for Buildstate modules.
 *
 * This registry powers:
 * - public module discovery / landing ordering
 * - dashboard navigation helpers
 * - module lookup by slug
 */

export type ModuleStatus = "live" | "coming-soon" | "beta";
export type ModuleVisibility = "primary" | "secondary" | "roadmap" | "internal";

export type ModuleId =
  | "site-sign-in"
  | "planner"
  | "site-capture"
  | "itp-builder"
  | "site-docs"
  | "dashboard"
  | "sites-projects"
  | "team"
  | "settings"
  | "inspections"
  | "plant-checks"
  | "incidents"
  | "timesheets";

export type ModuleSlug =
  | "sitesign"
  | "siteplan"
  | "sitecapture"
  | "siteitp"
  | "sitedocs"
  | "dashboard"
  | "sites-projects"
  | "team"
  | "settings";

export type ModuleColor =
  | "amber"
  | "indigo"
  | "sky"
  | "violet"
  | "cyan"
  | "zinc"
  | "emerald"
  | "orange"
  | "red";

export type ModuleDemoType = "video" | "interactive" | "workflow" | "none";

export interface AppModule {
  id: ModuleId;
  slug: ModuleSlug;
  name: string;
  route: string;
  shortDescription: string;
  moduleColor: ModuleColor;
  publicVisible: boolean;
  landingOrder: number;
  demoType: ModuleDemoType;
  featureBullets: string[];

  // Legacy navigation compatibility fields
  tagline: string;
  description: string;
  icon: string;
  status: ModuleStatus;
  visibility: ModuleVisibility;
  href: string;
  color: string;
}

const CORE_MODULES: AppModule[] = [
  {
    id: "site-sign-in",
    slug: "sitesign",
    name: "SiteSign",
    route: "/dashboard/site-sign-in",
    shortDescription: "QR-based worker sign-in and sign-out with live site headcount.",
    moduleColor: "amber",
    publicVisible: true,
    landingOrder: 1,
    demoType: "video",
    featureBullets: [
      "QR gate sign-in from any phone",
      "Live on-site attendance register",
      "CSV/Excel/PDF compliance exports",
    ],
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
    slug: "siteplan",
    name: "SitePlan",
    route: "/site-plan",
    shortDescription: "Programme planning, task tracking, and delay visibility for delivery teams.",
    moduleColor: "indigo",
    publicVisible: true,
    landingOrder: 2,
    demoType: "interactive",
    featureBullets: [
      "Project programme + milestones",
      "Progress tracking with delay flags",
      "Gantt and summary views",
    ],
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
    id: "site-capture",
    slug: "sitecapture",
    name: "SiteCapture",
    route: "/dashboard/site-capture",
    shortDescription: "Daily field records, forms, and site activity capture in one workspace.",
    moduleColor: "sky",
    publicVisible: true,
    landingOrder: 3,
    demoType: "workflow",
    featureBullets: [
      "Daily diary, toolbox, induction, incident flows",
      "Project/site grouped entry management",
      "Media-rich records and export-ready logs",
    ],
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
    slug: "siteitp",
    name: "SiteITP",
    route: "/site-itp",
    shortDescription: "Create and manage ITPs with hold/witness sign-off workflows.",
    moduleColor: "violet",
    publicVisible: true,
    landingOrder: 4,
    demoType: "interactive",
    featureBullets: [
      "AI-generated or manual ITP item creation",
      "Hold and witness point tracking",
      "QR sign-off without app install",
    ],
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
    id: "site-docs",
    slug: "sitedocs",
    name: "SiteDocs",
    route: "/dashboard/site-docs",
    shortDescription: "Turn field notes into structured construction documents.",
    moduleColor: "cyan",
    publicVisible: true,
    landingOrder: 5,
    demoType: "workflow",
    featureBullets: [
      "Template-driven document generation",
      "AI-assisted note-to-document conversion",
      "Exportable professional outputs",
    ],
    tagline: "Convert text summaries into professional documents",
    description:
      "Paste your informal notes and let AI structure them into professional meeting minutes, incident reports, corrective action reports, and more. Export to PDF or Word.",
    icon: "file-text",
    status: "live",
    visibility: "primary",
    href: "/dashboard/site-docs",
    color: "cyan",
  },
  {
    id: "dashboard",
    slug: "dashboard",
    name: "Dashboard",
    route: "/dashboard",
    shortDescription: "Workspace overview for activity, module launch, and setup status.",
    moduleColor: "zinc",
    publicVisible: false,
    landingOrder: 999,
    demoType: "none",
    featureBullets: [
      "Workspace KPI card shell",
      "Quick-launch module cards",
      "Company setup prompts",
    ],
    tagline: "Company-wide operational overview",
    description: "Workspace home for team activity, quick module launch, and setup actions.",
    icon: "layout-dashboard",
    status: "live",
    visibility: "internal",
    href: "/dashboard",
    color: "zinc",
  },
  {
    id: "sites-projects",
    slug: "sites-projects",
    name: "Sites / Projects",
    route: "/dashboard/sites",
    shortDescription: "Manage physical sites, assign them to projects, and set active context.",
    moduleColor: "zinc",
    publicVisible: false,
    landingOrder: 999,
    demoType: "none",
    featureBullets: [
      "Create and edit sites",
      "Assign/move sites between projects",
      "Archive/restore and set active site",
    ],
    tagline: "Site and project structure management",
    description: "Configure sites and project allocation for daily operations.",
    icon: "building-2",
    status: "live",
    visibility: "internal",
    href: "/dashboard/sites",
    color: "zinc",
  },
  {
    id: "team",
    slug: "team",
    name: "Team",
    route: "/dashboard/team",
    shortDescription: "Invite users, assign roles, and manage company membership.",
    moduleColor: "zinc",
    publicVisible: false,
    landingOrder: 999,
    demoType: "none",
    featureBullets: [
      "Team member role management",
      "Invitation issuance and tracking",
      "Member removal controls",
    ],
    tagline: "Company user and role management",
    description: "Manage team access, invitations, and permissions.",
    icon: "users",
    status: "live",
    visibility: "internal",
    href: "/dashboard/team",
    color: "zinc",
  },
  {
    id: "settings",
    slug: "settings",
    name: "Settings",
    route: "/dashboard/settings",
    shortDescription: "Company profile, personal profile, and account-level controls.",
    moduleColor: "zinc",
    publicVisible: false,
    landingOrder: 999,
    demoType: "none",
    featureBullets: [
      "Company profile updates",
      "Personal profile updates",
      "Danger-zone company deletion",
    ],
    tagline: "Workspace and account configuration",
    description: "Manage company profile, personal profile, and account-level settings.",
    icon: "settings",
    status: "live",
    visibility: "internal",
    href: "/dashboard/settings",
    color: "zinc",
  },
];

// Optional roadmap modules (kept for compatibility with existing sidebar sections).
const ROADMAP_MODULES: AppModule[] = [
  {
    id: "inspections",
    slug: "sitecapture",
    name: "Daily Inspections",
    route: "/dashboard/inspections",
    shortDescription: "Planned inspection workflows for prestart and quality checks.",
    moduleColor: "emerald",
    publicVisible: false,
    landingOrder: 999,
    demoType: "none",
    featureBullets: ["Planned module"],
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
    slug: "sitecapture",
    name: "Plant & Equipment",
    route: "/dashboard/plant-checks",
    shortDescription: "Planned plant compliance and prestart module.",
    moduleColor: "orange",
    publicVisible: false,
    landingOrder: 999,
    demoType: "none",
    featureBullets: ["Planned module"],
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
    slug: "sitecapture",
    name: "Incident Reports",
    route: "/dashboard/incidents",
    shortDescription: "Planned incident capture and closeout workflow.",
    moduleColor: "red",
    publicVisible: false,
    landingOrder: 999,
    demoType: "none",
    featureBullets: ["Planned module"],
    tagline: "Report, investigate, and close out site incidents",
    description:
      "Capture near-misses, injuries, and property damage on site. Attach photos, assign corrective actions, and generate reports for your safety team.",
    icon: "alert-triangle",
    status: "coming-soon",
    visibility: "roadmap",
    href: "/dashboard/incidents",
    color: "red",
  },
];

// Legacy export name retained for existing imports.
export const MODULES: AppModule[] = [...CORE_MODULES, ...ROADMAP_MODULES];

// Legacy type retained for current call sites.
export type BuildstateModule = AppModule;

export function getModule(idOrSlug: string): AppModule | undefined {
  return MODULES.find((m) => m.id === idOrSlug || m.slug === idOrSlug);
}

export function getLiveModules(): AppModule[] {
  return MODULES.filter((m) => m.status === "live");
}

export function getComingSoonModules(): AppModule[] {
  return MODULES.filter((m) => m.status === "coming-soon");
}

export function getPrimaryNavModules(): AppModule[] {
  const isPrimaryEnabled = process.env.NEXT_PUBLIC_SITESIGN_PRIMARY !== "false";
  return MODULES.filter((m) => {
    if (!isPrimaryEnabled) return m.status === "live";
    return m.visibility === "primary";
  });
}

export function getSecondaryNavModules(): AppModule[] {
  const isPlannerEnabled = process.env.NEXT_PUBLIC_SHOW_PLANNER_PRIMARY === "true";
  return MODULES.filter((m) => {
    if (m.visibility === "primary") return false;
    if (m.id === "planner" && !isPlannerEnabled) return false;
    return m.visibility === "secondary";
  });
}

export function getRoadmapModules(): AppModule[] {
  const isRoadmapEnabled = process.env.NEXT_PUBLIC_SHOW_ROADMAP_MODULES !== "false";
  if (!isRoadmapEnabled) return [];
  return MODULES.filter((m) => m.visibility === "roadmap");
}

// New helper APIs requested.
export function getPublicModules(): AppModule[] {
  return MODULES
    .filter((m) => m.publicVisible)
    .sort((a, b) => a.landingOrder - b.landingOrder);
}

export function getModuleBySlug(slug: ModuleSlug): AppModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function getModuleRoute(slug: ModuleSlug): string | undefined {
  return getModuleBySlug(slug)?.route;
}
