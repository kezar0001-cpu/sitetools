// ── Enums ──
export type DiaryStatus = "draft" | "completed" | "archived";

export type FormType = 
  | "daily-diary" 
  | "prestart-checklist" 
  | "site-induction" 
  | "toolbox-talk" 
  | "incident-report" 
  | "site-inspection";

export const FORM_TYPE_CONFIG: Record<FormType, { label: string; description: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
  "daily-diary": {
    label: "Daily Diary",
    description: "Daily site records — weather, labour, plant & photos.",
    icon: "book-open",
    color: "text-sky-700",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
  },
  "prestart-checklist": {
    label: "Prestart Checklist",
    description: "Pre-start safety checks and hazard assessments.",
    icon: "clipboard-check",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  "site-induction": {
    label: "Site Induction",
    description: "Worker site inductions and safety briefings.",
    icon: "users",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
  },
  "toolbox-talk": {
    label: "Toolbox Talk",
    description: "Safety meetings and team briefings.",
    icon: "message-square",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  "incident-report": {
    label: "Incident Report",
    description: "Report near-misses, injuries, or property damage.",
    icon: "alert-triangle",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  "site-inspection": {
    label: "Site Inspection",
    description: "Quality and safety inspections with photos.",
    icon: "search-check",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
  },
};

export const FORM_TYPE_BADGE: Record<FormType, string> = {
  "daily-diary": "bg-sky-100 text-sky-700 border-sky-200",
  "prestart-checklist": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "site-induction": "bg-violet-100 text-violet-700 border-violet-200",
  "toolbox-talk": "bg-amber-100 text-amber-700 border-amber-200",
  "incident-report": "bg-red-100 text-red-700 border-red-200",
  "site-inspection": "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export type WeatherCondition =
  | "sunny"
  | "partly-cloudy"
  | "overcast"
  | "light-rain"
  | "heavy-rain"
  | "storm"
  | "windy"
  | "fog";

// ── Weather sub-object (stored as JSONB in site_diaries.weather) ──
export interface WeatherSnapshot {
  conditions: WeatherCondition;
  temp_min: number | null;
  temp_max: number | null;
  wind: string | null; // e.g. "15–20 km/h NW"
}

// ── Core entities ──
export interface SiteDiary {
  id: string;
  company_id: string;
  project_id: string | null;
  site_id: string | null;
  date: string; // ISO date: "YYYY-MM-DD"
  weather: WeatherSnapshot;
  notes: string | null;
  work_completed: string | null;
  planned_works: string | null;
  status: DiaryStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Completion workflow
  completed_at: string | null;
  completed_by: string | null;
  auto_archive_at: string | null;
}

export interface SiteDiaryLabor {
  id: string;
  diary_id: string;
  trade_or_company: string;
  worker_count: number;
  hours_worked: number;
  created_at: string;
}

export interface SiteDiaryEquipment {
  id: string;
  diary_id: string;
  equipment_type: string;
  quantity: number;
  hours_used: number;
  created_at: string;
}

// ── Equipment Catalog for AI-powered equipment management ──
export interface EquipmentCatalog {
  id: string;
  company_id: string;
  equipment_type: string;
  default_quantity: number;
  default_hours: number;
  category: string | null;
  created_at: string;
  updated_at: string;
}

// ── Parsed equipment from natural language input ──
export interface ParsedEquipment {
  equipment_type: string;
  quantity: number;
  hours_used: number;
  category?: string | null;
}

export interface SiteDiaryPhoto {
  id: string;
  diary_id: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
  // Generated client-side after fetching signed URL
  signedUrl?: string;
}

export type IssueType = "Safety" | "Delay" | "RFI" | "Instruction" | "NCR";

export interface SiteDiaryIssue {
  id: string;
  diary_id: string;
  type: IssueType;
  description: string;
  responsible_party: string | null;
  delay_hours: number | null;
  created_at: string;
  updated_at: string;
}

// ── Composite / view types ──
export interface SiteDiaryWithCounts extends SiteDiary {
  total_workers: number;
  total_labor_rows: number;
  total_equipment_rows: number;
  total_photos: number;
}

export interface SiteDiaryFull extends SiteDiary {
  labor: SiteDiaryLabor[];
  equipment: SiteDiaryEquipment[];
  photos: SiteDiaryPhoto[];
  issues: SiteDiaryIssue[];
}

// ── Payload types (for create / update operations) ──
export interface CreateDiaryPayload {
  company_id: string;
  project_id?: string | null;
  site_id?: string | null;
  date?: string;
  form_type?: FormType;
  weather?: Partial<WeatherSnapshot>;
  notes?: string | null;
  status?: DiaryStatus;
}

export interface UpdateDiaryPayload {
  project_id?: string | null;
  site_id?: string | null;
  date?: string;
  weather?: Partial<WeatherSnapshot>;
  notes?: string | null;
  work_completed?: string | null;
  planned_works?: string | null;
  status?: DiaryStatus;
}

export interface AddLaborPayload {
  trade_or_company: string;
  worker_count: number;
  hours_worked: number;
}

export interface AddEquipmentPayload {
  equipment_type: string;
  quantity: number;
  hours_used: number;
}

export interface AddIssuePayload {
  type: IssueType;
  description: string;
  responsible_party?: string | null;
  delay_hours?: number | null;
}

// ── SiteSign Integration ──

export interface SiteSignLaborSource {
  company_name: string;
  worker_count: number;
  total_hours: number;
  workers: Array<{
    full_name: string;
    hours: number;
    signed_in_at: string;
    signed_out_at: string | null;
  }>;
}

// ── Constants ──
export const WEATHER_CONDITIONS: WeatherCondition[] = [
  "sunny",
  "partly-cloudy",
  "overcast",
  "light-rain",
  "heavy-rain",
  "storm",
  "windy",
  "fog",
];

export const WEATHER_CONDITION_LABELS: Record<WeatherCondition, string> = {
  sunny: "Sunny",
  "partly-cloudy": "Partly Cloudy",
  overcast: "Overcast",
  "light-rain": "Light Rain",
  "heavy-rain": "Heavy Rain",
  storm: "Storm",
  windy: "Windy",
  fog: "Fog",
};

export const WEATHER_CONDITION_ICONS: Record<WeatherCondition, string> = {
  sunny: "☀️",
  "partly-cloudy": "⛅",
  overcast: "☁️",
  "light-rain": "🌦️",
  "heavy-rain": "🌧️",
  storm: "⛈️",
  windy: "💨",
  fog: "🌫️",
};

export const DEFAULT_WEATHER: WeatherSnapshot = {
  conditions: "sunny",
  temp_min: null,
  temp_max: null,
  wind: null,
};

export const DIARY_STATUS_LABELS: Record<DiaryStatus, string> = {
  draft: "Draft",
  completed: "Completed",
  archived: "Archived",
};

/** Tailwind class sets for each status badge */
export const DIARY_STATUS_BADGE: Record<DiaryStatus, string> = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-100 text-slate-600 border-slate-300",
};

// ── Activity Form Config System ──

export type SectionKey =
  | "weather"
  | "workCompleted"
  | "plannedWorks"
  | "labour"
  | "equipment"
  | "issues"
  | "photos"
  | "notes"
  | "plantDetails"
  | "checklistItems"
  | "workerDetails"
  | "hazardAcknowledgement"
  | "siteRules"
  | "emergencyProcedures"
  | "talkDetails"
  | "attendees"
  | "incidentDetails"
  | "personsInvolved"
  | "witnesses"
  | "immediateActions"
  | "causalFactors"
  | "correctiveActions"
  | "declaration"
  | "inspectionDetails"
  | "inspectionItems"
  | "defectsFound"
  | "observations"
  | "outcome"
  | "signOff";

export interface ActivityFormConfig {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  colour: string; // tailwind colour token
  sections: SectionKey[];
  requiredSections: SectionKey[];
  outputDocumentTypes: string[]; // maps to SiteDocs template IDs
  pdfTemplate: string; // template name for PDF export
}

export const ACTIVITY_FORM_CONFIGS: Record<FormType, ActivityFormConfig> = {
  "daily-diary": {
    id: "daily-diary",
    name: "Daily Diary",
    description: "Record daily site activities, weather, labour, equipment and progress",
    icon: "book-open",
    colour: "sky",
    sections: [
      "weather",
      "workCompleted",
      "plannedWorks",
      "labour",
      "equipment",
      "issues",
      "photos",
      "notes",
    ],
    requiredSections: ["weather", "workCompleted"],
    outputDocumentTypes: ["site-diary-pdf", "site-diary-csv"],
    pdfTemplate: "daily-diary-standard",
  },
  "prestart-checklist": {
    id: "prestart-checklist",
    name: "Prestart Checklist",
    description: "Safety checks and hazard assessment before starting work",
    icon: "clipboard-check",
    colour: "emerald",
    sections: [
      "checklistItems",
      "hazardAcknowledgement",
      "plantDetails",
      "workerDetails",
      "photos",
      "signOff",
    ],
    requiredSections: ["checklistItems", "signOff"],
    outputDocumentTypes: ["prestart-pdf", "prestart-csv"],
    pdfTemplate: "prestart-checklist-standard",
  },
  "site-induction": {
    id: "site-induction",
    name: "Site Induction",
    description: "Worker onboarding with safety briefings and site rules acknowledgment",
    icon: "users",
    colour: "violet",
    sections: [
      "workerDetails",
      "siteRules",
      "emergencyProcedures",
      "hazardAcknowledgement",
      "photos",
      "signOff",
    ],
    requiredSections: ["workerDetails", "siteRules", "signOff"],
    outputDocumentTypes: ["induction-pdf", "induction-csv"],
    pdfTemplate: "site-induction-standard",
  },
  "toolbox-talk": {
    id: "toolbox-talk",
    name: "Toolbox Talk",
    description: "Team safety meetings and topic briefings with attendance tracking",
    icon: "message-square",
    colour: "amber",
    sections: [
      "talkDetails",
      "attendees",
      "hazardAcknowledgement",
      "photos",
      "signOff",
    ],
    requiredSections: ["talkDetails", "attendees"],
    outputDocumentTypes: ["toolbox-talk-pdf", "toolbox-talk-csv"],
    pdfTemplate: "toolbox-talk-standard",
  },
  "incident-report": {
    id: "incident-report",
    name: "Incident Report",
    description: "Report and document workplace incidents, near-misses, or injuries",
    icon: "alert-triangle",
    colour: "red",
    sections: [
      "incidentDetails",
      "personsInvolved",
      "witnesses",
      "immediateActions",
      "causalFactors",
      "correctiveActions",
      "photos",
      "declaration",
    ],
    requiredSections: ["incidentDetails", "declaration"],
    outputDocumentTypes: ["incident-pdf", "incident-csv"],
    pdfTemplate: "incident-report-standard",
  },
  "site-inspection": {
    id: "site-inspection",
    name: "Site Inspection",
    description: "Quality and safety inspections with checklists and defect tracking",
    icon: "search-check",
    colour: "cyan",
    sections: [
      "inspectionDetails",
      "inspectionItems",
      "defectsFound",
      "observations",
      "outcome",
      "signOff",
    ],
    requiredSections: ["inspectionDetails", "inspectionItems", "outcome"],
    outputDocumentTypes: ["inspection-pdf", "inspection-csv"],
    pdfTemplate: "site-inspection-standard",
  },
};

export function getAllFormTypes(): FormType[] {
  return Object.keys(ACTIVITY_FORM_CONFIGS) as FormType[];
}

export function getFormConfig(id: string): ActivityFormConfig | undefined {
  return ACTIVITY_FORM_CONFIGS[id as FormType];
}

// ── Prestart Checklist Types ──

export type ChecklistStatus = "pass" | "fail" | "na";

export type ChecklistCategory =
  | "engine-drive"
  | "brakes-steering"
  | "lights-signals"
  | "safety-devices"
  | "tyres-tracks"
  | "hydraulics";

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  label: string;
  status: ChecklistStatus;
  defectNote?: string | null;
}

export type DefectSeverity = "minor" | "major" | "critical";

export interface ChecklistDefect {
  id: string;
  checklistItemId: string;
  description: string;
  severity: DefectSeverity;
  photos: string[]; // storage paths
  clearedBeforeOperation: boolean;
  createdAt: string;
}

export interface PlantDetails {
  equipmentType: string;
  makeModel: string;
  regoOrId: string;
  operatorName: string;
  date: string; // ISO date
  siteId: string | null;
  projectId: string | null;
}

export interface OperatorDeclaration {
  operatorName: string;
  signature: string; // base64 or storage path
  signedAt: string; // ISO timestamp
}

export type ClearanceDecision = "cleared" | "not-cleared" | "cleared-with-conditions";

export interface SupervisorSignOff {
  supervisorName: string;
  signature: string; // base64 or storage path
  decision: ClearanceDecision;
  conditions?: string | null;
  signedAt: string; // ISO timestamp
}

export interface PrestartChecklistData {
  id: string;
  companyId: string;
  formType: "prestart-checklist";
  status: DiaryStatus;
  plantDetails: PlantDetails;
  checklistItems: ChecklistItem[];
  defects: ChecklistDefect[];
  operatorDeclaration: OperatorDeclaration | null;
  supervisorSignOff: SupervisorSignOff | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  completedBy: string | null;
}

// Composite type with related data
export interface PrestartChecklistFull extends PrestartChecklistData {
  // Additional computed fields or related data can be added here
  hasUnclearedCriticalDefects: boolean;
}

// ── Toolbox Talk Types ──

export type ToolboxTalkCategory = "Safety" | "Environment" | "Quality" | "General";

export const TOOLBOX_TALK_CATEGORIES: ToolboxTalkCategory[] = [
  "Safety",
  "Environment",
  "Quality",
  "General",
];

export interface ToolboxTalkAttendee {
  id: string;
  diary_id: string;
  name: string;
  company: string;
  trade: string | null;
  signature_data: string | null;
  signed_on_paper: boolean;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ToolboxActionStatus = "open" | "in_progress" | "completed" | "cancelled";

export const TOOLBOX_ACTION_STATUS_LABELS: Record<ToolboxActionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export interface ToolboxTalkAction {
  id: string;
  diary_id: string;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  status: ToolboxActionStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  completed_by: string | null;
}

export interface ToolboxTalkData {
  talk_date: string; // ISO date: "YYYY-MM-DD"
  talk_time: string | null; // HH:MM format
  location: string | null;
  conducted_by_name: string | null;
  conducted_by_role: string | null;
  topic_title: string | null;
  topic_category: ToolboxTalkCategory | null;
  duration_minutes: number | null;
  content: string | null;
  attached_document_url: string | null;
  presenter_signature: string | null; // base64 signature or storage path
  presenter_signed_at: string | null; // ISO timestamp
}

export interface ToolboxTalkFull extends SiteDiary {
  toolbox_talk_data: ToolboxTalkData | null;
  attendees: ToolboxTalkAttendee[];
  actions: ToolboxTalkAction[];
  photos: SiteDiaryPhoto[];
}

// Payload types
export interface AddAttendeePayload {
  name: string;
  company: string;
  trade?: string | null;
  signature_data?: string | null;
  signed_on_paper?: boolean;
}

export interface UpdateAttendeePayload {
  name?: string;
  company?: string;
  trade?: string | null;
  signature_data?: string | null;
  signed_on_paper?: boolean;
  signed_at?: string | null;
}

export interface AddToolboxActionPayload {
  description: string;
  assigned_to?: string | null;
  due_date?: string | null;
}

export interface UpdateToolboxActionPayload {
  description?: string;
  assigned_to?: string | null;
  due_date?: string | null;
  status?: ToolboxActionStatus;
  completed_at?: string | null;
  completed_by?: string | null;
}

// ── Site Inspection Types ──

export type InspectionType = 
  | "Routine"
  | "Hold Point"
  | "Witness Point"
  | "Pre-Pour"
  | "Pre-Backfill"
  | "Handover";

export const INSPECTION_TYPES: InspectionType[] = [
  "Routine",
  "Hold Point",
  "Witness Point",
  "Pre-Pour",
  "Pre-Backfill",
  "Handover",
];

export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  "Routine": "Routine Inspection",
  "Hold Point": "Hold Point",
  "Witness Point": "Witness Point",
  "Pre-Pour": "Pre-Pour Inspection",
  "Pre-Backfill": "Pre-Backfill Inspection",
  "Handover": "Handover Inspection",
};

export type InspectionItemResult = "Pass" | "Fail" | "Observation" | "N/A";

export const INSPECTION_ITEM_RESULTS: InspectionItemResult[] = ["Pass", "Fail", "Observation", "N/A"];

export const INSPECTION_RESULT_BADGES: Record<InspectionItemResult, string> = {
  "Pass": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Fail": "bg-red-100 text-red-700 border-red-200",
  "Observation": "bg-amber-100 text-amber-700 border-amber-200",
  "N/A": "bg-slate-100 text-slate-600 border-slate-200",
};

export type InspectionSeverity = "minor" | "major" | "critical";

export const INSPECTION_SEVERITIES: InspectionSeverity[] = ["minor", "major", "critical"];

export const INSPECTION_SEVERITY_BADGES: Record<InspectionSeverity, string> = {
  "minor": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "major": "bg-orange-100 text-orange-700 border-orange-200",
  "critical": "bg-red-100 text-red-700 border-red-200",
};

export type InspectionOutcome = 
  | "Approved"
  | "Approved with Comments"
  | "Not Approved"
  | "Re-inspection Required";

export const INSPECTION_OUTCOMES: InspectionOutcome[] = [
  "Approved",
  "Approved with Comments",
  "Not Approved",
  "Re-inspection Required",
];

export const INSPECTION_OUTCOME_BADGES: Record<InspectionOutcome, string> = {
  "Approved": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Approved with Comments": "bg-blue-100 text-blue-700 border-blue-200",
  "Not Approved": "bg-red-100 text-red-700 border-red-200",
  "Re-inspection Required": "bg-amber-100 text-amber-700 border-amber-200",
};

export interface InspectionItem {
  id: string;
  diary_id: string;
  item_number: number;
  description: string;
  reference: string | null; // spec clause, drawing number, etc.
  result: InspectionItemResult;
  comments: string | null;
  photo_paths: string[]; // storage paths for attached photos
  created_at: string;
  updated_at: string;
}

export interface InspectionDefect {
  id: string;
  diary_id: string;
  inspection_item_id: string | null; // linked to inspection item if auto-created from Fail
  description: string;
  location: string | null;
  severity: InspectionSeverity;
  photo_paths: string[]; // storage paths for attached photos
  rectification_required: string | null;
  assigned_to: string | null;
  due_date: string | null; // ISO date
  status: "open" | "in_progress" | "completed" | "verified";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  completed_by: string | null;
}

export interface InspectionObservation {
  id: string;
  diary_id: string;
  inspection_item_id: string | null; // linked to inspection item if auto-created from Observation result
  description: string;
  reference: string | null;
  priority: "low" | "medium" | "high" | null;
  action_required: string | null;
  assigned_to: string | null;
  due_date: string | null; // ISO date
  status: "open" | "in_progress" | "completed" | "closed";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  completed_by: string | null;
}

export interface InspectionDetails {
  inspection_type: InspectionType;
  inspection_date: string; // ISO date: "YYYY-MM-DD"
  inspection_time: string | null; // HH:MM format
  project_id: string | null;
  site_id: string | null;
  area_location: string | null;
  itp_reference: string | null; // can be free text or link to ITP record
  itp_id: string | null; // actual ITP record ID if linked
  inspector_name: string;
  inspector_role: string;
  inspector_company: string;
}

export interface InspectionOutcomeData {
  outcome: InspectionOutcome;
  comments: string | null;
  next_inspection_date: string | null; // ISO date for scheduling follow-up
  next_inspection_type: InspectionType | null;
}

export interface InspectionSignOff {
  inspector_signature: string | null; // base64 signature data or storage path
  inspector_signed_at: string | null; // ISO timestamp
  client_representative_name: string | null;
  client_representative_signature: string | null; // base64 signature data or storage path
  client_representative_signed_at: string | null; // ISO timestamp
  sign_off_date: string; // ISO date
}

export interface SiteInspectionData {
  id: string;
  company_id: string;
  form_type: "site-inspection";
  status: DiaryStatus;
  details: InspectionDetails;
  items: InspectionItem[];
  defects: InspectionDefect[];
  observations: InspectionObservation[];
  outcome: InspectionOutcomeData;
  sign_off: InspectionSignOff;
  photos: SiteDiaryPhoto[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  completed_by: string | null;
  // For follow-up inspections
  parent_inspection_id: string | null; // if this is a follow-up inspection
  follow_up_inspection_id: string | null; // if a follow-up was created
  follow_up_created_at: string | null;
}

export interface SiteInspectionFull extends SiteDiary {
  inspection_data: SiteInspectionData | null;
  items: InspectionItem[];
  defects: InspectionDefect[];
  observations: InspectionObservation[];
  photos: SiteDiaryPhoto[];
}

// Payload types for SiteInspection operations
export interface AddInspectionItemPayload {
  description: string;
  reference?: string | null;
  result?: InspectionItemResult;
  comments?: string | null;
}

export interface UpdateInspectionItemPayload {
  description?: string;
  reference?: string | null;
  result?: InspectionItemResult;
  comments?: string | null;
  photo_paths?: string[];
}

export interface AddInspectionDefectPayload {
  description: string;
  location?: string | null;
  severity: InspectionSeverity;
  inspection_item_id?: string | null;
  rectification_required?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
}

export interface UpdateInspectionDefectPayload {
  description?: string;
  location?: string | null;
  severity?: InspectionSeverity;
  photo_paths?: string[];
  rectification_required?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  status?: "open" | "in_progress" | "completed" | "verified";
  completed_at?: string | null;
  completed_by?: string | null;
}

export interface AddInspectionObservationPayload {
  description: string;
  reference?: string | null;
  inspection_item_id?: string | null;
  priority?: "low" | "medium" | "high" | null;
  action_required?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
}

export interface UpdateInspectionObservationPayload {
  description?: string;
  reference?: string | null;
  priority?: "low" | "medium" | "high" | null;
  action_required?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  status?: "open" | "in_progress" | "completed" | "closed";
  completed_at?: string | null;
  completed_by?: string | null;
}

// Default checklist templates by inspection type
export const DEFAULT_INSPECTION_CHECKLISTS: Record<InspectionType, Array<{ description: string; reference: string }>> = {
  "Routine": [
    { description: "Site access and egress routes clear and safe", reference: "WHS-001" },
    { description: "PPE being worn by all personnel", reference: "WHS-002" },
    { description: "First aid kit accessible and stocked", reference: "WHS-003" },
    { description: "Fire extinguishers accessible and current", reference: "WHS-004" },
    { description: "Housekeeping maintained to acceptable standard", reference: "WHS-005" },
  ],
  "Hold Point": [
    { description: "Hold point notification submitted and approved", reference: "QA-HP-001" },
    { description: "Work covered by hold point has not progressed", reference: "QA-HP-002" },
    { description: "Required documentation submitted for review", reference: "QA-HP-003" },
    { description: "Verification inspection completed", reference: "QA-HP-004" },
    { description: "Release authorization obtained from superintendent", reference: "QA-HP-005" },
  ],
  "Witness Point": [
    { description: "Witness point notification provided per contract", reference: "QA-WP-001" },
    { description: "Work is ready for witness inspection", reference: "QA-WP-002" },
    { description: "Applicable test reports and certificates available", reference: "QA-WP-003" },
    { description: "Work area is safe for inspection personnel", reference: "QA-WP-004" },
  ],
  "Pre-Pour": [
    { description: "Formwork installed per drawings and specifications", reference: "CONC-001" },
    { description: "Reinforcement placed per structural drawings", reference: "CONC-002" },
    { description: "Rebar spacing, cover, and laps verified", reference: "CONC-003" },
    { description: "Embedments and blockouts correctly positioned", reference: "CONC-004" },
    { description: "Concrete pour schedule submitted and approved", reference: "CONC-005" },
    { description: "Pre-pour cleaning and preparation completed", reference: "CONC-006" },
    { description: "Concrete mix design approved", reference: "CONC-007" },
    { description: "Test cylinders and equipment ready", reference: "CONC-008" },
  ],
  "Pre-Backfill": [
    { description: "Excavation dimensions verified against drawings", reference: "EARTH-001" },
    { description: "Compaction testing completed at required levels", reference: "EARTH-002" },
    { description: "Utility installations inspected and approved", reference: "EARTH-003" },
    { description: "Geotextile placement as specified", reference: "EARTH-004" },
    { description: "Drainage and waterproofing systems verified", reference: "EARTH-005" },
    { description: "Survey levels recorded", reference: "EARTH-006" },
  ],
  "Handover": [
    { description: "Works completed per contract specifications", reference: "HAND-001" },
    { description: "Defects list (punch list) prepared and agreed", reference: "HAND-002" },
    { description: "As-built documentation submitted", reference: "HAND-003" },
    { description: "Operating and maintenance manuals provided", reference: "HAND-004" },
    { description: "Warranty documentation complete", reference: "HAND-005" },
    { description: "Statutory approvals and certificates obtained", reference: "HAND-006" },
    { description: "Training completed for operation of systems", reference: "HAND-007" },
    { description: "Final clean completed to required standard", reference: "HAND-008" },
  ],
};
