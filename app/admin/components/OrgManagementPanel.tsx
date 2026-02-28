"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Organisation { id: string; name: string; created_at: string; is_public?: boolean; description?: string | null; join_code?: string | null; join_code_expires?: string | null; created_by?: string | null; }
interface OrgMember { id: string; org_id: string; user_id: string; role: "admin" | "editor" | "viewer"; site_id: string | null; }
interface OrgTransferRequest { id: string; org_id: string; from_user_id: string; to_user_id: string; message: string | null; status: string; created_at: string; expires_at: string; responded_at: string | null; }
interface OrgDeletionRequest { id: string; org_id: string; requested_by: string; reason: string | null; status: string; created_at: string; approved_at: string | null; approved_by: string | null; }

interface OrgManagementPanelProps {
  org: Organisation;
  member: OrgMember;
  onOrgDeleted?: () => void;
  onOrgUpdated?: (org: Organisation) => void;
}

export function OrgManagementPanel({ org, member, onOrgDeleted }: OrgManagementPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeExpiry, setJoinCodeExpiry] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<OrgDeletionRequest[]>([]);
  const [transferRequests, setTransferRequests] = useState<OrgTransferRequest[]>([]);

  const isAdmin = member.role === "admin";

  const fetchJoinCode = useCallback(async () => {
    const { data } = await supabase
      .from("organisations")
      .select("join_code, join_code_expires")
      .eq("id", org.id)
      .single();
    
    if (data) {
      setJoinCode(data.join_code || "");
      setJoinCodeExpiry(data.join_code_expires || "");
    }
  }, [org.id]);

  const fetchDeletionRequests = useCallback(async () => {
    const { data } = await supabase
      .from("org_deletion_requests")
      .select("*")
      .eq("org_id", org.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    if (data) {
      setDeletionRequests(data as OrgDeletionRequest[]);
    }
  }, [org.id]);

  const fetchTransferRequests = useCallback(async () => {
    const { data } = await supabase
      .from("org_transfer_requests")
      .select("*")
      .eq("org_id", org.id)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false });
    
    if (data) {
      setTransferRequests(data as OrgTransferRequest[]);
    }
  }, [org.id]);

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchJoinCode();
      fetchDeletionRequests();
      fetchTransferRequests();
    }
  }, [isOpen, isAdmin, fetchJoinCode, fetchDeletionRequests, fetchTransferRequests]);

  
  async function generateJoinCode() {
    setGeneratingCode(true);
    setError(null);
    
    const { data, error } = await supabase.rpc("generate_org_join_code", {
      p_org_id: org.id,
      p_expires_hours: 168 // 7 days
    });
    
    setGeneratingCode(false);
    
    if (error || !data) {
      setError(error?.message || "Failed to generate join code");
      return;
    }
    
    const result = data as { success: boolean; join_code: string | null };
    if (result.success && result.join_code) {
      setJoinCode(result.join_code);
      setJoinCodeExpiry(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
      setSuccess("Join code generated successfully!");
      fetchJoinCode();
    } else {
      setError("Failed to generate join code");
    }
  }

  async function requestDeletion() {
    if (!deletionReason.trim()) {
      setError("Please provide a reason for deletion");
      return;
    }
    
    setDeleting(true);
    setError(null);
    
    const { data, error } = await supabase.rpc("request_org_deletion", {
      p_org_id: org.id,
      p_reason: deletionReason
    });
    
    setDeleting(false);
    
    if (error || !data) {
      setError(error?.message || "Failed to request deletion");
      return;
    }
    
    const result = data as { success: boolean; message: string };
    if (result.success) {
      setSuccess(result.message);
      setDeletionReason("");
      if (result.message.includes("deleted successfully")) {
        onOrgDeleted?.();
      } else {
        fetchDeletionRequests();
      }
    } else {
      setError(result.message);
    }
  }

  async function approveDeletion(requestId: string) {
    const { data, error } = await supabase.rpc("approve_org_deletion", {
      p_request_id: requestId
    });
    
    if (error || !data) {
      setError(error?.message || "Failed to approve deletion");
      return;
    }
    
    const result = data as { success: boolean; message: string };
    if (result.success) {
      setSuccess(result.message);
      onOrgDeleted?.();
    } else {
      setError(result.message);
    }
  }

  async function requestTransfer() {
    if (!transferEmail.trim()) {
      setError("Please enter an email address");
      return;
    }
    
    setTransferring(true);
    setError(null);
    
    // Find user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      setError("Failed to find user");
      setTransferring(false);
      return;
    }
    
    const targetUser = userData.users.find(u => u.email === transferEmail);
    if (!targetUser) {
      setError("User with this email not found");
      setTransferring(false);
      return;
    }
    
    const { data, error } = await supabase.rpc("request_org_transfer", {
      p_org_id: org.id,
      p_to_user_id: targetUser.id,
      p_message: transferMessage
    });
    
    setTransferring(false);
    
    if (error || !data) {
      setError(error?.message || "Failed to request transfer");
      return;
    }
    
    const result = data as { success: boolean; message: string };
    if (result.success) {
      setSuccess(result.message);
      setTransferEmail("");
      setTransferMessage("");
      fetchTransferRequests();
    } else {
      setError(result.message);
    }
  }

  async function copyJoinCode() {
    if (joinCode) {
      await navigator.clipboard.writeText(joinCode);
      setSuccess("Join code copied to clipboard!");
    }
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="bg-red-100 text-red-700 rounded-lg p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm">Organization Management</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
              {success}
            </div>
          )}

          {/* Join Code Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Join Code</h3>
            <p className="text-xs text-gray-600">Generate a code that allows users to join directly without approval.</p>
            
            {joinCode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm">{joinCode}</code>
                  <button
                    onClick={copyJoinCode}
                    className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Expires: {joinCodeExpiry ? new Date(joinCodeExpiry).toLocaleString() : "Unknown"}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No active join code</p>
            )}
            
            <button
              onClick={generateJoinCode}
              disabled={generatingCode}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {generatingCode ? "Generating..." : "Generate New Code"}
            </button>
          </div>

          {/* Transfer Requests */}
          {transferRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Transfer Requests</h3>
              <ul className="space-y-2">
                {transferRequests.map((req) => (
                  <li key={req.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          To: {req.to_user_id}
                        </p>
                        <p className="text-xs text-gray-500">
                          Status: <span className={`font-semibold ${req.status === "accepted" ? "text-green-600" : "text-yellow-600"}`}>{req.status}</span>
                        </p>
                        {req.message && (
                          <p className="text-xs text-gray-600 mt-1">&ldquo;{req.message}&rdquo;</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Organization Transfer */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Transfer Organization</h3>
            <p className="text-xs text-gray-600">Transfer ownership to another user.</p>
            
            <div className="space-y-2">
              <input
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="User email address"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
              <textarea
                value={transferMessage}
                onChange={(e) => setTransferMessage(e.target.value)}
                placeholder="Optional message to the user"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
              <button
                onClick={requestTransfer}
                disabled={transferring || !transferEmail.trim()}
                className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {transferring ? "Sending..." : "Send Transfer Request"}
              </button>
            </div>
          </div>

          {/* Deletion Requests */}
          {deletionRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Pending Deletion Requests</h3>
              <ul className="space-y-2">
                {deletionRequests.map((req) => (
                  <li key={req.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Requested by: {req.requested_by}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Reason: {req.reason}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(req.created_at).toLocaleString()}
                        </p>
                      </div>
                      {req.requested_by !== member.user_id && (
                        <button
                          onClick={() => approveDeletion(req.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1 rounded text-sm transition-colors"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Organization Deletion */}
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-bold text-red-700">Delete Organization</h3>
            <p className="text-xs text-gray-600">
              ⚠️ This action cannot be undone. All data will be permanently deleted.
            </p>
            
            <div className="space-y-2">
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Reason for deletion (required)"
                rows={3}
                className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
              <button
                onClick={requestDeletion}
                disabled={deleting || !deletionReason.trim()}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {deleting ? "Processing..." : "Request Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
