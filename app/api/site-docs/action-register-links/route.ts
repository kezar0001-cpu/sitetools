import { NextRequest, NextResponse } from "next/server";
import { buildActionRegisterClientUrl, createActionRegisterToken, hashActionRegisterToken } from "@/lib/site-docs/action-register-links";
import {
    assertProjectBelongsToCompany,
    createSupabaseAdmin,
    requireInternalUser,
} from "@/lib/site-docs/action-register-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function trimOrNull(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null) as {
            company_id?: string;
            project_id?: string;
            recipient_name?: string | null;
            recipient_email?: string | null;
            recipient_organisation?: string | null;
            expires_at?: string | null;
        } | null;

        const companyId = body?.company_id;
        const projectId = body?.project_id;
        if (!companyId || !projectId) {
            return NextResponse.json({ error: "Company and project are required." }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin();
        const userContext = await requireInternalUser(req, supabaseAdmin, companyId);
        if (userContext instanceof Response) return userContext;

        const project = await assertProjectBelongsToCompany(supabaseAdmin, companyId, projectId);
        if (project instanceof Response) return project;

        const token = createActionRegisterToken();
        const tokenHash = hashActionRegisterToken(token);

        const { data, error } = await supabaseAdmin
            .from("site_action_register_links")
            .insert({
                company_id: companyId,
                project_id: projectId,
                token_hash: tokenHash,
                recipient_name: trimOrNull(body?.recipient_name),
                recipient_email: trimOrNull(body?.recipient_email),
                recipient_organisation: trimOrNull(body?.recipient_organisation),
                expires_at: trimOrNull(body?.expires_at),
                permissions: { view: true, update_status: true, comment: true },
                created_by: userContext.user.id,
            })
            .select("id, company_id, project_id, recipient_name, recipient_email, recipient_organisation, role, identity_confirmed_at, permissions, expires_at, revoked_at, created_by, created_at")
            .single();

        if (error || !data) {
            return NextResponse.json({ error: error?.message || "Failed to create client link." }, { status: 500 });
        }

        return NextResponse.json({
            link: data,
            url: buildActionRegisterClientUrl(data.id as string, token, req.nextUrl.origin),
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create client link." },
            { status: 500 }
        );
    }
}