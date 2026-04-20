import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

interface CompanyDataExport {
  export_metadata: {
    exported_at: string;
    exported_by: string;
    company_id: string;
    company_name: string;
    format_version: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    phone_number: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  membership: {
    id: string;
    role: string;
    created_at: string;
  } | null;
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  sites: Array<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    timezone: string;
    is_active: boolean;
    project_id: string | null;
    created_at: string;
  }>;
  team_members: Array<{
    id: string;
    user_id: string;
    role: string;
    email: string | null;
    full_name: string | null;
    created_at: string;
  }>;
  site_diaries: Array<{
    id: string;
    date: string;
    status: string;
    form_type: string | null;
    weather: Record<string, unknown> | null;
    work_completed: string | null;
    planned_works: string | null;
    notes: string | null;
    site_id: string;
    project_id: string | null;
    created_at: string;
    completed_at: string | null;
    labor: unknown[];
    equipment: unknown[];
    issues: unknown[];
    photos: unknown[];
  }>;
  site_visits: Array<{
    id: string;
    full_name: string;
    phone_number: string | null;
    company_name: string;
    visitor_type: string;
    signed_in_at: string;
    signed_out_at: string | null;
    site_id: string;
    created_at: string;
  }>;
  prestart_checklists: Array<{
    id: string;
    plant_details: Record<string, unknown> | null;
    status: string;
    checklist_items: unknown[];
    defects: unknown[];
    site_id: string;
    project_id: string | null;
    created_at: string;
    completed_at: string | null;
  }>;
  itp_records: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    current_version: number;
    project_id: string | null;
    created_at: string;
    updated_at: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    file_path: string;
    status: string;
    parsed_content: string | null;
    project_id: string | null;
    created_at: string;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    invite_code: string | null;
    created_at: string;
    expires_at: string;
  }>;
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
    const format = searchParams.get("format") || "json";

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
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_memberships")
      .select("role, id, created_at")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json(
        { message: "Forbidden: You do not have access to this company" },
        { status: 403 }
      );
    }

    // Fetch company data
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, name, slug, logo_url, created_at, updated_at")
      .eq("id", companyId)
      .single();

    if (companyError) {
      console.error("[export-company-data] company fetch error:", companyError);
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, phone_number, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[export-company-data] profile fetch error:", profileError);
    }

    // Fetch projects
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from("projects")
      .select("id, name, description, status, created_at, updated_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (projectsError) {
      console.error("[export-company-data] projects fetch error:", projectsError);
    }

    // Fetch sites
    const { data: sites, error: sitesError } = await supabaseAdmin
      .from("sites")
      .select("id, name, slug, logo_url, timezone, is_active, project_id, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (sitesError) {
      console.error("[export-company-data] sites fetch error:", sitesError);
    }

    // Fetch team members
    const { data: teamMemberships, error: teamError } = await supabaseAdmin
      .from("company_memberships")
      .select("id, user_id, role, created_at, profiles(email, full_name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });

    if (teamError) {
      console.error("[export-company-data] team fetch error:", teamError);
    }

    // Fetch site diaries with related data
    const { data: diaries, error: diariesError } = await supabaseAdmin
      .from("site_diaries")
      .select(`
        id,
        date,
        status,
        form_type,
        weather,
        work_completed,
        planned_works,
        notes,
        site_id,
        project_id,
        created_at,
        completed_at,
        labor:site_diary_labor(*),
        equipment:site_diary_equipment(*),
        issues:site_diary_issues(*),
        photos:site_diary_photos(id, caption, storage_path, created_at)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (diariesError) {
      console.error("[export-company-data] diaries fetch error:", diariesError);
    }

    // Fetch site visits
    const { data: visits, error: visitsError } = await supabaseAdmin
      .from("site_visits")
      .select(`
        id,
        full_name,
        phone_number,
        company_name,
        visitor_type,
        signed_in_at,
        signed_out_at,
        site_id,
        created_at
      `)
      .eq("company_id", companyId)
      .order("signed_in_at", { ascending: false })
      .limit(5000);

    if (visitsError) {
      console.error("[export-company-data] visits fetch error:", visitsError);
    }

    // Fetch prestart checklists
    const { data: prestarts, error: prestartsError } = await supabaseAdmin
      .from("prestart_checklists")
      .select(`
        id,
        plant_details,
        status,
        checklist_items(*),
        defects(*),
        site_id,
        project_id,
        created_at,
        completed_at
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (prestartsError) {
      console.error("[export-company-data] prestarts fetch error:", prestartsError);
    }

    // Fetch ITP records
    const { data: itpRecords, error: itpError } = await supabaseAdmin
      .from("itp_records")
      .select("id, name, description, status, current_version, project_id, created_at, updated_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (itpError) {
      console.error("[export-company-data] ITP fetch error:", itpError);
    }

    // Fetch documents
    const { data: documents, error: docsError } = await supabaseAdmin
      .from("documents")
      .select("id, name, file_path, status, parsed_content, project_id, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (docsError) {
      console.error("[export-company-data] documents fetch error:", docsError);
    }

    // Fetch invitations
    const { data: invitations, error: invitesError } = await supabaseAdmin
      .from("company_invitations")
      .select("id, email, role, status, invite_code, created_at, expires_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (invitesError) {
      console.error("[export-company-data] invitations fetch error:", invitesError);
    }

    // Build export data
    const exportData: CompanyDataExport = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        exported_by: user.id,
        company_id: companyId,
        company_name: company?.name || "Unknown",
        format_version: "1.0",
      },
      company: company || null,
      profile: profile || null,
      membership: membership || null,
      projects: (projects || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      sites: (sites || []).map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        logo_url: s.logo_url,
        timezone: s.timezone,
        is_active: s.is_active ?? true,
        project_id: s.project_id,
        created_at: s.created_at,
      })),
      team_members: (teamMemberships || []).map(tm => ({
        id: tm.id,
        user_id: tm.user_id,
        role: tm.role,
        email: (tm.profiles as unknown as { email: string | null } | null)?.email || null,
        full_name: (tm.profiles as unknown as { full_name: string | null } | null)?.full_name || null,
        created_at: tm.created_at,
      })),
      site_diaries: (diaries || []).map(d => ({
        id: d.id,
        date: d.date,
        status: d.status,
        form_type: d.form_type,
        weather: d.weather as Record<string, unknown> | null,
        work_completed: d.work_completed,
        planned_works: d.planned_works,
        notes: d.notes,
        site_id: d.site_id,
        project_id: d.project_id,
        created_at: d.created_at,
        completed_at: d.completed_at,
        labor: (d as unknown as { labor: unknown[] }).labor || [],
        equipment: (d as unknown as { equipment: unknown[] }).equipment || [],
        issues: (d as unknown as { issues: unknown[] }).issues || [],
        photos: (d as unknown as { photos: unknown[] }).photos || [],
      })),
      site_visits: (visits || []).map(v => ({
        id: v.id,
        full_name: v.full_name,
        phone_number: v.phone_number,
        company_name: v.company_name,
        visitor_type: v.visitor_type,
        signed_in_at: v.signed_in_at,
        signed_out_at: v.signed_out_at,
        site_id: v.site_id,
        created_at: v.created_at,
      })),
      prestart_checklists: (prestarts || []).map(p => ({
        id: p.id,
        plant_details: p.plant_details as Record<string, unknown> | null,
        status: p.status,
        checklist_items: (p as unknown as { checklist_items: unknown[] }).checklist_items || [],
        defects: (p as unknown as { defects: unknown[] }).defects || [],
        site_id: p.site_id,
        project_id: p.project_id,
        created_at: p.created_at,
        completed_at: p.completed_at,
      })),
      itp_records: (itpRecords || []).map(i => ({
        id: i.id,
        name: i.name,
        description: i.description,
        status: i.status,
        current_version: i.current_version,
        project_id: i.project_id,
        created_at: i.created_at,
        updated_at: i.updated_at,
      })),
      documents: (documents || []).map(d => ({
        id: d.id,
        name: d.name,
        file_path: d.file_path,
        status: d.status,
        parsed_content: d.parsed_content,
        project_id: d.project_id,
        created_at: d.created_at,
      })),
      invitations: (invitations || []).map(i => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        invite_code: i.invite_code,
        created_at: i.created_at,
        expires_at: i.expires_at,
      })),
    };

    // Count records for metadata
    const recordCounts = {
      projects: exportData.projects.length,
      sites: exportData.sites.length,
      team_members: exportData.team_members.length,
      site_diaries: exportData.site_diaries.length,
      site_visits: exportData.site_visits.length,
      prestart_checklists: exportData.prestart_checklists.length,
      itp_records: exportData.itp_records.length,
      documents: exportData.documents.length,
      invitations: exportData.invitations.length,
    };

    // Sanitize filename
    const sanitizedCompanyName = (company?.name || "company")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `buildstate-export-${sanitizedCompanyName}-${timestamp}.json`;

    if (format === "json") {
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Record-Counts": JSON.stringify(recordCounts),
        },
      });
    }

    // Default to JSON
    return NextResponse.json({
      ...exportData,
      _record_counts: recordCounts,
    });
  } catch (err) {
    console.error("[export-company-data] unexpected error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
