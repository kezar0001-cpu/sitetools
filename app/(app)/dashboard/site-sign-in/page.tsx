"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner, showErrorToast, showSuccessToast } from "@/components/feedback";
import { loadJsPDF, loadXLSX, preloadJsPDF, preloadXLSX } from "@/lib/dynamicImports";
import { setActiveSite } from "@/lib/workspace/client";
import { canManageSites, canUseModules, isSuperAdmin } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import type { SiteVisit } from "@/lib/workspace/types";
import { useCompanySites } from "@/hooks/useSites";
import { useSiteVisits, useVisitMutations } from "@/hooks/useSiteVisits";
import { useQueryClient } from "@tanstack/react-query";
import { visitKeys } from "@/lib/workspace/client";
import { DailyBriefingPanel } from "./components/DailyBriefingPanel";
import { SiteInductionPanel } from "./components/SiteInductionPanel";
import {
  visitEntrySchema,
  visitEditSchema,
  visitorTypes,
  type VisitEntryFormData,
  type VisitEditFormData,
} from "@/lib/validation/schemas";
import type { VisitorType } from "@/lib/validation/schemas";

// Extracted components
import { SiteSelector } from "./components/SiteSelector";
import { ManualEntryForm } from "./components/ManualEntryForm";
import { VisitFilters, type RecordStatusFilter, type ExportRange } from "./components/VisitFilters";
import { ExportPanel } from "./components/ExportPanel";
import { VisitTable } from "./components/VisitTable";
import { BulkActionsModal } from "./components/BulkActionsModal";
import { SignatureViewer } from "./components/SignatureViewer";
import { StatsPanel } from "./components/StatsPanel";
import { ConnectedToolkitPrompt } from "./components/ConnectedToolkitPrompt";

function dateToInputValue(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toLocalDateValue(iso: string) {
  return dateToInputValue(new Date(iso));
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.max(0, Math.round(totalMinutes % 60));
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function SiteSignInModulePage() {
  const queryClient = useQueryClient();
  const { loading, summary, refresh } = useWorkspace({ requireAuth: true, requireCompany: true });
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;
  const activeRole = summary?.activeMembership?.role ?? null;
  const profileActiveSiteId = summary?.profile?.active_site_id ?? null;

  const { sites, isLoading: sitesLoading, prefetchSites } = useCompanySites(activeCompanyId, {
    staleTime: 5 * 60 * 1000,
  });

  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  const { visits, isLoading: visitsLoading } = useSiteVisits(activeCompanyId, selectedSiteId, {
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
  });

  const { createVisit, updateVisit, signOutVisit, bulkSignOut, deleteVisit } = useVisitMutations(
    activeCompanyId,
    selectedSiteId
  );

  // Manual entry form with react-hook-form
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    formState: { errors: addErrors, isValid: addIsValid },
    reset: resetAdd,
  } = useForm<VisitEntryFormData>({
    resolver: zodResolver(visitEntrySchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      companyName: "",
      visitorType: "Worker",
      signedInAt: "",
      signedOutAt: "",
    },
  });

  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState<typeof visitorTypes[number] | "">("");
  const [filterStatus, setFilterStatus] = useState<RecordStatusFilter>("all");
  const [exportRange, setExportRange] = useState<ExportRange>("all");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewSignature, setViewSignature] = useState<string | null>(null);

  const [showBulkSignOutModal, setShowBulkSignOutModal] = useState(false);
  const [siteManagementTab, setSiteManagementTab] = useState<"briefing" | "induction">("briefing");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Inline edit form with react-hook-form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors, isSubmitting: editSaving, isValid: editIsValid },
    reset: resetEdit,
    watch: watchEdit,
    setValue: setEditValue,
  } = useForm<VisitEditFormData>({
    resolver: zodResolver(visitEditSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      companyName: "",
      visitorType: "Worker",
      signedInAt: "",
      signedOutAt: "",
    },
  });

  const editSignedOut = watchEdit("signedOutAt");

  // Export loading states
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);

  const isSuperAdminUser = isSuperAdmin(summary?.profile?.email);
  const canDelete = canManageSites(activeRole, summary?.profile?.email);
  const canEdit = canUseModules(activeRole, summary?.profile?.email);

  // Derived loading states from mutations
  const adding = createVisit.isPending;
  const signingOutId = signOutVisit.isPending ? "pending" : null;
  const bulkSigningOut = bulkSignOut.isPending;
  const deletingId = deleteVisit.isPending ? "pending" : null;

  useEffect(() => {
    if (sites.length === 0) {
      setSelectedSiteId("");
      return;
    }

    const preferredSiteId =
      (profileActiveSiteId && sites.find((site) => site.id === profileActiveSiteId)?.id) || sites[0].id;

    setSelectedSiteId((prev) => {
      if (prev && sites.some((site) => site.id === prev)) return prev;
      return preferredSiteId;
    });
  }, [sites, profileActiveSiteId]);

  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null;

  const filteredVisits = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return visits.filter((visit) => {
      const dateMatch = filterDate ? toLocalDateValue(visit.signed_in_at) === filterDate : true;
      const typeMatch = filterType ? visit.visitor_type === filterType : true;
      const statusMatch =
        filterStatus === "all" ? true : filterStatus === "onSite" ? !visit.signed_out_at : !!visit.signed_out_at;
      const searchMatch = search
        ? `${visit.full_name} ${visit.company_name} ${visit.phone_number ?? ""}`.toLowerCase().includes(search)
        : true;
      return dateMatch && typeMatch && statusMatch && searchMatch;
    });
  }, [visits, filterDate, filterType, filterStatus, searchText]);

  const exportableVisits = useMemo(() => {
    if (exportRange === "all") return filteredVisits;

    const now = new Date();

    if (exportRange === "today") {
      const today = dateToInputValue(now);
      return filteredVisits.filter((visit) => toLocalDateValue(visit.signed_in_at) === today);
    }

    if (exportRange === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return filteredVisits.filter((visit) => new Date(visit.signed_in_at) >= weekAgo);
    }

    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return filteredVisits.filter((visit) => new Date(visit.signed_in_at) >= monthAgo);
  }, [filteredVisits, exportRange]);

  const onSiteCount = useMemo(() => visits.filter((visit) => !visit.signed_out_at).length, [visits]);
  const todayCount = useMemo(() => {
    const today = dateToInputValue(new Date());
    return visits.filter((visit) => toLocalDateValue(visit.signed_in_at) === today).length;
  }, [visits]);

  function clearEdit() {
    setEditingId(null);
    resetEdit({
      fullName: "",
      phoneNumber: "",
      companyName: "",
      visitorType: "Worker",
      signedInAt: "",
      signedOutAt: "",
    });
  }

  function startEdit(visit: SiteVisit) {
    setEditingId(visit.id);
    resetEdit({
      fullName: visit.full_name,
      phoneNumber: visit.phone_number ?? "",
      companyName: visit.company_name,
      visitorType: visit.visitor_type,
      signedInAt: toDatetimeLocal(visit.signed_in_at),
      signedOutAt: toDatetimeLocal(visit.signed_out_at),
    });
  }

  async function handleSwitchSite(nextSiteId: string) {
    setSelectedSiteId(nextSiteId);
    clearEdit();

    try {
      await setActiveSite(nextSiteId);
      await refresh();
      setPageError(null);
      const siteName = sites.find(s => s.id === nextSiteId)?.name ?? "Site";
      showSuccessToast(`Now working on ${siteName}`);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Could not set working site. Try selecting the site again.");
    }
  }

  async function handleAddVisit(data: VisitEntryFormData) {
    if (!activeCompanyId || !selectedSiteId) return;

    // Create optimistic visit with temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticVisit: SiteVisit = {
      id: tempId,
      company_id: activeCompanyId,
      site_id: selectedSiteId,
      project_id: null,
      full_name: data.fullName.trim(),
      phone_number: data.phoneNumber?.trim() || null,
      company_name: data.companyName.trim(),
      visitor_type: data.visitorType,
      signature: null,
      signed_in_at: data.signedInAt ? new Date(data.signedInAt).toISOString() : new Date().toISOString(),
      signed_out_at: data.signedOutAt ? new Date(data.signedOutAt).toISOString() : null,
      created_by_user_id: null,
      signed_in_by_user_id: null,
    };

    // Immediately add to visits for optimistic UI
    const currentVisits = visits;
    queryClient.setQueryData<SiteVisit[]>(visitKeys.site(activeCompanyId, selectedSiteId), (old) => {
      return [optimisticVisit, ...(old ?? [])];
    });

    resetAdd({
      fullName: "",
      phoneNumber: "",
      companyName: "",
      visitorType: "Worker",
      signedInAt: "",
      signedOutAt: "",
    });

    try {
      await createVisit.mutateAsync({
        company_id: activeCompanyId,
        site_id: selectedSiteId,
        full_name: data.fullName.trim(),
        phone_number: data.phoneNumber?.trim() || null,
        company_name: data.companyName.trim(),
        visitor_type: data.visitorType,
        signed_in_at: data.signedInAt ? new Date(data.signedInAt).toISOString() : null,
        signed_out_at: data.signedOutAt ? new Date(data.signedOutAt).toISOString() : null,
      });

      // Refresh to get server-generated ID
      queryClient.invalidateQueries({ queryKey: visitKeys.site(activeCompanyId, selectedSiteId) });
      showSuccessToast("Visitor record added.");
    } catch (err) {
      // Rollback: remove optimistic entry on error
      queryClient.setQueryData<SiteVisit[]>(visitKeys.site(activeCompanyId, selectedSiteId), currentVisits);
      showErrorToast(err instanceof Error ? `${err.message} Check your connection and try again.` : "Failed to add visitor. Please check your connection and try again.");
    }
  }

  async function handleSaveEdit(data: VisitEditFormData, visitId: string) {
    if (!selectedSiteId) return;

    updateVisit.mutate(
      {
        id: visitId,
        site_id: selectedSiteId,
        full_name: data.fullName.trim(),
        phone_number: data.phoneNumber?.trim() || null,
        company_name: data.companyName.trim(),
        visitor_type: data.visitorType,
        signed_in_at: new Date(data.signedInAt).toISOString(),
        signed_out_at: data.signedOutAt ? new Date(data.signedOutAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          clearEdit();
          showSuccessToast("Record updated.");
        },
        onError: (err) => {
          showErrorToast(err instanceof Error ? `${err.message} Try again or refresh the page.` : "Failed to update record. Please try again.");
        },
      }
    );
  }

  async function handleSignOut(visitId: string) {
    if (!selectedSiteId) return;

    signOutVisit.mutate(
      { id: visitId, site_id: selectedSiteId },
      {
        onSuccess: () => {
          showSuccessToast("Visitor signed out.");
        },
        onError: (err) => {
          showErrorToast(err instanceof Error ? `${err.message} Check your connection and try again.` : "Failed to sign out visitor. Please try again.");
        },
      }
    );
  }

  async function handleBulkSignOut() {
    if (!selectedSiteId) return;

    bulkSignOut.mutate(selectedSiteId, {
      onSuccess: () => {
        setShowBulkSignOutModal(false);
        showSuccessToast("All visitors signed out.");
      },
      onError: (err) => {
        showErrorToast(err instanceof Error ? `${err.message} Check your connection and try again.` : "Failed to sign out visitors. Please try again.");
      },
    });
  }

  async function handleDelete(visitId: string) {
    if (!canDelete || !selectedSiteId) return;

    deleteVisit.mutate(
      { id: visitId, site_id: selectedSiteId },
      {
        onSuccess: () => {
          setConfirmDeleteId(null);
          showSuccessToast("Record deleted.");
        },
        onError: (err) => {
          showErrorToast(err instanceof Error ? `${err.message} Try again or refresh the page.` : "Failed to delete record. Please try again.");
        },
      }
    );
  }

  function prepareExportData() {
    const siteName = selectedSite?.name ?? "";
    const headers = [
      "Site",
      "Full Name",
      "Mobile",
      "Company",
      "Visitor Type",
      "Sign-In Date",
      "Sign-In Time",
      "Sign-Out Date",
      "Sign-Out Time",
      "Duration",
    ];

    const rows = exportableVisits.map((visit) => {
      const signInDate = new Date(visit.signed_in_at);
      const signOutDate = visit.signed_out_at ? new Date(visit.signed_out_at) : null;
      const duration = signOutDate
        ? fmtDuration((signOutDate.getTime() - signInDate.getTime()) / (1000 * 60))
        : "On site";

      return [
        siteName,
        visit.full_name,
        visit.phone_number ?? "",
        visit.company_name,
        visit.visitor_type,
        fmtDate(signInDate),
        fmtTime(signInDate),
        signOutDate ? fmtDate(signOutDate) : "Still on site",
        signOutDate ? fmtTime(signOutDate) : "",
        duration,
      ];
    });

    return { headers, rows, count: exportableVisits.length };
  }

  function exportCSV() {
    const { headers, rows } = prepareExportData();
    const csvRows = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`));
    const csv = [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site-visits-${selectedSite?.slug || "export"}-${exportRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportXLSX() {
    if (!exportableVisits.length) return;
    
    setXlsxLoading(true);
    try {
      const XLSX = await loadXLSX();
      const { headers, rows } = prepareExportData();
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      worksheet["!cols"] = [
        { wch: 22 },
        { wch: 24 },
        { wch: 16 },
        { wch: 28 },
        { wch: 16 },
        { wch: 14 },
        { wch: 12 },
        { wch: 16 },
        { wch: 12 },
        { wch: 12 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Site Visits");
      XLSX.writeFile(workbook, `site-visits-${selectedSite?.slug || "export"}-${exportRange}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      showErrorToast("Failed to load Excel export library. Please refresh the page and try again.");
      console.error("XLSX export error:", err);
    } finally {
      setXlsxLoading(false);
    }
  }

  async function exportPDF() {
    if (!exportableVisits.length) return;
    
    setPdfLoading(true);
    try {
      const { jsPDF, autoTable } = await loadJsPDF();
      const { headers, rows, count } = prepareExportData();
      const doc = new jsPDF({ orientation: "landscape" });
      const siteName = selectedSite?.name ?? "Export";
      const rangeName =
        exportRange === "all"
          ? "All Time"
          : exportRange === "today"
            ? "Today"
            : exportRange === "week"
              ? "Last 7 Days"
              : "Last 30 Days";

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`Site Visits Report - ${siteName}`, 14, 16);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(95);
      doc.text(`Period: ${rangeName} | Records: ${count} | Generated: ${fmtDate(new Date())}`, 14, 23);
      doc.setTextColor(0);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
        headStyles: { fillColor: [250, 204, 21], textColor: [113, 63, 18], fontStyle: "bold", halign: "center", fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 14, right: 14 },
      });

      doc.save(`site-visits-${selectedSite?.slug || "export"}-${exportRange}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      showErrorToast("Failed to load PDF export library. Please refresh the page and try again.");
      console.error("PDF export error:", err);
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading || sitesLoading || !summary) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <EmptyState
          icon="🏗️"
          title="Create a site to activate SiteSign"
          description="SiteSign runs on physical sites. Create a project and site first, then return here to launch QR sign-in and view records."
          action={{ label: "Go to Sites", href: "/dashboard/sites" }}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm"
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      {/* Page-level error banner */}
      {pageError && (
        <ErrorBanner
          message={pageError}
          onDismiss={() => setPageError(null)}
          action={{ label: "Retry", onClick: () => window.location.reload() }}
        />
      )}

      <SiteSelector
        sites={sites}
        selectedSiteId={selectedSiteId}
        selectedSite={selectedSite}
        onSiteChange={handleSwitchSite}
        onPrefetchSites={() => {
          if (activeCompanyId) prefetchSites(activeCompanyId);
        }}
      />

      <ManualEntryForm
        register={registerAdd}
        errors={addErrors}
        isValid={addIsValid}
        isSubmitting={adding}
        onSubmit={handleSubmitAdd(handleAddVisit)}
      />

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <VisitFilters
          searchText={searchText}
          onSearchChange={setSearchText}
          filterDate={filterDate}
          onFilterDateChange={setFilterDate}
          filterType={filterType}
          onFilterTypeChange={(value) => setFilterType(value as VisitorType | "")}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          exportRange={exportRange}
          onExportRangeChange={setExportRange}
          onClearFilters={() => {
            setSearchText("");
            setFilterDate("");
            setFilterType("");
            setFilterStatus("all");
          }}
          hasActiveFilters={!!(searchText || filterDate || filterType || filterStatus !== "all")}
        />

        <div className="flex flex-wrap gap-2 items-center">
          <ExportPanel
            hasRecords={exportableVisits.length > 0}
            isPdfLoading={pdfLoading}
            isXlsxLoading={xlsxLoading}
            onExportCSV={exportCSV}
            onExportXLSX={exportXLSX}
            onExportPDF={exportPDF}
            onPreloadXLSX={preloadXLSX}
            onPreloadPDF={preloadJsPDF}
          />
          {onSiteCount > 0 && (
            <button
              onClick={() => setShowBulkSignOutModal(true)}
              className="ml-auto text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-lg px-3 py-2"
            >
              Sign out all ({onSiteCount})
            </button>
          )}
        </div>

        <StatsPanel
          onSiteCount={onSiteCount}
          todayCount={todayCount}
          recordsShown={filteredVisits.length}
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Sign-In Records</h2>
          <span className="text-xs text-slate-500">View, edit, and export visitor records</span>
        </div>

        <VisitTable
          visits={filteredVisits}
          isLoading={visitsLoading}
          editingId={editingId}
          canEdit={canEdit}
          canDelete={canDelete}
          signingOutId={signingOutId}
          deletingId={deletingId}
          confirmDeleteId={confirmDeleteId}
          registerEdit={registerEdit}
          editErrors={editErrors}
          editSignedOut={editSignedOut}
          editIsValid={editIsValid}
          editSaving={editSaving}
          onStartEdit={startEdit}
          onSaveEdit={handleSubmitEdit((data) => {
            if (editingId) {
              handleSaveEdit(data, editingId);
            }
          })}
          onCancelEdit={clearEdit}
          onSignOut={handleSignOut}
          onDeleteClick={setConfirmDeleteId}
          onConfirmDelete={handleDelete}
          onCancelDelete={() => setConfirmDeleteId(null)}
          onViewSignature={setViewSignature}
          onClearSignOut={() => setEditValue("signedOutAt", "")}
        />
      </section>

      <BulkActionsModal
        isOpen={showBulkSignOutModal}
        onClose={() => setShowBulkSignOutModal(false)}
        onConfirm={handleBulkSignOut}
        onSiteCount={onSiteCount}
        isLoading={bulkSigningOut}
      />

      <SignatureViewer
        isOpen={!!viewSignature}
        signature={viewSignature}
        onClose={() => setViewSignature(null)}
      />

      <ConnectedToolkitPrompt />

      {/* Site setup - configure inductions and briefings for this site */}
      {selectedSiteId && activeCompanyId && (
        <section className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
          <div className="border-b border-slate-200 px-6 pt-5 pb-0 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold text-slate-900">Site Setup</h2>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Configure once</span>
            </div>
            <div className="flex gap-0">
              {(["briefing", "induction"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSiteManagementTab(tab)}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    siteManagementTab === tab
                      ? "border-amber-400 text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab === "briefing" ? "Daily Briefing" : "Site Induction"}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            {siteManagementTab === "briefing" ? (
              <div>
                <p className="text-sm text-slate-500 mb-4">
                  Create a daily safety briefing (toolbox talk). Workers will see and acknowledge it when signing in each morning.
                </p>
                <DailyBriefingPanel siteId={selectedSiteId} companyId={activeCompanyId} />
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-500 mb-4">
                  Set up a multi-step site induction. First-time visitors to this site will complete it before signing in.
                </p>
                <SiteInductionPanel siteId={selectedSiteId} companyId={activeCompanyId} />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

