import { describe, it, expect, vi } from "vitest";
import { formatFrom, pickSenderAddress, resolveSenderAddress } from "@/src/lib/email/sender";
import { CONDUIKT_SHARED_FROM_EMAIL } from "@/src/lib/email/marketing";

describe("pickSenderAddress", () => {
  it("uses the shared sender when the user has no domain", () => {
    const out = pickSenderAddress(null, "Acme");
    expect(out).toEqual({
      email: CONDUIKT_SHARED_FROM_EMAIL,
      from: `Acme <${CONDUIKT_SHARED_FROM_EMAIL}>`,
      custom: false,
    });
  });

  it("uses the shared sender while the domain is still pending or failed", () => {
    for (const status of ["pending", "failed"]) {
      const out = pickSenderAddress({ domain: "mail.acme.com", from_local_part: "news", status }, "Acme");
      expect(out.custom).toBe(false);
      expect(out.email).toBe(CONDUIKT_SHARED_FROM_EMAIL);
    }
  });

  it("uses <local part>@<domain> once verified", () => {
    const out = pickSenderAddress(
      { domain: "mail.acme.com", from_local_part: "news", status: "verified" },
      "Acme"
    );
    expect(out).toEqual({ email: "news@mail.acme.com", from: "Acme <news@mail.acme.com>", custom: true });
  });

  it("defaults the local part to hello", () => {
    const out = pickSenderAddress({ domain: "acme.com", from_local_part: null, status: "verified" }, "Acme");
    expect(out.email).toBe("hello@acme.com");
  });

  it("strips header-breaking characters from the display name", () => {
    expect(formatFrom('Evil <bad@x.com>" \r\nBcc: y', "hello@acme.com")).toBe("Evil bad@x.com Bcc: y <hello@acme.com>");
    expect(formatFrom("", "hello@acme.com")).toBe("Conduikt <hello@acme.com>");
  });
});

describe("resolveSenderAddress", () => {
  // Two tables: profiles (plan, via .single()) and verified_domains (row,
  // via .maybeSingle()).
  function db(row: unknown, plan: string | null = "pro") {
    const domains: Record<string, unknown> = {};
    for (const m of ["select", "eq", "order", "limit"]) domains[m] = vi.fn().mockReturnValue(domains);
    domains.maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const profiles: Record<string, unknown> = {};
    for (const m of ["select", "eq"]) profiles[m] = vi.fn().mockReturnValue(profiles);
    profiles.single = vi.fn().mockResolvedValue({ data: plan === null ? null : { plan }, error: null });
    const from = vi.fn((table: string) => (table === "profiles" ? profiles : domains));
    return { from, chain: domains, profiles };
  }

  it("queries only verified domains for the user and returns the custom address", async () => {
    const { from, chain } = db({ domain: "acme.com", from_local_part: "hello", status: "verified" });
    const out = await resolveSenderAddress({ from } as never, "u1", "Acme");
    expect(from).toHaveBeenCalledWith("verified_domains");
    expect(from).toHaveBeenCalledWith("profiles");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(chain.eq).toHaveBeenCalledWith("status", "verified");
    expect(out.email).toBe("hello@acme.com");
    expect(out.custom).toBe(true);
  });

  it("falls back to the shared sender when nothing is verified", async () => {
    const { from } = db(null);
    const out = await resolveSenderAddress({ from } as never, "u1", "Acme");
    expect(out.custom).toBe(false);
    expect(out.from).toBe(`Acme <${CONDUIKT_SHARED_FROM_EMAIL}>`);
  });

  it("ignores a verified domain once the plan no longer allows it (downgrade / lapsed)", async () => {
    for (const plan of ["free", null]) {
      const { from } = db({ domain: "acme.com", from_local_part: "hello", status: "verified" }, plan);
      const out = await resolveSenderAddress({ from } as never, "u1", "Acme");
      expect(out.custom).toBe(false);
      expect(out.email).toBe(CONDUIKT_SHARED_FROM_EMAIL);
    }
  });

  it("keeps the custom address on growth and agency", async () => {
    for (const plan of ["growth", "agency"]) {
      const { from } = db({ domain: "acme.com", from_local_part: "news", status: "verified" }, plan);
      const out = await resolveSenderAddress({ from } as never, "u1", "Acme");
      expect(out.email).toBe("news@acme.com");
    }
  });
});
