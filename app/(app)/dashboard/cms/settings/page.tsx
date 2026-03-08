"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CmsSettingsPage() {
  const [token, setToken] = useState("");
  const [settingsText, setSettingsText] = useState("{}");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? ""));
  }, []);

  useEffect(() => {
    fetch("/api/cms/settings").then((r) => r.json()).then((data) => setSettingsText(JSON.stringify(data.settings, null, 2)));
  }, []);

  async function saveSettings() {
    const parsed = JSON.parse(settingsText);
    await fetch("/api/cms/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(parsed)
    });
    alert("Settings updated");
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-black text-slate-900">Global CMS Settings</h1>
      <p className="text-sm text-slate-600">Edit site title, nav, footer, default SEO, and global links as JSON.</p>
      <textarea className="w-full min-h-[500px] border rounded-xl p-3 font-mono text-xs" value={settingsText} onChange={(e) => setSettingsText(e.target.value)} />
      <button onClick={saveSettings} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">Save settings</button>
    </div>
  );
}
