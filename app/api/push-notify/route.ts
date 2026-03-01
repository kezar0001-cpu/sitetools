import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Lazy-initialize to avoid build-time errors when env vars aren't set
let vapidConfigured = false;
function ensureVapid() {
    if (vapidConfigured) return true;
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) return false;
    const subject = process.env.NEXT_PUBLIC_SITE_URL || "https://sitesign.app";
    webpush.setVapidDetails(`mailto:admin@${new URL(subject).hostname}`, pub, priv);
    vapidConfigured = true;
    return true;
}

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(req: NextRequest) {
    try {
        if (!ensureVapid()) {
            return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
        }

        const { visitId, title, body, siteUrl } = await req.json();

        if (!visitId) {
            return NextResponse.json({ error: "Missing visitId" }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Fetch the visit's push subscription
        const { data: visit, error } = await supabaseAdmin
            .from("site_visits")
            .select("push_subscription, geofence_snoozed_until, signed_out_at")
            .eq("id", visitId)
            .single();

        if (error || !visit) {
            return NextResponse.json({ error: "Visit not found" }, { status: 404 });
        }

        // Don't notify if already signed out
        if (visit.signed_out_at) {
            return NextResponse.json({ skipped: true, reason: "already_signed_out" });
        }

        // Don't notify if snoozed
        if (visit.geofence_snoozed_until && new Date(visit.geofence_snoozed_until) > new Date()) {
            return NextResponse.json({ skipped: true, reason: "snoozed" });
        }

        if (!visit.push_subscription) {
            return NextResponse.json({ error: "No push subscription" }, { status: 400 });
        }

        const payload = JSON.stringify({
            title: title || "SiteSign — Sign Out Reminder",
            body: body || "It looks like you've left the site. Don't forget to sign out!",
            visitId,
            siteUrl: siteUrl || "/",
        });

        await webpush.sendNotification(visit.push_subscription, payload);

        // Mark as notified
        await supabaseAdmin
            .from("site_visits")
            .update({ geofence_notified_at: new Date().toISOString() })
            .eq("id", visitId);

        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Push notification error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
