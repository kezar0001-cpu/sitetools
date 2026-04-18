import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ActivityFeedItem, ActivityType } from "@/lib/dashboard/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ACTIVITY_LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

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

    // Fetch recent activity from multiple sources
    const activities: ActivityFeedItem[] = [];

    // 1. Recent site diaries (created and completed)
    const { data: diaries, error: diariesError } = await supabaseAdmin
      .from("site_diaries")
      .select(`
        id,
        date,
        status,
        notes,
        created_at,
        completed_at,
        sites(name),
        projects(name),
        profiles:created_by(full_name)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!diariesError && diaries) {
      for (const diary of diaries) {
        const siteName = (diary.sites as any)?.name ?? null;
        const projectName = (diary.projects as any)?.name ?? null;
        const userName = (diary.profiles as any)?.full_name ?? null;

        // Created activity
        activities.push({
          id: `diary-created-${diary.id}`,
          type: "diary_created" as ActivityType,
          title: "Daily diary created",
          description: diary.notes ? `${diary.notes.slice(0, 100)}${diary.notes.length > 100 ? "..." : ""}` : null,
          siteName,
          projectName,
          userName,
          createdAt: diary.created_at,
          link: `/dashboard/site-capture/${diary.id}`,
        });

        // Completed activity (if different from created)
        if (diary.completed_at && diary.status === "completed") {
          activities.push({
            id: `diary-completed-${diary.id}`,
            type: "diary_completed" as ActivityType,
            title: "Daily diary completed",
            description: `Diary for ${diary.date} marked as complete`,
            siteName,
            projectName,
            userName,
            createdAt: diary.completed_at,
            link: `/dashboard/site-capture/${diary.id}`,
          });
        }
      }
    }

    // 2. Recent photos uploaded
    const { data: photos, error: photosError } = await supabaseAdmin
      .from("site_diary_photos")
      .select(`
        id,
        caption,
        created_at,
        site_diaries!inner(id, company_id, sites(name), projects(name)),
        profiles:uploaded_by(full_name)
      `)
      .eq("site_diaries.company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!photosError && photos) {
      for (const photo of photos) {
        const diaryData = photo.site_diaries as any;
        activities.push({
          id: `photo-${photo.id}`,
          type: "photo_uploaded" as ActivityType,
          title: "Photo uploaded",
          description: photo.caption || "New site photo added",
          siteName: diaryData?.sites?.name ?? null,
          projectName: diaryData?.projects?.name ?? null,
          userName: (photo.profiles as any)?.full_name ?? null,
          createdAt: photo.created_at,
          link: `/dashboard/site-capture/${diaryData?.id}`,
        });
      }
    }

    // 3. Recent prestart checklists
    const { data: prestarts, error: prestartsError } = await supabaseAdmin
      .from("prestart_checklists")
      .select(`
        id,
        plant_details,
        status,
        created_at,
        completed_at,
        sites(name),
        projects(name),
        profiles:created_by(full_name)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!prestartsError && prestarts) {
      for (const prestart of prestarts) {
        const plantDetails = prestart.plant_details as any;
        const equipmentType = plantDetails?.equipmentType || "Equipment";
        
        activities.push({
          id: `prestart-${prestart.id}`,
          type: "prestart_submitted" as ActivityType,
          title: `Prestart checklist: ${equipmentType}`,
          description: `Operator: ${plantDetails?.operatorName || "Unknown"}`,
          siteName: (prestart.sites as any)?.name ?? null,
          projectName: (prestart.projects as any)?.name ?? null,
          userName: (prestart.profiles as any)?.full_name ?? null,
          createdAt: prestart.completed_at || prestart.created_at,
          link: `/dashboard/site-capture/${prestart.id}`,
        });
      }
    }

    // 4. Recent site visits (sign ins)
    const { data: visits, error: visitsError } = await supabaseAdmin
      .from("site_visits")
      .select(`
        id,
        worker_name,
        signed_in_at,
        signed_out_at,
        sites!inner(name, company_id),
        profiles:user_id(full_name)
      `)
      .eq("sites.company_id", companyId)
      .order("signed_in_at", { ascending: false })
      .limit(10);

    if (!visitsError && visits) {
      for (const visit of visits) {
        const siteName = (visit.sites as any)?.name ?? null;
        
        // Sign in activity
        if (visit.signed_in_at) {
          activities.push({
            id: `signin-${visit.id}`,
            type: "sign_in" as ActivityType,
            title: `${visit.worker_name || (visit.profiles as any)?.full_name || "Worker"} signed in`,
            description: "Arrived on site",
            siteName,
            projectName: null,
            userName: visit.worker_name || (visit.profiles as any)?.full_name || null,
            createdAt: visit.signed_in_at,
            link: `/dashboard/site-sign-in`,
          });
        }

        // Sign out activity
        if (visit.signed_out_at) {
          activities.push({
            id: `signout-${visit.id}`,
            type: "sign_out" as ActivityType,
            title: `${visit.worker_name || (visit.profiles as any)?.full_name || "Worker"} signed out`,
            description: "Left site",
            siteName,
            projectName: null,
            userName: visit.worker_name || (visit.profiles as any)?.full_name || null,
            createdAt: visit.signed_out_at,
            link: `/dashboard/site-sign-in`,
          });
        }
      }
    }

    // 5. Recent ITP sign-offs
    const { data: itpSignoffs, error: itpError } = await supabaseAdmin
      .from("itp_signoffs")
      .select(`
        id,
        signed_at,
        itp_sessions!inner(id, title, company_id),
        profiles:signed_by(full_name)
      `)
      .eq("itp_sessions.company_id", companyId)
      .order("signed_at", { ascending: false })
      .limit(10);

    if (!itpError && itpSignoffs) {
      for (const signoff of itpSignoffs) {
        const sessionData = signoff.itp_sessions as any;
        activities.push({
          id: `itp-signoff-${signoff.id}`,
          type: "itp_signed" as ActivityType,
          title: "ITP signed off",
          description: sessionData?.title || "Inspection Test Plan signed",
          siteName: null,
          projectName: null,
          userName: (signoff.profiles as any)?.full_name ?? null,
          createdAt: signoff.signed_at,
          link: `/dashboard/site-itp/${sessionData?.id}`,
        });
      }
    }

    // Sort all activities by createdAt descending and take the most recent
    const sortedActivities = activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, ACTIVITY_LIMIT);

    return NextResponse.json(sortedActivities);
  } catch (err) {
    console.error("[dashboard/activity] unexpected error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
