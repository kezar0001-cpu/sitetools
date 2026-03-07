"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createCompanyInvitation, fetchCompanyInvitations, fetchCompanyTeam } from "@/lib/workspace/client";
import { canManageTeam } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { CompanyInvitation, CompanyMembership, CompanyRole } from "@/lib/workspace/types";

interface MemberRow extends CompanyMembership {
  profiles?: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
}

const ROLE_OPTIONS: CompanyRole[] = ["admin", "manager", "member"];

export default function TeamPage() {
  const { loading, summary, refresh } = useWorkspace({ requireAuth: true, requireCompany: true });
  const activeCompany = summary?.activeMembership?.companies ?? null;
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;
  const activeRole = summary?.activeMembership?.role ?? null;

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CompanyRole>("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ token: string; inviteCode: string } | null>(null);

  const canEditTeam = useMemo(() => canManageTeam(activeRole), [activeRole]);

  useEffect(() => {
    if (!activeCompanyId) return;

    setPageLoading(true);
    setError(null);

    Promise.all([fetchCompanyTeam(activeCompanyId), fetchCompanyInvitations(activeCompanyId)])
      .then(([team, invites]) => {
        setMembers(team as MemberRow[]);
        setInvitations(invites);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load team data.");
      })
      .finally(() => setPageLoading(false));
  }, [activeCompanyId]);

  async function handleRoleChange(memberId: string, role: CompanyRole) {
    if (!canEditTeam) return;

    const { error: updateError } = await supabase.from("company_memberships").update({ role }).eq("id", memberId);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    await refresh();
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !canEditTeam) return;

    setError(null);
    setInviteResult(null);

    if (!inviteEmail.trim()) {
      setError("Invite email is required.");
      return;
    }

    setInviteLoading(true);
    try {
      const created = await createCompanyInvitation(activeCompanyId, inviteEmail.trim(), inviteRole);
      setInviteResult({ token: created.token, inviteCode: created.invite_code });
      setInviteEmail("");

      const updatedInvitations = await fetchCompanyInvitations(activeCompanyId);
      setInvitations(updatedInvitations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setInviteLoading(false);
    }
  }

  if (loading || !summary || pageLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Team Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Company: <span className="font-semibold text-slate-900">{activeCompany?.name}</span> | Your role: <span className="font-semibold uppercase">{activeRole}</span>
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Members</h2>
          <span className="text-sm text-slate-500">{members.length} members</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 text-slate-500 uppercase tracking-wide text-xs">
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2">Added</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3 font-semibold text-slate-900">{member.profiles?.full_name ?? "Buildstate User"}</td>
                  <td className="py-3 pr-3 text-slate-600">{member.profiles?.email ?? "-"}</td>
                  <td className="py-3 pr-3">
                    {canEditTeam && member.role !== "owner" ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as CompanyRole)}
                        className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-semibold uppercase text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{member.role}</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-500">{new Date(member.created_at).toLocaleDateString("en-AU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Invite Member</h2>
        {!canEditTeam ? (
          <p className="text-sm text-slate-600">Only Owners and Admins can invite team members.</p>
        ) : (
          <>
            <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={handleInvite}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="person@company.com.au"
                className="md:col-span-2 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as CompanyRole)}
                className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviteLoading}
                className="md:col-span-3 bg-slate-900 hover:bg-black disabled:opacity-60 text-white font-bold rounded-xl px-4 py-3 text-sm"
              >
                {inviteLoading ? "Creating invite..." : "Create Invitation"}
              </button>
            </form>

            {inviteResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 space-y-1">
                <p className="font-semibold">Invitation created.</p>
                <p>
                  Invite link: <span className="font-mono">{typeof window !== "undefined" ? `${window.location.origin}/invite/${inviteResult.token}` : `/invite/${inviteResult.token}`}</span>
                </p>
                <p>
                  Invite code: <span className="font-mono font-bold">{inviteResult.inviteCode}</span>
                </p>
              </div>
            )}
          </>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-3">Pending Invitations</h2>
        {invitations.filter((inv) => inv.status === "pending").length === 0 ? (
          <p className="text-sm text-slate-500">No pending invitations.</p>
        ) : (
          <ul className="space-y-2">
            {invitations
              .filter((inv) => inv.status === "pending")
              .map((inv) => (
                <li key={inv.id} className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{inv.email}</p>
                    <p className="text-xs text-slate-500 uppercase">Role: {inv.role} | Code: {inv.invite_code}</p>
                  </div>
                  <p className="text-xs text-slate-500">Expires {new Date(inv.expires_at).toLocaleDateString("en-AU")}</p>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
