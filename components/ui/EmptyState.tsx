"use client";

import Link from "next/link";

interface EmptyStateAction {
    label: string;
    onClick?: () => void;
    href?: string;
}

export interface EmptyStateProps {
    icon: string;
    title: string;
    description?: string;
    action?: EmptyStateAction;
    className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={`text-center py-10 px-4 ${className ?? ""}`}>
            <div className="text-5xl mb-3 leading-none">{icon}</div>
            <p className="font-bold text-slate-700">{title}</p>
            {description && (
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">{description}</p>
            )}
            {action && (
                <div className="mt-5">
                    {action.href ? (
                        <Link
                            href={action.href}
                            className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors"
                        >
                            {action.label}
                        </Link>
                    ) : (
                        <button
                            onClick={action.onClick}
                            className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors"
                        >
                            {action.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
