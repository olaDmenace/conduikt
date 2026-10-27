import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/src/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("tests must pass a db");
  },
}));

import {
  buildMoneyQuestions,
  detectMention,
  citationPosition,
  competitorDomains,
  domainOf,
  detect,
  checkVisibility,
  availableEngines,
  NullEngine,
  PerplexityEngine,
  visibilitySummaryForPrompt,
  type AnswerEngine,
} from "./ai-visibility";

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

describe("buildMoneyQuestions", () => {
  it("builds local questions with service and location", () => {
    const qs = buildMoneyQuestions({
      name: "Bright Smiles Dental",
      business_type: "local",
      services: ["teeth whitening", "braces"],
      business_location: "Lekki, Lagos",
      target_audience: "young professionals",
      description: "Dental clinic",
    });
    expect(qs.length).toBeGreaterThanOrEqual(5);
    expect(qs.length).toBeLessThanOrEqual(10);
    expect(qs).toContain("Who should I call for teeth whitening in Lekki, Lagos?");
    expect(qs).toContain("Best teeth whitening near Lekki, Lagos");
    expect(qs).toContain("Who should I call for braces in Lekki, Lagos?");
    expect(qs).toContain("Bright Smiles Dental alternatives");
    expect(qs).toContain("teeth whitening for young professionals");
    // No duplicates, case-insensitive.
    expect(new Set(qs.map((q) => q.toLowerCase())).size).toBe(qs.length);
  });

  it("builds category and alternatives questions for a product business", () => {
    const qs = buildMoneyQuestions({
      name: "Conduikt",
      business_type: "saas",
      services: ["marketing automation"],
      business_location: null,
      target_audience: "small business owners in Nigeria",
      value_proposition: "get found, publish and improve every week without a marketer",
    });
    expect(qs).toContain("Best marketing automation for small business owners in Nigeria");
    expect(qs).toContain("Conduikt alternatives");
    expect(qs).toContain("What is the best marketing automation?");
    expect(qs.some((q) => q.startsWith("How do I get found"))).toBe(true);
    expect(qs.every((q) => !q.includes(" near "))).toBe(true);
    expect(qs.length).toBeGreaterThanOrEqual(5);
  });

  it("pads to five questions when the project says little, and returns none with nothing", () => {
    const qs = buildMoneyQuestions({ name: "Acme", description: "plumbing services" });
    expect(qs.length).toBeGreaterThanOrEqual(5);
    expect(buildMoneyQuestions({ name: null })).toEqual([]);
  });

  it("respects the cap", () => {
    const qs = buildMoneyQuestions(
      { name: "X", business_type: "local", services: ["a", "b", "c", "d"], business_location: "Abuja" },
      6
    );
    expect(qs).toHaveLength(6);
  });
});

describe("detection", () => {
  const ours = { name: "Bright Smiles Dental", domain: "brightsmiles.ng" };

  it("domainOf normalises urls and bare hosts", () => {
    expect(domainOf("https://www.BrightSmiles.ng/book")).toBe("brightsmiles.ng");
    expect(domainOf("brightsmiles.ng")).toBe("brightsmiles.ng");
    expect(domainOf("not a url")).toBeNull();
    expect(domainOf(null)).toBeNull();
  });

  it("detectMention matches the name as a whole phrase or the domain", () => {
    expect(detectMention("I'd recommend Bright Smiles Dental in Lekki.", ours)).toBe(true);
    expect(detectMention("Try bright smiles dental.", ours)).toBe(true);
    expect(detectMention("See brightsmiles.ng for prices.", ours)).toBe(true);
    expect(detectMention("Bright Smiles Dentalworks is different.", ours)).toBe(false);
    expect(detectMention("Lekki has many dentists.", ours)).toBe(false);
  });

  it("citationPosition finds our domain (and subdomains) by 1-based index", () => {
    expect(citationPosition(["https://a.com", "https://www.brightsmiles.ng/x"], "brightsmiles.ng")).toBe(2);
    expect(citationPosition(["https://book.brightsmiles.ng/"], "brightsmiles.ng")).toBe(1);
    expect(citationPosition(["https://a.com"], "brightsmiles.ng")).toBeNull();
    expect(citationPosition(["https://brightsmiles.ng"], null)).toBeNull();
  });

  it("competitorDomains drops ours and the big platforms", () => {
    expect(
      competitorDomains(
        [
          "https://www.instagram.com/x",
          "https://lekkidental.com/a",
          "https://lekkidental.com/b",
          "https://brightsmiles.ng",
          "https://smileplus.ng",
        ],
        "brightsmiles.ng"
      )
    ).toEqual(["lekkidental.com", "smileplus.ng"]);
  });

  it("detect combines everything with an excerpt around the mention", () => {
    const d = detect(
      {
        text: "There are a few options. Bright Smiles Dental on Admiralty Way is well reviewed. Lekki Dental is another.",
        citations: ["https://lekkidental.com", "https://brightsmiles.ng/reviews"],
      },
      ours
    );
    expect(d).toMatchObject({ mentioned: true, cited: true, position: 2, competitors: ["lekkidental.com"] });
    expect(d.excerpt).toContain("Bright Smiles Dental");
  });
});

describe("engines", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("availableEngines is empty without keys, NullEngine answers nothing", async () => {
    expect(availableEngines({} as NodeJS.ProcessEnv)).toEqual([]);
    expect(availableEngines({ PERPLEXITY_API_KEY: "k" } as unknown as NodeJS.ProcessEnv).map((e) => e.name)).toEqual(["perplexity"]);
    const n = new NullEngine();
    expect(n.available).toBe(false);
    expect(await n.ask()).toEqual({ text: "", citations: [] });
  });

  it("PerplexityEngine posts to chat/completions with model sonar and reads citations", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        choices: [{ message: { content: "Try Bright Smiles." } }],
        citations: ["https://brightsmiles.ng"],
        search_results: [{ url: "https://brightsmiles.ng" }, { url: "https://other.com" }],
      })
    );
    const e = new PerplexityEngine("pk-test");
    const a = await e.ask("best dentist in Lekki");
    expect(a.text).toBe("Try Bright Smiles.");
    expect(a.citations).toEqual(["https://brightsmiles.ng", "https://other.com"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.perplexity.ai/chat/completions");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer pk-test" });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("sonar");
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "best dentist in Lekki" });
  });
});

describe("checkVisibility", () => {
  function fakeEngine(name: "perplexity" | "claude", answer: (q: string) => { text: string; citations: string[] }): AnswerEngine & { asked: string[] } {
    const asked: string[] = [];
    return {
      name,
      available: true,
      asked,
      async ask(q: string) {
        asked.push(q);
        return answer(q);
      },
    };
  }

  function fakeDb(project: unknown, alreadyAskedToday = 0) {
    const inserts: Array<Record<string, unknown>> = [];
    const db = {
      inserts,
      from: (table: string) => {
        if (table === "projects") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: project }) }) }) };
        }
        if (table === "ai_visibility_checks") {
          return {
            select: () => ({ eq: () => ({ gte: async () => ({ count: alreadyAskedToday }) }) }),
            insert: async (row: Record<string, unknown>) => {
              inserts.push(row);
              return { error: null };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };
    return db;
  }

  const project = {
    id: "proj1",
    name: "Bright Smiles Dental",
    website_url: "https://www.brightsmiles.ng",
    business_type: "local",
    services: ["teeth whitening"],
    business_location: "Lekki",
  };

  it("returns a plain reason and writes nothing when no engine is configured", async () => {
    const db = fakeDb(project);
    const r = await checkVisibility("proj1", { db: db as never, engines: [new NullEngine()] });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/PERPLEXITY_API_KEY/);
    expect(db.inserts).toHaveLength(0);
  });

  it("asks each engine, records mention/cite and competitors, and respects the daily cap", async () => {
    const engine = fakeEngine("perplexity", (q) =>
      q.startsWith("Who should I call")
        ? { text: "Bright Smiles Dental is a solid pick.", citations: ["https://lekkidental.com", "https://brightsmiles.ng/w"] }
        : { text: "Lekki Dental is popular.", citations: ["https://lekkidental.com"] }
    );
    const db = fakeDb(project, 7); // 3 questions left today
    const r = await checkVisibility("proj1", { db: db as never, engines: [engine], now: new Date("2026-10-26T03:00:00Z") });

    expect(r.ok).toBe(true);
    expect(r.asked).toBe(3);
    expect(engine.asked).toHaveLength(3);
    expect(db.inserts).toHaveLength(3);

    const won = db.inserts.find((i) => i.mentioned === true)!;
    expect(won).toMatchObject({
      project_id: "proj1",
      engine: "perplexity",
      mentioned: true,
      cited: true,
      position: 2,
      competitors_mentioned: ["lekkidental.com"],
      asked_at: "2026-10-26T03:00:00.000Z",
    });
    const lost = db.inserts.find((i) => i.mentioned === false)!;
    expect(lost).toMatchObject({ cited: false, position: null, competitors_mentioned: ["lekkidental.com"] });
  });

  it("stops at the cap when it was already reached", async () => {
    const engine = fakeEngine("perplexity", () => ({ text: "", citations: [] }));
    const db = fakeDb(project, 10);
    const r = await checkVisibility("proj1", { db: db as never, engines: [engine] });
    expect(r).toMatchObject({ ok: true, asked: 0, reason: "Daily question limit reached" });
    expect(engine.asked).toHaveLength(0);
  });

  it("keeps going when one engine throws", async () => {
    const bad: AnswerEngine = { name: "claude", available: true, ask: async () => { throw new Error("quota"); } };
    const good = fakeEngine("perplexity", () => ({ text: "x", citations: [] }));
    const db = fakeDb(project);
    const r = await checkVisibility("proj1", { db: db as never, engines: [bad, good], cap: 4 });
    expect(r.ok).toBe(true);
    expect(r.asked).toBe(2); // budget 4 = 2 questions x 2 engines, only the good one records
    expect(db.inserts).toHaveLength(2);
  });
});

describe("visibilitySummaryForPrompt", () => {
  it("lists lost questions with who answered them", async () => {
    const rows = [
      { question: "Best teeth whitening near Lekki", engine: "perplexity", asked_at: "2026-10-26T03:00:00Z", mentioned: false, cited: false, competitors_mentioned: ["lekkidental.com"], answer_excerpt: null },
      { question: "Bright Smiles Dental alternatives", engine: "perplexity", asked_at: "2026-10-26T03:00:00Z", mentioned: true, cited: true, competitors_mentioned: ["smileplus.ng"], answer_excerpt: null },
      // Older duplicate of the first question: ignored in favour of the latest.
      { question: "Best teeth whitening near Lekki", engine: "perplexity", asked_at: "2026-10-25T03:00:00Z", mentioned: true, cited: false, competitors_mentioned: [], answer_excerpt: null },
    ];
    const db = {
      from: () => ({
        select: () => ({ eq: () => ({ gte: () => ({ order: () => ({ limit: async () => ({ data: rows }) }) }) }) }),
      }),
    };
    const text = await visibilitySummaryForPrompt(db as never, "proj1");
    expect(text).toContain("### Found by AI answers");
    expect(text).toContain("1 of 2 questions name the business; 1 cite its website.");
    expect(text).toContain('"Best teeth whitening near Lekki" (perplexity) answered with lekkidental.com');
    expect(text).toContain("Questions already won");
    expect(text).toContain("lekkidental.com (1)");
  });
});
