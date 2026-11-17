// @vitest-environment node
import { describe, it, expect } from "vitest";

import {
  DEFAULT_TASKS,
  corroborationQuestion,
  defaultTasksFor,
  domainMatches,
  isPlatformCited,
  mentionedPlatforms,
  taskDefFor,
} from "@/src/lib/corroboration/tasks";
import { BUSINESS_TYPES } from "@/src/lib/playbooks";

describe("default corroboration tasks", () => {
  it("has a list for every playbook, each task complete", () => {
    for (const type of BUSINESS_TYPES) {
      const tasks = defaultTasksFor(type);
      expect(tasks.length).toBeGreaterThanOrEqual(5);
      for (const t of tasks) {
        expect(t.platform).toMatch(/^[a-z0-9_]+$/);
        expect(t.title.length).toBeGreaterThan(0);
        expect(t.why.split(".").filter(Boolean).length).toBeLessThanOrEqual(2);
        expect(t.url).toMatch(/^https:\/\//);
        expect(t.domains.length).toBeGreaterThan(0);
      }
      // no duplicate platforms within one list
      expect(new Set(tasks.map((t) => t.platform)).size).toBe(tasks.length);
    }
  });

  it("gives local businesses the Google listing and the Nigerian directories", () => {
    const platforms = defaultTasksFor("local").map((t) => t.platform);
    expect(platforms).toEqual(
      expect.arrayContaining([
        "google_business_profile",
        "bing_places",
        "apple_business_connect",
        "facebook_page",
        "nairaland",
        "vconnect",
        "finelib",
      ])
    );
  });

  it("gives SaaS the software directories", () => {
    const platforms = defaultTasksFor("saas").map((t) => t.platform);
    expect(platforms).toEqual(
      expect.arrayContaining(["g2", "product_hunt", "crunchbase", "alternativeto", "linkedin_company", "reddit"])
    );
  });

  it("agency and creator get sensible equivalents", () => {
    expect(defaultTasksFor("agency").map((t) => t.platform)).toEqual(expect.arrayContaining(["clutch", "google_business_profile"]));
    expect(defaultTasksFor("creator").map((t) => t.platform)).toEqual(expect.arrayContaining(["youtube_channel", "instagram"]));
  });

  it("unknown or missing types count as SaaS", () => {
    expect(defaultTasksFor(null)).toEqual(DEFAULT_TASKS.saas);
    expect(defaultTasksFor("ecommerce")).toEqual(DEFAULT_TASKS.saas);
  });

  it("returns copies so callers cannot mutate the defaults", () => {
    const a = defaultTasksFor("local");
    a[0].domains.push("evil.com");
    expect(DEFAULT_TASKS.local[0].domains).not.toContain("evil.com");
  });

  it("looks a definition up by platform key", () => {
    expect(taskDefFor("g2")?.title).toBe("G2");
    expect(taskDefFor("nope")).toBeNull();
  });
});

describe("domain matching", () => {
  it("matches the domain and its subdomains, not lookalikes", () => {
    expect(domainMatches("google.com", "google.com")).toBe(true);
    expect(domainMatches("maps.google.com", "google.com")).toBe(true);
    expect(domainMatches("notgoogle.com", "google.com")).toBe(false);
    expect(domainMatches("google.com.evil.io", "google.com")).toBe(false);
  });

  it("isPlatformCited reads full urls, ignores www and junk", () => {
    expect(isPlatformCited(["g2.com"], ["https://www.g2.com/products/acme/reviews"])).toBe(true);
    expect(isPlatformCited(["g2.com"], ["https://example.com/", "not a url"])).toBe(false);
    expect(isPlatformCited(["bing.com", "bingplaces.com"], ["https://www.bing.com/maps?q=acme"])).toBe(true);
  });

  it("mentionedPlatforms reports each platform against the citations", () => {
    const citations = [
      "https://www.google.com/maps/place/Bright+Smiles",
      "https://www.nairaland.com/123/bright-smiles-lekki",
      "https://brightsmiles.ng/",
    ];
    expect(mentionedPlatforms(["google_business_profile", "nairaland", "vconnect", "unknown_platform"], citations)).toEqual({
      google_business_profile: true,
      nairaland: true,
      vconnect: false,
      unknown_platform: false,
    });
  });
});

describe("corroborationQuestion", () => {
  it("is the business name and the city", () => {
    expect(corroborationQuestion({ name: "Bright Smiles Dental", city: "Lekki" })).toBe("Bright Smiles Dental Lekki");
  });
  it("falls back to business_location and tolerates blanks", () => {
    expect(corroborationQuestion({ name: "Bright  Smiles", city: "", business_location: "Lagos" })).toBe("Bright Smiles Lagos");
    expect(corroborationQuestion({ name: null })).toBe("");
  });
});
