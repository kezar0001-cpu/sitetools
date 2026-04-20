"use client";

import { useEffect, useState } from "react";
import {
  getActiveBriefingForSite,
  getBriefingsForSite,
  upsertBriefing,
  activateBriefing,
  deactivateBriefing,
} from "@/lib/workspace/client";
import type { SiteDailyBriefing, BriefingCategory } from "@/lib/workspace/types";

const CATEGORIES: BriefingCategory[] = ["Safety", "Environment", "Quality", "General"];

const CATEGORY_BADGE: Record<BriefingCategory, string> = {
  Safety: "bg-red-100 text-red-700",
  Environment: "bg-emerald-100 text-emerald-700",
  Quality: "bg-blue-100 text-blue-700",
  General: "bg-slate-100 text-slate-700",
};

interface DailyBriefingPanelProps {
  siteId: string;
  companyId: string;
  onConfiguredChange?: (isConfigured: boolean) => void;
}

export function DailyBriefingPanel({ siteId, companyId, onConfiguredChange }: DailyBriefingPanelProps) {
  const [briefings, setBriefings] = useState<SiteDailyBriefing[]>([]);
  const [activeBriefing, setActiveBriefing] = useState<SiteDailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<BriefingCategory>("Safety");

  const load = async () => {
    setLoading(true);
    try {
      const [all, active] = await Promise.all([
        getBriefingsForSite(siteId),
        getActiveBriefingForSite(siteId),
      ]);
      setBriefings(all);
      setActiveBriefing(active);
      onConfiguredChange?.(all.length > 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await upsertBriefing({ site_id: siteId, company_id: companyId, date: today, title, content, category });
      setTitle("");
      setContent("");
      setCategory("Safety");
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (briefing: SiteDailyBriefing) => {
    setSaving(true);
    try {
      if (briefing.is_active) {
        await deactivateBriefing(briefing.id);
      } else {
        await activateBriefing(briefing.id, siteId);
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active briefing summary */}
      {activeBriefing ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Active today
                </span>
                {activeBriefing.category && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_BADGE[activeBriefing.category]}`}>
                    {activeBriefing.category}
                  </span>
                )}
              </div>
              <p className="font-semibold text-slate-900">{activeBriefing.title}</p>
              <p className="mt-1 text-sm text-slate-600 line-clamp-2">{activeBriefing.content}</p>
            </div>
            <button
              onClick={() => handleToggle(activeBriefing)}
              disabled={saving}
              className="flex-shrink-0 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              Deactivate
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No active briefing for today. Create one below and activate it.
        </div>
      )}

      {/* Create form */}
      {showForm ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h4 className="font-semibold text-slate-900 text-sm">New Daily Briefing</h4>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Elevated Work Platform — Safety Reminder"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BriefingCategory)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Key safety points, hazards, instructions..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !title.trim() || !content.trim()}
              className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-bold rounded-lg px-4 py-2 text-sm transition-colors"
            >
              {saving ? "Saving…" : "Save Briefing"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
        >
          + New Briefing
        </button>
      )}

      {/* Past briefings list */}
      {briefings.filter((b) => !b.is_active).length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Previous Briefings</p>
          <div className="space-y-2">
            {briefings
              .filter((b) => !b.is_active)
              .slice(0, 5)
              .map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{b.title}</p>
                    <p className="text-xs text-slate-500">{b.date}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(b)}
                    disabled={saving}
                    className="flex-shrink-0 text-xs font-semibold text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                  >
                    Activate
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
