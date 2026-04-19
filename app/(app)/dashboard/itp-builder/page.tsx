"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, AlertCircle, RefreshCw } from "lucide-react";
import { DropResult } from "@hello-pangea/dnd";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { supabase } from "@/lib/supabase";
import { fetchCompanyProjects, fetchCompanySites } from "@/lib/workspace/client";
import { toast } from "sonner";

import { ITPItem, ITPSession, ITPTemplate, AuditLogEntry, ProjectOption, SiteOption } from "./components/types";
import SessionSidebar from "./components/SessionSidebar";
import SessionHeader from "./components/SessionHeader";
import ItemsList, { SkeletonRow } from "./components/ItemsList";
import CreateItpModal from "./components/CreateItpModal";
import ItpErrorBoundary from "./components/ItpErrorBoundary";

// ---------------------------------------------------------------------------
// Delete Confirmation Modal
// ---------------------------------------------------------------------------

interface DeleteConfirmModalProps {
  open: boolean;
  taskDescription: string;
  itemCount: number;
  signedCount: number;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({
  open,
  taskDescription,
  itemCount,
  signedCount,
  deleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="backdrop:bg-black/40 bg-white rounded-2xl shadow-xl p-0 max-w-sm w-full border-0"
    >
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Delete ITP?</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">{taskDescription}</span>
          </p>
          <p>
            {itemCount} item{itemCount !== 1 ? "s" : ""}
            {signedCount > 0 && <span> ({signedCount} signed)</span>}
          </p>
          <p className="text-red-600 font-medium">
            This action cannot be undone. All items including signed records will be permanently deleted.
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-sm active:scale-95 transition-all"
          >
            {deleting ? "Deleting…" : "Delete ITP"}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page (inner — needs Suspense for useSearchParams)
// ---------------------------------------------------------------------------

function ITPBuilderPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get("project") ?? "";
  const initialSearch = searchParams.get("q") ?? "";
  const initialStatusFilter = searchParams.get("status") ?? "all";
  const initialSort = searchParams.get("sort") ?? "newest";
  const initialShowArchived = searchParams.get("archived") === "1";

  // ── Realtime channel ref (prevents duplicate subscriptions in StrictMode) ──
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Filter/search state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [sortOrder, setSortOrder] = useState<string>(initialSort);
  const [showArchived, setShowArchived] = useState(initialShowArchived);

  // ── Auth / workspace ───────────────────────────────────────────────────────
  const { loading, summary } = useWorkspace({ requireAuth: true, requireCompany: true });
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;

  // ── Mobile layout: "list" or "detail" ─────────────────────────────────────
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // ── Auto-open modal when navigated here with ?new=1 ──────────────────────
  const autoOpenModal = searchParams.get("new") === "1";

  // ── Modal state ────────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(autoOpenModal);
  const [createModalInitialMode, setCreateModalInitialMode] = useState<"ai" | "manual" | "import" | "template">("ai");

  // ── Active session state ───────────────────────────────────────────────────
  const [activeSession, setActiveSession] = useState<ITPSession | null>(null);
  const [activeItems, setActiveItems] = useState<ITPItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showSessionQR, setShowSessionQR] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // ── Reference data ─────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [allSites, setAllSites] = useState<SiteOption[]>([]);

  // ── Templates ──────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<ITPTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // ── Session list state ─────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ITPSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalSessionCount, setTotalSessionCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Reference data errors ──────────────────────────────────────────────────
  const [referenceDataError, setReferenceDataError] = useState<string | null>(null);

  // ── Generating skeleton (for AI generation in-progress display) ────────────
  const [generating] = useState(false);

  // ── Strip ?new=1 from URL after it has triggered the modal ────────────────
  useEffect(() => {
    if (!autoOpenModal) return;
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete("new");
    const next = qs.toString() ? `?${qs.toString()}` : window.location.pathname;
    router.replace(next, { scroll: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load data on mount / company change ───────────────────────────────────
  useEffect(() => {
    if (!activeCompanyId) return;
    loadReferenceData(activeCompanyId);
    loadSessions(activeCompanyId);
    loadTemplates(activeCompanyId);
  }, [activeCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime sign-off updates for active session ──────────────────────────
  useEffect(() => {
    if (!activeSession?.id) return;
    const sessionId = activeSession.id;
    const channelName = `itp-items-${sessionId}`;

    // Guard against duplicate subscriptions (e.g. React StrictMode double-invoke
    // or rapid session switches where cleanup hasn't fired yet).
    if (channelRef.current) {
      console.warn(`[ITP Realtime] Channel "${channelName}" already has an active subscription — cleaning up stale channel before re-subscribing.`);
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "itp_items", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const updated = payload.new as ITPItem;
          setActiveItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId
                ? { ...s, items: (s.items ?? []).map((i) => (i.id === updated.id ? updated : i)) }
                : s
            )
          );
          if (updated.signed_off_by_name && updated.status === "signed") {
            toast.success(`${updated.signed_off_by_name} signed "${updated.title}"`);
          } else if (updated.status === "waived") {
            toast.info(`"${updated.title}" was waived`);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data loaders ───────────────────────────────────────────────────────────

  async function loadTemplates(companyId: string) {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(`/api/itp-templates?company_id=${companyId}`, {
        headers: { Authorization: `Bearer ${authSession?.access_token ?? ""}` },
      });
      if (res.ok) {
        const data = await res.json() as { templates: ITPTemplate[] };
        setTemplates(data.templates ?? []);
      } else {
        throw new Error(`Failed to load templates (${res.status})`);
      }
    } catch (err) {
      setTemplatesError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function loadReferenceData(companyId: string) {
    setReferenceDataError(null);
    try {
      const [fetchedProjects, fetchedSites] = await Promise.all([
        fetchCompanyProjects(companyId),
        fetchCompanySites(companyId),
      ]);
      setProjects(fetchedProjects.map((p) => ({ id: p.id, name: p.name })));
      setAllSites(fetchedSites.map((s) => ({ id: s.id, name: s.name, project_id: s.project_id ?? null })));
    } catch (err) {
      setReferenceDataError(err instanceof Error ? err.message : "Failed to load projects and sites");
    }
  }

  async function loadSessions(companyId: string, pageNum = 0, append = false) {
    if (append) setLoadingMore(true);
    else {
      setSessionsLoading(true);
      setSessionsError(null);
    }
    try {
      const PAGE_SIZE = 50;
      let query = supabase
        .from("itp_sessions")
        .select("id, company_id, task_description, created_at, status, project_id, site_id", { count: "exact" })
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (projectFilter === "unassigned") query = query.is("project_id", null);
      else if (projectFilter) query = query.eq("project_id", projectFilter);

      const { data: sessionRows, error: sessionError, count } = await query;
      if (sessionError) throw sessionError;
      if (typeof count === "number") setTotalSessionCount(count);

      const sessionList = (sessionRows ?? []) as ITPSession[];
      if (sessionList.length === 0 && !append) { setSessions([]); return; }

      const ids = sessionList.map((s) => s.id);
      const { data: itemRows, error: itemError } = await supabase
        .from("itp_items")
        .select("id, session_id, slug, type, phase, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng, waive_reason, signature, reference_standard, responsibility, records_required, acceptance_criteria")
        .in("session_id", ids);
      if (itemError) throw itemError;

      const itemsBySession = new Map<string, ITPItem[]>();
      for (const item of (itemRows ?? []) as ITPItem[]) {
        const bucket = itemsBySession.get(item.session_id) ?? [];
        bucket.push(item);
        itemsBySession.set(item.session_id, bucket);
      }

      const newSessions = sessionList.map((s) => ({ ...s, items: itemsBySession.get(s.id) ?? [] }));
      if (append) setSessions((prev) => [...prev, ...newSessions]);
      else setSessions(newSessions);
    } catch (err) {
      if (!append) {
        setSessionsError(err instanceof Error ? err.message : "Failed to load ITPs");
      }
    } finally {
      setSessionsLoading(false);
      setLoadingMore(false);
    }
  }

  // ── Session event handlers ─────────────────────────────────────────────────

  function handleSessionCreated(session: ITPSession, items: ITPItem[]) {
    const newSession = { ...session, items };
    setSessions((prev) => {
      // Avoid duplicates if multiple sessions are bulk-imported
      if (prev.some((s) => s.id === session.id)) return prev;
      return [newSession, ...prev];
    });
    // Activate the first session created (most recent call wins for single creates)
    setActiveSession(session);
    setActiveItems(items);
    setShowAddItem(items.length === 0);
    setShowSessionQR(false);
    setMobileView("detail");
  }

  function handleLoadSession(session: ITPSession) {
    setActiveSession(session);
    setActiveItems(session.items ?? []);
    setShowAddItem(false);
    setShowSessionQR(false);
    setShowAuditTrail(false);
    setShowSaveTemplate(false);
    setConfirmDeleteSession(false);
    setMobileView("detail");
  }

  function handleNewITP() {
    setCreateModalInitialMode("ai");
    setShowCreateModal(true);
  }

  function handleNewITPWithMode(mode: "ai" | "manual" | "import" | "template") {
    setCreateModalInitialMode(mode);
    setShowCreateModal(true);
  }

  function handleBackToList() {
    setMobileView("list");
  }

  async function handleDeleteSession() {
    if (!activeSession) return;
    setDeletingSession(true);
    try {
      const { data: deleted, error } = await supabase
        .from("itp_sessions")
        .delete()
        .eq("id", activeSession.id)
        .select("id");
      if (error) throw error;
      if (!deleted || deleted.length === 0) throw new Error("Delete blocked by database policy");
      setSessions((prev) => prev.filter((s) => s.id !== activeSession.id));
      toast.success("ITP deleted.");
      setActiveSession(null);
      setActiveItems([]);
      setConfirmDeleteSession(false);
      setMobileView("list");
    } catch {
      toast.error("Failed to delete ITP.");
    } finally {
      setDeletingSession(false);
    }
  }

  async function handleAssignProject(projectId: string | null, siteId: string | null) {
    if (!activeSession) return;
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const res = await fetch(`/api/itp-sessions/${activeSession.id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authSession?.access_token ?? ""}` },
      body: JSON.stringify({ project_id: projectId, site_id: siteId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to assign");
    }
    const updated = { ...activeSession, project_id: projectId, site_id: siteId };
    setActiveSession(updated);
    setSessions((prev) => prev.map((s) => s.id === activeSession.id ? { ...s, project_id: projectId, site_id: siteId } : s));
  }

  async function handleStatusChange(newStatus: string) {
    if (!activeSession) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("itp_sessions")
        .update({ status: newStatus })
        .eq("id", activeSession.id);
      if (error) throw error;
      const updated = { ...activeSession, status: newStatus };
      setActiveSession(updated);
      setSessions((prev) => prev.map((s) => (s.id === activeSession.id ? { ...s, status: newStatus } : s)));
      toast.success(`Session marked as ${newStatus}.`);
    } catch {
      toast.error("Failed to update session status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  // ── Item event handlers ────────────────────────────────────────────────────

  function handleItemAdded(item: ITPItem) {
    setActiveItems((prev) => [...prev, item]);
    if (activeSession) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id ? { ...s, items: [...(s.items ?? []), item] } : s
        )
      );
    }
  }

  function handleItemsAdded(items: ITPItem[]) {
    setActiveItems((prev) => [...prev, ...items]);
    if (activeSession) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id ? { ...s, items: [...(s.items ?? []), ...items] } : s
        )
      );
    }
  }

  function handleItemDeleted(itemId: string) {
    setActiveItems((prev) => prev.filter((i) => i.id !== itemId));
    if (activeSession) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, items: (s.items ?? []).filter((i) => i.id !== itemId) }
            : s
        )
      );
    }
  }

  function handleItemEdited(updated: ITPItem) {
    setActiveItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (activeSession) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, items: (s.items ?? []).map((i) => (i.id === updated.id ? updated : i)) }
            : s
        )
      );
    }
  }

  // ── Drag-and-drop reorder ──────────────────────────────────────────────────

  async function handleDragEnd(result: DropResult) {
    if (!result.destination || !activeSession) return;
    if (result.source.index === result.destination.index) return;

    const sorted = [...activeItems].sort((a, b) => a.sort_order - b.sort_order);
    const reordered = Array.from(sorted);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    const updates = reordered.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    setActiveItems(updates);
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, items: updates } : s))
    );

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(`/api/itp-sessions/${activeSession.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authSession?.access_token ?? ""}` },
        body: JSON.stringify(updates.map((i) => ({ id: i.id, sort_order: i.sort_order }))),
      });
      if (!res.ok) toast.error("Failed to save new order.");
    } catch {
      toast.error("Failed to save new order.");
    }
  }

  // ── Template save (from session header) ───────────────────────────────────

  async function handleSaveTemplate() {
    if (!activeSession || !activeCompanyId || !templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch("/api/itp-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authSession?.access_token ?? ""}` },
        body: JSON.stringify({ company_id: activeCompanyId, name: templateName.trim(), session_id: activeSession.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to save");
      }
      const data = await res.json() as { template: ITPTemplate };
      setTemplates((prev) => [data.template, ...prev]);
      setShowSaveTemplate(false);
      setTemplateName("");
      toast.success("Template saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  // ── Audit trail ────────────────────────────────────────────────────────────

  async function loadAuditLog(sessionId: string) {
    setAuditLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(`/api/itp-audit-log/${sessionId}`, {
        headers: { Authorization: `Bearer ${authSession?.access_token ?? ""}` },
      });
      if (res.ok) {
        const data = await res.json() as { logs: AuditLogEntry[] };
        setAuditLogs(data.logs ?? []);
      }
    } catch { /* non-critical */ } finally {
      setAuditLoading(false);
    }
  }

  // ── Filter URL sync ────────────────────────────────────────────────────────

  function updateFilterParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (!v || v === "all" || v === "newest" || (k === "archived" && v === "0")) params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const filterProjectName =
    projectFilter && projectFilter !== "unassigned"
      ? (projects.find((p) => p.id === projectFilter)?.name ?? "Project")
      : projectFilter === "unassigned"
      ? "Unassigned ITPs"
      : null;

  const activeProjectName = activeSession?.project_id
    ? projects.find((p) => p.id === activeSession.project_id)?.name ?? null
    : null;
  const activeSiteName = activeSession?.site_id
    ? allSites.find((s) => s.id === activeSession.site_id)?.name ?? null
    : null;

  // ── Loading guard ──────────────────────────────────────────────────────────

  if (loading || !summary) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  // ── Detail panel content ───────────────────────────────────────────────────

  const detailPanel = (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {generating ? (
        /* AI generation skeleton shown while modal is open and generating */
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="h-4 w-4 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin shrink-0" />
            <span className="text-sm font-semibold text-violet-700">Generating checklist…</span>
          </div>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : activeSession ? (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Mobile back button */}
          <button
            onClick={handleBackToList}
            className="md:hidden flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All ITPs
          </button>

          <ItpErrorBoundary>
            <SessionHeader
              session={activeSession}
              items={activeItems}
              projectName={activeProjectName}
              siteName={activeSiteName}
              companyName={summary?.activeMembership?.companies?.name ?? null}
              projects={projects}
              allSites={allSites}
              updatingStatus={updatingStatus}
              showSessionQR={showSessionQR}
              showSaveTemplate={showSaveTemplate}
              showAuditTrail={showAuditTrail}
              templateName={templateName}
              savingTemplate={savingTemplate}
              auditLogs={auditLogs}
              auditLoading={auditLoading}
              onStatusChange={handleStatusChange}
              onAssignProject={handleAssignProject}
              onToggleSessionQR={() => setShowSessionQR((v) => !v)}
              onToggleSaveTemplate={() => setShowSaveTemplate((v) => !v)}
              onToggleAuditTrail={() => setShowAuditTrail((v) => !v)}
              onTemplateNameChange={setTemplateName}
              onSaveTemplate={handleSaveTemplate}
              onDeleteClick={() => setConfirmDeleteSession(true)}
              onLoadAuditLog={() => loadAuditLog(activeSession.id)}
            />

            <ItemsList
              session={activeSession}
              items={activeItems}
              showAddItem={showAddItem}
              onDragEnd={handleDragEnd}
              onItemDeleted={handleItemDeleted}
              onItemEdited={handleItemEdited}
              onItemAdded={handleItemAdded}
              onItemsAdded={handleItemsAdded}
              onToggleAddItem={setShowAddItem}
              onRegenerate={() => handleNewITPWithMode("ai")}
            />
          </ItpErrorBoundary>
        </div>
      ) : sessionsError ? (
        /* Error state — failed to load sessions */
        <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Failed to load ITPs</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-xs">
            {sessionsError}. Check your connection and try again.
          </p>
          <button
            onClick={() => activeCompanyId && loadSessions(activeCompanyId)}
            disabled={sessionsLoading}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold rounded-xl px-5 py-2.5 text-sm transition-colors active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${sessionsLoading ? "animate-spin" : ""}`} />
            {sessionsLoading ? "Retrying…" : "Try again"}
          </button>
        </div>
      ) : sessions.length === 0 && !sessionsLoading ? (
        /* Empty state — no sessions at all */
        <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">No ITPs yet</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-xs">
            Create your first inspection &amp; test plan to get started.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[220px]">
            <button
              onClick={() => handleNewITPWithMode("ai")}
              className="w-full bg-violet-100 hover:bg-violet-200 border border-violet-300 text-violet-700 font-bold rounded-2xl px-4 py-2.5 text-sm active:scale-95 transition-transform"
            >
              ✦ AI Generate
            </button>
            <button
              onClick={() => handleNewITPWithMode("manual")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl px-4 py-2.5 text-sm active:scale-95 transition-transform"
            >
              ✎ Manual
            </button>
            <button
              onClick={() => handleNewITPWithMode("import")}
              className="w-full bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-700 font-bold rounded-2xl px-4 py-2.5 text-sm active:scale-95 transition-transform"
            >
              ↑ Import Doc
            </button>
          </div>
        </div>
      ) : (
        /* Empty state — sessions exist but none selected */
        <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-3xl">
            📋
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">No ITP selected</h3>
          <p className="text-sm text-slate-400 mb-5">
            Select an ITP from the sidebar, or create a new one.
          </p>
          <button
            onClick={handleNewITP}
            className="bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold rounded-2xl px-5 py-2.5 text-sm active:scale-95 transition-transform"
          >
            + New ITP
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Two-panel split layout ─────────────────────────────────────── */}
      <div className="flex h-full overflow-hidden">
        {/* ── Left sidebar (desktop: always visible; mobile: conditional) ── */}
        <aside
          className={`
            w-full md:w-80 md:shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden
            ${mobileView === "list" ? "flex" : "hidden"}
            md:flex
          `}
        >
          {/* Page title */}
          <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
            <div>
              {projectFilter && (
                <button
                  onClick={() => router.push("/dashboard/site-itp")}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 mb-1 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  All projects
                </button>
              )}
              <h1 className="text-lg font-black text-slate-900">SiteITP</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {filterProjectName ?? "Inspection & Test Plans"}
              </p>
            </div>
          </div>

          <SessionSidebar
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            sessionsError={sessionsError}
            loadingMore={loadingMore}
            totalSessionCount={totalSessionCount}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortOrder={sortOrder}
            showArchived={showArchived}
            projects={projects}
            allSites={allSites}
            referenceDataError={referenceDataError}
            activeSessionId={activeSession?.id ?? null}
            onSelectSession={handleLoadSession}
            onNewITP={handleNewITP}
            onLoadMore={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              if (activeCompanyId) loadSessions(activeCompanyId, nextPage, true);
            }}
            onRetryLoad={() => activeCompanyId && loadSessions(activeCompanyId)}
            onSearchChange={(q) => {
              setSearchQuery(q);
              updateFilterParams({ q });
            }}
            onStatusFilterChange={(s) => {
              setStatusFilter(s);
              if (s === "archived") setShowArchived(true);
              updateFilterParams({ status: s, archived: s === "archived" ? "1" : "0" });
            }}
            onSortOrderChange={(s) => {
              setSortOrder(s);
              updateFilterParams({ sort: s });
            }}
            onShowArchivedChange={(show) => {
              setShowArchived(show);
              updateFilterParams({ archived: show ? "1" : "0" });
            }}
          />
        </aside>

        {/* ── Main content area ─────────────────────────────────────────── */}
        <main
          className={`
            w-full md:flex-1 md:min-w-0 flex flex-col bg-slate-50 overflow-hidden
            ${mobileView === "detail" ? "flex" : "hidden"}
            md:flex
          `}
        >
          {detailPanel}
        </main>
      </div>

      {/* ── Create ITP Modal ──────────────────────────────────────────── */}
      {activeCompanyId && (
        <CreateItpModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          activeCompanyId={activeCompanyId}
          projects={projects}
          allSites={allSites}
          projectFilter={projectFilter}
          filterProjectName={filterProjectName}
          templates={templates}
          templatesLoading={templatesLoading}
          templatesError={templatesError}
          onSessionCreated={handleSessionCreated}
          onTemplateDeleted={(id) => setTemplates((prev) => prev.filter((t) => t.id !== id))}
          onRetryLoadTemplates={() => loadTemplates(activeCompanyId)}
          initialMode={createModalInitialMode}
        />
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      {activeSession && (
        <DeleteConfirmModal
          open={confirmDeleteSession}
          taskDescription={activeSession.task_description}
          itemCount={activeItems.length}
          signedCount={activeItems.filter((i) => i.status === "signed").length}
          deleting={deletingSession}
          onConfirm={handleDeleteSession}
          onCancel={() => setConfirmDeleteSession(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Export — Suspense wrapper required for useSearchParams
// ---------------------------------------------------------------------------

export default function ITPBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
        </div>
      }
    >
      <ITPBuilderPageInner />
    </Suspense>
  );
}
