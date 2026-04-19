import { supabase } from "@/lib/supabase";
import {
  Company,
  CompanyInvitation,
  CompanyMembership,
  Profile,
  Project,
  ProjectWithCounts,
  Site,
  SiteDailyBriefing,
  SiteInduction,
  SiteVisit,
  UpsertBriefingPayload,
  UpsertInductionPayload,
  WorkspaceSummary,
} from "@/lib/workspace/types";
import { clearWorkspaceSummaryCache } from "@/lib/workspace/summaryCache";
import {
  AcceptCompanyInvitationResult,
  CompanyInvitationInspection,
} from "@/lib/workspace/invitations";

// ── Query Key Factories for TanStack Query ───────────────────────────────────

export const siteKeys = {
  all: ["sites"] as const,
  company: (companyId: string | null) => ["sites", "company", companyId] as const,
  project: (projectId: string) => ["sites", "project", projectId] as const,
  detail: (siteId: string) => ["sites", "detail", siteId] as const,
} as const;

export const projectKeys = {
  all: ["projects"] as const,
  company: (companyId: string | null) => ["projects", "company", companyId] as const,
  detail: (projectId: string) => ["projects", "detail", projectId] as const,
} as const;

export const visitKeys = {
  all: ["visits"] as const,
  site: (companyId: string | null, siteId: string | null) =>
    ["visits", "site", companyId, siteId] as const,
  list: (companyId: string, siteId: string) =>
    ["visits", "list", companyId, siteId] as const,
} as const;

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function asSupabaseError(error: unknown): SupabaseErrorLike {
  return (error ?? {}) as SupabaseErrorLike;
}

function isMissingTableError(error: unknown, tableName: string): boolean {
  const candidate = asSupabaseError(error);
  const code = candidate.code ?? "";
  const message = (candidate.message ?? "").toLowerCase();
  const details = (candidate.details ?? "").toLowerCase();
  const hint = (candidate.hint ?? "").toLowerCase();

  if (code === "PGRST205") return true;

  return (
    message.includes(tableName.toLowerCase()) ||
    details.includes(tableName.toLowerCase()) ||
    hint.includes(tableName.toLowerCase())
  );
}

function referencesColumn(error: unknown, columnName: string): boolean {
  const candidate = asSupabaseError(error);
  const message = (candidate.message ?? "").toLowerCase();
  const details = (candidate.details ?? "").toLowerCase();
  const hint = (candidate.hint ?? "").toLowerCase();
  const needle = columnName.toLowerCase();

  return message.includes(needle) || details.includes(needle) || hint.includes(needle);
}

function buildFallbackProfile(userId: string, email?: string | null, activeCompanyId: string | null = null): Profile {
  const now = new Date().toISOString();
  return {
    id: userId,
    email: email ? email.toLowerCase() : null,
    full_name: null,
    phone_number: null,
    active_company_id: activeCompanyId,
    active_site_id: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function ensureProfile(userId: string, email?: string | null): Promise<Profile | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    if (isMissingTableError(profileError, "profiles")) {
      return buildFallbackProfile(userId, email);
    }
    throw profileError;
  }

  if (profile) return profile as Profile;

  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, email: email ? email.toLowerCase() : null })
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error, "profiles")) {
      return buildFallbackProfile(userId, email);
    }
    throw error;
  }

  return data as Profile;
}

function pickActiveMembership(
  memberships: CompanyMembership[],
  activeCompanyId: string | null | undefined
): CompanyMembership | null {
  if (memberships.length === 0) return null;

  if (activeCompanyId) {
    const matched = memberships.find((m) => m.company_id === activeCompanyId);
    if (matched) return matched;
  }

  return memberships[0] ?? null;
}

type MembershipRow = Omit<CompanyMembership, "companies"> & {
  companies?: Company | Company[] | null;
};

function normalizeMembershipCompany(value: MembershipRow["companies"]): Company | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as Company | null;
  }
  return (value ?? null) as Company | null;
}

/**
 * Loads the full workspace summary for `userId` using the `get_workspace_summary`
 * Supabase RPC.  The function joins profiles, company_memberships, and companies
 * server-side and auto-corrects `active_company_id` when needed, so the entire
 * operation completes in a single round-trip.
 *
 * Falls back to `loadWorkspaceSummaryLegacy` when the RPC is not yet deployed
 * (e.g. migration pending in a local or staging environment).
 */
export async function loadWorkspaceSummary(userId: string, email?: string | null): Promise<WorkspaceSummary> {
  const { data, error } = await supabase.rpc("get_workspace_summary");

  if (error) {
    // PGRST202 = function not found in PostgREST schema cache.
    // Fall back gracefully so local/staging environments without the migration
    // still work.
    if (error.code === "PGRST202" || isMissingTableError(error, "get_workspace_summary")) {
      return loadWorkspaceSummaryLegacy(userId, email);
    }
    throw error;
  }

  if (!data) {
    return loadWorkspaceSummaryLegacy(userId, email);
  }

  const result = data as { profile: Profile | null; memberships: CompanyMembership[] };

  const profile: Profile = result.profile ?? buildFallbackProfile(userId, email);

  const memberships: CompanyMembership[] = (result.memberships ?? []).map((row) => {
    const membership = row as MembershipRow;
    return {
      ...membership,
      companies: normalizeMembershipCompany(membership.companies),
    };
  });

  // active_company_id is already corrected server-side by get_workspace_summary,
  // so pickActiveMembership will always resolve when memberships exist.
  const activeMembership = pickActiveMembership(memberships, profile.active_company_id);

  return { userId, profile, memberships, activeMembership };
}

/**
 * Legacy fallback for environments where the get_workspace_summary RPC is not
 * yet deployed.  Retained to keep local/staging development working during the
 * migration window.  Remove once the migration has been applied everywhere.
 */
async function loadWorkspaceSummaryLegacy(userId: string, email?: string | null): Promise<WorkspaceSummary> {
  const ensuredProfile = await ensureProfile(userId, email);

  const membershipsRes = await supabase
    .from("company_memberships")
    .select("id, company_id, user_id, role, invited_by, created_at, companies(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (membershipsRes.error) throw membershipsRes.error;

  const memberships: CompanyMembership[] = (membershipsRes.data ?? []).map((row) => {
    const membership = row as MembershipRow;
    return {
      ...membership,
      companies: normalizeMembershipCompany(membership.companies),
    };
  });

  let profile: Profile = ensuredProfile ?? buildFallbackProfile(userId, email);

  const profileRes = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profileRes.error && profileRes.data) {
    profile = profileRes.data as Profile;
  } else if (profileRes.error && !isMissingTableError(profileRes.error, "profiles")) {
    throw profileRes.error;
  }

  let activeMembership = pickActiveMembership(memberships, profile.active_company_id);

  if (memberships.length > 0 && !activeMembership) {
    const fallback = memberships[0];

    const { error } = await supabase.rpc("set_active_company", {
      p_company_id: fallback.company_id,
    });

    // If profile infrastructure is missing in this environment, keep UX working
    // by falling back to in-memory active company selection.
    if (error && !isMissingTableError(error, "profiles")) {
      throw error;
    }

    const { data: updatedProfile, error: updatedProfileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!updatedProfileError && updatedProfile) {
      profile = updatedProfile as Profile;
    } else if (updatedProfileError && !isMissingTableError(updatedProfileError, "profiles")) {
      throw updatedProfileError;
    } else {
      profile = {
        ...profile,
        active_company_id: fallback.company_id,
        updated_at: new Date().toISOString(),
      };
    }

    activeMembership = fallback;
  }

  return { userId, memberships, activeMembership, profile };
}

export async function setActiveCompany(companyId: string, userId?: string, oldCompanyId?: string): Promise<void> {
  if (userId && oldCompanyId) {
    clearWorkspaceSummaryCache(userId, oldCompanyId);
  }
  const { data, error } = await supabase.rpc("set_active_company", { p_company_id: companyId });
  if (error) {
    if (isMissingTableError(error, "profiles")) return;
    throw error;
  }
  if (data !== true) {
    throw new Error("Unable to set active company.");
  }
}

export async function setActiveSite(siteId: string): Promise<void> {
  const { data, error } = await supabase.rpc("set_active_site", { p_site_id: siteId });
  if (error) {
    if (isMissingTableError(error, "profiles")) return;
    throw error;
  }
  if (data !== true) {
    throw new Error("Unable to set active site.");
  }
}

export async function createCompany(companyName: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_company_with_owner", {
    p_company_name: companyName,
  });

  if (error) throw error;
  if (!data) throw new Error("Company was not created.");

  return data as string;
}

export async function acceptCompanyInvitation(tokenOrCode: string): Promise<AcceptCompanyInvitationResult> {
  const { data, error } = await supabase.rpc("accept_company_invitation", {
    p_token_or_code: tokenOrCode,
  });

  if (error) throw error;

  const payload = data as { success?: boolean; message?: string; company_id?: string } | null;
  return {
    success: !!payload?.success,
    message: payload?.message,
    company_id: payload?.company_id,
  };
}

export async function inspectCompanyInvitation(tokenOrCode: string): Promise<CompanyInvitationInspection> {
  const trimmed = tokenOrCode.trim();

  const { data, error } = await supabase
    .from("company_invitations")
    .select("company_id, expires_at, status")
    .or(`token.eq.${trimmed},invite_code.eq.${trimmed}`)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      exists: false,
      isExpired: false,
      status: null,
      expiresAt: null,
      companyId: null,
    };
  }

  return {
    exists: true,
    isExpired: new Date(data.expires_at).getTime() < Date.now(),
    status: data.status as CompanyInvitation["status"],
    expiresAt: data.expires_at as string,
    companyId: (data.company_id as string | null) ?? null,
  };
}

export async function createCompanyInvitation(
  companyId: string,
  email: string,
  role: "owner" | "admin" | "manager" | "member"
): Promise<Pick<CompanyInvitation, "id" | "token" | "invite_code" | "expires_at">> {
  const { data, error } = await supabase.rpc("create_company_invitation", {
    p_company_id: companyId,
    p_email: email,
    p_role: role,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Failed to create invitation.");

  return row as Pick<CompanyInvitation, "id" | "token" | "invite_code" | "expires_at">;
}

/**
 * Shared utility for handling is_active column fallback.
 * Gracefully handles cases where the is_active column doesn't exist yet (migration pending).
 * Maps sites to include is_active: true when the column is missing.
 */
function applyIsActiveFallback(sites: unknown[]): Site[] {
  return (sites ?? []).map((s) => ({
    ...(s as Record<string, unknown>),
    is_active: true,
  })) as Site[];
}

export async function fetchCompanySites(companyId: string): Promise<Site[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("id, company_id, project_id, name, slug, logo_url, is_active, timezone, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (!error) return (data ?? []) as Site[];

  // Graceful fallback: is_active column not yet added (migration 20260314 pending)
  if (referencesColumn(error, "is_active")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("sites")
      .select("id, company_id, project_id, name, slug, logo_url, timezone, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });

    if (fallbackError) throw fallbackError;
    return applyIsActiveFallback(fallbackData ?? []);
  }

  throw error;
}

/** Sites that belong to a specific project */
export async function fetchProjectSites(projectId: string): Promise<Site[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("id, company_id, project_id, name, slug, logo_url, is_active, timezone, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (!error) return (data ?? []) as Site[];

  // Graceful fallback: is_active column not yet added (migration 20260314 pending)
  if (referencesColumn(error, "is_active")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("sites")
      .select("id, company_id, project_id, name, slug, logo_url, timezone, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (fallbackError) throw fallbackError;
    return applyIsActiveFallback(fallbackData ?? []);
  }

  throw error;
}

export async function updateSite(
  siteId: string,
  patch: { name?: string; slug?: string; is_active?: boolean; timezone?: string }
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.slug !== undefined) payload.slug = patch.slug;
  if (patch.is_active !== undefined) payload.is_active = patch.is_active;
  if (patch.timezone !== undefined) payload.timezone = patch.timezone;

  const { error } = await supabase.from("sites").update(payload).eq("id", siteId);
  if (error) throw error;
}

function toSlug(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "site"}-${suffix}`;
}

export async function createProjectSite(
  projectId: string,
  companyId: string,
  name: string,
  timezone?: string
): Promise<Site> {
  const slug = toSlug(name);
  const { data, error } = await supabase
    .from("sites")
    .insert({
      company_id: companyId,
      project_id: projectId,
      name: name.trim(),
      slug,
      timezone: timezone || "Australia/Sydney",
    })
    .select("id, company_id, project_id, name, slug, logo_url, is_active, timezone, created_at")
    .single();

  if (error) throw error;
  return data as Site;
}

export async function updateSiteProject(
  siteId: string,
  projectId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("sites")
    .update({ project_id: projectId })
    .eq("id", siteId);
  if (error) throw error;
}

export async function fetchCompanyProjects(companyId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, company_id, name, description, status, created_by, created_at, updated_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (!error) return (data ?? []) as Project[];

  // Graceful fallback: if description column doesn't exist yet
  if (referencesColumn(error, "description")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("projects")
      .select("id, company_id, name, status, created_by, created_at, updated_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (fallbackError) throw fallbackError;
    return (fallbackData ?? []).map((p) => ({ ...(p as Record<string, unknown>), description: null })) as Project[];
  }

  throw error;
}

/**
 * Projects with site_count and plan_count aggregated by the database RPC.
 * Replaces three separate queries + client-side filter loops with a single
 * get_projects_with_counts() call that uses COUNT/GROUP BY server-side.
 */
export async function fetchCompanyProjectsWithCounts(companyId: string): Promise<ProjectWithCounts[]> {
  const { data, error } = await supabase.rpc("get_projects_with_counts", {
    p_company_id: companyId,
  });

  if (error) throw error;

  return (data ?? []).map((row: {
    id: string;
    company_id: string;
    name: string;
    description: string | null;
    status: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    site_count: number;
    plan_count: number;
  }) => ({
    id: row.id,
    company_id: row.company_id,
    name: row.name,
    description: row.description,
    status: row.status as Project["status"],
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    site_count: Number(row.site_count),
    plan_count: Number(row.plan_count),
  }));
}

export async function createProject(
  companyId: string,
  name: string,
  description?: string | null,
  userId?: string | null
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      name: name.trim(),
      description: description?.trim() || null,
      status: "active",
      created_by: userId ?? null,
    })
    .select("id, company_id, name, description, status, created_by, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as Project;
}

export async function updateProject(
  projectId: string,
  patch: { name?: string; description?: string | null; status?: Project["status"] }
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
  if (patch.status !== undefined) payload.status = patch.status;

  const { error } = await supabase.from("projects").update(payload).eq("id", projectId);
  if (error) throw error;
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function fetchSiteVisitsForCompanySite(companyId: string, siteId: string): Promise<SiteVisit[]> {
  const scoped = await supabase
    .from("site_visits")
    .select("*")
    .eq("site_id", siteId)
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .order("signed_in_at", { ascending: false });

  if (!scoped.error) {
    return (scoped.data ?? []) as SiteVisit[];
  }

  // Legacy databases may not have company_id on site_visits yet.
  // Fall back to the site-scoped query so existing registers still load.
  if (referencesColumn(scoped.error, "company_id")) {
    const legacy = await supabase
      .from("site_visits")
      .select("*")
      .eq("site_id", siteId)
      .order("signed_in_at", { ascending: false });

    if (legacy.error) throw legacy.error;
    return (legacy.data ?? []) as SiteVisit[];
  }

  throw scoped.error;
}

export async function fetchCompanyTeam(companyId: string): Promise<CompanyMembership[]> {
  const { data, error } = await supabase
    .from("company_memberships")
    .select("id, company_id, user_id, role, invited_by, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const memberships = (data ?? []) as CompanyMembership[];
  if (memberships.length === 0) return memberships;

  const uniqueUserIds = Array.from(new Set(memberships.map((member) => member.user_id)));
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", uniqueUserIds);

  if (profileError) {
    if (isMissingTableError(profileError, "profiles")) {
      return memberships.map((member) => ({ ...member, profiles: null }));
    }
    throw profileError;
  }

  const profileMap = new Map<string, { id: string; email: string | null; full_name: string | null }>();
  for (const profile of profileRows ?? []) {
    profileMap.set(profile.id as string, {
      id: profile.id as string,
      email: (profile.email as string | null) ?? null,
      full_name: (profile.full_name as string | null) ?? null,
    });
  }

  return memberships.map((member) => ({
    ...member,
    profiles: profileMap.get(member.user_id) ?? null,
  }));
}

export async function fetchCompanyInvitations(companyId: string): Promise<CompanyInvitation[]> {
  const { data, error } = await supabase
    .from("company_invitations")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as CompanyInvitation[];
}

export async function updateProfile(
  userId: string,
  patch: { full_name?: string | null; phone_number?: string | null }
): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.full_name !== undefined) payload.full_name = patch.full_name?.trim() || null;
  if (patch.phone_number !== undefined) payload.phone_number = patch.phone_number?.trim() || null;

  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) throw error;
}

export async function updateCompany(
  companyId: string,
  patch: { name?: string }
): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) payload.name = patch.name.trim();

  const { error } = await supabase.from("companies").update(payload).eq("id", companyId);
  if (error) throw error;
}

export async function getSiteById(siteId: string): Promise<Site | null> {
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .single();
  if (error) {
    console.error("[workspace/client] getSiteById error:", error.message);
    return null;
  }
  return data as Site;
}

export interface UploadSiteLogoResult {
  success: true;
  logo_url: string;
}

export interface UploadSiteLogoError {
  success: false;
  error: string;
}

export async function uploadSiteLogo(
  siteId: string,
  file: File
): Promise<UploadSiteLogoResult | UploadSiteLogoError> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    return { success: false, error: "Not authenticated" };
  }

  const formData = new FormData();
  formData.append("site_id", siteId);
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload-site-logo", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Upload failed: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, logo_url: data.logo_url };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed. Please try again.",
    };
  }
}

export async function removeSiteLogo(siteId: string): Promise<void> {
  const { error } = await supabase.from("sites").update({ logo_url: null }).eq("id", siteId);
  if (error) throw error;
}

/** Count active (signed-in) workers across multiple sites */
export async function countActiveWorkersForSites(siteIds: string[]): Promise<number> {
  if (siteIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("site_visits")
    .select("*", { count: "exact", head: true })
    .in("site_id", siteIds)
    .is("signed_out_at", null);

  if (error) {
    // Graceful fallback: if signed_out_at column doesn't exist
    if (referencesColumn(error, "signed_out_at")) {
      return 0;
    }
    throw error;
  }

  return count ?? 0;
}

export interface BulkOperationResult {
  success: boolean;
  action: "move" | "archive" | "restore";
  moved?: number;
  archived?: number;
  restored?: number;
  sites?: { id: string; name: string; project_id?: string | null }[];
  error?: string;
}

/** Perform bulk operations on sites (move, archive, restore) */
export async function performBulkSiteOperation(
  action: "move" | "archive" | "restore",
  siteIds: string[],
  targetProjectId?: string | null
): Promise<BulkOperationResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  
  if (!accessToken) {
    return { success: false, action, error: "Not authenticated" };
  }

  try {
    const response = await fetch("/api/sites/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action,
        siteIds,
        targetProjectId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        action,
        error: errorData.error || `Operation failed: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      action,
      ...data,
    };
  } catch (err) {
    return {
      success: false,
      action,
      error: err instanceof Error ? err.message : "Operation failed",
    };
  }
}

// Simple wrappers for diary creation modal
export async function getProjects(companyId: string): Promise<Project[]> {
  return fetchCompanyProjects(companyId);
}

export async function getSites(companyId: string): Promise<Site[]> {
  return fetchCompanySites(companyId);
}

/** Delete a company permanently (owner only) */
export async function deleteCompany(companyId: string): Promise<void> {
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", companyId);

  if (error) throw error;
}

// ── SiteSign — Daily Briefings ────────────────────────────────────────────────

/**
 * Fetch the currently active briefing for a site (anon-safe).
 * Returns null if no active briefing exists.
 */
export async function getActiveBriefingForSite(siteId: string): Promise<SiteDailyBriefing | null> {
  const { data, error } = await supabase
    .from("site_daily_briefings")
    .select("*")
    .eq("site_id", siteId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Fetch all briefings for a site (authenticated). */
export async function getBriefingsForSite(siteId: string): Promise<SiteDailyBriefing[]> {
  const { data, error } = await supabase
    .from("site_daily_briefings")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Create or update a briefing. Pass id to update, omit to create. */
export async function upsertBriefing(payload: UpsertBriefingPayload): Promise<SiteDailyBriefing> {
  const { data, error } = await supabase
    .from("site_daily_briefings")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Activate a briefing for a site, deactivating any others first.
 * Safe to call even if the briefing is already active.
 */
export async function activateBriefing(id: string, siteId: string): Promise<void> {
  // Deactivate all briefings for this site first
  const { error: deactivateError } = await supabase
    .from("site_daily_briefings")
    .update({ is_active: false })
    .eq("site_id", siteId)
    .neq("id", id);

  if (deactivateError) throw deactivateError;

  // Activate the target briefing
  const { error } = await supabase
    .from("site_daily_briefings")
    .update({ is_active: true })
    .eq("id", id);

  if (error) throw error;
}

/** Deactivate a briefing. */
export async function deactivateBriefing(id: string): Promise<void> {
  const { error } = await supabase
    .from("site_daily_briefings")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}

// ── SiteSign — Site Inductions ────────────────────────────────────────────────

/**
 * Fetch the currently active induction for a site (anon-safe).
 * Returns null if no active induction exists.
 */
export async function getActiveInductionForSite(siteId: string): Promise<SiteInduction | null> {
  const { data, error } = await supabase
    .from("site_inductions")
    .select("*")
    .eq("site_id", siteId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Fetch the induction record for a site (authenticated, regardless of active state). */
export async function getInductionForSite(siteId: string): Promise<SiteInduction | null> {
  const { data, error } = await supabase
    .from("site_inductions")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Create or update a site induction. Pass id to update, omit to create. */
export async function upsertInduction(payload: UpsertInductionPayload): Promise<SiteInduction> {
  const { data, error } = await supabase
    .from("site_inductions")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Activate the induction for a site. */
export async function activateInduction(id: string): Promise<void> {
  const { error } = await supabase
    .from("site_inductions")
    .update({ is_active: true })
    .eq("id", id);

  if (error) throw error;
}

/** Deactivate the induction for a site. */
export async function deactivateInduction(id: string): Promise<void> {
  const { error } = await supabase
    .from("site_inductions")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}
