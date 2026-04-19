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

// Buildstate Toolkit: SiteSign is the entry wedge, connected tools extend depth

// Entry wedge — primary gateway to the platform
const PRIMARY_MODULES: AppModule[] = [
  {
    id: "site-sign-in",
    slug: "sitesign",
    name: "SiteSign",
    route: "/dashboard/site-sign-in",
    shortDescription: "QR sign-in with inductions, briefings, and live site headcount.",
    moduleColor: "amber",
    publicVisible: true,
    landingOrder: 1,
    demoType: "video",
    featureBullets: [
      "QR gate sign-in from any phone",
      "One-tap sign-in for returning workers",
      "Daily safety briefing shown at sign-in",
      "Site induction wizard for first-time workers",
    ],
    tagline: "QR site sign-in with inductions, briefings, and live headcount",
    description:
      "Digital sign-in for construction sites. Workers scan a QR code and sign in on their phone. Returning workers are recognised for one-tap sign-in. First-time visitors complete a site induction. Daily safety briefings are shown to all workers at sign-in.",
    icon: "clipboard-check",
    status: "live",
    visibility: "primary",
    href: "/dashboard/site-sign-in",
    color: "amber",
  },
];

// Connected toolkit — proof-of-depth tools that extend SiteSign value
const SUPPORTING_MODULES: AppModule[] = [
  {
    id: "site-capture",
    slug: "sitecapture",
    name: "SiteCapture",
    route: "/dashboard/site-capture",
    shortDescription: "Daily diary, prestarts, and field records.",
    moduleColor: "sky",
    publicVisible: true,
    landingOrder: 2,
    demoType: "workflow",
    featureBullets: [
      "Daily diary with weather, labour, equipment",
      "Prestart checklists for plant",
      "Photo documentation",
    ],
    tagline: "Daily diary and prestart records",
    description:
      "Record daily site activity: weather, labour, equipment, photos, and safety events. Run prestart checklists for plant and equipment.",
    icon: "book-open",
    status: "live",
    visibility: "secondary",
    href: "/dashboard/site-capture",
    color: "sky",
  },
  {
    id: "itp-builder",
    slug: "siteitp",
    name: "SiteITP",
    route: "/dashboard/site-itp",
    shortDescription: "ITP checklists with hold/witness sign-offs.",
    moduleColor: "violet",
    publicVisible: true,
    landingOrder: 3,
    demoType: "workflow",
    featureBullets: [
      "AI-generated or manual ITP items",
      "Hold and witness point tracking",
      "QR sign-off without app install",
    ],
    tagline: "Quality checklists with sign-offs",
    description:
      "Create ITP checklists with custom hold and witness points. Assign to a project and site, then share QR codes for sign-off.",
    icon: "list-checks",
    status: "live",
    visibility: "secondary",
    href: "/dashboard/site-itp",
    color: "violet",
  },
  {
    id: "site-docs",
    slug: "sitedocs",
    name: "SiteDocs",
    route: "/dashboard/site-docs",
    shortDescription: "Field notes to professional documents.",
    moduleColor: "cyan",
    publicVisible: true,
    landingOrder: 4,
    demoType: "workflow",
    featureBullets: [
      "AI-assisted document creation",
      "Incident reports, RFIs, NCRs",
      "Exportable PDF outputs",
    ],
    tagline: "Reports and professional documents",
    description:
      "Structure site notes into professional incident reports, meeting minutes, RFIs, NCRs, and more. Export to PDF with version tracking.",
    icon: "file-text",
    status: "live",
    visibility: "secondary",
    href: "/dashboard/site-docs",
    color: "cyan",
  },
  {
    id: "planner",
    slug: "siteplan",
    name: "SitePlan",
    route: "/site-plan",
    shortDescription: "Programme planning for delivery teams.",
    moduleColor: "indigo",
    publicVisible: false,
    landingOrder: 999,
    demoType: "none",
    featureBullets: [
      "Project programme + milestones",
      "Progress tracking",
      "Gantt views",
    ],
    tagline: "Programme planning",
    description:
      "Build practical civil programmes, track progress daily, manage delays, and keep site delivery aligned with planned dates.",
    icon: "list-checks",
    status: "live",
    visibility: "secondary",
    href: "/site-plan",
    color: "indigo",
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

// Internal/admin modules — necessary for operation but not part of product story
const INTERNAL_MODULES: AppModule[] = [];

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

// All modules combined — roadmap modules hidden by default
export const MODULES: AppModule[] = [...PRIMARY_MODULES, ...SUPPORTING_MODULES, ...INTERNAL_MODULES, ...ROADMAP_MODULES];

// Launch-focused: only SiteSign and SiteCapture for primary commercial story
export function getLaunchModules(): AppModule[] {
  return PRIMARY_MODULES;
}

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
  // Launch phase: only SiteSign and SiteCapture as primary focus
  return PRIMARY_MODULES;
}

export function getSecondaryNavModules(): AppModule[] {
  // Supporting modules available but not foregrounded
  return SUPPORTING_MODULES;
}

export function getInternalNavModules(): AppModule[] {
  const INTERNAL_ORDER: ModuleId[] = [
    "dashboard",
    "sites-projects",
    "team",
    "settings",
  ];

  const ordered = MODULES.filter((m) => m.visibility === "internal");
  return ordered.sort(
    (a, b) => INTERNAL_ORDER.indexOf(a.id) - INTERNAL_ORDER.indexOf(b.id),
  );
}

export function getRoadmapModules(): AppModule[] {
  // Roadmap modules always hidden for product-hardened launch
  return [];
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
