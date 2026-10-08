import { NextRequest, NextResponse } from "next/server";
import { analyzeMagicAudit, fetchPageSignal, type MagicAuditResult } from "@/src/lib/onboarding/magic-audit";
import { normalizeAuditUrl } from "@/src/lib/onboarding/url";
import { generateAgentPreviews } from "@/src/lib/first-week/previews";
import { FIRST_WEEK_AGENT_IDS, OPEN_PREVIEWS, type AgentPreview } from "@/src/lib/first-week/plan";
import { rateLimit } from "@/src/lib/security/rate-limit";
import { assertPublicUrl, BlockedUrlError, safeFetch } from "@/src/lib/security/safe-fetch";
import { verifyTurnstile } from "@/src/lib/security/turnstile";
import { clientIp } from "@/src/lib/security/client-ip";

// POST /api/public/site-check — the signed-out "Check my site free" run.
// Body: { url, turnstileToken? }
//
// Costs two model calls (the audit and one preview call for every agent),
// so it is guarded three ways: a per-visitor limit, a per-instance hourly
// ceiling, and Cloudflare Turnstile when its keys are configured. Results
// are cached per URL for an hour so repeat checks are free.
//
// Only OPEN_PREVIEWS previews go back in full; the rest return the
// headline only. The gate is enforced here, not by blurring in the page.

export const maxDuration = 120;

interface CachedResult {
  at: number;
  audit: MagicAuditResult;
  previews: AgentPreview[];
  signal: { title: string | null; h1: string | null };
}
const CACHE = new Map<string, CachedResult>();
const CACHE_MS = 60 * 60 * 1000;


function gate(previews: AgentPreview[]) {
  return previews.map((p, i) =>
    i < OPEN_PREVIEWS ? { ...p, locked: false } : { agentId: p.agentId, headline: p.headline, items: [], locked: true }
  );
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  const body = (await request.json().catch(() => null)) as { url?: string; turnstileToken?: string } | null;
  const url = normalizeAuditUrl(body?.url ?? "");
  if (!url) {
    return NextResponse.json({ error: "That doesn't look like a website address. Try: yourcompany.com" }, { status: 400 });
  }

  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json({ url, audit: cached.audit, previews: gate(cached.previews), signal: cached.signal, cached: true });
  }

  const perVisitor = rateLimit(`site-check:${ip}`, { limit: 3, windowSeconds: 3600 });
  const perInstance = rateLimit("site-check:all", { limit: 120, windowSeconds: 3600 });
  if (!perVisitor.allowed || !perInstance.allowed) {
    return NextResponse.json(
      { error: "You've checked a few sites already. Create a free account to keep going.", code: "rate_limited" },
      { status: 429 }
    );
  }

  if (!(await verifyTurnstile(body?.turnstileToken, ip))) {
    return NextResponse.json({ error: "We couldn't confirm you're not a bot. Refresh and try again.", code: "bot_check" }, { status: 403 });
  }

  try {
    await assertPublicUrl(url);
  } catch (err) {
    if (err instanceof BlockedUrlError) {
      return NextResponse.json({ error: "We can only check public websites." }, { status: 400 });
    }
    throw err;
  }

  try {
    const signal = await fetchPageSignal(url, safeFetch as typeof fetch);
    const [audit, previews] = await Promise.all([
      analyzeMagicAudit(signal),
      generateAgentPreviews(signal, [...FIRST_WEEK_AGENT_IDS]).catch((err) => {
        console.error("[site-check] previews failed:", err);
        return [] as AgentPreview[];
      }),
    ]);
    const entry: CachedResult = { at: Date.now(), audit, previews, signal: { title: signal.title, h1: signal.h1 } };
    if (CACHE.size > 300) CACHE.delete(CACHE.keys().next().value as string);
    CACHE.set(url, entry);
    return NextResponse.json({ url, audit, previews: gate(previews), signal: entry.signal });
  } catch (err) {
    console.error("[site-check] failed:", err);
    return NextResponse.json({ error: "We couldn't check that site just now. Try again in a minute." }, { status: 502 });
  }
}
