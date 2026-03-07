import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as chrono from "chrono-node";
import {
    normalizePhoneNumber,
    scheduleNudge,
    signOutVisit,
    sendWhatsAppMessage,
} from "@/lib/services/whatsappService";

// ── Supabase admin client ────────────────────────────────────────────────────

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// ── GET: Webhook verification (Meta sends a challenge) ───────────────────────

export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const mode = params.get("hub.mode");
    const token = params.get("hub.verify_token");
    const challenge = params.get("hub.challenge");

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST: Incoming WhatsApp messages ─────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Extract the message from the webhook payload
        const entry = body?.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (!message || message.type !== "text") {
            // Not a text message (could be a status update, etc.) — acknowledge
            return NextResponse.json({ ok: true });
        }

        const fromPhone = message.from; // Already in E.164 without + (e.g. "61412345678")
        const text = (message.text?.body ?? "").trim();

        await handleIncomingReply(fromPhone, text);

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[Webhook] Error processing incoming message:", err);
        // Always return 200 to prevent Meta from retrying
        return NextResponse.json({ ok: true });
    }
}

// ── Reply handler ────────────────────────────────────────────────────────────

async function handleIncomingReply(fromPhone: string, text: string) {
    const supabase = getSupabaseAdmin();
    const normalizedPhone = normalizePhoneNumber(fromPhone);
    const lowerText = text.toLowerCase().trim();

    // Find the most recent active visit for this phone number
    // We need to match across different phone formats
    const { data: visits } = await supabase
        .from("site_visits")
        .select("id, full_name, phone_number, signed_in_at, site_id")
        .is("signed_out_at", null)
        .order("signed_in_at", { ascending: false });

    if (!visits || visits.length === 0) return;

    // Find matching visit by normalized phone number
    const matchingVisit = visits.find((v: Record<string, unknown>) => {
        if (!v.phone_number) return false;
        return normalizePhoneNumber(v.phone_number as string) === normalizedPhone;
    });

    if (!matchingVisit) {
        // No active visit for this phone number — send a helpful reply
        await sendWhatsAppMessage(
            fromPhone,
            "👋 Hi! We couldn't find an active sign-in for your number. " +
            "If you need to sign in or out, please use the QR code at the site entrance."
        );
        return;
    }

    // ── "still here" / "still on site" / "I am still on site" ────────────────
    const stillHerePatterns = [
        "still here",
        "still on site",
        "i am still on site",
        "im still on site",
        "i'm still on site",
        "still working",
        "still at site",
        "yes",
        "yes still here",
    ];

    if (stillHerePatterns.some((p) => lowerText.includes(p))) {
        // Schedule a follow-up nudge in 2 hours
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        await scheduleNudge(
            matchingVisit.id as string,
            matchingVisit.phone_number as string,
            TWO_HOURS
        );

        // Mark any existing sent nudges as responded
        await supabase
            .from("whatsapp_nudges")
            .update({ status: "responded", response: text })
            .eq("visit_id", matchingVisit.id)
            .eq("status", "sent");

        await sendWhatsAppMessage(
            fromPhone,
            `👍 No worries, ${matchingVisit.full_name}! ` +
            `We'll check in again in 2 hours. Stay safe on site! 🏗️`
        );
        return;
    }

    // ── "sign out" / "signout" / "sign me out" ───────────────────────────────
    const signOutPatterns = [
        "sign out",
        "signout",
        "sign me out",
        "signed out",
        "signing out",
        "leaving",
        "left",
        "gone",
        "finished",
        "done",
        "heading home",
        "going home",
    ];

    if (signOutPatterns.some((p) => lowerText.includes(p))) {
        // Check for a time in the message (e.g. "left at 6:30")
        const parsedTime = parseTimeFromText(text, matchingVisit.signed_in_at as string);

        if (parsedTime) {
            const success = await signOutVisit(matchingVisit.id as string, parsedTime);
            if (success) {
                // Mark nudges as responded
                await supabase
                    .from("whatsapp_nudges")
                    .update({ status: "responded", response: text })
                    .eq("visit_id", matchingVisit.id)
                    .in("status", ["sent", "pending"]);

                const timeStr = parsedTime.toLocaleTimeString("en-AU", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Australia/Sydney",
                });
                await sendWhatsAppMessage(
                    fromPhone,
                    `✅ Signed out! Your leave time has been recorded as *${timeStr}*. See you next time! 👋`
                );
            }
        } else {
            const success = await signOutVisit(matchingVisit.id as string);
            if (success) {
                await supabase
                    .from("whatsapp_nudges")
                    .update({ status: "responded", response: text })
                    .eq("visit_id", matchingVisit.id)
                    .in("status", ["sent", "pending"]);

                await sendWhatsAppMessage(
                    fromPhone,
                    `✅ You've been signed out from the site. See you next time! 👋`
                );
            }
        }
        return;
    }

    // ── Time parsing (e.g. "left at 6:30", "630", "6:30pm") ─────────────────
    const parsedTime = parseTimeFromText(text, matchingVisit.signed_in_at as string);
    if (parsedTime) {
        const success = await signOutVisit(matchingVisit.id as string, parsedTime);
        if (success) {
            await supabase
                .from("whatsapp_nudges")
                .update({ status: "responded", response: text })
                .eq("visit_id", matchingVisit.id)
                .in("status", ["sent", "pending"]);

            const timeStr = parsedTime.toLocaleTimeString("en-AU", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Australia/Sydney",
            });
            await sendWhatsAppMessage(
                fromPhone,
                `✅ Signed out! Your leave time has been recorded as *${timeStr}*. See you next time! 👋`
            );
        }
        return;
    }

    // ── Unrecognized reply ───────────────────────────────────────────────────
    await sendWhatsAppMessage(
        fromPhone,
        `🤔 Sorry, I didn't understand that. You can reply with:\n\n` +
        `• "still here" — if you're still working\n` +
        `• "sign out" — to sign out now\n` +
        `• "left at 6:30" — to record your actual leave time`
    );
}

// ── Time parsing helper using chrono-node ────────────────────────────────────

function parseTimeFromText(text: string, signedInAt: string): Date | null {
    // Use the signed-in date as reference for chrono parsing
    const refDate = new Date(signedInAt);

    // Create a Sydney-timezone reference date
    const sydneyRef = new Date(
        refDate.toLocaleString("en-US", { timeZone: "Australia/Sydney" })
    );

    // Parse with chrono-node using the Sydney timezone reference
    const results = chrono.parse(text, sydneyRef, { forwardDate: false });

    if (results.length > 0) {
        const parsed = results[0].start;
        const parsedDate = parsed.date();

        // Sanity check: parsed time should be after signed-in time
        // and not more than 24 hours after sign-in
        const signInTime = new Date(signedInAt).getTime();
        const parsedTime = parsedDate.getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (parsedTime >= signInTime && parsedTime - signInTime <= twentyFourHours) {
            return parsedDate;
        }

        // If the parsed time is before sign-in, it might be the next day
        // (e.g. signed in at 10pm, "left at 2am")
        if (parsedTime < signInTime) {
            const nextDay = new Date(parsedTime);
            nextDay.setDate(nextDay.getDate() + 1);
            if (nextDay.getTime() - signInTime <= twentyFourHours) {
                return nextDay;
            }
        }
    }

    return null;
}
