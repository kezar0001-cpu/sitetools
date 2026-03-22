import { describe, it, expect } from "vitest";
import {
  parseCsvHeaders,
  parseRow,
  validateTask,
  parseCsvToTasks,
  detectCircularDependencies,
} from "../csvParser";
import type { ImportedRow } from "@/types/siteplan";

// ─── helpers ────────────────────────────────────────────────

function makeRow(overrides: Partial<ImportedRow> = {}): ImportedRow {
  return {
    name: "Task 1",
    type: "task",
    parent_name: "",
    start_date: "2024-01-01",
    end_date: "2024-01-07",
    duration: 7,
    predecessors: "",
    responsible: "",
    assigned_to: "",
    comments: "",
    outline_level: 2,
    ...overrides,
  };
}

// ─── parseCsvHeaders ─────────────────────────────────────────

describe("parseCsvHeaders", () => {
  it("parses standard column names", () => {
    const h = parseCsvHeaders("name,type,start_date,end_date,duration");
    expect(h.nameIdx).toBe(0);
    expect(h.typeIdx).toBe(1);
    expect(h.startIdx).toBe(2);
    expect(h.endIdx).toBe(3);
    expect(h.durationIdx).toBe(4);
  });

  it("handles alternate column names", () => {
    const h = parseCsvHeaders("task name,start,finish");
    expect(h.nameIdx).toBe(0);
    expect(h.startIdx).toBe(1);
    expect(h.endIdx).toBe(2);
  });

  it("handles wbs_parent and outline_level aliases", () => {
    const h = parseCsvHeaders("name,start_date,wbs_parent,outline level");
    expect(h.parentIdx).toBe(2);
    expect(h.outlineIdx).toBe(3);
  });

  it("is case-insensitive for header names", () => {
    const h = parseCsvHeaders("Name,Start_Date,End_Date");
    expect(h.nameIdx).toBe(0);
    expect(h.startIdx).toBe(1);
    expect(h.endIdx).toBe(2);
  });

  it("throws when name column is missing", () => {
    expect(() => parseCsvHeaders("start_date,end_date,duration")).toThrow(
      "CSV must have"
    );
  });

  it("throws when both start_date and duration are absent", () => {
    expect(() => parseCsvHeaders("name,type,end_date")).toThrow(
      "CSV must have"
    );
  });

  it("does not throw when duration is present without start_date", () => {
    expect(() => parseCsvHeaders("name,duration")).not.toThrow();
  });

  it("returns -1 for absent optional columns", () => {
    const h = parseCsvHeaders("name,start_date");
    expect(h.typeIdx).toBe(-1);
    expect(h.parentIdx).toBe(-1);
    expect(h.endIdx).toBe(-1);
    expect(h.predecessorsIdx).toBe(-1);
  });
});

// ─── parseRow ────────────────────────────────────────────────

describe("parseRow", () => {
  it("parses a basic row correctly", () => {
    const h = parseCsvHeaders("name,type,start_date,end_date,duration");
    const row = parseRow("Task 1,task,2024-01-01,2024-01-07,7", h);
    expect(row.name).toBe("Task 1");
    expect(row.type).toBe("task");
    expect(row.start_date).toBe("2024-01-01");
    expect(row.end_date).toBe("2024-01-07");
    expect(row.duration).toBe(7);
  });

  it("handles quoted fields containing commas", () => {
    const h = parseCsvHeaders("name,start_date");
    const row = parseRow('"Task, with comma",2024-01-01', h);
    expect(row.name).toBe("Task, with comma");
  });

  it("maps 'phase' type correctly", () => {
    const h = parseCsvHeaders("name,type,start_date");
    expect(parseRow("Phase 1,phase,2024-01-01", h).type).toBe("phase");
    expect(parseRow("Summary,summary,2024-01-01", h).type).toBe("phase");
    expect(parseRow("Milestone,milestone,2024-01-01", h).type).toBe("phase");
  });

  it("maps 'subtask' type correctly", () => {
    const h = parseCsvHeaders("name,type,start_date");
    expect(parseRow("Sub,subtask,2024-01-01", h).type).toBe("subtask");
    expect(parseRow("Sub,sub-task,2024-01-01", h).type).toBe("subtask");
  });

  it("defaults to 'task' for unknown type values", () => {
    const h = parseCsvHeaders("name,type,start_date");
    const row = parseRow("Task,unknown_type,2024-01-01", h);
    expect(row.type).toBe("task");
  });

  it("auto-detects type from outline_level when type column is absent", () => {
    const h = parseCsvHeaders("name,start_date,outline_level");
    expect(parseRow("A,2024-01-01,1", h).type).toBe("phase");
    expect(parseRow("B,2024-01-01,2", h).type).toBe("task");
    expect(parseRow("C,2024-01-01,3", h).type).toBe("subtask");
  });

  it("defaults duration to 7 when column is absent", () => {
    const h = parseCsvHeaders("name,start_date");
    expect(parseRow("Task,2024-01-01", h).duration).toBe(7);
  });

  it("returns empty strings for absent optional columns", () => {
    const h = parseCsvHeaders("name,start_date");
    const row = parseRow("Task,2024-01-01", h);
    expect(row.parent_name).toBe("");
    expect(row.predecessors).toBe("");
    expect(row.responsible).toBe("");
    expect(row.comments).toBe("");
  });
});

// ─── validateTask ────────────────────────────────────────────

describe("validateTask", () => {
  it("returns null for a valid task", () => {
    expect(validateTask(makeRow())).toBeNull();
  });

  it("returns an error for an empty name", () => {
    expect(validateTask(makeRow({ name: "" }))).toMatch(/name/i);
    expect(validateTask(makeRow({ name: "   " }))).toMatch(/name/i);
  });

  it("returns an error for invalid start_date format", () => {
    expect(validateTask(makeRow({ start_date: "01/01/2024" }))).toMatch(/start_date/i);
    expect(validateTask(makeRow({ start_date: "2024-1-1" }))).toMatch(/start_date/i);
    expect(validateTask(makeRow({ start_date: "Jan 1 2024" }))).toMatch(/start_date/i);
  });

  it("returns an error for invalid end_date format", () => {
    expect(validateTask(makeRow({ end_date: "Jan 7 2024" }))).toMatch(/end_date/i);
    expect(validateTask(makeRow({ end_date: "07-01-2024" }))).toMatch(/end_date/i);
  });

  it("accepts empty dates (they are optional)", () => {
    expect(validateTask(makeRow({ start_date: "", end_date: "" }))).toBeNull();
  });

  it("accepts valid YYYY-MM-DD dates", () => {
    expect(validateTask(makeRow({ start_date: "2024-12-31", end_date: "2025-01-01" }))).toBeNull();
  });
});

// ─── detectCircularDependencies ──────────────────────────────

describe("detectCircularDependencies", () => {
  it("returns null for tasks with no dependencies", () => {
    const rows = [makeRow({ name: "Task 1" }), makeRow({ name: "Task 2" })];
    expect(detectCircularDependencies(rows)).toBeNull();
  });

  it("returns null for a valid linear chain", () => {
    const rows = [
      makeRow({ name: "Task 1", predecessors: "" }),
      makeRow({ name: "Task 2", predecessors: "Task 1" }),
      makeRow({ name: "Task 3", predecessors: "Task 2" }),
    ];
    expect(detectCircularDependencies(rows)).toBeNull();
  });

  it("returns null for a diamond dependency (no cycle)", () => {
    const rows = [
      makeRow({ name: "A", predecessors: "" }),
      makeRow({ name: "B", predecessors: "A" }),
      makeRow({ name: "C", predecessors: "A" }),
      makeRow({ name: "D", predecessors: "B,C" }),
    ];
    expect(detectCircularDependencies(rows)).toBeNull();
  });

  it("detects a direct circular dependency (A → B → A)", () => {
    const rows = [
      makeRow({ name: "Task 1", predecessors: "Task 2" }),
      makeRow({ name: "Task 2", predecessors: "Task 1" }),
    ];
    expect(detectCircularDependencies(rows)).toMatch(/circular/i);
  });

  it("detects an indirect circular dependency (A → B → C → A)", () => {
    const rows = [
      makeRow({ name: "Task 1", predecessors: "Task 3" }),
      makeRow({ name: "Task 2", predecessors: "Task 1" }),
      makeRow({ name: "Task 3", predecessors: "Task 2" }),
    ];
    expect(detectCircularDependencies(rows)).toMatch(/circular/i);
  });

  it("is case-insensitive when matching predecessor names", () => {
    const rows = [
      makeRow({ name: "Task 1", predecessors: "TASK 2" }),
      makeRow({ name: "Task 2", predecessors: "task 1" }),
    ];
    expect(detectCircularDependencies(rows)).toMatch(/circular/i);
  });

  it("ignores predecessors that don't match any task name", () => {
    const rows = [
      makeRow({ name: "Task 1", predecessors: "Nonexistent Task" }),
      makeRow({ name: "Task 2", predecessors: "Task 1" }),
    ];
    expect(detectCircularDependencies(rows)).toBeNull();
  });
});

// ─── parseCsvToTasks ─────────────────────────────────────────

describe("parseCsvToTasks", () => {
  it("parses a valid CSV with multiple task types", () => {
    const csv = [
      "name,type,start_date,end_date,duration",
      "Phase 1,phase,2024-01-01,2024-03-31,90",
      "Task 1,task,2024-01-01,2024-01-07,7",
      "Task 2,subtask,2024-01-08,2024-01-14,7",
    ].join("\n");

    const rows = parseCsvToTasks(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0].name).toBe("Phase 1");
    expect(rows[0].type).toBe("phase");
    expect(rows[1].type).toBe("task");
    expect(rows[2].type).toBe("subtask");
  });

  it("filters out rows with empty names", () => {
    const csv = ["name,start_date", "Task 1,2024-01-01", ",2024-01-01", "Task 2,2024-01-08"].join("\n");
    expect(parseCsvToTasks(csv)).toHaveLength(2);
  });

  it("returns an empty array for a header-only CSV", () => {
    expect(parseCsvToTasks("name,start_date")).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseCsvToTasks("")).toEqual([]);
  });

  it("throws for missing required columns", () => {
    const csv = ["type,start_date,end_date", "task,2024-01-01,2024-01-07"].join("\n");
    expect(() => parseCsvToTasks(csv)).toThrow("CSV must have");
  });

  it("throws for an invalid start_date format", () => {
    const csv = ["name,start_date", "Task 1,01/01/2024"].join("\n");
    expect(() => parseCsvToTasks(csv)).toThrow(/start_date/i);
  });

  it("throws for an invalid end_date format", () => {
    const csv = ["name,start_date,end_date", "Task 1,2024-01-01,Jan 7 2024"].join("\n");
    expect(() => parseCsvToTasks(csv)).toThrow(/end_date/i);
  });

  it("throws when circular dependencies are present", () => {
    const csv = [
      "name,start_date,predecessors",
      "Task 1,2024-01-01,Task 2",
      "Task 2,2024-01-08,Task 1",
    ].join("\n");
    expect(() => parseCsvToTasks(csv)).toThrow(/circular/i);
  });

  it("parses predecessors and responsible fields", () => {
    const csv = [
      "name,start_date,predecessors,responsible",
      "Task 1,2024-01-01,,Alice",
      "Task 2,2024-01-08,Task 1,Bob",
    ].join("\n");
    const rows = parseCsvToTasks(csv);
    expect(rows[0].responsible).toBe("Alice");
    expect(rows[1].predecessors).toBe("Task 1");
    expect(rows[1].responsible).toBe("Bob");
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = ['name,start_date', '"Task, with comma",2024-01-01'].join("\n");
    const rows = parseCsvToTasks(csv);
    expect(rows[0].name).toBe("Task, with comma");
  });
});
