"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
  overrides: Record<
    string,
    {
      slot: string;
      type: "image" | "video";
      src: string | null;
      poster: string | null;
      alt: string | null;
      width: number | null;
      height: number | null;
      source_name: string | null;
      source_url: string | null;
      license: string | null;
      notes: string | null;
    }
  >;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type VideoForm = {
  src: string;
  poster: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
  notes: string;
};

type ImageForm = {
  src: string;
  alt: string;
  width: number;
  height: number;
  sourceName: string;
  sourceUrl: string;
  license: string;
  notes: string;
};

const VIDEO_SLOT_KEY = PUBLIC_VIDEO_SLOT_KEYS[0];
const HERO_IMAGE_SLOT_KEY = PUBLIC_MEDIA_SLOT_KEYS.find((k) => k === "siteSignHeroCardImage") ?? PUBLIC_MEDIA_SLOT_KEYS[0];

function useSlots() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SlotsResponse | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cms/public-media", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load media slots");
      }
      const json = (await res.json()) as SlotsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media slots");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { loading, error, data, reload: load };
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

  const res = await fetch("/api/cms/public-media/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? "Upload failed");
  }
  return (await res.json()) as { url: string };
}

function VideoEditor({ slot, value, onSaved }: { slot: string; value: VideoSlot; onSaved: () => void }) {
  const [form, setForm] = useState<VideoForm>({
    src: value.src,
    poster: value.poster,
    sourceName: value.sourceName,
    sourceUrl: value.sourceUrl,
    license: value.license,
    notes: value.notes,
  });
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setState("saving");
    setError(null);
    try {
      await saveSlot({ slot, type: "video", ...form });
      setState("saved");
      onSaved();
      setTimeout(() => setState("idle"), 1200);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Unable to save");
    }
  }

  async function handleUpload(kind: "video" | "poster", file?: File | null) {
    if (!file) return;
    setState("saving");
    setError(null);
    try {
      const { url } = await uploadFile(slot, kind, file);
      if (kind === "video") {
        setForm((prev) => ({ ...prev, src: url }));
      } else {
        setForm((prev) => ({ ...prev, poster: url }));
      }
      await saveSlot({ slot, type: "video", ...form, src: kind === "video" ? url : form.src, poster: kind === "poster" ? url : form.poster });
      setState("saved");
      onSaved();
      setTimeout(() => setState("idle"), 1200);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800">Video URL</label>
        <input
          value={form.src}
          onChange={(e) => setForm((p) => ({ ...p, src: e.target.value }))}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          placeholder="https://...mp4"
        />
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <input
            type="file"
            accept="video/mp4"
            onChange={(e) => handleUpload("video", e.target.files?.[0])}
            className="text-xs"
          />
          <span>Upload (mp4, ≤10MB)</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800">Poster image</label>
        <input
          value={form.poster}
          onChange={(e) => setForm((p) => ({ ...p, poster: e.target.value }))}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          placeholder="https://.../poster.png"
        />
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => handleUpload("poster", e.target.files?.[0])}
            className="text-xs"
          />
          <span>Upload (png/jpg/webp/svg, ≤10MB)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Source name" value={form.sourceName} onChange={(v) => setForm((p) => ({ ...p, sourceName: v }))} />
        <Field label="Source URL" value={form.sourceUrl} onChange={(v) => setForm((p) => ({ ...p, sourceUrl: v }))} />
        <Field label="License" value={form.license} onChange={(v) => setForm((p) => ({ ...p, license: v }))} />
        <Field label="Notes" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleSave}
        disabled={state === "saving"}
        className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
      >
        {state === "saving" ? "Saving..." : state === "saved" ? "Saved" : "Save video"}
      </button>
    </div>
  );
}

function ImageEditor({ slot, value, onSaved }: { slot: string; value: MediaSlot; onSaved: () => void }) {
  const [form, setForm] = useState<ImageForm>({
    src: value.src,
    alt: value.alt,
    width: value.width,
    height: value.height,
    sourceName: value.sourceName,
    sourceUrl: value.sourceUrl,
    license: value.license,
    notes: value.notes,
  });
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setState("saving");
    setError(null);
    try {
      await saveSlot({ slot, type: "image", ...form });
      setState("saved");
      onSaved();
      setTimeout(() => setState("idle"), 1200);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Unable to save");
    }
  }

  async function handleUpload(file?: File | null) {
    if (!file) return;
    setState("saving");
    setError(null);
    try {
      const { url } = await uploadFile(slot, "image", file);
      setForm((prev) => ({ ...prev, src: url }));
      await saveSlot({ slot, type: "image", ...form, src: url });
      setState("saved");
      onSaved();
      setTimeout(() => setState("idle"), 1200);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800">Image URL</label>
        <input
          value={form.src}
          onChange={(e) => setForm((p) => ({ ...p, src: e.target.value }))}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          placeholder="https://.../image.png"
        />
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => handleUpload(e.target.files?.[0])}
            className="text-xs"
          />
          <span>Upload (png/jpg/webp/svg, ≤10MB)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Alt" value={form.alt} onChange={(v) => setForm((p) => ({ ...p, alt: v }))} />
        <Field label="Width" type="number" value={String(form.width)} onChange={(v) => setForm((p) => ({ ...p, width: Number(v) || 0 }))} />
        <Field label="Height" type="number" value={String(form.height)} onChange={(v) => setForm((p) => ({ ...p, height: Number(v) || 0 }))} />
        <Field label="Source name" value={form.sourceName} onChange={(v) => setForm((p) => ({ ...p, sourceName: v }))} />
        <Field label="Source URL" value={form.sourceUrl} onChange={(v) => setForm((p) => ({ ...p, sourceUrl: v }))} />
        <Field label="License" value={form.license} onChange={(v) => setForm((p) => ({ ...p, license: v }))} />
        <Field label="Notes" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleSave}
        disabled={state === "saving"}
        className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
      >
        {state === "saving" ? "Saving..." : state === "saved" ? "Saved" : "Save image"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="text-sm text-slate-700 font-medium space-y-1">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
      />
    </label>
  );
}

function VideoPreview({ video }: { video: VideoSlot }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
      <video className="w-full h-48 object-cover" src={video.src} poster={video.poster} autoPlay muted loop playsInline />
      <div className="p-3 text-xs text-slate-300">Source: {video.sourceName}</div>
    </div>
  );
}

function ImagePreview({ image }: { image: MediaSlot }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
      <div className="relative w-full h-48">
        <Image src={image.src} alt={image.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="p-3 text-xs text-slate-600">Alt: {image.alt || "(none)"}</div>
    </div>
  );
}

export function HeroMediaForm() {
  const { loading, error, data, reload } = useSlots();

  const video = useMemo(() => (data ? data.videoSlots[VIDEO_SLOT_KEY] : null), [data]);
  const heroImage = useMemo(() => (data ? data.mediaSlots[HERO_IMAGE_SLOT_KEY] : null), [data]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading hero media…</p>
      </div>
    );
  }

  if (error || !data || !video || !heroImage) {
    return (
      <div className="bg-white border border-red-200 text-red-700 rounded-2xl p-6 shadow-sm">
        <p className="text-sm font-semibold">Unable to load hero media.</p>
        <p className="text-sm mt-1">{error ?? "Unknown error"}</p>
        <button
          onClick={reload}
          className="mt-3 inline-flex items-center px-3 py-2 text-sm font-semibold rounded-lg bg-white border border-red-300 hover:bg-red-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1fr] gap-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-500">Hero video</p>
            <h3 className="text-lg font-bold text-slate-900">Background video & poster</h3>
            <p className="text-sm text-slate-600">MP4 URL or upload; poster shown while loading or on unsupported browsers.</p>
          </div>
          <button onClick={reload} className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline">Refresh</button>
        </div>
        <VideoEditor slot={VIDEO_SLOT_KEY} value={video} onSaved={reload} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-500">Hero card image</p>
            <h3 className="text-lg font-bold text-slate-900">Primary hero photo</h3>
            <p className="text-sm text-slate-600">Recommended 1400x900, webp/jpg.</p>
          </div>
          <button onClick={reload} className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline">Refresh</button>
        </div>
        <ImageEditor slot={HERO_IMAGE_SLOT_KEY} value={heroImage} onSaved={reload} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Current video</h4>
          <VideoPreview video={video} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Current hero image</h4>
          <ImagePreview image={heroImage} />
        </div>
      </div>
    </div>
  );
}
