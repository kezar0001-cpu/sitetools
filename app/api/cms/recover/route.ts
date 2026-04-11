import { NextResponse } from "next/server";
import {
  getCmsCredentials,
  writeCmsCredentials,
  validateRecoveryToken,
  recoveryEnabled,
} from "@/lib/cms-credentials";

/**
 * POST /api/cms/recover
 *
 * Body variants:
 *
 *   { action: "verify", token: string }
 *     → Validates the recovery token and returns the current username.
 *
 *   { action: "reset", token: string, username: string, password: string }
 *     → Validates the token, then writes new credentials to cms-credentials.json.
 */
export async function POST(request: Request) {
  if (!recoveryEnabled()) {
    return NextResponse.json(
      {
        error:
          "Recovery is not configured. Add CMS_RECOVERY_TOKEN (minimum 16 characters) to your .env.local file, then restart the dev server.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body || typeof body.action !== "string" || typeof body.token !== "string") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!validateRecoveryToken(body.token)) {
    return NextResponse.json({ error: "Invalid recovery token." }, { status: 401 });
  }

  // ── Verify action ──────────────────────────────────────────────────────────
  if (body.action === "verify") {
    const { username } = getCmsCredentials();
    return NextResponse.json({ username });
  }

  // ── Reset action ───────────────────────────────────────────────────────────
  if (body.action === "reset") {
    const { username, password } = body as { username?: unknown; password?: unknown };

    if (typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    writeCmsCredentials({ username: username.trim(), password });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
