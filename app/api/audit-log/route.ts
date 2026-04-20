import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export interface AuditLogEntry {
  id: string;
  entity_type: 'profile' | 'company' | 'membership' | 'site' | 'project' | 'invitation';
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'invite' | 'accept' | 'revoke';
  performed_by: {
    user_id: string;
    email: string | null;
    full_name: string | null;
  };
  changes: {
    field: string;
    old_value: unknown;
    new_value: unknown;
  }[];
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ProfileAuditRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  updated_at: string;
  created_at: string;
}

interface MembershipAuditRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
    email: string | null;
    full_name: string | null;
  } | {
    email: string | null;
    full_name: string | null;
  }[] | null;
}

interface InvitationAuditRow {
  id: string;
  email: string;
  role: string;
  status: string;
  invited_by: string;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
}

interface InviterProfileRow {
  email: string | null;
  full_name: string | null;
}

interface SiteAuditRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectAuditRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AuditLogResponse {
  entries: AuditLogEntry[];
  hasMore: boolean;
  totalCount: number;
}

// Build audit log from actual database changes
async function buildAuditLog(
  supabaseAdmin: SupabaseClient,
  companyId: string,
  userId: string,
  limit: number = 50,
  cursor?: string
): Promise<AuditLogResponse> {
  const entries: AuditLogEntry[] = [];

  // Calculate date threshold if cursor provided
  const cursorDate = cursor ? new Date(cursor) : null;

  // 1. Profile updates - fetch user's own profile history via updated_at
  const { data: profileHistory } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, phone_number, updated_at, created_at")
    .eq("id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (profileHistory && profileHistory.length > 0) {
    const profile = profileHistory[0] as ProfileAuditRow;
    // Only include if there's a meaningful update (not just created)
    if (profile.updated_at !== profile.created_at) {
      entries.push({
        id: `profile-update-${profile.id}-${profile.updated_at}`,
        entity_type: 'profile',
        entity_id: profile.id,
        action: 'update',
        performed_by: {
          user_id: userId,
          email: profile.email,
          full_name: profile.full_name,
        },
        changes: [], // Profile doesn't track individual field changes, just timestamps
        metadata: {
          updated_at: profile.updated_at,
          note: "Profile information updated",
        },
        created_at: profile.updated_at,
      });
    }
  }

  // 2. Company membership events
  const { data: memberships } = await supabaseAdmin
    .from("company_memberships")
    .select("id, user_id, role, created_at, profiles(email, full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (memberships) {
    for (const membership of memberships as MembershipAuditRow[]) {
      const rawProfileData = Array.isArray(membership.profiles)
        ? membership.profiles[0] ?? null
        : membership.profiles;
      const profileData = rawProfileData ?? null;

      entries.push({
        id: `membership-${membership.id}`,
        entity_type: 'membership',
        entity_id: membership.id,
        action: 'create',
        performed_by: {
          user_id: membership.user_id,
          email: profileData?.email || null,
          full_name: profileData?.full_name || null,
        },
        changes: [{
          field: 'role',
          old_value: null,
          new_value: membership.role,
        }],
        metadata: {
          role: membership.role,
        },
        created_at: membership.created_at,
      });
    }
  }

  // 3. Invitation events
  const { data: invitations } = await supabaseAdmin
    .from("company_invitations")
    .select("id, email, role, status, invited_by, created_at, expires_at, accepted_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (invitations) {
    for (const invitation of invitations as InvitationAuditRow[]) {
      // Get inviter info
      const { data: inviterProfileData } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", invitation.invited_by)
        .maybeSingle();
      const inviterProfile = inviterProfileData as InviterProfileRow | null;

      entries.push({
        id: `invitation-${invitation.id}`,
        entity_type: 'invitation',
        entity_id: invitation.id,
        action: invitation.accepted_at ? 'accept' : 'invite',
        performed_by: {
          user_id: invitation.invited_by,
          email: inviterProfile?.email || null,
          full_name: inviterProfile?.full_name || null,
        },
        changes: [{
          field: 'status',
          old_value: null,
          new_value: invitation.status,
        }],
        metadata: {
          invited_email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          accepted_at: invitation.accepted_at,
        },
        created_at: invitation.accepted_at || invitation.created_at,
      });
    }
  }

  // 4. Site changes
  const { data: sites } = await supabaseAdmin
    .from("sites")
    .select("id, name, is_active, created_at, updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (sites) {
    for (const site of sites as SiteAuditRow[]) {
      if (site.updated_at && site.updated_at !== site.created_at) {
        entries.push({
          id: `site-update-${site.id}`,
          entity_type: 'site',
          entity_id: site.id,
          action: 'update',
          performed_by: {
            user_id: userId,
            email: null,
            full_name: null,
          },
          changes: [],
          metadata: {
            site_name: site.name,
            is_active: site.is_active,
            updated_at: site.updated_at,
          },
          created_at: site.updated_at,
        });
      }
    }
  }

  // 5. Project changes
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("id, name, status, created_at, updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (projects) {
    for (const project of projects as ProjectAuditRow[]) {
      if (project.updated_at && project.updated_at !== project.created_at) {
        entries.push({
          id: `project-update-${project.id}`,
          entity_type: 'project',
          entity_id: project.id,
          action: 'update',
          performed_by: {
            user_id: userId,
            email: null,
            full_name: null,
          },
          changes: [{
            field: 'status',
            old_value: null,
            new_value: project.status,
          }],
          metadata: {
            project_name: project.name,
            status: project.status,
          },
          created_at: project.updated_at,
        });
      }
    }
  }

  // Sort all entries by created_at descending
  entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Apply cursor filter
  let filteredEntries = entries;
  if (cursorDate) {
    filteredEntries = entries.filter(e => new Date(e.created_at) < cursorDate);
  }

  // Take limit + 1 to determine if there are more
  const hasMore = filteredEntries.length > limit;
  const pageEntries = filteredEntries.slice(0, limit);

  return {
    entries: pageEntries,
    hasMore,
    totalCount: entries.length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    if (!companyId) {
      return NextResponse.json(
        { message: "companyId is required" },
        { status: 400 }
      );
    }

    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const token = authHeader.slice(7);

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user has access to this company
    const { data: membership } = await supabaseAdmin
      .from("company_memberships")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { message: "Forbidden: You do not have access to this company" },
        { status: 403 }
      );
    }

    // Build and return audit log
    const auditLog = await buildAuditLog(supabaseAdmin, companyId, user.id, limit, cursor);

    return NextResponse.json(auditLog);
  } catch (err) {
    console.error("[audit-log] unexpected error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
