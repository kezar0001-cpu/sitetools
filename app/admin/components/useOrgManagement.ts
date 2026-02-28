import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Organisation, OrgMember, Site, OrgInvitation, OrgJoinRequest } from "./types";

export function useOrgManagement(
    org: Organisation,
    member: OrgMember,
    orgSites: Site[],
    onOrgDeleted?: () => void,
    onOrgUpdated?: (org: Organisation) => void
) {
    const [activeTab, setActiveTab] = useState<"overview" | "members" | "invitations" | "requests" | "settings">("overview");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(true);

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

    const [joinCode, setJoinCode] = useState("");
    const [joinCodeExpiry, setJoinCodeExpiry] = useState("");
    const [generatingCode, setGeneratingCode] = useState(false);

    const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
    const [joinRequests, setJoinRequests] = useState<OrgJoinRequest[]>([]);
    const [members, setMembers] = useState<OrgMember[]>([]);

    const [orgName, setOrgName] = useState(org.name);
    const [orgDescription, setOrgDescription] = useState(org.description ?? "");
    const [orgIsPublic, setOrgIsPublic] = useState(!!org.is_public);
    const [savingOrg, setSavingOrg] = useState(false);

    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberPassword, setNewMemberPassword] = useState("");
    const [newMemberRole, setNewMemberRole] = useState<"admin" | "editor" | "viewer">("editor");
    const [newMemberSiteIds, setNewMemberSiteIds] = useState<string[]>([]);
    const [isExistingUser, setIsExistingUser] = useState(false);
    const [addingMember, setAddingMember] = useState(false);
    const [memberError, setMemberError] = useState<string | null>(null);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

    const [newInvitationEmail, setNewInvitationEmail] = useState("");
    const [newInvitationRole, setNewInvitationRole] = useState("viewer");
    const [newInvitationSiteId, setNewInvitationSiteId] = useState<string | null>(null);
    const [transferEmail, setTransferEmail] = useState("");
    const [transferMessage, setTransferMessage] = useState("");
    const [deletionReason, setDeletionReason] = useState("");

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

    const fetchInvitations = useCallback(async () => {
        const { data } = await supabase
            .from("org_invitations")
            .select("*")
            .eq("org_id", org.id)
            .order("created_at", { ascending: false });
        if (data) setInvitations(data as OrgInvitation[]);
    }, [org.id]);

    const fetchJoinRequests = useCallback(async () => {
        const { data } = await supabase
            .from("org_join_requests")
            .select("*")
            .eq("org_id", org.id)
            .order("created_at", { ascending: false });
        if (data) setJoinRequests(data as OrgJoinRequest[]);
    }, [org.id]);

    const fetchMembers = useCallback(async () => {
        const { data } = await supabase.from("org_members").select("*").eq("org_id", org.id);
        if (!data) return;

        const membersWithEmails = await Promise.all(
            (data as OrgMember[]).map(async (m) => {
                try {
                    const { data: userData, error: userError } = await supabase.rpc('get_user_by_id', { p_user_id: m.user_id });
                    if (!userError && userData && userData.length > 0) {
                        return { ...m, email: userData[0]?.email || userData[0]?.user_metadata?.email || m.user_id };
                    }
                    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(m.user_id);
                    if (!authError && user?.email) {
                        return { ...m, email: user.email };
                    }
                    return { ...m, email: `${m.user_id.substring(0, 8)}... (ID)` };
                } catch {
                    return { ...m, email: `${m.user_id.substring(0, 8)}... (ID)` };
                }
            })
        );
        setMembers(membersWithEmails);
    }, [org.id]);

    useEffect(() => {
        if (!isAdmin) return;
        setLoading(true);
        const loadData = async () => {
            try {
                await Promise.all([fetchJoinCode(), fetchInvitations(), fetchJoinRequests(), fetchMembers()]);
            } catch {
                setError("Failed to load organization data");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [activeTab, isAdmin, fetchJoinCode, fetchInvitations, fetchJoinRequests, fetchMembers]);

    useEffect(() => {
        setOrgName(org.name);
        setOrgDescription(org.description ?? "");
        setOrgIsPublic(!!org.is_public);
    }, [org.id, org.name, org.description, org.is_public]);

    async function saveOrgDetails(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setSavingOrg(true);

        const { data, error } = await supabase
            .from("organisations")
            .update({ name: orgName.trim(), description: orgDescription.trim() || null, is_public: orgIsPublic })
            .eq("id", org.id)
            .select("*")
            .single();

        setSavingOrg(false);
        if (error || !data) {
            setError(error?.message ?? "Could not save organization details.");
            return;
        }
        setSuccess("Organization details saved successfully!");
        if (onOrgUpdated) onOrgUpdated(data as Organisation);
    }

    async function generateJoinCode() {
        setGeneratingCode(true);
        setError(null);
        const { data, error } = await supabase.rpc("generate_org_join_code", { p_org_id: org.id, p_expires_hours: 168 });
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
        if (!newInvitationEmail.trim()) return setError("Please enter an email address");
        setLoading(true);
        setError(null);
        const { error } = await supabase.from("org_invitations").insert({
            org_id: org.id, email: newInvitationEmail.trim(), role: newInvitationRole,
            site_id: newInvitationSiteId, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        setLoading(false);
        if (error) return setError(error.message);
        setSuccess("Invitation sent successfully!");
        setNewInvitationEmail(""); setNewInvitationRole("viewer"); setNewInvitationSiteId(null);
        fetchInvitations();
    }

    async function revokeInvitation(invitationId: string) {
        const { error } = await supabase.from("org_invitations").update({ status: "revoked" }).eq("id", invitationId);
        if (error) return setError("Failed to revoke invitation");
        setSuccess("Invitation revoked");
        fetchInvitations();
    }

    async function approveJoinRequest(requestId: string, role: string, siteId: string | null) {
        const { data, error } = await supabase.rpc("approve_join_request", { p_request_id: requestId, p_role: role, p_site_id: siteId });
        if (error || !data) return setError(error?.message || "Failed to approve request");
        const result = data as { success: boolean; message: string };
        if (result.success) {
            setSuccess(result.message);
            fetchJoinRequests();
        } else {
            setError(result.message);
        }
    }

    async function rejectJoinRequest(requestId: string) {
        const { error } = await supabase.from("org_join_requests").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", requestId);
        if (error) return setError("Failed to reject request");
        setSuccess("Request rejected");
        fetchJoinRequests();
    }

    function toggleNewMemberSite(siteId: string) {
        setNewMemberSiteIds((prev) => prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]);
    }

    async function handleAddMember(e: React.FormEvent) {
        e.preventDefault();
        setMemberError(null);
        if (!newMemberEmail.trim()) return setMemberError("Email is required.");
        if (!isExistingUser && !newMemberPassword) return setMemberError("Password is required for new users.");
        if (newMemberRole === "editor" && newMemberSiteIds.length === 0) return setMemberError("Editors must be assigned to at least one site.");

        setAddingMember(true);
        try {
            if (isExistingUser) {
                let lookupError: unknown = null;
                let foundUser: { id: string; email?: string } | null = null;
                try {
                    const result = await supabase.rpc('get_user_by_email', { p_email: newMemberEmail.trim() });
                    if (Array.isArray(result.data)) foundUser = result.data[0] ?? null;
                    else if (result.data) foundUser = result.data as { id: string; email?: string };
                    lookupError = result.error;
                } catch (err) { lookupError = err; }

                if (lookupError || !foundUser) return setMemberError("User not found. Please check the email address or create a new account.");

                const { data: existingMember } = await supabase.from("org_members").select("*").eq("org_id", org.id).eq("user_id", foundUser.id).maybeSingle();
                if (existingMember) return setMemberError("User is already a member of this organization.");

                const { data: newMember, error: addError } = await supabase
                    .from("org_members")
                    .insert({ org_id: org.id, user_id: foundUser.id, role: newMemberRole, site_id: newMemberRole === "editor" && newMemberSiteIds.length > 0 ? newMemberSiteIds[0] : null })
                    .select("id").maybeSingle();

                if (addError || !newMember) return setMemberError(addError?.message ?? "Failed to add user to organization.");

                if (newMemberRole === "editor" && newMemberSiteIds.length > 0) {
                    const { error: sitesErr } = await supabase.from("org_member_sites").insert(
                        newMemberSiteIds.map((siteId) => ({ org_member_id: newMember.id, site_id: siteId }))
                    );
                    if (sitesErr) return setMemberError(sitesErr.message ?? "Failed to assign sites to editor.");
                }
                setSuccess("User added to organization successfully!");
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch("/api/create-editor", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                    },
                    body: JSON.stringify({
                        email: newMemberEmail.trim(), password: newMemberPassword, org_id: org.id,
                        role: newMemberRole, site_ids: newMemberRole === "editor" ? newMemberSiteIds : [],
                    }),
                });
                const json = await res.json();
                if (!res.ok) return setMemberError(json.error ?? "Failed to create user.");
                setSuccess("New user created and added to organization successfully!");
            }
            setNewMemberEmail(""); setNewMemberPassword(""); setNewMemberRole("editor"); setNewMemberSiteIds([]); setIsExistingUser(false);
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
        if (error) return setMemberError("Failed to remove member.");
        fetchMembers();
    }

    async function handleRoleChange(memberId: string, newRole: "admin" | "editor" | "viewer") {
        setUpdatingMemberId(memberId);
        const { error } = await supabase.from("org_members").update({ role: newRole }).eq("id", memberId);
        setUpdatingMemberId(null);
        if (error) return setMemberError("Failed to update role.");
        fetchMembers();
    }

    async function requestTransfer() {
        if (!transferEmail.trim()) return setError("Please enter an email address");
        setLoading(true); setError(null);
        setError("User lookup functionality to be implemented");
        setLoading(false);
    }

    async function requestDeletion() {
        if (!deletionReason.trim()) return setError("Please provide a reason for deletion");
        setLoading(true); setError(null);
        const { data, error } = await supabase.rpc("request_org_deletion", { p_org_id: org.id, p_reason: deletionReason.trim() });
        setLoading(false);
        if (error || !data) return setError(error?.message || "Failed to request deletion");
        const result = data as { success: boolean; message: string };
        if (result.success) {
            setSuccess(result.message);
            setDeletionReason("");
            if (result.message.includes("deleted successfully")) onOrgDeleted?.();
        } else {
            setError(result.message);
        }
    }

    return {
        isAdmin, activeTab, setActiveTab, loading, error, success, setIsCollapsed, isCollapsed, setError, setSuccess,
        joinCode, joinCodeExpiry, generatingCode,
        invitations, joinRequests, members, orgSites,
        orgName, setOrgName, orgDescription, setOrgDescription, orgIsPublic, setOrgIsPublic, savingOrg,
        newMemberEmail, setNewMemberEmail, newMemberPassword, setNewMemberPassword, newMemberRole, setNewMemberRole,
        newMemberSiteIds, isExistingUser, setIsExistingUser, addingMember, memberError, removingMemberId, updatingMemberId,
        newInvitationEmail, setNewInvitationEmail, newInvitationRole, setNewInvitationRole, newInvitationSiteId, setNewInvitationSiteId,
        transferEmail, setTransferEmail, transferMessage, setTransferMessage, deletionReason, setDeletionReason, member, org,
        saveOrgDetails, generateJoinCode, copyJoinCode, sendInvitation, revokeInvitation, approveJoinRequest, rejectJoinRequest,
        toggleNewMemberSite, handleAddMember, handleRemoveMember, handleRoleChange, requestTransfer, requestDeletion
    };
}
