"use client";

import { visitorTypes, type VisitorType } from "@/lib/validation/schemas";

export type RecordStatusFilter = "all" | "onSite" | "signedOut";
export type DateRangeFilter = "all" | "today" | "week";

export interface FilterPreset {
  label: string;
  status: RecordStatusFilter;
  dateRange: DateRangeFilter;
  icon: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { label: "Currently On Site", status: "onSite", dateRange: "all", icon: "👷" },
  { label: "Today's Sign-Ins", status: "all", dateRange: "today", icon: "📅" },
  { label: "This Week", status: "all", dateRange: "week", icon: "📆" },
  { label: "All History", status: "all", dateRange: "all", icon: "📊" },
];

interface VisitFiltersProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  filterDate: string;
  onFilterDateChange: (value: string) => void;
  filterType: VisitorType | "";
  onFilterTypeChange: (value: VisitorType | "") => void;
  filterStatus: RecordStatusFilter;
  onFilterStatusChange: (value: RecordStatusFilter) => void;
  dateRange: DateRangeFilter;
  onDateRangeChange: (value: DateRangeFilter) => void;
  onApplyPreset: (preset: FilterPreset) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  activePresetLabel: string | null;
}

export function VisitFilters({
  searchText,
  onSearchChange,
  filterDate,
  onFilterDateChange,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  dateRange,
  onDateRangeChange,
  onApplyPreset,
  onClearFilters,
  hasActiveFilters,
  activePresetLabel,
}: VisitFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Quick Filter Presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold text-slate-500 self-center mr-1">Quick filters:</span>
        {FILTER_PRESETS.map((preset) => {
          const isActive = activePresetLabel === preset.label;
          return (
            <button
              key={preset.label}
              onClick={() => onApplyPreset(preset)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-700"
              }`}
              title={preset.label}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          );
        })}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <span>✕</span>
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Detailed Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Search</label>
          <input
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Name, company, mobile..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => onFilterDateChange(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Visitor Type</label>
          <select
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value as VisitorType | "")}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
          >
            <option value="">All types</option>
            {visitorTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value as RecordStatusFilter)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
          >
            <option value="all">All statuses</option>
            <option value="onSite">Currently on site</option>
            <option value="signedOut">Signed out</option>
          </select>
        </div>
      </div>
    </div>
  );
}
