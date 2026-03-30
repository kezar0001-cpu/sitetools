"use client";

import { useEffect, useState } from "react";
import { ListX } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ITPItem, ITPSession, ItemType, Responsibility } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ITP_ITEM_SELECT =
  "id, session_id, slug, type, phase, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng, waive_reason, reference_standard, responsibility, records_required, acceptance_criteria, client_hold_reason, client_hold_by_name, client_hold_at";

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

function typeLabel(type: ItemType): string {
  if (type === "hold") return "HOLD";
  return "WITNESS";
}

function typeBadgeClasses(type: ItemType): string {
  if (type === "hold") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function typeBorderColor(type: ItemType): string {
  if (type === "hold") return "border-l-red-500";
  return "border-l-amber-400";
}

function typeCardBg(type: ItemType): string {
  if (type === "hold") return "bg-red-50";
  return "bg-amber-50";
}

function typeTooltipText(type: ItemType): string {
  if (type === "hold") return "Hold Point: Work must stop until signed off by the Superintendent or Third Party.";
  return "Witness Point: The Superintendent or Third Party must be notified; work may continue if they don't attend.";
}

function responsibilityLabel(r?: Responsibility | null): string {
  if (r === "superintendent") return "Superintendent";
  if (r === "third_party") return "Third Party";
  return "Contractor";
}

function responsibilityBadgeClasses(r?: Responsibility | null): string {
  if (r === "superintendent") return "bg-violet-100 text-violet-700";
  if (r === "third_party") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

// ---------------------------------------------------------------------------
// Skeleton Row
// ---------------------------------------------------------------------------

export function SkeletonRow() {
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
// ChecklistItemCard
// ---------------------------------------------------------------------------

interface ChecklistItemCardProps {
  item: ITPItem;
  onDelete?: (id: string) => void;
  onEdit?: (updated: ITPItem) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps?: any;
}

function ChecklistItemCard({ item, onDelete, onEdit, dragHandleProps }: ChecklistItemCardProps) {
  const [expanded, setExpanded] = useState(
    item.status !== "signed" && item.status !== "waived"
  );
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState<ItemType>(item.type);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description ?? "");
  const [editReferenceStandard, setEditReferenceStandard] = useState(item.reference_standard ?? "");
  const [editResponsibility, setEditResponsibility] = useState<Responsibility>(item.responsibility ?? "contractor");
  const [editRecordsRequired, setEditRecordsRequired] = useState(item.records_required ?? "");
  const [editAcceptanceCriteria, setEditAcceptanceCriteria] = useState(item.acceptance_criteria ?? "");
  const [saving, setSaving] = useState(false);
  const [waiveOpen, setWaiveOpen] = useState(false);
  const [waiveReason, setWaiveReason] = useState("");
  const [waiving, setWaiving] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const signUrl = `${baseUrl}/itp-sign/${item.slug}`;

  const isSigned = item.status === "signed";
  const isWaived = item.status === "waived";
  const isPending = item.status === "pending";
  const isClientHold = item.status === "client_hold";
  const isResolved = isSigned || isWaived;

  const borderColor = typeBorderColor(item.type);
  const typeBadge = typeBadgeClasses(item.type);
  const cardBg = typeCardBg(item.type);
  const typeTooltip = typeTooltipText(item.type);

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
        reference_standard: editReferenceStandard.trim() || null,
        responsibility: editResponsibility,
        records_required: editRecordsRequired.trim() || null,
        acceptance_criteria: editAcceptanceCriteria.trim() || null,
      })
      .eq("id", item.id)
      .select(ITP_ITEM_SELECT)
      .single();
    if (error || !updated) {
      toast.error("Failed to save changes.");
      setSaving(false);
      return;
    }
    onEdit?.(updated as unknown as ITPItem);
    setIsEditing(false);
    setSaving(false);
  }

  // ── Lift client hold (admin action — resets item back to pending) ──────────
  async function handleLiftHold() {
    setSaving(true);
    const { data: updated, error } = await supabase
      .from("itp_items")
      .update({
        status: "pending",
        client_hold_reason: null,
        client_hold_by_name: null,
        client_hold_at: null,
      })
      .eq("id", item.id)
      .eq("status", "client_hold")
      .select(ITP_ITEM_SELECT)
      .single();
    if (error || !updated) {
      toast.error("Failed to lift hold.");
      setSaving(false);
      return;
    }
    onEdit?.(updated as unknown as ITPItem);
    setSaving(false);
  }

  function handleCancelEdit() {
    setEditType(item.type);
    setEditTitle(item.title);
    setEditDescription(item.description ?? "");
    setEditReferenceStandard(item.reference_standard ?? "");
    setEditResponsibility(item.responsibility ?? "contractor");
    setEditRecordsRequired(item.records_required ?? "");
    setEditAcceptanceCriteria(item.acceptance_criteria ?? "");
    setIsEditing(false);
  }

  async function handleWaive() {
    const trimmed = waiveReason.trim();
    if (!trimmed) return;
    setWaiving(true);
    const { data: updated, error } = await supabase
      .from("itp_items")
      .update({ status: "waived", waive_reason: trimmed, signed_off_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "pending")
      .select(ITP_ITEM_SELECT)
      .single();
    if (error || !updated) {
      toast.error("Failed to waive item.");
      setWaiving(false);
      return;
    }
    onEdit?.(updated as unknown as unknown as ITPItem);
    setWaiveOpen(false);
    setWaiveReason("");
    setWaiving(false);
  }

  // Collapsed one-liner for signed/waived/client_hold cards
  if ((isResolved || isClientHold) && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full text-left ${isClientHold ? "bg-orange-50" : cardBg} border border-l-4 ${isClientHold ? "border-orange-200 border-l-orange-500" : `border-slate-200 ${borderColor}`} rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 active:scale-95 transition-transform`}
      >
        <span className="relative group inline-flex shrink-0 cursor-help">
          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${isClientHold ? "bg-orange-100 text-orange-700" : typeBadge}`}>
            {typeLabel(item.type)}
          </span>
          <span className="pointer-events-none absolute left-0 top-full mt-1.5 z-20 hidden group-hover:block w-56 rounded-lg bg-slate-800 text-white text-xs leading-relaxed px-3 py-2 shadow-xl whitespace-normal">
            {typeTooltip}
          </span>
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{item.title}</span>
        {isClientHold ? (
          <span className="text-xs font-bold text-orange-700 shrink-0">⏸ Client Hold</span>
        ) : isWaived ? (
          <span className="text-xs font-semibold text-slate-500 shrink-0">Waived</span>
        ) : (
          <span className="text-xs font-semibold text-green-600 shrink-0">Signed ✓</span>
        )}
      </button>
    );
  }

  // Inline edit form
  if (isEditing) {
    const editBorder = typeBorderColor(editType);
    return (
      <div className={`bg-white border border-slate-200 border-l-4 ${editBorder} rounded-2xl p-4 shadow-sm`}>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
          Edit Inspection Point
        </p>
        {/* Type selector */}
        <div className="flex gap-2 mb-3">
          {(["witness", "hold"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEditType(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                editType === t
                  ? t === "hold"
                    ? "bg-red-100 border-red-300 text-red-700"
                    : "bg-amber-100 border-amber-300 text-amber-700"
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
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
          placeholder="Description"
          rows={2}
          style={{ fontSize: "16px" }}
          className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm resize-none mb-2 bg-white transition-colors"
        />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            value={editReferenceStandard}
            onChange={(e) => setEditReferenceStandard(e.target.value)}
            placeholder="Reference standard (e.g. AS 3600 Cl. 17.1.3)"
            style={{ fontSize: "16px" }}
            className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm bg-white transition-colors"
          />
          <select
            value={editResponsibility}
            onChange={(e) => setEditResponsibility(e.target.value as Responsibility)}
            className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm bg-white transition-colors"
          >
            <option value="contractor">Contractor</option>
            <option value="superintendent">Superintendent</option>
            <option value="third_party">Third Party</option>
          </select>
        </div>
        <input
          value={editAcceptanceCriteria}
          onChange={(e) => setEditAcceptanceCriteria(e.target.value)}
          placeholder="Acceptance criteria (e.g. ≥98% MDD per AS 1289.5.4.1)"
          style={{ fontSize: "16px" }}
          className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm mb-3 bg-white transition-colors"
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
    <div className={`${isClientHold ? "bg-orange-50" : cardBg} border border-l-4 ${isClientHold ? "border-orange-200 border-l-orange-500" : `border-slate-200 ${borderColor}`} rounded-2xl p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        {/* Drag handle — only for pending items */}
        {isPending && dragHandleProps && (
          <div
            {...dragHandleProps}
            className="mt-1 shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors select-none"
            title="Drag to reorder"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
              <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="relative group inline-flex cursor-help">
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${typeBadge}`}>
                {typeLabel(item.type)}
              </span>
              <span className="pointer-events-none absolute left-0 top-full mt-1.5 z-20 hidden group-hover:block w-56 rounded-lg bg-slate-800 text-white text-xs leading-relaxed px-3 py-2 shadow-xl whitespace-normal">
                {typeTooltip}
              </span>
            </span>
            {item.responsibility && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${responsibilityBadgeClasses(item.responsibility)}`}>
                {responsibilityLabel(item.responsibility)}
              </span>
            )}
            {isSigned ? (
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Signed ✓
              </span>
            ) : isWaived ? (
              <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                Waived
              </span>
            ) : isClientHold ? (
              <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                ⏸ Client Hold
              </span>
            ) : (
              <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                Pending
              </span>
            )}
          </div>

          <p className="mt-2 text-base font-semibold text-slate-900">{item.title}</p>

          {item.description && (
            <p className="mt-1 text-sm text-slate-500">{item.description}</p>
          )}

          {/* Structured ITP fields */}
          {(item.reference_standard || item.acceptance_criteria) && (
            <div className="mt-2 space-y-1">
              {item.reference_standard && (
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-600">Ref:</span>{" "}
                  <span className="font-mono">{item.reference_standard}</span>
                </p>
              )}
              {item.acceptance_criteria && (
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-600">Criteria:</span>{" "}
                  {item.acceptance_criteria}
                </p>
              )}
            </div>
          )}

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
                  <a
                    href={`https://maps.google.com/?q=${item.sign_off_lat},${item.sign_off_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-violet-600 transition-colors"
                  >
                    {item.sign_off_lat.toFixed(5)}, {item.sign_off_lng.toFixed(5)}
                  </a>
                </p>
              )}
            </div>
          )}

          {isClientHold && (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 space-y-1">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">⏸ Client Hold Raised</p>
              {item.client_hold_reason && (
                <p className="text-xs text-orange-800">{item.client_hold_reason}</p>
              )}
              {item.client_hold_by_name && (
                <p className="text-xs text-orange-600">Raised by <span className="font-semibold">{item.client_hold_by_name}</span></p>
              )}
              {item.client_hold_at && (
                <p className="text-xs text-orange-500">{formatSignedAt(item.client_hold_at)}</p>
              )}
            </div>
          )}

          {isWaived && item.waive_reason && (
            <div className="mt-3 text-xs text-slate-500 space-y-0.5">
              <p>
                Reason:{" "}
                <span className="font-medium text-slate-700">{item.waive_reason}</span>
              </p>
              {item.signed_off_at && <p>{formatSignedAt(item.signed_off_at)}</p>}
            </div>
          )}
        </div>

        {/* Right-side actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {(isResolved || isClientHold) && (
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Collapse
            </button>
          )}
          {isClientHold && onEdit && (
            <button
              onClick={handleLiftHold}
              disabled={saving}
              className="text-xs font-bold text-orange-700 border border-orange-300 bg-orange-50 rounded-xl px-3 py-1.5 hover:bg-orange-100 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? "Lifting…" : "Lift Hold"}
            </button>
          )}

          {isPending && (
            <button
              onClick={() => setShowQr((v) => !v)}
              className={`text-xs font-semibold border rounded-xl px-3 py-1.5 active:scale-95 transition-transform ${
                showQr
                  ? "bg-slate-700 border-slate-700 text-white"
                  : "text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              QR
            </button>
          )}
          {isPending && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-50 active:scale-95 transition-transform"
            >
              Edit
            </button>
          )}
          {isPending && (
            <button
              onClick={() => { setWaiveOpen((o) => !o); setWaiveReason(""); }}
              className="text-xs font-semibold text-slate-500 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-50 active:scale-95 transition-transform"
            >
              Waive
            </button>
          )}
          {isPending && onDelete && (
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

      {/* QR code panel */}
      {showQr && isPending && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col items-center gap-3">
          <QRCodeSVG value={signUrl} size={160} />
          <code className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 break-all text-center select-all">
            {signUrl}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(signUrl).then(() => toast.success("Link copied!"));
            }}
            className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl px-4 py-1.5 hover:bg-slate-50 active:scale-95 transition-transform"
          >
            Copy link
          </button>
        </div>
      )}

      {/* Inline waiver form */}
      {waiveOpen && isPending && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          <p className="text-xs font-semibold text-slate-600">Waive reason (required)</p>
          <textarea
            value={waiveReason}
            onChange={(e) => setWaiveReason(e.target.value)}
            placeholder="Describe why this point is being waived…"
            rows={2}
            style={{ fontSize: "16px" }}
            className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2 outline-none text-sm resize-none bg-white transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={handleWaive}
              disabled={waiving || !waiveReason.trim()}
              className="flex-1 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-2xl py-2 text-sm active:scale-95 transition-transform"
            >
              {waiving ? "Waiving…" : "Confirm Waiver"}
            </button>
            <button
              onClick={() => { setWaiveOpen(false); setWaiveReason(""); }}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddItemForm
// ---------------------------------------------------------------------------

interface AddItemFormProps {
  sessionId: string;
  companyId: string;
  nextOrder: number;
  defaultPhase?: string;
  onAdd: (item: ITPItem) => void;
  onAddMultiple?: (items: ITPItem[]) => void;
}

function AddItemForm({ sessionId, companyId, nextOrder, defaultPhase, onAdd, onAddMultiple }: AddItemFormProps) {
  const [mode, setMode] = useState<"manual" | "ai_phase" | "expand">("manual");
  const [type, setType] = useState<ItemType>("witness");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [referenceStandard, setReferenceStandard] = useState("");
  const [responsibility, setResponsibility] = useState<Responsibility>("contractor");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [recordsRequired, setRecordsRequired] = useState("");
  const [aiPhaseName, setAiPhaseName] = useState("");
  const [aiPhaseTask, setAiPhaseTask] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratingStatus, setAiGeneratingStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
          phase: defaultPhase?.trim() || null,
          title: trimmedTitle,
          description: description.trim(),
          reference_standard: referenceStandard.trim() || null,
          responsibility,
          records_required: recordsRequired.trim() || null,
          acceptance_criteria: acceptanceCriteria.trim() || null,
          sort_order: nextOrder,
        })
        .select(ITP_ITEM_SELECT)
        .single();
      if (error || !item) throw error ?? new Error("Insert failed");
      onAdd(item as unknown as ITPItem);
      setTitle("");
      setDescription("");
      setReferenceStandard("");
      setResponsibility("contractor");
      setAcceptanceCriteria("");
      setRecordsRequired("");
    } catch {
      toast.error("Failed to add item.");
    } finally {
      setAdding(false);
    }
  }

  async function handleGeneratePhase() {
    const phaseName = aiPhaseName.trim();
    const taskDesc = aiPhaseTask.trim();
    if (!phaseName || !taskDesc) return;
    setAiGenerating(true);
    setAiGeneratingStatus("Analysing task…");
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch("/api/itp-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          task_description: taskDesc,
          company_id: companyId,
          session_id: sessionId,
          phase_name: phaseName,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = "";
        let currentEvent = "";
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (currentEvent === "status") {
                setAiGeneratingStatus(data.message);
              } else if (currentEvent === "done") {
                const result = data as { session: unknown; items: ITPItem[] };
                if (onAddMultiple) {
                  onAddMultiple(result.items);
                } else {
                  for (const item of result.items) onAdd(item);
                }
                setAiPhaseName("");
                setAiPhaseTask("");
                toast.success(`Added ${result.items.length} items for phase "${phaseName}"`);
                return;
              } else if (currentEvent === "error") {
                throw new Error(data.error ?? "Generation failed");
              }
            } catch (e) {
              if (currentEvent === "error" || currentEvent === "done") throw e;
            }
            currentEvent = "";
          } else if (line !== "") {
            buffer = lines.slice(i).join("\n");
            break;
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate phase.");
    } finally {
      setAiGenerating(false);
      setAiGeneratingStatus("");
    }
  }

  async function handleExpand() {
    const desc = description.trim();
    if (!desc) return;
    setExpanding(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch("/api/itp-expand", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token ?? ""}`,
        },
        body: JSON.stringify({ description: desc }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Expansion failed");
      }
      const data = await res.json() as { items: Array<{
        type: "witness" | "hold";
        title: string;
        description: string;
        reference_standard: string;
        responsibility: string;
        records_required: string;
        acceptance_criteria: string;
      }> };

      // Insert all expanded items into the DB
      const rows = data.items.map((item, idx) => ({
        session_id: sessionId,
        type: item.type,
        phase: defaultPhase?.trim() || null,
        title: item.title,
        description: item.description,
        reference_standard: item.reference_standard || null,
        responsibility: item.responsibility || "contractor",
        records_required: item.records_required || null,
        acceptance_criteria: item.acceptance_criteria || null,
        sort_order: nextOrder + idx,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from("itp_items")
        .insert(rows)
        .select(ITP_ITEM_SELECT);

      if (insertErr || !inserted) throw insertErr ?? new Error("Insert failed");

      if (onAddMultiple) {
        onAddMultiple(inserted as unknown as ITPItem[]);
      } else {
        for (const item of inserted) {
          onAdd(item as unknown as ITPItem);
        }
      }
      setDescription("");
      toast.success(`Expanded into ${inserted.length} inspection items`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to expand activity.");
    } finally {
      setExpanding(false);
    }
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      {/* Mode toggle */}
      <div className="flex gap-1.5 mb-3">
        {([
          { key: "manual", label: "Manual" },
          { key: "ai_phase", label: "✦ AI Phase" },
          { key: "expand", label: "✦ AI Expand" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              mode === key
                ? key === "ai_phase"
                  ? "bg-violet-100 border-violet-300 text-violet-700"
                  : key === "expand"
                    ? "bg-violet-100 border-violet-300 text-violet-700"
                    : "bg-slate-800 border-slate-700 text-white"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Manual mode ── */}
      {mode === "manual" && (
        <>
          {defaultPhase && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs text-slate-500">Adding to phase:</span>
              <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-0.5">{defaultPhase}</span>
            </div>
          )}
          <div className="flex gap-2 mb-3">
            {(["witness", "hold"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  type === t
                    ? t === "hold"
                      ? "bg-red-100 border-red-300 text-red-700"
                      : "bg-amber-100 border-amber-300 text-amber-700"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pre-pour reinforcement inspection"
            style={{ fontSize: "16px" }}
            className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm mb-2 bg-white transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description of what is being inspected"
            rows={2}
            style={{ fontSize: "16px" }}
            className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm resize-none mb-2 bg-white transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 mb-2 transition-colors"
          >
            {showAdvanced ? "− Hide details" : "+ Standard & criteria"}
          </button>
          {showAdvanced && (
            <div className="space-y-2 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={referenceStandard}
                  onChange={(e) => setReferenceStandard(e.target.value)}
                  placeholder="Ref standard (e.g. AS 3600 Cl. 17.1.3)"
                  style={{ fontSize: "16px" }}
                  className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm bg-white transition-colors"
                />
                <select
                  value={responsibility}
                  onChange={(e) => setResponsibility(e.target.value as Responsibility)}
                  className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm bg-white transition-colors"
                >
                  <option value="contractor">Contractor</option>
                  <option value="superintendent">Superintendent</option>
                  <option value="third_party">Third Party</option>
                </select>
              </div>
              <input
                value={acceptanceCriteria}
                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                placeholder="Acceptance criteria (e.g. ≥98% MDD)"
                style={{ fontSize: "16px" }}
                className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 outline-none text-sm bg-white transition-colors"
              />
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={adding || !title.trim()}
            className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 font-bold rounded-2xl py-3 text-sm active:scale-95 transition-transform"
          >
            {adding ? "Adding…" : "+ Add Item"}
          </button>
        </>
      )}

      {/* ── AI Expand mode ── */}
      {mode === "expand" && (
        <>
          <p className="text-xs text-slate-500 mb-2">
            Describe an activity and AI will generate one detailed inspection item. Use ✦ AI Phase to generate multiple items at once.
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Check the concrete pour, Verify drainage pipe installation"
            rows={2}
            style={{ fontSize: "16px" }}
            className="w-full border-2 border-slate-200 focus:border-violet-400 rounded-xl px-3 py-2.5 outline-none text-sm resize-none mb-2 bg-white transition-colors"
          />
          <button
            onClick={handleExpand}
            disabled={expanding || !description.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-2xl py-3 text-sm active:scale-95 transition-transform"
          >
            {expanding ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Expanding…
              </span>
            ) : "✦ Generate Item"}
          </button>
        </>
      )}

      {/* ── AI Phase mode ── */}
      {mode === "ai_phase" && (
        <>
          {aiGenerating ? (
            <div className="space-y-2">
              <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin shrink-0" />
                <span className="text-xs font-semibold text-violet-700">{aiGeneratingStatus || "Generating…"}</span>
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-2">
                AI will generate a full set of inspection items for a new phase in this ITP.
              </p>
              <input
                value={aiPhaseName}
                onChange={(e) => setAiPhaseName(e.target.value)}
                placeholder="Phase name (e.g. Concrete Pour, Site Establishment)"
                style={{ fontSize: "16px" }}
                className="w-full border-2 border-slate-200 focus:border-violet-400 rounded-xl px-3 py-2.5 outline-none text-sm mb-2 bg-white transition-colors"
              />
              <textarea
                value={aiPhaseTask}
                onChange={(e) => setAiPhaseTask(e.target.value)}
                placeholder="Describe the work to be inspected (e.g. Install 600mm diameter RCPC stormwater drainage)"
                rows={2}
                style={{ fontSize: "16px" }}
                className="w-full border-2 border-slate-200 focus:border-violet-400 rounded-xl px-3 py-2.5 outline-none text-sm resize-none mb-2 bg-white transition-colors"
              />
              <button
                onClick={handleGeneratePhase}
                disabled={!aiPhaseName.trim() || !aiPhaseTask.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-2xl py-3 text-sm active:scale-95 transition-transform"
              >
                ✦ Generate Phase Items
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ItemsList
// ---------------------------------------------------------------------------

export interface ItemsListProps {
  session: ITPSession;
  items: ITPItem[];
  showAddItem: boolean;
  onDragEnd: (result: DropResult) => void;
  onItemDeleted: (id: string) => void;
  onItemEdited: (item: ITPItem) => void;
  onItemAdded: (item: ITPItem) => void;
  onItemsAdded?: (items: ITPItem[]) => void;
  onToggleAddItem: (show: boolean) => void;
  /** Called when the user clicks "Regenerate" on the no-items empty state. */
  onRegenerate?: () => void;
}

// ---------------------------------------------------------------------------
// Phase grouping helper
// ---------------------------------------------------------------------------

interface PhaseGroup {
  phase: string;
  items: ITPItem[];
}

function groupByPhase(items: ITPItem[]): PhaseGroup[] {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const groups: PhaseGroup[] = [];
  const seen = new Map<string, PhaseGroup>();

  for (const item of sorted) {
    const phase = item.phase?.trim() || "General";
    let group = seen.get(phase);
    if (!group) {
      group = { phase, items: [] };
      seen.set(phase, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

const PHASE_COLORS = [
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-400" },
  { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", dot: "bg-sky-400" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-400" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-400" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-400" },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-400" },
];

export default function ItemsList({
  session,
  items,
  showAddItem,
  onDragEnd,
  onItemDeleted,
  onItemEdited,
  onItemAdded,
  onItemsAdded,
  onToggleAddItem,
  onRegenerate,
}: ItemsListProps) {
  const hasPhases = items.some((i) => i.phase && i.phase.trim());
  const phaseGroups = hasPhases ? groupByPhase(items) : null;

  // Track which phase the "add item" form is scoped to
  const [addItemPhase, setAddItemPhase] = useState<string | undefined>(undefined);

  // Reset phase scope when add-item panel is closed
  useEffect(() => {
    if (!showAddItem) setAddItemPhase(undefined);
  }, [showAddItem]);

  return (
    <div className="space-y-3">
      {items.length === 0 && !showAddItem && (
        <div className="flex flex-col items-center text-center bg-white border border-dashed border-slate-200 rounded-2xl p-10">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
            <ListX className="h-5 w-5 text-slate-400" />
          </div>
          <p className="font-bold text-slate-700 text-sm">This session has no items</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Add an inspection point manually or regenerate from a task description.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap justify-center">
            <button
              onClick={() => onToggleAddItem(true)}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold rounded-xl text-xs active:scale-95 transition-transform"
            >
              + Add manually
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold rounded-xl text-xs active:scale-95 transition-transform"
              >
                ✦ Regenerate
              </button>
            )}
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="itp-items">
          {(droppableProvided) => {
            const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);

            // Flat index counter for Draggable (must be contiguous across phases)
            let flatIndex = 0;

            return (
            <div
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              className="space-y-3"
            >
              {phaseGroups ? (
                // Phase-grouped rendering
                phaseGroups.map((group, gi) => {
                  const color = PHASE_COLORS[gi % PHASE_COLORS.length];
                  return (
                    <div key={group.phase} className="space-y-2">
                      {/* Phase header */}
                      <div className={`flex items-center gap-2.5 ${color.bg} ${color.border} border rounded-xl px-4 py-2.5 mt-${gi === 0 ? "0" : "2"}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${color.dot} shrink-0`} />
                        <span className={`text-sm font-bold ${color.text} uppercase tracking-wide`}>
                          {group.phase}
                        </span>
                        <span className="text-xs text-slate-400 ml-auto">
                          {group.items.length} {group.items.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                      {/* Items under this phase */}
                      {group.items.map((item) => {
                        const idx = flatIndex++;
                        return (
                          <Draggable
                            key={item.id}
                            draggableId={item.id}
                            index={idx}
                            isDragDisabled={item.status !== "pending"}
                          >
                            {(draggableProvided) => (
                              <div
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                              >
                                <ChecklistItemCard
                                  item={item}
                                  dragHandleProps={draggableProvided.dragHandleProps}
                                  onDelete={onItemDeleted}
                                  onEdit={onItemEdited}
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {/* Per-phase add item — shown when this phase is active */}
                      {showAddItem && addItemPhase === group.phase ? (
                        <AddItemForm
                          sessionId={session.id}
                          companyId={session.company_id}
                          nextOrder={items.length + 1}
                          defaultPhase={group.phase}
                          onAdd={(item) => { onItemAdded(item); }}
                          onAddMultiple={onItemsAdded}
                        />
                      ) : (
                        <button
                          onClick={() => { setAddItemPhase(group.phase); onToggleAddItem(true); }}
                          className="w-full text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-xl py-2 hover:border-violet-300 hover:text-violet-600 transition-colors"
                        >
                          + Add item to {group.phase}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                // Flat rendering (legacy items without phases)
                sortedItems.map((item, index) => (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
                    index={index}
                    isDragDisabled={item.status !== "pending"}
                  >
                    {(draggableProvided) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                      >
                        <ChecklistItemCard
                          item={item}
                          dragHandleProps={draggableProvided.dragHandleProps}
                          onDelete={onItemDeleted}
                          onEdit={onItemEdited}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {droppableProvided.placeholder}
            </div>
          );}}
        </Droppable>
      </DragDropContext>

      {/* Global add item — only show when not tied to a specific phase, and no phases exist */}
      {showAddItem && !addItemPhase && !hasPhases ? (
        <AddItemForm
          sessionId={session.id}
          companyId={session.company_id}
          nextOrder={items.length + 1}
          onAdd={onItemAdded}
          onAddMultiple={onItemsAdded}
        />
      ) : !hasPhases && !showAddItem ? (
        <button
          onClick={() => { setAddItemPhase(undefined); onToggleAddItem(true); }}
          className="w-full text-center text-xs font-semibold text-slate-500 border border-dashed border-slate-300 rounded-2xl py-3 hover:border-slate-400 hover:text-slate-700 transition-colors"
        >
          + Add item
        </button>
      ) : !hasPhases && showAddItem ? (
        <AddItemForm
          sessionId={session.id}
          companyId={session.company_id}
          nextOrder={items.length + 1}
          onAdd={onItemAdded}
          onAddMultiple={onItemsAdded}
        />
      ) : null}
    </div>
  );
}
