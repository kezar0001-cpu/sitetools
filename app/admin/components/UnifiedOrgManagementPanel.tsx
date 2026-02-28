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
  created_at?: string; 
  email?: string; 
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
  onOrgDeleted,
  onOrgUpdated 
}: UnifiedOrgManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "invitations" | "requests" | "settings">("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Auto-hide notifications
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // State for different sections
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeExpiry, setJoinCodeExpiry] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<OrgJoinRequest[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  // const [editorSiteIds, setEditorSiteIds] = useState<Record<string, string[]>>({});
  // const [transferRequests, setTransferRequests] = useState<any[]>([]);
  // const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  
  // Organization details state
  const [orgName, setOrgName] = useState(org.name);
  const [orgDescription, setOrgDescription] = useState(org.description ?? "");
  const [orgIsPublic, setOrgIsPublic] = useState(!!org.is_public);
  const [savingOrg, setSavingOrg] = useState(false);
  
  // Member management state
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [newMemberSiteIds, setNewMemberSiteIds] = useState<string[]>([]);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  
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

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from("org_members").select("*").eq("org_id", org.id);
    if (!data) return;
    
    // Fetch user emails for each member using auth.users
    const membersWithEmails = await Promise.all(
      (data as OrgMember[]).map(async (member) => {
        try {
          // Try to get user from auth.users via RPC
          const { data: userData, error: userError } = await supabase.rpc('get_user_by_id', {
            p_user_id: member.user_id
          });
          
          if (!userError && userData && userData.length > 0) {
            return {
              ...member,
              email: userData[0]?.email || userData[0]?.user_metadata?.email || member.user_id
            };
          }
          
          // Fallback: try to fetch from auth.users directly (if permissions allow)
          const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(member.user_id);
          
          if (!authError && user?.email) {
            return {
              ...member,
              email: user.email
            };
          }
          
          // Last resort: display user_id with a note
          return {
            ...member,
            email: `${member.user_id.substring(0, 8)}... (ID)`
          };
        } catch {
          return {
            ...member,
            email: `${member.user_id.substring(0, 8)}... (ID)`
          };
        }
      })
    );
    
    setMembers(membersWithEmails);
    // TODO: Implement editor site assignments when needed
    // const editorIds = (data as OrgMember[]).filter((m) => m.role === "editor").map((m) => m.id);
    // if (editorIds.length === 0) {
    //   setEditorSiteIds({});
    //   return;
    // }
    // const { data: sitesData } = await supabase
    //   .from("org_member_sites")
    //   .select("org_member_id, site_id")
    //   .in("org_member_id", editorIds);
    // const map: Record<string, string[]> = {};
    // editorIds.forEach((id) => { map[id] = []; });
    // (sitesData || []).forEach((row: { org_member_id: string; site_id: string }) => {
    //   if (!map[row.org_member_id]) map[row.org_member_id] = [];
    //   map[row.org_member_id].push(row.site_id);
    // });
    // setEditorSiteIds(map);
  }, [org.id]);

  async function saveOrgDetails(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSavingOrg(true);
    
    const { data, error } = await supabase
      .from("organisations")
      .update({ 
        name: orgName.trim(), 
        description: orgDescription.trim() || null, 
        is_public: orgIsPublic 
      })
      .eq("id", org.id)
      .select("*")
      .single();
    
    setSavingOrg(false);
    if (error || !data) {
      setError(error?.message ?? "Could not save organization details.");
      return;
    }
    
    setSuccess("Organization details saved successfully!");
    // Call onOrgUpdated if provided
    if (onOrgUpdated) {
      onOrgUpdated(data as Organisation);
    }
  }

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
          fetchJoinRequests(),
          fetchMembers()
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
  }, [activeTab, isAdmin, fetchJoinCode, fetchInvitations, fetchJoinRequests, fetchMembers]);

  // Sync organization details when org prop changes
  useEffect(() => {
    setOrgName(org.name);
    setOrgDescription(org.description ?? "");
    setOrgIsPublic(!!org.is_public);
  }, [org.id, org.name, org.description, org.is_public]);

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

  // Member management functions
  function toggleNewMemberSite(siteId: string) {
    setNewMemberSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberError(null);
    
    if (!newMemberEmail.trim()) {
      setMemberError("Email is required."); 
      return;
    }
    
    if (!isExistingUser && !newMemberPassword) {
      setMemberError("Password is required for new users."); 
      return;
    }
    
    if (newMemberRole === "editor" && newMemberSiteIds.length === 0) {
      setMemberError("Editors must be assigned to at least one site."); 
      return;
    }
    
    setAddingMember(true);
    
    try {
      if (isExistingUser) {
        // Add existing user directly to organization
        // First, try to find the user in auth.users by email
        let lookupError: unknown = null;
        let foundUser: { id: string; email?: string } | null = null;
        
        try {
          const result = await supabase.rpc('get_user_by_email', {
            p_email: newMemberEmail.trim()
          });
          if (Array.isArray(result.data)) {
            foundUser = result.data[0] ?? null;
          } else if (result.data) {
            // Some Supabase setups may return a single object instead of an array
            foundUser = result.data as { id: string; email?: string };
          }
          lookupError = result.error;
        } catch (err) {
          lookupError = err;
        }
        
        if (lookupError || !foundUser) {
          setMemberError("User not found. Please check the email address or create a new account.");
          return;
        }
        
        // Check if user is already in this organization
        const { data: existingMember } = await supabase
          .from("org_members")
          .select("*")
          .eq("org_id", org.id)
          .eq("user_id", foundUser.id)
          .maybeSingle();

        if (existingMember) {
          setMemberError("User is already a member of this organization.");
          return;
        }

        // Add user to organization (and get inserted row id)
        const { data: newMember, error: addError } = await supabase
          .from("org_members")
          .insert({
            org_id: org.id,
            user_id: foundUser.id,
            role: newMemberRole,
            site_id: newMemberRole === "editor" && newMemberSiteIds.length > 0 ? newMemberSiteIds[0] : null,
          })
          .select("id")
          .maybeSingle();

        if (addError || !newMember) {
          // Unique constraint (org_id, user_id) will raise an error if already a member.
          setMemberError(addError?.message ?? "Failed to add user to organization.");
          return;
        }

        // Add site assignments for editors (best-effort; keep org_members.site_id for compatibility)
        if (newMemberRole === "editor" && newMemberSiteIds.length > 0) {
          const { error: sitesErr } = await supabase
            .from("org_member_sites")
            .insert(
              newMemberSiteIds.map((siteId) => ({
                org_member_id: newMember.id,
                site_id: siteId,
              }))
            );

          if (sitesErr) {
            setMemberError(sitesErr.message ?? "Failed to assign sites to editor.");
            return;
          }
        }
        
        setSuccess("User added to organization successfully!");
      } else {
        // Create new user and add to organization
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/create-editor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            email: newMemberEmail.trim(),
            password: newMemberPassword,
            org_id: org.id,
            role: newMemberRole,
            site_ids: newMemberRole === "editor" ? newMemberSiteIds : [],
          }),
        });
        const json = await res.json();
        
        if (!res.ok) { 
          setMemberError(json.error ?? "Failed to create user."); 
          return; 
        }
        
        setSuccess("New user created and added to organization successfully!");
      }
      
      // Reset form
      setNewMemberEmail(""); 
      setNewMemberPassword(""); 
      setNewMemberRole("editor"); 
      setNewMemberSiteIds([]);
      setIsExistingUser(false);
      fetchMembers();
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(memberId: string, userId: string) {
    if (userId === member.user_id) return;
    setRemovingMemberId(memberId);
    const { error } = await supabase.from("org_members").delete().eq("id", memberId);
    setRemovingMemberId(null);
    if (error) { 
      setMemberError("Failed to remove member."); 
      return; 
    }
    fetchMembers();
  }

  async function handleRoleChange(memberId: string, newRole: "admin" | "editor" | "viewer") {
    setUpdatingMemberId(memberId);
    const { error } = await supabase.from("org_members").update({ role: newRole }).eq("id", memberId);
    setUpdatingMemberId(null);
    if (error) { 
      setMemberError("Failed to update role."); 
      return; 
    }
    fetchMembers();
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
      p_reason: deletionReason.trim()
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
      {/* Collapsible Header */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 text-yellow-900 rounded-lg p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900">Organization Management</h2>
              <p className="text-sm text-gray-500">Manage members, invitations, and settings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {members.length} members
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 text-gray-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <>
          {/* Tab Navigation */}
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
                  onClick={() => {
                    setActiveTab(tab.id as "overview" | "members" | "invitations" | "requests" | "settings");
                    setError(null);
                    setSuccess(null);
                  }}
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
            {/* Organization Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Organization Details</h3>
              <form onSubmit={saveOrgDetails} className="space-y-4 max-w-xl">
                {error && (
                  <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
                )}
                {success && (
                  <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">{success}</div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="org_name">Organization name</label>
                  <input
                    id="org_name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="org_desc">Description (optional)</label>
                  <textarea
                    id="org_desc"
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="org_public"
                    type="checkbox"
                    checked={orgIsPublic}
                    onChange={(e) => setOrgIsPublic(e.target.checked)}
                    className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                  />
                  <label htmlFor="org_public" className="text-sm text-gray-700">
                    <span className="font-semibold">Make organization discoverable</span>
                    <span className="text-gray-500 block text-xs">Allow users to find and request to join</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingOrg}
                    className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {savingOrg ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOrgName(org.name); setOrgDescription(org.description || ""); setOrgIsPublic(org.is_public || false); }}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-blue-600 text-sm font-medium">Total Members</div>
                <div className="text-2xl font-bold text-blue-900">{members.length}</div>
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
                  onClick={() => setActiveTab("members")}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium">Manage Members</span>
                  <span className="text-blue-500">→</span>
                </button>
                <button
                  onClick={() => setActiveTab("invitations")}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium">Send Invitation</span>
                  <span className="text-blue-500">→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && !loading && (
          <div className="space-y-6">
            {/* Add new member form */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Add Member</h3>
              {memberError && (
                <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{memberError}</div>
              )}
              
              {/* Existing vs New User Toggle */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="userType"
                    checked={!isExistingUser}
                    onChange={() => setIsExistingUser(false)}
                    className="w-4 h-4 text-blue-400 border-gray-300 rounded focus:ring-blue-400"
                  />
                  <span className="text-sm text-gray-700">Create new user</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="userType"
                    checked={isExistingUser}
                    onChange={() => setIsExistingUser(true)}
                    className="w-4 h-4 text-blue-400 border-gray-300 rounded focus:ring-blue-400"
                  />
                  <span className="text-sm text-gray-700">Add existing user</span>
                </label>
              </div>
              
              <form onSubmit={handleAddMember} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="member_email">Email address</label>
                  <input 
                    id="member_email" 
                    type="email" 
                    value={newMemberEmail} 
                    onChange={(e) => setNewMemberEmail(e.target.value)} 
                    required
                    placeholder={isExistingUser ? "Enter existing user email" : "Enter email for new account"}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" 
                  />
                </div>
                {!isExistingUser && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="member_password">Password</label>
                    <input 
                      id="member_password" 
                      type="password" 
                      value={newMemberPassword} 
                      onChange={(e) => setNewMemberPassword(e.target.value)} 
                      required
                      placeholder="Create password for new user"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" 
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="member_role">Role</label>
                  <select 
                    id="member_role" 
                    value={newMemberRole} 
                    onChange={(e) => setNewMemberRole(e.target.value as "admin" | "editor" | "viewer")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="admin">Admin (full organization management)</option>
                    <option value="editor">Editor (can manage visits for assigned sites)</option>
                    <option value="viewer">Viewer (read-only access)</option>
                  </select>
                </div>
                {newMemberRole === "editor" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Assign to sites</label>
                    <div className="space-y-2">
                      {orgSites.map((site) => (
                        <label key={site.id} className="flex items-center gap-2 text-sm">
                          <input 
                            type="checkbox" 
                            checked={newMemberSiteIds.includes(site.id)} 
                            onChange={() => toggleNewMemberSite(site.id)}
                            className="w-4 h-4 text-blue-400 border-gray-300 rounded focus:ring-blue-400" 
                          />
                          <span>{site.name}</span>
                        </label>
                      ))}
                      {orgSites.length === 0 && <span className="text-xs text-gray-500">No sites yet. Create one first.</span>}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    disabled={addingMember}
                    className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {addingMember ? "Adding…" : "Add Member"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setNewMemberEmail(""); setNewMemberPassword(""); setNewMemberRole("editor"); setNewMemberSiteIds([]); setIsExistingUser(false); }}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-2"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            {/* Existing members list */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Existing Members</h3>
              {members.length === 0 ? (
                <p className="text-gray-500 text-sm">No members yet.</p>
              ) : (
                <div className="space-y-2">
                  {members.map((memberItem) => (
                    <div key={memberItem.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{memberItem.email || memberItem.user_id}</p>
                          <p className="text-xs text-gray-500">Role: {memberItem.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select 
                            value={memberItem.role} 
                            onChange={(e) => handleRoleChange(memberItem.id, e.target.value as "admin" | "editor" | "viewer")}
                            disabled={updatingMemberId === memberItem.id}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button 
                            onClick={() => handleRemoveMember(memberItem.id, memberItem.user_id)} 
                            disabled={removingMemberId === memberItem.id || memberItem.user_id === member.user_id}
                            className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                          >
                            {removingMemberId === memberItem.id ? "Removing…" : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
        </>
      )}
    </div>
  );
}
