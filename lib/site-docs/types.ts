/**
 * SiteDocs — Document Generation Module Types
 * Converts text summaries into professional construction documents
 */

// ── Document Types ──
export type DocumentType =
    | "meeting-minutes"
    | "incident-report"
    | "corrective-action"
    | "safety-report"
    | "rfi"
    | "daily-progress"
    | "inspection-checklist"
    | "toolbox-talk";

export type DocumentStatus = "draft" | "final" | "archived";

// ── Core Document Entity ──
export interface SiteDocument {
    id: string;
    company_id: string;
    project_id: string | null;
    site_id: string | null;
    document_type: DocumentType;
    title: string;
    reference_number: string | null;
    summary_input: string; // Raw user input
    generated_content: GeneratedContent;
    status: DocumentStatus;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    finalized_at: string | null;
    finalized_by: string | null;
}

// ── Generated Content Structure ──
export interface GeneratedContent {
    metadata: DocumentMetadata;
    sections: DocumentSection[];
    actionItems?: ActionItem[];
    attendees?: Attendee[];
    signatories?: Signatory[];
}

export interface DocumentMetadata {
    document_title: string;
    project_name: string | null;
    location: string | null;
    date: string | null;
    reference: string | null;
    prepared_by: string | null;
    organization: string | null;
}

export interface DocumentSection {
    id: string;
    title: string;
    content: string;
    order: number;
    status?: "open" | "closed" | "in-progress" | "pending";
}

export interface ActionItem {
    id: string;
    number: number;
    description: string;
    responsible: string | null;
    due_date: string | null;
    status: "open" | "in-progress" | "closed";
}

export interface Attendee {
    id: string;
    name: string;
    organization: string | null;
    role: string | null;
    present: boolean;
}

export interface Signatory {
    id: string;
    name: string;
    organization: string | null;
    signature_date: string | null;
}

// ── Template Definitions ──
export interface DocumentTemplate {
    id: DocumentType;
    name: string;
    description: string;
    icon: string;
    color: string;
    prompt_template: string;
    required_fields: TemplateField[];
    optional_fields: TemplateField[];
    default_sections: string[];
}

export interface TemplateField {
    name: string;
    label: string;
    type: "text" | "date" | "select" | "textarea" | "list";
    placeholder?: string;
    options?: string[];
}

// ── Payload Types ──
export interface GenerateDocumentPayload {
    document_type: DocumentType;
    summary: string;
    project_id?: string | null;
    site_id?: string | null;
    metadata_override?: Partial<DocumentMetadata>;
}

export interface CreateDocumentPayload {
    company_id: string;
    project_id?: string | null;
    site_id?: string | null;
    document_type: DocumentType;
    title: string;
    summary_input: string;
    generated_content: GeneratedContent;
}

export interface UpdateDocumentPayload {
    title?: string;
    generated_content?: Partial<GeneratedContent>;
    status?: DocumentStatus;
    reference_number?: string | null;
}

// ── Export Options ──
export interface ExportOptions {
    format: "pdf" | "docx" | "html";
    include_header?: boolean;
    include_footer?: boolean;
    include_logo?: boolean;
    paper_size?: "a4" | "letter";
}

// ── Constants ──
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    "meeting-minutes": "Meeting Minutes",
    "incident-report": "Incident Report",
    "corrective-action": "Corrective Action Report",
    "safety-report": "Safety Report",
    rfi: "Request for Information",
    "daily-progress": "Daily Progress Report",
    "inspection-checklist": "Inspection Checklist",
    "toolbox-talk": "Toolbox Talk Record",
};

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
    "meeting-minutes": "users",
    "incident-report": "alert-triangle",
    "corrective-action": "clipboard-check",
    "safety-report": "shield-check",
    rfi: "help-circle",
    "daily-progress": "file-text",
    "inspection-checklist": "list-checks",
    "toolbox-talk": "message-square",
};

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
    "meeting-minutes": "blue",
    "incident-report": "red",
    "corrective-action": "amber",
    "safety-report": "emerald",
    rfi: "violet",
    "daily-progress": "slate",
    "inspection-checklist": "indigo",
    "toolbox-talk": "orange",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
    draft: "Draft",
    final: "Final",
    archived: "Archived",
};

export const DOCUMENT_STATUS_BADGE: Record<DocumentStatus, string> = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    final: "bg-emerald-50 text-emerald-700 border-emerald-200",
    archived: "bg-slate-100 text-slate-600 border-slate-300",
};
