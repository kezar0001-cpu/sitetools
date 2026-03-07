import { NextRequest, NextResponse } from "next/server";
import { processNudges } from "@/lib/services/whatsappService";

/**
 * GET /api/process-nudges
 *
 * Processes all pending nudges that are now due (scheduled_at <= now).
 * This should be called frequently (e.g. every 5–10 minutes via a cron)
 * to handle the 2-hour follow-up nudges scheduled when users reply "still here".
 *
 * For Vercel Cron: add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/process-nudges",
 *     "schedule": "0,10,20,30,40,50 * * * *"
 *   }]
 * }
 *
 * Security: Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await processNudges();

        return NextResponse.json({
            ok: true,
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[ProcessNudges] Failed:", err);
        return NextResponse.json(
            { error: "Processing failed" },
            { status: 500 }
        );
    }
}
