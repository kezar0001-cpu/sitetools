import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

function fallbackItems(): ItpItem[] {
  return [
    {
      type: "review",
      title: "Review approved drawings and specs",
      description: "Confirm current revision of drawings, specifications, and approved-for-construction documents are on site and referenced.",
      reference_standard: "AS/NZS ISO 9001",
      responsibility: "contractor",
      records_required: "Document transmittal register, drawing revision log",
      acceptance_criteria: "All documents are current revision and stamped 'Approved for Construction'",
    },
    {
      type: "witness",
      title: "Pre-work site inspection",
      description: "Inspect site conditions, access, traffic management, services locations, and confirm SWMS/JSA briefing completed before work commences.",
      reference_standard: "WHS Regulation 2017",
      responsibility: "contractor",
      records_required: "Site inspection checklist, SWMS sign-on sheet, dial-before-you-dig confirmation",
      acceptance_criteria: "All pre-start requirements satisfied, hazards identified and controlled per SWMS",
    },
    {
      type: "witness",
      title: "Material delivery and conformance",
      description: "Verify delivered materials match approved specifications, check test certificates, batch numbers, and storage conditions.",
      reference_standard: "Project specification",
      responsibility: "contractor",
      records_required: "Delivery dockets, material test certificates, supplier conformance certificates",
      acceptance_criteria: "Materials conform to specified grade/class with valid test certificates within shelf life",
    },
    {
      type: "hold",
      title: "Set-out and levels verification",
      description: "Survey confirms all set-out dimensions, alignments, and levels are within design tolerances before construction proceeds.",
      reference_standard: "Project drawings",
      responsibility: "superintendent",
      records_required: "Registered surveyor report, set-out confirmation certificate",
      acceptance_criteria: "All dimensions and levels within ±10 mm of design or as specified in contract",
    },
    {
      type: "hold",
      title: "Pre-pour / pre-cover inspection",
      description: "Mandatory hold point for superintendent inspection of completed work before it is concealed by subsequent activities.",
      reference_standard: "Project specification",
      responsibility: "superintendent",
      records_required: "Hold point release form, inspection photographs",
      acceptance_criteria: "All preceding ITP items signed off, work conforms to drawings and specification",
    },
    {
      type: "witness",
      title: "In-process quality testing",
      description: "Conduct required quality tests during construction at the specified frequency and verify results meet acceptance criteria.",
      reference_standard: "Project specification",
      responsibility: "third_party",
      records_required: "NATA-accredited test reports, test location plan",
      acceptance_criteria: "All test results within specification limits, non-conformances documented",
    },
    {
      type: "witness",
      title: "Post-work visual inspection",
      description: "Completed work visually inspected for defects, finish quality, cleanliness, and overall conformance to drawings and specification.",
      reference_standard: "Project specification",
      responsibility: "contractor",
      records_required: "Inspection checklist, defect register (if applicable), completion photographs",
      acceptance_criteria: "Work free of visible defects, compliant with finish and dimensional tolerances specified",
    },
    {
      type: "review",
      title: "As-built documentation and handover",
      description: "Compile as-built survey, test records, quality records, and warranties for lot handover.",
      reference_standard: "AS/NZS ISO 9001",
      responsibility: "contractor",
      records_required: "As-built drawings, compiled test results, lot package, warranty certificates",
      acceptance_criteria: "Complete documentation package submitted and accepted by superintendent",
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

An Inspection & Test Plan (ITP) is a structured quality control document that breaks a construction activity into its sequential inspection checkpoints. Each checkpoint defines:
- WHAT is being checked (the activity/element)
- WHEN it is checked (the construction sequence position)
- WHO checks it (Contractor, Superintendent, or Third Party)
- HOW it is verified (acceptance criteria with measurable tolerances)
- WHAT EVIDENCE is produced (records, test reports, certificates)
- WHICH STANDARD governs it (Australian Standard clause reference)

## Inspection point types

- **hold**: Mandatory stop point — work CANNOT proceed until the Superintendent (or nominated party) has inspected and formally released the hold. Used for critical quality gates where defects would be concealed by subsequent work or where safety/structural integrity is at stake.
- **witness**: Notification point — the Superintendent must be notified and given the opportunity to attend. Work MAY proceed if the Superintendent does not attend within the notification period. Used for important but non-critical checks.
- **review**: Document/record review — verification of paperwork, test certificates, design documents, or quality records. No physical site inspection required. Used at the start (document review) and end (as-built handover) of activities, and for reviewing test results.

## ITP structure requirements

Every ITP you generate MUST follow this structure:

1. **Start with document review** (review point): Confirm approved-for-construction drawings, specifications, and relevant standards are current and on site.
2. **Pre-work inspections** (witness points): Site conditions, materials verification, equipment checks, safety documentation.
3. **Construction sequence checkpoints** (mix of witness and hold): Follow the actual physical construction sequence for THIS specific task. Hold points at critical quality gates, witness points for process monitoring.
4. **Testing and verification** (witness or hold): In-process and post-process testing per the relevant Australian Standard.
5. **Completion and handover** (review point): As-built documentation, compiled test records, lot handover package.

## Rules
- Generate 8–12 items (never fewer than 8)
- Items MUST follow the physical construction sequence for the specific task
- Every item must reference the specific Australian Standard clause that governs it
- Hold points should be 20–30% of total items — only at genuine critical quality gates
- Review points should bookend the ITP (document review at start, as-built at end)
- Acceptance criteria must be measurable with specific tolerances (not vague like "to specification")
- Records must specify the actual document type (e.g. "NATA-accredited compaction test report" not just "test report")
- Responsibility must reflect who VERIFIES the work: contractor (self-inspection), superintendent (client representative), third_party (independent lab/surveyor)

## Australian Standards reference (use only those relevant to the task)
- Concrete structures: AS 3600, AS 1379 (supply), AS 1012 (testing), AS 3610 (formwork)
- Steel reinforcement: AS/NZS 4671
- Structural steel: AS 4100, AS/NZS 1554 (welding)
- Earthworks & compaction: AS 1289 (soil testing), AS 3798 (earthworks guidelines), AS 1726 (site investigation)
- Flexible pavements: Austroads AGPT04, state road authority specifications
- Rigid pavements: AS 3600, AS 1379
- Piling: AS 2159
- Masonry: AS 3700
- Drainage & pipes: AS 3725 (culverts), AS/NZS 3500 (plumbing), AS 1597 (precast)
- Kerb & channel: AS 2876
- Traffic management: AS 1742, AS/NZS 1158 (lighting)
- Accessibility: AS 1428
- Residential footings: AS 2870
- Retaining walls: AS 4678
- Surveying: SP1 (ICSM standard)
- WHS: WHS Regulation 2017
- Quality management: AS/NZS ISO 9001`;

const USER_PROMPT_TEMPLATE = `Task: {TASK}

Analyse this specific construction activity. Consider:
- The exact materials, plant, and equipment involved
- The physical construction sequence from start to finish
- The critical quality gates where defects would be concealed
- The Australian Standards that govern each step
- The testing regime and frequencies required
- Who is responsible for verification at each stage

Generate a JSON array of 8–12 ITP items following the construction sequence.

Each item must have:
- type: "hold" | "witness" | "review"
- title: short action phrase specific to this task (max 10 words)
- description: one sentence explaining what is being inspected and why
- reference_standard: the specific Australian Standard and clause (e.g. "AS 3600 Cl. 17.1.3", "AS 1289.5.4.1") — use "Project specification" only if no AS applies
- responsibility: "contractor" | "superintendent" | "third_party"
- records_required: specific documents/evidence produced (e.g. "NATA-accredited compaction test report per lot", "Registered surveyor set-out certificate")
- acceptance_criteria: measurable pass/fail criterion with tolerance (e.g. "≥98% Standard MDD per AS 1289.5.4.1", "Cover ≥40 mm per AS 3600 Table 4.10.3.2")

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
