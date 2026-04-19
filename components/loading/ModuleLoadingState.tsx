import { Skeleton } from "@/components/ui/Skeleton";

export type LoadingVariant = "skeleton" | "spinner" | "pulse";

interface ModuleLoadingStateProps {
  variant?: LoadingVariant;
  size?: "sm" | "md" | "lg" | "xl";
  count?: number;
  className?: string;
  message?: string;
  fullPage?: boolean;
}

const sizeMap = {
  sm: "h-6 w-6 border-[2px]",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
  xl: "h-16 w-16 border-4",
};

export function ModuleLoadingState({
  variant = "spinner",
  size = "md",
  count = 3,
  className = "",
  message,
  fullPage = false,
}: ModuleLoadingStateProps) {
  // Full-page spinner wrapper
  if (variant === "spinner" && fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={`${sizeMap[size]} rounded-full border-slate-200 border-t-amber-500 animate-spin ${className}`} />
        {message && (
          <p className="mt-4 text-sm text-slate-500 font-medium">{message}</p>
        )}
      </div>
    );
  }

  // Inline spinner
  if (variant === "spinner") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className={`${sizeMap[size]} rounded-full border-slate-200 border-t-amber-500 animate-spin`} />
        {message && (
          <span className="ml-3 text-sm text-slate-500">{message}</span>
        )}
      </div>
    );
  }

  // Skeleton variant for cards and tables
  if (variant === "skeleton") {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl bg-zinc-800" />
        ))}
      </div>
    );
  }

  // Pulse variant for lists and cards
  if (variant === "pulse") {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-slate-200 animate-pulse"
          />
        ))}
        {message && (
          <p className="text-center text-sm text-slate-500">{message}</p>
        )}
      </div>
    );
  }

  return null;
}

// Specialized loading components for common patterns
export function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded bg-zinc-800" />
        <Skeleton className="h-4 w-32 rounded bg-zinc-800" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-14 rounded bg-zinc-800" />
              <Skeleton className="h-3 w-24 rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Activity feed skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <Skeleton className="h-5 w-32 rounded bg-zinc-800" />
        </div>
        <div className="divide-y divide-zinc-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-2 w-2 rounded-full shrink-0 bg-zinc-800" />
              <Skeleton className="h-4 flex-1 rounded bg-zinc-800" />
              <Skeleton className="h-3 w-16 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TableLoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="h-4 w-32 rounded bg-zinc-800" />
          <Skeleton className="h-4 w-24 rounded bg-zinc-800" />
          <Skeleton className="h-4 flex-1 rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

export function CardGridLoadingState({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <Skeleton className="h-8 w-8 rounded bg-zinc-800" />
          <Skeleton className="h-5 w-3/4 rounded bg-zinc-800" />
          <Skeleton className="h-4 w-1/2 rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}
