"use client";

import { FileText, Users, AlertTriangle, ClipboardCheck, Clipboard, ShieldCheck, HelpCircle, ListChecks, MessageSquare } from "lucide-react";
import type { DocumentTemplate } from "@/lib/site-docs/types";

interface TemplateCardProps {
    template: DocumentTemplate;
    onClick: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "file-text": FileText,
    users: Users,
    "alert-triangle": AlertTriangle,
    "clipboard-check": ClipboardCheck,
    clipboard: Clipboard,
    "shield-check": ShieldCheck,
    "help-circle": HelpCircle,
    "list-checks": ListChecks,
    "message-square": MessageSquare,
};

const colorMap: Record<string, { bg: string; border: string; icon: string; hover: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", hover: "hover:border-blue-400 hover:bg-blue-100" },
    red: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", hover: "hover:border-red-400 hover:bg-red-100" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", hover: "hover:border-amber-400 hover:bg-amber-100" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", hover: "hover:border-emerald-400 hover:bg-emerald-100" },
    violet: { bg: "bg-violet-50", border: "border-violet-200", icon: "text-violet-600", hover: "hover:border-violet-400 hover:bg-violet-100" },
    slate: { bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-600", hover: "hover:border-slate-400 hover:bg-slate-100" },
    indigo: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "text-indigo-600", hover: "hover:border-indigo-400 hover:bg-indigo-100" },
    orange: { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-600", hover: "hover:border-orange-400 hover:bg-orange-100" },
    yellow: { bg: "bg-yellow-50", border: "border-yellow-200", icon: "text-yellow-600", hover: "hover:border-yellow-400 hover:bg-yellow-100" },
    teal: { bg: "bg-teal-50", border: "border-teal-200", icon: "text-teal-600", hover: "hover:border-teal-400 hover:bg-teal-100" },
    rose: { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-600", hover: "hover:border-rose-400 hover:bg-rose-100" },
};

export function TemplateCard({ template, onClick }: TemplateCardProps) {
    const Icon = iconMap[template.icon] || FileText;
    const colors = colorMap[template.color] || colorMap.slate;

    return (
        <button
            onClick={onClick}
            className={`text-left p-5 rounded-xl border-2 ${colors.border} ${colors.bg} ${colors.hover} transition-all group`}
        >
            <div className={`w-12 h-12 rounded-xl bg-white border ${colors.border} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <Icon className={`h-6 w-6 ${colors.icon}`} />
            </div>
            <h3 className="font-semibold text-slate-900">{template.name}</h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{template.description}</p>
        </button>
    );
}
