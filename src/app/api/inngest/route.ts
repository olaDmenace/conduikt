import { NextRequest, NextResponse } from "next/server";
import { serve } from "inngest/next";
import {
  inngest,
  videoPipeline,
  syncSocialMetrics,
  analyzePostPerformance,
  refreshXTokens,
  refreshLinkedInTokens,
  refreshTiktokTokens,
} from "@/src/lib/inngest";

const handlers = serve({
  client: inngest,
  functions: [
    videoPipeline,
    syncSocialMetrics,
    analyzePostPerformance,
    refreshXTokens,
    refreshLinkedInTokens,
    refreshTiktokTokens,
  ],
});

// Inngest verifies request signatures using INNGEST_SIGNING_KEY. Without it
// the route would accept unsigned events — anyone who knows the URL could
// trigger functions. In production, refuse every request when it's missing.
// Checked per request rather than at import so a build without secrets
// (CI) still succeeds; the deploy itself stays locked shut.
function unsigned(): NextResponse | null {
  if (process.env.NODE_ENV === "production" && !process.env.INNGEST_SIGNING_KEY) {
    console.error("[inngest] INNGEST_SIGNING_KEY is not set; refusing requests. Add it from app.inngest.com to Vercel env vars.");
    return NextResponse.json({ error: "Inngest is not configured" }, { status: 503 });
  }
  return null;
}

type Ctx = { params: Promise<Record<string, never>> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return unsigned() ?? handlers.GET(req, ctx);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return unsigned() ?? handlers.POST(req, ctx);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return unsigned() ?? handlers.PUT(req, ctx);
}
