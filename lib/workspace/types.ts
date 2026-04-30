export type CompanyRole = "owner" | "admin" | "manager" | "member";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  active_company_id: string | null;
  active_site_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyMembership {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyRole;
  invited_by: string | null;
  created_at: string;
  companies?: Company | null;
  profiles?: Pick<Profile, "id" | "email" | "full_name"> | null;
}

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: CompanyRole;
  token: string;
  invite_code: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface Site {
  id: string;
  company_id: string;
  /** Project this site belongs to (nullable — legacy/standalone sites have no project) */
  project_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  /** When false the site is archived and no longer accepts sign-ins. Defaults to true. */
  is_active: boolean;
  /** IANA timezone identifier (e.g., Australia/Sydney, Australia/Melbourne) */
  timezone: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: "active" | "completed" | "on-hold" | "archived";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Project enriched with computed counts — used in list views */
export interface ProjectWithCounts extends Project {
  site_count: number;
  plan_count: number;
}

export type VisitorType = "Worker" | "Subcontractor" | "Visitor" | "Delivery";

export interface SiteVisit {
  id: string;
  company_id: string | null;
  site_id: string;
  project_id: string | null;
  full_name: string;
  phone_number: string | null;
  company_name: string;
  visitor_type: VisitorType;
  signature: string | null;
  signed_in_at: string;
  signed_out_at: string | null;
  created_by_user_id: string | null;
  signed_in_by_user_id: string | null;
}

export interface WorkspaceSummary {
  userId: string;
  profile: Profile | null;
  memberships: CompanyMembership[];
  activeMembership: CompanyMembership | null;
}

// ── SiteSign — Daily Briefings & Site Inductions ──────────────────────────────

export type BriefingCategory = "Safety" | "Environment" | "Quality" | "General";
export const visitorTypeOptions: VisitorType[] = ["Worker", "Subcontractor", "Visitor", "Delivery"];

export interface SiteContact {
  id: string;
  role: string;
  name: string;
  phone: string;
}

export interface EmergencyInfo {
  site_address: string;
  nearest_hospital_name: string;
  nearest_hospital_address: string;
  nearest_hospital_phone: string;
  muster_point: string;
  first_aider_name: string;
  first_aider_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_number: string;
}

export interface InductionChecklistItem {
  id: string;
  title: string;
  description: string;
  requires_acknowledgement: boolean;
}

export type SiteInductionSectionType =
  | "welcome"
  | "contacts"
  | "emergency"
  | "hazards"
  | "rules"
  | "permits"
  | "environment"
  | "declaration";

export interface SiteInductionSection {
  id: string;
  type: SiteInductionSectionType;
  title: string;
  description: string;
  requires_acknowledgement: boolean;
  contacts?: SiteContact[];
  emergency?: EmergencyInfo;
  items?: InductionChecklistItem[];
}

export interface SiteInductionStep {
  step_number: number;
  title: string;
  content: string;
  requires_acknowledgement: boolean;
}

export interface SiteInduction {
  id: string;
  site_id: string;
  company_id: string;
  title: string;
  steps: SiteInductionStep[];
  sections?: SiteInductionSection[];
  applies_to_visitor_types?: VisitorType[];
  revision_number?: number;
  requires_reacceptance_on_revision?: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BriefingTopicItem {
  id: string;
  text: string;
}

export interface SiteDailyBriefingContent {
  work_summary: string;
  presenter_name: string;
  shift_label: string;
  work_areas: string;
  planned_activities: BriefingTopicItem[];
  high_risk_activities: BriefingTopicItem[];
  hazards: BriefingTopicItem[];
  controls: BriefingTopicItem[];
  permits_required: BriefingTopicItem[];
  plant_equipment: BriefingTopicItem[];
  environmental_notes: string;
  weather_notes: string;
  coordination_notes: string;
  incidents_lessons: string;
  deliveries_traffic: string;
  special_instructions: string;
}

export interface SiteDailyBriefing {
  id: string;
  site_id: string;
  company_id: string;
  date: string;
  title: string;
  content: string;
  category: BriefingCategory | null;
  content_json?: SiteDailyBriefingContent;
  applies_to_visitor_types?: VisitorType[];
  presenter_name?: string | null;
  requires_acknowledgement?: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertBriefingPayload {
  id?: string;
  site_id: string;
  company_id: string;
  date: string;
  title: string;
  content: string;
  category?: BriefingCategory | null;
  content_json?: SiteDailyBriefingContent;
  applies_to_visitor_types?: VisitorType[];
  presenter_name?: string | null;
  requires_acknowledgement?: boolean;
}

export interface UpsertInductionPayload {
  id?: string;
  site_id: string;
  company_id: string;
  title: string;
  steps: SiteInductionStep[];
  sections?: SiteInductionSection[];
  applies_to_visitor_types?: VisitorType[];
  revision_number?: number;
  requires_reacceptance_on_revision?: boolean;
}

export const DEFAULT_EMERGENCY_INFO: EmergencyInfo = {
  site_address: "",
  nearest_hospital_name: "",
  nearest_hospital_address: "",
  nearest_hospital_phone: "",
  muster_point: "",
  first_aider_name: "",
  first_aider_phone: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_number: "000",
};

export const DEFAULT_BRIEFING_CONTENT: SiteDailyBriefingContent = {
  work_summary: "",
  presenter_name: "",
  shift_label: "",
  work_areas: "",
  planned_activities: [],
  high_risk_activities: [],
  hazards: [],
  controls: [],
  permits_required: [],
  plant_equipment: [],
  environmental_notes: "",
  weather_notes: "",
  coordination_notes: "",
  incidents_lessons: "",
  deliveries_traffic: "",
  special_instructions: "",
};

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createChecklistItem(title = "", description = "", requiresAcknowledgement = true): InductionChecklistItem {
  return {
    id: randomId(),
    title,
    description,
    requires_acknowledgement: requiresAcknowledgement,
  };
}

export function createContact(role = "", name = "", phone = ""): SiteContact {
  return { id: randomId(), role, name, phone };
}

export function createBriefingTopicItem(text = ""): BriefingTopicItem {
  return { id: randomId(), text };
}

export function createDefaultInductionSections(): SiteInductionSection[] {
  return [
    {
      id: "welcome",
      type: "welcome",
      title: "Welcome to Site",
      description: "Welcome to site. Review the project overview, access arrangements, and expectations before starting work.",
      requires_acknowledgement: true,
    },
    {
      id: "contacts",
      type: "contacts",
      title: "Key Site Contacts",
      description: "Important site personnel and contacts.",
      requires_acknowledgement: true,
      contacts: [createContact("Site Engineer"), createContact("Supervisor"), createContact("First Aider")],
    },
    {
      id: "emergency",
      type: "emergency",
      title: "Emergency Information",
      description: "Emergency details for this site including hospital, muster point, and emergency numbers.",
      requires_acknowledgement: true,
      emergency: { ...DEFAULT_EMERGENCY_INFO },
    },
    {
      id: "hazards",
      type: "hazards",
      title: "Site Hazards",
      description: "Review the major hazards that apply to this site and your work area.",
      requires_acknowledgement: true,
      items: [
        createChecklistItem("Mobile plant", "Be alert around moving vehicles and exclusion zones."),
        createChecklistItem("Work at heights", "Use approved access systems and fall protection."),
      ],
    },
    {
      id: "rules",
      type: "rules",
      title: "Site Rules & PPE",
      description: "Mandatory site rules and PPE requirements.",
      requires_acknowledgement: true,
      items: [
        createChecklistItem("Mandatory PPE", "Hard hat, hi-vis, and safety boots are required."),
        createChecklistItem("Sign in / sign out", "You must sign in on arrival and sign out when leaving site."),
      ],
    },
    {
      id: "permits",
      type: "permits",
      title: "Permits / Competencies",
      description: "Permits, SWMS, and competencies required before work starts.",
      requires_acknowledgement: true,
      items: [createChecklistItem("SWMS and permits", "Ensure required SWMS, permits, and tickets are available.")],
    },
    {
      id: "environment",
      type: "environment",
      title: "Environmental & Quality Requirements",
      description: "Waste, spill, protection, and quality requirements.",
      requires_acknowledgement: true,
      items: [createChecklistItem("Waste and spills", "Dispose of waste correctly and report spills immediately.")],
    },
    {
      id: "declaration",
      type: "declaration",
      title: "Declaration",
      description: "You acknowledge the site induction information and agree to comply with site requirements.",
      requires_acknowledgement: true,
    },
  ];
}

export function normalizeInductionSections(induction: SiteInduction | null | undefined): SiteInductionSection[] {
  if (induction?.sections?.length) return induction.sections;
  if (induction?.steps?.length) {
    return induction.steps.map((step, index) => ({
      id: `legacy-${index + 1}`,
      type: "welcome",
      title: step.title,
      description: step.content,
      requires_acknowledgement: step.requires_acknowledgement,
    }));
  }
  return createDefaultInductionSections();
}

export function normalizeBriefingContent(briefing: SiteDailyBriefing | null | undefined): SiteDailyBriefingContent {
  return {
    ...DEFAULT_BRIEFING_CONTENT,
    ...(briefing?.content_json ?? {}),
    presenter_name: briefing?.content_json?.presenter_name ?? briefing?.presenter_name ?? "",
  };
}

export function appliesToVisitorType(appliesTo: VisitorType[] | undefined, visitorType: VisitorType): boolean {
  if (!appliesTo || appliesTo.length === 0) return true;
  return appliesTo.includes(visitorType);
}
