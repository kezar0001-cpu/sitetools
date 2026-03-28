"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface EmptyStateAction {
    label: string;
    onClick?: () => void;
    href?: string;
    /** Tailwind classes for the button. Defaults to amber primary style. */
    className?: string;
}

export interface EmptyStateProps {
    /**
     * Emoji string (legacy) or a Lucide icon component.
     * e.g. icon="📋"  or  icon={ClipboardList}
     */
    icon: string | LucideIcon;
    /** Primary heading text. Alias: title (legacy). */
    heading?: string;
    /** @deprecated Use heading instead */
    title?: string;
    /** Secondary body text. Alias: description (legacy). */
    subtext?: string;
    /** @deprecated Use subtext instead */
    description?: string;
    /** Single primary action button (legacy). */
    action?: EmptyStateAction;
    className?: string;
    /** Extra content rendered below the subtext/action — use for multi-button layouts. */
    children?: React.ReactNode;
}

const DEFAULT_BTN =
    "inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors";

export function EmptyState({
    icon,
    heading,
    title,
    subtext,
    description,
    action,
    className,
    children,
}: EmptyStateProps) {
    const displayTitle = heading ?? title ?? "";
    const displaySubtext = subtext ?? description;
    const isLucideIcon = typeof icon !== "string";

    return (
        <div className={`text-center py-10 px-4 ${className ?? ""}`}>
            {isLucideIcon ? (
                <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                        {(() => {
                            const Icon = icon as LucideIcon;
                            return <Icon className="h-6 w-6 text-slate-400" />;
                        })()}
                    </div>
                </div>
            ) : (
                <div className="text-5xl mb-3 leading-none">{icon as string}</div>
            )}

            <p className="font-bold text-slate-700">{displayTitle}</p>

            {displaySubtext && (
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">{displaySubtext}</p>
            )}

            {action && (
                <div className="mt-5">
                    {action.href ? (
                        <Link href={action.href} className={action.className ?? DEFAULT_BTN}>
                            {action.label}
                        </Link>
                    ) : (
                        <button onClick={action.onClick} className={action.className ?? DEFAULT_BTN}>
                            {action.label}
                        </button>
                    )}
                </div>
            )}

            {children}
        </div>
    );
}
