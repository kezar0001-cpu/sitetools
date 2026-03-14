/**
 * SitePlan → MS Project export
 *
 * exportToMspXml  — generates MSPDI XML that MS Project 2010+ can open directly
 * exportToCsv     — generates a flat CSV compatible with most PM tools
 * exportToXlsx    — generates an XLSX workbook (uses SheetJS)
 */

import { PlannerPlanWithContext, PlanPhase, PlanTask } from "./types";
import * as XLSX from "xlsx";

// ── Utility ──────────────────────────────────────────────────────────────────

function xmlEscape(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Convert days to MSPDI duration format: PT{hours}H0M0S */
function toDuration(days: number | null | undefined): string {
  if (!days || days <= 0) return "PT8H0M0S";
  return `PT${days * 8}H0M0S`;
}

/** Format a date string (YYYY-MM-DD or ISO) to MSPDI datetime: YYYY-MM-DDTHH:mm:ss */
function toMspDateTime(date: string | null | undefined, endOfDay = false): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const time = endOfDay ? "17:00:00" : "08:00:00";
  return `${yyyy}-${mm}-${dd}T${time}`;
}

const STATUS_TO_PCT: Record<string, number> = {
  "not-started": 0,
  "in-progress": 50,
  "blocked": 0,
  "done": 100,
};

// ── MSPDI XML Export ──────────────────────────────────────────────────────────

export function exportToMspXml(
  plan: PlannerPlanWithContext,
  tasks: PlanTask[],
  phases: PlanPhase[]
): string {
  const phaseMap = new Map(phases.map((p) => [p.id, p]));

  // Build a UID map — UID 0 is reserved for project summary in MSPDI
  const uidMap = new Map<string, number>();
  tasks.forEach((t, i) => uidMap.set(t.id, i + 1));

  const projectStart =
    toMspDateTime(tasks.find((t) => t.planned_start)?.planned_start) ??
    toMspDateTime(new Date().toISOString().slice(0, 10));
  const projectFinish =
    toMspDateTime(tasks.find((t) => t.planned_finish)?.planned_finish, true) ??
    toMspDateTime(new Date(Date.now() + 86400000 * 90).toISOString().slice(0, 10), true);

  const taskXml = tasks
    .map((task) => {
      const uid = uidMap.get(task.id)!;
      const pct = task.percent_complete ?? STATUS_TO_PCT[task.status] ?? 0;
      const phase = task.phase_id ? phaseMap.get(task.phase_id) : null;

      // Build notes — include phase name if assigned
      const notesParts: string[] = [];
      if (phase) notesParts.push(`Phase: ${phase.name}`);
      if (task.notes) notesParts.push(task.notes);
      const notes = notesParts.join("\n");

      // Predecessors (FS by default)
      // Note: cross-task dependencies require knowing predecessor UIDs
      // We don't store dependencies in PlanTask directly, so this is left empty
      // for now — it can be extended when task dependencies are in scope.

      return `    <Task>
      <UID>${uid}</UID>
      <ID>${uid}</ID>
      <Name>${xmlEscape(task.title)}</Name>
      <OutlineLevel>${task.indent_level + 1}</OutlineLevel>
      <WBS>${xmlEscape(task.wbs_code ?? String(uid))}</WBS>
      <Milestone>${task.is_milestone ? "1" : "0"}</Milestone>
      <Summary>0</Summary>
      <PercentComplete>${pct}</PercentComplete>
      <PercentWorkComplete>${pct}</PercentWorkComplete>
      <Duration>${toDuration(task.duration_days)}</Duration>
      <Start>${toMspDateTime(task.planned_start) ?? ""}</Start>
      <Finish>${toMspDateTime(task.planned_finish, true) ?? ""}</Finish>
      <ActualStart>${toMspDateTime(task.actual_start) ?? ""}</ActualStart>
      <ActualFinish>${toMspDateTime(task.actual_finish, true) ?? ""}</ActualFinish>
      <Priority>${task.priority === "critical" ? 1000 : task.priority === "high" ? 750 : task.priority === "medium" ? 500 : 250}</Priority>
      <Notes>${xmlEscape(notes)}</Notes>
    </Task>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${xmlEscape(plan.name)}</Name>
  <Title>${xmlEscape(plan.name)}</Title>
  <Subject>${xmlEscape(plan.description ?? "")}</Subject>
  <StartDate>${projectStart}</StartDate>
  <FinishDate>${projectFinish}</FinishDate>
  <MinutesPerDay>480</MinutesPerDay>
  <MinutesPerWeek>2400</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <DefaultWorkFormat>1</DefaultWorkFormat>
  <WeekStartDay>1</WeekStartDay>
  <Tasks>
${taskXml}
  </Tasks>
  <Resources/>
  <Assignments/>
</Project>`;
}

// ── CSV Export ────────────────────────────────────────────────────────────────

export function exportToCsv(
  plan: PlannerPlanWithContext,
  tasks: PlanTask[],
  phases: PlanPhase[]
): string {
  const phaseMap = new Map(phases.map((p) => [p.id, p]));

  const headers = [
    "WBS",
    "Task Name",
    "Phase",
    "Duration (days)",
    "Planned Start",
    "Planned Finish",
    "Actual Start",
    "Actual Finish",
    "% Complete",
    "Status",
    "Priority",
    "Milestone",
    "Notes",
  ];

  const escape = (v: string | number | null | undefined): string => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = tasks.map((task) => {
    const phase = task.phase_id ? phaseMap.get(task.phase_id) : null;
    return [
      escape(task.wbs_code),
      escape(task.title),
      escape(phase?.name ?? ""),
      escape(task.duration_days),
      escape(task.planned_start?.slice(0, 10)),
      escape(task.planned_finish?.slice(0, 10)),
      escape(task.actual_start?.slice(0, 10)),
      escape(task.actual_finish?.slice(0, 10)),
      escape(task.percent_complete),
      escape(task.status),
      escape(task.priority),
      escape(task.is_milestone ? "Yes" : "No"),
      escape(task.notes),
    ].join(",");
  });

  const planMeta = `# SitePlan Export: ${plan.name}`;
  return [planMeta, headers.join(","), ...rows].join("\n");
}

// ── XLSX Export ───────────────────────────────────────────────────────────────

export function exportToXlsx(
  plan: PlannerPlanWithContext,
  tasks: PlanTask[],
  phases: PlanPhase[]
): Uint8Array {
  const phaseMap = new Map(phases.map((p) => [p.id, p]));

  const rows: (string | number | null)[][] = [
    [
      "WBS",
      "Task Name",
      "Phase",
      "Duration (days)",
      "Planned Start",
      "Planned Finish",
      "Actual Start",
      "Actual Finish",
      "% Complete",
      "Status",
      "Priority",
      "Milestone",
      "Indent Level",
      "Notes",
    ],
    ...tasks.map((task) => {
      const phase = task.phase_id ? phaseMap.get(task.phase_id) : null;
      return [
        task.wbs_code ?? null,
        task.title,
        phase?.name ?? null,
        task.duration_days ?? null,
        task.planned_start?.slice(0, 10) ?? null,
        task.planned_finish?.slice(0, 10) ?? null,
        task.actual_start?.slice(0, 10) ?? null,
        task.actual_finish?.slice(0, 10) ?? null,
        task.percent_complete,
        task.status,
        task.priority,
        task.is_milestone ? "Yes" : "No",
        task.indent_level,
        task.notes ?? null,
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 8 },   // WBS
    { wch: 40 },  // Task Name
    { wch: 20 },  // Phase
    { wch: 12 },  // Duration
    { wch: 14 },  // Planned Start
    { wch: 14 },  // Planned Finish
    { wch: 14 },  // Actual Start
    { wch: 14 },  // Actual Finish
    { wch: 10 },  // % Complete
    { wch: 14 },  // Status
    { wch: 10 },  // Priority
    { wch: 10 },  // Milestone
    { wch: 10 },  // Indent Level
    { wch: 50 },  // Notes
  ];

  // Summary sheet
  const summaryData = [
    ["Plan Name", plan.name],
    ["Description", plan.description ?? ""],
    ["Status", plan.status],
    ["Total Tasks", tasks.length],
    ["Completed", tasks.filter((t) => t.status === "done").length],
    ["In Progress", tasks.filter((t) => t.status === "in-progress").length],
    ["Blocked", tasks.filter((t) => t.status === "blocked").length],
    ["Phases", phases.map((p) => p.name).join(", ")],
    ["Exported", new Date().toLocaleDateString("en-AU")],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 18 }, { wch: 50 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tasks");
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

// ── Download helpers (client-side only) ──────────────────────────────────────

export function downloadBlob(content: string | Uint8Array, filename: string, mimeType: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = new Blob([content as any], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
