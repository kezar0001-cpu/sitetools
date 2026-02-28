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

interface Organisation {
  id: string;
  name: string;
  created_at: string;
  is_public?: boolean;
  description?: string | null;
}

export function PendingInvitationsView({ userEmail }: { userEmail: string }) {
  const [invitations, setInvitations] = useState<(OrgInvitation & { org?: Organisation })[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    const { data } = await supabase
      .from("org_invitations")
      .select("*, organisations(*)")
      .eq("email", userEmail)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    if (data) {
      const invitesWithOrgs = data.map((inv: OrgInvitation & { organisations?: Organisation }) => ({
        ...inv,
        org: inv.organisations,
      }));
      setInvitations(invitesWithOrgs);
    }
  }, [userEmail]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  async function handleAccept(invitationId: string) {
    setError(null);
    setAccepting(invitationId);

    const { data, error: rpcError } = await supabase.rpc("accept_invitation", {
      invitation_id: invitationId,
    });

    setAccepting(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = data as unknown as { success: boolean; error?: string };
    if (!result.success) {
      setError(result.error || "Failed to accept invitation.");
      return;
    }

    // Refresh page to load new organization
    window.location.reload();
  }

  async function handleDecline(invitationId: string) {
    setDeclining(invitationId);
    const { error: updateErr } = await supabase
      .from("org_invitations")
      .update({ status: "declined" })
      .eq("id", invitationId);

    setDeclining(null);
    if (updateErr) {
      setError("Failed to decline invitation.");
      return;
    }

    fetchInvitations();
  }

  if (invitations.length === 0) return null;

  return (
    <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-bold text-blue-900">Pending Invitations</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <ul className="space-y-3">
        {invitations.map((inv) => (
          <li key={inv.id} className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
            <div>
              <h4 className="text-base font-bold text-gray-900">{inv.org?.name || "Unknown Organization"}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {inv.role}
                </span>
                <span className="text-xs text-gray-500">
                  Expires {new Date(inv.expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(inv.id)}
                disabled={accepting === inv.id || declining === inv.id}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {accepting === inv.id ? "Accepting…" : "Accept"}
              </button>
              <button
                onClick={() => handleDecline(inv.id)}
                disabled={accepting === inv.id || declining === inv.id}
                className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-60 text-gray-700 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {declining === inv.id ? "Declining…" : "Decline"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
