"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { fetchCompanySites, fetchSiteVisitsForCompanySite, setActiveSite } from "@/lib/workspace/client";
import { canManageSites } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { Site, SiteVisit, VisitorType } from "@/lib/workspace/types";

const VISITOR_TYPES: VisitorType[] = ["Worker", "Subcontractor", "Visitor", "Delivery"];
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

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [visitsLoading, setVisitsLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [visitorType, setVisitorType] = useState<VisitorType>("Worker");
  const [addSignedIn, setAddSignedIn] = useState("");
  const [addSignedOut, setAddSignedOut] = useState("");
  const [adding, setAdding] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState<VisitorType | "">("");
  const [filterStatus, setFilterStatus] = useState<RecordStatusFilter>("all");
  const [exportRange, setExportRange] = useState<ExportRange>("all");

  const [signingOutId, setSigningOutId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewSignature, setViewSignature] = useState<string | null>(null);

  const [showBulkSignOutModal, setShowBulkSignOutModal] = useState(false);
  const [bulkSigningOut, setBulkSigningOut] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editVisitorType, setEditVisitorType] = useState<VisitorType>("Worker");
  const [editSignedIn, setEditSignedIn] = useState("");
  const [editSignedOut, setEditSignedOut] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const canDelete = canManageSites(activeRole);
  const canEdit = !!activeRole;

  useEffect(() => {
    if (!activeCompanyId) return;

    setPageLoading(true);

    fetchCompanySites(activeCompanyId)
      .then((companySites) => {
        setSites(companySites);

        if (companySites.length === 0) {
          setSelectedSiteId("");
          setVisits([]);
          return;
        }

        const preferredSiteId =
          (profileActiveSiteId && companySites.find((site) => site.id === profileActiveSiteId)?.id) || companySites[0].id;

        setSelectedSiteId((prev) => {
          if (prev && companySites.some((site) => site.id === prev)) return prev;
          return preferredSiteId;
        });
      })
      .catch((err) => {
        toast.error(err?.message ?? (err instanceof Error ? err.message : "Unable to load sites."));
      })
      .finally(() => setPageLoading(false));
  }, [activeCompanyId, profileActiveSiteId]);

  const refreshVisits = useCallback(async () => {
    if (!activeCompanyId || !selectedSiteId) {
      setVisits([]);
      return;
    }

    setVisitsLoading(true);
    try {
      const nextVisits = await fetchSiteVisitsForCompanySite(activeCompanyId, selectedSiteId);
      setVisits(nextVisits);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load records.");
    } finally {
      setVisitsLoading(false);
    }
  }, [activeCompanyId, selectedSiteId]);

  useEffect(() => {
    refreshVisits();
  }, [refreshVisits]);

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
    setEditFullName("");
    setEditPhoneNumber("");
    setEditCompanyName("");
    setEditVisitorType("Worker");
    setEditSignedIn("");
    setEditSignedOut("");
  }

  function startEdit(visit: SiteVisit) {
    setEditingId(visit.id);
    setEditFullName(visit.full_name);
    setEditPhoneNumber(visit.phone_number ?? "");
    setEditCompanyName(visit.company_name);
    setEditVisitorType(visit.visitor_type);
    setEditSignedIn(toDatetimeLocal(visit.signed_in_at));
    setEditSignedOut(toDatetimeLocal(visit.signed_out_at));
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

  async function handleAddVisit(e: FormEvent) {
    e.preventDefault();
    if (!activeCompanyId || !selectedSiteId) return;

    if (!fullName.trim() || !companyName.trim()) {
      toast.error("Full name and company name are required.");
      return;
    }

    setAdding(true);

    const payload: Record<string, string | null> = {
      company_id: activeCompanyId,
      site_id: selectedSiteId,
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim() || null,
      company_name: companyName.trim(),
      visitor_type: visitorType,
    };

    if (addSignedIn) payload.signed_in_at = new Date(addSignedIn).toISOString();
    if (addSignedOut) payload.signed_out_at = new Date(addSignedOut).toISOString();

    const { error: insertError } = await supabase.from("site_visits").insert(payload);

    setAdding(false);

    if (insertError) {
      toast.error(insertError.message);
      return;
    }

    setFullName("");
    setPhoneNumber("");
    setCompanyName("");
    setVisitorType("Worker");
    setAddSignedIn("");
    setAddSignedOut("");

    toast.success("Visitor record added.");
    await refreshVisits();
  }

  async function handleSaveEdit(visitId: string) {
    if (!selectedSiteId) return;

    if (!editFullName.trim() || !editCompanyName.trim() || !editSignedIn) {
      toast.error("Full name, company, and signed in time are required to save edits.");
      return;
    }

    setEditSaving(true);

    const updates: Record<string, string | null> = {
      full_name: editFullName.trim(),
      phone_number: editPhoneNumber.trim() || null,
      company_name: editCompanyName.trim(),
      visitor_type: editVisitorType,
      signed_in_at: new Date(editSignedIn).toISOString(),
      signed_out_at: editSignedOut ? new Date(editSignedOut).toISOString() : null,
    };

    const { error: updateError } = await supabase
      .from("site_visits")
      .update(updates)
      .eq("id", visitId)
      .eq("site_id", selectedSiteId);

    setEditSaving(false);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    clearEdit();
    toast.success("Record updated.");
    await refreshVisits();
  }

  async function handleSignOut(visitId: string) {
    if (!selectedSiteId) return;

    setSigningOutId(visitId);

    const { error: updateError } = await supabase
      .from("site_visits")
      .update({ signed_out_at: new Date().toISOString() })
      .eq("id", visitId)
      .eq("site_id", selectedSiteId);

    setSigningOutId(null);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    toast.success("Visitor signed out.");
    await refreshVisits();
  }

  async function handleBulkSignOut() {
    if (!selectedSiteId) return;

    setBulkSigningOut(true);

    const { error: updateError } = await supabase
      .from("site_visits")
      .update({ signed_out_at: new Date().toISOString() })
      .eq("site_id", selectedSiteId)
      .is("signed_out_at", null);

    setBulkSigningOut(false);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    setShowBulkSignOutModal(false);
    toast.success("All visitors signed out.");
    await refreshVisits();
  }

  async function handleDelete(visitId: string) {
    if (!canDelete || !selectedSiteId) return;

    setDeletingId(visitId);
    const { error: deleteError } = await supabase
      .from("site_visits")
      .delete()
      .eq("id", visitId)
      .eq("site_id", selectedSiteId);

    setDeletingId(null);
    setConfirmDeleteId(null);

    if (deleteError) {
      toast.error(deleteError.message);
      return;
    }

    toast.success("Record deleted.");
    setVisits((prev) => prev.filter((visit) => visit.id !== visitId));
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

  function exportXLSX() {
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
  }

  function exportPDF() {
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
  }

  if (loading || pageLoading || !summary) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Site Sign In requires a site</h1>
          <p className="mt-2 text-sm text-slate-600">Create a company site first, then launch Site Sign In records from here.</p>
          <Link
            href="/dashboard/sites"
            className="inline-block mt-6 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold px-5 py-3 rounded-xl text-sm"
          >
            Go to Sites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Site Sign In</h1>
            <p className="mt-1 text-sm text-slate-600">Company-scoped visitor records for the selected site.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedSiteId}
              onChange={(e) => handleSwitchSite(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            {selectedSite && (
              <Link
                href={`/print-qr/${selectedSite.slug}`}
                className="bg-slate-900 hover:bg-black text-white font-bold px-4 py-2 rounded-lg text-sm"
              >
                Print QR
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Add Sign In Record</h2>
        <form className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3" onSubmit={handleAddVisit}>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
          />
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Mobile (optional)"
            className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
          />
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Employer / company"
            className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
          />
          <select
            value={visitorType}
            onChange={(e) => setVisitorType(e.target.value as VisitorType)}
            className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
          >
            {VISITOR_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={addSignedIn}
            onChange={(e) => setAddSignedIn(e.target.value)}
            className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm"
            title="Signed in time (optional, defaults to now)"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-amber-900 font-bold rounded-xl px-4 py-3 text-sm"
          >
            {adding ? "Adding..." : "Add Record"}
          </button>
        </form>
        <div className="mt-3 max-w-sm">
          <input
            type="datetime-local"
            value={addSignedOut}
            onChange={(e) => setAddSignedOut(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm"
            title="Signed out time (optional)"
          />
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
            onChange={(e) => setFilterType(e.target.value as VisitorType | "")}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="">All visitor types</option>
            {VISITOR_TYPES.map((type) => (
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
            disabled={exportableVisits.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg"
          >
            Export Excel
          </button>
          <button
            onClick={exportPDF}
            disabled={exportableVisits.length === 0}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg"
          >
            Export PDF
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Active Site" value={selectedSite?.name ?? "-"} />
          <Stat label="Currently On Site" value={String(onSiteCount)} />
          <Stat label="Signed In Today" value={String(todayCount)} />
          <Stat label="Showing" value={String(filteredVisits.length)} />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Records</h2>

        {visitsLoading ? (
          <p className="text-sm text-slate-500">Loading records...</p>
        ) : filteredVisits.length === 0 ? (
          <p className="text-sm text-slate-500">No records match the current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 text-slate-500 uppercase tracking-wide text-xs">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Mobile</th>
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Signed In</th>
                  <th className="py-2 pr-3">Signed Out</th>
                  <th className="py-2 pr-3">Signature</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map((visit) => (
                  <tr key={visit.id} className="border-b border-slate-100 align-top">
                    {editingId === visit.id ? (
                      <>
                        <td className="py-3 pr-3">
                          <input
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            className="w-full border border-amber-400 rounded-lg px-2 py-1.5 text-xs"
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            value={editPhoneNumber}
                            onChange={(e) => setEditPhoneNumber(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            value={editCompanyName}
                            onChange={(e) => setEditCompanyName(e.target.value)}
                            className="w-full border border-amber-400 rounded-lg px-2 py-1.5 text-xs"
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <select
                            value={editVisitorType}
                            onChange={(e) => setEditVisitorType(e.target.value as VisitorType)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white"
                          >
                            {VISITOR_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="datetime-local"
                            value={editSignedIn}
                            onChange={(e) => setEditSignedIn(e.target.value)}
                            className="w-full border border-amber-400 rounded-lg px-2 py-1.5 text-xs"
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="datetime-local"
                            value={editSignedOut}
                            onChange={(e) => setEditSignedOut(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                          />
                          {editSignedOut && (
                            <button
                              onClick={() => setEditSignedOut("")}
                              className="mt-1 text-[11px] text-slate-500 hover:text-slate-700"
                            >
                              Clear sign out
                            </button>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-xs text-slate-400">-</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveEdit(visit.id)}
                              disabled={editSaving}
                              className="text-xs font-bold bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 rounded-lg px-3 py-1.5"
                            >
                              {editSaving ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={clearEdit}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 pr-3">
                          <p className="font-semibold text-slate-900">{visit.full_name}</p>
                        </td>
                        <td className="py-3 pr-3 text-slate-700">{visit.phone_number ?? "-"}</td>
                        <td className="py-3 pr-3 text-slate-700">{visit.company_name}</td>
                        <td className="py-3 pr-3 text-slate-700">{visit.visitor_type}</td>
                        <td className="py-3 pr-3 text-slate-700">{formatDateTime(visit.signed_in_at)}</td>
                        <td className="py-3 pr-3 text-slate-700">
                          {visit.signed_out_at ? (
                            formatDateTime(visit.signed_out_at)
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 rounded-full px-2 py-1 font-semibold">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              On site
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          {visit.signature ? (
                            <button onClick={() => setViewSignature(visit.signature)} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                              View
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {canEdit && (
                              <button
                                onClick={() => startEdit(visit)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700"
                              >
                                Edit
                              </button>
                            )}
                            {!visit.signed_out_at && (
                              <button
                                onClick={() => handleSignOut(visit.id)}
                                disabled={signingOutId === visit.id}
                                className="text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-lg px-3 py-1.5"
                              >
                                {signingOutId === visit.id ? "..." : "Sign Out"}
                              </button>
                            )}
                            {canDelete && (
                              <>
                                {confirmDeleteId === visit.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleDelete(visit.id)}
                                      disabled={deletingId === visit.id}
                                      className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg px-2 py-1"
                                    >
                                      {deletingId === visit.id ? "..." : "Confirm"}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="text-xs text-slate-500 hover:text-slate-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteId(visit.id)}
                                    className="text-xs font-bold text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
