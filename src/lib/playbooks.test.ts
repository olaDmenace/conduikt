import { describe, it, expect } from "vitest";
import { BUSINESS_TYPES, PLAYBOOKS, playbookFor, resolveChannels, isBusinessType } from "@/src/lib/playbooks";
import { FIRST_WEEK_AGENT_IDS } from "@/src/lib/first-week/plan";

describe("playbooks", () => {
  it("has one playbook per business type, each with a label and a blurb", () => {
    for (const t of BUSINESS_TYPES) {
      const p = PLAYBOOKS[t];
      expect(p.id).toBe(t);
      expect(p.label.length).toBeGreaterThan(3);
      expect(p.blurb.length).toBeGreaterThan(10);
      expect(p.pricingNote.length).toBeGreaterThan(3);
    }
  });

  it("every playbook runs at least three first-week agents that exist in the pack, with no repeats", () => {
    const known = new Set<string>(FIRST_WEEK_AGENT_IDS);
    for (const t of BUSINESS_TYPES) {
      const ids = PLAYBOOKS[t].firstWeekAgentIds;
      expect(ids.length, t).toBeGreaterThanOrEqual(3);
      expect(new Set(ids).size, t).toBe(ids.length);
      for (const id of ids) expect(known.has(id), `${t}: ${id}`).toBe(true);
    }
  });

  it("the SaaS playbook is today's pack in today's order", () => {
    expect(PLAYBOOKS.saas.firstWeekAgentIds).toEqual([...FIRST_WEEK_AGENT_IDS]);
  });

  it("local drops the split test and video ad and starts with landing pages", () => {
    const ids = PLAYBOOKS.local.firstWeekAgentIds;
    expect(ids[0]).toBe("programmatic-seo");
    expect(ids).not.toContain("ab-test-setup");
    expect(ids).not.toContain("video-ad");
  });

  it("creator leads with social, posting plan, email and blog", () => {
    expect(PLAYBOOKS.creator.firstWeekAgentIds.slice(0, 4)).toEqual([
      "social-content",
      "posting-plan",
      "email-sequence",
      "blog-post",
    ]);
  });

  it("every playbook has channels, intent seeds and questions", () => {
    for (const t of BUSINESS_TYPES) {
      const p = PLAYBOOKS[t];
      expect(p.defaultChannels.length, t).toBeGreaterThan(0);
      expect(p.intentSeeds.length, t).toBeGreaterThanOrEqual(3);
      expect(p.questions.length, t).toBeGreaterThanOrEqual(3);
      for (const q of p.questions) expect(q.options.length, `${t}: ${q.id}`).toBeGreaterThanOrEqual(2);
      expect(p.questions.map((q) => q.id), t).not.toContain("project_type");
    }
    expect(PLAYBOOKS.local.defaultChannels).toEqual(["gbp", "whatsapp", "instagram", "hosted_pages"]);
    expect(PLAYBOOKS.saas.defaultChannels).toEqual(["x", "linkedin", "blog", "email"]);
  });

  it("local asks about Google Business Profile, WhatsApp, Instagram and Facebook instead of X and LinkedIn", () => {
    const q = PLAYBOOKS.local.questions.find((q) => q.id === "active_channels")!;
    expect(q.multi).toBe(true);
    expect(q.options).toEqual(["Google Business Profile", "WhatsApp", "Instagram", "Facebook", "None yet"]);
  });

  it("question ids are unique within a playbook", () => {
    for (const t of BUSINESS_TYPES) {
      const ids = PLAYBOOKS[t].questions.map((q) => q.id);
      expect(new Set(ids).size, t).toBe(ids.length);
    }
  });
});

describe("playbookFor", () => {
  it("defaults to SaaS for null, undefined and unknown values", () => {
    expect(playbookFor(null).id).toBe("saas");
    expect(playbookFor(undefined).id).toBe("saas");
    expect(playbookFor("bakery").id).toBe("saas");
    expect(playbookFor("").id).toBe("saas");
  });

  it("returns the matching playbook for a known type", () => {
    for (const t of BUSINESS_TYPES) expect(playbookFor(t).id).toBe(t);
  });

  it("isBusinessType guards strings only", () => {
    expect(isBusinessType("local")).toBe(true);
    expect(isBusinessType("LOCAL")).toBe(false);
    expect(isBusinessType(1)).toBe(false);
    expect(isBusinessType(null)).toBe(false);
  });
});

describe("resolveChannels", () => {
  it("returns the defaults when there are no answers", () => {
    expect(resolveChannels(PLAYBOOKS.local, null)).toEqual(PLAYBOOKS.local.defaultChannels);
    expect(resolveChannels(PLAYBOOKS.saas, {})).toEqual(PLAYBOOKS.saas.defaultChannels);
  });

  it("adds channels the owner already posts on, after the defaults, without repeats", () => {
    const out = resolveChannels(PLAYBOOKS.saas, { active_channels: ["LinkedIn", "Instagram", "None yet"] });
    expect(out).toEqual(["x", "linkedin", "blog", "email", "instagram"]);
  });

  it("accepts a single string answer and ignores labels it does not know", () => {
    expect(resolveChannels(PLAYBOOKS.creator, { active_channels: "TikTok" })).toEqual([
      "instagram",
      "x",
      "email",
      "blog",
      "tiktok",
    ]);
    expect(resolveChannels(PLAYBOOKS.creator, { active_channels: ["Carrier pigeon"] })).toEqual(
      PLAYBOOKS.creator.defaultChannels
    );
  });
});
