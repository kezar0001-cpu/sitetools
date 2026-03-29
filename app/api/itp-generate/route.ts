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
  phase: string;
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
      type: "review",
      phase: "Site Establishment",
      title: "Review approved drawings and specs",
      description: "Confirm current revision of drawings, specifications, and approved-for-construction documents are on site.",
      reference_standard: "AS/NZS ISO 9001",
      responsibility: "contractor",
      records_required: "Document transmittal register, drawing revision log",
      acceptance_criteria: "All documents are current revision and stamped 'Approved for Construction'",
    },
    {
      type: "witness",
      phase: "Site Establishment",
      title: "Confirm site access and traffic management",
      description: "Verify site access routes, traffic control measures, and SWMS briefing completed.",
      reference_standard: "WHS Regulation 2017",
      responsibility: "contractor",
      records_required: "SWMS sign-on sheet, traffic management plan",
      acceptance_criteria: "All pre-start requirements satisfied, hazards controlled per SWMS",
    },
    {
      type: "witness",
      phase: "Demolish & Excavate",
      title: "Service location and clearance",
      description: "Confirm underground services located and marked prior to excavation commencing.",
      reference_standard: "AS 1726",
      responsibility: "contractor",
      records_required: "Dial-before-you-dig confirmation, services location report",
      acceptance_criteria: "All services identified, marked, and clearance obtained",
    },
    {
      type: "hold",
      phase: "Demolish & Excavate",
      title: "Excavation levels and dimensions",
      description: "Survey confirms excavation depth, width, and batter angles comply with design.",
      reference_standard: "Project drawings",
      responsibility: "superintendent",
      records_required: "Registered surveyor set-out certificate",
      acceptance_criteria: "All dimensions and levels within ±10 mm of design",
    },
    {
      type: "witness",
      phase: "Sub-base & Compaction",
      title: "Material delivery and conformance",
      description: "Verify delivered sub-base materials match approved specifications and check test certificates.",
      reference_standard: "AS 3798",
      responsibility: "contractor",
      records_required: "Delivery dockets, material test certificates",
      acceptance_criteria: "Materials conform to specified grade with valid test certificates",
    },
    {
      type: "hold",
      phase: "Sub-base & Compaction",
      title: "Compaction testing and approval",
      description: "NATA-accredited compaction testing at specified frequency before next layer proceeds.",
      reference_standard: "AS 1289.5.4.1",
      responsibility: "third_party",
      records_required: "NATA-accredited compaction test report per lot",
      acceptance_criteria: "≥98% Standard MDD per AS 1289.5.4.1",
    },
    {
      type: "witness",
      phase: "Construction",
      title: "Formwork and reinforcement check",
      description: "Inspect formwork alignment, bracing, and reinforcement placement before pour.",
      reference_standard: "AS 3600 Cl. 17.1.3",
      responsibility: "contractor",
      records_required: "Inspection checklist, photographs",
      acceptance_criteria: "Cover ≥40 mm per AS 3600 Table 4.10.3.2, ties at specified centres",
    },
    {
      type: "hold",
      phase: "Construction",
      title: "Pre-pour superintendent inspection",
      description: "Mandatory hold for superintendent inspection before concrete is placed.",
      reference_standard: "AS 3600",
      responsibility: "superintendent",
      records_required: "Hold point release form, inspection photographs",
      acceptance_criteria: "All preceding items signed off, work conforms to drawings",
    },
    {
      type: "witness",
      phase: "Testing & Verification",
      title: "In-process quality testing",
      description: "Conduct required quality tests during construction and verify acceptance criteria met.",
      reference_standard: "Project specification",
      responsibility: "third_party",
      records_required: "NATA-accredited test reports, test location plan",
      acceptance_criteria: "All test results within specification limits",
    },
    {
      type: "review",
      phase: "Completion & Handover",
      title: "As-built documentation and handover",
      description: "Compile as-built survey, test records, and warranties for lot handover.",
      reference_standard: "AS/NZS ISO 9001",
      responsibility: "contractor",
      records_required: "As-built drawings, compiled test results, warranty certificates",
      acceptance_criteria: "Complete documentation package accepted by superintendent",
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
    if (typeof item.phase !== "string" || !item.phase.trim()) item.phase = "General";
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

const SYSTEM_PROMPT = `You are a senior Australian civil construction Quality Assurance engineer with 20+ years of experience preparing Inspection & Test Plans (ITPs) for Tier 1 and Tier 2 contractors. You produce ITPs that comply with AS/NZS ISO 9001 quality management requirements and align with state road authority specifications (e.g. VicRoads, Transport for NSW, TMR, Main Roads WA).

## What an ITP is

An Inspection & Test Plan (ITP) is a structured quality control document organised by WORK PHASES. Each phase represents a distinct stage of construction, and under each phase sits a sequence of simple activity descriptions that need checking.

## Phase-based methodology

Every ITP you generate MUST be organised into work phases. Phases represent the real progression of work on site. Examples of phases include (but are NOT limited to):
- Site Establishment
- Demolish & Excavate
- Drainage / Stormwater
- Sub-base & Kerbs
- Footpaths
- Thresholds
- Structural Works
- Finishing & Reinstatement

Choose phases that are specific and appropriate to the task — do NOT use a fixed template. The phases should reflect what actually happens for THIS particular scope of work. Be creative and realistic; every ITP should have a unique set of phases driven by the work being described.

## Items within each phase

Under each phase, list simple, sequential activity descriptions — NOT verbose checklists. Each item describes one thing that needs checking at that point in the work sequence. Keep descriptions to a single plain sentence.

## Inspection point types

- **hold**: Mandatory stop — work CANNOT proceed until the Superintendent inspects and releases. Use ONLY at critical quality gates (e.g. levels inspection, formwork inspection, pre-cover). Hold points should be rare and meaningful.
- **witness**: Notification point — Superintendent notified, may attend, work may proceed. Used for the majority of inspection activities.
- **review**: Document/record review — no physical inspection. Used sparingly for paperwork verification.

## Rules
- Generate 8–15 items spread across 3–6 phases
- Each phase must have at least 2 items
- Items MUST follow the physical construction sequence within each phase
- Hold points ONLY at genuinely critical stages — typically 2–3 per ITP maximum
- Keep item titles short (max 8 words) and action-oriented
- Keep descriptions to one simple sentence — what is being checked
- Every item must reference the relevant Australian Standard clause
- Acceptance criteria must be measurable with tolerances
- Do NOT follow a rigid pattern — the phases and activities should be driven entirely by the nature of the task

## Australian Standards reference (use only those relevant)
- Concrete: AS 3600, AS 1379, AS 1012, AS 3610
- Reinforcement: AS/NZS 4671
- Steel: AS 4100, AS/NZS 1554
- Earthworks: AS 1289, AS 3798, AS 1726
- Pavements: Austroads AGPT04
- Piling: AS 2159
- Masonry: AS 3700
- Drainage: AS 3725, AS/NZS 3500, AS 1597
- Kerb: AS 2876
- Traffic: AS 1742, AS/NZS 1158
- Accessibility: AS 1428
- Residential footings: AS 2870
- Retaining walls: AS 4678
- Surveying: SP1 (ICSM)
- WHS: WHS Regulation 2017
- Quality: AS/NZS ISO 9001`;

const USER_PROMPT_TEMPLATE = `Task: {TASK}

Think about the real work phases this task goes through on site — from mobilisation through to completion. Break the work into logical phases, then list the sequential inspection activities under each phase.

Generate a JSON array of 8–15 ITP items grouped by phase. Each item must have:
- type: "hold" | "witness" | "review"
- phase: the work phase this activity belongs to (e.g. "Site Establishment", "Excavation", "Drainage / Stormwater")
- title: short action phrase (max 8 words)
- description: one plain sentence — what is being checked
- reference_standard: specific Australian Standard and clause (e.g. "AS 3600 Cl. 17.1.3")
- responsibility: "contractor" | "superintendent" | "third_party"
- records_required: specific documents/evidence produced
- acceptance_criteria: measurable pass/fail criterion with tolerance

Important:
- Use 3–6 phases that are specific to THIS task (not generic)
- Hold points only at critical stages (levels inspection, formwork inspection, pre-cover etc.)
- Items within each phase must follow the real construction sequence
- Do not repeat the same pattern across different tasks — each ITP should feel unique

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.`;

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
