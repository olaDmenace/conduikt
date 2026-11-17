// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// /api/projects/{id}/review-requests
//
// The owner check and the senders are mocked; the Free allowance, the
// review link check, the request and row rate limits and the body
// validation are real. Each test uses a fresh user id so the in-memory
// limiter does not bleed between tests.
// ---------------------------------------------------------------------------

const ownerMock = vi.fn();
vi.mock("@/src/lib/missing-pages/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/missing-pages/api")>();
  return { ...actual, requireProjectOwner: (...args: unknown[]) => ownerMock(...args) };
});

const sendManyMock = vi.fn();
const sendOneMock = vi.fn();
const listMock = vi.fn();
vi.mock("@/src/lib/reviews/send", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/reviews/send")>();
  return {
    ...actual,
    sendReviewRequests: (...args: unknown[]) => sendManyMock(...args),
    sendReviewRequest: (...args: unknown[]) => sendOneMock(...args),
    listReviewRequests: (...args: unknown[]) => listMock(...args),
  };
});

import { GET, POST } from "@/src/app/api/projects/[id]/review-requests/route";
import { FREE_REVIEW_REQUESTS_PER_MONTH, REVIEW_PLAN_MESSAGE } from "@/src/lib/reviews/access";
import { REVIEW_LINK_NOT_GOOGLE_MESSAGE } from "@/src/lib/reviews/send";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const GOOGLE_LINK = "https://g.page/r/abc123/review";

// Three tables: profiles (the plan), projects (the user's project ids)
// and review_requests (a head count of this month's rows).
function ctx(opts: { plan?: string | null; reviewUrl?: string | null; usedThisMonth?: number } = {}) {
  const userId = randomUUID();
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { plan: opts.plan === undefined ? "local" : opts.plan } }) }),
          }),
        };
      }
      if (table === "projects") {
        return { select: () => ({ eq: async () => ({ data: [{ id: PROJECT_ID }] }) }) };
      }
      if (table === "review_requests") {
        return { select: () => ({ in: () => ({ gte: async () => ({ count: opts.usedThisMonth ?? 0 }) }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
  return {
    supabase,
    userId,
    project: { id: PROJECT_ID, name: "Bright Smiles Dental", review_url: opts.reviewUrl === undefined ? GOOGLE_LINK : opts.reviewUrl },
  };
}

function post(body: unknown) {
  return new Request(`http://localhost/api/projects/${PROJECT_ID}/review-requests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: PROJECT_ID }) };

function csvOf(n: number, prefix = "x") {
  return Array.from({ length: n }, (_, i) => `Customer ${i}, ${prefix}${i}@example.com`).join("\n");
}

function sentRows(customers: Array<{ name: string; email: string | null }>) {
  return customers.map((c) => ({
    id: randomUUID(),
    project_id: PROJECT_ID,
    contact_id: null,
    name: c.name,
    email: c.email,
    phone: null,
    channel: "email",
    status: "sent",
    sent_at: "2026-11-17T10:00:00.000Z",
    error: null,
    created_at: "2026-11-17T10:00:00.000Z",
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  listMock.mockResolvedValue([]);
  sendManyMock.mockImplementation(async (_db: unknown, _project: unknown, rows: Array<{ name: string; email: string | null }>) => sentRows(rows));
  sendOneMock.mockImplementation(async (_db: unknown, input: { name: string; email: string | null }) => sentRows([input])[0]);
});

describe("GET", () => {
  it("tells the page the Free allowance and what is wrong with the link", async () => {
    ownerMock.mockResolvedValueOnce(ctx({ plan: "free", usedThisMonth: 2, reviewUrl: "https://example.com/reviews" }));
    const res = await GET(new Request("http://localhost") as never, params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canSend).toBe(true);
    expect(body.planMessage).toBeNull();
    expect(body.allowance).toEqual({ limit: FREE_REVIEW_REQUESTS_PER_MONTH, used: 2, remaining: 3 });
    expect(body.reviewLinkProblem).toBe(REVIEW_LINK_NOT_GOOGLE_MESSAGE);
    expect(body.reviewUrl).toBe("https://example.com/reviews");
    expect(body.requests).toEqual([]);
  });

  it("says a Free account that used its allowance cannot send", async () => {
    ownerMock.mockResolvedValueOnce(ctx({ plan: "free", usedThisMonth: 5 }));
    const body = await (await GET(new Request("http://localhost") as never, params)).json();
    expect(body.canSend).toBe(false);
    expect(body.planMessage).toBe(REVIEW_PLAN_MESSAGE);
    expect(body.allowance).toEqual({ limit: 5, used: 5, remaining: 0 });
  });

  it("is all clear on a paid plan with a Google link", async () => {
    ownerMock.mockResolvedValueOnce(ctx({ plan: "pro", usedThisMonth: 900 }));
    const body = await (await GET(new Request("http://localhost") as never, params)).json();
    expect(body.canSend).toBe(true);
    expect(body.planMessage).toBeNull();
    expect(body.allowance).toBeNull();
    expect(body.reviewLinkProblem).toBeNull();
  });
});

describe("POST gates", () => {
  it("lets the Free plan send while this month's allowance lasts", async () => {
    ownerMock.mockResolvedValueOnce(ctx({ plan: "free", usedThisMonth: 4 }));
    const res = await POST(post({ name: "Ada", email: "ada@example.com" }) as never, params);
    expect(res.status).toBe(201);
    expect(sendOneMock).toHaveBeenCalledTimes(1);
  });

  it("answers 402 with an upgrade message once the Free allowance is used", async () => {
    ownerMock.mockResolvedValueOnce(ctx({ plan: "free", usedThisMonth: 5 }));
    const res = await POST(post({ name: "Ada", email: "ada@example.com" }) as never, params);
    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({ error: REVIEW_PLAN_MESSAGE, code: "upgrade_required" });
    expect(sendOneMock).not.toHaveBeenCalled();
    expect(sendManyMock).not.toHaveBeenCalled();
  });

  it("answers 402 when a Free paste is bigger than what is left this month", async () => {
    ownerMock.mockResolvedValueOnce(ctx({ plan: "free", usedThisMonth: 3 }));
    const res = await POST(post({ csv: csvOf(3) }) as never, params);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("upgrade_required");
    expect(body.error).toContain("2 free review requests left");
    expect(sendManyMock).not.toHaveBeenCalled();
  });

  it("Local and above have no monthly cap", async () => {
    ownerMock.mockResolvedValueOnce(ctx({ plan: "local", usedThisMonth: 5000 }));
    const res = await POST(post({ name: "Ada", email: "ada@example.com" }) as never, params);
    expect(res.status).toBe(201);
  });

  it("answers 400 when the review link is not a Google one", async () => {
    ownerMock.mockResolvedValueOnce(ctx({ reviewUrl: "https://yourbank-login.example/verify" }));
    const res = await POST(post({ csv: csvOf(3) }) as never, params);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: REVIEW_LINK_NOT_GOOGLE_MESSAGE });
    expect(sendManyMock).not.toHaveBeenCalled();
  });

  it("answers 400 when the review link is missing", async () => {
    ownerMock.mockResolvedValueOnce(ctx({ reviewUrl: null }));
    const res = await POST(post({ name: "Ada", email: "ada@example.com" }) as never, params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Add your Google review link in Settings first");
  });

  it("lets the Local plan send one customer", async () => {
    ownerMock.mockResolvedValueOnce(ctx({ plan: "local" }));
    const res = await POST(post({ name: "Ada", email: "ada@example.com" }) as never, params);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.request.name).toBe("Ada");
    expect(sendOneMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST row limit", () => {
  it("counts customers, not calls: five pastes of 50 do not all fit in an hour", async () => {
    const c = ctx({ plan: "pro" });
    ownerMock.mockResolvedValue(c);

    for (let i = 0; i < 4; i++) {
      const res = await POST(post({ csv: csvOf(50, `p${i}-`) }) as never, params);
      expect(res.status).toBe(201);
      expect((await res.json()).sent).toBe(50);
    }
    expect(sendManyMock).toHaveBeenCalledTimes(4);
    expect(sendManyMock.mock.calls[0][2]).toHaveLength(50);

    const fifth = await POST(post({ csv: csvOf(50, "z") }) as never, params);
    expect(fifth.status).toBe(429);
    expect(fifth.headers.get("Retry-After")).toBeTruthy();
    expect(sendManyMock).toHaveBeenCalledTimes(4);
  });

  it("a single ask also takes one slot", async () => {
    const c = ctx({ plan: "pro" });
    ownerMock.mockResolvedValue(c);

    for (let i = 0; i < 4; i++) {
      expect((await POST(post({ csv: csvOf(50, `q${i}-`) }) as never, params)).status).toBe(201);
    }
    const res = await POST(post({ name: "Ada", email: "ada@example.com" }) as never, params);
    expect(res.status).toBe(429);
    expect(sendOneMock).not.toHaveBeenCalled();
  });

  it("refuses a paste over 50 customers with 400 instead of trimming it", async () => {
    ownerMock.mockResolvedValue(ctx({ plan: "pro" }));
    const res = await POST(post({ csv: csvOf(51) }) as never, params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("too_many_rows");
    expect(body.error).toContain("51 customers");
    expect(body.error).toContain("50");
    expect(sendManyMock).not.toHaveBeenCalled();
  });

  it("sends a paste of exactly 50", async () => {
    ownerMock.mockResolvedValue(ctx({ plan: "pro" }));
    const res = await POST(post({ csv: csvOf(50) }) as never, params);
    expect(res.status).toBe(201);
    expect(sendManyMock.mock.calls[0][2]).toHaveLength(50);
  });
});
