// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// POST /api/projects/{id}/titles
//
// The owner check, the crawl and the model are mocked; the rate limit is the
// real in-memory fallback, so each test uses a fresh user id. When the crawl
// reads nothing because the site could not be read, the route must answer
// 502 with "site_unreachable" and never ask the model about zero pages.
// ---------------------------------------------------------------------------

const ownerMock = vi.fn();
vi.mock("@/src/lib/missing-pages/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/missing-pages/api")>();
  return { ...actual, requireProjectOwner: (...args: unknown[]) => ownerMock(...args) };
});

const crawlMock = vi.fn();
vi.mock("@/src/lib/crawl/site-crawler", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/crawl/site-crawler")>();
  return { ...actual, crawlSite: (...args: unknown[]) => crawlMock(...args) };
});

const generateMock = vi.fn();
vi.mock("@/src/lib/ai/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/ai/client")>();
  return { ...actual, generateWithClaude: (...args: unknown[]) => generateMock(...args) };
});

import { POST } from "@/src/app/api/projects/[id]/titles/route";
import { emptyCrawl, type CrawlResult } from "@/src/lib/crawl/site-crawler";

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

function ctx() {
  // ownerQuota fails open when the profile cannot be read, so a database
  // that answers nothing is enough here.
  const supabase = { from: () => { throw new Error("no database in this test"); } };
  return {
    supabase,
    userId: randomUUID(),
    project: { id: PROJECT_ID, name: "Lekki Plumbers", website_url: "https://www.lekki.ng", business_type: "local", services: ["plumbing"] },
  };
}

const params = { params: Promise.resolve({ id: PROJECT_ID }) };
const post = () => POST(new Request(`http://localhost/api/projects/${PROJECT_ID}/titles`, { method: "POST" }) as never, params);

beforeEach(() => {
  vi.clearAllMocks();
  ownerMock.mockResolvedValue(ctx());
});

describe("POST", () => {
  it("answers 502 site_unreachable when bot protection blocked every request, without a model call", async () => {
    const blocked: CrawlResult = { ...emptyCrawl(), blocked: true, failedStatus: 403, errors: ["https://www.lekki.ng/: 403 blocked by bot protection"] };
    crawlMock.mockResolvedValueOnce(blocked);
    const res = await post();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe("site_unreachable");
    expect(body.error).toBe("We couldn't read lekki.ng (status 403). It looks like your site's bot protection blocked us. Allow the user agent ConduiktBot and try again.");
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("answers 502 when the site timed out", async () => {
    crawlMock.mockResolvedValueOnce({ ...emptyCrawl(), failedError: "timed out" });
    const res = await post();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe("site_unreachable");
    expect(body.error).toContain("(timed out)");
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("keeps the 400 for a site that answered but had no readable page", async () => {
    crawlMock.mockResolvedValueOnce({ ...emptyCrawl(), fetchedAny: true });
    const res = await post();
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("no_pages");
    expect(generateMock).not.toHaveBeenCalled();
  });
});
