import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type SiteRelation = { timezone: string | null } | { timezone: string | null }[] | null;

interface OpenVisitRow {
  id: string;
  signed_in_at: string;
  sites: SiteRelation;
}

function getNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getTimeZone(value: SiteRelation) {
  const site = Array.isArray(value) ? value[0] : value;
  return site?.timezone || "Australia/Sydney";
}

function getZonedParts(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      year: Number(lookup.year),
      month: Number(lookup.month),
      day: Number(lookup.day),
      hour: Number(lookup.hour),
      minute: Number(lookup.minute),
      second: Number(lookup.second),
    };
  } catch {
    if (timeZone !== "Australia/Sydney") {
      return getZonedParts(date, "Australia/Sydney");
    }

    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    };
  }
}

function localDateKey(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function localDateTimeToUtc(localDate: string, hour: number, minute: number, timeZone: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const targetUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = new Date(targetUtcMs);

  for (let i = 0; i < 3; i += 1) {
    const zoned = getZonedParts(candidate, timeZone);
    const zonedAsUtcMs = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    candidate = new Date(candidate.getTime() - (zonedAsUtcMs - targetUtcMs));
  }

  return candidate;
}

function chooseAutoSignOutTime(signedInAt: string, timeZone: string, now: Date) {
  const signedIn = new Date(signedInAt);
  const localSignInDate = localDateKey(signedIn, timeZone);
  const fallbackHours = getNumberEnv("AUTO_SIGNOUT_FALLBACK_HOURS", 10);
  const localHour = getNumberEnv("AUTO_SIGNOUT_LOCAL_HOUR", 17);
  const localMinute = getNumberEnv("AUTO_SIGNOUT_LOCAL_MINUTE", 0);

  let signOut = localDateTimeToUtc(localSignInDate, localHour, localMinute, timeZone);

  if (signOut.getTime() <= signedIn.getTime()) {
    signOut = new Date(signedIn.getTime() + fallbackHours * 60 * 60 * 1000);
  }

  if (signOut.getTime() > now.getTime()) return now;
  return signOut;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is required in production" }, { status: 500 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const now = new Date();
    const afterHours = getNumberEnv("AUTO_SIGNOUT_AFTER_HOURS", 14);
    const cutoff = new Date(now.getTime() - afterHours * 60 * 60 * 1000).toISOString();
    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

    const { data, error } = await supabaseAdmin
      .from("site_visits")
      .select("id, signed_in_at, sites!inner(timezone)")
      .is("signed_out_at", null)
      .lt("signed_in_at", cutoff)
      .limit(500);

    if (error) throw error;

    const rows = (data ?? []) as OpenVisitRow[];
    let closed = 0;
    let skippedSameDay = 0;
    const failures: { id: string; message: string }[] = [];

    for (const row of rows) {
      const timeZone = getTimeZone(row.sites);
      if (localDateKey(new Date(row.signed_in_at), timeZone) === localDateKey(now, timeZone)) {
        skippedSameDay += 1;
        continue;
      }

      const signedOutAt = chooseAutoSignOutTime(row.signed_in_at, timeZone, now).toISOString();

      if (dryRun) {
        closed += 1;
        continue;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("site_visits")
        .update({ signed_out_at: signedOutAt })
        .eq("id", row.id)
        .is("signed_out_at", null)
        .select("id")
        .maybeSingle();

      if (updateError) {
        failures.push({ id: row.id, message: updateError.message });
      } else if (updated) {
        closed += 1;
      }
    }

    return NextResponse.json({
      ok: failures.length === 0,
      dryRun,
      checked: rows.length,
      closed,
      skippedSameDay,
      failed: failures.length,
      failures,
      cutoff,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("[auto-close-visits] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auto close failed" },
      { status: 500 },
    );
  }
}
