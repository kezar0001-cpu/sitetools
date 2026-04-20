/**
 * Buildstate construction operations toolkit
 * 
 * Connected workflows for site access, quality, records, and documentation.
 * - SiteSign: entry workflow for site attendance and inductions
 * - SiteITP, SiteDocs: quality and documentation layer
 * - SiteCapture: supporting field records
 * - Dashboard, Sites/Projects, Team, Settings: operational backbone
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
  | "settings";

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

  // Navigation/display fields
  tagline: string;
  description: string;
  icon: string;
  status: ModuleStatus;
  visibility: ModuleVisibility;
  href: string;
  color: string;
}

// Entry workflow: SiteSign for site attendance and inductions
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

// Connected site workflows: quality, docs, field records, and planning
const SUPPORTING_MODULES: AppModule[] = [
  {
    id: "itp-builder",
    slug: "siteitp",
    name: "SiteITP",
    route: "/dashboard/site-itp",
    shortDescription: "Quality checklists with hold and witness point sign-offs.",
    moduleColor: "violet",
    publicVisible: true,
    landingOrder: 2,
    demoType: "workflow",
    featureBullets: [
      "Create and assign ITP checklists",
      "Hold and witness point tracking",
      "Digital sign-off without app install",
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
    shortDescription: "Structure field notes into professional documents.",
    moduleColor: "cyan",
    publicVisible: true,
    landingOrder: 3,
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
    id: "site-capture",
    slug: "sitecapture",
    name: "SiteCapture",
    route: "/dashboard/site-capture",
    shortDescription: "Supporting field records: diaries, prestarts, photos.",
    moduleColor: "sky",
    publicVisible: true,
    landingOrder: 4,
    demoType: "workflow",
    featureBullets: [
      "Daily diary with weather and labour",
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
];

// Operational backbone: projects, sites, team, and workspace settings
const INTERNAL_MODULES: AppModule[] = [
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
    name: "Projects",
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

// All live modules (excludes future roadmap items)
export const MODULES: AppModule[] = [...PRIMARY_MODULES, ...SUPPORTING_MODULES, ...INTERNAL_MODULES];

// Primary navigation: SiteSign as entry wedge
export function getPrimaryNavModules(): AppModule[] {
  return PRIMARY_MODULES;
}

// Type alias for compatibility with existing components
export type BuildstateModule = AppModule;


export function getModule(idOrSlug: string): AppModule | undefined {
  return MODULES.find((m) => m.id === idOrSlug || m.slug === idOrSlug);
}

export function getLiveModules(): AppModule[] {
  return MODULES.filter((m) => m.status === "live");
}


// Supporting toolkit navigation
export function getSecondaryNavModules(): AppModule[] {
  return SUPPORTING_MODULES;
}

// Internal/admin navigation (ordered)
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

// Public marketing modules (ordered by landing priority)
export function getPublicModules(): AppModule[] {
  return MODULES
    .filter((m) => m.publicVisible)
    .sort((a, b) => a.landingOrder - b.landingOrder);
}

// Module lookup helpers
export function getModuleBySlug(slug: ModuleSlug): AppModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function getModuleRoute(slug: ModuleSlug): string | undefined {
  return getModuleBySlug(slug)?.route;
}
