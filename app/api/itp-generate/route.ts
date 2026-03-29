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

function detectPhaseCategory(phaseName?: string, taskDescription?: string): string {
  const text = `${phaseName ?? ""} ${taskDescription ?? ""}`.toLowerCase();
  if (/demolish|excavat|strip|clear|remov|grub|fell|tree/.test(text)) return "demolish";
  if (/drain|stormwater|pit|pipe|culvert/.test(text)) return "drainage";
  if (/sub.?base|kerb|gutter|pavement|asphalt|seal/.test(text)) return "pavement";
  if (/concrete|pour|slab|footing|foundation|formwork/.test(text)) return "concrete";
  if (/footpath|path|walkway|cycleway/.test(text)) return "footpath";
  if (/steel|structural steel|weld/.test(text)) return "steel";
  if (/earth.?work|fill|compact|embankment/.test(text)) return "earthworks";
  return "general";
}

const FALLBACK_SETS: Record<string, Omit<ItpItem, "phase">[]> = {
  demolish: [
    {
      type: "witness",
      title: "Pre-demolition site survey",
      description: "Confirm existing services located, marked, and isolated before demolition begins.",
      reference_standard: "AS 2601 Cl. 1.6",
      responsibility: "contractor",
      records_required: "Dial Before You Dig results, service isolation certificates",
      acceptance_criteria: "All services confirmed isolated with utility provider sign-off",
    },
    {
      type: "witness",
      title: "Erosion and sediment controls",
      description: "Install and verify erosion and sediment control measures prior to ground disturbance.",
      reference_standard: "Blue Book (Landcom 2004)",
      responsibility: "contractor",
      records_required: "ESCP layout, installation photographs",
      acceptance_criteria: "Controls installed per approved ESCP and functioning correctly",
    },
    {
      type: "hold",
      title: "Demolition exclusion zone verification",
      description: "Superintendent confirms exclusion zones, traffic management, and safety barriers in place.",
      reference_standard: "WHS Regulation 2017 Cl. 142",
      responsibility: "superintendent",
      records_required: "TCP sign-off, exclusion zone photographs",
      acceptance_criteria: "All exclusion zones, barriers, and signage compliant with approved TCP",
    },
    {
      type: "witness",
      title: "Demolition and removal execution",
      description: "Monitor demolition of structures, trees, vegetation, kerbs, and fencing per scope.",
      reference_standard: "AS 2601",
      responsibility: "contractor",
      records_required: "Daily progress photographs, waste disposal dockets",
      acceptance_criteria: "All items within scope demolished and removed from site",
    },
    {
      type: "witness",
      title: "Waste classification and disposal",
      description: "Verify waste is classified, segregated, and disposed of to licensed facilities.",
      reference_standard: "EPA waste classification guidelines",
      responsibility: "third_party",
      records_required: "Waste classification reports, tip dockets, recycling receipts",
      acceptance_criteria: "All waste disposed per EPA requirements with valid tip dockets",
    },
    {
      type: "hold",
      title: "Excavation levels and limits check",
      description: "Survey confirms excavation extents and levels comply with design.",
      reference_standard: "Project drawings",
      responsibility: "superintendent",
      records_required: "Survey pick-up of excavated levels, photographs",
      acceptance_criteria: "Excavation levels within ±50 mm of design, extents within boundary",
    },
  ],
  drainage: [
    {
      type: "witness",
      title: "Trench excavation and bedding",
      description: "Verify trench dimensions, grade, and bedding material conform to design.",
      reference_standard: "AS 3725 Cl. 5.2",
      responsibility: "contractor",
      records_required: "Trench inspection checklist, grade survey",
      acceptance_criteria: "Trench grade within ±10 mm, bedding compacted to 95% SMDD",
    },
    {
      type: "witness",
      title: "Pipe delivery and condition check",
      description: "Inspect pipes for damage and verify class and size match specifications.",
      reference_standard: "AS/NZS 4058",
      responsibility: "contractor",
      records_required: "Delivery dockets, pipe inspection photographs",
      acceptance_criteria: "Pipes undamaged with class and diameter matching design",
    },
    {
      type: "hold",
      title: "Pipe laying and jointing inspection",
      description: "Superintendent inspects pipe alignment, jointing, and grade before backfill.",
      reference_standard: "AS 3725 Cl. 6.3",
      responsibility: "superintendent",
      records_required: "Hold point release form, joint inspection photographs",
      acceptance_criteria: "Pipes laid to design grade ±5 mm, joints sealed per manufacturer spec",
    },
    {
      type: "witness",
      title: "Pit and headwall construction",
      description: "Inspect pit dimensions, invert levels, and headwall construction.",
      reference_standard: "AS 3725 Cl. 8",
      responsibility: "contractor",
      records_required: "Pit schedule check, level survey, photographs",
      acceptance_criteria: "Invert levels within ±10 mm of design, pits square and plumb",
    },
    {
      type: "witness",
      title: "Pipe pressure or infiltration test",
      description: "Conduct mandrel or water test to verify pipe integrity.",
      reference_standard: "AS 3725 Cl. 10",
      responsibility: "third_party",
      records_required: "NATA-accredited test reports",
      acceptance_criteria: "All test results within specification limits",
    },
    {
      type: "witness",
      title: "Backfill and compaction",
      description: "Verify backfill material and compaction meet specification requirements.",
      reference_standard: "AS 3798 Cl. 7",
      responsibility: "contractor",
      records_required: "Compaction test results, material certification",
      acceptance_criteria: "Compaction ≥95% SMDD per AS 1289.5.4.1",
    },
  ],
  earthworks: [
    {
      type: "witness",
      title: "Subgrade preparation and proof roll",
      description: "Inspect subgrade for soft spots and verify proof rolling results.",
      reference_standard: "AS 3798 Cl. 6.2",
      responsibility: "contractor",
      records_required: "Proof roll photographs, soft spot treatment records",
      acceptance_criteria: "No visible deflection under proof roll loading",
    },
    {
      type: "hold",
      title: "Foundation level survey",
      description: "Survey confirms formation levels comply with design before fill placement.",
      reference_standard: "Project drawings",
      responsibility: "superintendent",
      records_required: "Registered surveyor level report",
      acceptance_criteria: "All levels within ±25 mm of design",
    },
    {
      type: "witness",
      title: "Fill material conformance",
      description: "Verify imported fill material meets specification requirements.",
      reference_standard: "AS 3798 Cl. 4",
      responsibility: "contractor",
      records_required: "Material test certificates, source approval",
      acceptance_criteria: "Material classification and properties within specification limits",
    },
    {
      type: "witness",
      title: "Layer placement and moisture",
      description: "Verify fill placed in specified layer thicknesses at optimum moisture content.",
      reference_standard: "AS 3798 Cl. 7.2",
      responsibility: "contractor",
      records_required: "Layer thickness records, moisture content tests",
      acceptance_criteria: "Layers ≤200 mm compacted thickness, moisture within ±2% OMC",
    },
    {
      type: "witness",
      title: "Compaction testing",
      description: "Conduct density tests to verify compaction meets specification.",
      reference_standard: "AS 1289.5.4.1",
      responsibility: "third_party",
      records_required: "NATA-accredited compaction test reports",
      acceptance_criteria: "Density ratio ≥98% SMDD for structural fill, ≥95% for general fill",
    },
    {
      type: "hold",
      title: "Final levels and tolerances check",
      description: "Survey confirms finished surface levels and tolerances before next activity.",
      reference_standard: "Project drawings",
      responsibility: "superintendent",
      records_required: "Final survey report, photographs",
      acceptance_criteria: "Surface levels within ±25 mm of design, shape conforming",
    },
  ],
  general: [
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
      title: "Work area preparation",
      description: "Verify work area is prepared, protected, and ready for construction activity.",
      reference_standard: "Project specification",
      responsibility: "contractor",
      records_required: "Pre-start checklist, photographs",
      acceptance_criteria: "Work area clear, services protected, access established",
    },
    {
      type: "hold",
      title: "Pre-activity superintendent inspection",
      description: "Mandatory hold for superintendent inspection before critical activity proceeds.",
      reference_standard: "Project specification",
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
  ],
};

// Concrete and pavement/steel/footpath share the general set or have their own
FALLBACK_SETS.concrete = [
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
FALLBACK_SETS.pavement = FALLBACK_SETS.general;
FALLBACK_SETS.steel = FALLBACK_SETS.general;
FALLBACK_SETS.footpath = FALLBACK_SETS.general;

function fallbackItems(phaseName?: string, taskDescription?: string): ItpItem[] {
  const category = detectPhaseCategory(phaseName, taskDescription);
  const items = FALLBACK_SETS[category] || FALLBACK_SETS.general;
  return items.map((item) => ({
    ...item,
    phase: phaseName || undefined,
  }));
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

A focused ITP phase — a sequential list of inspection points that follow the physical construction sequence for a specific activity, from preparation through to completion.

Each item is a simple, plain activity description — one thing that needs checking at that point in the sequence. NOT verbose checklists.

## Inspection point types
- **hold**: Mandatory stop — work CANNOT proceed until the Superintendent inspects and releases. Use ONLY at genuinely critical quality gates (levels inspection, formwork inspection, pre-cover). Maximum 2–3 per ITP.
- **witness**: Notification point — Superintendent notified, may attend, work may proceed. The majority of items.

## CRITICAL EXCLUSIONS — never include these in a phase
Do NOT generate any of the following activities — they are project-level activities that belong only to the very start or very end of a project, not to individual construction phases:
- Reviewing drawings, approved-for-construction documents, or document registers
- Pre-start meetings, SWMS briefings, or toolbox talks
- As-built drawings, as-built surveys, or as-constructed records
- Handover, Practical Completion (PC) inspections, or defects liability activities
- General project setup, site establishment, or mobilisation items (unless the task explicitly describes site establishment)

Focus exclusively on the physical construction sequence for the specific activity described.

## Rules
- Generate 5–10 items in construction sequence order
- Keep titles short (max 8 words), action-oriented
- Keep descriptions to one plain sentence
- Every item must reference the relevant Australian Standard clause
- Acceptance criteria must be measurable with tolerances
- Each phase must feel unique — driven by the specific task, not a template

## Australian Standards (use only those relevant)
AS 3600, AS 1379, AS 1012, AS 3610 (concrete) | AS/NZS 4671 (rebar) | AS 4100, AS/NZS 1554 (steel/welding) | AS 1289, AS 3798, AS 1726 (earthworks) | Austroads AGPT04 (pavements) | AS 2159 (piling) | AS 3700 (masonry) | AS 3725, AS/NZS 3500, AS 1597 (drainage) | AS 2876 (kerb) | AS 1742 (traffic) | AS 1428 (access) | AS 2870 (residential footings) | AS 4678 (retaining walls) | WHS Regulation 2017 | AS/NZS ISO 9001`;

const USER_PROMPT_TEMPLATE = `Task: {TASK}{PHASE_CONTEXT}

Generate a focused ITP phase for this specific construction activity. List the sequential inspection points from preparation through to completion. Do NOT include document review, pre-start, as-built, or handover activities.

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
    session_id?: string;
    phase_name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { task_description, company_id, project_id, site_id, session_id, phase_name } = body;
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

      // Build the user prompt with optional phase context
      const phaseContext = phase_name?.trim()
        ? `\nPhase: ${phase_name.trim()}`
        : "";
      const userPrompt = USER_PROMPT_TEMPLATE
        .replace("{TASK}", task_description)
        .replace("{PHASE_CONTEXT}", phaseContext);

      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30_000);

        let responseText = "";
        try {
          // Step 2: Generating ITP phase
          send("status", { step: "generating", message: phase_name?.trim() ? `Generating phase: ${phase_name.trim()}…` : "Generating inspection & test plan…" });

          const streamResponse = anthropic.messages.stream(
            {
              model: "claude-sonnet-4-6",
              max_tokens: 4096,
              system: SYSTEM_PROMPT,
              messages: [
                {
                  role: "user",
                  content: userPrompt,
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
          // Apply phase_name to all items if provided
          if (phase_name?.trim()) {
            for (const item of validated) {
              item.phase = phase_name.trim();
            }
          }
          items = validated;
        } else {
          items = fallbackItems(phase_name?.trim(), task_description);
          usedFallback = true;
        }
      } catch {
        items = fallbackItems(phase_name?.trim(), task_description);
        usedFallback = true;
      }

      // Step 3: Saving items
      send("status", { step: "saving", message: "Saving phase items…" });

      // Resolve session: use existing if session_id provided, otherwise create new
      type SessionRow = { id: string; company_id: string; task_description: string; created_at: string; project_id: string | null; site_id: string | null; status: string };
      let session: SessionRow;
      let nextSortOrder = 1;

      if (session_id) {
        // Verify session belongs to this company
        const { data: existingSession, error: lookupErr } = await supabaseAdmin
          .from("itp_sessions")
          .select("id, company_id, task_description, created_at, project_id, site_id, status")
          .eq("id", session_id)
          .eq("company_id", company_id)
          .single();
        if (lookupErr || !existingSession) {
          send("error", { error: "Session not found or access denied." });
          controller.close();
          return;
        }
        session = existingSession as SessionRow;
        // Get next sort_order after existing items
        const { data: lastItem } = await supabaseAdmin
          .from("itp_items")
          .select("sort_order")
          .eq("session_id", session_id)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();
        nextSortOrder = (lastItem?.sort_order ?? 0) + 1;
      } else {
        // Create a new ITP session
        const { data: newSession, error: sessionErr } = await supabaseAdmin
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
        if (sessionErr || !newSession) {
          send("error", { error: "Failed to create ITP session." });
          controller.close();
          return;
        }
        session = newSession as SessionRow;
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
        sort_order: nextSortOrder + idx,
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

      // Audit log
      await supabaseAdmin.from("itp_audit_log").insert({
        session_id: session.id,
        item_id: null,
        action: "create",
        performed_by_user_id: user.id,
        new_values: {
          task_description,
          phase_name: phase_name?.trim() || null,
          source: session_id ? "ai_add_phase" : "ai_generate",
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
