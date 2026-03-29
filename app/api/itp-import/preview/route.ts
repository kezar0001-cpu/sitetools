import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

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
  phase: string;
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
    parts.push(XLSX.utils.sheet_to_csv(sheet));
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
      if (typeof item.phase !== "string" || !item.phase.trim()) item.phase = "General";
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

const IMPORT_SYSTEM_PROMPT = `You are a senior Australian civil construction Quality Assurance engineer with 20+ years of experience preparing Inspection & Test Plans (ITPs). You analyse specification documents, engineering drawings, project scopes, and construction documents, then generate phase-based ITPs that comply with AS/NZS ISO 9001 and align with state road authority specifications.

## Your task
1. Analyse the uploaded document thoroughly
2. Identify EVERY distinct construction activity/task that warrants its own ITP
3. For each activity, generate a phase-based ITP with 8–15 inspection items across 3–6 work phases

## Phase-based methodology

Each ITP must be organised into work phases that reflect the real progression of work on site. Choose phases specific to each activity — do NOT use a fixed template. Examples: Site Establishment, Demolish & Excavate, Drainage / Stormwater, Sub-base & Kerbs, Footpaths, Thresholds, Structural Works, Finishing & Reinstatement.

Under each phase, list simple sequential activity descriptions — not verbose checklists.

## Inspection point types
- **hold**: Mandatory stop — work CANNOT proceed until Superintendent inspects and releases. Use ONLY at critical quality gates (levels inspection, formwork inspection, pre-cover). Typically 2–3 per ITP.
- **witness**: Notification point — Superintendent notified, may attend, work may proceed. Used for the majority of items.
- **review**: Document/record review — no physical inspection. Used sparingly for paperwork.

## Output format

Each ITP object must have:
- task_description: short plain-English name (max 12 words)
- items: array of inspection points

Each item must have:
- type: "hold" | "witness" | "review"
- phase: work phase name (e.g. "Site Establishment", "Excavation")
- title: short action phrase (max 8 words)
- description: one plain sentence — what is being checked
- reference_standard: specific Australian Standard and clause (e.g. "AS 3600 Cl. 17.1.3")
- responsibility: "contractor" | "superintendent" | "third_party"
- records_required: specific documents/evidence produced
- acceptance_criteria: measurable pass/fail criterion with tolerance

## Australian Standards reference (use only those relevant)
AS 3600, AS 1379, AS 1012, AS 3610 (concrete) | AS/NZS 4671 (rebar) | AS 4100, AS/NZS 1554 (steel/welding) | AS 1289, AS 3798 (earthworks) | Austroads AGPT04 (pavements) | AS 2159 (piling) | AS 3700 (masonry) | AS 3725, AS/NZS 3500, AS 1597 (drainage) | AS 2876 (kerb) | AS 1742 (traffic) | AS 1428 (access) | AS 2870 (residential footings) | AS 4678 (retaining walls) | WHS Regulation 2017

Return ONLY a valid JSON array of ITP objects. No markdown, no explanation, no code fences.`;

// POST /api/itp-import/preview
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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const companyId = formData.get("company_id") as string | null;

  if (!file || !companyId) {
    return NextResponse.json({ error: "file and company_id are required." }, { status: 400 });
  }

  // Validate file type
  const fileType = SUPPORTED_TYPES[file.type];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extMap: Record<string, string> = {
    pdf: "pdf", doc: "docx", docx: "docx", xlsx: "xlsx", xls: "xls", txt: "txt", csv: "csv",
  };
  if (!fileType && !extMap[ext]) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, DOCX, XLSX, or TXT files." },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 400 });
  }

  // Verify company membership
  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const effectiveType = (fileType && fileType !== "auto") ? fileType : ext;

  let documentText = "";
  try {
    switch (effectiveType) {
      case "pdf":  documentText = await extractTextFromPdf(buffer); break;
      case "docx": documentText = await extractTextFromDocx(buffer); break;
      case "xlsx":
      case "xls":
      case "csv":  documentText = extractTextFromExcel(buffer); break;
      case "txt":  documentText = buffer.toString("utf-8"); break;
      default:
        return NextResponse.json({ error: "Could not process file." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to read file content." }, { status: 500 });
  }

  if (documentText.length > 80_000) {
    documentText = documentText.slice(0, 80_000) + "\n\n[Document truncated]";
  }

  if (!documentText.trim()) {
    return NextResponse.json(
      { error: "Could not extract any text from this document. The file may be empty, scanned images, or corrupted." },
      { status: 422 }
    );
  }

  const userPrompt = `Analyse the following document and generate ITPs for every distinct construction activity found.\n\nDocument filename: ${file.name}\n\nDocument content:\n\n${documentText}`;

  let itps: GeneratedItp[];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    const message = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: IMPORT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const textBlock = message.content.find((b) => b.type === "text");
    const responseText = textBlock && "text" in textBlock ? textBlock.text.trim() : "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
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
    console.error("Claude preview error:", err);
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "AI service configuration error." }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "AI service is busy. Please wait and try again." }, { status: 429 });
    }
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Document processing timed out. Try a smaller document." }, { status: 504 });
    }
    return NextResponse.json({ error: "AI processing failed. Please try again." }, { status: 500 });
  }

  // Return draft sessions WITHOUT saving to DB
  return NextResponse.json({ sessions: itps });
}
