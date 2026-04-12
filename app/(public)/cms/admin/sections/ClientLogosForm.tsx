"use client";

import { useEffect, useState } from "react";

const CLIENT_LOGO_KEYS = [
  "clientLogo1",
  "clientLogo2",
  "clientLogo3",
  "clientLogo4",
  "clientLogo5",
  "clientLogo6",
] as const;

type ClientLogoSlot = {
  key: string;
  src: string;
  alt: string;
  sourceName: string;
  sourceUrl: string;
};

type SlotsResponse = {
  mediaSlots: Record<string, ClientLogoSlot>;
  videoSlots: Record<string, unknown>;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function useSlots() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SlotsResponse | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cms/public-media", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load media slots");
      setData((await res.json()) as SlotsResponse);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  return { loading, error, data, reload: () => load(true) };
}

async function saveSlot(payload: Record<string, unknown>) {
  const res = await fetch("/api/cms/public-media", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Save failed");
  }
}

async function uploadLogoFile(slot: string, file: File) {
  const form = new FormData();
  form.append("slot", slot);
  form.append("kind", "image");
  form.append("file", file);
  const res = await fetch("/api/cms/public-media/upload", { method: "POST", body: form });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Upload failed");
  }
  return (await res.json()) as { url: string };
}

function ClientLogoEditor({
  slotKey,
  slotNumber,
  value,
  onSaved,
}: {
  slotKey: string;
  slotNumber: number;
  value: ClientLogoSlot;
  onSaved: () => void;
}) {
  const [src, setSrc] = useState(value.src);
  const [name, setName] = useState(value.sourceName);
  const [website, setWebsite] = useState(value.sourceUrl);
  const [state, setState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave(srcOverride?: string) {
    setState("saving");
    setErrorMsg(null);
    try {
      await saveSlot({
        slot: slotKey,
        type: "image",
        src: srcOverride ?? src,
        alt: name,
        source_name: name,
        source_url: website,
      });
      if (srcOverride !== undefined) setSrc(srcOverride);
      setState("saved");
      onSaved();
      setTimeout(() => setState("idle"), 1500);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function handleUpload(file?: File | null) {
    if (!file) return;
    setState("saving");
    setErrorMsg(null);
    try {
      const { url } = await uploadLogoFile(slotKey, file);
      // Persist the uploaded URL together with any name/website already entered.
      await saveSlot({
        slot: slotKey,
        type: "image",
        src: url,
        alt: name,
        source_name: name,
        source_url: website,
      });
      setSrc(url);
      setState("saved");
      onSaved();
      setTimeout(() => setState("idle"), 1500);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Slot header */}
      <div>
        <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">
          Slot {slotNumber}
        </p>
        <h3 className="text-base font-bold text-slate-900 mt-0.5">
          {name || `Client ${slotNumber}`}
        </h3>
      </div>

      {/* Logo preview */}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name || "logo preview"}
          className="h-16 w-auto max-w-full rounded-xl border border-slate-100 bg-slate-50 object-contain p-2"
        />
      ) : (
        <div className="h-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
          No logo uploaded yet
        </div>
      )}

      <div className="space-y-3">
        {/* Company name */}
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Company name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Civil"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          />
        </label>

        {/* Logo URL */}
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Logo URL
          <input
            type="text"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="https://…/logo.svg"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          />
        </label>

        {/* File upload */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Upload logo</span>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-600 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">PNG / JPG / WebP / SVG · max 50 MB</span>
          </div>
        </div>

        {/* Website URL */}
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Website URL{" "}
          <span className="font-normal text-slate-400">(optional — shown as a link)</span>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://company.com"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          />
        </label>
      </div>

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      <button
        onClick={() => handleSave()}
        disabled={state === "saving"}
        className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60 transition-colors"
      >
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}

export function ClientLogosForm() {
  const { loading, error, data, reload } = useSlots();

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading client logo slots…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-red-200 text-red-700 rounded-2xl p-6 shadow-sm space-y-2">
        <p className="text-sm font-semibold">Unable to load slots.</p>
        <p className="text-sm">{error ?? "Unknown error"}</p>
        <button
          onClick={reload}
          className="mt-1 px-3 py-2 text-sm font-semibold rounded-lg bg-white border border-red-300 hover:bg-red-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {CLIENT_LOGO_KEYS.map((key, i) => {
        const slot = data.mediaSlots[key];
        if (!slot) return null;
        return (
          <ClientLogoEditor
            key={key}
            slotKey={key}
            slotNumber={i + 1}
            value={slot}
            onSaved={reload}
          />
        );
      })}
    </div>
  );
}
