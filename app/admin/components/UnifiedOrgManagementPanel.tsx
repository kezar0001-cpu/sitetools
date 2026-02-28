"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Organisation { 
  id: string; 
  name: string; 
  created_at: string; 
  is_public?: boolean; 
  description?: string | null; 
  join_code?: string | null; 
  join_code_expires?: string | null; 
  created_by?: string | null; 
}

interface OrgMember { 
  id: string; 
  org_id: string; 
  user_id: string; 
  role: "admin" | "editor" | "viewer"; 
  site_id: string | null; 
}

interface Site { 
  id: string; 
  name: string; 
  slug: string; 
  org_id: string; 
  logo_url?: string | null; 
}

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

interface OrgJoinRequest { 
  id: string; 
  org_id: string; 
  user_id: string; 
  message: string | null; 
  status: string; 
  created_at: string; 
  reviewed_by: string | null; 
  reviewed_at: string | null; 
}

// interface OrgTransferRequest { 
//   id: string; 
//   org_id: string; 
//   from_user_id: string; 
//   to_user_id: string; 
//   message: string | null; 
//   status: string; 
//   created_at: string; 
//   expires_at: string; 
//   responded_at: string | null; 
// }

// interface OrgDeletionRequest { 
//   id: string; 
//   org_id: string; 
//   requested_by: string; 
//   reason: string | null; 
//   status: string; 
//   created_at: string; 
//   approved_at: string | null; 
//   approved_by: string | null; 
// }

interface UnifiedOrgManagementPanelProps {
  org: Organisation;
  member: OrgMember;
  orgSites: Site[];
  onOrgDeleted?: () => void;
  onOrgUpdated?: (org: Organisation) => void;
}

export function UnifiedOrgManagementPanel({ 
  org, 
  member, 
  orgSites, 
  onOrgDeleted 
}: UnifiedOrgManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "invitations" | "requests" | "settings">("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for different sections
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeExpiry, setJoinCodeExpiry] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<OrgJoinRequest[]>([]);
  // const [transferRequests, setTransferRequests] = useState<any[]>([]);
  // const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  
  // Form states
  const [newInvitationEmail, setNewInvitationEmail] = useState("");
  const [newInvitationRole, setNewInvitationRole] = useState("viewer");
  const [newInvitationSiteId, setNewInvitationSiteId] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [deletionReason, setDeletionReason] = useState("");

  const isAdmin = member.role === "admin";

  // Data fetching functions
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

  const fetchInvitations = useCallback(async () => {
    const { data } = await supabase
      .from("org_invitations")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false });
    
    if (data) {
      setInvitations(data as OrgInvitation[]);
    }
  }, [org.id]);

  const fetchJoinRequests = useCallback(async () => {
    const { data } = await supabase
      .from("org_join_requests")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false });
    
    if (data) {
      setJoinRequests(data as OrgJoinRequest[]);
    }
  }, [org.id]);

  // const fetchTransferRequests = useCallback(async () => {
  //   const { data } = await supabase
  //     .from("org_transfer_requests")
  //     .select("*")
  //     .eq("org_id", org.id)
  //     .in("status", ["pending", "accepted"])
  //     .order("created_at", { ascending: false });
    
  //   if (data) {
  //     setTransferRequests(data as any[]);
  //   }
  // }, [org.id]);

  // const fetchDeletionRequests = useCallback(async () => {
  //   const { data } = await supabase
  //     .from("org_deletion_requests")
  //     .select("*")
  //     .eq("org_id", org.id)
  //     .eq("status", "pending")
  //     .order("created_at", { ascending: false });
    
  //   if (data) {
  //     setDeletionRequests(data as any[]);
  //   }
  // }, [org.id]);

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin) return;
    
    setLoading(true);
    const loadData = async () => {
      try {
        await Promise.all([
          fetchJoinCode(),
          fetchInvitations(),
          fetchJoinRequests()
          // fetchTransferRequests(),
          // fetchDeletionRequests()
        ]);
      } catch {
        setError("Failed to load organization data");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [activeTab, isAdmin, fetchJoinCode, fetchInvitations, fetchJoinRequests]);

  // Action handlers
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

  async function copyJoinCode() {
    if (joinCode) {
      await navigator.clipboard.writeText(joinCode);
      setSuccess("Join code copied to clipboard!");
    }
  }

  async function sendInvitation() {
    if (!newInvitationEmail.trim()) {
      setError("Please enter an email address");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const { error } = await supabase
      .from("org_invitations")
      .insert({
        org_id: org.id,
        email: newInvitationEmail.trim(),
        role: newInvitationRole,
        site_id: newInvitationSiteId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    
    setLoading(false);
    
    if (error) {
      setError(error.message);
      return;
    }
    
    setSuccess("Invitation sent successfully!");
    setNewInvitationEmail("");
    setNewInvitationRole("viewer");
    setNewInvitationSiteId(null);
    fetchInvitations();
  }

  async function revokeInvitation(invitationId: string) {
    const { error } = await supabase
      .from("org_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId);
    
    if (error) {
      setError("Failed to revoke invitation");
      return;
    }
    
    setSuccess("Invitation revoked");
    fetchInvitations();
  }

  async function approveJoinRequest(requestId: string, role: string, siteId: string | null) {
    const { data, error } = await supabase.rpc("approve_join_request", {
      p_request_id: requestId,
      p_role: role,
      p_site_id: siteId
    });
    
    if (error || !data) {
      setError(error?.message || "Failed to approve request");
      return;
    }
    
    const result = data as { success: boolean; message: string };
    if (result.success) {
      setSuccess(result.message);
      fetchJoinRequests();
    } else {
      setError(result.message);
    }
  }

  async function rejectJoinRequest(requestId: string) {
    const { error } = await supabase
      .from("org_join_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", requestId);
    
    if (error) {
      setError("Failed to reject request");
      return;
    }
    
    setSuccess("Request rejected");
    fetchJoinRequests();
  }

  async function requestTransfer() {
    if (!transferEmail.trim()) {
      setError("Please enter an email address");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Find user by email (this would need to be implemented with proper auth)
    // const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    // TODO: Implement user lookup functionality
    // For now, show a placeholder message
    setError("User lookup functionality to be implemented");
    setLoading(false);
    return;
    
    // const { data, error } = await supabase.rpc("request_org_transfer", {
    //   p_org_id: org.id,
    //   p_to_user_id: targetUser.id,
    //   p_message: transferMessage
    // });
    
    // setLoading(false);
    // 
    // if (error || !data) {
    //   setError(error?.message || "Failed to request transfer");
    //   return;
    // }
    // 
    // const result = data as { success: boolean; message: string };
    // if (result.success) {
    //   setSuccess(result.message);
    //   setTransferEmail("");
    //   setTransferMessage("");
    //   fetchTransferRequests();
    // } else {
    //   setError(result.message);
    // }
  }

  async function requestDeletion() {
    if (!deletionReason.trim()) {
      setError("Please provide a reason for deletion");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase.rpc("request_org_deletion", {
      p_org_id: org.id,
      p_reason: deletionReason
    });
    
    setLoading(false);
    
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
        // fetchDeletionRequests();
      }
    } else {
      setError(result.message);
    }
  }


  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-700 rounded-lg p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">Organization Management</h2>
              <p className="text-sm text-gray-600">{org.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: "overview", name: "Overview", icon: "📊" },
            { id: "members", name: "Members", icon: "👥" },
            { id: "invitations", name: "Invitations", icon: "✉️" },
            { id: "requests", name: "Join Requests", icon: "📝" },
            { id: "settings", name: "Settings", icon: "⚙️" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "overview" | "members" | "invitations" | "requests" | "settings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
              {tab.id === "invitations" && invitations.filter(i => i.status === "pending").length > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
                  {invitations.filter(i => i.status === "pending").length}
                </span>
              )}
              {tab.id === "requests" && joinRequests.filter(r => r.status === "pending").length > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-600 text-xs font-bold px-2 py-1 rounded-full">
                  {joinRequests.filter(r => r.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
            {success}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && !loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-blue-600 text-sm font-medium">Total Members</div>
                <div className="text-2xl font-bold text-blue-900">{/* Member count would go here */}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-green-600 text-sm font-medium">Active Sites</div>
                <div className="text-2xl font-bold text-green-900">{orgSites.length}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-purple-600 text-sm font-medium">Pending Requests</div>
                <div className="text-2xl font-bold text-purple-900">
                  {invitations.filter(i => i.status === "pending").length + joinRequests.filter(r => r.status === "pending").length}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab("invitations")}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium">Send Invitation</span>
                  <span className="text-blue-500">→</span>
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium">Generate Join Code</span>
                  <span className="text-blue-500">→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && !loading && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Organization Members</h3>
            <p className="text-sm text-gray-600">Manage organization members and their roles.</p>
            {/* Members management would go here - this would integrate with existing MembersPanel */}
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500 text-sm">Member management panel would be integrated here</p>
            </div>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === "invitations" && !loading && (
          <div className="space-y-6">
            {/* Send New Invitation */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Send New Invitation</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="email"
                  value={newInvitationEmail}
                  onChange={(e) => setNewInvitationEmail(e.target.value)}
                  placeholder="Email address"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <select
                  value={newInvitationRole}
                  onChange={(e) => setNewInvitationRole(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={newInvitationSiteId || ""}
                  onChange={(e) => setNewInvitationSiteId(e.target.value || null)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">No site assignment</option>
                  {orgSites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
                <button
                  onClick={sendInvitation}
                  disabled={loading || !newInvitationEmail.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {loading ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </div>

            {/* Existing Invitations */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Existing Invitations</h3>
              {invitations.length === 0 ? (
                <p className="text-gray-500 text-sm">No invitations sent yet.</p>
              ) : (
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                          <p className="text-xs text-gray-500">
                            Role: {invitation.role} • Status: {invitation.status} • 
                            Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        {invitation.status === "pending" && (
                          <button
                            onClick={() => revokeInvitation(invitation.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Join Requests Tab */}
        {activeTab === "requests" && !loading && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Join Requests</h3>
            {joinRequests.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending join requests.</p>
            ) : (
              <div className="space-y-2">
                {joinRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">User: {request.user_id}</p>
                        {request.message && (
                          <p className="text-xs text-gray-600 mt-1">&ldquo;{request.message}&rdquo;</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Status: {request.status} • {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <select
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                            defaultValue="viewer"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button
                            onClick={() => approveJoinRequest(request.id, "viewer", null)}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1 rounded text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectJoinRequest(request.id)}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1 rounded text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && !loading && (
          <div className="space-y-6">
            {/* Join Code Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Join Code</h3>
              <p className="text-xs text-gray-600">Generate a code that allows users to join directly without approval.</p>
              
              {joinCode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm">{joinCode}</code>
                    <button
                      onClick={copyJoinCode}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-lg text-sm transition-colors"
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

            {/* Organization Transfer */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-bold text-gray-900">Transfer Organization</h3>
              <p className="text-xs text-gray-600">Transfer ownership to another user.</p>
              
              <div className="space-y-2">
                <input
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  placeholder="User email address"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <textarea
                  value={transferMessage}
                  onChange={(e) => setTransferMessage(e.target.value)}
                  placeholder="Optional message to the user"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={requestTransfer}
                  disabled={loading || !transferEmail.trim()}
                  className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {loading ? "Sending..." : "Send Transfer Request"}
                </button>
              </div>
            </div>

            {/* Organization Deletion */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
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
                  className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <button
                  onClick={requestDeletion}
                  disabled={loading || !deletionReason.trim()}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {loading ? "Processing..." : "Request Deletion"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
