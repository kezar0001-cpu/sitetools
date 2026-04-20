"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building2, QrCode, Smartphone, Users, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ErrorBanner, showErrorToast, showSuccessToast } from "@/components/feedback";
import { ErrorBoundary, SiteSignErrorFallback } from "@/components/error";
import { loadJsPDF, loadXLSX, preloadJsPDF, preloadXLSX } from "@/lib/dynamicImports";
import { setActiveSite } from "@/lib/workspace/client";
import { canManageSites, canUseModules } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import type { SiteVisit } from "@/lib/workspace/types";
import { useCompanySites } from "@/hooks/useSites";
import { useSiteVisits, useVisitMutations } from "@/hooks/useSiteVisits";
import { DailyBriefingPanel } from "./components/DailyBriefingPanel";
import { SiteInductionPanel } from "./components/SiteInductionPanel";
import { addRecentCompany } from "@/components/forms";
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
import { VisitFilters, type RecordStatusFilter, type DateRangeFilter, type FilterPreset } from "./components/VisitFilters";
import { ExportPanel, type ExportRange } from "./components/ExportPanel";
import { VisitTable } from "./components/VisitTable";
import { BulkActionsModal } from "./components/BulkActionsModal";
import { SignatureViewer } from "./components/SignatureViewer";
import { StatsPanel } from "./components/StatsPanel";
import { LiveHeadcount } from "./components/LiveHeadcount";
import { ConnectedToolkitPrompt } from "./components/ConnectedToolkitPrompt";
import { WorkerProfileModal } from "./components/WorkerProfileModal";

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

function SiteSignContent() {
  const { loading, summary, refresh } = useWorkspace({ requireAuth: true, requireCompany: true });
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;
  const activeRole = summary?.activeMembership?.role ?? null;
  const profileActiveSiteId = summary?.profile?.active_site_id ?? null;
  const currentUserId = summary?.userId ?? null;

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
    control: addControl,
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
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [exportRange, setExportRange] = useState<ExportRange>("all");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewSignature, setViewSignature] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<SiteVisit | null>(null);

  const [showBulkSignOutModal, setShowBulkSignOutModal] = useState(false);
  const [siteManagementTab, setSiteManagementTab] = useState<"briefing" | "induction">("briefing");
  const [briefingConfigured, setBriefingConfigured] = useState(false);
  const [inductionConfigured, setInductionConfigured] = useState(false);

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

  // Calculate date range for "This Week" preset (last 7 days from today)
  const weekStartDate = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return dateToInputValue(weekAgo);
  }, []);

  const filteredVisits = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    const today = dateToInputValue(new Date());

    return visits.filter((visit) => {
      const visitDate = toLocalDateValue(visit.signed_in_at);

      // Date filter: specific date OR date range preset
      let dateMatch = true;
      if (filterDate) {
        // Specific date selected
        dateMatch = visitDate === filterDate;
      } else if (dateRange === "today") {
        dateMatch = visitDate === today;
      } else if (dateRange === "week") {
        dateMatch = visitDate >= weekStartDate;
      }

      const typeMatch = filterType ? visit.visitor_type === filterType : true;
      const statusMatch =
        filterStatus === "all" ? true : filterStatus === "onSite" ? !visit.signed_out_at : !!visit.signed_out_at;
      const searchMatch = search
        ? `${visit.full_name} ${visit.company_name} ${visit.phone_number ?? ""}`.toLowerCase().includes(search)
        : true;
      return dateMatch && typeMatch && statusMatch && searchMatch;
    });
  }, [visits, filterDate, dateRange, filterType, filterStatus, searchText, weekStartDate]);

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

    // Reset form immediately for snappy UI
    resetAdd({
      fullName: "",
      phoneNumber: "",
      companyName: "",
      visitorType: "Worker",
      signedInAt: "",
      signedOutAt: "",
    });

    createVisit.mutate(
      {
        company_id: activeCompanyId,
        site_id: selectedSiteId,
        full_name: data.fullName.trim(),
        phone_number: data.phoneNumber?.trim() || null,
        company_name: data.companyName.trim(),
        visitor_type: data.visitorType,
        signed_in_at: data.signedInAt ? new Date(data.signedInAt).toISOString() : null,
        signed_out_at: data.signedOutAt ? new Date(data.signedOutAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          showSuccessToast("Visitor record added.");
          // Track this company as recently used for autocomplete
          addRecentCompany(selectedSiteId, data.companyName.trim());
        },
        onError: (err) => {
          // Rollback is handled by the mutation hook's onError; we just show UI feedback
          showErrorToast(
            err instanceof Error
              ? `${err.message} Check your connection and try again.`
              : "Failed to add visitor. Please check your connection and try again."
          );
        },
      }
    );
  }

  async function handleSaveEdit(data: VisitEditFormData, visitId: string) {
    if (!selectedSiteId || !currentUserId) return;

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
        edit_reason: data.editReason?.trim() || null,
        edited_by_user_id: currentUserId,
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
    const canManage = canManageSites(activeRole);

    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <EmptyState
          icon={Building2}
          heading={canManage ? "Create your first site to activate SiteSign" : "Waiting for site setup"}
          subtext={
            canManage
              ? "SiteSign runs on physical sites. Create a project and site first, then return here to launch QR sign-in and view records."
              : "An admin needs to create a project and site before SiteSign can be used. You'll receive access once it's ready."
          }
          className="bg-white border border-slate-200 rounded-2xl shadow-sm"
        >
          {/* Guided Setup Experience */}
          <div className="mt-8 space-y-8">
            {/* How SiteSign Works - 3 Step Visual */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
              <h3 className="text-sm font-bold text-slate-700 mb-4 text-left">How SiteSign works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                    <QrCode className="h-5 w-5 text-amber-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 mb-1">1. Set up QR code</span>
                  <span className="text-xs text-slate-500">Print a QR poster for your site gate</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                    <Smartphone className="h-5 w-5 text-amber-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 mb-1">2. Workers scan</span>
                  <span className="text-xs text-slate-500">Workers sign in from their phone camera</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-slate-200">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-amber-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 mb-1">3. Track live</span>
                  <span className="text-xs text-slate-500">See headcount and export records</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {canManage && (
                <Link
                  href="/dashboard/sites"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors"
                >
                  Create your first site
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href="/sitesign"
                target="_blank"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                See QR demo
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </EmptyState>
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

      {/* Live Headcount Widget - Real-time sign-in status */}
      {selectedSiteId && activeCompanyId && (
        <LiveHeadcount
          siteId={selectedSiteId}
          companyId={activeCompanyId}
        />
      )}

      <ManualEntryForm
        siteId={selectedSiteId}
        register={registerAdd}
        control={addControl}
        errors={addErrors}
        isValid={addIsValid}
        isSubmitting={adding}
        onSubmit={handleSubmitAdd(handleAddVisit)}
        approvedCompanies={[]}
      />

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <VisitFilters
          searchText={searchText}
          onSearchChange={(value) => {
            setSearchText(value);
            if (value) setActivePreset(null); // Clear preset on manual search
          }}
          filterDate={filterDate}
          onFilterDateChange={(value) => {
            setFilterDate(value);
            setDateRange("all"); // Clear date range when specific date selected
            setActivePreset(null);
          }}
          filterType={filterType}
          onFilterTypeChange={(value) => {
            setFilterType(value as VisitorType | "");
            setActivePreset(null);
          }}
          filterStatus={filterStatus}
          onFilterStatusChange={(value) => {
            setFilterStatus(value);
            setActivePreset(null);
          }}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onApplyPreset={(preset: FilterPreset) => {
            setActivePreset(preset.label);
            setFilterStatus(preset.status);
            setDateRange(preset.dateRange);
            // Clear specific date when using presets
            if (preset.dateRange !== "all") {
              setFilterDate("");
            }
            // Clear search when applying presets for clean slate
            setSearchText("");
          }}
          onClearFilters={() => {
            setSearchText("");
            setFilterDate("");
            setFilterType("");
            setFilterStatus("all");
            setDateRange("all");
            setActivePreset(null);
          }}
          hasActiveFilters={!!(searchText || filterDate || filterType || filterStatus !== "all" || dateRange !== "all")}
          activePresetLabel={activePreset}
        />

        {/* Stats Bar */}
        <StatsPanel
          onSiteCount={onSiteCount}
          todayCount={todayCount}
          recordsShown={filteredVisits.length}
        />

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Export Section */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <ExportPanel
            hasRecords={exportableVisits.length > 0}
            isPdfLoading={pdfLoading}
            isXlsxLoading={xlsxLoading}
            exportRange={exportRange}
            onExportRangeChange={setExportRange}
            onExportCSV={exportCSV}
            onExportXLSX={exportXLSX}
            onExportPDF={exportPDF}
            onPreloadXLSX={preloadXLSX}
            onPreloadPDF={preloadJsPDF}
          />
          {onSiteCount > 0 && (
            <button
              onClick={() => setShowBulkSignOutModal(true)}
              className="text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-lg px-3 py-2 whitespace-nowrap"
            >
              Sign out all ({onSiteCount})
            </button>
          )}
        </div>
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
          onWorkerClick={setSelectedWorker}
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

      <WorkerProfileModal
        isOpen={!!selectedWorker}
        onClose={() => setSelectedWorker(null)}
        companyId={activeCompanyId || ""}
        fullName={selectedWorker?.full_name || ""}
        workerCompanyName={selectedWorker?.company_name || ""}
        phoneNumber={selectedWorker?.phone_number || null}
        visitorType={selectedWorker?.visitor_type || "Worker"}
      />

      <ConnectedToolkitPrompt />

      {/* Site setup - configure inductions and briefings for this site */}
      {selectedSiteId && activeCompanyId && (
        <section className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
          <div className="border-b border-slate-200 px-6 pt-5 pb-0 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-bold text-slate-900">Site Setup</h2>
              {briefingConfigured && inductionConfigured ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Site fully configured
                </span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Configure once</span>
              )}
            </div>

            {/* Progress summary */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-600">
                  Site setup: {(briefingConfigured ? 1 : 0) + (inductionConfigured ? 1 : 0)} of 2 complete
                </span>
                <span className="text-xs text-slate-400">
                  {briefingConfigured && inductionConfigured ? "All set!" : `${briefingConfigured && inductionConfigured ? 0 : 2 - ((briefingConfigured ? 1 : 0) + (inductionConfigured ? 1 : 0))} remaining`}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    briefingConfigured && inductionConfigured ? "bg-emerald-500 w-full" : "bg-amber-500"
                  }`}
                  style={{
                    width: `${((briefingConfigured ? 1 : 0) + (inductionConfigured ? 1 : 0)) / 2 * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex gap-0">
              {(["briefing", "induction"] as const).map((tab) => {
                const isConfigured = tab === "briefing" ? briefingConfigured : inductionConfigured;
                return (
                  <button
                    key={tab}
                    onClick={() => setSiteManagementTab(tab)}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      siteManagementTab === tab
                        ? "border-amber-400 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab === "briefing" ? "Daily Briefing" : "Site Induction"}
                    {!isConfigured && (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">
                        Not configured
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-6">
            {siteManagementTab === "briefing" ? (
              <div>
                <p className="text-sm text-slate-500 mb-4">
                  Create a daily safety briefing (toolbox talk). Workers will see and acknowledge it when signing in each morning.
                </p>
                <DailyBriefingPanel
                  siteId={selectedSiteId}
                  companyId={activeCompanyId}
                  onConfiguredChange={setBriefingConfigured}
                />
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-500 mb-4">
                  Set up a multi-step site induction. First-time visitors to this site will complete it before signing in.
                </p>
                <SiteInductionPanel
                  siteId={selectedSiteId}
                  companyId={activeCompanyId}
                  onConfiguredChange={setInductionConfigured}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SiteSignInModulePage() {
  return (
    <ErrorBoundary
      fallback={
        <SiteSignErrorFallback
          onRetry={() => window.location.reload()}
        />
      }
    >
      <SiteSignContent />
    </ErrorBoundary>
  );
}

