import { CompanyRole } from "@/lib/workspace/types";

const ROLE_WEIGHT: Record<CompanyRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  member: 1,
};

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
