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

type Responsibility = "contractor" | "superintendent" | "third_party";

interface ItpItem {
  type: "witness" | "hold" | "review";
  title: string;
  description: string;
  reference_standard: string;
  responsibility: Responsibility;
  records_required: string;
  acceptance_criteria: string;
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

const VALID_TYPES = ["witness", "hold", "review"];
const VALID_RESPONSIBILITIES = ["contractor", "superintendent", "third_party"];

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
        !VALID_TYPES.includes(item.type) ||
        typeof item.title !== "string" ||
        typeof item.description !== "string"
      ) return null;
      // Normalise optional structured fields
      if (typeof item.reference_standard !== "string") item.reference_standard = "";
      if (!VALID_RESPONSIBILITIES.includes(item.responsibility)) item.responsibility = "contractor";
      if (typeof item.records_required !== "string") item.records_required = "";
      if (typeof item.acceptance_criteria !== "string") item.acceptance_criteria = "";
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

const IMPORT_SYSTEM_PROMPT = `You are a senior Australian civil construction Quality Assurance engineer with 20+ years of experience preparing Inspection & Test Plans (ITPs). You analyse specification documents, engineering drawings, project scopes, and construction documents, then generate comprehensive ITPs that comply with AS/NZS ISO 9001 and align with state road authority specifications.

## Your task
1. Analyse the uploaded document thoroughly
2. Identify EVERY distinct construction activity/task that warrants its own ITP
3. For each activity, generate a complete ITP with 8–12 inspection checkpoints

## ITP structure for each activity

Each ITP must follow this sequence:
1. **Document review** (review point): Confirm approved drawings, specs, and standards are current
2. **Pre-work inspections** (witness points): Site conditions, materials, equipment, safety
3. **Construction sequence checkpoints** (mix of hold & witness): Follow the physical construction steps
4. **Testing and verification** (witness or hold): In-process and post-process testing
5. **Completion and handover** (review point): As-built documentation, compiled records

## Inspection point types
- **hold**: Mandatory stop — work CANNOT proceed until Superintendent inspects and releases. Use for critical quality gates where defects would be concealed.
- **witness**: Notification point — Superintendent notified, may attend, work may proceed. Use for important but non-critical checks.
- **review**: Document/record review — no physical inspection. Use for paperwork verification at start and end.

## Output format

Each ITP object must have:
- task_description: short plain-English name (max 12 words)
- items: array of inspection points

Each item must have:
- type: "hold" | "witness" | "review"
- title: short action phrase (max 10 words)
- description: one sentence explaining what is inspected and why
- reference_standard: specific Australian Standard and clause (e.g. "AS 3600 Cl. 17.1.3")
- responsibility: "contractor" | "superintendent" | "third_party"
- records_required: specific documents/evidence produced
- acceptance_criteria: measurable pass/fail criterion with tolerance

## Australian Standards reference (use only those relevant)
AS 3600, AS 1379, AS 1012, AS 3610 (concrete) | AS/NZS 4671 (rebar) | AS 4100, AS/NZS 1554 (steel/welding) | AS 1289, AS 3798 (earthworks) | Austroads AGPT04 (pavements) | AS 2159 (piling) | AS 3700 (masonry) | AS 3725, AS/NZS 3500, AS 1597 (drainage) | AS 2876 (kerb) | AS 1742 (traffic) | AS 1428 (access) | AS 2870 (residential footings) | AS 4678 (retaining walls) | WHS Regulation 2017

Return ONLY a valid JSON array of ITP objects. No markdown, no explanation, no code fences.`;

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
    updateJob(jobId, { step: "analyzing", message: "Analysing activities…", percent: 40 });

    const userPrompt = `Analyse the following document and generate ITPs for every distinct construction activity found.\n\nDocument filename: ${fileName}\n\nDocument content:\n\n${documentText}`;

    const message = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: IMPORT_SYSTEM_PROMPT,
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
        reference_standard: item.reference_standard || null,
        responsibility: item.responsibility || "contractor",
        records_required: item.records_required || null,
        acceptance_criteria: item.acceptance_criteria || null,
        sort_order: idx + 1,
      }));
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("itp_items")
        .insert(rows)
        .select("id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng, reference_standard, responsibility, records_required, acceptance_criteria");
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
