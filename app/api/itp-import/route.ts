import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export const runtime = "nodejs";
export const maxDuration = 120; // allow up to 2 min for large document AI processing

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Responsibility = "contractor" | "superintendent" | "third_party";

interface ItpItem {
  type: "witness" | "hold" | "review";
  title: string;
  description: string;
  reference_standard?: string;
  responsibility?: Responsibility;
  records_required?: string;
  acceptance_criteria?: string;
}

interface GeneratedItp {
  task_description: string;
  items: ItpItem[];
}

// ---------------------------------------------------------------------------
// Text extraction helpers
// ---------------------------------------------------------------------------

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

function extractTextFromTxt(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateItps(raw: unknown): GeneratedItp[] | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  for (const itp of raw) {
    if (
      typeof itp !== "object" ||
      itp === null ||
      typeof itp.task_description !== "string" ||
      !Array.isArray(itp.items) ||
      itp.items.length < 1
    ) {
      return null;
    }
    for (const item of itp.items) {
      if (
        typeof item !== "object" ||
        item === null ||
        !["witness", "hold", "review"].includes(item.type) ||
        typeof item.title !== "string" ||
        typeof item.description !== "string"
      ) {
        return null;
      }
    }
  }
  return raw as GeneratedItp[];
}

// ---------------------------------------------------------------------------
// Supported MIME types
// ---------------------------------------------------------------------------

const SUPPORTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
  "application/octet-stream": "auto", // fallback to extension detection
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/plain": "txt",
  "text/csv": "csv",
};

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

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

  // ── JSON "confirm" path: reviewed sessions payload from the import preview step ──
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let jsonBody: {
      company_id?: string;
      project_id?: string;
      site_id?: string;
      sessions?: GeneratedItp[];
    };
    try {
      jsonBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { company_id: companyId, project_id: projectId, site_id: siteId, sessions: reviewedSessions } = jsonBody;
    if (!companyId || !reviewedSessions || !Array.isArray(reviewedSessions) || reviewedSessions.length === 0) {
      return NextResponse.json({ error: "company_id and sessions array are required." }, { status: 400 });
    }

    // Validate structure
    const validated = validateItps(reviewedSessions);
    if (!validated) {
      return NextResponse.json({ error: "Invalid sessions payload." }, { status: 400 });
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

    // Save to DB (same logic as below)
    const createdSessions: Array<{ session: Record<string, unknown>; items: Record<string, unknown>[] }> = [];
    for (const itp of validated) {
      const { data: session, error: sessionErr } = await supabaseAdmin
        .from("itp_sessions")
        .insert({
          company_id: companyId,
          task_description: itp.task_description,
          project_id: projectId ?? null,
          site_id: siteId ?? null,
          created_by_user_id: user.id,
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

      // Audit log
      await supabaseAdmin.from("itp_audit_log").insert({
        session_id: session.id,
        item_id: null,
        action: "create",
        performed_by_user_id: user.id,
        new_values: { task_description: itp.task_description, source: "import_confirm", items_count: itp.items.length },
      });
    }

    if (createdSessions.length === 0) {
      return NextResponse.json({ error: "Failed to save generated ITPs." }, { status: 500 });
    }
    return NextResponse.json({
      imported: createdSessions.length,
      total_items: createdSessions.reduce((sum, s) => sum + s.items.length, 0),
      sessions: createdSessions,
    });
  }

  // ── Original multipart form data path ──

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
    return NextResponse.json(
      { error: "file and company_id are required." },
      { status: 400 }
    );
  }

  // Validate file type
  const fileType = SUPPORTED_TYPES[file.type];
  if (!fileType) {
    // Also check by extension as a fallback
    const ext = file.name.split(".").pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      pdf: "pdf",
      doc: "docx",
      docx: "docx",
      xlsx: "xlsx",
      xls: "xls",
      txt: "txt",
      csv: "csv",
    };
    if (!ext || !extMap[ext]) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload PDF, DOCX, XLSX, or TXT files." },
        { status: 400 }
      );
    }
  }

  // File size limit: 10 MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB." },
      { status: 400 }
    );
  }

  // Verify company membership
  const { data: membership, error: memErr } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memErr || !membership) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determine effective file type
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const effectiveType = (fileType && fileType !== "auto") ? fileType : ext;

  // Extract text from all document types
  let documentText = "";

  try {
    switch (effectiveType) {
      case "pdf":
        documentText = await extractTextFromPdf(buffer);
        break;
      case "docx":
        documentText = await extractTextFromDocx(buffer);
        break;
      case "xlsx":
      case "xls":
      case "csv":
        documentText = extractTextFromExcel(buffer);
        break;
      case "txt":
        documentText = extractTextFromTxt(buffer);
        break;
      default:
        return NextResponse.json(
          { error: "Could not process file." },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to read file content." },
      { status: 500 }
    );
  }

  // Truncate text to avoid excessive token usage (max ~80K chars)
  if (documentText.length > 80_000) {
    documentText = documentText.slice(0, 80_000) + "\n\n[Document truncated]";
  }

  // Build the Claude prompt
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
- description: one sentence with a measurable acceptance criterion — cite the relevant Australian Standard where applicable (e.g. "per AS 3600 Cl. 17.1.3", "AS 1289.5.4.1 >= 98% MDD")

Sequence rules for each ITP:
- Start with 1-2 witness points (preparatory / pre-work checks)
- Include at least 2 hold points at critical quality gates
- End with 1 witness point (post-work visual inspection)
- Order must follow the physical construction sequence

Australian Standards to consider (select those relevant):
- Concrete: AS 3600, AS 1379, AS 1012, AS 3610
- Steel reinforcement: AS 4671, AS/NZS 4671
- Structural steel / welding: AS 4100, AS/NZS 1554
- Earthworks / compaction: AS 1289, AS 1726
- Paving: Austroads AGPT, state road authority specs
- Piling: AS 2159
- Drainage / pipes: AS 3725, AS/NZS 3500, AS 1597
- Residential slabs: AS 2870
- Retaining walls: AS 4678

Return ONLY a valid JSON array of ITP objects. No markdown, no explanation, no code fences.

Example output format:
[
  {
    "task_description": "Strip footings concrete pour",
    "items": [
      { "type": "witness", "title": "Pre-pour formwork check", "description": "Verify formwork dimensions and bracing per AS 3610 Cl. 3.4." },
      { "type": "hold", "title": "Rebar placement hold", "description": "Confirm reinforcement cover, spacing and lap lengths per AS 3600 Cl. 17.1.3." }
    ]
  }
]`;

  if (!documentText.trim()) {
    return NextResponse.json(
      { error: "Could not extract any text from this document. The file may be empty, scanned images, or corrupted." },
      { status: 422 }
    );
  }

  const userPrompt = `Analyse the following document and generate ITPs for every distinct construction activity found.

Document filename: ${file.name}

Document content:

${documentText}`;

  // Call Claude
  let itps: GeneratedItp[];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    const message = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const textBlock = message.content.find((b) => b.type === "text");
    const responseText =
      textBlock && "text" in textBlock ? textBlock.text.trim() : "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from the response if Claude wrapped it
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = null;
        }
      }
    }

    const validated = parsed !== null ? validateItps(parsed) : null;
    if (!validated || validated.length === 0) {
      return NextResponse.json(
        { error: "Could not extract ITPs from this document. Try a more detailed specification." },
        { status: 422 }
      );
    }
    itps = validated;
  } catch (err) {
    console.error("Claude import error:", err);
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "AI service configuration error. Please contact support." },
        { status: 500 }
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "AI service is busy. Please wait a moment and try again." },
        { status: 429 }
      );
    }
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Document processing timed out. Try a smaller document." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "AI processing failed. Please try again." },
      { status: 500 }
    );
  }

  // Create ITP sessions and items in the database
  const createdSessions: Array<{
    session: Record<string, unknown>;
    items: Record<string, unknown>[];
  }> = [];

  for (const itp of itps) {
    // Insert session
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("itp_sessions")
      .insert({
        company_id: companyId,
        task_description: itp.task_description,
        project_id: projectId,
        site_id: siteId,
        created_by_user_id: user.id,
      })
      .select(
        "id, company_id, task_description, created_at, project_id, site_id, status"
      )
      .single();

    if (sessionErr || !session) {
      console.error("Session insert error:", sessionErr);
      continue;
    }

    // Insert items.
    // Slug is omitted — the DB column default generates a random unique value
    // to avoid collisions when multiple sessions share identical item titles.
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
      .select(
        "id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng, reference_standard, responsibility, records_required, acceptance_criteria"
      );

    if (insertErr || !inserted) {
      console.error("Items insert error:", insertErr);
      continue;
    }

    createdSessions.push({ session, items: inserted });

    // Audit log
    await supabaseAdmin.from("itp_audit_log").insert({
      session_id: session.id,
      item_id: null,
      action: "create",
      performed_by_user_id: user.id,
      new_values: { task_description: itp.task_description, source: "import_document", items_count: itp.items.length },
    });
  }

  if (createdSessions.length === 0) {
    return NextResponse.json(
      { error: "Failed to save generated ITPs." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    imported: createdSessions.length,
    total_items: createdSessions.reduce((sum, s) => sum + s.items.length, 0),
    sessions: createdSessions,
  });
}
