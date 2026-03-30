"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import type { ItpItem, ItpSession } from "./page";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GpsStatus = "capturing" | "captured" | "unavailable";

interface ItemSignOffFormProps {
  item: ItpItem;
  defaultName: string;
  gpsCoords: { lat: number; lng: number } | null;
  onSigned: (updated: ItpItem, usedName: string) => void;
  onCancel: () => void;
}

interface Props {
  session: ItpSession;
  initialItems: ItpItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSignedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Inline sign-off form for a single item
// ---------------------------------------------------------------------------

function ItemSignOffForm({
  item,
  defaultName,
  gpsCoords,
  onSigned,
  onCancel,
}: ItemSignOffFormProps) {
  const [name, setName] = useState(defaultName);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sigPadRef = useRef<SignatureCanvas>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(340);
  const canvasWidthRef = useRef(340);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      if (w > 0 && w !== canvasWidthRef.current) {
        canvasWidthRef.current = w;
        setCanvasWidth(w);
        setHasDrawn(false);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  function clearSignature() {
    sigPadRef.current?.clear();
    setHasDrawn(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !hasDrawn) return;

    const sig = sigPadRef.current;
    if (!sig) return;
    const signatureData = sig.getCanvas().toDataURL("image/png");

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        slug: item.slug,
        name: name.trim(),
        signature: signatureData,
      };
      if (gpsCoords) {
        body.lat = gpsCoords.lat;
        body.lng = gpsCoords.lng;
      }

      const res = await fetch("/api/itp-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        // Race — treat as already signed
        onSigned(
          {
            ...item,
            status: "signed",
            signed_off_by_name: name.trim(),
            signed_off_at: new Date().toISOString(),
          },
          name.trim()
        );
        return;
      }

      if (!res.ok) throw new Error("network");

      const data = await res.json();
      onSigned(
        {
          ...item,
          status: "signed",
          signed_off_at: data.item?.signed_off_at ?? new Date().toISOString(),
          signed_off_by_name: name.trim(),
          sign_off_lat: gpsCoords?.lat ?? null,
          sign_off_lng: gpsCoords?.lng ?? null,
        },
        name.trim()
      );
    } catch {
      setError("Sign-off failed — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isHold = item.type === "hold";
  const canSubmit = name.trim().length > 0 && hasDrawn && !submitting;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 pt-4 border-t border-slate-100 space-y-4"
    >
      {isHold && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700 font-semibold">
          ⛔ Hold point — work cannot proceed until signed
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">
          Your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Full name"
          autoCapitalize="words"
          autoComplete="name"
          style={{ fontSize: "16px" }}
          className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-amber-400 transition-colors bg-white"
        />
      </div>

      {/* Signature canvas */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">
          Sign below
        </label>
        <div ref={canvasContainerRef} className="rounded-2xl border-2 border-slate-200 overflow-hidden">
          <SignatureCanvas
            ref={sigPadRef}
            canvasProps={{
              width: canvasWidth,
              height: 160,
              style: { width: "100%", height: "160px", display: "block" },
            }}
            backgroundColor="#f8fafc"
            onBegin={() => setHasDrawn(true)}
          />
        </div>
        <button
          type="button"
          onClick={clearSignature}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-200 disabled:text-slate-400 text-amber-950 font-black py-3 rounded-2xl transition-all active:scale-95 disabled:active:scale-100"
        >
          {submitting ? "Signing…" : "✓ Sign Off"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Inline hold form for a single item
// ---------------------------------------------------------------------------

function ItemClientHoldForm({
  item,
  defaultName,
  gpsCoords,
  onHoldPlaced,
  onCancel,
}: {
  item: ItpItem;
  defaultName: string;
  gpsCoords: { lat: number; lng: number } | null;
  onHoldPlaced: (updated: ItpItem, usedName: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !reason.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        slug: item.slug,
        name: name.trim(),
        status: "client_hold",
        client_hold_reason: reason.trim(),
      };
      if (gpsCoords) {
        body.lat = gpsCoords.lat;
        body.lng = gpsCoords.lng;
      }
      const res = await fetch("/api/itp-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        onHoldPlaced(
          {
            ...item,
            status: "client_hold",
            client_hold_at: new Date().toISOString(),
            client_hold_by_name: name.trim(),
            client_hold_reason: reason.trim(),
          },
          name.trim()
        );
        return;
      }

      if (!res.ok) throw new Error("network");

      const data = await res.json();
      onHoldPlaced(
        {
          ...item,
          status: "client_hold",
          client_hold_at: data.item?.client_hold_at ?? new Date().toISOString(),
          client_hold_by_name: name.trim(),
          client_hold_reason: reason.trim(),
        },
        name.trim()
      );
    } catch {
      setError("Hold failed — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim().length > 0 && reason.trim().length > 0 && !submitting;

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-slate-100 space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 text-sm text-orange-700 font-semibold mb-2">
        ⏸ Placing item on Client Hold
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">Your name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Full name"
          style={{ fontSize: "16px" }}
          className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-orange-400 transition-colors bg-white"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="Describe what is missing or incorrect…"
          rows={3}
          style={{ fontSize: "16px" }}
          className="w-full border-2 border-slate-200 focus:border-orange-400 rounded-xl px-4 py-3 outline-none text-sm resize-none bg-white transition-colors"
        />
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-3 rounded-2xl transition-all active:scale-95 disabled:active:scale-100"
        >
          {submitting ? "Placing…" : "Confirm Hold"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main session sign-off client
// ---------------------------------------------------------------------------

export default function SessionSignOffClient({ session, initialItems }: Props) {
  const [items, setItems] = useState<ItpItem[]>(initialItems);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeHoldItemId, setActiveHoldItemId] = useState<string | null>(null);
  const [lastUsedName, setLastUsedName] = useState("");
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("capturing");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Capture GPS once on mount — shared across all sign-offs on this page
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("captured");
      },
      () => setGpsStatus("unavailable"),
      { timeout: 10_000, enableHighAccuracy: false }
    );
  }, []);

  function handleSigned(updatedItem: ItpItem, usedName: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    );
    setLastUsedName(usedName);
    setActiveItemId(null);
    setActiveHoldItemId(null);
  }

  const signedCount = items.filter((i) => i.status === "signed").length;
  const totalCount = items.length;
  const allComplete = totalCount > 0 && signedCount === totalCount;
  const progressPct = totalCount > 0 ? (signedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            SiteITP
          </span>
          {allComplete && (
            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Complete ✓
            </span>
          )}
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          {session.task_description}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {signedCount} of {totalCount} item{totalCount !== 1 ? "s" : ""} signed
        </p>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* GPS status */}
        <p className="mt-2 text-xs text-slate-400">
          {gpsStatus === "capturing" && "📍 Acquiring GPS location…"}
          {gpsStatus === "captured" && "📍 Location ready"}
          {gpsStatus === "unavailable" && "📍 Location unavailable"}
        </p>
      </div>

      {/* ── Complete banner ──────────────────────────────────────────── */}
      {allComplete && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="h-6 w-6 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="font-bold text-emerald-800">All items signed off</p>
          <p className="text-sm text-emerald-600">
            This ITP is complete. You can close this page.
          </p>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {totalCount === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm">
          No inspection items found for this ITP.
        </div>
      )}

      {/* ── Items ────────────────────────────────────────────────────── */}
      {items.map((item) => {
        const isHold = item.type === "hold";
        const isSigned = item.status === "signed";
        const isWaived = item.status === "waived";
        const isClientHold = item.status === "client_hold";
        const isPending = item.status === "pending";
        const isActive = activeItemId === item.id;
        const isHolding = activeHoldItemId === item.id;

        const borderColor = isClientHold ? "border-l-orange-500" : isHold ? "border-l-red-500" : "border-l-amber-400";
        const typeBadgeColor = isHold
          ? "bg-red-100 text-red-700"
          : "bg-amber-100 text-amber-700";

        return (
          <div
            key={item.id}
            className={`${isClientHold ? "bg-orange-50" : "bg-white"} border ${isClientHold ? "border-orange-200" : "border-slate-200"} border-l-4 ${borderColor} rounded-2xl p-4 shadow-sm`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${typeBadgeColor}`}
                  >
                    {item.type}
                  </span>
                  {isSigned && (
                    <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Signed ✓
                    </span>
                  )}
                  {isWaived && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Waived
                    </span>
                  )}
                  {isClientHold && (
                    <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      ⏸ Client Hold
                    </span>
                  )}
                  {isPending && (
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
                {item.description && (
                  <p className="mt-1 text-sm text-slate-500">
                    {item.description}
                  </p>
                )}

                {/* Sign-off details */}
                {isSigned && (
                  <div className="mt-3 text-xs text-slate-400 space-y-0.5">
                    {item.signed_off_by_name && (
                      <p>
                        Signed by{" "}
                        <span className="font-medium text-slate-600">
                          {item.signed_off_by_name}
                        </span>
                      </p>
                    )}
                    {item.signed_off_at && (
                      <p>{formatSignedAt(item.signed_off_at)}</p>
                    )}
                    {item.sign_off_lat != null &&
                      item.sign_off_lng != null && (
                        <p className="font-mono">
                          <a
                            href={`https://maps.google.com/?q=${item.sign_off_lat},${item.sign_off_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-violet-600 transition-colors"
                          >
                            {item.sign_off_lat.toFixed(5)},{" "}
                            {item.sign_off_lng.toFixed(5)}
                          </a>
                        </p>
                      )}
                  </div>
                )}
                {isClientHold && (
                  <div className="mt-3 bg-orange-100 border border-orange-200 rounded-xl px-3 py-2.5 text-xs">
                    <p className="font-bold text-orange-700 uppercase tracking-wide">⏸ Client Hold</p>
                    {item.client_hold_reason && (
                      <p className="text-orange-900 mt-1">{item.client_hold_reason}</p>
                    )}
                    {item.client_hold_by_name && (
                      <p className="text-orange-700 mt-1">Raised by <span className="font-semibold">{item.client_hold_by_name}</span></p>
                    )}
                    {item.client_hold_at && (
                      <p className="text-orange-600 mt-0.5">{formatSignedAt(item.client_hold_at)}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {(isPending || isClientHold) && !isActive && !isHolding && (
                <div className="shrink-0 flex flex-col gap-2">
                  <button
                    onClick={() => { setActiveItemId(item.id); setActiveHoldItemId(null); }}
                    className={`text-sm font-bold px-3 py-1.5 rounded-xl transition-colors active:scale-95 ${
                      isHold
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-amber-400 hover:bg-amber-500 text-amber-900"
                    }`}
                  >
                    Sign Off
                  </button>
                  {isPending && (
                    <button
                      onClick={() => { setActiveHoldItemId(item.id); setActiveItemId(null); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl transition-colors active:scale-95 bg-orange-100 hover:bg-orange-200 text-orange-700"
                    >
                      Place on Hold
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Inline sign-off form */}
            {isActive && (
              <ItemSignOffForm
                item={item}
                defaultName={lastUsedName}
                gpsCoords={gpsCoords}
                onSigned={handleSigned}
                onCancel={() => setActiveItemId(null)}
              />
            )}

            {/* Inline client-hold form */}
            {isHolding && (
              <ItemClientHoldForm
                item={item}
                defaultName={lastUsedName}
                gpsCoords={gpsCoords}
                onHoldPlaced={handleSigned}
                onCancel={() => setActiveHoldItemId(null)}
              />
            )}
          </div>
        );
      })}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <p className="text-center text-xs text-slate-400 py-4">
        Powered by SiteITP · Buildstate
      </p>
    </div>
  );
}
