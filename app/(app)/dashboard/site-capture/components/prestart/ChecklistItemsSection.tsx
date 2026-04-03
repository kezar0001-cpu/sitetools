"use client";

import { useState, useEffect } from "react";
import type {
  ChecklistItem,
  ChecklistCategory,
  ChecklistStatus,
  ChecklistDefect,
  DefectSeverity,
} from "@/lib/site-capture/types";
import { SectionHeader } from "../SectionHeader";

interface ChecklistItemsSectionProps {
  items: ChecklistItem[];
  defects: ChecklistDefect[];
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (items: ChecklistItem[], defects: ChecklistDefect[]) => void;
}

const CHECKLIST_CATEGORIES: {
  id: ChecklistCategory;
  label: string;
  items: string[];
}[] = [
  {
    id: "engine-drive",
    label: "Engine & Drive",
    items: [
      "Oil level - check and top up if needed",
      "Coolant level - check and top up if needed",
      "Fuel level - check and refuel if needed",
      "Drive belts - check for wear/tension",
    ],
  },
  {
    id: "brakes-steering",
    label: "Brakes & Steering",
    items: [
      "Service brake - test operation",
      "Park brake - test and engage",
      "Steering - check for free play and operation",
    ],
  },
  {
    id: "lights-signals",
    label: "Lights & Signals",
    items: [
      "Headlights - check operation",
      "Indicators - check all directions",
      "Reversing alarm - test operation",
      "Warning beacon - check operation",
    ],
  },
  {
    id: "safety-devices",
    label: "Safety Devices",
    items: [
      "Seatbelt - check condition and operation",
      "ROPS/FOPS - check for damage",
      "Fire extinguisher - present and charged",
      "First aid kit - present and stocked",
    ],
  },
  {
    id: "tyres-tracks",
    label: "Tyres & Tracks",
    items: [
      "Tyre condition - check for cuts/damage",
      "Tyre pressure - check all tyres",
      "Track condition - check for wear/damage",
    ],
  },
  {
    id: "hydraulics",
    label: "Hydraulics",
    items: [
      "Hydraulic hoses - check for leaks/cracks",
      "Hydraulic cylinders - check for leaks",
      "Hydraulic leaks - none visible",
    ],
  },
];

const DEFAULT_CHECKLIST: ChecklistItem[] = CHECKLIST_CATEGORIES.flatMap(
  (cat) =>
    cat.items.map((label) => ({
      id: `${cat.id}-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      category: cat.id,
      label,
      status: "pass" as ChecklistStatus,
      defectNote: null,
    }))
);

function getStatusColor(status: ChecklistStatus): string {
  switch (status) {
    case "pass":
      return "bg-emerald-500 border-emerald-500";
    case "fail":
      return "bg-red-500 border-red-500";
    case "na":
      return "bg-slate-300 border-slate-300";
    default:
      return "bg-slate-200 border-slate-200";
  }
}

function getStatusLabel(status: ChecklistStatus): string {
  switch (status) {
    case "pass":
      return "Pass";
    case "fail":
      return "Fail";
    case "na":
      return "N/A";
    default:
      return "Select";
  }
}

export function ChecklistItemsSection({
  items,
  defects,
  isLocked,
  isOpen,
  onToggle,
  onUpdate,
}: ChecklistItemsSectionProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    items.length > 0 ? items : DEFAULT_CHECKLIST
  );
  const [openDefectNotes, setOpenDefectNotes] = useState<Set<string>>(
    () =>
      new Set(
        items
          .filter((i) => i.status === "fail" && i.defectNote)
          .map((i) => i.id)
      )
  );

  // Initialize if empty
  useEffect(() => {
    if (items.length === 0) {
      onUpdate(DEFAULT_CHECKLIST, defects);
    }
  }, []);

  // Sync with parent
  useEffect(() => {
    setChecklist(items.length > 0 ? items : DEFAULT_CHECKLIST);
  }, [items]);

  function updateItemStatus(
    itemId: string,
    status: ChecklistStatus,
    defectNote?: string
  ) {
    const updated = checklist.map((item) => {
      if (item.id === itemId) {
        return { ...item, status, defectNote: defectNote ?? item.defectNote };
      }
      return item;
    });
    setChecklist(updated);

    // Auto-open defect note field if fail
    if (status === "fail") {
      setOpenDefectNotes((prev) => new Set([...prev, itemId]));
    } else {
      setOpenDefectNotes((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }

    // Update defects list
    const item = updated.find((i) => i.id === itemId);
    let updatedDefects = [...defects];

    if (status === "fail" && item) {
      // Add or update defect
      const existingDefectIndex = defects.findIndex(
        (d) => d.checklistItemId === itemId
      );
      const newDefect: Omit<ChecklistDefect, "id" | "createdAt"> = {
        checklistItemId: itemId,
        description: defectNote || item.label,
        severity: "minor",
        photos: [],
        clearedBeforeOperation: false,
      };

      if (existingDefectIndex >= 0) {
        updatedDefects[existingDefectIndex] = {
          ...updatedDefects[existingDefectIndex],
          description: defectNote || item.label,
        };
      } else {
        updatedDefects.push({
          ...newDefect,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // Remove defect if not fail
      updatedDefects = defects.filter((d) => d.checklistItemId !== itemId);
    }

    onUpdate(updated, updatedDefects);
  }

  function updateDefectNote(itemId: string, note: string) {
    const updated = checklist.map((item) => {
      if (item.id === itemId) {
        return { ...item, defectNote: note };
      }
      return item;
    });
    setChecklist(updated);

    // Also update the defect description
    const updatedDefects = defects.map((d) => {
      if (d.checklistItemId === itemId) {
        return { ...d, description: note || checklist.find((i) => i.id === itemId)?.label || "" };
      }
      return d;
    });

    onUpdate(updated, updatedDefects);
  }

  const failCount = checklist.filter((i) => i.status === "fail").length;
  const completedCount = checklist.filter((i) => i.status !== null).length;
  const totalCount = checklist.length;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Prestart Checklist"
          icon={
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={failCount > 0 ? failCount : undefined}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100">
          <div className="mt-4 mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {completedCount} of {totalCount} items checked
            </p>
            {failCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {failCount} issue{failCount !== 1 ? "s" : ""} found
              </span>
            )}
          </div>

          <div className="space-y-6">
            {CHECKLIST_CATEGORIES.map((category) => {
              const categoryItems = checklist.filter(
                (i) => i.category === category.id
              );
              return (
                <div key={category.id} className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
                    {category.label}
                  </h4>
                  <div className="space-y-3">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm text-slate-700 flex-1">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1">
                            {(["pass", "fail", "na"] as ChecklistStatus[]).map(
                              (status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() =>
                                    updateItemStatus(item.id, status)
                                  }
                                  disabled={isLocked}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    item.status === status
                                      ? status === "pass"
                                        ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                                        : status === "fail"
                                        ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                                        : "bg-slate-100 text-slate-600 ring-1 ring-slate-300"
                                      : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
                                  } disabled:opacity-50`}
                                >
                                  {getStatusLabel(status)}
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Defect note field - shown when fail or has existing note */}
                        {(openDefectNotes.has(item.id) ||
                          (item.status === "fail" && item.defectNote)) && (
                          <div className="pl-4 border-l-2 border-red-200">
                            <textarea
                              rows={2}
                              value={item.defectNote || ""}
                              onChange={(e) =>
                                updateDefectNote(item.id, e.target.value)
                              }
                              disabled={isLocked}
                              placeholder="Describe the defect or issue..."
                              className="w-full rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none disabled:bg-slate-100"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
