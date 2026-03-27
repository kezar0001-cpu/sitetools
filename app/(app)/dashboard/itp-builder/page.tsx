"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PointType = "HOLD" | "WITNESS";
type ItemStatus = "pending" | "signed";

interface ITPItem {
  id: string;
  session_id: string;
  title: string;
  description: string;
  point_type: PointType;
  status: ItemStatus;
  signed_by_name: string | null;
  signed_off_at: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  slug: string;
}

interface ITPSession {
  id: string;
  company_id: string;
  task_description: string;
  created_at: string;
  slug: string;
  items?: ITPItem[];
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
  baseUrl: string;
}

function ChecklistItemCard({ item, baseUrl }: ChecklistItemCardProps) {
  const [showQR, setShowQR] = useState(false);
  const [expanded, setExpanded] = useState(item.status !== "signed");

  const isSigned = item.status === "signed";
  const isHold = item.point_type === "HOLD";

  const borderColor = isHold ? "border-l-red-500" : "border-l-amber-400";
  const typeBadge = isHold
    ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";

  const qrUrl = `${baseUrl}/itp-sign/${item.slug}`;

  // Collapsed one-liner for signed cards
  if (isSigned && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full text-left bg-white border border-slate-200 border-l-4 ${borderColor} rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 active:scale-95 transition-transform`}
      >
        <span
          className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${typeBadge}`}
        >
          {item.point_type}
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

  return (
    <div
      className={`bg-white border border-slate-200 border-l-4 ${borderColor} rounded-2xl p-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${typeBadge}`}
            >
              {item.point_type}
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
          <p className="mt-2 text-base font-semibold text-slate-900">
            {item.title}
          </p>

          {/* Description */}
          <p className="mt-1 text-sm text-slate-500">{item.description}</p>

          {/* Sign-off details */}
          {isSigned && (
            <div className="mt-3 text-xs text-slate-500 space-y-0.5">
              {item.signed_by_name && (
                <p>
                  Signed by{" "}
                  <span className="font-medium text-slate-700">
                    {item.signed_by_name}
                  </span>
                </p>
              )}
              {item.signed_off_at && <p>{formatSignedAt(item.signed_off_at)}</p>}
              {item.gps_lat != null && item.gps_lng != null && (
                <p className="font-mono">
                  {item.gps_lat.toFixed(5)}, {item.gps_lng.toFixed(5)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right-side actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={() => setShowQR((v) => !v)}
            className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-50 active:scale-95 transition-transform"
          >
            {showQR ? "Hide QR" : "Show QR"}
          </button>
          {isSigned && (
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Collapse
            </button>
          )}
        </div>
      </div>

      {/* QR Code */}
      {showQR && (
        <div className="mt-4 flex flex-col items-center gap-2 pt-4 border-t border-slate-100">
          <QRCodeSVG value={qrUrl} size={220} level="H" />
          <p className="text-xs text-slate-400 break-all text-center max-w-xs">
            {qrUrl}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session Row
// ---------------------------------------------------------------------------

interface SessionRowProps {
  session: ITPSession;
  baseUrl: string;
  onSelect: (session: ITPSession) => void;
}

function SessionRow({ session, baseUrl, onSelect }: SessionRowProps) {
  const [expanded, setExpanded] = useState(false);

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
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 active:scale-95 transition-transform"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {session.task_description}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatSessionDate(session.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {total > 0 && (
            <span className="text-xs text-slate-500">
              {signed}/{total} signed
            </span>
          )}
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">
              No items in this ITP
            </p>
          ) : (
            items.map((item) => (
              <ChecklistItemCard key={item.id} item={item} baseUrl={baseUrl} />
            ))
          )}
          <button
            onClick={() => onSelect(session)}
            className="w-full text-center text-xs font-semibold text-amber-700 border border-amber-200 rounded-xl py-2.5 hover:bg-amber-50 active:scale-95 transition-transform mt-1"
          >
            Load this ITP
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ITPBuilderPage() {
  const { loading, summary } = useWorkspace({
    requireAuth: true,
    requireCompany: true,
  });
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;

  const [taskDescription, setTaskDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeSession, setActiveSession] = useState<ITPSession | null>(null);
  const [activeItems, setActiveItems] = useState<ITPItem[]>([]);
  const [sessions, setSessions] = useState<ITPSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showInput, setShowInput] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  // Load sessions on mount / company change
  useEffect(() => {
    if (!activeCompanyId) return;
    loadSessions(activeCompanyId);
  }, [activeCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll active session every 15s for real-time sign-off detection
  useEffect(() => {
    if (!activeSession?.id) return;
    const id = activeSession.id;
    const interval = setInterval(() => pollSession(id), 15_000);
    return () => clearInterval(interval);
  }, [activeSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus textarea when input card becomes visible
  useEffect(() => {
    if (showInput) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [showInput]);

  async function loadSessions(companyId: string) {
    setSessionsLoading(true);
    try {
      const { data: sessionRows, error: sessionError } = await supabase
        .from("itp_sessions")
        .select("id, company_id, task_description, created_at, slug")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);

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
        .select("*")
        .in("session_id", ids);

      if (itemError) throw itemError;

      const itemsBySession = new Map<string, ITPItem[]>();
      for (const item of (itemRows ?? []) as ITPItem[]) {
        const bucket = itemsBySession.get(item.session_id) ?? [];
        bucket.push(item);
        itemsBySession.set(item.session_id, bucket);
      }

      const enriched = sessionList.map((s) => ({
        ...s,
        items: itemsBySession.get(s.id) ?? [],
      }));

      setSessions(enriched);

      // DB is source of truth — clear any stale localStorage drafts
      for (const s of sessionList) {
        localStorage.removeItem(`itp_draft_${s.id}`);
      }
    } catch {
      // Sessions are non-critical; fail silently
    } finally {
      setSessionsLoading(false);
    }
  }

  async function pollSession(sessionId: string) {
    const { data, error } = await supabase
      .from("itp_items")
      .select("*")
      .eq("session_id", sessionId);

    if (error || !data) return;

    const items = data as ITPItem[];
    setActiveItems(items);
    localStorage.setItem(`itp_draft_${sessionId}`, JSON.stringify(items));
  }

  async function handleGenerate() {
    const task = taskDescription.trim();
    if (!task || !activeCompanyId) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/itp-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_description: task,
          company_id: activeCompanyId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ??
            `Request failed (${res.status})`
        );
      }

      const data = (await res.json()) as {
        session: ITPSession;
        items: ITPItem[];
      };

      // Persist draft to localStorage
      localStorage.setItem(
        `itp_draft_${data.session.id}`,
        JSON.stringify(data.items)
      );

      setActiveSession(data.session);
      setActiveItems(data.items);
      setShowInput(false);
      setTaskDescription("");

      if (activeCompanyId) loadSessions(activeCompanyId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate checklist."
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleNewITP() {
    setShowInput(true);
    setTimeout(
      () => inputCardRef.current?.scrollIntoView({ behavior: "smooth" }),
      10
    );
  }

  function handleLoadSession(session: ITPSession) {
    const draft = localStorage.getItem(`itp_draft_${session.id}`);
    if (draft) {
      try {
        setActiveItems(JSON.parse(draft) as ITPItem[]);
      } catch {
        setActiveItems(session.items ?? []);
      }
    } else {
      setActiveItems(session.items ?? []);
    }
    setActiveSession(session);
    setShowInput(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">SiteITP</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Inspection &amp; Test Plans
          </p>
        </div>
        <button
          onClick={handleNewITP}
          className="shrink-0 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold rounded-2xl px-4 py-2.5 text-sm active:scale-95 transition-transform"
        >
          + New ITP
        </button>
      </div>

      {/* ── Task Input Card ─────────────────────────────────────────────── */}
      {(showInput || !activeSession) && (
        <div
          ref={inputCardRef}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
        >
          <h2 className="text-base font-bold text-slate-800 mb-3">
            Describe the task
          </h2>
          <textarea
            ref={textareaRef}
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="Describe the task, e.g. Laying pavers"
            rows={4}
            disabled={generating}
            style={{ fontSize: "16px" }}
            className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-4 py-3 resize-none outline-none disabled:opacity-60 placeholder:text-slate-400 transition-colors"
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !taskDescription.trim()}
            className="mt-3 w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform"
          >
            {generating ? "Generating…" : "Generate Checklist"}
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
      {generating && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* ── Active Checklist ─────────────────────────────────────────────── */}
      {!generating && activeSession && activeItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate">
              {activeSession.task_description}
            </h2>
            <span className="text-xs text-slate-400 shrink-0">
              {signedCount}/{activeItems.length} signed
            </span>
          </div>
          {activeItems.map((item) => (
            <ChecklistItemCard key={item.id} item={item} baseUrl={baseUrl} />
          ))}
        </div>
      )}

      {/* ── Session List ──────────────────────────────────────────────────── */}
      {(sessions.length > 0 || sessionsLoading) && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Recent ITPs
          </h2>
          {sessionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-slate-100 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                baseUrl={baseUrl}
                onSelect={handleLoadSession}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
