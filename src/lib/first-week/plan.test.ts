import { describe, it, expect } from "vitest";
import { FIRST_WEEK_AGENT_IDS, firstWeekAgents, splitByPlan } from "@/src/lib/first-week/plan";
import { BUSINESS_TYPES, PLAYBOOKS } from "@/src/lib/playbooks";

describe("first-week pack by playbook", () => {
  it("with no business type it is the whole pack in registry order (old behaviour)", () => {
    expect(firstWeekAgents().map((a) => a.id)).toEqual([...FIRST_WEEK_AGENT_IDS]);
    expect(firstWeekAgents(null).map((a) => a.id)).toEqual([...FIRST_WEEK_AGENT_IDS]);
    expect(firstWeekAgents(undefined).map((a) => a.id)).toEqual([...FIRST_WEEK_AGENT_IDS]);
  });

  it("an unknown business type falls back to the whole pack", () => {
    expect(firstWeekAgents("bakery").map((a) => a.id)).toEqual([...FIRST_WEEK_AGENT_IDS]);
  });

  it("runs each playbook's agents in the playbook's order", () => {
    for (const t of BUSINESS_TYPES) {
      expect(firstWeekAgents(t).map((a) => a.id), t).toEqual(PLAYBOOKS[t].firstWeekAgentIds);
    }
  });

  it("local starts with Landing Pages and leaves out Split Test and Video Ad", () => {
    const ids = firstWeekAgents("local").map((a) => a.id);
    expect(ids[0]).toBe("programmatic-seo");
    expect(ids).not.toContain("ab-test-setup");
    expect(ids).not.toContain("video-ad");
  });

  it("every agent in every playbook resolves to a name, a job and a tier", () => {
    for (const t of BUSINESS_TYPES) {
      for (const a of firstWeekAgents(t)) {
        expect(a.name.length, `${t}: ${a.id}`).toBeGreaterThan(0);
        expect(a.job.length, `${t}: ${a.id}`).toBeGreaterThan(0);
        expect(["free", "pro", "growth", "agency"]).toContain(a.tier);
      }
    }
  });
});

describe("splitByPlan by playbook", () => {
  it("without a business type it matches the old split", () => {
    const { run, locked } = splitByPlan("free");
    expect(run.map((a) => a.id).sort()).toEqual(["keyword-research", "seo-audit", "social-content"]);
    expect(run.length + locked.length).toBe(FIRST_WEEK_AGENT_IDS.length);
  });

  it("splits only the playbook's agents, in the playbook's order", () => {
    const { run, locked } = splitByPlan("free", "local");
    const ids = [...run, ...locked].map((a) => a.id);
    expect(run.length + locked.length).toBe(PLAYBOOKS.local.firstWeekAgentIds.length);
    for (const id of ids) expect(PLAYBOOKS.local.firstWeekAgentIds).toContain(id);
    // Order within each half follows the playbook.
    const order = PLAYBOOKS.local.firstWeekAgentIds;
    const runOrder = run.map((a) => order.indexOf(a.id));
    expect(runOrder).toEqual([...runOrder].sort((a, b) => a - b));
  });

  it("locks nothing for growth and agency on every playbook", () => {
    for (const t of BUSINESS_TYPES) {
      expect(splitByPlan("growth", t).locked, t).toHaveLength(0);
      expect(splitByPlan("agency", t).locked, t).toHaveLength(0);
    }
  });

  it("a free local project still gets the three free agents", () => {
    const { run } = splitByPlan("free", "local");
    expect(run.map((a) => a.id).sort()).toEqual(["keyword-research", "seo-audit", "social-content"]);
  });
});
