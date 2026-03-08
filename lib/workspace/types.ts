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
