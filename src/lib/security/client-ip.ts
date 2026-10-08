// The visitor's IP for rate limiting and attribution. conduikt.com sits
// behind Cloudflare's proxy, so the connecting address Vercel sees is a
// Cloudflare edge shared by many visitors; Cloudflare passes the real one
// in cf-connecting-ip. Requests that skip Cloudflare (e.g. the vercel.app
// URL) fall back to Vercel's x-forwarded-for.
export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
