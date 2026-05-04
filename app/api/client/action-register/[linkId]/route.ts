import { NextRequest, NextResponse } from "next/server";
import { isValidActionRegisterToken } from "@/lib/site-docs/action-register-links";
import { createSupabaseAdmin, fetchActionItems } from "@/lib/site-docs/action-register-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LinkRow = {
    id: string;
    company_id: string;
    project_id: string;
    token_hash: string;
    recipient_name: string | null;
    recipient_email: string | null;
    recipient_organisation: string | null;
    role: string;
    identity_confirmed_at: string | null;
    permissions: Record<string, boolean>;
    expires_at: string | null;
    revoked_at: string | null;
    created_at: string;
    projects?: { name?: string | null } | { name?: string | null }[] | null;
    companies?: { name?: string | null } | { name?: string | null }[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function getValidatedLink(linkId: string, token: string | null) {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from("site_action_register_links")
        .select("*, projects(name), companies(name)")
        .eq("id", linkId)
        .maybeSingle();

    if (error || !data) {
        return { error: NextResponse.json({ error: "Client link not found." }, { status: 404 }) };
    }

    const link = data as LinkRow;
    if (!isValidActionRegisterToken(token, link.token_hash)) {
        return { error: NextResponse.json({ error: "Invalid client link." }, { status: 403 }) };
    }

    if (link.revoked_at) {
        return { error: NextResponse.json({ error: "This client link has been revoked." }, { status: 403 }) };
    }

    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
        return { error: NextResponse.json({ error: "This client link has expired." }, { status: 403 }) };
    }

    return { link, supabaseAdmin };
}

function publicLinkPayload(link: LinkRow) {
    const project = firstRelation(link.projects);
    const company = firstRelation(link.companies);
    return {
        id: link.id,
        project_id: link.project_id,
        company_id: link.company_id,
        project_name: project?.name ?? "Project action register",
        company_name: company?.name ?? "Buildstate",
        recipient_name: link.recipient_name,
        recipient_email: link.recipient_email,
        recipient_organisation: link.recipient_organisation,
        role: link.role,
        identity_confirmed_at: link.identity_confirmed_at,
        permissions: link.permissions,
    };
}

export async function GET(req: NextRequest, { params }: { params: { linkId: string } }) {
    try {
        const token = req.nextUrl.searchParams.get("token");
        const result = await getValidatedLink(params.linkId, token);
        if (result.error) return result.error;

        const { link, supabaseAdmin } = result;
        const identityConfirmed = !!link.identity_confirmed_at;
        const actions = identityConfirmed
            ? await fetchActionItems(supabaseAdmin, link.company_id, link.project_id)
            : [];

        return NextResponse.json({
            link: publicLinkPayload(link),
            identityConfirmed,
            actions,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to load client action register." },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest, { params }: { params: { linkId: string } }) {
    try {
        const body = await req.json().catch(() => null) as {
            token?: string;
            name?: string;
            organisation?: string;
            email?: string;
        } | null;

        const result = await getValidatedLink(params.linkId, body?.token ?? null);
        if (result.error) return result.error;

        const { link, supabaseAdmin } = result;
        const name = body?.name?.trim();
        const organisation = body?.organisation?.trim();
        const email = body?.email?.trim() || null;

        if (!link.identity_confirmed_at && (!name || !organisation)) {
            return NextResponse.json({ error: "Name and organisation are required." }, { status: 400 });
        }

        if (!link.identity_confirmed_at) {
            const { data: updatedLink, error } = await supabaseAdmin
                .from("site_action_register_links")
                .update({
                    recipient_name: name,
                    recipient_email: email,
                    recipient_organisation: organisation,
                    identity_confirmed_at: new Date().toISOString(),
                })
                .eq("id", link.id)
                .select("*, projects(name), companies(name)")
                .single();

            if (error || !updatedLink) {
                return NextResponse.json({ error: error?.message || "Failed to confirm identity." }, { status: 500 });
            }

            const nextLink = updatedLink as LinkRow;
            const actions = await fetchActionItems(supabaseAdmin, nextLink.company_id, nextLink.project_id);
            return NextResponse.json({ link: publicLinkPayload(nextLink), identityConfirmed: true, actions });
        }

        const actions = await fetchActionItems(supabaseAdmin, link.company_id, link.project_id);
        return NextResponse.json({ link: publicLinkPayload(link), identityConfirmed: true, actions });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to confirm identity." },
            { status: 500 }
        );
    }
}