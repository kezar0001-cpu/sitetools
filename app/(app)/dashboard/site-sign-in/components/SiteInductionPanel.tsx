"use client";

import { useEffect, useState } from "react";
import {
  getInductionForSite,
  upsertInduction,
  activateInduction,
  deactivateInduction,
} from "@/lib/workspace/client";
import type { SiteInduction, SiteInductionStep } from "@/lib/workspace/types";

interface SiteInductionPanelProps {
  siteId: string;
  companyId: string;
  onConfiguredChange?: (isConfigured: boolean) => void;
}

const EMPTY_STEP = (): SiteInductionStep => ({
  step_number: 1,
  title: "",
  content: "",
  requires_acknowledgement: true,
});

export function SiteInductionPanel({ siteId, companyId, onConfiguredChange }: SiteInductionPanelProps) {
  const [induction, setInduction] = useState<SiteInduction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState("Site Induction");
  const [editSteps, setEditSteps] = useState<SiteInductionStep[]>([EMPTY_STEP()]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInductionForSite(siteId);
      setInduction(data);
      if (data) {
        setEditTitle(data.title);
        setEditSteps(data.steps.length > 0 ? data.steps : [EMPTY_STEP()]);
      }
      onConfiguredChange?.(!!data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!editTitle.trim() || editSteps.some((s) => !s.title.trim() || !s.content.trim())) return;
    setSaving(true);
    try {
      const steps = editSteps.map((s, i) => ({ ...s, step_number: i + 1 }));
      const saved = await upsertInduction({
        id: induction?.id,
        site_id: siteId,
        company_id: companyId,
        title: editTitle,
        steps,
      });
      setInduction(saved);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!induction) return;
    setToggling(true);
    try {
      if (induction.is_active) {
        await deactivateInduction(induction.id);
      } else {
        await activateInduction(induction.id);
      }
      await load();
    } finally {
      setToggling(false);
    }
  };

  const addStep = () => {
    setEditSteps((prev) => [
      ...prev,
      { ...EMPTY_STEP(), step_number: prev.length + 1 },
    ]);
  };

  const removeStep = (index: number) => {
    setEditSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, patch: Partial<SiteInductionStep>) => {
    setEditSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  if (editing || !induction) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Induction Title</label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Site Induction"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div className="space-y-3">
          {editSteps.map((step, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Step {i + 1}</span>
                {editSteps.length > 1 && (
                  <button
                    onClick={() => removeStep(i)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => updateStep(i, { title: e.target.value })}
                  placeholder="e.g. Site Hazards"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Content</label>
                <textarea
                  value={step.content}
                  onChange={(e) => updateStep(i, { content: e.target.value })}
                  rows={3}
                  placeholder="Describe this section of the induction..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={step.requires_acknowledgement}
                  onChange={(e) => updateStep(i, { requires_acknowledgement: e.target.checked })}
                  className="rounded"
                />
                <span className="text-xs text-slate-600">Require worker to tick &ldquo;I acknowledge&rdquo; on this step</span>
              </label>
            </div>
          ))}
        </div>

        <button
          onClick={addStep}
          className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors"
        >
          + Add Step
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !editTitle.trim() || editSteps.some((s) => !s.title.trim() || !s.content.trim())}
            className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            {saving ? "Saving…" : "Save Induction"}
          </button>
          {induction && (
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${induction.is_active ? "bg-violet-50 border-violet-200" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex items-center gap-2">
          {induction.is_active ? (
            <>
              <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-sm font-semibold text-violet-800">Active — shown to first-time visitors</span>
            </>
          ) : (
            <span className="text-sm font-medium text-slate-500">Inactive — not shown to visitors</span>
          )}
        </div>
        <button
          onClick={handleToggleActive}
          disabled={toggling}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
            induction.is_active
              ? "bg-white border border-slate-200 text-slate-600 hover:text-red-600"
              : "bg-violet-600 text-white hover:bg-violet-700"
          }`}
        >
          {toggling ? "…" : induction.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>

      {/* Step summary */}
      <div>
        <p className="text-sm font-semibold text-slate-900 mb-2">{induction.title}</p>
        <div className="space-y-2">
          {induction.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
              <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{step.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{step.content}</p>
                {step.requires_acknowledgement && (
                  <span className="mt-1 inline-block text-xs text-violet-600 font-medium">Requires acknowledgement</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          setEditTitle(induction.title);
          setEditSteps(induction.steps.length > 0 ? induction.steps : [EMPTY_STEP()]);
          setEditing(true);
        }}
        className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        Edit Induction
      </button>
    </div>
  );
}
