"use client";

import { useState } from "react";
import type { CmsHeroMediaSettings } from "@/lib/cms/heroMediaSettings";

interface HeroMediaSettingsFormProps {
  initialValues: CmsHeroMediaSettings;
}

export function HeroMediaSettingsForm({ initialValues }: HeroMediaSettingsFormProps) {
  const [heroVideoUrl, setHeroVideoUrl] = useState(initialValues.heroVideoUrl);
  const [heroVideoPosterUrl, setHeroVideoPosterUrl] = useState(initialValues.heroVideoPosterUrl);
  const [heroCardImageUrl, setHeroCardImageUrl] = useState(initialValues.heroCardImageUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/cms/hero-media", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ heroVideoUrl, heroVideoPosterUrl, heroCardImageUrl }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Could not save hero media settings.");
      return;
    }

    setMessage("Saved. Hero video/image updates are now live on the homepage.");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-xl font-black text-slate-900">Homepage Hero Media</h2>
        <p className="text-sm text-slate-600 mt-1">Add/update your hero background video and hero card photo from CMS.</p>
      </div>

      {message && <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-800">{message}</p>}
      {error && <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm font-medium text-red-700">{error}</p>}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="hero-video-url">
            Hero background video URL
          </label>
          <input
            id="hero-video-url"
            value={heroVideoUrl}
            onChange={(event) => setHeroVideoUrl(event.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
            placeholder="https://.../hero-video.mp4 or /videos/hero.mp4"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="hero-video-poster-url">
            Hero video poster image path
          </label>
          <input
            id="hero-video-poster-url"
            value={heroVideoPosterUrl}
            onChange={(event) => setHeroVideoPosterUrl(event.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
            placeholder="/branding/video-poster.svg"
            required
          />
          <p className="text-xs text-slate-500 mt-1">Use a local path that starts with / (for example: /branding/...).</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="hero-card-image-url">
            Hero right-card photo path
          </label>
          <input
            id="hero-card-image-url"
            value={heroCardImageUrl}
            onChange={(event) => setHeroCardImageUrl(event.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
            placeholder="/branding/hero-site-team.svg"
            required
          />
          <p className="text-xs text-slate-500 mt-1">Use a local path that starts with / so it can be served safely from your app.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-slate-900 text-white px-5 py-3 text-sm font-bold hover:bg-black disabled:opacity-70"
        >
          {saving ? "Saving..." : "Save hero media"}
        </button>
      </form>
    </section>
  );
}
