import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock requireAdmin so we control auth outcomes per-test.
const requireAdminMock = vi.fn();
vi.mock("@/src/lib/admin/auth", () => ({
  requireAdmin: () => requireAdminMock(),
}));

// Service-role client with two methods we exercise: from('profiles').select()
// and auth.admin.listUsers(). Each test sets the return values.
const profilesSelectMock = vi.fn();
const listUsersMock = vi.fn();
const supabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: profilesSelectMock,
    })),
  })),
  auth: { admin: { listUsers: listUsersMock } },
};
vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => supabase,
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Default: caller IS admin.
  requireAdminMock.mockResolvedValue({ ok: true, userId: "admin-1" });
});

describe("GET /api/admin/users/export", () => {
  it("returns 401 when caller is not admin", async () => {
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      }),
    });

    const { GET } = await import("@/src/app/api/admin/users/export/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns CSV with header + one row per user", async () => {
    profilesSelectMock.mockResolvedValueOnce({
      data: [
        {
          id: "u1",
          full_name: "Alice Anderson",
          plan: "pro",
          role: "user",
          created_at: "2026-01-15T12:00:00Z",
        },
        {
          id: "u2",
          full_name: "Bob",
          plan: "free",
          role: "admin",
          created_at: "2026-02-10T08:30:00Z",
        },
      ],
      error: null,
    });
    listUsersMock.mockResolvedValueOnce({
      data: {
        users: [
          { id: "u1", email: "alice@example.com" },
          { id: "u2", email: "bob@example.com" },
        ],
      },
      error: null,
    });

    const { GET } = await import("@/src/app/api/admin/users/export/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");

    const csv = await res.text();
    const lines = csv.split("\n");
    expect(lines[0]).toBe("email,full_name,plan,role,created_at");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("alice@example.com");
    expect(lines[1]).toContain("Alice Anderson");
    expect(lines[1]).toContain("pro");
    expect(lines[2]).toContain("bob@example.com");
    expect(lines[2]).toContain("admin");
  });

  it("escapes commas and quotes in full_name correctly", async () => {
    profilesSelectMock.mockResolvedValueOnce({
      data: [
        {
          id: "u1",
          full_name: 'Smith, John "JD"',
          plan: "free",
          role: "user",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });
    listUsersMock.mockResolvedValueOnce({
      data: { users: [{ id: "u1", email: "jd@example.com" }] },
      error: null,
    });

    const { GET } = await import("@/src/app/api/admin/users/export/route");
    const res = await GET();
    const csv = await res.text();
    // Quotes around the field, with internal " escaped as ""
    expect(csv).toContain('"Smith, John ""JD"""');
  });

  it("propagates DB error as 500", async () => {
    profilesSelectMock.mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });

    const { GET } = await import("@/src/app/api/admin/users/export/route");
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("handles users with no email gracefully (empty email column)", async () => {
    profilesSelectMock.mockResolvedValueOnce({
      data: [
        {
          id: "u1",
          full_name: "Ghost User",
          plan: "free",
          role: "user",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });
    listUsersMock.mockResolvedValueOnce({
      data: { users: [] }, // no auth row at all
      error: null,
    });

    const { GET } = await import("@/src/app/api/admin/users/export/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const csv = await res.text();
    // first column (email) is empty, then ,Ghost User,free,user,...
    expect(csv).toContain(",Ghost User,free,user,");
  });
});
