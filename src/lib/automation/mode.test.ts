import { describe, it, expect, vi } from "vitest";
import {
  AUTOMATION_MODES,
  DEFAULT_AUTOMATION_MODE,
  getProjectMode,
  isAutomationMode,
  normalizeMode,
  shouldPublishWithoutApproval,
} from "@/src/lib/automation/mode";

describe("automation modes", () => {
  it("offers the three modes from the design doc, in order, with plain copy", () => {
    expect(AUTOMATION_MODES.map((m) => m.id)).toEqual(["check_all", "social_runs", "hands_off"]);
    expect(AUTOMATION_MODES.map((m) => m.label)).toEqual(["Check all", "Let social run", "Hands off"]);
    for (const m of AUTOMATION_MODES) expect(m.blurb.length).toBeGreaterThan(10);
  });

  it("defaults to check_all and normalises junk to it", () => {
    expect(DEFAULT_AUTOMATION_MODE).toBe("check_all");
    expect(normalizeMode(undefined)).toBe("check_all");
    expect(normalizeMode(null)).toBe("check_all");
    expect(normalizeMode("autopilot")).toBe("check_all");
    expect(normalizeMode("hands_off")).toBe("hands_off");
    expect(isAutomationMode("social_runs")).toBe(true);
    expect(isAutomationMode("SOCIAL_RUNS")).toBe(false);
  });
});

describe("shouldPublishWithoutApproval", () => {
  const channels = ["x", "linkedin", "instagram", "facebook", "tiktok", "email", "blog", "gbp", "whatsapp", "hosted_pages"];

  it("hands_off publishes everything", () => {
    for (const c of channels) expect(shouldPublishWithoutApproval("hands_off", c), c).toBe(true);
  });

  it("social_runs publishes only social posts", () => {
    for (const c of ["x", "linkedin", "instagram", "facebook", "tiktok"]) {
      expect(shouldPublishWithoutApproval("social_runs", c), c).toBe(true);
    }
    for (const c of ["email", "blog", "gbp", "whatsapp", "hosted_pages"]) {
      expect(shouldPublishWithoutApproval("social_runs", c), c).toBe(false);
    }
    expect(shouldPublishWithoutApproval("social_runs", " LinkedIn ")).toBe(true);
  });

  it("check_all publishes nothing, and so does an unknown or missing mode", () => {
    for (const c of channels) {
      expect(shouldPublishWithoutApproval("check_all", c), c).toBe(false);
      expect(shouldPublishWithoutApproval(null, c), c).toBe(false);
      expect(shouldPublishWithoutApproval("whatever", c), c).toBe(false);
    }
  });
});

describe("getProjectMode", () => {
  function client(result: { data: unknown; error: unknown }) {
    const maybeSingle = vi.fn().mockResolvedValue(result);
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    return { client: { from } as never, from, select, eq };
  }

  it("reads automation_mode from the project row", async () => {
    const { client: c, from, select, eq } = client({ data: { automation_mode: "social_runs" }, error: null });
    await expect(getProjectMode(c, "p1")).resolves.toBe("social_runs");
    expect(from).toHaveBeenCalledWith("projects");
    expect(select).toHaveBeenCalledWith("automation_mode");
    expect(eq).toHaveBeenCalledWith("id", "p1");
  });

  it("falls back to check_all when the row is missing, errors, or holds junk", async () => {
    await expect(getProjectMode(client({ data: null, error: null }).client, "p1")).resolves.toBe("check_all");
    await expect(getProjectMode(client({ data: null, error: { message: "boom" } }).client, "p1")).resolves.toBe("check_all");
    await expect(getProjectMode(client({ data: { automation_mode: "yolo" }, error: null }).client, "p1")).resolves.toBe("check_all");
  });
});
