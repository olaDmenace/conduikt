import { describe, it, expect, vi } from "vitest";
import { CONDUIKT_BRAND, pickPublicBrand, resolvePublicBrandForToken } from "@/src/lib/email/public-brand";

describe("pickPublicBrand", () => {
  it("keeps the Conduikt frame for free, pro and growth", () => {
    for (const plan of ["free", "pro", "growth", null, "nonsense"]) {
      expect(pickPublicBrand({ plan, projectName: "Acme", clientLogoUrl: "https://x/logo.png" })).toBe(CONDUIKT_BRAND);
    }
  });

  it("white-labels for agency with the client name and logo", () => {
    expect(
      pickPublicBrand({
        plan: "agency",
        projectName: "Internal name",
        clientName: "Acme Bakery",
        clientLogoUrl: "https://x/acme.png",
        profileLogoUrl: "https://x/agency.png",
      })
    ).toEqual({ whiteLabel: true, name: "Acme Bakery", logoUrl: "https://x/acme.png" });
  });

  it("falls back to the project name and the owner's brand kit logo", () => {
    expect(pickPublicBrand({ plan: "agency", projectName: "Acme", profileLogoUrl: "https://x/kit.png" })).toEqual({
      whiteLabel: true,
      name: "Acme",
      logoUrl: "https://x/kit.png",
    });
  });

  it("falls back to Conduikt when an agency project has no name or logo at all", () => {
    expect(pickPublicBrand({ plan: "agency", projectName: "  " })).toBe(CONDUIKT_BRAND);
  });
});

describe("resolvePublicBrandForToken", () => {
  function db(rows: Record<string, unknown>) {
    return {
      from: (table: string) => {
        const chain: Record<string, unknown> = {};
        for (const m of ["select", "eq"]) chain[m] = vi.fn().mockReturnValue(chain);
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: rows[table] ?? null, error: null });
        return chain;
      },
    };
  }

  it("walks contact -> audience -> project + profile", async () => {
    const out = await resolvePublicBrandForToken(
      db({
        audience_contacts: { audience_id: "aud1" },
        audiences: { project_id: "p1", user_id: "u1" },
        projects: { name: "Acme", client_name: null, client_logo_url: "https://x/a.png" },
        profiles: { plan: "agency", brand_logo_url: null },
      }) as never,
      "unsubscribe_token",
      "tok"
    );
    expect(out).toEqual({ whiteLabel: true, name: "Acme", logoUrl: "https://x/a.png" });
  });

  it("returns the Conduikt frame when the token matches nothing", async () => {
    const out = await resolvePublicBrandForToken(db({}) as never, "confirm_token", "tok");
    expect(out).toBe(CONDUIKT_BRAND);
  });

  it("never throws: a database error becomes the Conduikt frame", async () => {
    const broken = { from: () => { throw new Error("boom"); } };
    const out = await resolvePublicBrandForToken(broken as never, "confirm_token", "tok");
    expect(out).toBe(CONDUIKT_BRAND);
  });
});
