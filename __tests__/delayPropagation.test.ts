import { describe, expect, it } from "vitest";
import { computeDelayPropagation } from "@/lib/delayPropagation";
import type { SitePlanTask } from "@/types/siteplan";

function makeTask(overrides: Partial<SitePlanTask>): SitePlanTask {
  return {
    id: "t0",
    project_id: "p1",
    parent_id: null,
    wbs_code: "1",
    name: "Task",
    type: "task",
    status: "not_started",
    start_date: "2026-01-01",
    end_date: "2026-01-02",
    actual_start: null,
    actual_end: null,
    progress: 0,
    duration_days: 1,
    predecessors: null,
    responsible: null,
    assigned_to: null,
    comments: null,
    notes: null,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    updated_by: null,
    ...overrides,
  };
}

describe("computeDelayPropagation", () => {
  it("pushes only the target task end date for a single task", () => {
    const tasks = [
      makeTask({ id: "A", start_date: "2026-01-01", end_date: "2026-01-05" }),
    ];

    const result = computeDelayPropagation("A", 2, tasks);

    expect(result).toEqual([
      { taskId: "A", newStartDate: "2026-01-01", newEndDate: "2026-01-07" },
    ]);
  });

  it("propagates through a chain of 3 tasks", () => {
    const tasks = [
      makeTask({ id: "A", start_date: "2026-01-01", end_date: "2026-01-05", predecessors: null }),
      makeTask({ id: "B", start_date: "2026-01-06", end_date: "2026-01-08", predecessors: "A" }),
      makeTask({ id: "C", start_date: "2026-01-09", end_date: "2026-01-12", predecessors: "B" }),
    ];

    const result = computeDelayPropagation("A", 3, tasks);

    expect(result).toEqual([
      { taskId: "A", newStartDate: "2026-01-01", newEndDate: "2026-01-08" },
      { taskId: "B", newStartDate: "2026-01-09", newEndDate: "2026-01-11" },
      { taskId: "C", newStartDate: "2026-01-12", newEndDate: "2026-01-15" },
    ]);
  });

  it("guards against circular dependencies and deduplicates updates", () => {
    const tasks = [
      makeTask({ id: "A", start_date: "2026-01-01", end_date: "2026-01-03", predecessors: "C" }),
      makeTask({ id: "B", start_date: "2026-01-04", end_date: "2026-01-06", predecessors: "A" }),
      makeTask({ id: "C", start_date: "2026-01-07", end_date: "2026-01-09", predecessors: "B" }),
    ];

    const result = computeDelayPropagation("A", 1, tasks);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.taskId).sort()).toEqual(["A", "B", "C"]);
  });
});
