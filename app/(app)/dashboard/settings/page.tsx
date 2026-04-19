"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ModuleLoadingState } from "@/components/loading/ModuleLoadingState";
import { deleteCompany, updateCompany, updateProfile } from "@/lib/workspace/client";
import { canManageTeam } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { useRouter } from "next/navigation";
import {
  companyProfileSchema,
  profileUpdateSchema,
  type CompanyProfileFormData,
  type ProfileUpdateFormData,
} from "@/lib/validation/schemas";

type Tab = "company" | "personal" | "danger";

export default function SettingsPage() {
  const router = useRouter();
  const { loading, summary, refresh } = useWorkspace({ requireAuth: true, requireCompany: true });
  const activeCompany = summary?.activeMembership?.companies ?? null;
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;
  const activeRole = summary?.activeMembership?.role ?? null;
  const userId = summary?.userId ?? null;
  const profile = summary?.profile ?? null;

  const [activeTab, setActiveTab] = useState<Tab>("company");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Danger Zone state
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingCompany, setDeletingCompany] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canEditCompany = canManageTeam(activeRole);
  const isOwner = activeRole === "owner";

  // Company profile form with react-hook-form
  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    formState: { errors: companyErrors, isSubmitting: savingCompany, isValid: companyIsValid },
    reset: resetCompany,
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
    formState: { errors: profileErrors, isSubmitting: savingProfile, isValid: profileIsValid },
    reset: resetProfile,
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    mode: "onChange",
    defaultValues: {
      displayName: "",
    },
  });

  // Sync form values with workspace data
  useEffect(() => {
    if (activeCompany?.name) {
      resetCompany({ companyName: activeCompany.name });
    }
  }, [activeCompany?.name, resetCompany]);

  useEffect(() => {
    if (profile?.full_name) {
      resetProfile({ displayName: profile.full_name });
    }
  }, [profile?.full_name, resetProfile]);

  function clearMessages() {
    setError(null);
    setSuccessMessage(null);
  }

  async function handleCompanySave(data: CompanyProfileFormData) {
    if (!activeCompanyId || !canEditCompany) return;
    clearMessages();

    try {
      await updateCompany(activeCompanyId, { name: data.companyName.trim() });
      await refresh();
      setSuccessMessage("Company name updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update company.");
    }
  }

  async function handleProfileSave(data: ProfileUpdateFormData) {
    if (!userId) return;
    clearMessages();

    try {
      await updateProfile(userId, { full_name: data.displayName?.trim() || null });
      await refresh();
      setSuccessMessage("Display name updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    }
  }

  async function handleDeleteCompany() {
    if (!activeCompanyId || !isOwner) return;
    if (deleteConfirmText !== activeCompany?.name) return;

    setDeletingCompany(true);
    clearMessages();
    try {
      await deleteCompany(activeCompanyId);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete company.");
      setDeletingCompany(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading || !summary) {
    return <ModuleLoadingState variant="spinner" size="lg" fullPage />;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "company", label: "Company Profile" },
    { id: "personal", label: "Personal Profile" },
    { id: "danger", label: "Danger Zone" },
  ];

  return (
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
            onClick={() => { setActiveTab(tab.id); clearMessages(); }}
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

      {/* Feedback banners */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-3 text-emerald-400 hover:text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Company Profile Tab */}
      {activeTab === "company" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Company Profile</h2>
            <p className="mt-1 text-sm text-slate-500">Update your company&apos;s display name.</p>
          </div>

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
              {companyErrors.companyName && (
                <p className="text-xs text-red-500">{companyErrors.companyName.message}</p>
              )}
              {!canEditCompany && !companyErrors.companyName && (
                <p className="text-xs text-slate-400">Only Admins and Owners can edit the company name.</p>
              )}
            </div>

            {canEditCompany && (
              <button
                type="submit"
                disabled={savingCompany || !companyIsValid}
                className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-950 font-black rounded-xl px-5 py-2.5 text-sm transition-colors"
              >
                {savingCompany ? "Saving…" : "Save Changes"}
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
              {profileErrors.displayName && (
                <p className="text-xs text-red-500">{profileErrors.displayName.message}</p>
              )}
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
              disabled={savingProfile || !profileIsValid}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-950 font-black rounded-xl px-5 py-2.5 text-sm transition-colors"
            >
              {savingProfile ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === "danger" && (
        <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-red-700">Danger Zone</h2>
            <p className="mt-1 text-sm text-slate-500">Irreversible actions. Proceed with caution.</p>
          </div>

          <div className="border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Delete Company</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanently delete <span className="font-semibold">{activeCompany?.name}</span> and all associated data. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => { setShowDeleteConfirm(true); clearMessages(); }}
              disabled={!isOwner}
              title={!isOwner ? "Only the company owner can delete the company." : undefined}
              className="shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl px-4 py-2 text-sm transition-colors"
            >
              Delete
            </button>
          </div>

          {!isOwner && (
            <p className="text-xs text-slate-400">Only the company owner can delete the company.</p>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete company?</h3>
                <p className="mt-1 text-sm text-slate-600">
                  This will permanently delete <span className="font-semibold">{activeCompany?.name}</span> and all its data. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">
                Type <span className="font-mono text-red-600">{activeCompany?.name}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={activeCompany?.name ?? ""}
                className="w-full border-2 border-slate-200 focus:border-red-400 focus:outline-none rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                disabled={deletingCompany}
                className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCompany}
                disabled={deletingCompany || deleteConfirmText !== activeCompany?.name}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 transition-colors"
              >
                {deletingCompany ? "Deleting…" : "Delete Company"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
