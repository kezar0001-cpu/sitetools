import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SitePlanTask } from "@/types/siteplan";
import { GanttChart } from "@/app/(app)/site-plan/components/GanttChart";

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

describe("Gantt dependency arrows", () => {
  it("renders elbow dependency path with expected colour and hover tooltip", () => {
    const taskA = makeTask({
      id: "A",
      wbs_code: "A",
      name: "Task A",
      start_date: "2026-01-01",
      end_date: "2026-01-02",
    });
    const taskB = makeTask({
      id: "B",
      wbs_code: "B",
      name: "Task B",
      start_date: "2026-01-03",
      end_date: "2026-01-04",
      predecessors: "A",
    });

    const { rerender } = render(
      <GanttChart tasks={[taskA, taskB]} zoom="day" showDependencies />
    );

    const greenArrow = screen.getByTestId("dep-line-A-B");
    expect(greenArrow.getAttribute("stroke")).toBe("#22c55e");

    const hitPath = screen.getByTestId("dep-hit-A-B");
    fireEvent.mouseEnter(hitPath, { clientX: 5000, clientY: 5 });
    expect(screen.getByTestId("dep-tooltip").textContent).toContain(
      "Task A must finish before Task B"
    );

    rerender(
      <GanttChart
        tasks={[
          taskA,
          makeTask({
            ...taskB,
            start_date: "2026-01-01",
            end_date: "2026-01-04",
          }),
        ]}
        zoom="day"
        showDependencies
      />
    );

    const redArrow = screen.getByTestId("dep-line-A-B");
    expect(redArrow.getAttribute("stroke")).toBe("#ef4444");
  });

  it("selects dependencies, dims unrelated bars, clears on background click, and resets across toggle", () => {
    const taskA = makeTask({ id: "A", wbs_code: "A", name: "Task A", end_date: "2026-01-02" });
    const taskB = makeTask({
      id: "B",
      wbs_code: "B",
      name: "Task B",
      start_date: "2026-01-03",
      end_date: "2026-01-05",
      predecessors: "A",
    });
    const taskC = makeTask({
      id: "C",
      wbs_code: "C",
      name: "Task C",
      start_date: "2026-01-06",
      end_date: "2026-01-07",
    });

    const { rerender, container } = render(
      <GanttChart tasks={[taskA, taskB, taskC]} zoom="day" showDependencies />
    );

    fireEvent.click(screen.getByTestId("dep-A-B"));
    expect(screen.getByTestId("task-bar-C").getAttribute("opacity")).toBe("0.25");
    expect(screen.getByTestId("task-bar-A").getAttribute("opacity")).toBe("1");
    expect(screen.getByTestId("task-bar-B").getAttribute("opacity")).toBe("1");

    fireEvent.click(container.querySelector("svg")!);
    expect(screen.getByTestId("task-bar-C").getAttribute("opacity")).toBe("1");

    fireEvent.click(screen.getByTestId("dep-A-B"));
    expect(screen.getByTestId("task-bar-C").getAttribute("opacity")).toBe("0.25");

    rerender(
      <GanttChart tasks={[taskA, taskB, taskC]} zoom="day" showDependencies={false} />
    );
    expect(screen.queryByTestId("dep-A-B")).toBeNull();
    expect(screen.getByTestId("task-bar-C").getAttribute("opacity")).toBe("1");

    rerender(
      <GanttChart tasks={[taskA, taskB, taskC]} zoom="day" showDependencies />
    );
    expect(screen.getByTestId("dep-A-B")).toBeTruthy();
    expect(screen.getByTestId("task-bar-C").getAttribute("opacity")).toBe("1");
  });
});
