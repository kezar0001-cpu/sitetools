"use client";

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-slate-100 animate-pulse">
      <div className="h-4 w-4 bg-slate-200 rounded" />
      <div className="h-3 w-10 bg-slate-200 rounded" />
      <div className="h-3 flex-1 bg-slate-200 rounded" />
      <div className="h-5 w-16 bg-slate-200 rounded-full" />
      <div className="h-3 w-8 bg-slate-200 rounded" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 animate-pulse">
      <div className="h-5 w-3/4 bg-slate-200 rounded" />
      <div className="h-3 w-1/2 bg-slate-200 rounded" />
      <div className="h-2 w-full bg-slate-100 rounded-full" />
      <div className="flex items-center gap-2">
        <div className="h-5 w-16 bg-slate-200 rounded-full" />
        <div className="h-3 w-12 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function ProjectGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
