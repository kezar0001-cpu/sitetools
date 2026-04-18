import type { CompanyInvitation } from "@/lib/workspace/types";

export interface AcceptCompanyInvitationResult {
  success: boolean;
  message?: string;
  company_id?: string;
}

export interface CompanyInvitationInspection {
  exists: boolean;
  isExpired: boolean;
  status: CompanyInvitation["status"] | null;
  expiresAt: string | null;
  companyId: string | null;
}

export function resolveInvitationAcceptanceError(
  result: AcceptCompanyInvitationResult,
  invitation: CompanyInvitationInspection | null
): string {
  if (!invitation || !invitation.exists) {
    return "This code is invalid.";
  }

  if (invitation.isExpired || invitation.status === "expired") {
    return "This invite has expired — ask your admin to send a new one.";
  }

  if (invitation.status === "revoked") {
    return "This invite has been revoked. Ask your admin to send a new one.";
  }

  if (invitation.status === "accepted") {
    return "This invite has already been used. Ask your admin for a fresh invite if you still need access.";
  }

  return result.message ?? "Unable to join company.";
}