import { createHash } from "crypto";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type {
    ActionItem,
    ActionStatus,
    GeneratedContent,
    SiteActionItem,
    SiteActionUpdate,
} from "@/lib/site-docs/types";

type SupabaseAdmin = SupabaseClient;

export interface InternalUserContext {
    user: User;
    companyId: string;
    name: string;
    email: string | null;
    organisation: string | null;
    role: string | null;
}

export const VALID_ACTION_STATUSES: ActionStatus[] = [
    "open",
    "in-progress",
    "council-response-provided",
    "closed",
];

export function createSupabaseAdmin(): SupabaseAdmin {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export function isActionStatus(value: unknown): value is ActionStatus {
    return typeof value === "string" && VALID_ACTION_STATUSES.includes(value as ActionStatus);
}

export function normalizeActionStatus(value: unknown): ActionStatus {
    if (isActionStatus(value)) return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase().replace(/_/g, "-");
        if (normalized === "in progress") return "in-progress";
        if (normalized === "council response provided") return "council-response-provided";
        if (isActionStatus(normalized)) return normalized;
    }
    return "open";
}

export function normalizeDateOnly(value: unknown): string | null {
    if (!value || typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

function trimOrNull(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function hashText(value: string): string {
    return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function toActionNumber(value: unknown): string | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) {
        return `A-${String(value).padStart(3, "0")}`;
    }
    const text = String(value).trim();
    if (!text) return null;
    if (/^A-\d+/i.test(text)) return text.toUpperCase();
    if (/^\d+$/.test(text)) return `A-${text.padStart(3, "0")}`;
    return text;
}

function normalizeLatestUpdate(value: unknown): SiteActionUpdate | null {
    if (!value) return null;
    if (Array.isArray(value)) return (value[0] as SiteActionUpdate | undefined) ?? null;
    return value as SiteActionUpdate;
}

export function normalizeActionItemRow(row: Record<string, unknown>): SiteActionItem {
    return {
        ...(row as unknown as SiteActionItem),
        status: normalizeActionStatus(row.status),
        latest_update: normalizeLatestUpdate(row.latest_update),
    };
}

export async function requireInternalUser(
    req: Request,
    supabaseAdmin: SupabaseAdmin,
    companyId: string
): Promise<InternalUserContext | Response> {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const {
        data: { user },
        error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        return Response.json({ error: "Invalid session." }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
        .from("company_memberships")
        .select("role")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError || !membership) {
        return Response.json({ error: "Access denied." }, { status: 403 });
    }

    const [{ data: profile }, { data: company }] = await Promise.all([
        supabaseAdmin.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
        supabaseAdmin.from("companies").select("name").eq("id", companyId).maybeSingle(),
    ]);

    const profileRecord = (profile ?? {}) as { full_name?: string | null; email?: string | null };
    const companyRecord = (company ?? {}) as { name?: string | null };
    const email = profileRecord.email ?? user.email ?? null;
    const name = profileRecord.full_name?.trim() || email || "Buildstate user";

    return {
        user,
        companyId,
        name,
        email,
        organisation: companyRecord.name ?? null,
        role: (membership as { role?: string | null }).role ?? null,
    };
}

export async function assertProjectBelongsToCompany(
    supabaseAdmin: SupabaseAdmin,
    companyId: string,
    projectId: string
): Promise<{ id: string; name: string; company_id: string } | Response> {
    const { data: project, error } = await supabaseAdmin
        .from("projects")
        .select("id, name, company_id")
        .eq("id", projectId)
        .eq("company_id", companyId)
        .maybeSingle();

    if (error || !project) {
        return Response.json({ error: "Project not found for this company." }, { status: 404 });
    }

    return project as { id: string; name: string; company_id: string };
}

function buildGeneratedSourceKey(documentId: string, item: ActionItem): string {
    const stableId = item.id || item.number || hashText(`${item.description}:${item.responsible ?? ""}:${item.due_date ?? ""}`);
    return `${documentId}:${stableId}`;
}

export async function syncGeneratedActionItems(
    supabaseAdmin: SupabaseAdmin,
    companyId: string,
    projectId?: string | null
): Promise<void> {
    let documentsQuery = supabaseAdmin
        .from("site_documents")
        .select("id, company_id, project_id, document_type, title, reference_number, generated_content, created_by")
        .eq("company_id", companyId);

    if (projectId) documentsQuery = documentsQuery.eq("project_id", projectId);

    const { data: documents, error: documentsError } = await documentsQuery;
    if (documentsError) throw new Error(documentsError.message);

    const generatedRows = (documents ?? []).flatMap((document) => {
        const generatedContent = (document.generated_content ?? {}) as GeneratedContent;
        const actionItems = generatedContent.actionItems ?? [];

        return actionItems
            .filter((item) => item.description?.trim())
            .map((item) => ({
                generated_source_key: buildGeneratedSourceKey(document.id as string, item),
                generated_action_id: item.id ? String(item.id) : null,
                company_id: companyId,
                project_id: (document.project_id as string | null) ?? null,
                source_document_id: document.id as string,
                source_document_title: (document.title as string | null) ?? null,
                source_document_reference: (document.reference_number as string | null) ?? null,
                source: document.document_type === "meeting-minutes" ? "meeting-minutes" : "imported",
                action_number: toActionNumber(item.number),
                description: item.description.trim(),
                responsible: trimOrNull(item.responsible),
                due_date: normalizeDateOnly(item.due_date),
                status: normalizeActionStatus(item.status),
                created_by: (document.created_by as string | null) ?? null,
            }));
    });

    if (generatedRows.length === 0) return;

    const sourceKeys = generatedRows.map((row) => row.generated_source_key);
    const { data: existingRows, error: existingError } = await supabaseAdmin
        .from("site_action_items")
        .select("id, generated_source_key, latest_update_id")
        .eq("company_id", companyId)
        .in("generated_source_key", sourceKeys);

    if (existingError) throw new Error(existingError.message);

    const existingByKey = new Map(
        (existingRows ?? []).map((row) => [
            row.generated_source_key as string,
            row as { id: string; generated_source_key: string; latest_update_id: string | null },
        ])
    );

    const rowsToInsert = [] as typeof generatedRows;
    const updatePromises: Promise<unknown>[] = [];

    for (const row of generatedRows) {
        const existing = existingByKey.get(row.generated_source_key);
        if (!existing) {
            rowsToInsert.push(row);
            continue;
        }

        const updatePayload: Record<string, unknown> = {
            project_id: row.project_id,
            source_document_title: row.source_document_title,
            source_document_reference: row.source_document_reference,
            source: row.source,
            generated_action_id: row.generated_action_id,
            action_number: row.action_number,
            description: row.description,
            responsible: row.responsible,
            due_date: row.due_date,
        };

        if (!existing.latest_update_id) {
            updatePayload.status = row.status;
        }

        updatePromises.push(
    Promise.resolve(
        supabaseAdmin
            .from("site_action_items")
            .update(updatePayload)
            .eq("id", existing.id)
    ).then(({ error }) => {
        if (error) throw new Error(error.message);
    })
);
    }

    if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabaseAdmin.from("site_action_items").insert(rowsToInsert);
        if (insertError) throw new Error(insertError.message);
    }

    if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
    }
}

export async function fetchActionItems(
    supabaseAdmin: SupabaseAdmin,
    companyId: string,
    projectId?: string | null
): Promise<SiteActionItem[]> {
    await syncGeneratedActionItems(supabaseAdmin, companyId, projectId);

    let query = supabaseAdmin
        .from("site_action_items")
        .select("*, latest_update:site_action_updates!site_action_items_latest_update_id_fkey(*)")
        .eq("company_id", companyId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => normalizeActionItemRow(row as Record<string, unknown>));
}

export async function fetchActionItemById(
    supabaseAdmin: SupabaseAdmin,
    actionId: string
): Promise<SiteActionItem | null> {
    const { data, error } = await supabaseAdmin
        .from("site_action_items")
        .select("*, latest_update:site_action_updates!site_action_items_latest_update_id_fkey(*)")
        .eq("id", actionId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? normalizeActionItemRow(data as Record<string, unknown>) : null;
}

export async function recordActionStatusUpdate(params: {
    supabaseAdmin: SupabaseAdmin;
    action: SiteActionItem;
    newStatus: ActionStatus;
    comment: string;
    updatedByUserId?: string | null;
    updatedByName: string;
    updatedByEmail?: string | null;
    updatedByOrganisation?: string | null;
    updatedByRole?: string | null;
    source: "internal" | "client_link";
}): Promise<SiteActionItem> {
    const comment = params.comment.trim();
    if (!comment) throw new Error("Comment is required.");

    const { data: update, error: updateError } = await params.supabaseAdmin
        .from("site_action_updates")
        .insert({
            action_item_id: params.action.id,
            previous_status: params.action.status,
            new_status: params.newStatus,
            comment,
            updated_by_user_id: params.updatedByUserId ?? null,
            updated_by_name: params.updatedByName.trim(),
            updated_by_email: params.updatedByEmail ?? null,
            updated_by_organisation: params.updatedByOrganisation ?? null,
            updated_by_role: params.updatedByRole ?? null,
            source: params.source,
        })
        .select("*")
        .single();

    if (updateError) throw new Error(updateError.message);

    await mirrorGeneratedActionStatus(params.supabaseAdmin, params.action, params.newStatus, update as SiteActionUpdate);

    const updatedAction = await fetchActionItemById(params.supabaseAdmin, params.action.id);
    if (!updatedAction) throw new Error("Action item not found after update.");
    return updatedAction;
}

async function mirrorGeneratedActionStatus(
    supabaseAdmin: SupabaseAdmin,
    action: SiteActionItem,
    status: ActionStatus,
    latestUpdate: SiteActionUpdate
): Promise<void> {
    if (!action.source_document_id || !action.generated_action_id) return;

    const { data: document, error } = await supabaseAdmin
        .from("site_documents")
        .select("generated_content")
        .eq("id", action.source_document_id)
        .maybeSingle();

    if (error || !document) return;

    const generatedContent = (document.generated_content ?? {}) as GeneratedContent;
    const actionItems = generatedContent.actionItems ?? [];
    const nextActionItems = actionItems.map((item) =>
        String(item.id) === action.generated_action_id
            ? { ...item, status, updated_at: latestUpdate.created_at, latest_update: latestUpdate }
            : item
    );

    await supabaseAdmin
        .from("site_documents")
        .update({
            generated_content: { ...generatedContent, actionItems: nextActionItems },
            updated_at: new Date().toISOString(),
        })
        .eq("id", action.source_document_id);
}
