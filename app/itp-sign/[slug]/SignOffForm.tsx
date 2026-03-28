"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

type GpsStatus = "capturing" | "captured" | "unavailable";

interface Props {
  slug: string;
  title: string;
  description: string | null;
  type: "hold" | "witness";
  taskDescription: string | null;
}

interface SignOffResult {
  name: string;
  signedAt: string;
  lat?: number;
  lng?: number;
}

export default function SignOffForm({
  slug,
  title,
  description,
  type,
  taskDescription,
}: Props) {
  const [name, setName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("capturing");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SignOffResult | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [waiveOpen, setWaiveOpen] = useState(false);
  const [waiveReason, setWaiveReason] = useState("");
  const [waiving, setWaiving] = useState(false);
  const [waiveError, setWaiveError] = useState<string | null>(null);
  const [waived, setWaived] = useState(false);

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
        slug,
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
        setAlreadySigned(true);
        return;
      }

      if (!res.ok) {
        throw new Error("network");
      }

      const data = await res.json();
      setSuccess({
        name: name.trim(),
        signedAt: data.item?.signed_off_at ?? new Date().toISOString(),
        lat: gpsCoords?.lat,
        lng: gpsCoords?.lng,
      });
    } catch {
      setError("Sign-off failed — please check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWaive() {
    const trimmed = waiveReason.trim();
    if (!trimmed) return;
    setWaiving(true);
    setWaiveError(null);
    try {
      const res = await fetch("/api/itp-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, status: "waived", waive_reason: trimmed }),
      });
      if (res.status === 409) {
        setAlreadySigned(true);
        return;
      }
      if (!res.ok) throw new Error("network");
      setWaived(true);
    } catch {
      setWaiveError("Waiver failed — please check your connection and try again.");
    } finally {
      setWaiving(false);
    }
  }

  // ── Already signed (409 race) ──────────────────────────────────────────────
  if (alreadySigned) {
    return (
      <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-200 p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
          <svg
            className="h-8 w-8 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Already Signed Off</h2>
        <p className="text-slate-500 text-sm">
          This inspection point has already been signed off. You can close this page.
        </p>
      </div>
    );
  }

  // ── Waived ─────────────────────────────────────────────────────────────────
  if (waived) {
    return (
      <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
          <svg
            className="h-8 w-8 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Point Waived</h2>
        <p className="text-slate-500 text-sm">
          This inspection point has been waived. You can close this page.
        </p>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    const formattedTime = new Date(success.signedAt).toLocaleString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="h-10 w-10 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Signed off successfully</h2>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 text-left space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Signed by
            </p>
            <p className="font-bold text-slate-800">{success.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Date &amp; Time
            </p>
            <p className="text-slate-700">{formattedTime}</p>
          </div>
          {success.lat != null && success.lng != null && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Location
              </p>
              <p className="text-slate-700 text-sm font-mono">
                <a
                  href={`https://maps.google.com/?q=${success.lat},${success.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-violet-600 transition-colors"
                >
                  {success.lat.toFixed(5)}, {success.lng.toFixed(5)}
                </a>
              </p>
            </div>
          )}
        </div>
        <p className="text-slate-400 text-sm">You can close this page</p>
      </div>
    );
  }

  // ── Sign-off form ──────────────────────────────────────────────────────────
  const isHold = type === "hold";
  const canSubmit = name.trim().length > 0 && hasDrawn && !submitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        {/* Type badge */}
        {isHold ? (
          <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 font-black text-lg px-4 py-2 rounded-2xl border-2 border-red-200">
            🔴 HOLD POINT
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 font-black text-lg px-4 py-2 rounded-2xl border-2 border-amber-200">
            🟡 WITNESS POINT
          </span>
        )}

        {/* Task context */}
        {taskDescription && (
          <p className="text-sm italic text-slate-500">Task: {taskDescription}</p>
        )}

        <hr className="border-slate-200" />

        {/* Item details */}
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-base text-slate-600">{description}</p>}
      </div>

      {/* Form fields */}
      <div className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Full name"
            style={{ fontSize: "16px" }}
            className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-amber-400 transition-colors bg-white"
          />
        </div>

        {/* Signature canvas */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Sign below</label>
          <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
            <SignatureCanvas
              ref={sigPadRef}
              canvasProps={{
                width: 340,
                height: 180,
                style: { width: "100%", height: "180px" },
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

        {/* GPS status */}
        <p
          className={`text-sm ${
            gpsStatus === "unavailable" ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {gpsStatus === "capturing" && "📍 Capturing location..."}
          {gpsStatus === "captured" && "📍 Location captured"}
          {gpsStatus === "unavailable" && "📍 Location unavailable"}
        </p>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-slate-200 disabled:text-slate-400 text-amber-950 font-black text-lg py-4 rounded-2xl transition-all active:scale-95 disabled:active:scale-100"
        >
          {submitting ? "Signing off…" : "✓ Sign Off"}
        </button>

        {/* Waive this point (witness only) */}
        {!isHold && (
          <div className="pt-2">
            {!waiveOpen ? (
              <button
                type="button"
                onClick={() => setWaiveOpen(true)}
                className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-2"
              >
                Waive this point
              </button>
            ) : (
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50">
                <p className="text-sm font-semibold text-slate-700">Waive reason (required)</p>
                <textarea
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="Describe why this point is being waived…"
                  rows={3}
                  style={{ fontSize: "16px" }}
                  className="w-full border-2 border-slate-200 focus:border-slate-400 rounded-xl px-4 py-3 outline-none text-sm resize-none bg-white transition-colors"
                />
                {waiveError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                    {waiveError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleWaive}
                    disabled={waiving || !waiveReason.trim()}
                    className="flex-1 bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white font-bold py-3 rounded-2xl text-sm transition-all active:scale-95 disabled:active:scale-100"
                  >
                    {waiving ? "Waiving…" : "Confirm Waiver"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setWaiveOpen(false); setWaiveReason(""); setWaiveError(null); }}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
