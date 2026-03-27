"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { supabase } from "@/lib/supabase";
import { fetchCompanyProjects, fetchCompanySites } from "@/lib/workspace/client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItemType = "hold" | "witness";
type ItemStatus = "pending" | "signed" | "waived";
type CreationMode = "ai" | "manual" | "import";

interface ITPItem {
  id: string;
  session_id: string;
  type: ItemType;
  title: string;
  description: string;
  sort_order: number;
  slug: string;
  status: ItemStatus;
  signed_off_at: string | null;
  signed_off_by_name: string | null;
  sign_off_lat: number | null;
  sign_off_lng: number | null;
}

interface ITPSession {
  id: string;
  company_id: string;
  project_id: string | null;
  site_id: string | null;
  task_description: string;
  status: string;
  created_at: string;
  items?: ITPItem[];
}

interface ProjectOption {
  id: string;
  name: string;
}

interface SiteOption {
  id: string;
  name: string;
  project_id: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSignedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "Australia/Sydney",
  });
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Skeleton Row
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-5 w-16 bg-slate-200 rounded-full shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-4 w-3/4 bg-slate-200 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-5/6 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checklist Item Card
// ---------------------------------------------------------------------------

interface ChecklistItemCardProps {
  item: ITPItem;
  onDelete?: (id: string) => void;
  onEdit?: (updated: ITPItem) => void;
}

function ChecklistItemCard({ item, onDelete, onEdit }: ChecklistItemCardProps) {
  const [expanded, setExpanded] = useState(item.status !== "signed");
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState<ItemType>(item.type);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description ?? "");
  const [saving, setSaving] = useState(false);

  const isSigned = item.status === "signed";
  const isHold = item.type === "hold";

  const borderColor = isHold ? "border-l-red-500" : "border-l-amber-400";
  const typeBadge = isHold
    ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    const { data: deleted, error } = await supabase
      .from("itp_items")
      .delete()
      .eq("id", item.id)
      .select("id");
    if (error || !deleted || deleted.length === 0) {
      toast.error("Failed to delete item.");
      setDeleting(false);
      return;
    }
    onDelete(item.id);
  }

  async function handleSave() {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;
    setSaving(true);
    const { data: updated, error } = await supabase
      .from("itp_items")
      .update({
        type: editType,
        title: trimmedTitle,
        description: editDescription.trim(),
      })
      .eq("id", item.id)
      .select(
        "id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng"
      )
      .single();
    if (error || !updated) {
      toast.error("Failed to save changes.");
      setSaving(false);
      return;
    }
    onEdit?.(updated as ITPItem);
    setIsEditing(false);
    setSaving(false);
  }

  function handleCancelEdit() {
    setEditType(item.type);
    setEditTitle(item.title);
    setEditDescription(item.description ?? "");
    setIsEditing(false);
  }

  // Collapsed one-liner for signed cards
  if (isSigned && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full text-left bg-white border border-slate-200 border-l-4 ${borderColor} rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 active:scale-95 transition-transform`}
      >
        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${typeBadge}`}>
          {item.type}
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-700 truncate">
          {item.title}
        </span>
        <span className="text-xs font-semibold text-green-600 shrink-0">
          Signed ✓
        </span>
      </button>
    );
  }

  // Inline edit form
  if (isEditing) {
    const editBorder = editType === "hold" ? "border-l-red-500" : "border-l-amber-400";
    return (
      <div className={`bg-white border border-slate-200 border-l-4 ${editBorder} rounded-2xl p-4 shadow-sm`}>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
          Edit Inspection Point
        </p>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setEditType("witness")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
              editType === "witness"
                ? "bg-amber-100 border-amber-300 text-amber-700"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            WITNESS
          </button>
          <button
            type="button"
            onClick={() => setEditType("hold")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
              editType === "hold"
                ? "bg-red-100 border-red-300 text-red-700"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            HOLD
          </button>
        </div>
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Title"
          style={{ fontSize: "16px" }}
          className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm mb-2 bg-white transition-colors"
        />
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Acceptance criterion (optional)"
          rows={2}
          style={{ fontSize: "16px" }}
          className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm resize-none mb-3 bg-white transition-colors"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !editTitle.trim()}
            className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 font-bold rounded-2xl py-2.5 text-sm active:scale-95 transition-transform"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handleCancelEdit}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 border-l-4 ${borderColor} rounded-2xl p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${typeBadge}`}>
              {item.type}
            </span>
            {isSigned ? (
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Signed ✓
              </span>
            ) : (
              <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                Pending
              </span>
            )}
          </div>

          {/* Title */}
          <p className="mt-2 text-base font-semibold text-slate-900">{item.title}</p>

          {/* Description */}
          {item.description && (
            <p className="mt-1 text-sm text-slate-500">{item.description}</p>
          )}

          {/* Sign-off details */}
          {isSigned && (
            <div className="mt-3 text-xs text-slate-500 space-y-0.5">
              {item.signed_off_by_name && (
                <p>
                  Signed by{" "}
                  <span className="font-medium text-slate-700">{item.signed_off_by_name}</span>
                </p>
              )}
              {item.signed_off_at && <p>{formatSignedAt(item.signed_off_at)}</p>}
              {item.sign_off_lat != null && item.sign_off_lng != null && (
                <p className="font-mono">
                  {item.sign_off_lat.toFixed(5)}, {item.sign_off_lng.toFixed(5)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right-side actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {isSigned && (
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Collapse
            </button>
          )}
          {!isSigned && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-50 active:scale-95 transition-transform"
            >
              Edit
            </button>
          )}
          {!isSigned && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
            >
              {deleting ? "…" : "Remove"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Item Form
// ---------------------------------------------------------------------------

interface AddItemFormProps {
  sessionId: string;
  nextOrder: number;
  onAdd: (item: ITPItem) => void;
}

function AddItemForm({ sessionId, nextOrder, onAdd }: AddItemFormProps) {
  const [type, setType] = useState<ItemType>("witness");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setAdding(true);
    try {
      const { data: item, error } = await supabase
        .from("itp_items")
        .insert({
          session_id: sessionId,
          type,
          title: trimmedTitle,
          description: description.trim(),
          sort_order: nextOrder,
        })
        .select(
          "id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng"
        )
        .single();

      if (error || !item) throw error ?? new Error("Insert failed");

      onAdd(item as ITPItem);
      setTitle("");
      setDescription("");
    } catch {
      toast.error("Failed to add item.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
        Add Inspection Point
      </p>

      {/* Type selector */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setType("witness")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
            type === "witness"
              ? "bg-amber-100 border-amber-300 text-amber-700"
              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
          }`}
        >
          WITNESS POINT
        </button>
        <button
          type="button"
          onClick={() => setType("hold")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
            type === "hold"
              ? "bg-red-100 border-red-300 text-red-700"
              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
          }`}
        >
          HOLD POINT
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Dimensions and levels check"
        style={{ fontSize: "16px" }}
        className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm mb-2 bg-white transition-colors"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Acceptance criterion (optional)"
        rows={2}
        style={{ fontSize: "16px" }}
        className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm resize-none mb-3 bg-white transition-colors"
      />

      <button
        onClick={handleSubmit}
        disabled={adding || !title.trim()}
        className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 font-bold rounded-2xl py-3 text-sm active:scale-95 transition-transform"
      >
        {adding ? "Adding…" : "+ Add Item"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session Card (compact, for the grouped list)
// ---------------------------------------------------------------------------

interface SessionCardProps {
  session: ITPSession;
  projects: ProjectOption[];
  sites: SiteOption[];
  onSelect: (session: ITPSession) => void;
}

function SessionCard({ session, onSelect }: SessionCardProps) {
  const items = session.items ?? [];
  const total = items.length;
  const signed = items.filter((i) => i.status === "signed").length;
  const allSigned = total > 0 && signed === total;

  const statusLabel = allSigned ? "Complete" : total === 0 ? "Empty" : "In Progress";
  const statusColor = allSigned
    ? "bg-green-100 text-green-700"
    : total === 0
    ? "bg-slate-100 text-slate-500"
    : "bg-amber-100 text-amber-700";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => onSelect(session)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 active:scale-[0.99] transition-transform"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {session.task_description}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{formatSessionDate(session.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {total > 0 && (
            <span className="text-xs text-slate-500">{signed}/{total}</span>
          )}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grouped session list helpers
// ---------------------------------------------------------------------------

interface SiteGroup {
  siteId: string | null;
  siteName: string | null;
  sessions: ITPSession[];
}

interface ProjectGroup {
  projectId: string | null;
  projectName: string | null;
  siteGroups: SiteGroup[];
}

function groupSessions(
  sessions: ITPSession[],
  projects: ProjectOption[],
  sites: SiteOption[]
): ProjectGroup[] {
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const siteMap = new Map(sites.map((s) => [s.id, s.name]));

  const projectGroupsMap = new Map<
    string | null,
    Map<string | null, ITPSession[]>
  >();

  for (const session of sessions) {
    const pId = session.project_id ?? null;
    const sId = session.site_id ?? null;

    if (!projectGroupsMap.has(pId)) {
      projectGroupsMap.set(pId, new Map());
    }
    const siteGroupMap = projectGroupsMap.get(pId)!;
    if (!siteGroupMap.has(sId)) {
      siteGroupMap.set(sId, []);
    }
    siteGroupMap.get(sId)!.push(session);
  }

  // Sort: projects with an id first (alphabetically), then null (unassigned)
  const sortedProjectIds = Array.from(projectGroupsMap.keys()).sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return (projectMap.get(a) ?? "").localeCompare(projectMap.get(b) ?? "");
  });

  return sortedProjectIds.map((pId) => {
    const siteGroupMap = projectGroupsMap.get(pId)!;

    const sortedSiteIds = Array.from(siteGroupMap.keys()).sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return (siteMap.get(a) ?? "").localeCompare(siteMap.get(b) ?? "");
    });

    return {
      projectId: pId,
      projectName: pId ? (projectMap.get(pId) ?? "Unknown Project") : null,
      siteGroups: sortedSiteIds.map((sId) => ({
        siteId: sId,
        siteName: sId ? (siteMap.get(sId) ?? "Unknown Site") : null,
        sessions: siteGroupMap.get(sId)!,
      })),
    };
  });
}

// ---------------------------------------------------------------------------
// Main Page (inner — needs Suspense for useSearchParams)
// ---------------------------------------------------------------------------

function ITPBuilderPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?project=<uuid> filters builder to a specific project; "unassigned" shows unlinked ITPs
  const projectFilter = searchParams.get("project") ?? "";

  const { loading, summary } = useWorkspace({
    requireAuth: true,
    requireCompany: true,
  });
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;

  // ── New ITP form state
  const [taskDescription, setTaskDescription] = useState("");
  const [creationMode, setCreationMode] = useState<CreationMode>("ai");
  // Pre-set from URL; locked when a filter is active
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectFilter && projectFilter !== "unassigned" ? projectFilter : ""
  );
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [showInput, setShowInput] = useState(true);

  // ── Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    total_items: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Active session state
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeSession, setActiveSession] = useState<ITPSession | null>(null);
  const [activeItems, setActiveItems] = useState<ITPItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showSessionQR, setShowSessionQR] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);

  // ── Project / site options
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [allSites, setAllSites] = useState<SiteOption[]>([]);

  // ── Session list state
  const [sessions, setSessions] = useState<ITPSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Filtered sites based on selected project
  const filteredSites = selectedProjectId
    ? allSites.filter((s) => s.project_id === selectedProjectId)
    : allSites;

  // Load reference data and sessions on mount / company change
  useEffect(() => {
    if (!activeCompanyId) return;
    loadReferenceData(activeCompanyId);
    loadSessions(activeCompanyId);
  }, [activeCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear site selection when project changes
  useEffect(() => {
    setSelectedSiteId("");
  }, [selectedProjectId]);

  // Poll active session every 15s for real-time sign-off updates
  useEffect(() => {
    if (!activeSession?.id) return;
    const id = activeSession.id;
    const interval = setInterval(() => pollSession(id), 15_000);
    return () => clearInterval(interval);
  }, [activeSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus textarea when input card is shown
  useEffect(() => {
    if (showInput) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [showInput]);

  async function loadReferenceData(companyId: string) {
    try {
      const [fetchedProjects, fetchedSites] = await Promise.all([
        fetchCompanyProjects(companyId),
        fetchCompanySites(companyId),
      ]);
      setProjects(fetchedProjects.map((p) => ({ id: p.id, name: p.name })));
      setAllSites(
        fetchedSites.map((s) => ({ id: s.id, name: s.name, project_id: s.project_id ?? null }))
      );
    } catch {
      // Non-critical — selectors will just be empty
    }
  }

  async function loadSessions(companyId: string) {
    setSessionsLoading(true);
    try {
      let query = supabase
        .from("itp_sessions")
        .select("id, company_id, task_description, created_at, status, project_id, site_id")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);

      // Apply project filter from URL param
      if (projectFilter === "unassigned") {
        query = query.is("project_id", null);
      } else if (projectFilter) {
        query = query.eq("project_id", projectFilter);
      }

      const { data: sessionRows, error: sessionError } = await query;

      if (sessionError) throw sessionError;

      const sessionList = (sessionRows ?? []) as ITPSession[];
      if (sessionList.length === 0) {
        setSessions([]);
        return;
      }

      // Batch-fetch items for all sessions
      const ids = sessionList.map((s) => s.id);
      const { data: itemRows, error: itemError } = await supabase
        .from("itp_items")
        .select(
          "id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng"
        )
        .in("session_id", ids);

      if (itemError) throw itemError;

      const itemsBySession = new Map<string, ITPItem[]>();
      for (const item of (itemRows ?? []) as ITPItem[]) {
        const bucket = itemsBySession.get(item.session_id) ?? [];
        bucket.push(item);
        itemsBySession.set(item.session_id, bucket);
      }

      setSessions(
        sessionList.map((s) => ({ ...s, items: itemsBySession.get(s.id) ?? [] }))
      );
    } catch {
      // Sessions are non-critical; fail silently
    } finally {
      setSessionsLoading(false);
    }
  }

  async function pollSession(sessionId: string) {
    const { data, error } = await supabase
      .from("itp_items")
      .select(
        "id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng"
      )
      .eq("session_id", sessionId);

    if (error || !data) return;
    setActiveItems(data as ITPItem[]);
  }

  async function handleGenerate() {
    const task = taskDescription.trim();
    if (!task || !activeCompanyId) return;

    setGenerating(true);
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/itp-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          task_description: task,
          company_id: activeCompanyId,
          project_id: selectedProjectId || undefined,
          site_id: selectedSiteId || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `Request failed (${res.status})`
        );
      }

      const data = (await res.json()) as { session: ITPSession; items: ITPItem[] };

      setActiveSession(data.session);
      setActiveItems(data.items);
      setShowInput(false);
      setShowAddItem(true);
      setShowSessionQR(false);
      setTaskDescription("");

      if (activeCompanyId) loadSessions(activeCompanyId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate checklist.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreateManual() {
    const task = taskDescription.trim();
    if (!task || !activeCompanyId) return;

    setCreating(true);
    try {
      const { data: session, error } = await supabase
        .from("itp_sessions")
        .insert({
          company_id: activeCompanyId,
          task_description: task,
          project_id: selectedProjectId || null,
          site_id: selectedSiteId || null,
        })
        .select("id, company_id, task_description, created_at, project_id, site_id, status")
        .single();

      if (error || !session) throw error ?? new Error("Failed to create ITP session.");

      setActiveSession(session as ITPSession);
      setActiveItems([]);
      setShowInput(false);
      setShowAddItem(true);
      setTaskDescription("");

      if (activeCompanyId) loadSessions(activeCompanyId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create ITP.");
    } finally {
      setCreating(false);
    }
  }

  async function handleImport() {
    if (!importFile || !activeCompanyId) return;

    setImporting(true);
    setImportResult(null);
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("company_id", activeCompanyId);
      if (selectedProjectId) formData.append("project_id", selectedProjectId);
      if (selectedSiteId) formData.append("site_id", selectedSiteId);

      const res = await fetch("/api/itp-import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authSession?.access_token ?? ""}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `Request failed (${res.status})`
        );
      }

      const data = (await res.json()) as {
        imported: number;
        total_items: number;
        sessions: Array<{ session: ITPSession; items: ITPItem[] }>;
      };

      setImportResult({ imported: data.imported, total_items: data.total_items });
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Load the first imported session as active
      if (data.sessions.length > 0) {
        const first = data.sessions[0];
        setActiveSession(first.session);
        setActiveItems(first.items);
        setShowInput(false);
        setShowAddItem(true);
      }

      toast.success(
        `Imported ${data.imported} ITP${data.imported !== 1 ? "s" : ""} with ${data.total_items} checks`
      );

      if (activeCompanyId) loadSessions(activeCompanyId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import document.");
    } finally {
      setImporting(false);
    }
  }

  function handleNewITP() {
    setShowInput(true);
    setActiveSession(null);
    setActiveItems([]);
    setShowAddItem(false);
    setShowSessionQR(false);
    setConfirmDeleteSession(false);
    setImportFile(null);
    setImportResult(null);
    setTimeout(() => inputCardRef.current?.scrollIntoView({ behavior: "smooth" }), 10);
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

      // Remove from session list
      setSessions((prev) => prev.filter((s) => s.id !== activeSession.id));
      toast.success("ITP deleted.");

      // Clear active view
      setActiveSession(null);
      setActiveItems([]);
      setConfirmDeleteSession(false);
      setShowInput(true);
      setShowAddItem(false);
      setShowSessionQR(false);
    } catch {
      toast.error("Failed to delete ITP.");
    } finally {
      setDeletingSession(false);
    }
  }

  function handleLoadSession(session: ITPSession) {
    setActiveSession(session);
    setActiveItems(session.items ?? []);
    setShowInput(false);
    setShowAddItem(false);
    setShowSessionQR(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleItemAdded(item: ITPItem) {
    setActiveItems((prev) => [...prev, item]);
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

  // Loading guard
  if (loading || !summary) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const signedCount = activeItems.filter((i) => i.status === "signed").length;
  const grouped = groupSessions(sessions, projects, allSites);

  // Look up project/site name for active session header
  const activeProjectName = activeSession?.project_id
    ? projects.find((p) => p.id === activeSession.project_id)?.name
    : null;
  const activeSiteName = activeSession?.site_id
    ? allSites.find((s) => s.id === activeSession.site_id)?.name
    : null;

  // Determine project name for the filter breadcrumb
  const filterProjectName = projectFilter && projectFilter !== "unassigned"
    ? (projects.find((p) => p.id === projectFilter)?.name ?? "Project")
    : projectFilter === "unassigned"
    ? "Unassigned ITPs"
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* Back to dashboard breadcrumb when arriving from project dashboard */}
          {projectFilter && (
            <button
              onClick={() => router.push("/site-itp")}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 mb-1 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All projects
            </button>
          )}
          <h1 className="text-2xl font-black text-slate-900">SiteITP</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {filterProjectName ? filterProjectName : "Inspection \u0026 Test Plans"}
          </p>
        </div>
        <button
          onClick={handleNewITP}
          className="shrink-0 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold rounded-2xl px-4 py-2.5 text-sm active:scale-95 transition-transform"
        >
          + New ITP
        </button>
      </div>

      {/* ── New ITP Form ─────────────────────────────────────────────── */}
      {(showInput || !activeSession) && (
        <div
          ref={inputCardRef}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"
        >
          {/* Project & Site selectors */}
          {(projects.length > 0 || allSites.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Project <span className="font-normal">(optional)</span>
                </label>
                {/* Lock the project selector when arriving from the dashboard with a project filter */}
                {projectFilter && projectFilter !== "unassigned" ? (
                  <div className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-600 truncate">
                    {filterProjectName}
                  </div>
                ) : (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2 text-sm outline-none bg-white transition-colors"
                  >
                    <option value="">— None —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Site <span className="font-normal">(optional)</span>
                </label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  disabled={filteredSites.length === 0}
                  className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2 text-sm outline-none bg-white transition-colors disabled:opacity-50"
                >
                  <option value="">— None —</option>
                  {filteredSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Task description (hidden in import mode) */}
          {creationMode !== "import" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Task description
              </label>
              <textarea
                ref={textareaRef}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="e.g. Laying pavers on median island"
                rows={3}
                disabled={generating || creating}
                style={{ fontSize: "16px" }}
                className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-4 py-3 resize-none outline-none disabled:opacity-60 placeholder:text-slate-400 transition-colors"
              />
            </div>
          )}

          {/* Creation mode toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              How do you want to build this ITP?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCreationMode("ai")}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  creationMode === "ai"
                    ? "bg-violet-100 border-violet-300 text-violet-700"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                ✦ AI Generate
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("manual")}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  creationMode === "manual"
                    ? "bg-slate-800 border-slate-700 text-white"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                ✎ Manual
              </button>
            </div>
          </div>

          {/* Action area */}
          {creationMode === "import" ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setImportFile(f);
                  setImportResult(null);
                }}
                className="hidden"
                id="itp-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full border-2 border-dashed border-blue-300 hover:border-blue-400 bg-blue-50 rounded-2xl py-6 text-center transition-colors disabled:opacity-50"
              >
                {importFile ? (
                  <div>
                    <p className="text-sm font-semibold text-blue-700 truncate px-4">
                      {importFile.name}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                      {(importFile.size / 1024).toFixed(0)} KB — tap to change
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-blue-600">
                      Tap to upload document
                    </p>
                    <p className="text-xs text-blue-400 mt-1">
                      PDF, DOCX, Excel, or TXT (max 10 MB)
                    </p>
                  </div>
                )}
              </button>

              {importResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                  Imported {importResult.imported} ITP{importResult.imported !== 1 ? "s" : ""} with{" "}
                  {importResult.total_items} checks
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={importing || !importFile}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform"
              >
                {importing ? "Analysing document…" : "Import & Generate ITPs"}
              </button>
            </div>
          ) : creationMode === "ai" ? (
            <button
              onClick={handleGenerate}
              disabled={generating || creating || !taskDescription.trim()}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform"
            >
              {generating ? "Generating…" : "Generate Checklist"}
            </button>
          ) : (
            <button
              onClick={handleCreateManual}
              disabled={generating || creating || !taskDescription.trim()}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform"
            >
              {creating ? "Creating…" : "Create ITP"}
            </button>
          )}
        </div>
      )}

      {/* ── AI Generation / Import Skeleton ──────────────────────────── */}
      {(generating || importing) && (
        <div className="space-y-3">
          {importing && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-700 text-center">
              Reading document and generating ITPs — this may take a moment…
            </div>
          )}
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* ── Active Session ─────────────────────────────────────────────── */}
      {!generating && !importing && activeSession && (
        <div className="space-y-3">
          {/* Session header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate">
                {activeSession.task_description}
              </h2>
              {(activeProjectName || activeSiteName) && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {[activeProjectName, activeSiteName].filter(Boolean).join(" › ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400">
                {signedCount}/{activeItems.length} signed
              </span>
              <button
                onClick={() => setShowSessionQR((v) => !v)}
                className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-50 active:scale-95 transition-transform"
              >
                {showSessionQR ? "Hide QR" : "QR Code"}
              </button>
              {/* Delete ITP session */}
              {!confirmDeleteSession ? (
                <button
                  onClick={() => setConfirmDeleteSession(true)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors px-1"
                  title="Delete this ITP"
                >
                  Delete
                </button>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Delete ITP?</span>
                  <button
                    onClick={handleDeleteSession}
                    disabled={deletingSession}
                    className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deletingSession ? "…" : "Yes"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteSession(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    No
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Session QR — one QR for the entire ITP */}
          {showSessionQR && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center gap-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Scan to sign off all items
              </p>
              <QRCodeSVG
                value={`${baseUrl}/itp-sign/session/${activeSession.id}`}
                size={220}
                level="H"
              />
              <p className="text-xs text-slate-400 break-all text-center max-w-xs">
                {`${baseUrl}/itp-sign/session/${activeSession.id}`}
              </p>
            </div>
          )}

          {/* Items */}
          {activeItems.length === 0 && !showAddItem && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
              <p className="text-sm text-slate-400">No items yet.</p>
              <button
                onClick={() => setShowAddItem(true)}
                className="mt-3 text-sm font-semibold text-amber-600 hover:text-amber-700"
              >
                + Add first item
              </button>
            </div>
          )}

          {activeItems.map((item) => (
            <ChecklistItemCard
              key={item.id}
              item={item}
              onDelete={handleItemDeleted}
              onEdit={handleItemEdited}
            />
          ))}

          {/* Add item section */}
          {showAddItem ? (
            <AddItemForm
              sessionId={activeSession.id}
              nextOrder={activeItems.length + 1}
              onAdd={handleItemAdded}
            />
          ) : (
            <button
              onClick={() => setShowAddItem(true)}
              className="w-full text-center text-xs font-semibold text-slate-500 border border-dashed border-slate-300 rounded-2xl py-3 hover:border-slate-400 hover:text-slate-700 transition-colors"
            >
              + Add item
            </button>
          )}
        </div>
      )}

      {/* ── Session File Tree ─────────────────────────────────────────── */}
      {(sessions.length > 0 || sessionsLoading) && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            All ITPs
          </h2>

          {sessionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            grouped.map((pg) => (
              <div key={pg.projectId ?? "__none__"} className="space-y-1">
                {/* Project header */}
                <div className="flex items-center gap-2 px-1 pt-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 text-slate-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                    />
                  </svg>
                  <span className="text-xs font-bold text-slate-600 truncate">
                    {pg.projectName ?? "No Project"}
                  </span>
                </div>

                {pg.siteGroups.map((sg) => (
                  <div key={sg.siteId ?? "__none__"} className="pl-4 space-y-1">
                    {/* Site header (only show if there are multiple site groups or site is named) */}
                    {(sg.siteName || pg.siteGroups.length > 1) && (
                      <div className="flex items-center gap-1.5 px-1 pb-0.5">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 text-slate-300 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="text-[11px] font-semibold text-slate-400 truncate">
                          {sg.siteName ?? "No Site"}
                        </span>
                      </div>
                    )}

                    {sg.sessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        projects={projects}
                        sites={allSites}
                        onSelect={handleLoadSession}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export — Suspense wrapper required for useSearchParams
// ---------------------------------------------------------------------------

export default function ITPBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
        </div>
      }
    >
      <ITPBuilderPageInner />
    </Suspense>
  );
}
