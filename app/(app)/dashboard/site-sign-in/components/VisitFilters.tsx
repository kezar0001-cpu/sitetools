"use client";

import { visitorTypes, type VisitorType } from "@/lib/validation/schemas";

export type RecordStatusFilter = "all" | "onSite" | "signedOut";
export type ExportRange = "all" | "today" | "week" | "month";

interface VisitFiltersProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  filterDate: string;
  onFilterDateChange: (value: string) => void;
  filterType: VisitorType | "";
  onFilterTypeChange: (value: VisitorType | "") => void;
  filterStatus: RecordStatusFilter;
  onFilterStatusChange: (value: RecordStatusFilter) => void;
  exportRange: ExportRange;
  onExportRangeChange: (value: ExportRange) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
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
  exportRange,
  onExportRangeChange,
  onClearFilters,
  hasActiveFilters,
}: VisitFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <input
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search name, company, mobile"
        className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
      />
      <input
        type="date"
        value={filterDate}
        onChange={(e) => onFilterDateChange(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
      />
      <select
        value={filterType}
        onChange={(e) => onFilterTypeChange(e.target.value as VisitorType | "")}
        className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
      >
        <option value="">All visitor types</option>
        {visitorTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <select
        value={filterStatus}
        onChange={(e) => onFilterStatusChange(e.target.value as RecordStatusFilter)}
        className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
      >
        <option value="all">All statuses</option>
        <option value="onSite">Currently on site</option>
        <option value="signedOut">Signed out</option>
      </select>
      <select
        value={exportRange}
        onChange={(e) => onExportRangeChange(e.target.value as ExportRange)}
        className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
      >
        <option value="all">Export: All time</option>
        <option value="today">Export: Today</option>
        <option value="week">Export: Last 7 days</option>
        <option value="month">Export: Last 30 days</option>
      </select>
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline md:col-span-5 text-left"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
