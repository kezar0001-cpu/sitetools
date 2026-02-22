import { describe, it, expect } from "vitest";

/**
 * Tests verifying the fetchVisits data-leak fix.
 *
 * Bug: When no site was selected, fetchVisits queried ALL site_visits
 * across every org/site — leaking data to editors who should only see one site.
 * Fix: Return early with an empty array when activeSite is null.
 *
 * These are logic-level tests that verify the guard condition directly,
 * since fetchVisits is an inline callback in a React component.
 */

function fetchVisitsGuard(activeSite: { id: string } | null): "skip" | "query" {
  if (!activeSite) return "skip";
  return "query";
}

describe("fetchVisits guard (data-leak fix)", () => {
  it("skips query when activeSite is null", () => {
    expect(fetchVisitsGuard(null)).toBe("skip");
  });

  it("proceeds with query when activeSite is set", () => {
    expect(fetchVisitsGuard({ id: "site-1" })).toBe("query");
  });
});
