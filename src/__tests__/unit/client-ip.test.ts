import { describe, it, expect } from "vitest";
import { clientIp } from "@/src/lib/security/client-ip";

const h = (o: Record<string, string>) => new Headers(o);

describe("clientIp", () => {
  it("prefers Cloudflare's real visitor address", () => {
    expect(clientIp(h({ "cf-connecting-ip": "41.58.1.2", "x-forwarded-for": "172.67.205.95" }))).toBe("41.58.1.2");
  });
  it("falls back to the first x-forwarded-for hop, then x-real-ip", () => {
    expect(clientIp(h({ "x-forwarded-for": "41.58.1.2, 10.0.0.1" }))).toBe("41.58.1.2");
    expect(clientIp(h({ "x-real-ip": "41.58.1.3" }))).toBe("41.58.1.3");
  });
  it("says unknown when nothing is present", () => {
    expect(clientIp(h({}))).toBe("unknown");
  });
});
