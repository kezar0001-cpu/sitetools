import { supabase } from "@/lib/supabase";
import {
  Company,
  CompanyInvitation,
  CompanyMembership,
  Profile,
  Project,
  Site,
  SiteVisit,
  WorkspaceSummary,
} from "@/lib/workspace/types";

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

export async function loadWorkspaceSummary(userId: string, email?: string | null): Promise<WorkspaceSummary> {
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

  return {
    userId,
    memberships,
    activeMembership,
    profile,
  };
}

export async function setActiveCompany(companyId: string): Promise<void> {
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

export async function acceptCompanyInvitation(tokenOrCode: string): Promise<{ success: boolean; message?: string; company_id?: string }> {
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

export async function fetchCompanySites(companyId: string): Promise<Site[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("id, company_id, name, slug, logo_url, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Site[];
}

export async function fetchCompanyProjects(companyId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, company_id, site_id, name, status, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function fetchSiteVisitsForCompanySite(companyId: string, siteId: string): Promise<SiteVisit[]> {
  const { data, error } = await supabase
    .from("site_visits")
    .select("*")
    .eq("company_id", companyId)
    .eq("site_id", siteId)
    .order("signed_in_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SiteVisit[];
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
