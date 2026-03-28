import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

function fallbackItems(): ItpItem[] {
  return [
    {
      type: "witness",
      title: "Pre-work site check",
      description: "Confirm site conditions, access, and safety controls are in place before work commences.",
    },
    {
      type: "witness",
      title: "Material conformance check",
      description: "Verify delivered materials match approved specifications and hold valid test certificates.",
    },
    {
      type: "hold",
      title: "Dimensions and levels hold",
      description: "Survey confirms all set-out dimensions and levels are within ±10 mm of design tolerances.",
    },
    {
      type: "hold",
      title: "Compaction / finish hold",
      description: "Compaction tests achieve ≥98% standard dry density or finish meets specified surface tolerance.",
    },
    {
      type: "witness",
      title: "Post-work visual inspection",
      description: "Completed work visually inspected for defects, cleanliness, and conformance to drawings.",
    },
  ];
}

function validateItems(raw: unknown): ItpItem[] | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  for (const item of raw) {
    if (
      typeof item !== "object" ||
      item === null ||
      !["witness", "hold"].includes(item.type) ||
      typeof item.title !== "string" ||
      typeof item.description !== "string"
    ) {
      return null;
    }
  }
  return raw as ItpItem[];
}

// SSE helper: send a named event
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

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
      send("status", { step: "analyzing", message: "Analyzing task…" });

      let items: ItpItem[];
      let usedFallback = false;

      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30_000);

        let responseText = "";
        try {
          // Step 2: Generating checklist via streaming
          send("status", { step: "generating", message: "Generating checklist…" });

          const streamResponse = anthropic.messages.stream(
            {
              model: "claude-sonnet-4-6",
              max_tokens: 2048,
              system:
                "You are an experienced Australian civil construction quality assurance engineer writing ITPs for real projects. Your ITPs must be specific to the exact task described — not generic templates. Each checklist item must reflect the actual materials, equipment, tolerances, and construction sequence that apply to THIS task. Never recycle boilerplate items that could apply to any task.",
              messages: [
                {
                  role: "user",
                  content: `Task: ${task_description}

Think carefully about what this specific construction activity involves: the materials used, the equipment, the physical steps in order, the failure modes, and the quality checkpoints that matter most for THIS task.

Generate a JSON array of 6-10 ITP inspection checklist items tailored specifically to this task.

Each item must have:
  - type: "witness" (notify and observe, work can continue) OR "hold" (mandatory stop, cannot proceed until signed)
  - title: short action phrase specific to this task (max 8 words) — must name the actual activity/material/element being inspected
  - description: one sentence with a measurable acceptance criterion specific to this task — cite the relevant Australian Standard clause or tolerance where it materially affects the outcome (e.g. "per AS 3600 Cl. 17.1.3", "AS 1289.5.4.1 ≥98% MDD", "AS 1379 Cl. 3.2")

Rules:
  - Items must follow the physical construction sequence for THIS task
  - Hold points must be at the critical quality gates specific to this activity (not just generic "dimensions hold")
  - Witness points should cover the preparatory checks and post-work inspections relevant to this task
  - Do NOT include generic items that would apply to any construction task — every item must be traceable to something specific about the task description

Australian Standards to draw from (select only those relevant):
  - Concrete structures: AS 3600, AS 1379 (concrete supply), AS 1012 (testing), AS 3610 (formwork)
  - Steel reinforcement: AS 4671, AS/NZS 4671
  - Structural steel / welding: AS 4100, AS/NZS 1554
  - Earthworks / compaction: AS 1289 (soil testing, ≥95% or ≥98% MDD), AS 1726 (site investigation)
  - Paving (flexible): Austroads AGPT, state road authority spec (VicRoads, MRWA, TMC)
  - Paving (rigid/concrete): AS 3600, AS 1379
  - Piling: AS 2159
  - Masonry: AS 3700
  - Drainage / pipes: AS 3725, AS/NZS 3500, AS 1597 (box culverts)
  - Traffic control: AS 1742
  - Access / mobility: AS 1428
  - Residential slabs / footings: AS 2870
  - Retaining walls / earth retention: AS 4678
  - Temporary works / formwork: AS 3610

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.`,
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
          parsed = null;
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
      send("status", { step: "saving", message: "Saving items…" });

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
        sort_order: idx + 1,
      }));

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("itp_items")
        .insert(rows)
        .select(
          "id, session_id, slug, type, title, description, sort_order, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng"
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
