"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ITPItem, ITPSession, ItemType } from "./types";

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
  const [expanded, setExpanded] = useState(item.status !== "signed" && item.status !== "waived");
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState<ItemType>(item.type);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description ?? "");
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
  const isHold = item.type === "hold";

  const borderColor = isHold ? "border-l-red-500" : "border-l-amber-400";
  const typeBadge = isHold ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";

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
      .update({ type: editType, title: trimmedTitle, description: editDescription.trim() })
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

  async function handleWaive() {
    const trimmed = waiveReason.trim();
    if (!trimmed) return;
    setWaiving(true);
    const { data: updated, error } = await supabase
      .from("itp_items")
      .update({ status: "waived", waive_reason: trimmed, signed_off_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "pending")
      .select(
        "id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng, waive_reason"
      )
      .single();
    if (error || !updated) {
      toast.error("Failed to waive item.");
      setWaiving(false);
      return;
    }
    onEdit?.(updated as ITPItem);
    setWaiveOpen(false);
    setWaiveReason("");
    setWaiving(false);
  }

  // Collapsed one-liner for signed/waived cards
  if ((isSigned || isWaived) && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full text-left bg-white border border-slate-200 border-l-4 ${borderColor} rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 active:scale-95 transition-transform`}
      >
        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${typeBadge}`}>
          {item.type}
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{item.title}</span>
        {isWaived ? (
          <span className="text-xs font-semibold text-slate-500 shrink-0">Waived</span>
        ) : (
          <span className="text-xs font-semibold text-green-600 shrink-0">Signed ✓</span>
        )}
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
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${typeBadge}`}>
              {item.type}
            </span>
            {isSigned ? (
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Signed ✓
              </span>
            ) : isWaived ? (
              <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                Waived
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
          {(isSigned || isWaived) && (
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Collapse
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
        .insert({ session_id: sessionId, type, title: trimmedTitle, description: description.trim(), sort_order: nextOrder })
        .select("id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng")
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
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
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
  onToggleAddItem: (show: boolean) => void;
}

export default function ItemsList({
  session,
  items,
  showAddItem,
  onDragEnd,
  onItemDeleted,
  onItemEdited,
  onItemAdded,
  onToggleAddItem,
}: ItemsListProps) {
  return (
    <div className="space-y-3">
      {items.length === 0 && !showAddItem && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-400">No items yet.</p>
          <button
            onClick={() => onToggleAddItem(true)}
            className="mt-3 text-sm font-semibold text-amber-600 hover:text-amber-700"
          >
            + Add first item
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="itp-items">
          {(droppableProvided) => (
            <div
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              className="space-y-3"
            >
              {[...items]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item, index) => (
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
                ))}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {showAddItem ? (
        <AddItemForm
          sessionId={session.id}
          nextOrder={items.length + 1}
          onAdd={onItemAdded}
        />
      ) : (
        <button
          onClick={() => onToggleAddItem(true)}
          className="w-full text-center text-xs font-semibold text-slate-500 border border-dashed border-slate-300 rounded-2xl py-3 hover:border-slate-400 hover:text-slate-700 transition-colors"
        >
          + Add item
        </button>
      )}
    </div>
  );
}
