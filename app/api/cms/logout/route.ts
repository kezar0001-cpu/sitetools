import { NextResponse } from "next/server";

const CMS_COOKIE_NAME = "cms_admin_session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/cms", request.url));
  response.cookies.set({
    name: CMS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/cms",
    maxAge: 0,
  });

  return response;
}
