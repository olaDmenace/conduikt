import { describe, it, expect, vi, beforeEach } from "vitest";

const confirmMock = vi.fn();
vi.mock("@/src/lib/email/confirm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/email/confirm")>();
  return { ...actual, confirmContactByToken: (...a: unknown[]) => confirmMock(...a) };
});
vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: vi.fn() }),
}));

const TOKEN = "b".repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/api/confirm", () => {
  it("GET without a token is 400", async () => {
    const { GET } = await import("@/src/app/api/confirm/route");
    const res = await GET(new Request("http://localhost/api/confirm") as never);
    expect(res.status).toBe(400);
  });

  it("GET confirms and redirects to /confirm?state=done", async () => {
    confirmMock.mockResolvedValueOnce({ ok: true, state: "confirmed", email: "a@x.com", contactId: "c1" });
    const { GET } = await import("@/src/app/api/confirm/route");
    const res = await GET(new Request(`http://localhost/api/confirm?token=${TOKEN}`, { headers: { "x-forwarded-for": "1.1.1.1" } }) as never);
    expect(res.status).toBe(303);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/confirm");
    expect(loc.searchParams.get("token")).toBe(TOKEN);
    expect(loc.searchParams.get("state")).toBe("done");
    expect(confirmMock).toHaveBeenCalledWith(expect.anything(), TOKEN);
  });

  it("GET for an already-confirmed contact redirects with state=already (token kept for branding)", async () => {
    confirmMock.mockResolvedValueOnce({ ok: true, state: "already", email: "a@x.com", contactId: "c1" });
    const { GET } = await import("@/src/app/api/confirm/route");
    const res = await GET(new Request(`http://localhost/api/confirm?token=${TOKEN}`, { headers: { "x-forwarded-for": "1.1.1.9" } }) as never);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.searchParams.get("state")).toBe("already");
    expect(loc.searchParams.get("token")).toBe(TOKEN);
  });

  it("GET for a contact that unsubscribed since redirects with state=not_pending", async () => {
    confirmMock.mockResolvedValueOnce({ ok: false, state: "not_pending" });
    const { GET } = await import("@/src/app/api/confirm/route");
    const res = await GET(new Request(`http://localhost/api/confirm?token=${TOKEN}`, { headers: { "x-forwarded-for": "1.1.1.10" } }) as never);
    expect(new URL(res.headers.get("location")!).searchParams.get("state")).toBe("not_pending");
  });

  it("GET with an expired token redirects with state=expired", async () => {
    confirmMock.mockResolvedValueOnce({ ok: false, state: "expired" });
    const { GET } = await import("@/src/app/api/confirm/route");
    const res = await GET(new Request(`http://localhost/api/confirm?token=${TOKEN}`, { headers: { "x-forwarded-for": "1.1.1.2" } }) as never);
    expect(new URL(res.headers.get("location")!).searchParams.get("state")).toBe("expired");
  });

  it("POST reads the token from JSON and answers with the state", async () => {
    confirmMock.mockResolvedValueOnce({ ok: true, state: "already", email: "a@x.com", contactId: "c1" });
    const { POST } = await import("@/src/app/api/confirm/route");
    const res = await POST(
      new Request("http://localhost/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "1.1.1.3" },
        body: JSON.stringify({ token: TOKEN }),
      }) as never
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, state: "already" });
  });

  it("POST maps invalid -> 404 and expired -> 410", async () => {
    const { POST } = await import("@/src/app/api/confirm/route");
    confirmMock.mockResolvedValueOnce({ ok: false, state: "invalid" });
    const r1 = await POST(
      new Request("http://localhost/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "x-forwarded-for": "1.1.1.4" },
        body: `token=${TOKEN}`,
      }) as never
    );
    expect(r1.status).toBe(404);
    confirmMock.mockResolvedValueOnce({ ok: false, state: "expired" });
    const r2 = await POST(new Request(`http://localhost/api/confirm?token=${TOKEN}`, { method: "POST", headers: { "x-forwarded-for": "1.1.1.5" } }) as never);
    expect(r2.status).toBe(410);
  });

  it("POST maps not_pending -> 409 and does not claim success", async () => {
    confirmMock.mockResolvedValueOnce({ ok: false, state: "not_pending" });
    const { POST } = await import("@/src/app/api/confirm/route");
    const res = await POST(new Request(`http://localhost/api/confirm?token=${TOKEN}`, { method: "POST", headers: { "x-forwarded-for": "1.1.1.6" } }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "not_pending" });
  });
});
