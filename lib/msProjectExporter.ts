import type { SitePlanTaskNode } from "@/types/siteplan";

function escapeXml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIsoDateTime(date: string | null | undefined): string {
  if (!date) return "";
  // date is already YYYY-MM-DD; append T00:00:00 for MS Project format
  return `${date}T00:00:00`;
}

function durationToPT(days: number): string {
  // MS Project uses PT<hours>H0M0S format
  const hours = days * 8;
  return `PT${hours}H0M0S`;
}

function getOutlineLevel(node: SitePlanTaskNode, depth: number): number {
  return depth + 1;
}

/**
 * Serializes a flat list of tasks (from a depth-first walk) to MS Project XML.
 * The XML structure matches what parseMSProjectXML() in ImportPanel.tsx expects,
 * enabling a full roundtrip.
 */
export function serializeToMsProjectXml(nodes: SitePlanTaskNode[]): string {
  // Assign sequential UIDs and build a flat ordered list with depth info
  interface FlatTask {
    node: SitePlanTaskNode;
    uid: number;
    depth: number;
  }

  const flat: FlatTask[] = [];
  let uid = 1;

  const walk = (list: SitePlanTaskNode[], depth: number) => {
    for (const node of list) {
      flat.push({ node, uid: uid++, depth });
      if (node.children.length > 0) walk(node.children, depth + 1);
    }
  };
  walk(nodes, 0);

  // Build id → uid map for predecessor resolution
  const idToUid = new Map<string, number>();
  for (const ft of flat) idToUid.set(ft.node.id, ft.uid);

  const taskXml = flat
    .map(({ node, uid: taskUid, depth }) => {
      const outlineLevel = getOutlineLevel(node, depth);
      const isSummary = node.type === "phase" || node.type === "milestone";

      const predLinks = node.predecessors
        ? node.predecessors
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((predId) => {
              const predUid = idToUid.get(predId);
              if (!predUid) return "";
              return `      <PredecessorLink>\n        <PredecessorUID>${predUid}</PredecessorUID>\n      </PredecessorLink>`;
            })
            .filter(Boolean)
            .join("\n")
        : "";

      return [
        `  <Task>`,
        `    <UID>${taskUid}</UID>`,
        `    <ID>${taskUid}</ID>`,
        `    <Name>${escapeXml(node.name)}</Name>`,
        `    <OutlineLevel>${outlineLevel}</OutlineLevel>`,
        `    <Summary>${isSummary ? "1" : "0"}</Summary>`,
        `    <Start>${toIsoDateTime(node.start_date)}</Start>`,
        `    <Finish>${toIsoDateTime(node.end_date)}</Finish>`,
        `    <Duration>${durationToPT(node.duration_days)}</Duration>`,
        `    <PercentComplete>${node.progress}</PercentComplete>`,
        node.responsible
          ? `    <ResourceNames>${escapeXml(node.responsible)}</ResourceNames>`
          : "",
        node.comments
          ? `    <Notes>${escapeXml(node.comments)}</Notes>`
          : "",
        predLinks ? predLinks : "",
        `  </Task>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const now = new Date().toISOString().split("T")[0];

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Project xmlns="http://schemas.microsoft.com/project">`,
    `  <SaveVersion>14</SaveVersion>`,
    `  <CreationDate>${now}T00:00:00</CreationDate>`,
    `  <Tasks>`,
    taskXml,
    `  </Tasks>`,
    `</Project>`,
  ].join("\n");
}

export function downloadMsProjectXml(
  nodes: SitePlanTaskNode[],
  filename: string
): void {
  const xml = serializeToMsProjectXml(nodes);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
