import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, mockProject, mockUser } from "../helpers/supabase-mock";

const { supabase, chain } = createSupabaseMock();

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}));

beforeEach(() => {
  vi.clearAllMocks();
  supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
  chain.single.mockResolvedValue({ data: mockProject, error: null });
  chain.select.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  supabase.from.mockReturnValue(chain);
});

describe("PATCH /api/projects/[id]/assets/[assetId]", () => {
  it("returns 401 without auth", async () => {
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { PATCH } = await import("@/src/app/api/projects/[id]/assets/[assetId]/route");
    const req = new Request("http://localhost/foo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { plan: "x" } }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "p1", assetId: "a1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when no fields provided", async () => {
    const { PATCH } = await import("@/src/app/api/projects/[id]/assets/[assetId]/route");
    const req = new Request("http://localhost/foo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "p1", assetId: "a1" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects invalid status values", async () => {
    const { PATCH } = await import("@/src/app/api/projects/[id]/assets/[assetId]/route");
    const req = new Request("http://localhost/foo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "definitely-not-real" }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "p1", assetId: "a1" }),
    });
    expect(res.status).toBe(400);
  });

  it("updates content (used by Growth Playbook checkbox persistence)", async () => {
    let updatePayload: Record<string, unknown> | null = null;
    chain.update = vi.fn((row) => {
      updatePayload = row;
      return chain;
    });
    chain.single
      .mockResolvedValueOnce({ data: mockProject, error: null }) // verifyProjectOwnership
      .mockResolvedValueOnce({
        data: {
          id: "a1",
          project_id: "p1",
          type: "growth_playbook",
          content: {
            parsed: { phases: [] },
            completed_actions: ["task-1", "task-3"],
          },
        },
        error: null,
      });

    const { PATCH } = await import("@/src/app/api/projects/[id]/assets/[assetId]/route");
    const req = new Request("http://localhost/foo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: {
          parsed: { phases: [] },
          completed_actions: ["task-1", "task-3"],
        },
      }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "p1", assetId: "a1" }),
    });
    expect(res.status).toBe(200);
    expect(updatePayload).toEqual({
      content: {
        parsed: { phases: [] },
        completed_actions: ["task-1", "task-3"],
      },
    });
  });

  it("accepts valid status values", async () => {
    chain.single
      .mockResolvedValueOnce({ data: mockProject, error: null })
      .mockResolvedValueOnce({
        data: { id: "a1", project_id: "p1", status: "published" },
        error: null,
      });

    const { PATCH } = await import("@/src/app/api/projects/[id]/assets/[assetId]/route");
    const req = new Request("http://localhost/foo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "p1", assetId: "a1" }),
    });
    expect(res.status).toBe(200);
  });
});
