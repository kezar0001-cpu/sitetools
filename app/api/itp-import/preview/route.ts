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

interface ItpItem {
  type: "witness" | "hold";
  title: string;
  description: string;
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

// POST /api/itp-import/preview
// Same as /api/itp-import but returns draft sessions without saving to DB
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

  const userPrompt = `Analyse the following document and generate ITPs for every distinct construction activity found.

Document filename: ${file.name}

Document content:

${documentText}`;

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
