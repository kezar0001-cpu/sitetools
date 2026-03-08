"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CmsMediaPage() {
  const [token, setToken] = useState("");
  type MediaAsset = { id: string; file_name: string; media_type: string; mime_type: string; public_url: string };
  const [media, setMedia] = useState<MediaAsset[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? ""));
  }, []);

  async function loadMedia(accessToken: string) {
    const res = await fetch("/api/cms/media", { headers: { authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    setMedia(data.media ?? []);
  }

  useEffect(() => {
    if (!token) return;
    loadMedia(token);
  }, [token]);

  async function uploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("altText", file.name);
    await fetch("/api/cms/media", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: formData });
    await loadMedia(token);
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-black text-slate-900">CMS Media Library</h1>
      <input type="file" onChange={uploadFile} className="text-sm" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {media.map((asset) => (
          <article key={asset.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-900 truncate">{asset.file_name}</p>
            <p className="text-xs text-slate-500 mt-1">{asset.media_type} · {asset.mime_type}</p>
            <a href={asset.public_url} target="_blank" className="text-xs text-amber-700 mt-2 inline-block">Open file</a>
          </article>
        ))}
      </div>
    </div>
  );
}
