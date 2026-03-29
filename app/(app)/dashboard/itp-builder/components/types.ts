// ---------------------------------------------------------------------------
// Shared types for ITP Builder
// ---------------------------------------------------------------------------

export type ItemType = "hold" | "witness";
export type ItemStatus = "pending" | "signed" | "waived" | "client_hold";
export type Responsibility = "contractor" | "superintendent" | "third_party";
export type CreationMode = "ai" | "manual" | "import" | "template";
export type ImportStep = "upload" | "preview" | "saving";

export interface ITPItem {
  id: string;
  session_id: string;
  type: ItemType;
  title: string;
  description: string;
  sort_order: number;
  slug: string;
  status: ItemStatus;
  signed_off_at: string | null;
  signed_off_by_name: string | null;
  sign_off_lat: number | null;
  sign_off_lng: number | null;
  waive_reason?: string | null;
  signature?: string | null;
  reference_standard?: string | null;
  responsibility?: Responsibility | null;
  records_required?: string | null;
  acceptance_criteria?: string | null;
  client_hold_reason?: string | null;
  client_hold_by_name?: string | null;
  client_hold_at?: string | null;
}

export interface ITPSession {
  id: string;
  company_id: string;
  project_id: string | null;
  site_id: string | null;
  task_description: string;
  status: string;
  created_at: string;
  items?: ITPItem[];
}

export interface ProjectOption {
  id: string;
  name: string;
}

export interface ITPTemplate {
  id: string;
  company_id: string;
  name: string;
  created_by_user_id: string | null;
  created_at: string;
  items: Array<{
    type: "witness" | "hold";
    title: string;
    description: string;
    reference_standard?: string;
    responsibility?: Responsibility;
    records_required?: string;
    acceptance_criteria?: string;
  }>;
}

export interface AuditLogEntry {
  id: string;
  session_id: string;
  item_id: string | null;
  action: "create" | "update" | "delete" | "sign" | "waive" | "archive";
  performed_by_user_id: string | null;
  performed_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

export interface DraftItpItem {
  type: "witness" | "hold";
  title: string;
  description: string;
  reference_standard?: string;
  responsibility?: Responsibility;
  records_required?: string;
  acceptance_criteria?: string;
}

export interface DraftItp {
  task_description: string;
  items: DraftItpItem[];
}

export interface SiteOption {
  id: string;
  name: string;
  project_id: string | null;
}

export interface SiteGroup {
  siteId: string | null;
  siteName: string | null;
  sessions: ITPSession[];
}

export interface ProjectGroup {
  projectId: string | null;
  projectName: string | null;
  siteGroups: SiteGroup[];
}
