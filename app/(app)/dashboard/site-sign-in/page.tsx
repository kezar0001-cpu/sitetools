"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import { loadJsPDF, loadXLSX, preloadJsPDF, preloadXLSX } from "@/lib/dynamicImports";
import { setActiveSite } from "@/lib/workspace/client";
import { canManageSites } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { SiteVisit } from "@/lib/workspace/types";
import { useCompanySites } from "@/hooks/useSites";
import { useSiteVisits, useVisitMutations } from "@/hooks/useSiteVisits";
import { DailyBriefingPanel } from "./components/DailyBriefingPanel";
import { SiteInductionPanel } from "./components/SiteInductionPanel";
import {
  visitEntrySchema,
  visitEditSchema,
  visitorTypes,
  type VisitEntryFormData,
  type VisitEditFormData,
} from "@/lib/validation/schemas";
import { MobileCardList, MobileCardHeader, MobileStatusBadge, MobileActionButton } from "@/components/mobile/MobileCardList";

type ExportRange = "all" | "today" | "week" | "month";
type RecordStatusFilter = "all" | "onSite" | "signedOut";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  const canDelete = canManageSites(activeRole);
  const canEdit = !!activeRole;

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not set active site.");
    }
  }

  async function handleAddVisit(data: VisitEntryFormData) {
    if (!activeCompanyId || !selectedSiteId) return;

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
          resetAdd({
            fullName: "",
            phoneNumber: "",
            companyName: "",
            visitorType: "Worker",
            signedInAt: "",
            signedOutAt: "",
          });
          toast.success("Visitor record added.");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to add visitor.");
        },
      }
    );
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
          toast.success("Record updated.");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to update record.");
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
          toast.success("Visitor signed out.");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to sign out visitor.");
        },
      }
    );
  }

  async function handleBulkSignOut() {
    if (!selectedSiteId) return;

    bulkSignOut.mutate(selectedSiteId, {
      onSuccess: () => {
        setShowBulkSignOutModal(false);
        toast.success("All visitors signed out.");
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to sign out visitors.");
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
          toast.success("Record deleted.");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to delete record.");
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
      toast.error("Failed to load Excel export library. Please try again.");
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
      toast.error("Failed to load PDF export library. Please try again.");
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
      {/* Site selector - primary activation step */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">SiteSign</h1>
            <p className="mt-1 text-sm text-slate-600">
              QR-based site sign-in with inductions and daily briefings. Workers scan to check in; you manage records here.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Site</span>
              <select
                value={selectedSiteId}
                onChange={(e) => handleSwitchSite(e.target.value)}
                onMouseEnter={() => {
                  // Prefetch sites on hover for instant navigation elsewhere
                  if (activeCompanyId) prefetchSites(activeCompanyId);
                }}
                className="border-2 border-slate-200 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm font-semibold bg-white"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedSite && (
              <Link
                href={`/print-qr/${selectedSite.slug}`}
                className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                Print QR Code
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Manual entry - for admin corrections and backup sign-ins */}
      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-bold text-slate-700">Manual Sign-In Entry</h2>
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">Admin</span>
        </div>
        <form className="grid grid-cols-1 md:grid-cols-6 gap-3" onSubmit={handleSubmitAdd(handleAddVisit)}>
          <div>
            <input
              {...registerAdd("fullName")}
              placeholder="Full name"
              className={`w-full border-2 ${addErrors.fullName ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm outline-none transition-colors`}
            />
            {addErrors.fullName && (
              <p className="mt-1 text-xs text-red-500">{addErrors.fullName.message}</p>
            )}
          </div>
          <div>
            <input
              {...registerAdd("phoneNumber")}
              placeholder="Mobile (optional)"
              className={`w-full border-2 ${addErrors.phoneNumber ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm outline-none transition-colors`}
            />
            {addErrors.phoneNumber && (
              <p className="mt-1 text-xs text-red-500">{addErrors.phoneNumber.message}</p>
            )}
          </div>
          <div>
            <input
              {...registerAdd("companyName")}
              placeholder="Employer / company"
              className={`w-full border-2 ${addErrors.companyName ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm outline-none transition-colors`}
            />
            {addErrors.companyName && (
              <p className="mt-1 text-xs text-red-500">{addErrors.companyName.message}</p>
            )}
          </div>
          <div>
            <select
              {...registerAdd("visitorType")}
              className={`w-full border-2 ${addErrors.visitorType ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm outline-none transition-colors bg-white`}
            >
              {visitorTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {addErrors.visitorType && (
              <p className="mt-1 text-xs text-red-500">{addErrors.visitorType.message}</p>
            )}
          </div>
          <div>
            <input
              type="datetime-local"
              {...registerAdd("signedInAt")}
              className={`w-full border-2 ${addErrors.signedInAt ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm outline-none transition-colors`}
              title="Signed in time (optional, defaults to now)"
            />
            {addErrors.signedInAt && (
              <p className="mt-1 text-xs text-red-500">{addErrors.signedInAt.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={adding || !addIsValid}
            className="bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-amber-900 font-bold rounded-xl px-4 py-3 text-sm"
          >
            {adding ? "Adding..." : "Add Record"}
          </button>
        </form>
        <div className="mt-3 max-w-sm">
          <input
            type="datetime-local"
            {...registerAdd("signedOutAt")}
            className={`w-full border ${addErrors.signedOutAt ? "border-red-300 focus:border-red-400" : "border-slate-300 focus:border-amber-400"} rounded-xl px-4 py-2.5 text-sm outline-none transition-colors`}
            title="Signed out time (optional)"
          />
          {addErrors.signedOutAt && (
            <p className="mt-1 text-xs text-red-500">{addErrors.signedOutAt.message}</p>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search name, company, mobile"
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof visitorTypes[number] | "")}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="">All visitor types</option>
            {visitorTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as RecordStatusFilter)}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="onSite">Currently on site</option>
            <option value="signedOut">Signed out</option>
          </select>
          <select
            value={exportRange}
            onChange={(e) => setExportRange(e.target.value as ExportRange)}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="all">Export: All time</option>
            <option value="today">Export: Today</option>
            <option value="week">Export: Last 7 days</option>
            <option value="month">Export: Last 30 days</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={exportCSV}
            disabled={exportableVisits.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg"
          >
            Export CSV
          </button>
          <button
            onClick={exportXLSX}
            onMouseEnter={preloadXLSX}
            disabled={exportableVisits.length === 0 || xlsxLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-2"
          >
            {xlsxLoading && (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {xlsxLoading ? "Loading..." : "Export Excel"}
          </button>
          <button
            onClick={exportPDF}
            onMouseEnter={preloadJsPDF}
            disabled={exportableVisits.length === 0 || pdfLoading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg inline-flex items-center gap-2"
          >
            {pdfLoading && (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {pdfLoading ? "Loading..." : "Export PDF"}
          </button>
          {(searchText || filterDate || filterType || filterStatus !== "all") && (
            <button
              onClick={() => {
                setSearchText("");
                setFilterDate("");
                setFilterType("");
                setFilterStatus("all");
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
            >
              Clear filters
            </button>
          )}
          {onSiteCount > 0 && (
            <button
              onClick={() => setShowBulkSignOutModal(true)}
              className="ml-auto text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-lg px-3 py-2"
            >
              Sign out all ({onSiteCount})
            </button>
          )}
        </div>

        {/* Daily operation stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="On Site Now" value={String(onSiteCount)} />
          <Stat label="Sign-Ins Today" value={String(todayCount)} />
          <Stat label="Records Shown" value={String(filteredVisits.length)} />
        </div>
      </section>

        {/* Daily records - operational view with admin controls */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Sign-In Records</h2>
          <span className="text-xs text-slate-500">View, edit, and export visitor records</span>
        </div>

        {filteredVisits.length === 0 && !visitsLoading ? (
          <p className="text-sm text-slate-500">No records match the current filters.</p>
        ) : (
          <MobileCardList
            data={filteredVisits}
            isLoading={visitsLoading}
            loadingRows={5}
            columns={[
              {
                key: "name",
                header: "Name",
                render: (visit) => (
                  <MobileCardHeader
                    title={editingId === visit.id ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          {...registerEdit("fullName")}
                          className={`w-full border ${editErrors.fullName ? "border-red-400" : "border-amber-400"} rounded-lg px-2 py-1.5 text-xs outline-none`}
                        />
                        {editErrors.fullName && (
                          <p className="text-[10px] text-red-500 mt-0.5">{editErrors.fullName.message}</p>
                        )}
                      </div>
                    ) : visit.full_name}
                    subtitle={editingId === visit.id ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          {...registerEdit("companyName")}
                          className={`w-full border ${editErrors.companyName ? "border-red-400" : "border-amber-400"} rounded-lg px-2 py-1 text-xs mt-1 outline-none`}
                        />
                        {editErrors.companyName && (
                          <p className="text-[10px] text-red-500 mt-0.5">{editErrors.companyName.message}</p>
                        )}
                      </div>
                    ) : `${visit.company_name} • ${visit.visitor_type}`}
                    badge={!visit.signed_out_at && !editingId ? (
                      <MobileStatusBadge status="On site" variant="success" />
                    ) : undefined}
                  />
                ),
              },
              {
                key: "mobile",
                header: "Mobile",
                mobileVisible: false,
                render: (visit) => editingId === visit.id ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      {...registerEdit("phoneNumber")}
                      className={`w-full border ${editErrors.phoneNumber ? "border-red-400" : "border-slate-300"} rounded-lg px-2 py-1.5 text-xs outline-none`}
                    />
                    {editErrors.phoneNumber && (
                      <p className="text-[10px] text-red-500 mt-0.5">{editErrors.phoneNumber.message}</p>
                    )}
                  </div>
                ) : (visit.phone_number ?? "-"),
              },
              {
                key: "company",
                header: "Company",
                mobileVisible: false,
                render: (visit) => visit.company_name,
              },
              {
                key: "type",
                header: "Type",
                mobileVisible: false,
                render: (visit) => editingId === visit.id ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      {...registerEdit("visitorType")}
                      className={`w-full border ${editErrors.visitorType ? "border-red-400" : "border-slate-300"} rounded-lg px-2 py-1.5 text-xs bg-white outline-none`}
                    >
                      {visitorTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {editErrors.visitorType && (
                      <p className="text-[10px] text-red-500 mt-0.5">{editErrors.visitorType.message}</p>
                    )}
                  </div>
                ) : visit.visitor_type,
              },
              {
                key: "signedIn",
                header: "Signed In",
                render: (visit) => editingId === visit.id ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="datetime-local"
                      {...registerEdit("signedInAt")}
                      className={`w-full border ${editErrors.signedInAt ? "border-red-400" : "border-amber-400"} rounded-lg px-2 py-1.5 text-xs outline-none`}
                    />
                    {editErrors.signedInAt && (
                      <p className="text-[10px] text-red-500 mt-0.5">{editErrors.signedInAt.message}</p>
                    )}
                  </div>
                ) : formatDateTime(visit.signed_in_at),
              },
              {
                key: "signedOut",
                header: "Signed Out",
                render: (visit) => editingId === visit.id ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="datetime-local"
                      {...registerEdit("signedOutAt")}
                      className={`w-full border ${editErrors.signedOutAt ? "border-red-400" : "border-slate-300"} rounded-lg px-2 py-1.5 text-xs outline-none`}
                    />
                    {editSignedOut && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditValue("signedOutAt", "");
                        }}
                        className="mt-1 text-[11px] text-slate-500 hover:text-slate-700"
                      >
                        Clear sign out
                      </button>
                    )}
                    {editErrors.signedOutAt && (
                      <p className="text-[10px] text-red-500 mt-0.5">{editErrors.signedOutAt.message}</p>
                    )}
                  </div>
                ) : visit.signed_out_at ? (
                  formatDateTime(visit.signed_out_at)
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                ),
              },
              {
                key: "signature",
                header: "Signature",
                mobileVisible: false,
                render: (visit) =>
                  visit.signature ? (
                    <button
                      onClick={() => setViewSignature(visit.signature)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      View
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (visit) => {
                  if (editingId === visit.id) {
                    return (
                      <div className="flex items-center gap-2">
                        <MobileActionButton
                          onClick={handleSubmitEdit((data) => handleSaveEdit(data, visit.id))}
                          variant="primary"
                          disabled={editSaving || !editIsValid}
                        >
                          {editSaving ? "Saving..." : "Save"}
                        </MobileActionButton>
                        <MobileActionButton onClick={clearEdit} variant="ghost">
                          Cancel
                        </MobileActionButton>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      {canEdit && (
                        <MobileActionButton onClick={() => startEdit(visit)} variant="ghost">
                          Edit
                        </MobileActionButton>
                      )}
                      {!visit.signed_out_at && (
                        <MobileActionButton
                          onClick={() => handleSignOut(visit.id)}
                          variant="primary"
                          disabled={!!signingOutId}
                        >
                          {!!signingOutId ? "..." : "Sign Out"}
                        </MobileActionButton>
                      )}
                      {canDelete && (
                        <>
                          {confirmDeleteId === visit.id ? (
                            <div className="flex items-center gap-1">
                              <MobileActionButton
                                onClick={() => handleDelete(visit.id)}
                                variant="danger"
                                disabled={!!deletingId}
                              >
                                {!!deletingId ? "..." : "Confirm"}
                              </MobileActionButton>
                              <MobileActionButton onClick={() => setConfirmDeleteId(null)} variant="ghost">
                                Cancel
                              </MobileActionButton>
                            </div>
                          ) : (
                            <MobileActionButton onClick={() => setConfirmDeleteId(visit.id)} variant="danger">
                              Delete
                            </MobileActionButton>
                          )}
                        </>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </section>

      {showBulkSignOutModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
          onClick={() => !bulkSigningOut && setShowBulkSignOutModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">Sign out all visitors?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will sign out{" "}
              <span className="font-bold text-slate-900">
                {onSiteCount} visitor{onSiteCount !== 1 ? "s" : ""}
              </span>{" "}
              currently on site.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleBulkSignOut}
                disabled={bulkSigningOut}
                className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-60 text-white font-bold rounded-xl px-4 py-2.5 text-sm"
              >
                {bulkSigningOut ? "Signing out..." : "Confirm sign out"}
              </button>
              <button
                onClick={() => setShowBulkSignOutModal(false)}
                disabled={bulkSigningOut}
                className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-bold rounded-xl px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewSignature && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={() => setViewSignature(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900">Visitor Signature</h3>
            <div className="mt-3 border border-slate-200 rounded-xl p-3 bg-slate-50">
              <Image src={viewSignature} alt="Signature" width={640} height={240} unoptimized className="w-full h-auto" />
            </div>
            <button onClick={() => setViewSignature(null)} className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2.5 text-sm">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Connected toolkit handoff - subtle expansion prompt */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-zinc-100">Running smoothly?</p>
            <p className="text-sm text-zinc-500 mt-0.5">
              Add SiteITP for quality checklists and SiteDocs for professional reports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/site-itp"
              className="text-sm font-semibold text-violet-400 hover:text-violet-300 px-4 py-2 rounded-xl border border-violet-400/30 hover:border-violet-400/50 transition-colors"
            >
              SiteITP →
            </Link>
            <Link
              href="/dashboard/site-docs"
              className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 px-4 py-2 rounded-xl border border-cyan-400/30 hover:border-cyan-400/50 transition-colors"
            >
              SiteDocs →
            </Link>
          </div>
        </div>
      </section>

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-xl px-4 py-3">
      <p className="text-xs uppercase tracking-wide font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
