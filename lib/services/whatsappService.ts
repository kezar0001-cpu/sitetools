/**
 * WhatsApp Service — Handles outbound nudge messages and inbound reply processing.
 *
 * Uses the WhatsApp Business Cloud API (Meta Graph API v18.0).
 * Requires the following environment variables:
 *   WHATSAPP_PHONE_NUMBER_ID  — The Phone Number ID from Meta Business Manager
 *   WHATSAPP_ACCESS_TOKEN     — A permanent System User token with `whatsapp_business_messaging` permission
 *   WHATSAPP_VERIFY_TOKEN     — A secret string YOU choose, used to verify the webhook during setup
 */

import { createClient } from "@supabase/supabase-js";

// ── Supabase admin client (service role — bypasses RLS) ──────────────────────

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface NudgeRecord {
    id: string;
    visit_id: string;
    phone_number: string;
    scheduled_at: string;
    sent_at: string | null;
    response: string | null;
    status: "pending" | "sent" | "responded" | "cancelled";
}

export interface ActiveVisit {
    id: string;
    full_name: string;
    phone_number: string | null;
    company_name: string;
    signed_in_at: string;
    signed_out_at: string | null;
    site_id: string;
    site_name?: string;
}

// ── WhatsApp Cloud API helpers ───────────────────────────────────────────────

const GRAPH_API = "https://graph.facebook.com/v18.0";

/**
 * Send a WhatsApp text message to a phone number.
 * Returns the message ID on success, or null on failure.
 */
export async function sendWhatsAppMessage(
    to: string,
    body: string
): Promise<string | null> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        console.error("[WhatsApp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
        return null;
    }

    // Normalize phone number: strip spaces/dashes, ensure starts with country code
    const normalized = normalizePhoneNumber(to);

    try {
        const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: normalized,
                type: "text",
                text: { body },
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("[WhatsApp] Send failed:", JSON.stringify(data));
            return null;
        }

        return data.messages?.[0]?.id ?? null;
    } catch (err) {
        console.error("[WhatsApp] Send error:", err);
        return null;
    }
}

/**
 * Normalize an Australian phone number to E.164 format.
 * Examples:
 *   "0412 345 678"  → "61412345678"
 *   "+61412345678"  → "61412345678"
 *   "412345678"     → "61412345678"
 */
export function normalizePhoneNumber(raw: string): string {
    // Strip everything except digits and leading +
    let cleaned = raw.replace(/[\s\-()]/g, "");

    // Remove leading +
    if (cleaned.startsWith("+")) {
        cleaned = cleaned.substring(1);
    }

    // Australian mobile: starts with 0
    if (cleaned.startsWith("0")) {
        cleaned = "61" + cleaned.substring(1);
    }

    // If it doesn't start with a country code, assume Australian
    if (cleaned.length === 9 && /^\d+$/.test(cleaned)) {
        cleaned = "61" + cleaned;
    }

    return cleaned;
}

// ── Nudge scheduling ────────────────────────────────────────────────────────

/**
 * Schedule a new WhatsApp nudge for a visit.
 * `delayMs` controls when the nudge fires (default: now — for the 5 PM cron).
 * For "still on site" follow-ups, pass `delayMs = 2 * 60 * 60 * 1000` (2 hours).
 */
export async function scheduleNudge(
    visitId: string,
    phoneNumber: string,
    delayMs: number = 0
): Promise<NudgeRecord | null> {
    const supabase = getSupabaseAdmin();
    const scheduledAt = new Date(Date.now() + delayMs).toISOString();

    const { data, error } = await supabase
        .from("whatsapp_nudges")
        .insert({
            visit_id: visitId,
            phone_number: phoneNumber,
            scheduled_at: scheduledAt,
            status: "pending",
        })
        .select()
        .single();

    if (error) {
        console.error("[Nudge] Failed to schedule:", error.message);
        return null;
    }

    return data as NudgeRecord;
}

/**
 * Cancel all pending nudges for a visit (e.g. when the user signs out).
 */
export async function cancelPendingNudges(visitId: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    await supabase
        .from("whatsapp_nudges")
        .update({ status: "cancelled" })
        .eq("visit_id", visitId)
        .eq("status", "pending");
}

/**
 * Send all nudges that are due (scheduled_at <= now, status = pending).
 * Called by the cron endpoint and the nudge processor.
 */
export async function processNudges(): Promise<{
    sent: number;
    failed: number;
}> {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Fetch pending nudges that are due
    const { data: nudges, error } = await supabase
        .from("whatsapp_nudges")
        .select(`
      id,
      visit_id,
      phone_number,
      scheduled_at,
      status
    `)
        .eq("status", "pending")
        .lte("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(100);

    if (error || !nudges) {
        console.error("[Nudge] Failed to fetch pending nudges:", error?.message);
        return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const nudge of nudges) {
        // Check if the visit is still active (not signed out)
        const { data: visit } = await supabase
            .from("site_visits")
            .select("id, full_name, signed_out_at, site_id")
            .eq("id", nudge.visit_id)
            .single();

        if (!visit || visit.signed_out_at) {
            // Visit already signed out — cancel this nudge
            await supabase
                .from("whatsapp_nudges")
                .update({ status: "cancelled" })
                .eq("id", nudge.id);
            continue;
        }

        // Fetch site name for a friendly message
        const { data: site } = await supabase
            .from("sites")
            .select("name")
            .eq("id", visit.site_id)
            .single();

        const siteName = site?.name ?? "the site";
        const message =
            `🏗️ SiteSign Reminder\n\n` +
            `Hi ${visit.full_name}, you're still signed in at *${siteName}*.\n\n` +
            `If you've left, reply with:\n` +
            `• "sign out" — to sign out now\n` +
            `• "left at 6:30" — to record your actual leave time\n\n` +
            `If you're still working, reply:\n` +
            `• "still here" — we'll check again in 2 hours\n\n` +
            `_This is an automated message from SiteSign._`;

        const messageId = await sendWhatsAppMessage(nudge.phone_number, message);

        if (messageId) {
            await supabase
                .from("whatsapp_nudges")
                .update({ status: "sent", sent_at: new Date().toISOString() })
                .eq("id", nudge.id);
            sent++;
        } else {
            failed++;
        }
    }

    return { sent, failed };
}

/**
 * Get all currently signed-in visitors (for the 5 PM cron).
 */
export async function getActiveVisits(): Promise<ActiveVisit[]> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("site_visits")
        .select(`
      id,
      full_name,
      phone_number,
      company_name,
      signed_in_at,
      signed_out_at,
      site_id,
      sites ( name )
    `)
        .is("signed_out_at", null)
        .not("phone_number", "is", null);

    if (error || !data) {
        console.error("[Nudge] Failed to fetch active visits:", error?.message);
        return [];
    }

    return data.map((v: Record<string, unknown>) => ({
        id: v.id as string,
        full_name: v.full_name as string,
        phone_number: v.phone_number as string,
        company_name: v.company_name as string,
        signed_in_at: v.signed_in_at as string,
        signed_out_at: v.signed_out_at as string | null,
        site_id: v.site_id as string,
        site_name: (v.sites as Record<string, string> | null)?.name,
    }));
}

/**
 * Sign out a visit by ID, with an optional custom sign-out time.
 */
export async function signOutVisit(
    visitId: string,
    signOutTime?: Date
): Promise<boolean> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from("site_visits")
        .update({ signed_out_at: (signOutTime ?? new Date()).toISOString() })
        .eq("id", visitId)
        .is("signed_out_at", null);

    if (error) {
        console.error("[SignOut] Failed:", error.message);
        return false;
    }

    // Cancel any pending nudges
    await cancelPendingNudges(visitId);

    return true;
}
