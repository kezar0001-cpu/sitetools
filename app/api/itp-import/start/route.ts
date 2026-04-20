import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getJob, setJob, type ImportJob } from "../jobs";
import { getSecret } from "@/lib/server/get-secret";
import {
  extractTextFromPdf,
  extractTextFromDocx,
  extractTextFromExcel,
  SUPPORTED_TYPES,
  EXT_MAP,
  validateItps,
  IMPORT_SYSTEM_PROMPT,
} from "../_lib";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

async function updateJob(jobId: string, updates: Partial<ImportJob>) {
  const job = await getJob(jobId);
  if (job) await setJob({ ...job, ...updates });
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Authenticate
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authErr,
  } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const companyId = formData.get("company_id") as string | null;
  const projectId = (formData.get("project_id") as string) || null;
  const siteId = (formData.get("site_id") as string) || null;

  if (!file || !companyId) {
    return NextResponse.json({ error: "file and company_id are required." }, { status: 400 });
  }

  // Validate file type
  const fileType = SUPPORTED_TYPES[file.type];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if ((!fileType || fileType === "auto") && !EXT_MAP[ext]) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 400 });
  }

  // Verify membership
  const { data: membership, error: memErr } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memErr || !membership) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Create job
  const jobId = randomUUID();
  const abortController = new AbortController();
  const job: ImportJob & { abortController: AbortController } = {
    id: jobId,
    userId: user.id,
    step: "uploading",
    message: "Uploading…",
    percent: 5,
    abortController,
    createdAt: Date.now(),
  };
  await setJob(job);

  // Return jobId immediately, process in background.
  // NOTE: On Vercel Node.js runtime the event loop continues after the
  // response is sent, so processImport will run to completion. If you later
  // move to an edge / strict serverless environment, wrap this with
  // `waitUntil` (e.g. from @vercel/functions) to guarantee execution.
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const effectiveType = (fileType && fileType !== "auto") ? fileType : ext;
  const fileName = file.name;

  void processImport(jobId, buffer, effectiveType, fileName, companyId, projectId, siteId, user.id, abortController.signal);

  return NextResponse.json({ jobId });
}

async function processImport(
  jobId: string,
  buffer: Buffer,
  effectiveType: string,
  fileName: string,
  companyId: string,
  projectId: string | null,
  siteId: string | null,
  userId: string,
  signal: AbortSignal,
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // Step: Extracting text
    await updateJob(jobId, { step: "extracting", message: "Extracting text…", percent: 20 });
    if (signal.aborted) { await updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 }); return; }

    let documentText = "";
    switch (effectiveType) {
      case "pdf":  documentText = await extractTextFromPdf(buffer); break;
      case "docx": documentText = await extractTextFromDocx(buffer); break;
      case "xlsx":
      case "xls":
      case "csv":  documentText = extractTextFromExcel(buffer); break;
      case "txt":  documentText = buffer.toString("utf-8"); break;
      default:
        await updateJob(jobId, { step: "error", message: "Could not process file.", percent: 0, error: "Unsupported format" });
        return;
    }

    if (!documentText.trim()) {
      await updateJob(jobId, { step: "error", message: "No text could be extracted from this document.", percent: 0, error: "Empty document" });
      return;
    }

    if (documentText.length > 80_000) {
      documentText = documentText.slice(0, 80_000) + "\n\n[Document truncated]";
    }

    if (signal.aborted) { await updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 }); return; }

    // Step: Analyzing with AI
    await updateJob(jobId, { step: "analyzing", message: "Analysing activities…", percent: 40 });

    const userPrompt = `Analyse the following document and generate ITPs for every distinct construction activity found.\n\nDocument filename: ${fileName}\n\nDocument content:\n\n${documentText}`;

    // Resolve Anthropic API key from env or Supabase vault
    const apiKey = await getSecret("ANTHROPIC_API_KEY", supabaseAdmin);
    if (!apiKey) {
      await updateJob(jobId, { step: "error", message: "AI service not configured — API key not found.", percent: 0 });
      return;
    }
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: IMPORT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal }
    );

    if (signal.aborted) { await updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 }); return; }

    const textBlock = message.content.find((b) => b.type === "text");
    const responseText = textBlock && "text" in textBlock ? textBlock.text.trim() : "";

    let parsed: unknown;
    try { parsed = JSON.parse(responseText); } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) { try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; } }
      else parsed = null;
    }

    const validated = parsed !== null ? validateItps(parsed) : null;
    if (!validated || validated.length === 0) {
      await updateJob(jobId, { step: "error", message: "Could not extract ITPs from this document.", percent: 0, error: "Parse failed" });
      return;
    }

    // Step: Creating ITPs
    await updateJob(jobId, { step: "creating", message: "Creating ITPs…", percent: 75 });

    if (signal.aborted) { await updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 }); return; }

    const createdSessions: Array<{ session: Record<string, unknown>; items: Record<string, unknown>[] }> = [];
    let failureCount = 0;

    for (const itp of validated) {
      if (signal.aborted) { await updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 }); return; }

      const { data: session, error: sessionErr } = await supabaseAdmin
        .from("itp_sessions")
        .insert({
          company_id: companyId,
          task_description: itp.task_description,
          project_id: projectId,
          site_id: siteId,
          created_by_user_id: userId,
        })
        .select("id, company_id, task_description, created_at, project_id, site_id, status")
        .single();
      if (sessionErr || !session) { failureCount++; continue; }

      const rows = itp.items.map((item, idx) => ({
        session_id: session.id,
        type: item.type,
        phase: item.phase || null,
        title: item.title,
        description: item.description,
        reference_standard: item.reference_standard || null,
        responsibility: item.responsibility || "contractor",
        records_required: item.records_required || null,
        acceptance_criteria: item.acceptance_criteria || null,
        sort_order: idx + 1,
      }));
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("itp_items")
        .insert(rows)
        .select("id, session_id, slug, type, phase, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng, reference_standard, responsibility, records_required, acceptance_criteria");
      if (insertErr || !inserted) { failureCount++; continue; }

      createdSessions.push({ session, items: inserted });

      await supabaseAdmin.from("itp_audit_log").insert({
        session_id: session.id,
        item_id: null,
        action: "create",
        performed_by_user_id: userId,
        new_values: { task_description: itp.task_description, source: "import_document", items_count: itp.items.length },
      });
    }

    if (createdSessions.length === 0) {
      await updateJob(jobId, { step: "error", message: "Failed to save generated ITPs.", percent: 0, error: "DB error" });
      return;
    }

    await updateJob(jobId, {
      step: "done",
      message: `Imported ${createdSessions.length} ITP${createdSessions.length !== 1 ? "s" : ""}${failureCount > 0 ? ` (${failureCount} failed)` : ""}`,
      percent: 100,
      result: {
        imported: createdSessions.length,
        total_items: createdSessions.reduce((sum, s) => sum + s.items.length, 0),
        sessions: createdSessions,
        ...(failureCount > 0 ? { partial_failures: failureCount } : {}),
      },
    });
  } catch (err) {
    if (signal.aborted) {
      await updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 });
      return;
    }
    console.error("Import job error:", err);
    await updateJob(jobId, { step: "error", message: "Import failed. Please try again.", percent: 0, error: String(err) });
  }
}
