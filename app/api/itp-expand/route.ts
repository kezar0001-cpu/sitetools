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
// Types
// ---------------------------------------------------------------------------

type Responsibility = "contractor" | "superintendent" | "third_party";

interface ExpandedItem {
  type: "witness" | "hold";
  title: string;
  description: string;
  reference_standard: string;
  responsibility: Responsibility;
  records_required: string;
  acceptance_criteria: string;
}

const VALID_TYPES = ["witness", "hold"];
const VALID_RESPONSIBILITIES = ["contractor", "superintendent", "third_party"];

function validateExpandedItems(raw: unknown): ExpandedItem[] | null {
  if (!Array.isArray(raw) || raw.length !== 1) return null;
  for (const item of raw) {
    if (
      typeof item !== "object" ||
      item === null ||
      !VALID_TYPES.includes(item.type) ||
      typeof item.title !== "string" ||
      typeof item.description !== "string"
    ) return null;
    if (typeof item.reference_standard !== "string") item.reference_standard = "";
    if (!VALID_RESPONSIBILITIES.includes(item.responsibility)) item.responsibility = "contractor";
    if (typeof item.records_required !== "string") item.records_required = "";
    if (typeof item.acceptance_criteria !== "string") item.acceptance_criteria = "";
  }
  return raw as ExpandedItem[];
}

// ---------------------------------------------------------------------------
// System prompt — item expansion
// ---------------------------------------------------------------------------

const EXPAND_SYSTEM_PROMPT = `You are a senior Australian civil construction Quality Assurance engineer. You take a single inspection activity description and produce exactly one detailed inspection item that a site supervisor would actually check.

## What you do

The user gives you a brief description like "Check the concrete pour" or "Verify drainage pipe installation". You identify the single most important inspection check for that activity and return it as one fully-specified inspection item.

## Rules
- Return EXACTLY 1 item (no more, no less)
- Keep the title short (max 8 words) and action-oriented
- Keep the description to one plain sentence
- Use "hold" type ONLY if the activity is a genuine critical quality gate
- Use "witness" for everything else
- Reference the relevant Australian Standard clause
- Acceptance criteria must be measurable with tolerances

## Australian Standards (use those relevant)
AS 3600, AS 1379, AS 1012, AS 3610 (concrete) | AS/NZS 4671 (rebar) | AS 4100, AS/NZS 1554 (steel/welding) | AS 1289, AS 3798 (earthworks) | Austroads AGPT04 (pavements) | AS 2159 (piling) | AS 3725, AS/NZS 3500, AS 1597 (drainage) | AS 2876 (kerb) | AS 1742 (traffic) | AS 1428 (access) | AS 2870 (residential footings) | AS 4678 (retaining walls) | WHS Regulation 2017

Return ONLY a valid JSON array containing exactly 1 object. No markdown, no explanation, no code fences.`;

// ---------------------------------------------------------------------------
// POST /api/itp-expand
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

  let body: { description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json({ error: "description is required." }, { status: 400 });
  }

  const apiKey = await getSecret("ANTHROPIC_API_KEY", supabaseAdmin);
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured — API key not found." }, { status: 500 });
  }
  const anthropic = new Anthropic({ apiKey });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    const message = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: EXPAND_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Generate exactly 1 inspection item for this activity:\n\n"${description}"\n\nThe item must have:\n- type: "hold" | "witness"\n- title: short action phrase (max 8 words)\n- description: one plain sentence\n- reference_standard: Australian Standard clause\n- responsibility: "superintendent" | "third_party"\n- records_required: specific documents\n- acceptance_criteria: measurable criterion with tolerance\n\nReturn ONLY a valid JSON array containing exactly 1 object.`,
          },
        ],
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

    const validated = parsed !== null ? validateExpandedItems(parsed) : null;
    if (!validated) {
      return NextResponse.json({ error: "Failed to expand activity. Try a more specific description." }, { status: 422 });
    }

    return NextResponse.json({ items: validated });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out." }, { status: 504 });
    }
    return NextResponse.json({ error: "AI processing failed." }, { status: 500 });
  }
}
