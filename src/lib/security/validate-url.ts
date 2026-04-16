/**
 * Validate that a URL is safe to fetch server-side.
 * Blocks private/reserved IPs, non-HTTP schemes, and localhost.
 */
export function isUrlSafeToFetch(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http/https
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();

    // Block localhost variants
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "0.0.0.0"
    ) return false;

    // Block private IP ranges
    // 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x (link-local)
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const [, a, b] = ipMatch.map(Number);
      if (a === 10) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 169 && b === 254) return false;
      if (a === 127) return false;
      if (a === 0) return false;
    }

    // Block metadata endpoints
    if (hostname === "metadata.google.internal") return false;

    return true;
  } catch {
    return false;
  }
}
