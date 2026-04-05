import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { SitePlanToolbar } from "@/app/(app)/site-plan/components/SitePlanToolbar";

describe("SitePlanToolbar project name editing", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("enters edit mode and saves on Enter", () => {
    const onProjectNameSave = vi.fn();
    render(
      <SitePlanToolbar
        projectName="Project Alpha"
        onProjectNameSave={onProjectNameSave}
        zoom="week"
        setZoom={() => {}}
        showDeps
        setShowDeps={() => {}}
        showCriticalPath={false}
        setShowCriticalPath={() => {}}
        onOpenBaseline={() => {}}
        onOpenImport={() => {}}
        onToday={() => {}}
      />
    );

    fireEvent.click(screen.getByTitle("Edit project name"));
    const input = screen.getByDisplayValue("Project Alpha");
    fireEvent.change(input, { target: { value: "  Project Beta  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onProjectNameSave).toHaveBeenCalledWith("Project Beta");
  });

  it("saves edited name on blur", () => {
    const onProjectNameSave = vi.fn();
    render(
      <SitePlanToolbar
        projectName="Project Gamma"
        onProjectNameSave={onProjectNameSave}
        zoom="week"
        setZoom={() => {}}
        showDeps
        setShowDeps={() => {}}
        showCriticalPath={false}
        setShowCriticalPath={() => {}}
        onOpenBaseline={() => {}}
        onOpenImport={() => {}}
        onToday={() => {}}
      />
    );

    fireEvent.click(screen.getByTitle("Edit project name"));
    const input = screen.getByDisplayValue("Project Gamma");
    fireEvent.change(input, { target: { value: "Project Delta" } });
    fireEvent.blur(input);

    expect(onProjectNameSave).toHaveBeenCalledWith("Project Delta");
  });
});
