import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import { randomUUID } from "crypto";
import { getJob, setJob, type ImportJob } from "../jobs";

export const runtime = "nodejs";
export const maxDuration = 120;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface ItpItem {
  type: "witness" | "hold";
  title: string;
  description: string;
}

interface GeneratedItp {
  task_description: string;
  items: ItpItem[];
}

// Text extraction helpers
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractTextFromExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    parts.push(`--- Sheet: ${sheetName} ---`);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    parts.push(csv);
  }
  return parts.join("\n\n");
}

function validateItps(raw: unknown): GeneratedItp[] | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  for (const itp of raw) {
    if (
      typeof itp !== "object" ||
      itp === null ||
      typeof itp.task_description !== "string" ||
      !Array.isArray(itp.items) ||
      itp.items.length < 1
    ) return null;
    for (const item of itp.items) {
      if (
        typeof item !== "object" ||
        item === null ||
        !["witness", "hold"].includes(item.type) ||
        typeof item.title !== "string" ||
        typeof item.description !== "string"
      ) return null;
    }
  }
  return raw as GeneratedItp[];
}

const SUPPORTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
  "application/octet-stream": "auto",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/plain": "txt",
  "text/csv": "csv",
};

function updateJob(jobId: string, updates: Partial<ImportJob>) {
  const job = getJob(jobId);
  if (job) setJob({ ...job, ...updates });
}

export async function POST(req: NextRequest) {
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
  const extMap: Record<string, string> = { pdf: "pdf", doc: "docx", docx: "docx", xlsx: "xlsx", xls: "xls", txt: "txt", csv: "csv" };
  if (!fileType && !extMap[ext]) {
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
  const job: ImportJob = {
    id: jobId,
    userId: user.id,
    step: "uploading",
    message: "Uploading…",
    percent: 5,
    abortController,
    createdAt: Date.now(),
  };
  setJob(job);

  // Return jobId immediately, process in background
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const effectiveType = (fileType && fileType !== "auto") ? fileType : ext;
  const fileName = file.name;

  // Kick off background processing (non-blocking)
  processImport(jobId, buffer, effectiveType, fileName, companyId, projectId, siteId, user.id, abortController.signal);

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
  try {
    // Step: Extracting text
    updateJob(jobId, { step: "extracting", message: "Extracting text…", percent: 20 });
    if (signal.aborted) { updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 }); return; }

    let documentText = "";
    switch (effectiveType) {
      case "pdf": documentText = await extractTextFromPdf(buffer); break;
      case "docx": documentText = await extractTextFromDocx(buffer); break;
      case "xlsx": case "xls": case "csv": documentText = extractTextFromExcel(buffer); break;
      case "txt": documentText = buffer.toString("utf-8"); break;
      default:
        updateJob(jobId, { step: "error", message: "Could not process file.", percent: 0, error: "Unsupported format" });
        return;
    }

    if (!documentText.trim()) {
      updateJob(jobId, { step: "error", message: "No text could be extracted from this document.", percent: 0, error: "Empty document" });
      return;
    }

    if (documentText.length > 80_000) {
      documentText = documentText.slice(0, 80_000) + "\n\n[Document truncated]";
    }

    if (signal.aborted) { updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 }); return; }

    // Step: Analyzing with AI
    updateJob(jobId, { step: "analyzing", message: "Analyzing activities…", percent: 40 });

    const systemPrompt = `You are an experienced Australian civil construction quality assurance engineer. You read specification documents, engineering drawings callouts, project scopes, and other construction documents, then generate ITP (Inspection & Test Plan) checklists.

Your job:
1. Analyse the uploaded document
2. Identify EVERY distinct construction activity/task that warrants its own ITP
3. For each activity, generate a focused ITP with 6-10 inspection checklist items

Each ITP must have:
- task_description: a short (max 12 words) plain-English name for the activity
- items: an array of inspection points

Each item must have:
- type: "witness" (notify and observe, work can continue) OR "hold" (mandatory stop, cannot proceed until signed)
- title: short action phrase (max 8 words)
- description: one sentence with a measurable acceptance criterion — cite the relevant Australian Standard where applicable

Return ONLY a valid JSON array of ITP objects. No markdown, no explanation, no code fences.`;

    const userPrompt = `Analyse the following document and generate ITPs for every distinct construction activity found.\n\nDocument filename: ${fileName}\n\nDocument content:\n\n${documentText}`;

    const message = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal }
    );

    if (signal.aborted) { updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 }); return; }

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
      updateJob(jobId, { step: "error", message: "Could not extract ITPs from this document.", percent: 0, error: "Parse failed" });
      return;
    }

    // Step: Creating ITPs
    updateJob(jobId, { step: "creating", message: "Creating ITPs…", percent: 75 });

    if (signal.aborted) { updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 }); return; }

    const createdSessions: Array<{ session: Record<string, unknown>; items: Record<string, unknown>[] }> = [];

    for (const itp of validated) {
      if (signal.aborted) { updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 }); return; }

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
      if (sessionErr || !session) continue;

      const rows = itp.items.map((item, idx) => ({
        session_id: session.id,
        type: item.type,
        title: item.title,
        description: item.description,
        sort_order: idx + 1,
      }));
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("itp_items")
        .insert(rows)
        .select("id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng");
      if (insertErr || !inserted) continue;

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
      updateJob(jobId, { step: "error", message: "Failed to save generated ITPs.", percent: 0, error: "DB error" });
      return;
    }

    updateJob(jobId, {
      step: "done",
      message: `Imported ${createdSessions.length} ITP${createdSessions.length !== 1 ? "s" : ""}`,
      percent: 100,
      result: {
        imported: createdSessions.length,
        total_items: createdSessions.reduce((sum, s) => sum + s.items.length, 0),
        sessions: createdSessions,
      },
    });
  } catch (err) {
    if (signal.aborted) {
      updateJob(jobId, { step: "cancelled", message: "Cancelled", percent: 0 });
      return;
    }
    console.error("Import job error:", err);
    updateJob(jobId, { step: "error", message: "Import failed. Please try again.", percent: 0, error: String(err) });
  }
}
