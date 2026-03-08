import { NextResponse } from "next/server";

const CMS_COOKIE_NAME = "cms_admin_session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;

  const configuredUsername = process.env.CMS_ADMIN_USERNAME ?? "admin";
  const configuredPassword = process.env.CMS_ADMIN_PASSWORD ?? "admin123";

  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  if (body.username !== configuredUsername || body.password !== configuredPassword) {
    return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: CMS_COOKIE_NAME,
    value: process.env.CMS_ADMIN_SESSION_TOKEN ?? "local-dev-cms-token",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
