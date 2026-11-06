// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { DataForSeoProvider, NoVolumeProvider, getKeywordVolumeProvider } from "./keyword-volume";

describe("NoVolumeProvider", () => {
  it("returns nulls for every query", async () => {
    const out = await new NoVolumeProvider().lookup(["a", "b"]);
    expect(out).toEqual([
      { query: "a", monthlySearches: null, competition: null },
      { query: "b", monthlySearches: null, competition: null },
    ]);
  });
});

describe("DataForSeoProvider", () => {
  it("posts batches with basic auth and maps search_volume and competition", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const body = JSON.parse(String(init?.body)) as Array<{ keywords: string[]; location_name?: string }>;
      return new Response(
        JSON.stringify({
          tasks: [
            {
              status_code: 20000,
              result: body[0].keywords.map((k, i) => ({
                keyword: k,
                search_volume: i === 0 ? 1200 : null,
                competition: i === 0 ? "LOW" : null,
                competition_index: i === 1 ? 80 : null,
              })),
            },
          ],
        }),
        { status: 200 }
      );
    });
    const p = new DataForSeoProvider("user", "pw", fetchImpl);
    const out = await p.lookup(["plumber near me", "Plumber Lagos"], { locationName: "Nigeria", languageCode: "en" });

    expect(calls[0].url).toContain("search_volume/live");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("user:pw").toString("base64")}`);
    const sent = JSON.parse(String(calls[0].init?.body))[0];
    expect(sent.location_name).toBe("Nigeria");
    expect(sent.language_code).toBe("en");

    expect(out[0]).toEqual({ query: "plumber near me", monthlySearches: 1200, competition: "low" });
    expect(out[1]).toEqual({ query: "Plumber Lagos", monthlySearches: null, competition: "high" });
  });

  it("splits more than 100 keywords into batches", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ tasks: [] }), { status: 200 }));
    const p = new DataForSeoProvider("u", "p", fetchImpl);
    await p.lookup(Array.from({ length: 150 }, (_, i) => `q${i}`));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("falls back to nulls when the API fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const p = new DataForSeoProvider("u", "p", fetchImpl);
    const out = await p.lookup(["x"]);
    expect(out).toEqual([{ query: "x", monthlySearches: null, competition: null }]);
    expect(warn.mock.calls.flat().join(" ")).not.toContain("u:p");
    warn.mockRestore();
  });
});

describe("getKeywordVolumeProvider", () => {
  it("picks by env", () => {
    expect(getKeywordVolumeProvider({} as NodeJS.ProcessEnv).name).toBe("none");
    expect(getKeywordVolumeProvider({ DATAFORSEO_LOGIN: "a", DATAFORSEO_PASSWORD: "b" } as unknown as NodeJS.ProcessEnv).name).toBe("dataforseo");
  });
});
