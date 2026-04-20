"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ModuleLoadingState } from "@/components/loading/ModuleLoadingState";
import { ErrorBanner, SuccessBanner, showSuccessToast, FieldError } from "@/components/feedback";
import { ErrorBoundary, SettingsErrorFallback } from "@/components/error";
import { deleteCompany, exportCompanyData, downloadUserData, fetchAuditLog, uploadCompanyLogo, removeCompanyLogo, transferOwnership, type AuditLogEntry } from "@/lib/workspace/client";
import { useCompany, useProfile, useUpdateCompany, useUpdateProfile, useInvalidateWorkspace } from "@/hooks/useWorkspace";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { canManageTeam, isSuperAdmin } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { useRouter, useSearchParams } from "next/navigation";
import {
  companyProfileSchema,
  profileUpdateSchema,
  type CompanyProfileFormData,
  type ProfileUpdateFormData,
} from "@/lib/validation/schemas";
import { AlertTriangle, Building2, MapPin, FolderKanban, FileText, Users, ClipboardList, Trash2, X, Shield, Smartphone, Monitor, Globe, Download, FileDown, History, User, Upload, XCircle, Crown, ArrowRightLeft, CheckCircle2 } from "lucide-react";

type Tab = "company" | "personal" | "security" | "data" | "danger";
type DataSubTab = "export" | "audit";

const VALID_TABS: Tab[] = ["company", "personal", "security", "data", "danger"];

function getValidTab(tab: string | null): Tab {
  if (tab && VALID_TABS.includes(tab as Tab)) {
    return tab as Tab;
  }
  return "company";
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });
  const activeCompanyFromSummary = summary?.activeMembership?.companies ?? null;
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;
  const activeRole = summary?.activeMembership?.role ?? null;
  const userId = summary?.userId ?? null;

  // TanStack Query hooks for company and profile data
  const { company, isLoading: isLoadingCompany } = useCompany(activeCompanyId, {
    enabled: !!activeCompanyId,
    staleTime: 5 * 60 * 1000,
  });
  const { profile: profileData, isLoading: isLoadingProfile } = useProfile(userId, {
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Use fetched data or fall back to summary data
  const activeCompany = company ?? activeCompanyFromSummary;
  const profile = profileData ?? summary?.profile ?? null;

  // Mutation hooks with optimistic updates
  const updateCompanyMutation = useUpdateCompany(activeCompanyId);
  const updateProfileMutation = useUpdateProfile(userId);

  const activeTab = getValidTab(searchParams.get("tab"));

  function setActiveTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
    clearTabErrors();
  }

  // Granular error states
  const [loadError, setLoadError] = useState<string | null>(null);
  const [companySaveError, setCompanySaveError] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Error boundary state
  const [boundaryError, setBoundaryError] = useState<Error | null>(null);

  // Success states for banner feedback
  const [companySaveSuccess, setCompanySaveSuccess] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Danger Zone state
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingCompany, setDeletingCompany] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionCounts, setDeletionCounts] = useState<{
    sites: number;
    projects: number;
    diaries: number;
    visits: number;
    teamMembers: number;
  } | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Transfer Ownership state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);
  const [emailConfirmText, setEmailConfirmText] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferStep, setTransferStep] = useState<"select" | "confirm" | "success">("select");

  // Get company members for transfer selection
  const { data: companyMembers, isLoading: loadingMembers } = useCompanyMembers(activeCompanyId);

  // Security state - Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Security state - Active sessions
  const [sessions, setSessions] = useState<Array<{
    id: string;
    deviceName: string;
    deviceType: "mobile" | "desktop" | "other";
    location: string;
    lastActive: string;
    isCurrent: boolean;
  }>>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [signingOutSession, setSigningOutSession] = useState<string | null>(null);

  // Company logo state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invalidateWorkspace = useInvalidateWorkspace();

  // Data Export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [lastExportCounts, setLastExportCounts] = useState<Record<string, number> | null>(null);
  const [downloadingUserData, setDownloadingUserData] = useState(false);

  // Audit Log state
  const [auditLogSubTab, setAuditLogSubTab] = useState<DataSubTab>("export");
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditCursor, setAuditCursor] = useState<string | undefined>(undefined);
  const [hasMoreAudit, setHasMoreAudit] = useState(false);
  const [totalAuditCount, setTotalAuditCount] = useState(0);

  const isSuperAdminUser = isSuperAdmin(summary?.profile?.email);
  const canEditCompany = canManageTeam(activeRole, summary?.profile?.email);
  const isOwner = activeRole === "owner" || isSuperAdminUser;

  // Company profile form with react-hook-form
  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    formState: { errors: companyErrors, isSubmitting: savingCompany, isValid: companyIsValid, isDirty: companyIsDirty },
    reset: resetCompany,
    watch: watchCompany,
  } = useForm<CompanyProfileFormData>({
    resolver: zodResolver(companyProfileSchema),
    mode: "onChange",
    defaultValues: {
      companyName: "",
    },
  });

  // Personal profile form with react-hook-form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: savingProfile, isValid: profileIsValid, isDirty: profileIsDirty },
    reset: resetProfile,
    watch: watchProfile,
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    mode: "onChange",
    defaultValues: {
      displayName: "",
      phoneNumber: "",
    },
  });

  // Sync form values with workspace data
  useEffect(() => {
    if (activeCompany?.name && !isLoadingCompany) {
      resetCompany({ companyName: activeCompany.name });
      // Clear save states when data refreshes
      setCompanySaveSuccess(false);
      setCompanySaveError(null);
    }
  }, [activeCompany?.name, resetCompany, isLoadingCompany]);

  useEffect(() => {
    if (profile && !isLoadingProfile) {
      resetProfile({
        displayName: profile.full_name || "",
        phoneNumber: profile.phone_number || "",
      });
      // Clear save states when data refreshes
      setProfileSaveSuccess(false);
      setProfileSaveError(null);
    }
  }, [profile, resetProfile, isLoadingProfile]);

  // Watch for changes to clear success states
  useEffect(() => {
    const subscription = watchCompany(() => {
      setCompanySaveSuccess(false);
    });
    return () => subscription.unsubscribe();
  }, [watchCompany]);

  useEffect(() => {
    const subscription = watchProfile(() => {
      setProfileSaveSuccess(false);
    });
    return () => subscription.unsubscribe();
  }, [watchProfile]);

  // Load active sessions when security tab is active
  useEffect(() => {
    if (activeTab === "security") {
      loadActiveSessions();
    }
  }, [activeTab]);

  function handleRetry() {
    setBoundaryError(null);
    window.location.reload();
  }

  function clearTabErrors() {
    setCompanySaveError(null);
    setProfileSaveError(null);
    setCompanySaveSuccess(false);
    setProfileSaveSuccess(false);
    setPasswordError(null);
    setPasswordSuccess(false);
    setSessionsError(null);
  }

  async function handleCompanySave(data: CompanyProfileFormData) {
    if (!activeCompanyId || !canEditCompany) return;
    setCompanySaveError(null);
    setCompanySaveSuccess(false);

    try {
      await updateCompanyMutation.mutateAsync({ name: data.companyName.trim() });
      setCompanySaveSuccess(true);
      showSuccessToast("Company name updated.");
      // Reset form state to mark as not dirty after successful save
      resetCompany({ companyName: data.companyName.trim() });
    } catch (err) {
      setCompanySaveError(err instanceof Error ? err.message : "Failed to update company. Try refreshing the page and attempting again.");
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeCompanyId || !canEditCompany) return;

    setUploadingLogo(true);
    setLogoError(null);

    try {
      const result = await uploadCompanyLogo(activeCompanyId, file);
      if (result.success) {
        showSuccessToast("Company logo updated.");
        // Invalidate company cache to refresh the logo
        invalidateWorkspace.invalidateCompany(activeCompanyId);
        // Also invalidate workspace summary to update any UI showing the logo
        invalidateWorkspace.invalidateWorkspaceSummary();
      } else {
        setLogoError(result.error);
      }
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleLogoRemove() {
    if (!activeCompanyId || !canEditCompany) return;

    setUploadingLogo(true);
    setLogoError(null);

    try {
      await removeCompanyLogo(activeCompanyId);
      showSuccessToast("Company logo removed.");
      // Invalidate company cache to refresh the logo
      invalidateWorkspace.invalidateCompany(activeCompanyId);
      invalidateWorkspace.invalidateWorkspaceSummary();
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Failed to remove logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleProfileSave(data: ProfileUpdateFormData) {
    if (!userId) return;
    setProfileSaveError(null);
    setProfileSaveSuccess(false);

    try {
      await updateProfileMutation.mutateAsync({
        full_name: data.displayName?.trim() || null,
        phone_number: data.phoneNumber?.trim() || null,
      });
      setProfileSaveSuccess(true);
      showSuccessToast("Profile updated.");
      // Reset form state to mark as not dirty after successful save
      resetProfile({
        displayName: data.displayName?.trim() || "",
        phoneNumber: data.phoneNumber?.trim() || "",
      });
    } catch (err) {
      setProfileSaveError(err instanceof Error ? err.message : "Failed to update profile. Try refreshing the page and attempting again.");
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validate passwords
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setPasswordError(error.message);
        return;
      }

      setPasswordSuccess(true);
      showSuccessToast("Password updated successfully.");
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function loadActiveSessions() {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) throw error;
      if (!session) {
        setSessionsError("Unable to retrieve session information.");
        return;
      }

      // Get user agent and create device info
      const userAgent = navigator.userAgent;
      const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
      const deviceType: "mobile" | "desktop" | "other" = isMobile ? "mobile" : "desktop";

      // Parse browser and OS info from user agent
      let deviceName = "Unknown Device";
      const browserMatch = userAgent.match(/(Chrome|Safari|Firefox|Edge|Opera)\/[\d.]+/);
      const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS|iPhone|iPad)/);
      if (browserMatch && osMatch) {
        deviceName = `${browserMatch[1]} on ${osMatch[1]}`;
      } else if (browserMatch) {
        deviceName = browserMatch[1];
      } else if (osMatch) {
        deviceName = osMatch[1];
      }

      // Create current session info
      // Note: Supabase doesn't expose all active sessions client-side for security
      // We show the current session with info we can gather
      const currentSession = {
        id: session.access_token.slice(-32), // Use last 32 chars as ID
        deviceName,
        deviceType,
        location: "Current location",
        lastActive: "Just now",
        isCurrent: true,
      };

      setSessions([currentSession]);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to load sessions.");
    } finally {
      setLoadingSessions(false);
    }
  }

  async function handleSignOutSession(sessionId: string) {
    setSigningOutSession(sessionId);
    try {
      const { supabase } = await import("@/lib/supabase");

      if (sessionId === "current") {
        // Sign out current session globally
        const { error } = await supabase.auth.signOut({ scope: "global" });
        if (error) throw error;
        router.push("/login");
      } else {
        // For other sessions, we sign out globally since Supabase doesn't support
        // revoking individual sessions from the client
        const { error } = await supabase.auth.signOut({ scope: "global" });
        if (error) throw error;
        router.push("/login");
      }
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to sign out session.");
    } finally {
      setSigningOutSession(null);
    }
  }

  async function loadDeletionCounts() {
    if (!activeCompanyId) return;
    setLoadingCounts(true);
    try {
      // Import supabase client
      const { supabase } = await import("@/lib/supabase");
      
      // Fetch counts in parallel
      const [
        { count: sitesCount },
        { count: projectsCount },
        { count: diariesCount },
        { count: visitsCount },
        { count: membersCount },
      ] = await Promise.all([
        supabase.from("sites").select("*", { count: "exact", head: true }).eq("company_id", activeCompanyId),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("company_id", activeCompanyId),
        supabase.from("site_diaries").select("*", { count: "exact", head: true }).eq("company_id", activeCompanyId),
        supabase.from("site_visits").select("*", { count: "exact", head: true }).eq("company_id", activeCompanyId),
        supabase.from("company_memberships").select("*", { count: "exact", head: true }).eq("company_id", activeCompanyId),
      ]);
      
      setDeletionCounts({
        sites: sitesCount ?? 0,
        projects: projectsCount ?? 0,
        diaries: diariesCount ?? 0,
        visits: visitsCount ?? 0,
        teamMembers: membersCount ?? 0,
      });
    } catch {
      // Silently fail - counts are optional
      setDeletionCounts(null);
    } finally {
      setLoadingCounts(false);
    }
  }

  async function handleDeleteCompany() {
    if (!activeCompanyId || !isOwner) return;
    const expectedText = `DELETE ${activeCompany?.name}`;
    if (deleteConfirmText !== expectedText) return;

    setDeletingCompany(true);
    setDeleteError(null);
    try {
      await deleteCompany(activeCompanyId);
      router.push("/onboarding");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete company. Ensure you have an active internet connection and try again.");
      setDeletingCompany(false);
    }
  }

  // Transfer Ownership handlers
  async function handleTransferOwnership() {
    if (!activeCompanyId || !isOwner || !selectedNewOwner) return;

    const selectedMember = companyMembers?.find(m => m.id === selectedNewOwner);
    if (!selectedMember?.email) {
      setTransferError("Selected member does not have a valid email address.");
      return;
    }

    // Validate email confirmation
    if (emailConfirmText.toLowerCase().trim() !== selectedMember.email.toLowerCase().trim()) {
      setTransferError("Email confirmation does not match the selected member's email.");
      return;
    }

    setTransferring(true);
    setTransferError(null);

    try {
      const result = await transferOwnership(activeCompanyId, selectedNewOwner);

      if (result.success) {
        setTransferStep("success");
        showSuccessToast(`Ownership transferred to ${result.data.new_owner_name || result.data.new_owner_email}`);
        // Invalidate workspace cache to refresh ownership status
        invalidateWorkspace.invalidateWorkspaceSummary();
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 3000);
      } else {
        setTransferError(result.error || "Failed to transfer ownership. Please try again.");
      }
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Failed to transfer ownership. Please try again.");
    } finally {
      setTransferring(false);
    }
  }

  function resetTransferModal() {
    setShowTransferModal(false);
    setSelectedNewOwner(null);
    setEmailConfirmText("");
    setTransferError(null);
    setTransferStep("select");
  }

  // Filter to only show admin members for ownership transfer
  const eligibleOwners = companyMembers?.filter(m => {
    // Need to get role from the workspace data - members from useCompanyMembers only have basic info
    // We'll filter by checking against team members with admin role from the workspace
    const memberDetails = summary?.memberships?.find(membership => membership.user_id === m.id);
    return memberDetails?.role === "admin" && m.id !== summary?.userId;
  }) ?? [];

  // Data Export handlers
  async function handleExportCompanyData() {
    if (!activeCompanyId) return;
    setExporting(true);
    setExportError(null);
    setExportSuccess(false);
    try {
      const result = await exportCompanyData(activeCompanyId);
      if (result.success) {
        // Download the file
        const url = window.URL.createObjectURL(result.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setExportSuccess(true);
        setLastExportCounts(result.recordCounts);
        showSuccessToast("Company data exported successfully.");
      } else {
        setExportError(result.error);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadUserData() {
    if (!userId) return;
    setDownloadingUserData(true);
    setExportError(null);
    try {
      const result = await downloadUserData(userId);
      if (result.success) {
        const url = window.URL.createObjectURL(result.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccessToast("Your data exported successfully.");
      } else {
        setExportError(result.error);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setDownloadingUserData(false);
    }
  }

  // Audit Log handlers
  const loadAuditLog = useCallback(async (loadMore = false) => {
    if (!activeCompanyId) return;
    setLoadingAudit(true);
    setAuditError(null);
    try {
      const result = await fetchAuditLog(activeCompanyId, loadMore ? auditCursor : undefined);
      if (result.success) {
        if (loadMore) {
          setAuditEntries(prev => [...prev, ...result.data.entries]);
        } else {
          setAuditEntries(result.data.entries);
        }
        setHasMoreAudit(result.data.hasMore);
        setTotalAuditCount(result.data.totalCount);
        // Use last entry's created_at as cursor for next page
        if (result.data.entries.length > 0) {
          setAuditCursor(result.data.entries[result.data.entries.length - 1].created_at);
        }
      } else {
        setAuditError(result.error);
      }
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : "Failed to load audit log.");
    } finally {
      setLoadingAudit(false);
    }
  }, [activeCompanyId, auditCursor]);

  // Load audit log when data tab is active and audit sub-tab is selected
  useEffect(() => {
    if (activeTab === "data" && auditLogSubTab === "audit" && auditEntries.length === 0) {
      loadAuditLog();
    }
  }, [activeTab, auditLogSubTab, auditEntries.length, loadAuditLog]);

  // Clear export errors when switching tabs
  useEffect(() => {
    if (activeTab !== "data") {
      setExportError(null);
      setExportSuccess(false);
      setAuditError(null);
    }
  }, [activeTab]);

  if (loading || !summary || isLoadingCompany || isLoadingProfile) {
    return <ModuleLoadingState variant="spinner" size="lg" fullPage />;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "company", label: "Company Profile" },
    { id: "personal", label: "Personal Profile" },
    { id: "security", label: "Security" },
    { id: "data", label: "Data & Privacy" },
    { id: "danger", label: "Danger Zone" },
  ];

  return (
    <ErrorBoundary
      fallback={<SettingsErrorFallback onRetry={handleRetry} error={boundaryError} />}
      onError={(error) => setBoundaryError(error)}
      resetKeys={[activeTab, activeCompanyId ?? '']}
    >
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your company and personal preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === tab.id
                ? tab.id === "danger"
                  ? "bg-white text-red-600 shadow-sm"
                  : "bg-white text-slate-900 shadow-sm"
                : tab.id === "danger"
                ? "text-red-400 hover:text-red-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Load error banner */}
      {loadError && (
        <ErrorBanner
          message={loadError}
          onDismiss={() => setLoadError(null)}
          action={{ label: "Retry", onClick: () => window.location.reload() }}
        />
      )}

      {/* Company Profile Tab */}
      {activeTab === "company" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Company Profile</h2>
            <p className="mt-1 text-sm text-slate-500">Update your company&apos;s display name and logo.</p>
          </div>

          {/* Company save success banner */}
          {companySaveSuccess && (
            <SuccessBanner
              message="Company name updated successfully."
              onDismiss={() => setCompanySaveSuccess(false)}
            />
          )}

          {/* Company save error banner */}
          {companySaveError && (
            <ErrorBanner
              message={companySaveError}
              onDismiss={() => setCompanySaveError(null)}
              action={{ label: "Retry", onClick: handleSubmitCompany(handleCompanySave) }}
            />
          )}

          {/* Logo error banner */}
          {logoError && (
            <ErrorBanner
              message={logoError}
              onDismiss={() => setLogoError(null)}
            />
          )}

          <form onSubmit={handleSubmitCompany(handleCompanySave)} className="space-y-6">
            {/* Company Logo Section */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Company Logo</label>
              <div className="flex items-start gap-4">
                {/* Logo Preview */}
                <div className="relative">
                  {activeCompany?.logo_url ? (
                    <div className="relative group">
                      <img
                        src={activeCompany.logo_url}
                        alt={`${activeCompany.name} logo`}
                        className="w-24 h-24 rounded-xl object-contain border border-slate-200 bg-white"
                      />
                      {canEditCompany && !uploadingLogo && (
                        <button
                          type="button"
                          onClick={handleLogoRemove}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove logo"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-2">
                  {canEditCompany ? (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold rounded-lg text-sm transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        {activeCompany?.logo_url ? "Change Logo" : "Upload Logo"}
                      </button>
                      <p className="text-xs text-slate-500">
                        PNG, JPEG, WebP, or SVG. Max 2MB.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Only Admins, Owners, and Super Admin can change the company logo.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5 space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Company Name</label>
              <input
                type="text"
                {...registerCompany("companyName")}
                disabled={!canEditCompany || savingCompany}
                placeholder="Your company name"
                className={`w-full border-2 ${companyErrors.companyName ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} focus:outline-none rounded-xl px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-400 transition-colors`}
              />
              <FieldError message={companyErrors.companyName?.message} />
              {!canEditCompany && !companyErrors.companyName && (
                <p className="text-xs text-slate-400">Only Admins, Owners, and Super Admin can edit the company name.</p>
              )}
            </div>

            {canEditCompany && (
              <button
                type="submit"
                disabled={savingCompany || !companyIsValid || !companyIsDirty || updateCompanyMutation.isPending}
                className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-950 font-black rounded-xl px-5 py-2.5 text-sm transition-colors"
              >
                {updateCompanyMutation.isPending ? "Saving…" : companyIsDirty ? "Save Changes" : "No Changes"}
              </button>
            )}
          </form>
        </div>
      )}

      {/* Personal Profile Tab */}
      {activeTab === "personal" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Personal Profile</h2>
            <p className="mt-1 text-sm text-slate-500">Update how your name appears to teammates.</p>
          </div>

          {/* Profile save success banner */}
          {profileSaveSuccess && (
            <SuccessBanner
              message="Display name updated successfully."
              onDismiss={() => setProfileSaveSuccess(false)}
            />
          )}

          {/* Profile save error banner */}
          {profileSaveError && (
            <ErrorBanner
              message={profileSaveError}
              onDismiss={() => setProfileSaveError(null)}
              action={{ label: "Retry", onClick: handleSubmitProfile(handleProfileSave) }}
            />
          )}

          <form onSubmit={handleSubmitProfile(handleProfileSave)} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Display Name</label>
              <input
                type="text"
                {...registerProfile("displayName")}
                disabled={savingProfile}
                placeholder="Your full name"
                className={`w-full border-2 ${profileErrors.displayName ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} focus:outline-none rounded-xl px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-400 transition-colors`}
              />
              <FieldError message={profileErrors.displayName?.message} />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Phone Number</label>
              <input
                type="tel"
                {...registerProfile("phoneNumber")}
                disabled={savingProfile}
                placeholder="+61 2 1234 5678"
                className={`w-full border-2 ${profileErrors.phoneNumber ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} focus:outline-none rounded-xl px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-400 transition-colors`}
              />
              <FieldError message={profileErrors.phoneNumber?.message} />
              <p className="text-xs text-slate-400">Include country code for international numbers (e.g., +61 for Australia).</p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={profile?.email ?? ""}
                disabled
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400">Email cannot be changed here.</p>
            </div>

            <button
              type="submit"
              disabled={savingProfile || !profileIsValid || !profileIsDirty || updateProfileMutation.isPending}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-950 font-black rounded-xl px-5 py-2.5 text-sm transition-colors"
            >
              {updateProfileMutation.isPending ? "Saving…" : profileIsDirty ? "Save Changes" : "No Changes"}
            </button>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change Password Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
                <p className="mt-1 text-sm text-slate-500">Update your password to keep your account secure.</p>
              </div>
            </div>

            {/* Password success banner */}
            {passwordSuccess && (
              <SuccessBanner
                message="Password updated successfully."
                onDismiss={() => setPasswordSuccess(false)}
              />
            )}

            {/* Password error banner */}
            {passwordError && (
              <ErrorBanner
                message={passwordError}
                onDismiss={() => setPasswordError(null)}
              />
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-2 border-slate-200 focus:border-amber-400 focus:outline-none rounded-xl px-4 py-3 text-sm transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-2 border-slate-200 focus:border-amber-400 focus:outline-none rounded-xl px-4 py-3 text-sm transition-colors"
                />
                <p className="text-xs text-slate-400">Must be at least 6 characters.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-2 border-slate-200 focus:border-amber-400 focus:outline-none rounded-xl px-4 py-3 text-sm transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-950 font-black rounded-xl px-5 py-2.5 text-sm transition-colors"
              >
                {changingPassword ? "Updating…" : "Update Password"}
              </button>
            </form>
          </div>

          {/* Active Sessions Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                <Globe className="w-5 h-5 text-sky-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900">Active Sessions</h2>
                <p className="mt-1 text-sm text-slate-500">Manage devices that are currently signed in to your account.</p>
              </div>
            </div>

            {/* Sessions error banner */}
            {sessionsError && (
              <ErrorBanner
                message={sessionsError}
                onDismiss={() => setSessionsError(null)}
                action={{ label: "Retry", onClick: loadActiveSessions }}
              />
            )}

            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No active sessions found.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      session.isCurrent
                        ? "bg-amber-50/50 border-amber-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        {session.deviceType === "mobile" ? (
                          <Smartphone className="w-5 h-5 text-slate-600" />
                        ) : (
                          <Monitor className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{session.deviceName}</p>
                          {session.isCurrent && (
                            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{session.location}</p>
                        <p className="text-xs text-slate-400">Active {session.lastActive}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSignOutSession(session.isCurrent ? "current" : session.id)}
                      disabled={signingOutSession === session.id}
                      className="shrink-0 text-red-600 hover:text-red-700 disabled:opacity-50 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      {signingOutSession === session.id ? (
                        <span className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                          Signing out…
                        </span>
                      ) : (
                        "Sign out"
                      )}
                    </button>
                  </div>
                ))}

                {/* Sign out all sessions button */}
                <div className="pt-3 border-t border-slate-200">
                  <button
                    onClick={() => handleSignOutSession("current")}
                    disabled={signingOutSession === "current"}
                    className="w-full text-center text-red-600 hover:text-red-700 disabled:opacity-50 font-semibold text-sm py-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    {signingOutSession === "current" ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <div className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                        Signing out all sessions…
                      </span>
                    ) : (
                      "Sign out all sessions"
                    )}
                  </button>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    This will sign you out of all devices and require you to sign in again.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data & Privacy Tab */}
      {activeTab === "data" && (
        <div className="space-y-6">
          {/* Sub-tabs for Data section */}
          <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setAuditLogSubTab("export")}
              className={`flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                auditLogSubTab === "export"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
            <button
              onClick={() => setAuditLogSubTab("audit")}
              className={`flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                auditLogSubTab === "audit"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <History className="w-4 h-4" />
              Audit Log
            </button>
          </div>

          {/* Export Data Sub-tab */}
          {auditLogSubTab === "export" && (
            <>
              {/* Company Data Export */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                    <FileDown className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Export Company Data</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Download a complete export of all your company&apos;s data in JSON format.
                    </p>
                  </div>
                </div>

                {/* Export success banner */}
                {exportSuccess && (
                  <SuccessBanner
                    message="Company data exported successfully!"
                    onDismiss={() => setExportSuccess(false)}
                  />
                )}

                {/* Export error banner */}
                {exportError && (
                  <ErrorBanner
                    message={exportError}
                    onDismiss={() => setExportError(null)}
                  />
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-3">
                    The export includes:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-sky-500" />
                      <span>Company profile</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-sky-500" />
                      <span>Projects</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-500" />
                      <span>Sites</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-500" />
                      <span>Team members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-sky-500" />
                      <span>Site diaries</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-sky-500" />
                      <span>Visits & checklists</span>
                    </div>
                  </div>
                </div>

                {lastExportCounts && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-green-700 mb-2">Last export contained:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(lastExportCounts).map(([key, count]) => (
                        <span key={key} className="text-xs bg-white px-2 py-1 rounded-full border border-green-200">
                          {key}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleExportCompanyData}
                  disabled={exporting || !activeCompanyId}
                  className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold rounded-xl px-5 py-3 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Exporting…
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download Company Export
                    </>
                  )}
                </button>
              </div>

              {/* GDPR - Download My Data */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Download My Data (GDPR)</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Download a copy of your personal data for portability or compliance purposes.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-emerald-700">
                    This export contains only your personal information and activity history. 
                    It does not include company-wide data that you may have access to as a team member.
                  </p>
                </div>

                <button
                  onClick={handleDownloadUserData}
                  disabled={downloadingUserData || !userId}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold rounded-xl px-5 py-3 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {downloadingUserData ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Preparing your data…
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download My Data
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Audit Log Sub-tab */}
          {auditLogSubTab === "audit" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <History className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Audit Log</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Recent changes to your profile and company records.
                  </p>
                </div>
              </div>

              {/* Audit error banner */}
              {auditError && (
                <ErrorBanner
                  message={auditError}
                  onDismiss={() => setAuditError(null)}
                  action={{ label: "Retry", onClick: () => loadAuditLog() }}
                />
              )}

              {/* Audit entries list */}
              <div className="space-y-3">
                {loadingAudit && auditEntries.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                  </div>
                ) : auditEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No audit entries found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Changes to your profile and company will appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-400">
                      Showing {auditEntries.length} of {totalAuditCount} entries
                    </p>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {auditEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                            {entry.entity_type === 'profile' && <User className="w-4 h-4 text-violet-600" />}
                            {entry.entity_type === 'membership' && <Users className="w-4 h-4 text-violet-600" />}
                            {entry.entity_type === 'invitation' && <ClipboardList className="w-4 h-4 text-violet-600" />}
                            {entry.entity_type === 'company' && <Building2 className="w-4 h-4 text-violet-600" />}
                            {entry.entity_type === 'site' && <MapPin className="w-4 h-4 text-violet-600" />}
                            {entry.entity_type === 'project' && <FolderKanban className="w-4 h-4 text-violet-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-900 capitalize">
                                {entry.action}
                              </span>
                              <span className="text-xs text-slate-400">
                                {entry.entity_type}
                              </span>
                              {typeof entry.metadata?.role === "string" && entry.metadata.role && (
                                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                                  {entry.metadata.role}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {typeof entry.metadata?.site_name === "string" && `Site: ${entry.metadata.site_name}`}
                              {typeof entry.metadata?.project_name === "string" && `Project: ${entry.metadata.project_name}`}
                              {typeof entry.metadata?.invited_email === "string" && `Invited: ${entry.metadata.invited_email}`}
                              {typeof entry.metadata?.note === "string" && entry.metadata.note}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400">
                                by {entry.performed_by.full_name || entry.performed_by.email || 'Unknown'}
                              </span>
                              <span className="text-xs text-slate-300">•</span>
                              <span className="text-xs text-slate-400">
                                {new Date(entry.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMoreAudit && (
                      <button
                        onClick={() => loadAuditLog(true)}
                        disabled={loadingAudit}
                        className="w-full py-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
                      >
                        {loadingAudit ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                            Loading more…
                          </span>
                        ) : (
                          'Load more entries'
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === "danger" && (
        <div className="bg-red-50/80 border-2 border-red-200 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Header with warning icon */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-700">Danger Zone</h2>
              <p className="mt-1 text-sm text-red-600/80">Irreversible and destructive actions. Proceed with extreme caution.</p>
            </div>
          </div>

          {/* Transfer Ownership card */}
          {isOwner && (
            <div className="bg-white border border-amber-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mt-0.5">
                    <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Transfer Ownership</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Transfer ownership of <span className="font-semibold text-amber-700">{activeCompany?.name}</span> to another admin.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTransferModal(true);
                    setTransferError(null);
                    setTransferStep("select");
                  }}
                  disabled={!isOwner || eligibleOwners.length === 0}
                  title={
                    !isOwner
                      ? "Only the company owner can transfer ownership."
                      : eligibleOwners.length === 0
                        ? "No eligible admin members found. Promote a member to admin first."
                        : "Transfer ownership to another admin"
                  }
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl px-4 py-2 text-sm transition-colors"
                >
                  Transfer Ownership
                </button>
              </div>

              {eligibleOwners.length === 0 && (
                <div className="border-t border-amber-100 pt-3">
                  <p className="text-xs text-amber-600">
                    No eligible admin members found. Promote a team member to admin role before transferring ownership.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Data deletion warning card */}
          <div className="bg-white border border-red-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center mt-0.5">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Delete Company</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Permanently delete <span className="font-semibold text-red-700">{activeCompany?.name}</span> and all associated data.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setDeleteError(null);
                  loadDeletionCounts();
                }}
                disabled={!isOwner}
                title={!isOwner ? "Only the company owner can delete the company." : undefined}
                className="shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl px-4 py-2 text-sm transition-colors"
              >
                Delete Company
              </button>
            </div>

            {/* Data types that will be deleted */}
            <div className="border-t border-red-100 pt-4">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">
                All of the following will be permanently deleted:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Company profile & settings</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>All sites & locations</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FolderKanban className="w-3.5 h-3.5 text-red-500" />
                  <span>All projects</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>Site diaries & records</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <ClipboardList className="w-3.5 h-3.5 text-red-500" />
                  <span>Checklists & inspections</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Users className="w-3.5 h-3.5 text-red-500" />
                  <span>All team member access</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-red-600 font-medium">
                This includes all photos, signatures, ITPs, documents, and activity history. This action cannot be undone.
              </p>
            </div>
          </div>

          {!isOwner && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Only the company owner or Super Admin can delete the company.</span>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-md mx-4 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Delete company?</h3>
                <p className="mt-1 text-sm text-slate-600">
                  You are about to permanently delete <span className="font-semibold text-red-700">{activeCompany?.name}</span>.
                </p>
              </div>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); setDeleteError(null); }}
                disabled={deletingCompany}
                className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Affected record counts */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">
                Records to be deleted
              </p>
              {loadingCounts ? (
                <div className="flex items-center justify-center py-2">
                  <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                </div>
              ) : deletionCounts ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      Sites
                    </span>
                    <span className="font-semibold text-slate-900">{deletionCounts.sites}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-red-500" />
                      Projects
                    </span>
                    <span className="font-semibold text-slate-900">{deletionCounts.projects}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-red-500" />
                      Site Diaries
                    </span>
                    <span className="font-semibold text-slate-900">{deletionCounts.diaries}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-red-500" />
                      Visits & Records
                    </span>
                    <span className="font-semibold text-slate-900">{deletionCounts.visits}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm col-span-2 border-t border-red-200 pt-2 mt-1">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-red-500" />
                      Team Members (access revoked)
                    </span>
                    <span className="font-semibold text-slate-900">{deletionCounts.teamMembers}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Unable to load record counts. All company data will be deleted.</p>
              )}
            </div>

            {/* Delete error display */}
            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{deleteError}</p>
              </div>
            )}

            {/* Confirmation input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">
                To confirm deletion, type <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded">DELETE {activeCompany?.name}</span> below
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`DELETE ${activeCompany?.name ?? ""}`}
                className={`w-full border-2 ${deleteError ? "border-red-300" : "border-slate-200"} focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 rounded-xl px-3 py-2.5 text-sm transition-all`}
              />
              <p className="text-xs text-slate-500">
                This action <span className="font-semibold text-red-600">cannot be undone</span>. All data will be permanently lost.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); setDeleteError(null); }}
                disabled={deletingCompany}
                className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCompany}
                disabled={deletingCompany || deleteConfirmText !== `DELETE ${activeCompany?.name}`}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:bg-red-400 rounded-xl transition-colors flex items-center gap-2"
              >
                {deletingCompany ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 w-full max-w-md mx-4 p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                {transferStep === "success" ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <Crown className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {transferStep === "select" && "Transfer Ownership"}
                  {transferStep === "confirm" && "Confirm Transfer"}
                  {transferStep === "success" && "Transfer Complete"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {transferStep === "select" && "Select a new owner from your admin team members."}
                  {transferStep === "confirm" && "Enter the new owner's email to confirm this irreversible action."}
                  {transferStep === "success" && `Ownership has been transferred successfully.`}
                </p>
              </div>
              {transferStep !== "success" && (
                <button
                  onClick={resetTransferModal}
                  disabled={transferring}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              )}
            </div>

            {/* Transfer Error */}
            {transferError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{transferError}</p>
              </div>
            )}

            {/* Step 1: Select New Owner */}
            {transferStep === "select" && (
              <>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Select new owner (must be an admin)
                  </p>
                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
                    </div>
                  ) : eligibleOwners.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-sm text-amber-700">
                        No eligible admin members found. Please promote a team member to admin role first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {eligibleOwners.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => setSelectedNewOwner(member.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                            selectedNewOwner === member.id
                              ? "border-amber-500 bg-amber-50"
                              : "border-slate-200 hover:border-amber-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {member.email}
                            </p>
                          </div>
                          {selectedNewOwner === member.id && (
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700">
                    <strong>Important:</strong> You will be demoted to admin role after the transfer. This action cannot be undone.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={resetTransferModal}
                    disabled={transferring}
                    className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setTransferStep("confirm")}
                    disabled={!selectedNewOwner || eligibleOwners.length === 0}
                    className="px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:bg-amber-300 rounded-xl transition-colors flex items-center gap-2"
                  >
                    Continue
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Confirm with Email */}
            {transferStep === "confirm" && selectedNewOwner && (
              <>
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">Transferring ownership to:</p>
                    {(() => {
                      const member = companyMembers?.find(m => m.id === selectedNewOwner);
                      return (
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{member?.name}</p>
                            <p className="text-xs text-slate-500">{member?.email}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600">
                      To confirm, type the new owner&apos;s email address below
                    </label>
                    <input
                      type="email"
                      value={emailConfirmText}
                      onChange={(e) => setEmailConfirmText(e.target.value)}
                      placeholder="newowner@example.com"
                      className={`w-full border-2 ${transferError ? "border-red-300" : "border-slate-200"} focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 rounded-xl px-3 py-2.5 text-sm transition-all`}
                    />
                    <p className="text-xs text-slate-500">
                      This will transfer ownership of <span className="font-semibold text-amber-700">{activeCompany?.name}</span> and demote you to admin role.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setTransferStep("select")}
                    disabled={transferring}
                    className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleTransferOwnership}
                    disabled={transferring}
                    className="px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:bg-amber-300 rounded-xl transition-colors flex items-center gap-2"
                  >
                    {transferring ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Transferring…
                      </>
                    ) : (
                      <>
                        <Crown className="w-3.5 h-3.5" />
                        Confirm Transfer
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Success */}
            {transferStep === "success" && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-green-800 mb-1">
                    Ownership Transferred Successfully
                  </p>
                  <p className="text-xs text-green-600">
                    You have been demoted to admin role. Redirecting to dashboard…
                  </p>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
