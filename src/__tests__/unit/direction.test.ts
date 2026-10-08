import { describe, it, expect } from "vitest";
import { withDirection, DIRECTION_MAX_CHARS } from "@/src/lib/ai/direction";
import { agents } from "@/src/lib/ai/agents";
import { buildProjectContext } from "@/src/lib/ai/prompt-builder";

const project = {
  name: "Block",
  website_url: "https://getblok.ai",
  description: null,
  target_audience: null,
  value_proposition: null,
  brand_voice: null,
  competitors: null,
  keywords: null,
  positioning_statement: "Position Block as the financial assistant on WhatsApp for 18–35s.",
};

describe("project direction", () => {
  it("leaves the prompt alone when there is no direction", () => {
    expect(withDirection("SYSTEM", {})).toBe("SYSTEM");
    expect(withDirection("SYSTEM", { direction: "   " })).toBe("SYSTEM");
  });

  it("appends the direction as the brief, capped in length", () => {
    const out = withDirection("SYSTEM", { direction: "x".repeat(DIRECTION_MAX_CHARS + 500) });
    expect(out.startsWith("SYSTEM")).toBe(true);
    expect(out).toContain("<direction>");
    expect(out.match(/x+/)![0].length).toBe(DIRECTION_MAX_CHARS);
  });

  it("buildProjectContext reads it from positioning_statement", () => {
    expect(buildProjectContext(project).direction).toBe(project.positioning_statement);
    expect(buildProjectContext({ ...project, positioning_statement: null }).direction).toBeUndefined();
  });

  it("every registered agent's system prompt carries it", () => {
    const context = buildProjectContext(project);
    for (const [id, agent] of Object.entries(agents)) {
      expect(agent.buildSystemPrompt(context), id).toContain("financial assistant on WhatsApp");
    }
  });
});
