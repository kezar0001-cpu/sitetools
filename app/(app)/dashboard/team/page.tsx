"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleLoadingState } from "@/components/loading/ModuleLoadingState";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { createCompanyInvitation, fetchCompanyInvitations, fetchCompanyTeam } from "@/lib/workspace/client";
import { canManageTeam } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { CompanyInvitation, CompanyMembership, CompanyRole } from "@/lib/workspace/types";
import { MobileCardList, MobileCardHeader, MobileStatusBadge, MobileActionButton } from "@/components/mobile/MobileCardList";

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

  const [removeConfirm, setRemoveConfirm] = useState<RemoveConfirmState | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CompanyRole>("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ token: string; inviteCode: string; email: string; role: CompanyRole } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const canEditTeam = useMemo(() => canManageTeam(activeRole), [activeRole]);

  useEffect(() => {
    if (!activeCompanyId) return;

    setPageLoading(true);

    Promise.all([fetchCompanyTeam(activeCompanyId), fetchCompanyInvitations(activeCompanyId)])
      .then(([team, invites]) => {
        setMembers(team as MemberRow[]);
        setInvitations(invites);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Unable to load team data.");
      })
      .finally(() => setPageLoading(false));
  }, [activeCompanyId]);

  async function handleRoleChange(memberId: string, role: CompanyRole) {
    if (!canEditTeam) return;

    const { error: updateError } = await supabase.from("company_memberships").update({ role }).eq("id", memberId);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    toast.success("Role updated.");
    await refresh();
  }

  async function handleRemoveMember() {
    if (!removeConfirm || !activeCompanyId) return;

    setRemoveLoading(true);

    const { error: deleteError } = await supabase
      .from("company_memberships")
      .delete()
      .eq("id", removeConfirm.memberId)
      .eq("company_id", activeCompanyId);

    setRemoveLoading(false);

    if (deleteError) {
      toast.error(deleteError.message);
      setRemoveConfirm(null);
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== removeConfirm.memberId));
    toast.success(`${removeConfirm.displayName} removed from team.`);
    setRemoveConfirm(null);
    await refresh();
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !canEditTeam) return;

    setInviteResult(null);

    if (!inviteEmail.trim()) {
      toast.error("Invite email is required.");
      return;
    }

    setInviteLoading(true);
    try {
      const created = await createCompanyInvitation(activeCompanyId, inviteEmail.trim(), inviteRole);
      setInviteResult({ token: created.token, inviteCode: created.invite_code, email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
      toast.success("Invitation created.");

      const updatedInvitations = await fetchCompanyInvitations(activeCompanyId);
      setInvitations(updatedInvitations);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? "Failed to send invitation.";
      toast.error(msg);
    } finally {
      setInviteLoading(false);
    }
  }

  if (loading || !summary || pageLoading) {
    return <ModuleLoadingState variant="spinner" size="lg" fullPage />;
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Team</h1>
        <p className="mt-1 text-sm text-slate-600">
          Invite team members to access <span className="font-semibold text-slate-900">{activeCompany?.name}</span>. They&apos;ll receive an invite link to join your workspace.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Members</h2>
          <span className="text-sm text-slate-500">{members.length} members</span>
        </div>

        <MobileCardList
          data={members}
          columns={[
            {
              key: "user",
              header: "User",
              render: (member) => {
                const initials = (member.profiles?.full_name ?? member.profiles?.email ?? "U")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const displayName = member.profiles?.full_name ?? "Buildstate User";
                const email = member.profiles?.email ?? "-";

                return (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-amber-950 font-bold text-sm">
                      {initials}
                    </div>
                    <MobileCardHeader
                      title={displayName}
                      subtitle={email}
                    />
                  </div>
                );
              },
            },
            {
              key: "email",
              header: "Email",
              mobileVisible: false,
              render: (member) => member.profiles?.email ?? "-",
            },
            {
              key: "role",
              header: "Role",
              render: (member) => {
                if (canEditTeam && member.role !== "owner") {
                  return (
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
                  );
                }
                const roleVariant = {
                  owner: "warning",
                  admin: "info",
                  manager: "neutral",
                  member: "neutral",
                  viewer: "neutral",
                } as const;
                return (
                  <MobileStatusBadge
                    status={member.role}
                    variant={roleVariant[member.role]}
                  />
                );
              },
            },
            {
              key: "added",
              header: "Added",
              mobileVisible: false,
              render: (member) => new Date(member.created_at).toLocaleDateString("en-AU"),
            },
            ...(canEditTeam
              ? [
                  {
                    key: "actions",
                    header: "",
                    render: (member: MemberRow) =>
                      member.role !== "owner" && member.user_id !== summary?.userId ? (
                        <MobileActionButton
                          onClick={() =>
                            setRemoveConfirm({
                              memberId: member.id,
                              userId: member.user_id,
                              displayName: member.profiles?.full_name ?? member.profiles?.email ?? "this member",
                            })
                          }
                          variant="danger"
                        >
                          Remove
                        </MobileActionButton>
                      ) : null,
                  },
                ]
              : []),
          ]}
        />
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
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-emerald-900">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="font-bold text-emerald-900">Invitation ready</p>
                      <p className="text-sm text-emerald-700 mt-0.5">
                        Share this link with <span className="font-semibold">{inviteResult.email}</span>. They&apos;ll join as a <span className="font-semibold uppercase">{inviteResult.role}</span>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap bg-white rounded-lg px-3 py-2 border border-emerald-200">
                      <span className="font-mono text-sm text-slate-600 break-all flex-1">
                        {typeof window !== "undefined" ? `${window.location.origin}/invite/${inviteResult.token}` : `/invite/${inviteResult.token}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const link = typeof window !== "undefined" ? `${window.location.origin}/invite/${inviteResult.token}` : `/invite/${inviteResult.token}`;
                          navigator.clipboard.writeText(link).then(() => {
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
                        title="Copy invite link"
                      >
                        {linkCopied ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Copied
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy link
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-emerald-600">
                      Code: <span className="font-mono font-semibold">{inviteResult.inviteCode}</span> · They can also join by entering this code on the sign-in page
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Pending Invitations</h2>
          <span className="text-sm text-slate-500">
            {invitations.filter((inv) => inv.status === "pending").length} waiting
          </span>
        </div>
        {invitations.filter((inv) => inv.status === "pending").length === 0 ? (
          <EmptyState
            icon="✉️"
            title="No pending invitations"
            description="Invitations you create will appear here until they're accepted."
            className="py-4"
          />
        ) : (
          <ul className="space-y-3">
            {invitations
              .filter((inv) => inv.status === "pending")
              .map((inv) => (
                <li key={inv.id} className="border border-slate-200 rounded-xl px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{inv.email}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Join as <span className="font-medium uppercase">{inv.role}</span> · Expires {new Date(inv.expires_at).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inv.invite_code);
                        toast.success("Code copied to clipboard");
                      }}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      title="Copy invite code"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      <span className="font-mono">{inv.invite_code}</span>
                    </button>
                  </div>
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
