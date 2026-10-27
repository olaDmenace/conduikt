import { NextRequest, NextResponse } from "next/server";
import { AIUnavailableError, aiUnavailableBody } from "@/src/lib/ai/client";
import { sampleMagicAudit } from "@/src/lib/ai/samples";
import { analyzeMagicAudit, fetchPageSignal, type MagicAuditResult } from "@/src/lib/onboarding/magic-audit";
import { normalizeAuditUrl } from "@/src/lib/onboarding/url";
import { generateAgentPreviews, hasSamplePreviews, previewMode, type PreviewResult } from "@/src/lib/first-week/previews";
import { FIRST_WEEK_AGENT_IDS, OPEN_PREVIEWS } from "@/src/lib/first-week/plan";
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
//
// When the writing service can't be reached (no credit, outage, our own
// spend cap) the visitor gets generic sample output instead of an error,
// flagged `sample: true` on the response, the audit and every preview.
// Samples are never cached, so the next check runs for real again.

export const maxDuration = 120;

interface CachedResult {
  at: number;
  audit: MagicAuditResult;
  previews: PreviewResult[];
  signal: { title: string | null; h1: string | null };
}
const CACHE = new Map<string, CachedResult>();
const CACHE_MS = 60 * 60 * 1000;


function gate(previews: PreviewResult[]) {
  return previews.map((p, i) =>
    i < OPEN_PREVIEWS
      ? { ...p, locked: false }
      : { agentId: p.agentId, headline: p.headline, items: [], locked: true, ...(p.sample ? { sample: true } : {}) }
  );
}

/** The audit, or the sample audit when the model can't be reached and samples are allowed. */
async function auditOrSample(signal: Parameters<typeof analyzeMagicAudit>[0]) {
  const mode = previewMode();
  if (mode === "always") return sampleMagicAudit(signal.url);
  try {
    return await analyzeMagicAudit(signal);
  } catch (err) {
    if (err instanceof AIUnavailableError && mode === "fallback") {
      console.error(`[site-check] writing service unavailable (${err.code}); showing the sample audit`);
      return sampleMagicAudit(signal.url);
    }
    throw err;
  }
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
      auditOrSample(signal),
      generateAgentPreviews(signal, [...FIRST_WEEK_AGENT_IDS]).catch((err) => {
        if (err instanceof AIUnavailableError) throw err;
        console.error("[site-check] previews failed:", err);
        return [] as PreviewResult[];
      }),
    ]);
    const sample = "sample" in audit || hasSamplePreviews(previews);
    const entry: CachedResult = { at: Date.now(), audit, previews, signal: { title: signal.title, h1: signal.h1 } };
    if (!sample) {
      if (CACHE.size > 300) CACHE.delete(CACHE.keys().next().value as string);
      CACHE.set(url, entry);
    }
    return NextResponse.json({ url, audit, previews: gate(previews), signal: entry.signal, ...(sample ? { sample: true } : {}) });
  } catch (err) {
    if (err instanceof AIUnavailableError) return NextResponse.json(aiUnavailableBody(err), { status: 503 });
    console.error("[site-check] failed:", err);
    return NextResponse.json({ error: "We couldn't check that site just now. Try again in a minute." }, { status: 502 });
  }
}
