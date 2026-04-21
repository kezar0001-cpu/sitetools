"use client";

interface StatItemProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatItemProps) {
  return (
    <div className="border border-slate-200 rounded-xl px-4 py-3">
      <p className="text-xs uppercase tracking-wide font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

interface StatsPanelProps {
  onSiteCount: number;
  todayCount: number;
  recordsShown: number;
  totalFiltered?: number; // Total records matching filters (vs displayed count)
}

export function StatsPanel({ onSiteCount, todayCount, recordsShown, totalFiltered }: StatsPanelProps) {
  const hasMore = totalFiltered !== undefined && totalFiltered > recordsShown;
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label="On Site Now" value={String(onSiteCount)} />
      <Stat label="Sign-Ins Today" value={String(todayCount)} />
      <Stat 
        label="Records Shown" 
        value={hasMore ? `${recordsShown} of ${totalFiltered}` : String(recordsShown)} 
      />
    </div>
  );
}
