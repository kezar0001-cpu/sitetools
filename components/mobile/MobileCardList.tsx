"use client";

import React from "react";

export interface MobileColumn<T> {
  key: string;
  header: string;
  width?: string;
  mobileVisible?: boolean;
  render: (item: T, isMobile: boolean) => React.ReactNode;
}

interface MobileCardListProps<T extends { id: string }> {
  data: T[];
  columns: MobileColumn<T>[];
  keyExtractor?: (item: T) => string;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  loadingRows?: number;
  cardClassName?: string;
  tableClassName?: string;
}

function SkeletonRow<T>({ columns }: { columns: MobileColumn<T>[] }) {
  return (
    <tr className="border-b border-slate-100">
      {columns.map((col) => (
        <td key={col.key} className="py-3 pr-3">
          <div className="h-4 bg-slate-200 rounded animate-pulse w-24" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-5 bg-slate-200 rounded animate-pulse w-32" />
        <div className="h-5 bg-slate-200 rounded animate-pulse w-16" />
      </div>
      <div className="h-4 bg-slate-200 rounded animate-pulse w-full" />
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-200 rounded animate-pulse w-24" />
        <div className="h-4 bg-slate-200 rounded animate-pulse w-20" />
      </div>
    </div>
  );
}

export function MobileCardList<T extends { id: string }>({
  data,
  columns,
  keyExtractor = (item) => item.id,
  emptyState,
  isLoading,
  loadingRows = 3,
  cardClassName = "",
  tableClassName = "",
}: MobileCardListProps<T>) {
  // Desktop Table View (visible on md and up)
  const renderTable = () => (
    <div className={`overflow-x-auto hidden md:block ${tableClassName}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-slate-200 text-slate-500 uppercase tracking-wide text-xs">
            {columns.map((col) => (
              <th key={col.key} className={`py-2 pr-3 ${col.width || ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <>
              {Array.from({ length: loadingRows }).map((_, i) => (
                <SkeletonRow<T> key={i} columns={columns} />
              ))}
            </>
          ) : (
            data.map((item) => (
              <tr key={keyExtractor(item)} className="border-b border-slate-100 align-top hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 pr-3">
                    {col.render(item, false)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Mobile Card View (visible below md breakpoint)
  const renderCards = () => (
    <div className={`block md:hidden space-y-3 ${cardClassName}`}>
      {isLoading ? (
        <>
          {Array.from({ length: loadingRows }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </>
      ) : (
        data.map((item) => {
          // Get primary column (first visible on mobile or first overall)
          const primaryCol = columns.find((c) => c.mobileVisible !== false) || columns[0];
          // Get secondary columns (others that are mobile visible)
          const secondaryCols = columns.filter((c) => c.key !== primaryCol.key && c.mobileVisible !== false);
          // Get action columns (last column typically has actions)
          const actionCol = columns[columns.length - 1];

          return (
            <div
              key={keyExtractor(item)}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors"
            >
              {/* Card Header: Primary info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {primaryCol.render(item, true)}
                </div>
                {actionCol && actionCol.key !== primaryCol.key && (
                  <div className="flex-shrink-0">
                    {actionCol.render(item, true)}
                  </div>
                )}
              </div>

              {/* Card Body: Secondary info */}
              {secondaryCols.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    {secondaryCols.slice(0, 4).map((col) => (
                      <div key={col.key} className="min-w-0">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">{col.header}</p>
                        <div className="text-sm text-slate-700 mt-0.5 truncate">
                          {col.render(item, true)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  if (!isLoading && data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {renderTable()}
      {renderCards()}
    </>
  );
}

// Utility components for common patterns
export function MobileCardHeader({
  title,
  subtitle,
  badge,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-slate-900 text-sm truncate">{title}</span>
        {badge && <span className="flex-shrink-0">{badge}</span>}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
    </div>
  );
}

export function MobileStatusBadge({
  status,
  variant = "neutral",
}: {
  status: string;
  variant?: "success" | "warning" | "error" | "neutral" | "info";
}) {
  const variants = {
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    error: "bg-red-100 text-red-700 border-red-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${variants[variant]}`}
    >
      {variant === "success" && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {status}
    </span>
  );
}

export function MobileActionButton({
  onClick,
  children,
  variant = "primary",
  size = "sm",
  disabled,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const baseStyles = "font-semibold rounded-lg transition-colors disabled:opacity-50";
  const sizeStyles = size === "sm" ? "text-xs px-2.5 py-1.5" : "text-sm px-3 py-2";
  const variants = {
    primary: "bg-slate-900 hover:bg-slate-800 text-white",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    danger: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200",
    ghost: "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${sizeStyles} ${variants[variant]}`}>
      {children}
    </button>
  );
}
