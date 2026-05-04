import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, mockProject, mockUser } from "../helpers/supabase-mock";

const { supabase, chain } = createSupabaseMock();

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}));
vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => supabase,
}));

beforeEach(() => {
  vi.clearAllMocks();
  supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
  chain.single.mockResolvedValue({ data: mockProject, error: null });
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  supabase.from.mockReturnValue(chain);
});

// Smoke tests for the validation surface. The handler-level behaviour
// (enrollment + scheduling) is covered in the email-sequence-step handler
// tests; here we only verify the endpoint guards before reaching that
// code path.
describe("POST /api/projects/[id]/email-sequences/[seqId]/enroll", () => {
  it("returns 401 without auth", async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const { POST } = await import(
      "@/src/app/api/projects/[id]/email-sequences/[seqId]/enroll/route"
    );
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audienceId: "a1" }),
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", seqId: "s1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when audienceId is missing", async () => {
    const { POST } = await import(
      "@/src/app/api/projects/[id]/email-sequences/[seqId]/enroll/route"
    );
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", seqId: "s1" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/audienceId/i);
  });

  it("returns 404 when the sequence isn't found for this project", async () => {
    // verifyProjectOwnership succeeds (chain.single → mockProject), then
    // the sequence lookup returns null.
    chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { POST } = await import(
      "@/src/app/api/projects/[id]/email-sequences/[seqId]/enroll/route"
    );
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audienceId: "a1" }),
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", seqId: "s1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when the sequence has no steps", async () => {
    chain.maybeSingle
      .mockResolvedValueOnce({
        data: { id: "s1", project_id: "p1", name: "Empty", email_sequence_steps: [] },
        error: null,
      });

    const { POST } = await import(
      "@/src/app/api/projects/[id]/email-sequences/[seqId]/enroll/route"
    );
    const req = new Request("http://localhost/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audienceId: "a1" }),
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "p1", seqId: "s1" }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/no steps/i);
  });
});
