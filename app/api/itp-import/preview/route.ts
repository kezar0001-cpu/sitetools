import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
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

// POST /api/itp-import/preview
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
  if ((!fileType || fileType === "auto") && !EXT_MAP[ext]) {
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

  if (!documentText.trim()) {
    return NextResponse.json(
      { error: "Could not extract any text from this document. The file may be empty, scanned images, or corrupted." },
      { status: 422 }
    );
  }

  if (documentText.length > 80_000) {
    documentText = documentText.slice(0, 80_000) + "\n\n[Document truncated]";
  }

  const userPrompt = `Analyse the following document and generate ITPs for every distinct construction activity found.\n\nDocument filename: ${file.name}\n\nDocument content:\n\n${documentText}`;

  // Resolve Anthropic API key from env or Supabase vault
  const apiKey = await getSecret("ANTHROPIC_API_KEY", supabaseAdmin);
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured — API key not found." }, { status: 500 });
  }
  const anthropic = new Anthropic({ apiKey });

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

    // Return draft sessions WITHOUT saving to DB
    return NextResponse.json({ sessions: validated });
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
}
