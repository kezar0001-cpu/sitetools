"use client";

import { useEffect, useState } from "react";
import {
  getInductionForSite,
  upsertInduction,
  activateInduction,
  deactivateInduction,
} from "@/lib/workspace/client";
import {
  createChecklistItem,
  createContact,
  createDefaultInductionSections,
  DEFAULT_EMERGENCY_INFO,
  normalizeInductionSections,
  type SiteInduction,
  type SiteInductionSection,
  type VisitorType,
  visitorTypeOptions,
} from "@/lib/workspace/types";

interface SiteInductionPanelProps {
  siteId: string;
  companyId: string;
  onConfiguredChange?: (isConfigured: boolean) => void;
}

export function SiteInductionPanel({ siteId, companyId, onConfiguredChange }: SiteInductionPanelProps) {
  const [induction, setInduction] = useState<SiteInduction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [editing, setEditing] = useState(false);

  const [editTitle, setEditTitle] = useState("Site Induction");
  const [editSections, setEditSections] = useState<SiteInductionSection[]>(createDefaultInductionSections());
  const [editAppliesTo, setEditAppliesTo] = useState<VisitorType[]>([]);
  const [editRevision, setEditRevision] = useState(1);
  const [editRequiresReacceptance, setEditRequiresReacceptance] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInductionForSite(siteId);
      setInduction(data);
      if (data) {
        setEditTitle(data.title);
        setEditSections(normalizeInductionSections(data));
        setEditAppliesTo(data.applies_to_visitor_types ?? []);
        setEditRevision(data.revision_number ?? 1);
        setEditRequiresReacceptance(data.requires_reacceptance_on_revision ?? true);
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
    if (!editTitle.trim() || editSections.some((s) => !s.title.trim())) return;
    setSaving(true);
    try {
      const steps = editSections.map((section, i) => ({
        step_number: i + 1,
        title: section.title,
        content: section.description,
        requires_acknowledgement: section.requires_acknowledgement,
      }));
      const saved = await upsertInduction({
        id: induction?.id,
        site_id: siteId,
        company_id: companyId,
        title: editTitle,
        steps,
        sections: editSections,
        applies_to_visitor_types: editAppliesTo,
        revision_number: editRevision,
        requires_reacceptance_on_revision: editRequiresReacceptance,
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

  const updateSection = (index: number, patch: Partial<SiteInductionSection>) => {
    setEditSections((prev) => prev.map((section, i) => (i === index ? { ...section, ...patch } : section)));
  };

  const removeSection = (index: number) => {
    setEditSections((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAudience = (type: VisitorType) => {
    setEditAppliesTo((prev) => (prev.includes(type) ? prev.filter((value) => value !== type) : [...prev, type]));
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Revision</label>
            <input
              type="number"
              min={1}
              value={editRevision}
              onChange={(e) => setEditRevision(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={editRequiresReacceptance}
              onChange={(e) => setEditRequiresReacceptance(e.target.checked)}
              className="rounded"
            />
            Require re-induction when revision changes
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Show this induction for</label>
          <div className="flex flex-wrap gap-2">
            {visitorTypeOptions.map((type) => {
              const active = editAppliesTo.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleAudience(type)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {type}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">Leave all unselected to show the induction to everyone.</p>
        </div>

        <div className="space-y-3">
          {editSections.map((section, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Section {i + 1} · {section.type}</span>
                {editSections.length > 1 && (
                  <button
                    onClick={() => removeSection(i)}
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
                  value={section.title}
                  onChange={(e) => updateSection(i, { title: e.target.value })}
                  placeholder="e.g. Emergency Information"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Summary / Instructions</label>
                <textarea
                  value={section.description}
                  onChange={(e) => updateSection(i, { description: e.target.value })}
                  rows={3}
                  placeholder="Describe the information shown in this section..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>
              {section.type === "contacts" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-600">Site Contacts</label>
                    <button
                      type="button"
                      onClick={() => updateSection(i, { contacts: [...(section.contacts ?? []), createContact()] })}
                      className="text-xs font-medium text-violet-600 hover:text-violet-700"
                    >
                      + Add contact
                    </button>
                  </div>
                  {(section.contacts ?? []).map((contact, contactIndex) => (
                    <div key={contact.id} className="grid gap-2 sm:grid-cols-3">
                      <input
                        type="text"
                        value={contact.role}
                        onChange={(e) => updateSection(i, { contacts: (section.contacts ?? []).map((item, idx) => idx === contactIndex ? { ...item, role: e.target.value } : item) })}
                        placeholder="Role"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => updateSection(i, { contacts: (section.contacts ?? []).map((item, idx) => idx === contactIndex ? { ...item, name: e.target.value } : item) })}
                        placeholder="Name"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={contact.phone}
                        onChange={(e) => updateSection(i, { contacts: (section.contacts ?? []).map((item, idx) => idx === contactIndex ? { ...item, phone: e.target.value } : item) })}
                        placeholder="Phone"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
              {section.type === "emergency" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(section.emergency ?? DEFAULT_EMERGENCY_INFO).map(([key, value]) => (
                    <input
                      key={key}
                      type="text"
                      value={value}
                      onChange={(e) => updateSection(i, { emergency: { ...(section.emergency ?? DEFAULT_EMERGENCY_INFO), [key]: e.target.value } })}
                      placeholder={key.replace(/_/g, " ")}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  ))}
                </div>
              )}
              {(section.type === "hazards" || section.type === "rules" || section.type === "permits" || section.type === "environment") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-600">Checklist items</label>
                    <button
                      type="button"
                      onClick={() => updateSection(i, { items: [...(section.items ?? []), createChecklistItem()] })}
                      className="text-xs font-medium text-violet-600 hover:text-violet-700"
                    >
                      + Add item
                    </button>
                  </div>
                  {(section.items ?? []).map((item, itemIndex) => (
                    <div key={item.id} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateSection(i, { items: (section.items ?? []).map((entry, idx) => idx === itemIndex ? { ...entry, title: e.target.value } : entry) })}
                        placeholder="Item title"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <textarea
                        value={item.description}
                        onChange={(e) => updateSection(i, { items: (section.items ?? []).map((entry, idx) => idx === itemIndex ? { ...entry, description: e.target.value } : entry) })}
                        rows={2}
                        placeholder="Item description"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={section.requires_acknowledgement}
                  onChange={(e) => updateSection(i, { requires_acknowledgement: e.target.checked })}
                  className="rounded"
                />
                <span className="text-xs text-slate-600">Require worker acknowledgement for this section</span>
              </label>
            </div>
          ))}
        </div>

        <button
          onClick={() => setEditSections((prev) => [...prev, {
            id: `custom-${prev.length + 1}`,
            type: "welcome",
            title: "New section",
            description: "",
            requires_acknowledgement: true,
          }])}
          className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors"
        >
          + Add Section
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !editTitle.trim() || editSections.some((s) => !s.title.trim())}
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
        <div className="mb-3 flex flex-wrap gap-2">
          {(induction.applies_to_visitor_types ?? []).length > 0 ? (induction.applies_to_visitor_types ?? []).map((type) => (
            <span key={type} className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">{type}</span>
          )) : <span className="text-xs text-slate-500">Applies to all visitor types</span>}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Revision {induction.revision_number ?? 1}</span>
        </div>
        <div className="space-y-2">
          {normalizeInductionSections(induction).map((section, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
              <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{section.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{section.description}</p>
                {section.requires_acknowledgement && (
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
          setEditSections(normalizeInductionSections(induction));
          setEditAppliesTo(induction.applies_to_visitor_types ?? []);
          setEditRevision(induction.revision_number ?? 1);
          setEditRequiresReacceptance(induction.requires_reacceptance_on_revision ?? true);
          setEditing(true);
        }}
        className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        Edit Induction
      </button>
    </div>
  );
}
