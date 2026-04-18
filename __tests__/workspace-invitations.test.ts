import { describe, expect, it } from "vitest";
import {
  resolveInvitationAcceptanceError,
  type AcceptCompanyInvitationResult,
  type CompanyInvitationInspection,
} from "@/lib/workspace/invitations";

function buildResult(overrides: Partial<AcceptCompanyInvitationResult> = {}): AcceptCompanyInvitationResult {
  return {
    success: false,
    message: "Fallback error",
    ...overrides,
  };
}

function buildInvitation(
  overrides: Partial<CompanyInvitationInspection> = {}
): CompanyInvitationInspection {
  return {
    exists: true,
    isExpired: false,
    status: "pending",
    expiresAt: "2099-01-01T00:00:00.000Z",
    companyId: "company-123",
    ...overrides,
  };
}

describe("resolveInvitationAcceptanceError", () => {
  it("returns invalid message when invitation does not exist", () => {
    expect(
      resolveInvitationAcceptanceError(buildResult(), buildInvitation({ exists: false, status: null, expiresAt: null, companyId: null }))
    ).toBe("This code is invalid.");
  });

  it("returns expired message when invitation has expired", () => {
    expect(
      resolveInvitationAcceptanceError(buildResult(), buildInvitation({ isExpired: true }))
    ).toBe("This invite has expired — ask your admin to send a new one.");
  });

  it("returns revoked message when invitation was revoked", () => {
    expect(
      resolveInvitationAcceptanceError(buildResult(), buildInvitation({ status: "revoked" }))
    ).toBe("This invite has been revoked. Ask your admin to send a new one.");
  });

  it("returns already used message when invitation was already accepted", () => {
    expect(
      resolveInvitationAcceptanceError(buildResult(), buildInvitation({ status: "accepted" }))
    ).toBe("This invite has already been used. Ask your admin for a fresh invite if you still need access.");
  });

  it("falls back to the RPC message for pending invitations", () => {
    expect(
      resolveInvitationAcceptanceError(buildResult({ message: "Workspace join failed." }), buildInvitation())
    ).toBe("Workspace join failed.");
  });
});