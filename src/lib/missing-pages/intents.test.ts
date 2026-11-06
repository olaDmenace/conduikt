// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildIntentQueries, buildIntentQueriesForProject, LOCAL_SEEDS, MAX_QUERIES, SAAS_SEEDS } from "./intents";
import type { ProjectFacts } from "./types";

const local: ProjectFacts = {
  id: "p",
  name: "Lekki Plumbers",
  websiteUrl: "https://lekkiplumbers.ng",
  businessType: "local",
  services: ["emergency plumbing", "drain cleaning"],
  location: "Lekki, Lagos",
  description: null,
  valueProposition: null,
  audience: ["homeowners"],
  competitors: [],
  category: "plumber",
};

const saas: ProjectFacts = {
  id: "p",
  name: "Conduikt",
  websiteUrl: "https://conduikt.com",
  businessType: "saas",
  services: [],
  location: null,
  description: null,
  valueProposition: "Conduikt helps you run marketing without a team",
  audience: ["SaaS founders", "small bakeries"],
  competitors: ["Jasper", "HubSpot"],
  category: "marketing automation",
};

describe("buildIntentQueries", () => {
  it("expands local seeds across services and location", () => {
    const q = buildIntentQueries(local, LOCAL_SEEDS);
    expect(q).toContain("emergency plumbing near me");
    expect(q).toContain("drain cleaning near me");
    expect(q).toContain("best emergency plumbing in lekki lagos");
    expect(q).toContain("drain cleaning lekki lagos");
    expect(q).toContain("free estimate drain cleaning");
    expect(new Set(q).size).toBe(q.length);
    expect(q.length).toBeLessThanOrEqual(MAX_QUERIES);
  });

  it("expands saas seeds across product, competitors, category, audience and jobs", () => {
    const q = buildIntentQueries(saas, SAAS_SEEDS);
    expect(q).toContain("conduikt pricing");
    expect(q).toContain("conduikt alternative");
    expect(q).toContain("conduikt vs jasper");
    expect(q).toContain("conduikt vs hubspot");
    expect(q).toContain("marketing automation for saas founders");
    expect(q).toContain("marketing automation for small bakeries");
    expect(q).toContain("marketing automation template");
    expect(q.some((x) => x.startsWith("how to run marketing"))).toBe(true);
  });

  it("drops seeds whose slots have no values", () => {
    const q = buildIntentQueries({ ...local, location: null }, LOCAL_SEEDS);
    expect(q.some((x) => x.includes("{location}"))).toBe(false);
    expect(q.some((x) => x.includes("lekki"))).toBe(false);
    expect(q).toContain("emergency plumbing near me");
  });

  it("caps at 60 and spreads the cap across seeds", () => {
    const many = { ...local, services: Array.from({ length: 30 }, (_, i) => `service ${i}`) };
    const q = buildIntentQueries(many, LOCAL_SEEDS);
    expect(q.length).toBe(MAX_QUERIES);
    expect(q.some((x) => x.endsWith("near me"))).toBe(true);
    expect(q.some((x) => x.endsWith("reviews"))).toBe(true);
  });

  it("falls back to built-in seeds when the playbook module is missing", async () => {
    const q = await buildIntentQueriesForProject(local);
    expect(q).toContain("emergency plumbing near me");
  });
});
