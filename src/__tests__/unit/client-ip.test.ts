import { describe, it, expect, afterEach, vi } from "vitest";
import { clientIp, isCloudflareAddress, CLOUDFLARE_PROXY_SECRET_HEADER } from "@/src/lib/security/client-ip";

const h = (o: Record<string, string>) => new Headers(o);

// A Cloudflare edge (172.64.0.0/13) and an ordinary address that is not.
const CF_EDGE = "172.67.205.95";
const CF_EDGE_V6 = "2606:4700:3033::ac43:cd5f";
const NOT_CF = "34.120.1.1";

describe("isCloudflareAddress", () => {
  it("matches the published IPv4 ranges", () => {
    expect(isCloudflareAddress(CF_EDGE)).toBe(true);
    expect(isCloudflareAddress("104.16.0.1")).toBe(true);
    expect(isCloudflareAddress("198.41.255.255")).toBe(true);
    expect(isCloudflareAddress("131.0.72.9")).toBe(true);
  });
  it("matches the published IPv6 ranges, incl. v4-mapped forms", () => {
    expect(isCloudflareAddress(CF_EDGE_V6)).toBe(true);
    expect(isCloudflareAddress("2a06:98c0:1::1")).toBe(true);
    expect(isCloudflareAddress("::ffff:172.67.205.95")).toBe(true);
    expect(isCloudflareAddress("::ffff:ac43:cd5f")).toBe(true);
  });
  it("rejects everything else, including junk", () => {
    expect(isCloudflareAddress(NOT_CF)).toBe(false);
    expect(isCloudflareAddress("10.0.0.1")).toBe(false);
    expect(isCloudflareAddress("2001:db8::1")).toBe(false);
    expect(isCloudflareAddress("::ffff:10.0.0.1")).toBe(false);
    expect(isCloudflareAddress("131.0.76.0")).toBe(false); // just past /22
    expect(isCloudflareAddress("")).toBe(false);
    expect(isCloudflareAddress("not-an-ip")).toBe(false);
    expect(isCloudflareAddress("1.2.3")).toBe(false);
    expect(isCloudflareAddress("1:2:3:4:5:6:7:8:9")).toBe(false);
    expect(isCloudflareAddress("1::2::3")).toBe(false);
  });
});

describe("clientIp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("trusts cf-connecting-ip when the connecting address is a Cloudflare edge", () => {
    expect(clientIp(h({ "cf-connecting-ip": "41.58.1.2", "x-forwarded-for": CF_EDGE }))).toBe("41.58.1.2");
    expect(clientIp(h({ "cf-connecting-ip": "41.58.1.2", "x-forwarded-for": CF_EDGE_V6 }))).toBe("41.58.1.2");
    expect(clientIp(h({ "cf-connecting-ip": "41.58.1.2", "x-real-ip": CF_EDGE }))).toBe("41.58.1.2");
  });

  it("ignores a forged cf-connecting-ip when the connecting address is not Cloudflare", () => {
    expect(clientIp(h({ "cf-connecting-ip": "10.99.1.2", "x-forwarded-for": NOT_CF }))).toBe(NOT_CF);
    expect(clientIp(h({ "cf-connecting-ip": "10.99.1.2", "x-real-ip": NOT_CF }))).toBe(NOT_CF);
    // Forging the second XFF hop does not help: only the first hop counts.
    expect(clientIp(h({ "cf-connecting-ip": "10.99.1.2", "x-forwarded-for": `${NOT_CF}, ${CF_EDGE}` }))).toBe(NOT_CF);
  });

  it("ignores cf-connecting-ip when nothing says who connected", () => {
    expect(clientIp(h({ "cf-connecting-ip": "10.99.1.2" }))).toBe("unknown");
  });

  it("trusts cf-connecting-ip when the proxy secret matches, whatever the connecting address", () => {
    vi.stubEnv("CLOUDFLARE_PROXY_SECRET", "s3cret");
    const trusted = h({ "cf-connecting-ip": "41.58.1.2", "x-forwarded-for": NOT_CF, [CLOUDFLARE_PROXY_SECRET_HEADER]: "s3cret" });
    expect(clientIp(trusted)).toBe("41.58.1.2");

    const wrong = h({ "cf-connecting-ip": "41.58.1.2", "x-forwarded-for": NOT_CF, [CLOUDFLARE_PROXY_SECRET_HEADER]: "nope" });
    expect(clientIp(wrong)).toBe(NOT_CF);
  });

  it("does not treat an empty secret as a match", () => {
    vi.stubEnv("CLOUDFLARE_PROXY_SECRET", "");
    expect(clientIp(h({ "cf-connecting-ip": "41.58.1.2", "x-forwarded-for": NOT_CF, [CLOUDFLARE_PROXY_SECRET_HEADER]: "" }))).toBe(NOT_CF);
  });

  it("falls back to the first x-forwarded-for hop, then x-real-ip", () => {
    expect(clientIp(h({ "x-forwarded-for": "41.58.1.2, 10.0.0.1" }))).toBe("41.58.1.2");
    expect(clientIp(h({ "x-real-ip": "41.58.1.3" }))).toBe("41.58.1.3");
  });

  it("says unknown when nothing is present", () => {
    expect(clientIp(h({}))).toBe("unknown");
  });
});
