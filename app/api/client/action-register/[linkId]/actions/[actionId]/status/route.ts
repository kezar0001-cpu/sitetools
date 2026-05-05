import { NextRequest, NextResponse } from "next/server";
import { isValidActionRegisterToken } from "@/lib/site-docs/action-register-links";
import {
    createSupabaseAdmin,
    fetchActionItemById,
    isActionStatus,
    recordActionStatusUpdate,
} from "@/lib/site-docs/action-register-service";

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
};

export async function POST(
    req: NextRequest,
    { params }: { params: { linkId: string; actionId: string } }
) {
    try {
        const body = await req.json().catch(() => null) as { token?: string; status?: string; comment?: string } | null;
        if (!isActionStatus(body?.status)) {
            return NextResponse.json({ error: "Valid status is required." }, { status: 400 });
        }
        const comment = body?.comment?.trim();
        if (!comment) {
            return NextResponse.json({ error: "Comment is required." }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin();
        const { data: rawLink, error: linkError } = await supabaseAdmin
            .from("site_action_register_links")
            .select("*")
            .eq("id", params.linkId)
            .maybeSingle();

        if (linkError || !rawLink) {
            return NextResponse.json({ error: "Client link not found." }, { status: 404 });
        }

        const link = rawLink as LinkRow;
        if (!isValidActionRegisterToken(body?.token, link.token_hash)) {
            return NextResponse.json({ error: "Invalid client link." }, { status: 403 });
        }
        if (link.revoked_at || (link.expires_at && new Date(link.expires_at).getTime() < Date.now())) {
            return NextResponse.json({ error: "Client link is no longer active." }, { status: 403 });
        }
        if (!link.identity_confirmed_at || !link.recipient_name) {
            return NextResponse.json({ error: "Confirm your identity before updating actions." }, { status: 428 });
        }
        if (!link.permissions?.update_status) {
            return NextResponse.json({ error: "This link cannot update statuses." }, { status: 403 });
        }

        const action = await fetchActionItemById(supabaseAdmin, params.actionId);
        if (!action || action.company_id !== link.company_id) {
            return NextResponse.json({ error: "Action item not found for this register." }, { status: 404 });
        }

        const updatedAction = await recordActionStatusUpdate({
            supabaseAdmin,
            action,
            newStatus: body.status,
            comment,
            updatedByName: link.recipient_name,
            updatedByEmail: link.recipient_email,
            updatedByOrganisation: link.recipient_organisation,
            updatedByRole: link.role,
            source: "client_link",
        });

        return NextResponse.json({ action: updatedAction });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update action status." },
            { status: 500 }
        );
    }
}