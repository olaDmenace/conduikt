import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import {
  fetchPageSignal,
  analyzeMagicAudit,
  normalizeAuditUrl,
} from "@/src/lib/onboarding/magic-audit";

/**
 * POST /api/onboarding/magic-audit
 *
 * Body: { url: string }
 * Returns: MagicAuditResult (see src/lib/onboarding/magic-audit.ts)
 *
 * Rate-limited to 3 audits per user per hour. This is the "first 60
 * seconds" activation flow — a legit new user hits it once, twice at
 * most. Cap protects against onboarding-farm abuse without frustrating
 * genuine flows.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`magic-audit:${user.id}`, {
    limit: 3,
    windowSeconds: 3600,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const normalized = normalizeAuditUrl(body.url ?? "");
  if (!normalized) {
    return NextResponse.json(
      { error: "Enter a valid website URL (e.g. https://acme.com)" },
      { status: 400 }
    );
  }

  try {
    const signal = await fetchPageSignal(normalized);
    const result = await analyzeMagicAudit(signal);
    return NextResponse.json({
      url: normalized,
      signal: {
        title: signal.title,
        metaDescription: signal.metaDescription,
        h1: signal.h1,
      },
      result,
    });
  } catch (err) {
    const message =
      process.env.NODE_ENV === "development"
        ? err instanceof Error
          ? err.message
          : String(err)
        : "The audit failed. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
