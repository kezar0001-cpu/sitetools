import { CompanyRole } from "@/lib/workspace/types";

// Super admin email that can bypass invitation flow and add members directly
const SUPER_ADMIN_EMAIL = "kezar01@hotmail.com";

const ROLE_WEIGHT: Record<CompanyRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  member: 1,
};

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

export function hasMinimumRole(role: CompanyRole | null | undefined, minimum: CompanyRole): boolean {
  if (!role) return false;
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[minimum];
}

export function canManageTeam(role: CompanyRole | null | undefined): boolean {
  return hasMinimumRole(role, "admin");
}

export function canManageSites(role: CompanyRole | null | undefined): boolean {
  return hasMinimumRole(role, "manager");
}

export function canUseModules(role: CompanyRole | null | undefined): boolean {
  return !!role;
}
