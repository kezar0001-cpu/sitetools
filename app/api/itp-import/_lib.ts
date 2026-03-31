// Shared utilities for all itp-import routes.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Responsibility = "contractor" | "superintendent" | "third_party";

export interface ItpItem {
  type: "witness" | "hold" | "review";
  phase: string;
  title: string;
  description: string;
  reference_standard: string;
  responsibility: Responsibility;
  records_required: string;
  acceptance_criteria: string;
}

export interface GeneratedItp {
  task_description: string;
  items: ItpItem[];
}

// ---------------------------------------------------------------------------
// Text extraction helpers
// ---------------------------------------------------------------------------

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function extractTextFromExcel(buffer: Buffer): string {
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

// ---------------------------------------------------------------------------
// File type map
// ---------------------------------------------------------------------------

export const SUPPORTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
  "application/octet-stream": "auto", // fallback to extension detection
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/plain": "txt",
  "text/csv": "csv",
};

export const EXT_MAP: Record<string, string> = {
  pdf: "pdf",
  doc: "docx",
  docx: "docx",
  xlsx: "xlsx",
  xls: "xls",
  txt: "txt",
  csv: "csv",
};

// ---------------------------------------------------------------------------
// Validation / normalisation
// ---------------------------------------------------------------------------

const VALID_TYPES = ["witness", "hold", "review"];
const VALID_RESPONSIBILITIES = ["contractor", "superintendent", "third_party"];

function normaliseItem(item: Record<string, unknown>, phase?: string): boolean {
  if (
    typeof item !== "object" ||
    item === null ||
    !VALID_TYPES.includes(item.type as string) ||
    typeof item.title !== "string" ||
    typeof item.description !== "string"
  ) return false;
  if (phase) {
    item.phase = phase;
  } else if (typeof item.phase !== "string" || !(item.phase as string).trim()) {
    item.phase = "General";
  }
  if (typeof item.reference_standard !== "string") item.reference_standard = "";
  if (!VALID_RESPONSIBILITIES.includes(item.responsibility as string)) item.responsibility = "contractor";
  if (typeof item.records_required !== "string") item.records_required = "";
  if (typeof item.acceptance_criteria !== "string") item.acceptance_criteria = "";
  return true;
}

export function validateItps(raw: unknown): GeneratedItp[] | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  const first = raw[0] as Record<string, unknown>;
  if (typeof first !== "object" || first === null) return null;

  // New Phase→Tasks format: [{ phase, tasks: [{ task_description, items }] }]
  if ("phase" in first && "tasks" in first) {
    const result: GeneratedItp[] = [];
    for (const group of raw) {
      if (typeof group.phase !== "string" || !Array.isArray(group.tasks)) return null;
      for (const task of group.tasks) {
        if (typeof task.task_description !== "string" || !Array.isArray(task.items) || task.items.length < 1) return null;
        for (const item of task.items) {
          if (!normaliseItem(item, group.phase)) return null;
        }
        result.push({ task_description: task.task_description, items: task.items });
      }
    }
    return result.length > 0 ? result : null;
  }

  // Legacy flat format: [{ task_description, items }]
  for (const itp of raw) {
    if (
      typeof itp !== "object" || itp === null ||
      typeof itp.task_description !== "string" ||
      !Array.isArray(itp.items) || itp.items.length < 1
    ) return null;
    for (const item of itp.items) {
      if (!normaliseItem(item)) return null;
    }
  }
  return raw as GeneratedItp[];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export const IMPORT_SYSTEM_PROMPT = `You are a senior Australian civil construction Quality Assurance engineer. You analyse specification documents, engineering drawings, and construction documents, then generate structured Inspection & Test Plans (ITPs) organised by work phases.

## Your task
1. Analyse the uploaded document thoroughly
2. Identify the distinct WORK PHASES the project goes through (e.g. Site Establishment, Demolish & Excavate, Drainage / Stormwater, Sub-base & Kerbs, Footpaths, Thresholds)
3. Under each phase, identify the specific TASKS (inspection activities) that need checking

## Output structure — Phase → Tasks hierarchy

Return a JSON array where each object represents ONE PHASE:
[
  {
    "phase": "Site Establishment",
    "tasks": [
      {
        "task_description": "Erosion and sediment controls",
        "items": [
          { "type": "witness", "title": "Install sediment fence", "description": "...", "reference_standard": "...", "responsibility": "contractor", "records_required": "...", "acceptance_criteria": "..." }
        ]
      }
    ]
  }
]

## Rules for phases
- Use 3–6 phases that reflect the real construction sequence in the document
- Phase names should be specific to the project (not generic)
- Phases must be in chronological construction order

## Rules for tasks within each phase
- Each task is a distinct construction activity that gets its own ITP
- Each task has 4–8 sequential inspection items
- task_description: short plain-English name (max 12 words)

## Rules for items within each task
- type: "hold" | "witness" (hold = mandatory stop at critical quality gates; witness = notification point)
- title: short action phrase (max 8 words)
- description: one plain sentence — what is being checked
- reference_standard: specific Australian Standard and clause (e.g. "AS 3600 Cl. 17.1.3")
- responsibility: "contractor" | "superintendent" | "third_party"
- records_required: specific documents/evidence produced
- acceptance_criteria: measurable pass/fail criterion with tolerance
- Hold points only at genuinely critical stages (levels, formwork, pre-cover)

## Australian Standards reference (use only those relevant)
AS 3600, AS 1379, AS 1012, AS 3610 (concrete) | AS/NZS 4671 (rebar) | AS 4100, AS/NZS 1554 (steel/welding) | AS 1289, AS 3798 (earthworks) | Austroads AGPT04 (pavements) | AS 2159 (piling) | AS 3700 (masonry) | AS 3725, AS/NZS 3500, AS 1597 (drainage) | AS 2876 (kerb) | AS 1742 (traffic) | AS 1428 (access) | AS 2870 (residential footings) | AS 4678 (retaining walls) | WHS Regulation 2017

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.`;
