import { describe, it, expect } from "vitest";
import {
  FIRST_WEEK_AGENT_IDS,
  firstWeekAgents,
  firstWeekInput,
  normalizePreviews,
  splitByPlan,
  type SiteBrief,
} from "@/src/lib/first-week/plan";
import { getAgent } from "@/src/lib/ai/agents";
import { isPrivateAddress, assertPublicUrl, BlockedUrlError } from "@/src/lib/security/safe-fetch";

const brief: SiteBrief = {
  url: "https://example.com/",
  hostname: "example.com",
  title: "Example Bakery",
  h1: "Fresh bread daily",
  metaDescription: "A neighbourhood bakery.",
  valueProposition: "Fresh sourdough delivered before breakfast.",
  audience: "busy families in Lagos",
  tone: "warm, plain",
  seoScore: 72,
  html: "<html><title>Example Bakery</title></html>",
};

describe("first-week plan split", () => {
  it("every pack agent exists in the registry and has a runnable implementation", () => {
    const agents = firstWeekAgents();
    expect(agents).toHaveLength(FIRST_WEEK_AGENT_IDS.length);
    for (const a of agents) expect(getAgent(a.id), a.id).toBeDefined();
  });

  it("runs the free agents on free and locks the rest", () => {
    const { run, locked } = splitByPlan("free");
    expect(run.map((a) => a.id).sort()).toEqual(["keyword-research", "seo-audit", "social-content"]);
    expect(run.length + locked.length).toBe(FIRST_WEEK_AGENT_IDS.length);
  });

  it("pro runs everything up to pro; growth and agency run the whole pack", () => {
    const pro = splitByPlan("pro");
    expect(pro.locked.every((a) => a.tier === "growth" || a.tier === "agency")).toBe(true);
    expect(pro.run.some((a) => a.id === "blog-post")).toBe(true);
    expect(splitByPlan("growth").locked).toHaveLength(0);
    expect(splitByPlan("agency").locked).toHaveLength(0);
  });

  it("leaves Campaign and the two tools out of the pack", () => {
    const ids: readonly string[] = FIRST_WEEK_AGENT_IDS;
    for (const id of ["campaigns", "calendar", "client-reports"]) expect(ids).not.toContain(id);
  });
});

describe("first-week inputs", () => {
  it("builds a prompt for every agent without throwing", () => {
    for (const id of FIRST_WEEK_AGENT_IDS) {
      const input = firstWeekInput(id, brief, new Date("2026-10-08T09:00:00Z"));
      const agent = getAgent(id)!;
      const prompt = agent.buildUserPrompt(input);
      expect(prompt.length, id).toBeGreaterThan(20);
      expect(prompt, id).not.toContain("undefined");
    }
  });

  it("passes the page itself to the agents that read markup", () => {
    expect(firstWeekInput("seo-audit", brief).html).toBe(brief.html);
    expect(firstWeekInput("page-cro", brief).url).toBe(brief.url);
  });

  it("falls back sensibly when the audit learned nothing", () => {
    const empty = { ...brief, valueProposition: "", audience: "", title: null, h1: null, metaDescription: null };
    expect(firstWeekInput("social-content", empty).topic).toBe("example.com");
    expect(firstWeekInput("keyword-research", empty).seedKeyword).toBe("example.com");
  });
});

describe("normalizePreviews", () => {
  it("keeps known agents once, in registry order, with capped lists", () => {
    const out = normalizePreviews({
      previews: [
        { agentId: "blog-post", headline: "A guide for families", items: ["a", "b", "c", "d", "e"] },
        { agentId: "made-up", headline: "x", items: [] },
        { agentId: "seo-audit", headline: "Title tag is missing", items: ["Add one"] },
        { agentId: "seo-audit", headline: "dupe", items: [] },
        { agentId: "copywriting", headline: "", items: ["no headline"] },
        "junk",
      ],
    });
    expect(out.map((p) => p.agentId)).toEqual(["seo-audit", "blog-post"]);
    expect(out[1].items).toHaveLength(4);
    expect(out[0].headline).toBe("Title tag is missing");
  });

  it("accepts a bare array and survives garbage", () => {
    expect(normalizePreviews([{ agentId: "page-cro", headline: "h", items: [1, "ok"] }])[0].items).toEqual(["ok"]);
    expect(normalizePreviews(null)).toEqual([]);
    expect(normalizePreviews("nope")).toEqual([]);
  });
});

describe("safe-fetch guard", () => {
  it("flags private, loopback, link-local and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("lets public addresses through", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  it("rejects non-web schemes, odd ports, credentials and local names before any lookup", async () => {
    for (const u of ["file:///etc/passwd", "ftp://example.com", "http://example.com:8080/", "http://user:pw@example.com/", "http://localhost/", "http://db.internal/", "http://127.0.0.1/", "http://[::1]/"]) {
      await expect(assertPublicUrl(u), u).rejects.toBeInstanceOf(BlockedUrlError);
    }
  });
});
