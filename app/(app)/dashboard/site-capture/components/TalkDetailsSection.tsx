"use client";

import { useState, useCallback, FormEvent } from "react";
import type { ToolboxTalkFull, ToolboxTalkData } from "@/lib/site-capture/types";
import { TOOLBOX_TALK_CATEGORIES, ToolboxTalkCategory } from "@/lib/site-capture/types";
import { SectionHeader } from "./SectionHeader";

interface Props {
  diary: ToolboxTalkFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<ToolboxTalkData>) => Promise<void>;
  saving?: boolean;
}

export function TalkDetailsSection({ diary, isLocked, isOpen, onToggle, onUpdate, saving }: Props) {
  const data = diary.toolbox_talk_data ?? {} as ToolboxTalkData;
  
  const [formData, setFormData] = useState({
    talk_date: data.talk_date ?? diary.date,
    talk_time: data.talk_time ?? "",
    location: data.location ?? "",
    conducted_by_name: data.conducted_by_name ?? "",
    conducted_by_role: data.conducted_by_role ?? "",
    topic_title: data.topic_title ?? "",
    topic_category: data.topic_category ?? "",
    duration_minutes: data.duration_minutes?.toString() ?? "",
  });

  const [isDirty, setIsDirty] = useState(false);

  const handleChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!isDirty || saving) return;

    await onUpdate({
      talk_date: formData.talk_date,
      talk_time: formData.talk_time || null,
      location: formData.location || null,
      conducted_by_name: formData.conducted_by_name || null,
      conducted_by_role: formData.conducted_by_role || null,
      topic_title: formData.topic_title || null,
      topic_category: (formData.topic_category as ToolboxTalkCategory) || null,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes, 10) : null,
    });
    setIsDirty(false);
  }, [formData, isDirty, saving, onUpdate]);

  const completedCount = [
    formData.topic_title,
    formData.talk_date,
    formData.conducted_by_name,
  ].filter(Boolean).length;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <SectionHeader
        title="Talk Details"
        icon={
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        open={isOpen}
        onToggle={onToggle}
        badge={completedCount > 0 ? `${completedCount}/4` : undefined}
        required
      />

      {isOpen && (
        <form onSubmit={handleSubmit} className="px-4 pb-5 border-t border-slate-100">
          <div className="pt-4 space-y-4">
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.talk_date}
                  onChange={(e) => handleChange("talk_date", e.target.value)}
                  disabled={isLocked}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.talk_time}
                  onChange={(e) => handleChange("talk_time", e.target.value)}
                  disabled={isLocked}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location on Site
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                disabled={isLocked}
                placeholder="e.g., Site office, Level 3 east wing"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
              />
            </div>

            {/* Conducted By */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Conducted By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.conducted_by_name}
                  onChange={(e) => handleChange("conducted_by_name", e.target.value)}
                  disabled={isLocked}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={formData.conducted_by_role}
                  onChange={(e) => handleChange("conducted_by_role", e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g., Site Supervisor"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Topic Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.topic_title}
                onChange={(e) => handleChange("topic_title", e.target.value)}
                disabled={isLocked}
                placeholder="e.g., Working at Heights Safety"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                required
              />
            </div>

            {/* Category and Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.topic_category}
                  onChange={(e) => handleChange("topic_category", e.target.value)}
                  disabled={isLocked}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                >
                  <option value="">Select category...</option>
                  {TOOLBOX_TALK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={formData.duration_minutes}
                  onChange={(e) => handleChange("duration_minutes", e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g., 15"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Save Button */}
            {!isLocked && isDirty && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Details"}
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
