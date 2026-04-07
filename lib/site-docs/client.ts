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
        status?: "draft" | "shared" | "finalised" | null;
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
        if (updates.status === "finalised") {
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
    return updateDocument(documentId, { status: "finalised" });
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

export async function exportDocument(documentId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
        throw new Error("Not authenticated");
    }

    const response = await fetch(`/api/site-docs/export/${documentId}`, {
        headers: { "Authorization": `Bearer ${token}` },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Export failed" }));
        throw new Error(error.error || `Export failed (${response.status})`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || "document.pdf";
    
    downloadBlob(blob, filename);
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

// ── Document Version Management ──

export interface DocumentVersion {
    id: string;
    document_id: string;
    version_number: number;
    summary_input: string;
    generated_content: GeneratedContent;
    created_by: string | null;
    created_at: string;
}

export async function fetchDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    const { data, error } = await supabase
        .from("site_document_versions")
        .select("*")
        .eq("document_id", documentId)
        .order("version_number", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function createDocumentVersion(
    documentId: string,
    summaryInput: string,
    generatedContent: GeneratedContent
): Promise<DocumentVersion> {
    // Get next version number
    const { data: versionData, error: versionError } = await supabase
        .rpc("get_next_document_version", { doc_id: documentId });

    if (versionError) throw new Error(versionError.message);

    const { data, error } = await supabase
        .from("site_document_versions")
        .insert({
            document_id: documentId,
            version_number: versionData,
            summary_input: summaryInput,
            generated_content: generatedContent,
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function regenerateDocument(
    documentId: string,
    documentType: DocumentType,
    updatedSummary: string,
    projectId?: string | null,
    siteId?: string | null
): Promise<GeneratedContent> {
    // First, fetch the current document to save as a version
    const currentDoc = await fetchDocument(documentId);
    if (!currentDoc) throw new Error("Document not found");

    // Save current version before regenerating
    await createDocumentVersion(
        documentId,
        currentDoc.summary_input,
        currentDoc.generated_content
    );

    // Generate new content
    const newContent = await generateDocumentContent({
        document_type: documentType,
        summary: updatedSummary,
        project_id: projectId,
        site_id: siteId,
    });

    // Update document with new content and summary
    const { error } = await supabase
        .from("site_documents")
        .update({
            summary_input: updatedSummary,
            generated_content: newContent,
            updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

    if (error) throw new Error(error.message);

    return newContent;
}

// ── Action Item Status Updates ──

export async function updateActionItemStatus(
    documentId: string,
    itemId: string,
    status: "open" | "in-progress" | "closed"
): Promise<{ updated_at: string }> {
    // First, fetch the current document
    const { data: doc, error: fetchError } = await supabase
        .from("site_documents")
        .select("generated_content, updated_at")
        .eq("id", documentId)
        .single();

    if (fetchError) throw new Error(fetchError.message);
    if (!doc) throw new Error("Document not found");

    // Update the action item status in the generated_content
    const generatedContent = doc.generated_content as GeneratedContent;
    if (!generatedContent.actionItems) {
        throw new Error("No action items found in document");
    }

    const updatedActionItems = generatedContent.actionItems.map(item =>
        item.id === itemId
            ? { ...item, status, updated_at: new Date().toISOString() }
            : item
    );

    const updatedContent: GeneratedContent = {
        ...generatedContent,
        actionItems: updatedActionItems,
    };

    // Update the document
    const { error: updateError } = await supabase
        .from("site_documents")
        .update({
            generated_content: updatedContent,
            updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

    if (updateError) throw new Error(updateError.message);

    return { updated_at: new Date().toISOString() };
}
