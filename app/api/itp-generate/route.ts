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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
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

  // Call Claude with a 10-second timeout
  let items: ItpItem[];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let responseText = "";
    try {
      const message = await anthropic.messages.create(
        {
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system:
            "You are an experienced Australian civil construction quality assurance engineer. You generate ITP (Inspection and Test Plan) checklists that reference the relevant Australian Standards (AS) and state specifications. When writing acceptance criteria, cite the applicable AS clause or tolerance where it materially affects the inspection outcome.",
          messages: [
            {
              role: "user",
              content: `Task: ${task_description}

Generate a JSON array of 6-10 ITP inspection checklist items for this Australian civil construction task.

Each item must have:
  - type: "witness" (notify and observe, work can continue) OR "hold" (mandatory stop, cannot proceed until signed)
  - title: short action phrase (max 8 words)
  - description: one sentence with a measurable acceptance criterion — where applicable, cite the relevant Australian Standard (e.g. "per AS 3600 Cl. 17.1.3", "AS 1289.5.4.1 ≥98% MDD", "AS 1379 Cl. 3.2")

Sequence rules:
  - Start with 1–2 witness points (preparatory / pre-work checks)
  - Include at least 2 hold points at critical quality gates
  - End with 1 witness point (post-work visual inspection and defect check)
  - Order must follow the physical construction sequence

Australian Standards to consider (select those relevant to the task):
  - Concrete structures: AS 3600, AS 1379 (concrete supply), AS 1012 (testing), AS 3610 (formwork)
  - Steel reinforcement: AS 4671, AS/NZS 4671
  - Structural steel / welding: AS 4100, AS/NZS 1554
  - Earthworks / compaction: AS 1289 (soil testing, e.g. ≥95% or ≥98% MDD), AS 1726 (site investigation)
  - Paving (flexible): Austroads AGPT, state road authority spec (e.g. VicRoads, MRWA, TMC)
  - Paving (rigid/concrete): AS 3600, AS 1379
  - Piling: AS 2159
  - Masonry: AS 3700
  - Drainage / pipes: AS 3725 (loads on buried conduits), AS/NZS 3500, AS 1597 (box culverts)
  - Traffic control: AS 1742
  - Access / mobility: AS 1428
  - Residential slabs / footings: AS 2870
  - Retaining walls / earth retention: AS 4678
  - Temporary works / formwork: AS 3610

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.`,
            },
          ],
        },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      const textBlock = message.content.find((b) => b.type === "text");
      responseText = textBlock && "text" in textBlock ? textBlock.text.trim() : "";
    } catch {
      clearTimeout(timeoutId);
      throw new Error("Claude request failed");
    }

    // Parse and validate the JSON response
    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = null;
    }

    const validated = parsed !== null ? validateItems(parsed) : null;
    items = validated ?? fallbackItems();
  } catch {
    // On any error (timeout, network, etc.) use fallback items — never return 500
    items = fallbackItems();
  }

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
    return NextResponse.json(
      { error: "Failed to create ITP session." },
      { status: 500 }
    );
  }

  // Insert items linked to the session
  const rows = items.map((item, idx) => ({
    session_id: session.id,
    slug: slugify(item.title) + "-" + (idx + 1),
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
    return NextResponse.json(
      { error: "Failed to save ITP items." },
      { status: 500 }
    );
  }

  return NextResponse.json({ session, items: inserted });
}
