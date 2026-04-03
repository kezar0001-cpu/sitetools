/**
 * SiteDocs — Client-side API functions
 * Document generation, CRUD operations, and exports
 */

import { supabase } from "@/lib/supabase";
import type {
    SiteDocument,
    CreateDocumentPayload,
    UpdateDocumentPayload,
    GenerateDocumentPayload,
    GeneratedContent,
    DocumentType,
} from "./types";

// ── Document CRUD ──

export async function fetchCompanyDocuments(
    companyId: string,
    options?: {
        projectId?: string | null;
        documentType?: DocumentType | null;
        status?: "draft" | "final" | "archived" | null;
        limit?: number;
    }
): Promise<SiteDocument[]> {
    let query = supabase
        .from("site_documents")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

    if (options?.projectId) {
        query = query.eq("project_id", options.projectId);
    }
    if (options?.documentType) {
        query = query.eq("document_type", options.documentType);
    }
    if (options?.status) {
        query = query.eq("status", options.status);
    }
    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function fetchDocument(documentId: string): Promise<SiteDocument | null> {
    const { data, error } = await supabase
        .from("site_documents")
        .select("*")
        .eq("id", documentId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw new Error(error.message);
    }
    return data;
}

export async function createDocument(payload: CreateDocumentPayload): Promise<SiteDocument> {
    const { data, error } = await supabase
        .from("site_documents")
        .insert({
            company_id: payload.company_id,
            project_id: payload.project_id ?? null,
            site_id: payload.site_id ?? null,
            document_type: payload.document_type,
            title: payload.title,
            summary_input: payload.summary_input,
            generated_content: payload.generated_content,
            status: "draft",
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function updateDocument(
    documentId: string,
    updates: UpdateDocumentPayload
): Promise<SiteDocument> {
    const updateData: Record<string, unknown> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.generated_content !== undefined) {
        updateData.generated_content = updates.generated_content;
    }
    if (updates.status !== undefined) {
        updateData.status = updates.status;
        if (updates.status === "final") {
            updateData.finalized_at = new Date().toISOString();
        }
    }
    if (updates.reference_number !== undefined) {
        updateData.reference_number = updates.reference_number;
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from("site_documents")
        .update(updateData)
        .eq("id", documentId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function deleteDocument(documentId: string): Promise<void> {
    const { error } = await supabase.from("site_documents").delete().eq("id", documentId);
    if (error) throw new Error(error.message);
}

export async function finalizeDocument(documentId: string): Promise<SiteDocument> {
    return updateDocument(documentId, { status: "final" });
}

// ── AI Generation ──

export async function generateDocumentContent(
    payload: GenerateDocumentPayload
): Promise<GeneratedContent> {
    // Get Supabase session for auth
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    console.log("[site-docs/client] Session:", session ? "found" : "not found", "Token:", token ? `Bearer ${token.substring(0, 20)}...` : "none");

    const response = await fetch("/api/site-docs/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate document");
    }

    const data = await response.json();
    return data.generated_content;
}

// ── Export ──

export async function exportDocument(
    documentId: string,
    format: "pdf" | "docx" | "html"
): Promise<Blob> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`/api/site-docs/export/${documentId}?format=${format}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
    }

    return response.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// ── Reference Number Generation ──

export async function generateReferenceNumber(
    companyId: string,
    documentType: DocumentType
): Promise<string> {
    const prefix = getReferencePrefix(documentType);

    // Get count of existing documents of this type for this company
    const { count, error } = await supabase
        .from("site_documents")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("document_type", documentType);

    if (error) throw new Error(error.message);

    const nextNumber = (count ?? 0) + 1;
    const padded = nextNumber.toString().padStart(3, "0");
    return `${prefix}-${padded}`;
}

function getReferencePrefix(type: DocumentType): string {
    const prefixes: Record<DocumentType, string> = {
        "meeting-minutes": "MM",
        "incident-report": "INC",
        "corrective-action": "CAR",
        "safety-report": "SAF",
        rfi: "RFI",
        "inspection-checklist": "INSP",
        "toolbox-talk": "TBT",
        variation: "VO",
        ncr: "NCR",
        "site-instruction": "SI",
    };
    return prefixes[type];
}
