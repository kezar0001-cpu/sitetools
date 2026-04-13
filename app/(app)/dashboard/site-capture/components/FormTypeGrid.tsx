"use client";

import { FORM_TYPE_CONFIG, CREATABLE_FORM_TYPES, type FormType } from "@/lib/site-capture/types";
import { 
  BookOpen, 
  ClipboardCheck, 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  SearchCheck 
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "book-open": BookOpen,
  "clipboard-check": ClipboardCheck,
  "users": Users,
  "message-square": MessageSquare,
  "alert-triangle": AlertTriangle,
  "search-check": SearchCheck,
};

interface FormTypeCardProps {
  formType: FormType;
  onClick: () => void;
}

function FormTypeCard({ formType, onClick }: FormTypeCardProps) {
  const config = FORM_TYPE_CONFIG[formType];
  const Icon = ICON_MAP[config.icon] || BookOpen;

  return (
    <div className={`group relative flex flex-col rounded-2xl border ${config.borderColor} ${config.bgColor} p-5 transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer`}>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl bg-white ${config.color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      <div className="mt-4">
        <h3 className="font-bold text-slate-900">{config.label}</h3>
        <p className="mt-1 text-sm text-slate-600 leading-relaxed">
          {config.description}
        </p>
      </div>

      <button
        onClick={onClick}
        className="mt-4 w-full py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        New Entry
      </button>
    </div>
  );
}

interface FormTypeGridProps {
  onNewEntry: (formType: FormType) => void;
}

export function FormTypeGrid({ onNewEntry }: FormTypeGridProps) {
  const formTypes: FormType[] = CREATABLE_FORM_TYPES;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {formTypes.map((formType) => (
        <FormTypeCard
          key={formType}
          formType={formType}
          onClick={() => onNewEntry(formType)}
        />
      ))}
    </div>
  );
}
