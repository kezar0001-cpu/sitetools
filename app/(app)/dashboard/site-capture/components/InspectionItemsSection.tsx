"use client";

import { useState, useCallback } from "react";
import { SectionHeader } from "./SectionHeader";
import {
  INSPECTION_ITEM_RESULTS,
  INSPECTION_RESULT_BADGES,
  DEFAULT_INSPECTION_CHECKLISTS,
} from "@/lib/site-capture/types";
import type { SiteDiaryFull, InspectionItem, InspectionItemResult, InspectionType } from "@/lib/site-capture/types";

interface InspectionItemsSectionProps {
  diary: SiteDiaryFull;
  isLocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  items: InspectionItem[];
  inspectionType: InspectionType;
  onItemsChange: (items: InspectionItem[]) => void;
  onResultChange?: (itemId: string, result: InspectionItemResult) => void;
}

export function InspectionItemsSection({
  isLocked,
  isOpen,
  onToggle,
  items,
  inspectionType,
  onItemsChange,
  onResultChange,
}: InspectionItemsSectionProps) {
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemReference, setNewItemReference] = useState("");

  const loadDefaultChecklist = useCallback(() => {
    const defaultItems = DEFAULT_INSPECTION_CHECKLISTS[inspectionType] || [];
    const newItems: InspectionItem[] = defaultItems.map((item, index) => ({
      id: `temp-${Date.now()}-${index}`,
      diary_id: "",
      item_number: items.length + index + 1,
      description: item.description,
      reference: item.reference,
      result: "N/A",
      comments: null,
      photo_paths: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    onItemsChange([...items, ...newItems]);
  }, [inspectionType, items, onItemsChange]);

  const addItem = () => {
    if (!newItemDescription.trim()) return;
    const newItem: InspectionItem = {
      id: `temp-${Date.now()}`,
      diary_id: "",
      item_number: items.length + 1,
      description: newItemDescription.trim(),
      reference: newItemReference.trim() || null,
      result: "N/A",
      comments: null,
      photo_paths: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onItemsChange([...items, newItem]);
    setNewItemDescription("");
    setNewItemReference("");
  };

  const removeItem = (id: string) => {
    const filtered = items.filter((item) => item.id !== id);
    // Renumber items
    const renumbered = filtered.map((item, index) => ({
      ...item,
      item_number: index + 1,
    }));
    onItemsChange(renumbered);
  };

  const updateItemResult = (id: string, result: InspectionItemResult) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, result, updated_at: new Date().toISOString() } : item
    );
    onItemsChange(updated);
    onResultChange?.(id, result);
  };

  const updateItemComments = (id: string, comments: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, comments: comments || null, updated_at: new Date().toISOString() } : item
    );
    onItemsChange(updated);
  };

  const failCount = items.filter((i) => i.result === "Fail").length;
  const observationCount = items.filter((i) => i.result === "Observation").length;
  const passCount = items.filter((i) => i.result === "Pass").length;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4">
        <SectionHeader
          title="Inspection Checklist"
          icon={
            <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
          open={isOpen}
          onToggle={onToggle}
          badge={items.length}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4">
          {/* Summary stats */}
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                {passCount} Pass
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {failCount} Fail
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {observationCount} Observation
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                {items.length - passCount - failCount - observationCount} N/A
              </span>
            </div>
          )}

          {/* Items list */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border ${
                  item.result === "Fail"
                    ? "border-red-200 bg-red-50"
                    : item.result === "Observation"
                    ? "border-amber-200 bg-amber-50"
                    : item.result === "Pass"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-slate-300 flex items-center justify-center text-xs font-medium text-slate-600">
                    {item.item_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{item.description}</p>
                    {item.reference && (
                      <p className="text-xs text-slate-500 mt-0.5">Ref: {item.reference}</p>
                    )}
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex-shrink-0 p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Result selection */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {INSPECTION_ITEM_RESULTS.map((result) => (
                    <button
                      key={result}
                      onClick={() => updateItemResult(item.id, result)}
                      disabled={isLocked}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        item.result === result
                          ? INSPECTION_RESULT_BADGES[result]
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {result}
                    </button>
                  ))}
                </div>

                {/* Comments */}
                <div className="mt-2">
                  <input
                    type="text"
                    value={item.comments || ""}
                    onChange={(e) => updateItemComments(item.id, e.target.value)}
                    disabled={isLocked}
                    placeholder="Comments (optional)"
                    className="w-full text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add new item */}
          {!isLocked && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Add inspection item description..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addItem();
                  }}
                />
                <input
                  type="text"
                  value={newItemReference}
                  onChange={(e) => setNewItemReference(e.target.value)}
                  placeholder="Reference (optional)"
                  className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                />
                <button
                  onClick={addItem}
                  disabled={!newItemDescription.trim()}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Load default checklist */}
              <button
                onClick={loadDefaultChecklist}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-600 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 transition-colors"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Load default {inspectionType} checklist
                </span>
              </button>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-sm">No inspection items yet</p>
              {!isLocked && (
                <p className="text-xs text-slate-400 mt-1">Add items above or load a default checklist</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
