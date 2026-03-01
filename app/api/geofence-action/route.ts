import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(req: NextRequest) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { visitId, action } = await req.json();

        if (!visitId || !action) {
            return NextResponse.json({ error: "Missing visitId or action" }, { status: 400 });
        }

        if (action === "signout" || action === "auto-signout") {
            const { error } = await supabaseAdmin
                .from("site_visits")
                .update({ signed_out_at: new Date().toISOString() })
                .eq("id", visitId)
                .is("signed_out_at", null);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ ok: true, action });
        }

        if (action === "snooze") {
            // Snooze geofence alerts for 30 minutes
            const snoozeUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
            const { error } = await supabaseAdmin
                .from("site_visits")
                .update({ geofence_snoozed_until: snoozeUntil })
                .eq("id", visitId);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ ok: true, action, snoozedUntil: snoozeUntil });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
