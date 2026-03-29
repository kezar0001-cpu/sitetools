import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

type Responsibility = "contractor" | "superintendent" | "third_party";

interface ItpItem {
  type: "witness" | "hold" | "review";
  phase?: string;
  title: string;
  description: string;
  reference_standard: string;
  responsibility: Responsibility;
  records_required: string;
  acceptance_criteria: string;
}

function fallbackItems(): ItpItem[] {
  return [
    {
      type: "witness",
      title: "Review drawings and pre-start",
      description: "Confirm approved-for-construction documents are on site and SWMS briefing completed.",
      reference_standard: "AS/NZS ISO 9001",
      responsibility: "contractor",
      records_required: "Document register, SWMS sign-on sheet",
      acceptance_criteria: "All documents current revision, pre-start requirements satisfied",
    },
    {
      type: "witness",
      title: "Material delivery and conformance",
      description: "Verify delivered materials match approved specifications and check test certificates.",
      reference_standard: "Project specification",
      responsibility: "contractor",
      records_required: "Delivery dockets, material test certificates",
      acceptance_criteria: "Materials conform to specified grade with valid test certificates",
    },
    {
      type: "hold",
      title: "Set-out and levels verification",
      description: "Survey confirms all dimensions, alignments, and levels within design tolerances.",
      reference_standard: "Project drawings",
      responsibility: "superintendent",
      records_required: "Registered surveyor set-out certificate",
      acceptance_criteria: "All dimensions and levels within ±10 mm of design",
    },
    {
      type: "witness",
      title: "Formwork and reinforcement check",
      description: "Inspect formwork alignment, bracing, and reinforcement placement.",
      reference_standard: "AS 3600 Cl. 17.1.3",
      responsibility: "contractor",
      records_required: "Inspection checklist, photographs",
      acceptance_criteria: "Cover ≥40 mm per AS 3600 Table 4.10.3.2",
    },
    {
      type: "hold",
      title: "Pre-pour superintendent inspection",
      description: "Mandatory hold for superintendent inspection before concrete is placed.",
      reference_standard: "AS 3600",
      responsibility: "superintendent",
      records_required: "Hold point release form, inspection photographs",
      acceptance_criteria: "All preceding items signed off, work conforms to drawings",
    },
    {
      type: "witness",
      title: "In-process quality testing",
      description: "Conduct required quality tests and verify acceptance criteria met.",
      reference_standard: "Project specification",
      responsibility: "third_party",
      records_required: "NATA-accredited test reports",
      acceptance_criteria: "All test results within specification limits",
    },
    {
      type: "witness",
      title: "Post-work visual inspection",
      description: "Inspect completed work for defects and conformance to drawings.",
      reference_standard: "Project specification",
      responsibility: "contractor",
      records_required: "Completion photographs, inspection checklist",
      acceptance_criteria: "Work free of visible defects, within specified tolerances",
    },
  ];
}

function validateItems(raw: unknown): ItpItem[] | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  const validTypes = ["witness", "hold", "review"];
  const validResponsibilities = ["contractor", "superintendent", "third_party"];
  for (const item of raw) {
    if (
      typeof item !== "object" ||
      item === null ||
      !validTypes.includes(item.type) ||
      typeof item.title !== "string" ||
      typeof item.description !== "string"
    ) {
      return null;
    }
    // Normalise optional structured fields with defaults
    if (typeof item.phase === "string" && item.phase.trim()) { /* keep it */ } else { delete item.phase; }
    if (typeof item.reference_standard !== "string") item.reference_standard = "";
    if (!validResponsibilities.includes(item.responsibility)) item.responsibility = "contractor";
    if (typeof item.records_required !== "string") item.records_required = "";
    if (typeof item.acceptance_criteria !== "string") item.acceptance_criteria = "";
  }
  return raw as ItpItem[];
}

// SSE helper: send a named event
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompt — Australian civil construction ITP methodology
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior Australian civil construction Quality Assurance engineer with 20+ years of experience preparing Inspection & Test Plans (ITPs). You produce ITPs that comply with AS/NZS ISO 9001 and align with state road authority specifications.

## What you generate

A focused ITP for a single construction activity — a sequential list of inspection points that follow the physical construction sequence from preparation through to completion.

Each item is a simple, plain activity description — one thing that needs checking at that point in the sequence. NOT verbose checklists.

## Inspection point types
- **hold**: Mandatory stop — work CANNOT proceed until the Superintendent inspects and releases. Use ONLY at genuinely critical quality gates (levels inspection, formwork inspection, pre-cover). Maximum 2–3 per ITP.
- **witness**: Notification point — Superintendent notified, may attend, work may proceed. The majority of items.

## Rules
- Generate 5–10 items in construction sequence order
- Keep titles short (max 8 words), action-oriented
- Keep descriptions to one plain sentence
- Every item must reference the relevant Australian Standard clause
- Acceptance criteria must be measurable with tolerances
- Each ITP should feel unique — driven by the specific task, not a template

## Australian Standards (use only those relevant)
AS 3600, AS 1379, AS 1012, AS 3610 (concrete) | AS/NZS 4671 (rebar) | AS 4100, AS/NZS 1554 (steel/welding) | AS 1289, AS 3798, AS 1726 (earthworks) | Austroads AGPT04 (pavements) | AS 2159 (piling) | AS 3700 (masonry) | AS 3725, AS/NZS 3500, AS 1597 (drainage) | AS 2876 (kerb) | AS 1742 (traffic) | AS 1428 (access) | AS 2870 (residential footings) | AS 4678 (retaining walls) | WHS Regulation 2017 | AS/NZS ISO 9001`;

const USER_PROMPT_TEMPLATE = `Task: {TASK}

Generate a focused ITP for this specific construction activity. List the sequential inspection points from preparation through to completion.

Each item must have:
- type: "hold" | "witness"
- title: short action phrase (max 8 words)
- description: one plain sentence — what is being checked
- reference_standard: specific Australian Standard and clause (e.g. "AS 3600 Cl. 17.1.3")
- responsibility: "contractor" | "superintendent" | "third_party"
- records_required: specific documents/evidence produced
- acceptance_criteria: measurable pass/fail criterion with tolerance

Hold points only at critical stages (levels, formwork, pre-cover etc.).

Return ONLY a valid JSON array of 5–10 items. No markdown, no explanation, no code fences.`;

export async function POST(req: NextRequest) {
  // Authenticate via Bearer token
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

  // Parse body
  let body: {
    task_description?: string;
    company_id?: string;
    project_id?: string;
    site_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { task_description, company_id, project_id, site_id } = body;
  if (!task_description || !company_id) {
    return NextResponse.json(
      { error: "task_description and company_id are required." },
      { status: 400 }
    );
  }

  // Verify the requesting user belongs to company_id
  const { data: membership, error: memErr } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", company_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memErr || !membership) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Set up SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      }

      // Step 1: Analyzing task
      send("status", { step: "analyzing", message: "Analysing task requirements…" });

      let items: ItpItem[];
      let usedFallback = false;

      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30_000);

        let responseText = "";
        try {
          // Step 2: Generating ITP
          send("status", { step: "generating", message: "Generating inspection & test plan…" });

          const streamResponse = anthropic.messages.stream(
            {
              model: "claude-sonnet-4-6",
              max_tokens: 4096,
              system: SYSTEM_PROMPT,
              messages: [
                {
                  role: "user",
                  content: USER_PROMPT_TEMPLATE.replace("{TASK}", task_description),
                },
              ],
            },
            { signal: abortController.signal }
          );

          // Stream text chunks to the client
          for await (const event of streamResponse) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              responseText += event.delta.text;
              send("chunk", { text: event.delta.text });
            }
          }

          clearTimeout(timeoutId);
        } catch {
          clearTimeout(timeoutId);
          throw new Error("Claude request failed");
        }

        // Parse and validate the JSON response
        responseText = responseText.trim();
        let parsed: unknown;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          // Try to extract JSON array from response
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
          } else {
            parsed = null;
          }
        }

        const validated = parsed !== null ? validateItems(parsed) : null;
        if (validated) {
          items = validated;
        } else {
          items = fallbackItems();
          usedFallback = true;
        }
      } catch {
        items = fallbackItems();
        usedFallback = true;
      }

      // Step 3: Saving items
      send("status", { step: "saving", message: "Saving inspection & test plan…" });

      // Insert a new itp_sessions record
      const { data: session, error: sessionErr } = await supabaseAdmin
        .from("itp_sessions")
        .insert({
          company_id,
          task_description,
          project_id: project_id ?? null,
          site_id: site_id ?? null,
          created_by_user_id: user.id,
        })
        .select("id, company_id, task_description, created_at, project_id, site_id, status")
        .single();

      if (sessionErr || !session) {
        send("error", { error: "Failed to create ITP session." });
        controller.close();
        return;
      }

      const rows = items.map((item, idx) => ({
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
        .select(
          "id, session_id, slug, type, phase, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng, reference_standard, responsibility, records_required, acceptance_criteria"
        );

      if (insertErr || !inserted) {
        send("error", { error: "Failed to save ITP items." });
        controller.close();
        return;
      }

      // Audit log: session created via AI generate
      await supabaseAdmin.from("itp_audit_log").insert({
        session_id: session.id,
        item_id: null,
        action: "create",
        performed_by_user_id: user.id,
        new_values: {
          task_description,
          source: "ai_generate",
          items_count: inserted.length,
        },
      });

      // Send final result
      send("done", {
        session,
        items: inserted,
        meta: { usedFallback },
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
