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
