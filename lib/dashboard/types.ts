export interface DashboardStats {
  activeSites: number;
  onSiteToday: number;
  openItps: number;
  photosThisWeek: number;
}

export type DashboardStatsResult =
  | { success: true; data: DashboardStats }
  | { success: false; error: string };

export type ActivityFeedResult =
  | { success: true; data: ActivityFeedItem[] }
  | { success: false; error: string };

export type ActivityType =
  | "diary_created"
  | "diary_completed"
  | "photo_uploaded"
  | "prestart_submitted"
  | "inspection_completed"
  | "incident_reported"
  | "toolbox_talk"
  | "sign_in"
  | "sign_out"
  | "itp_signed"
  | "defect_reported";

export interface ActivityFeedItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  siteName: string | null;
  projectName: string | null;
  userName: string | null;
  createdAt: string;
  link: string | null;
}
