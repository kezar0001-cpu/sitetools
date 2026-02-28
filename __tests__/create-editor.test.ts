import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the create-editor API route security fix.
 * 
 * Bug: The route previously trusted `requesting_user_id` from the request body,
 * allowing any attacker to forge an admin identity.
 * Fix: Extract the caller from the Authorization header JWT via supabaseAdmin.auth.getUser().
 */

// Mock supabaseAdmin
const mockGetUser = vi.fn();
const mockSelectSingle = vi.fn();
const mockCreateUser = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsertMemberSites = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      admin: { createUser: mockCreateUser },
    },
    from: (table: string) => {
      if (table === "org_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: mockSelectSingle,
              }),
            }),
          }),
          insert: () => ({ select: () => ({ maybeSingle: mockMaybeSingle }) }),
        };
      }

      if (table === "org_member_sites") {
        return {
          insert: mockInsertMemberSites,
        };
      }

      return {};
    },
  }),
}));

// We need to dynamically import the route after mocking
async function callRoute(body: Record<string, string>, authHeader?: string) {
  const { POST } = await import("../app/api/create-editor/route");
  const headers = new Headers({ "Content-Type": "application/json" });
  if (authHeader) headers.set("authorization", authHeader);
  const req = new Request("http://localhost/api/create-editor", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  // NextRequest wraps Request — the route uses req.headers.get() and req.json()
  return POST(req as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/create-editor", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const res = await callRoute({ email: "a@b.com", password: "123456", org_id: "x", site_id: "y" });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  it("returns 401 when Authorization header has invalid token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    const res = await callRoute(
      { email: "a@b.com", password: "123456", org_id: "x", site_id: "y" },
      "Bearer invalid-token"
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/invalid session/i);
  });

  it("returns 403 when caller is not an admin of the org", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSelectSingle.mockResolvedValue({ data: { role: "editor" }, error: null });
    const res = await callRoute(
      { email: "a@b.com", password: "123456", org_id: "org-1", site_id: "site-1" },
      "Bearer valid-token"
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const res = await callRoute(
      { email: "a@b.com", password: "123456", org_id: "org-1" }, // missing site_id
      "Bearer valid-token"
    );
    expect(res.status).toBe(400);
  });

  it("successfully creates editor when caller is verified admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockSelectSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockCreateUser.mockResolvedValue({ data: { user: { id: "new-editor" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { id: "new-member" }, error: null });
    mockInsertMemberSites.mockResolvedValue({ error: null });

    const res = await callRoute(
      { email: "editor@test.com", password: "123456", org_id: "org-1", site_id: "site-1" },
      "Bearer valid-admin-token"
    );
    expect(res.status).toBe(200);

    // Verify getUser was called with the token (not a body field)
    expect(mockGetUser).toHaveBeenCalledWith("valid-admin-token");
  });

  it("ignores any requesting_user_id in the body (security)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "real-admin" } }, error: null });
    mockSelectSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockCreateUser.mockResolvedValue({ data: { user: { id: "new-editor" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { id: "new-member" }, error: null });
    mockInsertMemberSites.mockResolvedValue({ error: null });

    const res = await callRoute(
      {
        email: "editor@test.com", password: "123456",
        org_id: "org-1", site_id: "site-1",
        requesting_user_id: "attacker-forged-id", // should be ignored
      },
      "Bearer valid-admin-token"
    );
    expect(res.status).toBe(200);
    // The route should have used "real-admin" from the JWT, not "attacker-forged-id"
    expect(mockGetUser).toHaveBeenCalledWith("valid-admin-token");
  });
});
