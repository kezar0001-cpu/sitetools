import { NextRequest, NextResponse } from "next/server";
import {
    createSupabaseAdmin,
    fetchActionItemById,
    isActionStatus,
    recordActionStatusUpdate,
    requireInternalUser,
} from "@/lib/site-docs/action-register-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
    req: NextRequest,
    { params }: { params: { actionId: string } }
) {
    try {
        const body = await req.json().catch(() => null) as { status?: string; comment?: string } | null;
        if (!isActionStatus(body?.status)) {
            return NextResponse.json({ error: "Valid status is required." }, { status: 400 });
        }
        const comment = body?.comment?.trim();
        if (!comment) {
            return NextResponse.json({ error: "Comment is required." }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin();
        const action = await fetchActionItemById(supabaseAdmin, params.actionId);
        if (!action) {
            return NextResponse.json({ error: "Action item not found." }, { status: 404 });
        }

        const userContext = await requireInternalUser(req, supabaseAdmin, action.company_id);
        if (userContext instanceof Response) return userContext;

        const updatedAction = await recordActionStatusUpdate({
            supabaseAdmin,
            action,
            newStatus: body.status,
            comment,
            updatedByUserId: userContext.user.id,
            updatedByName: userContext.name,
            updatedByEmail: userContext.email,
            updatedByOrganisation: userContext.organisation,
            updatedByRole: userContext.role,
            source: "internal",
        });

        return NextResponse.json({ action: updatedAction });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update status." },
            { status: 500 }
        );
    }
}