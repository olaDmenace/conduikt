// The visitor's IP for rate limiting and attribution.
//
// conduikt.com sits behind Cloudflare's proxy, so the connecting address
// Vercel sees (its own x-forwarded-for, which the client cannot forge) is a
// Cloudflare edge shared by many visitors; Cloudflare passes the real one in
// cf-connecting-ip. That header is only worth anything when the request
// really came through Cloudflare: on the vercel.app origin, or from anyone
// who talks to the origin host directly, it arrives verbatim from the
// client and would let one source pick a fresh rate-limit bucket per
// request. So cf-connecting-ip is honoured only when
//
//   1. the connecting address is inside Cloudflare's published ranges
//      (https://www.cloudflare.com/ips/), or
//   2. CLOUDFLARE_PROXY_SECRET is set and the request carries it in
//      x-cf-proxy-secret (add it with a Cloudflare Transform Rule) — the
//      escape hatch should the ranges change before this list does.
//
// Otherwise the connecting address itself is the visitor.

const CLOUDFLARE_IPV4 = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

const CLOUDFLARE_IPV6 = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

export const CLOUDFLARE_PROXY_SECRET_HEADER = "x-cf-proxy-secret";

/** 32-bit value of a dotted-quad IPv4 address, or null when it is not one. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

/** The eight 16-bit groups of an IPv6 address (incl. ::ffff:a.b.c.d), or null. */
function ipv6ToGroups(ip: string): number[] | null {
  let s = ip.trim();
  const zone = s.indexOf("%");
  if (zone !== -1) s = s.slice(0, zone);
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);

  // Embedded IPv4 tail (::ffff:1.2.3.4) → two hextets.
  const lastColon = s.lastIndexOf(":");
  if (lastColon !== -1 && s.slice(lastColon + 1).includes(".")) {
    const v4 = ipv4ToInt(s.slice(lastColon + 1));
    if (v4 === null) return null;
    s = `${s.slice(0, lastColon)}:${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const parts = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];

  const groups: number[] = [];
  for (const g of parts) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    groups.push(parseInt(g, 16));
  }
  return groups;
}

/** True when the groups are a v4-mapped address (::ffff:a.b.c.d). */
function mappedV4(groups: number[]): number | null {
  for (let i = 0; i < 5; i++) if (groups[i] !== 0) return null;
  if (groups[5] !== 0xffff) return null;
  return groups[6] * 0x10000 + groups[7];
}

function inCidr4(ipInt: number, cidr: string): boolean {
  const [net, bitsStr] = cidr.split("/");
  const netInt = ipv4ToInt(net);
  const bits = Number(bitsStr);
  if (netInt === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return ((ipInt & mask) >>> 0) === ((netInt & mask) >>> 0);
}

function inCidr6(groups: number[], cidr: string): boolean {
  const [net, bitsStr] = cidr.split("/");
  const netGroups = ipv6ToGroups(net);
  const bits = Number(bitsStr);
  if (netGroups === null || !Number.isInteger(bits) || bits < 0 || bits > 128) return false;
  for (let i = 0; i < 8; i++) {
    const take = Math.min(16, Math.max(0, bits - i * 16));
    if (take === 0) return true;
    const mask = take === 16 ? 0xffff : (0xffff << (16 - take)) & 0xffff;
    if ((groups[i] & mask) !== (netGroups[i] & mask)) return false;
  }
  return true;
}

/** True when `ip` is one of Cloudflare's published proxy addresses. */
export function isCloudflareAddress(ip: string): boolean {
  const v4 = ipv4ToInt(ip);
  if (v4 !== null) return CLOUDFLARE_IPV4.some((c) => inCidr4(v4, c));
  const v6 = ipv6ToGroups(ip);
  if (v6 === null) return false;
  // A v4-mapped v6 address is really a v4 address.
  const mapped = mappedV4(v6);
  if (mapped !== null) return CLOUDFLARE_IPV4.some((c) => inCidr4(mapped, c));
  return CLOUDFLARE_IPV6.some((c) => inCidr6(v6, c));
}

/** The address that actually connected to us, as the platform reports it. */
function connectingAddress(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "";
}

/** Whether cf-connecting-ip on this request can be believed. */
function viaCloudflare(headers: Headers, connecting: string): boolean {
  const secret = process.env.CLOUDFLARE_PROXY_SECRET;
  if (secret && headers.get(CLOUDFLARE_PROXY_SECRET_HEADER) === secret) return true;
  return connecting !== "" && isCloudflareAddress(connecting);
}

export function clientIp(headers: Headers): string {
  const connecting = connectingAddress(headers);
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf && viaCloudflare(headers, connecting)) return cf;
  return connecting || "unknown";
}
