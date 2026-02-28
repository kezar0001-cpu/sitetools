"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface OrgInvitation {
  id: string;
  org_id: string;
  email: string;
  role: string;
  site_id: string | null;
  status: string;
  created_at: string;
  expires_at: string;
}

interface Site {
  id: string;
  name: string;
  slug: string;
  org_id: string;
}

export function InvitationsPanel({ orgId, orgSites }: { orgId: string; orgSites: Site[] }) {
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "editor" | "viewer">("viewer");
  const [newSiteId, setNewSiteId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    const { data } = await supabase
      .from("org_invitations")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (data) setInvitations(data as OrgInvitation[]);
  }, [orgId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  async function handleSendInvitation(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newEmail.trim()) {
      setError("Email is required.");
      return;
    }
    if (newRole === "editor" && !newSiteId) {
      setError("Editors must be assigned to a site.");
      return;
    }

    setSending(true);
    const { error: insertErr } = await supabase.from("org_invitations").insert({
      org_id: orgId,
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      site_id: newRole === "editor" ? newSiteId : null,
      invited_by: (await supabase.auth.getUser()).data.user?.id,
    });

    setSending(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    setNewEmail("");
    setNewRole("viewer");
    setNewSiteId("");
    fetchInvitations();
  }

  async function handleRevoke(invitationId: string) {
    setRevoking(invitationId);
    const { error } = await supabase
      .from("org_invitations")
      .update({ status: "expired" })
      .eq("id", invitationId);
    setRevoking(null);
    if (error) {
      setError("Failed to revoke invitation.");
      return;
    }
    fetchInvitations();
  }

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="bg-blue-400 text-white rounded-lg p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm">Invitations</span>
          <span className="text-xs text-gray-400 font-medium">({pendingInvitations.length} pending)</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 pb-6 pt-4 space-y-5">
          {/* Invitation Form */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-700 mb-3">Send Invitation</p>
            {error && (
              <div className="mb-3 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                {error}
              </div>
            )}
            <form onSubmit={handleSendInvitation} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as "admin" | "editor" | "viewer")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="admin">Admin (full access)</option>
                    <option value="editor">Editor (site manager)</option>
                    <option value="viewer">Viewer (read-only)</option>
                  </select>
                </div>
                {newRole === "editor" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Assign to Site</label>
                    <select
                      value={newSiteId}
                      onChange={(e) => setNewSiteId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="">Select a site…</option>
                      {orgSites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={sending}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                {sending ? "Sending…" : "Send Invitation"}
              </button>
            </form>
          </div>

          {/* Invitations List */}
          {invitations.length > 0 && (
            <ul className="space-y-2">
              {invitations.map((inv) => {
                const isExpired = new Date(inv.expires_at) < new Date();
                const statusColor =
                  inv.status === "accepted"
                    ? "bg-green-100 text-green-800"
                    : inv.status === "declined"
                    ? "bg-red-100 text-red-800"
                    : isExpired || inv.status === "expired"
                    ? "bg-gray-100 text-gray-600"
                    : "bg-yellow-100 text-yellow-800";

                return (
                  <li key={inv.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 truncate">{inv.email}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                          {isExpired && inv.status === "pending" ? "expired" : inv.status}
                        </span>
                        <span className="text-xs text-gray-500">→ {inv.role}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sent {new Date(inv.created_at).toLocaleDateString()} • Expires{" "}
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    {inv.status === "pending" && !isExpired && (
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revoking === inv.id}
                        className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0 disabled:opacity-50"
                      >
                        {revoking === inv.id ? "…" : "Revoke"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
