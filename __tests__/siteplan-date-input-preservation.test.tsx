import React from "react";
(globalThis as { React?: typeof React }).React = React;
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { CreateTaskSheet } from "@/app/(app)/site-plan/components/CreateTaskSheet";
import { TaskEditorTabs } from "@/app/(app)/site-plan/components/TaskEditorTabs";
import type { SitePlanTask, UpdateTaskPayload } from "@/types/siteplan";

const mutateMock = vi.fn();

vi.mock("@/hooks/useSitePlanTasks", () => ({
  useCreateTask: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useFocusTrap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

function makeTask(partial: Partial<SitePlanTask> = {}): SitePlanTask {
  return {
    id: partial.id ?? "task-1",
    project_id: partial.project_id ?? "project-1",
    parent_id: partial.parent_id ?? null,
    wbs_code: partial.wbs_code ?? "1",
    name: partial.name ?? "Task 1",
    type: partial.type ?? "task",
    status: partial.status ?? "not_started",
    start_date: partial.start_date ?? "2026-03-01",
    end_date: partial.end_date ?? "2026-03-05",
    actual_start: partial.actual_start ?? null,
    actual_end: partial.actual_end ?? null,
    progress: partial.progress ?? 0,
    duration_days: partial.duration_days ?? 5,
    predecessors: partial.predecessors ?? null,
    responsible: partial.responsible ?? null,
    assigned_to: partial.assigned_to ?? null,
    comments: partial.comments ?? null,
    notes: partial.notes ?? null,
    sort_order: partial.sort_order ?? 0,
    created_at: partial.created_at ?? "2026-03-01T00:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-03-01T00:00:00.000Z",
    updated_by: partial.updated_by ?? null,
  };
}

describe("site plan date input preservation", () => {
  beforeEach(() => {
    mutateMock.mockReset();
  });

  it("submits raw YYYY-MM-DD strings from CreateTaskSheet without locale conversion", () => {
    render(
      <CreateTaskSheet
        projectId="project-1"
        type="task"
        onClose={() => {}}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Excavate trench"), {
      target: { value: "Install drains" },
    });

    const dateInputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    expect(dateInputs.length).toBe(2);

    fireEvent.change(dateInputs[0], { target: { value: "2026-10-28" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-11-02" } });

    fireEvent.click(screen.getByRole("button", { name: "Create Task" }));

    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock.mock.calls[0][0]).toMatchObject({
      start_date: "2026-10-28",
      end_date: "2026-11-02",
    });
  });

  it("emits exact YYYY-MM-DD values from TaskEditorTabs date fields", () => {
    const onChange = vi.fn<[keyof UpdateTaskPayload, UpdateTaskPayload[keyof UpdateTaskPayload]], void>();

    render(
      <TaskEditorTabs
        task={makeTask()}
        form={{
          name: "Task 1",
          start_date: "2026-03-01",
          end_date: "2026-03-05",
          progress: 0,
          status: "not_started",
        }}
        onChange={onChange}
        savedField={null}
        members={[]}
        logs={[]}
        delayLogs={[]}
        progressNote=""
        onProgressNoteChange={() => {}}
      />
    );

    const dateInputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);

    fireEvent.change(dateInputs[0], { target: { value: "2026-12-09" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-12-18" } });

    expect(onChange).toHaveBeenCalledWith("start_date", "2026-12-09");
    expect(onChange).toHaveBeenCalledWith("end_date", "2026-12-18");
  });
});
