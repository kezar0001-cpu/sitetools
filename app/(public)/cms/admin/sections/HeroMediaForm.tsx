"use client";

import { useEffect, useState } from "react";
import { PUBLIC_MEDIA_SLOT_KEYS, PUBLIC_VIDEO_SLOT_KEYS } from "@/lib/publicSiteMedia";

type MediaSlot = {
  key: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  sourceName: string;
  sourceUrl: string;
  license: string;
  notes: string;
};

type VideoSlot = {
  key: string;
  src: string;
  poster: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
  notes: string;
};

type SlotsResponse = {
  mediaSlots: Record<string, MediaSlot>;
  videoSlots: Record<string, VideoSlot>;
  overrides: Record<string, unknown>;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const VIDEO_SLOT_KEY = PUBLIC_VIDEO_SLOT_KEYS[0];

const SLOT_LABELS: Record<string, { section: string; title: string }> = {
  siteSignHeroBackground: { section: "Video", title: "Background Video" },
  siteSignHero:           { section: "Image", title: "SiteSign" },
  sitePlanWorkflow:       { section: "Image", title: "SitePlan" },
  siteCaptureWorkflow:    { section: "Image", title: "SiteCapture" },
  siteItpWorkflow:        { section: "Image", title: "Site ITP" },
  siteDocsWorkflow:       { section: "Image", title: "Site Docs" },
};

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
      // On silent refresh don't overwrite good data with an error
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load media slots");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  // reload is always silent — editors stay mounted, local state is preserved
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

async function uploadFile(slot: string, kind: "image" | "poster" | "video", file: File) {
  const form = new FormData();
  form.append("slot", slot);
  form.append("kind", kind);
  form.append("file", file);
  const res = await fetch("/api/cms/public-media/upload", { method: "POST", body: form });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Upload failed");
  }
  return (await res.json()) as { url: string };
}

/**
 * Upload a video by getting a signed URL from the server, then PUT-ing the file
 * directly from the browser to Supabase storage.  This bypasses the serverless
 * function body-size limit (~4.5 MB on most platforms) that causes large video
 * uploads to silently fail when routed through the server.
 */
async function uploadVideoViaSignedUrl(slot: string, file: File): Promise<string> {
  // Step 1 — ask the server for a signed upload URL
  const urlRes = await fetch("/api/cms/public-media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slot,
      kind: "video",
      fileName: file.name,
      // Normalise to video/mp4 so stored object has the correct MIME type for
      // playback — iOS Safari reports .mp4 as video/quicktime.
      contentType: "video/mp4",
      size: file.size,
    }),
  });
  if (!urlRes.ok) {
    const j = await urlRes.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Failed to prepare upload");
  }
  const { signedUrl, publicUrl } = (await urlRes.json()) as { signedUrl: string; publicUrl: string };

  // Step 2 — upload directly from the browser to Supabase (no server middleman)
  const putRes = await fetch(signedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": "video/mp4" },
  });
  if (!putRes.ok) {
    throw new Error("Storage upload failed. Please try again.");
  }

  // Step 3 — save the public URL to the database (only src; poster is preserved)
  await saveSlot({ slot, type: "video", src: publicUrl });

  return publicUrl;
}

function VideoEditor({ slot, value, onSaved }: { slot: string; value: VideoSlot; onSaved: () => void }) {
  const [src, setSrc] = useState(value.src);
  const [poster, setPoster] = useState(value.poster);
  const [state, setState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave(srcOverride?: string, posterOverride?: string) {
    setState("saving");
    setErrorMsg(null);
    const finalSrc = srcOverride ?? src;
    const finalPoster = posterOverride ?? poster;
    try {
      await saveSlot({ slot, type: "video", src: finalSrc, poster: finalPoster });
      setSrc(finalSrc);
      setPoster(finalPoster);
      setState("saved");
      onSaved();
      setTimeout(() => setState("idle"), 1500);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function handleUpload(kind: "video" | "poster", file?: File | null) {
    if (!file) return;
    setState("saving");
    setErrorMsg(null);
    try {
      let url: string;
      if (kind === "video") {
        // Use signed URL so the video goes browser → Supabase directly,
        // bypassing the serverless function body-size limit.
        url = await uploadVideoViaSignedUrl(slot, file);
      } else {
        // Poster images are small — direct server upload is fine.
        const result = await uploadFile(slot, kind, file);
        url = result.url;
      }
      if (kind === "video") setSrc(url);
      else setPoster(url);
      setState("saved");
      onSaved();
      setTimeout(() => setState("idle"), 1500);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className="space-y-4">
      {src && (
        <video
          className="w-full h-40 object-cover rounded-xl bg-slate-900"
          src={src}
          poster={poster || undefined}
          autoPlay muted loop playsInline
        />
      )}
      <div className="space-y-3">
        <UrlField label="Video URL" value={src} onChange={setSrc} placeholder="Direct .mp4 link — e.g. https://cdn.example.com/video.mp4" />
        <FileInput
          label="Upload video"
          accept="video/mp4,video/quicktime,video/*"
          hint="MP4 · max 50 MB"
          onChange={(f) => handleUpload("video", f)}
        />
        <UrlField label="Poster URL" value={poster} onChange={setPoster} placeholder="https://…poster.png" />
        <FileInput
          label="Upload poster"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          hint="PNG / JPG / WebP / SVG · max 50 MB"
          onChange={(f) => handleUpload("poster", f)}
        />
      </div>
      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
      <SaveButton state={state} onClick={() => handleSave()} label="Save video" />
    </div>
  );
}

function ImageEditor({ slot, value, onSaved }: { slot: string; value: MediaSlot; onSaved: () => void }) {
  const [src, setSrc] = useState(value.src);
  const [alt, setAlt] = useState(value.alt);
  const [state, setState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave(srcOverride?: string) {
    setState("saving");
    setErrorMsg(null);
    const finalSrc = srcOverride ?? src;
    try {
      await saveSlot({ slot, type: "image", src: finalSrc, alt });
      setSrc(finalSrc);
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
      const { url } = await uploadFile(slot, "image", file);
      // Upload route already upserts the DB — update local state directly.
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
    <div className="space-y-4">
      {src && (
        // Plain img — next/image requires external domains to be whitelisted in
        // next.config.mjs which is not configured for Supabase URLs.
        // Admin preview doesn't need optimisation.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt || "preview"} className="w-full h-40 rounded-xl object-cover border border-slate-200 bg-slate-50" />
      )}
      <div className="space-y-3">
        <UrlField label="Image URL" value={src} onChange={setSrc} placeholder="https://…image.png" />
        <FileInput
          label="Upload image"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          hint="PNG / JPG / WebP / SVG · max 50 MB"
          onChange={handleUpload}
        />
        <UrlField label="Alt text" value={alt} onChange={setAlt} placeholder="Describe the image…" />
      </div>
      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
      <SaveButton state={state} onClick={() => handleSave()} label="Save image" />
    </div>
  );
}

function UrlField({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
      />
    </label>
  );
}

function FileInput({
  label, accept, hint, onChange,
}: {
  label: string; accept: string; hint: string; onChange: (f: File | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="text-sm text-slate-600 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
        />
        <span className="text-xs text-slate-400 whitespace-nowrap">{hint}</span>
      </div>
    </div>
  );
}

function SaveButton({ state, onClick, label }: { state: SaveState; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={state === "saving"}
      className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60 transition-colors"
    >
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : label}
    </button>
  );
}

export function HeroMediaForm() {
  const { loading, error, data, reload } = useSlots();

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading media slots…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-red-200 text-red-700 rounded-2xl p-6 shadow-sm space-y-2">
        <p className="text-sm font-semibold">Unable to load media.</p>
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

  const video = data.videoSlots[VIDEO_SLOT_KEY];

  return (
    <div className="space-y-6">
      {/* Background video */}
      {video && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <SlotHeader slotKey={VIDEO_SLOT_KEY} />
          <VideoEditor slot={VIDEO_SLOT_KEY} value={video} onSaved={reload} />
        </div>
      )}

      {/* Image slots — all 7 in a responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PUBLIC_MEDIA_SLOT_KEYS.map((key) => {
          const slot = data.mediaSlots[key];
          if (!slot) return null;
          return (
            <div key={key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <SlotHeader slotKey={key} />
              <ImageEditor slot={key} value={slot} onSaved={reload} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlotHeader({ slotKey }: { slotKey: string }) {
  const label = SLOT_LABELS[slotKey];
  return (
    <div>
      <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">
        {label?.section ?? "Media"}
      </p>
      <h3 className="text-base font-bold text-slate-900 mt-0.5">
        {label?.title ?? slotKey}
      </h3>
    </div>
  );
}
