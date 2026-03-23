import type { SitePlanTaskNode } from "@/types/siteplan";

const CSV_HEADERS = [
  "name",
  "type",
  "start_date",
  "end_date",
  "duration",
  "status",
  "progress",
  "responsible",
  "assigned_to",
  "predecessors",
  "comments",
  "notes",
] as const;

function escapeField(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Flattens a SitePlanTaskNode tree depth-first and serializes to CSV,
 * matching the column format expected by csvParser.ts for re-import.
 */
export function serializeTasks(nodes: SitePlanTaskNode[]): string {
  const rows: string[] = [CSV_HEADERS.join(",")];

  const walk = (list: SitePlanTaskNode[]) => {
    for (const node of list) {
      rows.push(
        [
          escapeField(node.name),
          escapeField(node.type),
          escapeField(node.start_date),
          escapeField(node.end_date),
          escapeField(node.duration_days),
          escapeField(node.status),
          escapeField(node.progress),
          escapeField(node.responsible),
          escapeField(node.assigned_to),
          escapeField(node.predecessors),
          escapeField(node.comments),
          escapeField(node.notes),
        ].join(",")
      );
      if (node.children.length > 0) walk(node.children);
    }
  };

  walk(nodes);
  return rows.join("\n");
}

export function downloadCsv(nodes: SitePlanTaskNode[], filename: string): void {
  const csv = serializeTasks(nodes);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
