import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSecret } from "@/lib/server/get-secret";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ---------------------------------------------------------------------------
// System prompt — Construction diary text improvement
// ---------------------------------------------------------------------------

const IMPROVE_SYSTEM_PROMPT = `You are a senior construction site supervisor with 20+ years of experience writing professional, organized site diary entries. Your job is to take raw, messy text (often from voice-to-speech) and convert it into a clear, structured, professional site diary entry.

## What you do

Take messy, unstructured text and convert it into a well-organized site diary entry that is:
- Professional and clear
- Properly structured with bullet points or numbered lists where appropriate
- Grammatically correct with proper capitalization
- Organized by activity type or work area
- Concise but comprehensive

## Output format

Return ONLY the improved text as a plain string. Do not include any markdown formatting, code fences, or explanatory text. The output should be ready to paste directly into a site diary field.

## Rules
- Fix grammar, spelling, and punctuation
- Organize into clear sections or bullet points
- Use proper construction terminology
- Remove filler words ("um", "uh", "like", "you know")
- Keep the meaning and all important details intact
- Make it sound professional and factual
- Group related activities together
- Use proper sentence structure and capitalization`;

// ---------------------------------------------------------------------------
// POST /api/diary-improve-text
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

  let body: { text?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }

  const apiKey = await getSecret("ANTHROPIC_API_KEY", supabaseAdmin);
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured — API key not found." }, { status: 500 });
  }
  const anthropic = new Anthropic({ apiKey });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    const contextHint = body.context 
      ? `\n\nContext: This is for the "${body.context}" section of a construction site diary.` 
      : "";

    const message = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: IMPROVE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Improve and organize the following site diary text into a professional, structured entry:${contextHint}\n\n"""\n${text}\n"""\n\nReturn ONLY the improved text, ready to use.`,
          },
        ],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const textBlock = message.content.find((b) => b.type === "text");
    const improvedText = textBlock && "text" in textBlock ? textBlock.text.trim() : "";

    if (!improvedText) {
      return NextResponse.json({ error: "Failed to improve text. Please try again." }, { status: 422 });
    }

    return NextResponse.json({ text: improvedText });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out." }, { status: 504 });
    }
    return NextResponse.json({ error: "AI processing failed." }, { status: 500 });
  }
}
