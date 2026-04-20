"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ModuleLoadingState } from "@/components/loading/ModuleLoadingState";
import { ErrorBanner, SuccessBanner, showSuccessToast, FieldError } from "@/components/feedback";
import { ErrorBoundary, SettingsErrorFallback } from "@/components/error";
import { deleteCompany } from "@/lib/workspace/client";
import { useCompany, useProfile, useUpdateCompany, useUpdateProfile } from "@/hooks/useWorkspace";
import { canManageTeam, isSuperAdmin } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { useRouter, useSearchParams } from "next/navigation";
import {
  companyProfileSchema,
  profileUpdateSchema,
  type CompanyProfileFormData,
  type ProfileUpdateFormData,
} from "@/lib/validation/schemas";
import { AlertTriangle, Building2, MapPin, FolderKanban, FileText, Users, ClipboardList, Trash2, X, Shield, Smartphone, Monitor, Globe } from "lucide-react";

type Tab = "company" | "personal" | "security" | "danger";

const VALID_TABS: Tab[] = ["company", "personal", "security", "danger"];

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
  }, [profile?.full_name, profile?.phone_number, resetProfile, isLoadingProfile]);

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

  function clearErrors() {
    setLoadError(null);
    setCompanySaveError(null);
    setProfileSaveError(null);
    setDeleteError(null);
    setBoundaryError(null);
    setPasswordError(null);
    setSessionsError(null);
  }

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

  if (loading || !summary || isLoadingCompany || isLoadingProfile) {
    return <ModuleLoadingState variant="spinner" size="lg" fullPage />;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "company", label: "Company Profile" },
    { id: "personal", label: "Personal Profile" },
    { id: "security", label: "Security" },
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
            <p className="mt-1 text-sm text-slate-500">Update your company&apos;s display name.</p>
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

          <form onSubmit={handleSubmitCompany(handleCompanySave)} className="space-y-4">
            <div className="space-y-1">
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
    </div>
    </ErrorBoundary>
  );
}
