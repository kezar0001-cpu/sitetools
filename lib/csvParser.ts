import type { ImportedRow, TaskType } from "@/types/siteplan";

export interface CsvHeaderIndices {
  nameIdx: number;
  typeIdx: number;
  parentIdx: number;
  startIdx: number;
  endIdx: number;
  durationIdx: number;
  responsibleIdx: number;
  predecessorsIdx: number;
  assignedIdx: number;
  commentsIdx: number;
  outlineIdx: number;
}

function findColIdx(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = headers.indexOf(name);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parses the header line of a CSV and returns column indices.
 * Throws if required columns (name, and start_date or duration) are absent.
 */
export function parseCsvHeaders(headerLine: string): CsvHeaderIndices {
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

  const nameIdx = findColIdx(headers, "name", "task_name", "task name");
  const startIdx = findColIdx(headers, "start_date", "start", "start date");
  const durationIdx = findColIdx(headers, "duration", "duration_days");

  if (nameIdx === -1 || (startIdx === -1 && durationIdx === -1)) {
    throw new Error(
      "CSV must have at least: name, start_date (or start). Optional: end_date, duration, type, parent_name, responsible, outline_level"
    );
  }

  return {
    nameIdx,
    typeIdx: findColIdx(headers, "type"),
    parentIdx: findColIdx(headers, "parent_name", "parent", "wbs_parent"),
    startIdx,
    endIdx: findColIdx(headers, "end_date", "end", "finish", "finish date"),
    durationIdx,
    responsibleIdx: findColIdx(headers, "responsible", "resource", "resource_names"),
    predecessorsIdx: findColIdx(headers, "predecessors", "predecessor"),
    assignedIdx: findColIdx(headers, "assigned_to", "assigned to", "resource_names"),
    commentsIdx: findColIdx(headers, "comments", "notes", "comment"),
    outlineIdx: findColIdx(headers, "outline_level", "outline level", "level"),
  };
}

/**
 * Splits a CSV line respecting double-quoted fields and maps columns to an ImportedRow.
 */
export function parseRow(line: string, headers: CsvHeaderIndices): ImportedRow {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());

  const {
    nameIdx, typeIdx, parentIdx, startIdx, endIdx,
    durationIdx, responsibleIdx, predecessorsIdx,
    assignedIdx, commentsIdx, outlineIdx,
  } = headers;

  const outlineLevel = outlineIdx >= 0 ? parseInt(cols[outlineIdx] ?? "0", 10) || 0 : -1;

  let taskType: TaskType = "task";
  if (typeIdx >= 0) {
    const raw = (cols[typeIdx] ?? "task").toLowerCase();
    if (raw === "phase" || raw === "summary" || raw === "milestone") taskType = "phase";
    else if (raw === "subtask" || raw === "sub-task") taskType = "subtask";
  } else if (outlineLevel >= 0) {
    if (outlineLevel <= 1) taskType = "phase";
    else if (outlineLevel === 2) taskType = "task";
    else taskType = "subtask";
  }

  const duration = durationIdx >= 0 ? parseInt(cols[durationIdx] ?? "7", 10) || 7 : 7;

  return {
    name: cols[nameIdx] ?? "",
    type: taskType,
    parent_name: parentIdx >= 0 ? cols[parentIdx] ?? "" : "",
    start_date: startIdx >= 0 ? cols[startIdx] ?? "" : "",
    end_date: endIdx >= 0 ? cols[endIdx] ?? "" : "",
    duration,
    predecessors: predecessorsIdx >= 0 ? cols[predecessorsIdx] ?? "" : "",
    responsible: responsibleIdx >= 0 ? cols[responsibleIdx] ?? "" : "",
    assigned_to: assignedIdx >= 0 ? cols[assignedIdx] ?? "" : "",
    comments: commentsIdx >= 0 ? cols[commentsIdx] ?? "" : "",
    outline_level: outlineLevel,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a parsed task row. Returns an error string or null if valid.
 */
export function validateTask(row: ImportedRow): string | null {
  if (!row.name.trim()) {
    return "Task name is required";
  }
  if (row.start_date && !DATE_RE.test(row.start_date)) {
    return `Invalid start_date format "${row.start_date}" — expected YYYY-MM-DD`;
  }
  if (row.end_date && !DATE_RE.test(row.end_date)) {
    return `Invalid end_date format "${row.end_date}" — expected YYYY-MM-DD`;
  }
  return null;
}

/**
 * Runs a DFS over the predecessor graph to detect cycles.
 * Returns an error string if a cycle is found, or null if the graph is acyclic.
 */
export function detectCircularDependencies(rows: ImportedRow[]): string | null {
  const nameToIdx = new Map<string, number>();
  rows.forEach((r, i) => nameToIdx.set(r.name.toLowerCase(), i));

  const adj: number[][] = rows.map(() => []);
  rows.forEach((r, i) => {
    if (!r.predecessors) return;
    for (const pred of r.predecessors.split(/[,;]/).map((s) => s.trim()).filter(Boolean)) {
      const predIdx = nameToIdx.get(pred.toLowerCase());
      if (predIdx !== undefined) adj[i].push(predIdx);
    }
  });

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(rows.length).fill(WHITE);

  function dfs(v: number): boolean {
    color[v] = GRAY;
    for (const u of adj[v]) {
      if (color[u] === GRAY) return true;
      if (color[u] === WHITE && dfs(u)) return true;
    }
    color[v] = BLACK;
    return false;
  }

  for (let i = 0; i < rows.length; i++) {
    if (color[i] === WHITE && dfs(i)) {
      return `Circular dependency detected involving task "${rows[i].name}"`;
    }
  }
  return null;
}

/**
 * Parses a CSV string into an array of ImportedRow objects.
 * Throws on missing required columns, invalid date formats, or circular dependencies.
 */
export function parseCsvToTasks(text: string): ImportedRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvHeaders(lines[0]);
  const rows = lines
    .slice(1)
    .map((line) => parseRow(line, headers))
    .filter((r) => r.name.trim() !== "");

  for (const row of rows) {
    const err = validateTask(row);
    if (err) throw new Error(`Row "${row.name}": ${err}`);
  }

  const circularErr = detectCircularDependencies(rows);
  if (circularErr) throw new Error(circularErr);

  return rows;
}
