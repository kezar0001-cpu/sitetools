"use client";

import { useEffect, useState } from "react";
import {
  getActiveBriefingForSite,
  getBriefingsForSite,
  upsertBriefing,
  activateBriefing,
  deactivateBriefing,
} from "@/lib/workspace/client";
import {
  createBriefingTopicItem,
  DEFAULT_BRIEFING_CONTENT,
  type SiteDailyBriefing,
  type BriefingCategory,
  type SiteDailyBriefingContent,
  type VisitorType,
  visitorTypeOptions,
} from "@/lib/workspace/types";

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
  const [presenterName, setPresenterName] = useState("");
  const [appliesTo, setAppliesTo] = useState<VisitorType[]>([]);
  const [contentJson, setContentJson] = useState<SiteDailyBriefingContent>(DEFAULT_BRIEFING_CONTENT);

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
      await upsertBriefing({
        site_id: siteId,
        company_id: companyId,
        date: today,
        title,
        content,
        category,
        presenter_name: presenterName,
        applies_to_visitor_types: appliesTo,
        requires_acknowledgement: true,
        content_json: { ...contentJson, presenter_name: presenterName },
      });
      setTitle("");
      setContent("");
      setCategory("Safety");
      setPresenterName("");
      setAppliesTo([]);
      setContentJson(DEFAULT_BRIEFING_CONTENT);
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleAudience = (type: VisitorType) => {
    setAppliesTo((prev) => (prev.includes(type) ? prev.filter((value) => value !== type) : [...prev, type]));
  };

  const updateTopicList = (key: keyof Pick<SiteDailyBriefingContent, "planned_activities" | "high_risk_activities" | "hazards" | "controls" | "permits_required" | "plant_equipment">, index: number, value: string) => {
    setContentJson((prev) => ({
      ...prev,
      [key]: prev[key].map((item, idx) => (idx === index ? { ...item, text: value } : item)),
    }));
  };

  const addTopic = (key: keyof Pick<SiteDailyBriefingContent, "planned_activities" | "high_risk_activities" | "hazards" | "controls" | "permits_required" | "plant_equipment">) => {
    setContentJson((prev) => ({
      ...prev,
      [key]: [...prev[key], createBriefingTopicItem()],
    }));
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
              {activeBriefing.presenter_name && <p className="mt-2 text-xs text-slate-500">Presenter: {activeBriefing.presenter_name}</p>}
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
            <label className="block text-xs font-medium text-slate-600 mb-1">Presenter / Supervisor</label>
            <input
              type="text"
              value={presenterName}
              onChange={(e) => setPresenterName(e.target.value)}
              placeholder="Who is delivering this briefing?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Show briefing for</label>
            <div className="flex flex-wrap gap-2">
              {visitorTypeOptions.map((type) => {
                const active = appliesTo.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleAudience(type)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-amber-500 text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-500">Leave unselected to show to everyone.</p>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={contentJson.work_summary} onChange={(e) => setContentJson((prev) => ({ ...prev, work_summary: e.target.value }))} placeholder="Today's work summary" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={contentJson.work_areas} onChange={(e) => setContentJson((prev) => ({ ...prev, work_areas: e.target.value }))} placeholder="Work areas" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={contentJson.shift_label} onChange={(e) => setContentJson((prev) => ({ ...prev, shift_label: e.target.value }))} placeholder="Shift / crew" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={contentJson.weather_notes} onChange={(e) => setContentJson((prev) => ({ ...prev, weather_notes: e.target.value }))} placeholder="Weather / conditions" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          {([
            ["planned_activities", "Planned activities"],
            ["high_risk_activities", "High-risk activities"],
            ["hazards", "Hazards"],
            ["controls", "Controls / PPE"],
            ["permits_required", "Permits required"],
            ["plant_equipment", "Plant / equipment"],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-600">{label}</label>
                <button type="button" onClick={() => addTopic(key)} className="text-xs font-medium text-amber-600 hover:text-amber-700">+ Add</button>
              </div>
              {contentJson[key].map((item, index) => (
                <input
                  key={item.id}
                  value={item.text}
                  onChange={(e) => updateTopicList(key, index, e.target.value)}
                  placeholder={label}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              ))}
            </div>
          ))}
          <textarea value={contentJson.environmental_notes} onChange={(e) => setContentJson((prev) => ({ ...prev, environmental_notes: e.target.value }))} rows={2} placeholder="Environmental notes" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
          <textarea value={contentJson.coordination_notes} onChange={(e) => setContentJson((prev) => ({ ...prev, coordination_notes: e.target.value }))} rows={2} placeholder="Coordination notes" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
          <textarea value={contentJson.incidents_lessons} onChange={(e) => setContentJson((prev) => ({ ...prev, incidents_lessons: e.target.value }))} rows={2} placeholder="Incidents / lessons learned" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
          <textarea value={contentJson.deliveries_traffic} onChange={(e) => setContentJson((prev) => ({ ...prev, deliveries_traffic: e.target.value }))} rows={2} placeholder="Deliveries / traffic management" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
          <textarea value={contentJson.special_instructions} onChange={(e) => setContentJson((prev) => ({ ...prev, special_instructions: e.target.value }))} rows={2} placeholder="Special instructions" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
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
                    {(b.applies_to_visitor_types ?? []).length > 0 && (
                      <p className="text-xs text-slate-400">{(b.applies_to_visitor_types ?? []).join(", ")}</p>
                    )}
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
