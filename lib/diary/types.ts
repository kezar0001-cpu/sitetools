// ── Enums ──
export type DiaryStatus = "draft" | "submitted";

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
  status: DiaryStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  submitted: "Submitted",
};
