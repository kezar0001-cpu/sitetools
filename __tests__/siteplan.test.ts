import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  computeTaskStatus,
  computeProjectHealth,
  buildTaskTree,
  flattenTree,
  generateWbsCode,
  computeWorkProgress,
} from "@/types/siteplan";
import type { SitePlanTask } from "@/types/siteplan";

// ─── Helpers ────────────────────────────────────────────────

function makeTask(overrides: Partial<SitePlanTask> = {}): SitePlanTask {
  return {
    id: "t1",
    project_id: "p1",
    parent_id: null,
    wbs_code: "1",
    name: "Task",
    type: "task",
    status: "not_started",
    start_date: "2026-01-01",
    end_date: "2026-06-30",
    actual_start: null,
    actual_end: null,
    progress: 0,
    duration_days: 180,
    predecessors: null,
    responsible: null,
    assigned_to: null,
    comments: null,
    notes: null,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ─── computeTaskStatus ──────────────────────────────────────

describe("computeTaskStatus", () => {
  const FUTURE = "2099-12-31";
  const PAST = "2000-01-01";

  it("returns not_started when progress is 0", () => {
    expect(computeTaskStatus(0, FUTURE)).toBe("not_started");
  });

  it("returns not_started when progress is 0 even if end date is past", () => {
    // progress 0 takes precedence — task simply hasn't been touched
    expect(computeTaskStatus(0, PAST)).toBe("not_started");
  });

  it("returns completed when progress is 100", () => {
    expect(computeTaskStatus(100, FUTURE)).toBe("completed");
    expect(computeTaskStatus(100, PAST)).toBe("completed");
  });

  it("returns delayed when end date is past and progress < 100", () => {
    expect(computeTaskStatus(50, PAST)).toBe("delayed");
    expect(computeTaskStatus(1, PAST)).toBe("delayed");
    expect(computeTaskStatus(99, PAST)).toBe("delayed");
  });

  it("returns in_progress when progress is between 1 and 99 and end date is future", () => {
    expect(computeTaskStatus(1, FUTURE)).toBe("in_progress");
    expect(computeTaskStatus(50, FUTURE)).toBe("in_progress");
    expect(computeTaskStatus(99, FUTURE)).toBe("in_progress");
  });
});

// ─── computeProjectHealth ───────────────────────────────────

describe("computeProjectHealth", () => {
  it("returns on_track for an empty task list", () => {
    expect(computeProjectHealth([])).toBe("on_track");
  });

  it("returns delayed when any task has status delayed", () => {
    const tasks = [
      makeTask({ status: "in_progress", progress: 50 }),
      makeTask({ id: "t2", status: "delayed", progress: 20 }),
    ];
    expect(computeProjectHealth(tasks)).toBe("delayed");
  });

  it("returns on_track when project is progressing well", () => {
    const now = new Date();
    // Project started 10 days ago, ends 200 days from now (well under the 70% elapsed threshold)
    const start = new Date(now);
    start.setDate(start.getDate() - 10);
    const end = new Date(now);
    end.setDate(end.getDate() + 200);
    const tasks = [
      makeTask({
        start_date: start.toISOString().split("T")[0],
        end_date: end.toISOString().split("T")[0],
        progress: 80,
        status: "in_progress",
      }),
    ];
    expect(computeProjectHealth(tasks)).toBe("on_track");
  });

  it("returns at_risk when elapsed > 70% of span but avg progress < 50%", () => {
    const now = new Date();
    // Project started 80 days ago, ends 10 days from now → >88% elapsed
    const start = new Date(now);
    start.setDate(start.getDate() - 80);
    const end = new Date(now);
    end.setDate(end.getDate() + 10);
    const tasks = [
      makeTask({
        type: "task",
        start_date: start.toISOString().split("T")[0],
        end_date: end.toISOString().split("T")[0],
        progress: 20, // low progress
        status: "in_progress",
      }),
    ];
    expect(computeProjectHealth(tasks)).toBe("at_risk");
  });

  it("excludes milestone tasks from average progress calculation", () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 80);
    const end = new Date(now);
    end.setDate(end.getDate() + 10);
    const tasks = [
      makeTask({
        type: "task",
        start_date: start.toISOString().split("T")[0],
        end_date: end.toISOString().split("T")[0],
        progress: 80,
        status: "in_progress",
      }),
      // Milestone at 0% should not drag down average
      makeTask({
        id: "m1",
        type: "milestone",
        start_date: start.toISOString().split("T")[0],
        end_date: end.toISOString().split("T")[0],
        progress: 0,
        status: "not_started",
      }),
    ];
    // Average of work items only (progress=80) → not at_risk
    expect(computeProjectHealth(tasks)).toBe("on_track");
  });
});

// ─── buildTaskTree ──────────────────────────────────────────

describe("buildTaskTree", () => {
  it("builds a tree from a flat list", () => {
    const tasks: SitePlanTask[] = [
      makeTask({ id: "phase1", parent_id: null, type: "phase", sort_order: 0, wbs_code: "1" }),
      makeTask({ id: "task1", parent_id: "phase1", type: "task", sort_order: 0, wbs_code: "1.1" }),
      makeTask({ id: "task2", parent_id: "phase1", type: "task", sort_order: 1, wbs_code: "1.2" }),
      makeTask({ id: "sub1", parent_id: "task1", type: "subtask", sort_order: 0, wbs_code: "1.1.1" }),
    ];

    const tree = buildTaskTree(tasks);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("phase1");
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].id).toBe("task1");
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe("sub1");
    expect(tree[0].children[1].id).toBe("task2");
  });

  it("places orphaned tasks (unknown parent_id) at root level", () => {
    const tasks: SitePlanTask[] = [
      makeTask({ id: "t1", parent_id: "nonexistent-uuid", type: "task", sort_order: 0 }),
    ];

    const tree = buildTaskTree(tasks);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("t1");
    expect(tree[0].children).toHaveLength(0);
  });

  it("returns root nodes sorted by sort_order", () => {
    const tasks: SitePlanTask[] = [
      makeTask({ id: "b", parent_id: null, sort_order: 1 }),
      makeTask({ id: "a", parent_id: null, sort_order: 0 }),
    ];

    const tree = buildTaskTree(tasks);

    expect(tree[0].id).toBe("a");
    expect(tree[1].id).toBe("b");
  });

  it("returns empty array for empty input", () => {
    expect(buildTaskTree([])).toEqual([]);
  });
});

// ─── flattenTree ────────────────────────────────────────────

describe("flattenTree", () => {
  it("produces depth-first ordering", () => {
    const tasks: SitePlanTask[] = [
      makeTask({ id: "phase1", parent_id: null, type: "phase", sort_order: 0 }),
      makeTask({ id: "task1", parent_id: "phase1", type: "task", sort_order: 0 }),
      makeTask({ id: "sub1", parent_id: "task1", type: "subtask", sort_order: 0 }),
      makeTask({ id: "task2", parent_id: "phase1", type: "task", sort_order: 1 }),
      makeTask({ id: "phase2", parent_id: null, type: "phase", sort_order: 1 }),
    ];

    const tree = buildTaskTree(tasks);
    const flat = flattenTree(tree);
    const ids = flat.map((n) => n.id);

    expect(ids).toEqual(["phase1", "task1", "sub1", "task2", "phase2"]);
  });

  it("returns empty array for empty input", () => {
    expect(flattenTree([])).toEqual([]);
  });

  it("handles a single root node with no children", () => {
    const tasks: SitePlanTask[] = [makeTask({ id: "solo" })];
    const tree = buildTaskTree(tasks);
    const flat = flattenTree(tree);
    expect(flat).toHaveLength(1);
    expect(flat[0].id).toBe("solo");
  });
});

// ─── generateWbsCode ────────────────────────────────────────

describe("generateWbsCode", () => {
  it("generates root-level WBS code (no parent)", () => {
    expect(generateWbsCode(null, 0)).toBe("1");
    expect(generateWbsCode(null, 2)).toBe("3");
  });

  it("generates nested WBS code", () => {
    expect(generateWbsCode("1", 0)).toBe("1.1");
    expect(generateWbsCode("2", 1)).toBe("2.2");
  });

  it("generates deeply nested WBS code", () => {
    expect(generateWbsCode("1.2.3", 0)).toBe("1.2.3.1");
    expect(generateWbsCode("1.2", 4)).toBe("1.2.5");
  });
});

// ─── computeWorkProgress ────────────────────────────────────

describe("computeWorkProgress", () => {
  it("returns 0 for empty list", () => {
    expect(computeWorkProgress([])).toBe(0);
  });

  it("excludes phase tasks from average", () => {
    const tasks = [
      makeTask({ type: "phase", progress: 0 }),
      makeTask({ id: "t2", type: "task", progress: 60 }),
      makeTask({ id: "t3", type: "task", progress: 40 }),
    ];
    expect(computeWorkProgress(tasks)).toBe(50);
  });

  it("excludes milestone tasks from average", () => {
    const tasks = [
      makeTask({ type: "milestone", progress: 0 }),
      makeTask({ id: "t2", type: "task", progress: 100 }),
    ];
    expect(computeWorkProgress(tasks)).toBe(100);
  });

  it("returns 0 when only phases/milestones are present", () => {
    const tasks = [
      makeTask({ type: "phase", progress: 80 }),
      makeTask({ id: "m1", type: "milestone", progress: 100 }),
    ];
    expect(computeWorkProgress(tasks)).toBe(0);
  });

  it("rounds the average", () => {
    const tasks = [
      makeTask({ id: "t1", type: "task", progress: 100 }),
      makeTask({ id: "t2", type: "task", progress: 0 }),
      makeTask({ id: "t3", type: "task", progress: 0 }),
    ];
    // average = 33.33... → rounds to 33
    expect(computeWorkProgress(tasks)).toBe(33);
  });
});
