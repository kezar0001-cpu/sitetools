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
    | "inspection-checklist"
    | "toolbox-talk"
    | "variation"
    | "ncr"
    | "site-instruction";

export type DocumentStatus = "draft" | "shared" | "finalised";

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
    client?: string | null;
    location: string | null;
    date: string | null;
    reference: string | null;
    prepared_by: string | null;
    organization: string | null;
    // Meeting-minutes extended fields
    meeting_type?: string | null;
    time?: string | null;
    next_meeting?: string | null;
    distribution?: string | null;
    abn?: string | null;
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
    updated_at?: string;
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
    signature_data?: string | null;
    sign_url?: string | null;
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
    "inspection-checklist": "Inspection Checklist",
    "toolbox-talk": "Toolbox Talk Record",
    variation: "Variation / Change Order",
    ncr: "Non-Conformance Report",
    "site-instruction": "Site Instruction",
};

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
    "meeting-minutes": "users",
    "incident-report": "alert-triangle",
    "corrective-action": "clipboard-check",
    "safety-report": "shield-check",
    rfi: "help-circle",
    "inspection-checklist": "list-checks",
    "toolbox-talk": "message-square",
    variation: "file-diff",
    ncr: "x-circle",
    "site-instruction": "clipboard",
};

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
    "meeting-minutes": "blue",
    "incident-report": "red",
    "corrective-action": "amber",
    "safety-report": "emerald",
    rfi: "violet",
    "inspection-checklist": "indigo",
    "toolbox-talk": "orange",
    variation: "teal",
    ncr: "rose",
    "site-instruction": "yellow",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
    draft: "Draft",
    shared: "Shared for Review",
    finalised: "Finalised",
};

export const DOCUMENT_STATUS_BADGE: Record<DocumentStatus, string> = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    shared: "bg-blue-50 text-blue-700 border-blue-200",
    finalised: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
