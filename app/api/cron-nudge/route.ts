import { NextRequest, NextResponse } from "next/server";
import {
    getActiveVisits,
    scheduleNudge,
    processNudges,
} from "@/lib/services/whatsappService";

/**
 * GET /api/cron-nudge
 *
 * Daily cron job (5:00 PM Sydney time).
 * 1. Finds all visitors currently signed in with a phone number.
 * 2. Schedules an immediate WhatsApp nudge for each.
 * 3. Processes all due nudges (sends the messages).
 *
 * Security: Protected by CRON_SECRET header.
 *
 * For Vercel Cron: add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron-nudge",
 *     "schedule": "0 6 * * *"  // 6:00 UTC = 5:00 PM AEDT (Sydney)
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Step 1: Get all active visits
        const activeVisits = await getActiveVisits();

        // Step 2: Schedule a nudge for each active visitor with a phone number
        let scheduled = 0;
        for (const visit of activeVisits) {
            if (!visit.phone_number) continue;
            const nudge = await scheduleNudge(visit.id, visit.phone_number, 0);
            if (nudge) scheduled++;
        }

        // Step 3: Process all due nudges (send WhatsApp messages)
        const result = await processNudges();

        return NextResponse.json({
            ok: true,
            activeVisits: activeVisits.length,
            scheduled,
            sent: result.sent,
            failed: result.failed,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[Cron] Nudge cron failed:", err);
        return NextResponse.json(
            { error: "Cron job failed" },
            { status: 500 }
        );
    }
}
