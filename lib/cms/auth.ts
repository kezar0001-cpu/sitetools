import { cookies } from "next/headers";

const CMS_COOKIE_NAME = "cms_admin_session";

export function isCmsAuthenticated(): boolean {
  const token = cookies().get(CMS_COOKIE_NAME)?.value;
  const expectedToken = process.env.CMS_ADMIN_SESSION_TOKEN ?? "local-dev-cms-token";
  return Boolean(token && token === expectedToken);
}
