import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetch for URLs typed by strangers (the public "Check my site" form).
// Refuses anything that resolves to a private, loopback, link-local or
// otherwise internal address — including cloud metadata (169.254.169.254)
// — and re-checks every redirect hop, so a public URL can't bounce us
// into the private network.
//
// Known gap: fetch re-resolves the name after our lookup, so a DNS
// rebinding attacker with a ~0s TTL could still race us. Acceptable here:
// we only read the response body as page text and never return headers.

export class BlockedUrlError extends Error {}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
}

const V4_BLOCKED: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKED.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (family === 6) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v);
  }
  return true; // not an IP at all: treat as unsafe
}

/** Throws BlockedUrlError unless the URL is http(s) on a public address. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError("Not a valid address");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new BlockedUrlError("Only web addresses");
  if (url.port && url.port !== "80" && url.port !== "443") throw new BlockedUrlError("Unusual port");
  if (url.username || url.password) throw new BlockedUrlError("Credentials in URL");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new BlockedUrlError("Private host");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new BlockedUrlError("Address does not resolve");
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new BlockedUrlError("Private address");
  return url;
}

/** fetch() that only talks to public hosts, following up to 4 redirects by hand. */
export async function safeFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  let current = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) return res;
      current = new URL(next, current).toString();
      continue;
    }
    return res;
  }
  throw new BlockedUrlError("Too many redirects");
}
