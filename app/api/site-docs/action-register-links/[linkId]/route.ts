import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, requireInternalUser } from "@/lib/site-docs/action-register-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safe link type that excludes token_hash
interface SafeActionRegisterLink {
    id: string;
    company_id: string;
    project_id: string;
    recipient_name: string | null;
    recipient_email: string | null;
    recipient_organisation: string | null;
    role: string;
    identity_confirmed_at: string | null;
    expires_at: string | null;
    revoked_at: string | null;
    created_by: string | null;
    created_at: string;
    projects?: { name?: string | null } | { name?: string | null }[] | null;
}

function sanitizeLinkForResponse(link: Record<string, unknown>): SafeActionRegisterLink {
    // Explicitly exclude token_hash from the response
    delete link.token_hash;
    return link as unknown as SafeActionRegisterLink;
}

/**
 * PATCH /api/site-docs/action-register-links/[linkId]
 * Revokes a client link by setting revoked_at to now.
 * Requires authentication and company membership.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { linkId: string } }
) {
    try {
        const { linkId } = params;

        // Parse request body to get company_id for authorization
        const body = await req.json().catch(() => null) as {
            company_id?: string;
        } | null;

        const companyId = body?.company_id;
        if (!companyId) {
            return NextResponse.json(
                { error: "Company ID is required in request body." },
                { status: 400 }
            );
        }

        const supabaseAdmin = createSupabaseAdmin();

        // Verify user belongs to the company
        const userContext = await requireInternalUser(req, supabaseAdmin, companyId);
        if (userContext instanceof Response) return userContext;

        // Verify the link exists and belongs to this company
        const { data: existingLink, error: fetchError } = await supabaseAdmin
            .from("site_action_register_links")
            .select("*, projects(name)")
            .eq("id", linkId)
            .eq("company_id", companyId)
            .maybeSingle();

        if (fetchError) {
            return NextResponse.json(
                { error: fetchError.message },
                { status: 500 }
            );
        }

        if (!existingLink) {
            return NextResponse.json(
                { error: "Link not found or access denied." },
                { status: 404 }
            );
        }

        // Check if already revoked
        if (existingLink.revoked_at) {
            return NextResponse.json(
                { error: "Link is already revoked." },
                { status: 409 }
            );
        }

        // Revoke the link (soft delete by setting revoked_at)
        const { data: updatedLink, error: updateError } = await supabaseAdmin
            .from("site_action_register_links")
            .update({
                revoked_at: new Date().toISOString(),
            })
            .eq("id", linkId)
            .eq("company_id", companyId)
            .select("*, projects(name)")
            .single();

        if (updateError) {
            return NextResponse.json(
                { error: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            link: sanitizeLinkForResponse(updatedLink as Record<string, unknown>),
            message: "Link has been revoked successfully.",
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to revoke link." },
            { status: 500 }
        );
    }
}
