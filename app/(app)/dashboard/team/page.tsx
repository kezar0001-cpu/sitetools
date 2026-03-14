"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createCompanyInvitation, fetchCompanyInvitations, fetchCompanyTeam } from "@/lib/workspace/client";
import { canManageTeam } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { CompanyInvitation, CompanyMembership, CompanyRole } from "@/lib/workspace/types";

interface RemoveConfirmState {
  memberId: string;
  userId: string;
  displayName: string;
}

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

  const [removeConfirm, setRemoveConfirm] = useState<RemoveConfirmState | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

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

  async function handleRemoveMember() {
    if (!removeConfirm || !activeCompanyId) return;

    setRemoveLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("company_memberships")
      .delete()
      .eq("id", removeConfirm.memberId)
      .eq("company_id", activeCompanyId);

    setRemoveLoading(false);

    if (deleteError) {
      setError(deleteError.message);
      setRemoveConfirm(null);
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== removeConfirm.memberId));
    setRemoveConfirm(null);
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
                <th className="py-2 pr-3">Added</th>
                {canEditTeam && <th className="py-2" />}
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
                  <td className="py-3 pr-3 text-slate-500">{new Date(member.created_at).toLocaleDateString("en-AU")}</td>
                  {canEditTeam && (
                    <td className="py-3 text-right">
                      {member.role !== "owner" && member.user_id !== summary?.userId && (
                        <button
                          onClick={() =>
                            setRemoveConfirm({
                              memberId: member.id,
                              userId: member.user_id,
                              displayName: member.profiles?.full_name ?? member.profiles?.email ?? "this member",
                            })
                          }
                          className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-2 py-1 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
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

      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove team member?</h3>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-semibold">{removeConfirm.displayName}</span> will lose access to this company immediately. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => setRemoveConfirm(null)}
                disabled={removeLoading}
                className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={removeLoading}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-60 transition-colors"
              >
                {removeLoading ? "Removing…" : "Yes, remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
