// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyTitlesToWordPress, clampAtWord, parseTitlesResponse, rowChanges, slugFromUrl, titlesSystemPrompt, titlesUserPrompt, urlKey } from "./titles";
import type { CrawledPage } from "@/src/lib/crawl/site-crawler";
import type { ProjectFacts } from "@/src/lib/missing-pages/types";

const facts: ProjectFacts = {
  id: "p1",
  name: "Lekki Plumbers",
  websiteUrl: "https://lekki.ng",
  businessType: "local",
  services: ["emergency plumbing", "drain cleaning"],
  location: "Lekki, Lagos",
  description: null,
  valueProposition: null,
  audience: [],
  competitors: [],
  category: null,
};

const pages: CrawledPage[] = [
  { url: "https://lekki.ng/", title: "Home", h1: "Welcome", metaDescription: null, textExcerpt: "We fix pipes in Lekki.", headings: ["Welcome"] },
  { url: "https://lekki.ng/drain-cleaning", title: "Drain cleaning", h1: "Drain cleaning", metaDescription: null, textExcerpt: "Blocked drains cleared.", headings: ["Drain cleaning"] },
  { url: "https://lekki.ng/about", title: "About us", h1: "About", metaDescription: null, textExcerpt: "Founded in 2015.", headings: ["About"] },
];

describe("prompts", () => {
  it("name the business, the place and the rules", () => {
    const sys = titlesSystemPrompt(facts);
    expect(sys).toContain("Lekki Plumbers");
    expect(sys).toContain("in Lekki, Lagos");
    expect(sys).toContain("at most 60 characters");
    expect(sys).toContain("no slogans");
    const user = titlesUserPrompt(pages);
    expect(user).toContain("url: https://lekki.ng/drain-cleaning");
    expect(user).toContain("title: Drain cleaning");
  });
});

describe("parseTitlesResponse", () => {
  it("returns one row per crawled page, clamped to the limits, matching urls loosely", () => {
    const raw = JSON.stringify({
      pages: [
        { url: "https://lekki.ng", title: "Emergency plumber in Lekki, same day | Lekki Plumbers", h1: "Emergency plumbing in Lekki, fixed the same day", reason: "Says what you do and where." },
        { url: "https://LEKKI.ng/drain-cleaning/", title: "Drain cleaning in Lekki from NGN 15,000 | Lekki Plumbers and more words that run on and on past the limit", h1: "Blocked drain cleared today in Lekki", reason: "Adds the place and the price." },
      ],
    });
    const rows = parseTitlesResponse(raw, pages);
    expect(rows).toHaveLength(3);
    expect(rows[0].proposedTitle).toBe("Emergency plumber in Lekki, same day | Lekki Plumbers");
    expect(rows[0].proposedH1).toBe("Emergency plumbing in Lekki, fixed the same day");
    expect(rows[0].accepted).toBe(false);
    expect(rows[1].proposedTitle.length).toBeLessThanOrEqual(60);
    expect(rows[1].proposedTitle).toBe("Drain cleaning in Lekki from NGN 15,000 | Lekki Plumbers");
    // The page the model skipped keeps its own title.
    expect(rows[2].proposedTitle).toBe("About us");
    expect(rows[2].reason).toBe("No change suggested.");
    expect(rowChanges(rows[2])).toBe(false);
    expect(rowChanges(rows[0])).toBe(true);
  });

  it("keeps the current title when the suggestion is a slogan, and reads fenced JSON", () => {
    const raw = "```json\n" + JSON.stringify({ pages: [{ url: "https://lekki.ng/about", title: "Welcome to the #1 plumbers!", h1: "About Lekki Plumbers" }] }) + "\n```";
    const rows = parseTitlesResponse(raw, pages);
    const about = rows.find((r) => r.url.endsWith("/about"))!;
    expect(about.proposedTitle).toBe("About us");
    expect(about.reason).toMatch(/slogan/);
    expect(about.proposedH1).toBe("About Lekki Plumbers");
  });

  it("throws on junk", () => {
    expect(() => parseTitlesResponse("not json", pages)).toThrow();
  });
});

describe("helpers", () => {
  it("clampAtWord, urlKey and slugFromUrl", () => {
    expect(clampAtWord("One two three four five", 12)).toBe("One two");
    expect(clampAtWord("Short!", 60)).toBe("Short");
    expect(urlKey("https://Lekki.ng/about/")).toBe("lekki.ng/about");
    expect(urlKey("http://lekki.ng")).toBe("lekki.ng/");
    expect(slugFromUrl("https://lekki.ng/services/drain-cleaning/")).toBe("drain-cleaning");
    expect(slugFromUrl("https://lekki.ng/")).toBe("");
  });
});

describe("applyTitlesToWordPress", () => {
  const conn = { baseUrl: "https://blog.example.com", username: "olu", appPassword: "secret" };

  it("finds the page by slug and sends the title alone, never the body", async () => {
    const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
    const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
      calls.push({ url, method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (init?.method === "GET") {
        // Rendered content only, no content.raw: a limited role or a page builder. The body must not be touched.
        if (url.includes("slug=about")) return new Response(JSON.stringify([{ id: 7, status: "publish", content: { rendered: "<p>Founded in 2015.</p>" } }]), { status: 200 });
        return new Response("[]", { status: 200 });
      }
      return new Response(JSON.stringify({ id: 7, link: "https://blog.example.com/about/" }), { status: 200 });
    };
    const out = await applyTitlesToWordPress(
      conn,
      [
        { url: "https://blog.example.com/about/", title: "About Lekki Plumbers" },
        { url: "https://blog.example.com/missing", title: "Nope" },
        { url: "https://blog.example.com/", title: "Home title" },
      ],
      fetchImpl
    );
    expect(out.applied).toEqual([{ url: "https://blog.example.com/about/", title: "About Lekki Plumbers", link: "https://blog.example.com/about/" }]);
    expect(out.failed.map((f) => f.url)).toEqual(["https://blog.example.com/missing", "https://blog.example.com/"]);
    expect(out.failed[1].error).toMatch(/Site Title/);
    const writes = calls.filter((c) => c.method === "POST");
    expect(writes).toHaveLength(1);
    expect(writes[0].url).toBe("https://blog.example.com/wp-json/wp/v2/pages/7");
    expect(writes[0].body).toEqual({ title: "About Lekki Plumbers" });
  });

  it("reports WordPress's own message when the write is refused", async () => {
    const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
      if (init?.method === "GET") return new Response(JSON.stringify([{ id: 9, status: "publish" }]), { status: 200 });
      return new Response(JSON.stringify({ code: "rest_cannot_edit", message: "Sorry, you are not allowed to edit this post." }), { status: 403 });
    };
    const out = await applyTitlesToWordPress(conn, [{ url: "https://blog.example.com/pricing/", title: "Pricing" }], fetchImpl);
    expect(out.applied).toEqual([]);
    expect(out.failed).toEqual([{ url: "https://blog.example.com/pricing/", error: "WordPress: Sorry, you are not allowed to edit this post." }]);
  });
});
