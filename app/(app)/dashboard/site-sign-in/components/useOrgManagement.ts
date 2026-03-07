import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Organisation, OrgMember, Site, OrgJoinRequest } from "./types";

export function useOrgManagement(
    org: Organisation,
    member: OrgMember,
    orgSites: Site[],
    onOrgDeleted?: () => void,
    onOrgUpdated?: (org: Organisation) => void
) {
    // ─── UI state ────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"overview" | "members" | "requests" | "settings">("overview");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(true);

    // Auto-dismiss messages
    useEffect(() => {
        if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); }
    }, [error]);
    useEffect(() => {
        if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
    }, [success]);

    // ─── Org details ──────────────────────────────────────
    const [orgName, setOrgName] = useState(org.name);
    const [orgDescription, setOrgDescription] = useState(org.description ?? "");
    const [orgIsPublic, setOrgIsPublic] = useState(!!org.is_public);
    const [savingOrg, setSavingOrg] = useState(false);

    useEffect(() => {
        setOrgName(org.name);
        setOrgDescription(org.description ?? "");
        setOrgIsPublic(!!org.is_public);
    }, [org.id, org.name, org.description, org.is_public]);

    // ─── Join code ────────────────────────────────────────
    const [joinCode, setJoinCode] = useState("");
    const [joinCodeExpiry, setJoinCodeExpiry] = useState("");
    const [generatingCode, setGeneratingCode] = useState(false);

    // ─── Members ──────────────────────────────────────────
    const [members, setMembers] = useState<OrgMember[]>([]);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberPassword, setNewMemberPassword] = useState("");
    const [newMemberRole, setNewMemberRole] = useState<"admin" | "editor" | "viewer">("editor");
    const [newMemberSiteIds, setNewMemberSiteIds] = useState<string[]>([]);
    const [isExistingUser, setIsExistingUser] = useState(false);
    const [addingMember, setAddingMember] = useState(false);
    const [memberError, setMemberError] = useState<string | null>(null);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

    // ─── Join requests ────────────────────────────────────
    const [joinRequests, setJoinRequests] = useState<OrgJoinRequest[]>([]);

    const isAdmin = member.role === "admin";

    // ─── Fetch functions ──────────────────────────────────

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

    const fetchMembers = useCallback(async () => {
        const { data } = await supabase.from("org_members").select("*").eq("org_id", org.id);
        if (!data) return;

        const membersWithEmails = await Promise.all(
            (data as OrgMember[]).map(async (m) => {
                try {
                    const { data: userData, error: rpcError } = await supabase.rpc("get_user_by_id", { p_user_id: m.user_id });
                    if (!rpcError && Array.isArray(userData) && userData.length > 0 && userData[0]?.email) {
                        return { ...m, email: userData[0].email as string };
                    }
                } catch {
                    // RPC not yet deployed — fall through
                }
                return { ...m, email: `${m.user_id.substring(0, 8)}…` };
            })
        );
        setMembers(membersWithEmails);
    }, [org.id]);

    const fetchJoinRequests = useCallback(async () => {
        const { data } = await supabase
            .from("org_join_requests")
            .select("*")
            .eq("org_id", org.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false });
        if (!data) return;

        // Resolve emails for each requester
        const withEmails = await Promise.all(
            (data as OrgJoinRequest[]).map(async (r) => {
                try {
                    const { data: userData } = await supabase.rpc("get_user_by_id", { p_user_id: r.user_id });
                    if (Array.isArray(userData) && userData.length > 0 && userData[0]?.email) {
                        return { ...r, user_email: userData[0].email as string };
                    }
                } catch { /* fall through */ }
                return { ...r, user_email: `${r.user_id.substring(0, 8)}…` };
            })
        );
        setJoinRequests(withEmails);
    }, [org.id]);

    // ─── Load data on tab change (admin only) ─────────────
    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                await Promise.all([fetchJoinCode(), fetchMembers(), fetchJoinRequests()]);
            } catch {
                if (!cancelled) setError("Failed to load organization data");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isAdmin, fetchJoinCode, fetchMembers, fetchJoinRequests]);

    // ─── Actions ──────────────────────────────────────────

    async function saveOrgDetails(e: React.FormEvent) {
        e.preventDefault();
        setError(null); setSuccess(null);
        setSavingOrg(true);
        const { data, error } = await supabase
            .from("organisations")
            .update({ name: orgName.trim(), description: orgDescription.trim() || null, is_public: orgIsPublic })
            .eq("id", org.id)
            .select("*")
            .single();
        setSavingOrg(false);
        if (error || !data) { setError(error?.message ?? "Could not save."); return; }
        setSuccess("Organization details saved!");
        if (onOrgUpdated) onOrgUpdated(data as Organisation);
    }

    async function generateJoinCode() {
        setGeneratingCode(true); setError(null);
        const { data, error } = await supabase.rpc("generate_org_join_code", { p_org_id: org.id, p_expires_hours: 168 });
        setGeneratingCode(false);
        if (error || !data) { setError(error?.message || "Failed to generate join code"); return; }
        const result = data as { success: boolean; join_code?: string; message?: string };
        if (result.success && result.join_code) {
            setJoinCode(result.join_code);
            setJoinCodeExpiry(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
            setSuccess("Join code generated!");
        } else {
            setError(result.message || "Failed to generate join code");
        }
    }

    async function copyJoinCode() {
        if (joinCode) {
            await navigator.clipboard.writeText(joinCode);
            setSuccess("Join code copied!");
        }
    }

    async function approveJoinRequest(requestId: string, role: string, siteId: string | null) {
        const { data, error } = await supabase.rpc("approve_join_request", { p_request_id: requestId, p_role: role, p_site_id: siteId });
        if (error || !data) { setError(error?.message || "Failed to approve request"); return; }
        const result = data as { success: boolean; message: string };
        if (result.success) { setSuccess(result.message); fetchJoinRequests(); fetchMembers(); }
        else { setError(result.message); }
    }

    async function rejectJoinRequest(requestId: string) {
        const { error } = await supabase
            .from("org_join_requests")
            .update({ status: "rejected", reviewed_by: member.user_id, reviewed_at: new Date().toISOString() })
            .eq("id", requestId);
        if (error) { setError("Failed to reject request"); return; }
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
                // Look up user
                const { data: userData, error: lookupErr } = await supabase.rpc("get_user_by_email", { p_email: newMemberEmail.trim() });
                const foundUser = Array.isArray(userData) ? userData[0] : userData;
                if (lookupErr || !foundUser) return setMemberError("User not found. Check the email or create a new account.");

                // Check not already a member
                const { data: existing } = await supabase.from("org_members").select("id").eq("org_id", org.id).eq("user_id", foundUser.id).maybeSingle();
                if (existing) return setMemberError("User is already a member.");

                // Add
                const { data: newMem, error: addErr } = await supabase
                    .from("org_members")
                    .insert({ org_id: org.id, user_id: foundUser.id, role: newMemberRole, site_id: newMemberRole === "editor" && newMemberSiteIds.length > 0 ? newMemberSiteIds[0] : null })
                    .select("id").maybeSingle();
                if (addErr || !newMem) return setMemberError(addErr?.message ?? "Failed to add user.");

                // Add site assignments for editors
                if (newMemberRole === "editor" && newMemberSiteIds.length > 0) {
                    await supabase.from("org_member_sites").insert(
                        newMemberSiteIds.map((sid) => ({ org_member_id: newMem.id, site_id: sid }))
                    );
                }
                setSuccess("User added to organization!");
            } else {
                // Create new user via server API (needs service role key)
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
                setSuccess("New user created and added!");
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

    async function deleteOrganisation() {
        if (!confirm("Are you sure? This will permanently delete the organization, all sites, and all visit data. This cannot be undone.")) return;
        setLoading(true);
        const { error } = await supabase.from("organisations").delete().eq("id", org.id);
        setLoading(false);
        if (error) { setError("Failed to delete organization: " + error.message); return; }
        onOrgDeleted?.();
    }

    return {
        isAdmin, activeTab, setActiveTab, loading, error, success, setError, setSuccess,
        isCollapsed, setIsCollapsed,
        // Org details
        orgName, setOrgName, orgDescription, setOrgDescription, orgIsPublic, setOrgIsPublic, savingOrg,
        saveOrgDetails,
        // Join code
        joinCode, joinCodeExpiry, generatingCode, generateJoinCode, copyJoinCode,
        // Members
        members, orgSites, org, member,
        newMemberEmail, setNewMemberEmail, newMemberPassword, setNewMemberPassword,
        newMemberRole, setNewMemberRole, newMemberSiteIds, isExistingUser, setIsExistingUser,
        addingMember, memberError, removingMemberId, updatingMemberId,
        toggleNewMemberSite, handleAddMember, handleRemoveMember, handleRoleChange,
        // Join requests
        joinRequests, approveJoinRequest, rejectJoinRequest,
        // Danger
        deleteOrganisation,
    };
}
