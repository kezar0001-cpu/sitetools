import { describe, expect, it } from "vitest";
import { calculatePlanHealth, getTaskScheduleVariance, getTaskVarianceLabel } from "@/lib/planner/progress-utils";
import { PlanTask } from "@/lib/planner/types";

function makeTask(partial: Partial<PlanTask>): PlanTask {
  return {
    id: "t1",
    plan_id: "p1",
    phase_id: null,
    site_id: null,
    parent_task_id: null,
    title: "Task",
    description: null,
    wbs_code: null,
    sort_order: 0,
    indent_level: 0,
    is_milestone: false,
    status: "not-started",
    priority: "medium",
    percent_complete: 0,
    planned_start: null,
    planned_finish: null,
    actual_start: null,
    actual_finish: null,
    duration_days: null,
    manual_dates: false,
    assigned_to: null,
    constraint_note: null,
    delay_reason: null,
    delay_type: null,
    weather_delay_days: 0,
    redesign_delay_days: 0,
    redesign_reason: null,
    council_waiting_on: null,
    council_submitted_date: null,
    notes: null,
    created_by: null,
    updated_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

describe("planner progress utils", () => {
  it("computes positive variance for unfinished delayed task", () => {
    const task = makeTask({ planned_finish: "2026-01-10", status: "in-progress" });
    expect(getTaskScheduleVariance(task, new Date("2026-01-13"))).toBe(3);
  });

  it("computes variance from actual finish when done", () => {
    const task = makeTask({ planned_finish: "2026-01-10", actual_finish: "2026-01-12", status: "done" });
    expect(getTaskScheduleVariance(task, new Date("2026-01-20"))).toBe(2);
    expect(getTaskVarianceLabel(task, new Date("2026-01-20"))).toContain("behind");
  });

  it("aggregates delayed and due today counts", () => {
    const now = new Date("2026-01-15T09:00:00Z");
    const tasks = [
      makeTask({ id: "a", status: "in-progress", planned_finish: "2026-01-13", percent_complete: 50 }),
      makeTask({ id: "b", status: "blocked", planned_finish: "2026-01-15", percent_complete: 10 }),
      makeTask({ id: "c", status: "done", planned_finish: "2026-01-14", actual_finish: "2026-01-14", percent_complete: 100 }),
    ];

    expect(calculatePlanHealth(tasks, now)).toMatchObject({
      total: 3,
      done: 1,
      blocked: 1,
      delayed: 1,
      dueToday: 1,
      avgPercent: 53,
    });
  });
});
