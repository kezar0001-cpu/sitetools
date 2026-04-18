import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: fromMock,
  },
}));

function createChain(result: { count: number | null }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    is: vi.fn(() => result),
  };

  return chain;
}

describe("fetchDashboardStatsClientSide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies company scoping joins for visits and photos in fallback queries", async () => {
    const sitesChain = createChain({ count: 7 });
    const visitsChain = createChain({ count: 3 });
    const itpsChain = createChain({ count: 5 });
    const photosChain = createChain({ count: 12 });

    // Chains that end on eq() need to return final results for Promise.all destructuring
    (sitesChain.eq as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => sitesChain)
      .mockImplementationOnce(() => ({ count: 7 }));

    (itpsChain.eq as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => itpsChain)
      .mockImplementationOnce(() => ({ count: 5 }));

    (photosChain.eq as ReturnType<typeof vi.fn>).mockImplementation(() => ({ count: 12 }));

    fromMock.mockImplementation((table: string) => {
      if (table === "sites") return sitesChain;
      if (table === "site_visits") return visitsChain;
      if (table === "itp_sessions") return itpsChain;
      if (table === "site_diary_photos") return photosChain;
      throw new Error(`Unexpected table: ${table}`);
    });

    const { fetchDashboardStatsClientSide } = await import("@/lib/dashboard/client");
    const companyId = "company-123";

    const stats = await fetchDashboardStatsClientSide(companyId);

    expect(stats).toEqual({
      activeSites: 7,
      onSiteToday: 3,
      openItps: 5,
      photosThisWeek: 12,
    });

    expect(visitsChain.select).toHaveBeenCalledWith("id, sites!inner(company_id)", {
      count: "exact",
      head: true,
    });
    expect(visitsChain.eq).toHaveBeenCalledWith("sites.company_id", companyId);

    expect(photosChain.select).toHaveBeenCalledWith("id, site_diaries!inner(company_id)", {
      count: "exact",
      head: true,
    });
    expect(photosChain.eq).toHaveBeenCalledWith("site_diaries.company_id", companyId);
  });
});
