export const CMS_COOKIE_NAME = "cms_admin_session";

export function getExpectedCmsSessionToken() {
  return process.env.CMS_ADMIN_SESSION_TOKEN ?? "local-dev-cms-token";
}

export function getCmsAdminUsername() {
  return process.env.CMS_ADMIN_USERNAME ?? "admin";
}

export function getCmsAdminPassword() {
  return process.env.CMS_ADMIN_PASSWORD ?? "admin123";
}
