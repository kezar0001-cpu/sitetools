import { describe, expect, it } from "vitest";
import { computeCriticalPath } from "@/lib/criticalPath";
import type { SitePlanTask } from "@/types/siteplan";

function makeTask(partial: Partial<SitePlanTask>): SitePlanTask {
  return {
    id: partial.id ?? crypto.randomUUID(),
    project_id: "p1",
    parent_id: null,
    wbs_code: partial.wbs_code ?? "1",
    name: partial.name ?? "Task",
    type: partial.type ?? "task",
    status: partial.status ?? "not_started",
    start_date: partial.start_date ?? "2026-01-01",
    end_date: partial.end_date ?? "2026-01-03",
    actual_start: null,
    actual_end: null,
    progress: partial.progress ?? 0,
    duration_days: partial.duration_days ?? 2,
    predecessors: partial.predecessors ?? null,
    responsible: null,
    assigned_to: null,
    comments: null,
    notes: null,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    updated_by: null,
  };
}

describe("computeCriticalPath", () => {
  it("handles tasks with no predecessors and marks the longest chain", () => {
    const a = makeTask({ id: "A", wbs_code: "A", start_date: "2026-01-01", end_date: "2026-01-05" });
    const b = makeTask({ id: "B", wbs_code: "B", start_date: "2026-01-01", end_date: "2026-01-03" });
    const c = makeTask({
      id: "C",
      wbs_code: "C",
      predecessors: "B",
      start_date: "2026-01-03",
      end_date: "2026-01-04",
    });

    const result = computeCriticalPath([a, b, c]);
    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(false);
    expect(result.has("C")).toBe(false);
  });

  it("does not throw and returns IDs when there is a circular dependency", () => {
    const a = makeTask({ id: "A", wbs_code: "A", predecessors: "C" });
    const b = makeTask({ id: "B", wbs_code: "B", predecessors: "A" });
    const c = makeTask({ id: "C", wbs_code: "C", predecessors: "B" });

    const result = computeCriticalPath([a, b, c]);
    expect(result.size).toBeGreaterThan(0);
    expect(result.has("A") || result.has("B") || result.has("C")).toBe(true);
  });

  it("tolerates invalid dates without returning an empty set", () => {
    const a = makeTask({ id: "A", wbs_code: "A", start_date: "bad-date", end_date: "also-bad" });
    const b = makeTask({ id: "B", wbs_code: "B", predecessors: "A", start_date: "2026-01-03", end_date: "2026-01-04" });

    const result = computeCriticalPath([a, b]);
    expect(result.size).toBeGreaterThan(0);
  });
});
