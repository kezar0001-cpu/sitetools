"use client";

import { useState, useCallback } from "react";
import { SectionHeader } from "../SectionHeader";
import type { SiteRuleItem } from "@/lib/site-capture/induction-types";
import { getSiteRulesProgress } from "@/lib/site-capture/induction-types";

interface SiteRulesSectionProps {
  siteRules: SiteRuleItem[];
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (rules: SiteRuleItem[]) => void;
}

const CATEGORY_ICONS: Record<SiteRuleItem["category"], string> = {
  ppe: "🦺",
  zone: "🚧",
  procedure: "📋",
  policy: "📜",
};

const CATEGORY_LABELS: Record<SiteRuleItem["category"], string> = {
  ppe: "PPE Requirements",
  zone: "No-Go Zones",
  procedure: "Procedures",
  policy: "Policies",
};

export function SiteRulesSection({
  siteRules,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
}: SiteRulesSectionProps) {
  const [localRules, setLocalRules] = useState(siteRules);

  const handleToggle = useCallback(
    (index: number) => {
      if (isLocked) return;

      const updated = localRules.map((rule, i) =>
        i === index ? { ...rule, acknowledged: !rule.acknowledged } : rule
      );

      setLocalRules(updated);
      onUpdate(updated);
    },
    [localRules, onUpdate, isLocked]
  );

  const progress = getSiteRulesProgress(siteRules);
  const progressPercent = progress.total > 0 ? (progress.acknowledged / progress.total) * 100 : 0;

  // Group rules by category
  const groupedRules = localRules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<SiteRuleItem["category"], SiteRuleItem[]>);

  const categories: SiteRuleItem["category"][] = ["ppe", "zone", "procedure", "policy"];

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Site Rules"
          icon={
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={progress.acknowledged < progress.total ? progress.total - progress.acknowledged : undefined}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4 space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Progress: {progress.acknowledged} of {progress.total} acknowledged
              </span>
              <span className={`font-semibold ${progress.acknowledged === progress.total ? "text-emerald-600" : "text-amber-600"}`}>
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress.acknowledged === progress.total ? "bg-emerald-500" : "bg-amber-400"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Rules by Category */}
          {categories.map((category) => {
            const rules = groupedRules[category] || [];
            if (rules.length === 0) return null;

            const categoryAcknowledged = rules.filter((r) => r.acknowledged).length;

            return (
              <div key={category} className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span>{CATEGORY_ICONS[category]}</span>
                  {CATEGORY_LABELS[category]}
                  <span className="text-xs font-normal text-slate-500">
                    ({categoryAcknowledged}/{rules.length})
                  </span>
                </h4>
                <div className="space-y-2 pl-2">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        rule.acknowledged
                          ? "bg-emerald-50/50 border-emerald-100"
                          : "bg-white border-slate-200 hover:border-amber-300"
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <div className="flex-shrink-0 pt-0.5">
                          <input
                            type="checkbox"
                            checked={rule.acknowledged}
                            onChange={() => handleToggle(localRules.findIndex((r) => r.id === rule.id))}
                            disabled={isLocked}
                            className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-slate-800">{rule.name}</span>
                          <p className="text-sm text-slate-600">{rule.description}</p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Warning if not all acknowledged */}
          {progress.acknowledged < progress.total && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-amber-800">
                All site rules must be acknowledged before completing the induction.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
