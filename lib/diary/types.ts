// ── Enums ──
export type DiaryStatus = "draft" | "submitted" | "approved" | "rejected";

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
  // Approval workflow
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_note: string | null;
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
  submitted: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

/** Tailwind class sets for each status badge */
export const DIARY_STATUS_BADGE: Record<DiaryStatus, string> = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};
