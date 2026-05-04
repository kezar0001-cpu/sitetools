import { NextRequest, NextResponse } from "next/server";
import {
    assertProjectBelongsToCompany,
    createSupabaseAdmin,
    fetchActionItemById,
    fetchActionItems,
    isActionStatus,
    normalizeActionStatus,
    normalizeDateOnly,
    requireInternalUser,
} from "@/lib/site-docs/action-register-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function trimOrNull(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export async function GET(req: NextRequest) {
    try {
        const companyId = req.nextUrl.searchParams.get("companyId");
        const projectId = req.nextUrl.searchParams.get("projectId");

        if (!companyId) {
            return NextResponse.json({ error: "companyId is required." }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin();
        const userContext = await requireInternalUser(req, supabaseAdmin, companyId);
        if (userContext instanceof Response) return userContext;

        if (projectId) {
            const project = await assertProjectBelongsToCompany(supabaseAdmin, companyId, projectId);
            if (project instanceof Response) return project;
        }

        const actions = await fetchActionItems(supabaseAdmin, companyId, projectId);
        return NextResponse.json({ actions });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to load actions." },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null) as {
            company_id?: string;
            project_id?: string | null;
            description?: string;
            responsible?: string | null;
            due_date?: string | null;
            status?: string;
        } | null;

        const companyId = body?.company_id;
        const description = body?.description?.trim();
        if (!companyId || !description) {
            return NextResponse.json({ error: "Company and description are required." }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin();
        const userContext = await requireInternalUser(req, supabaseAdmin, companyId);
        if (userContext instanceof Response) return userContext;

        const projectId = trimOrNull(body?.project_id);
        if (projectId) {
            const project = await assertProjectBelongsToCompany(supabaseAdmin, companyId, projectId);
            if (project instanceof Response) return project;
        }

        const status = body?.status && isActionStatus(body.status) ? body.status : normalizeActionStatus(body?.status);

        const { data, error } = await supabaseAdmin
            .from("site_action_items")
            .insert({
                company_id: companyId,
                project_id: projectId,
                source: "manual",
                description,
                responsible: trimOrNull(body?.responsible),
                due_date: normalizeDateOnly(body?.due_date),
                status,
                created_by: userContext.user.id,
            })
            .select("id")
            .single();

        if (error || !data) {
            return NextResponse.json({ error: error?.message || "Failed to create action." }, { status: 500 });
        }

        const action = await fetchActionItemById(supabaseAdmin, data.id as string);
        return NextResponse.json({ action }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create action." },
            { status: 500 }
        );
    }
}