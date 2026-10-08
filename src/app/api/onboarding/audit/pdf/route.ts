import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/src/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";
import { normalizeAuditUrl } from "@/src/lib/onboarding/url";
import { FirstWeekReportDocument } from "@/src/lib/pdf/first-week-report";
import { reportDate, safeFileHost, toQuickAudit } from "@/src/lib/pdf/quick-audit";

// POST { url, audit } → the quick site check as a PDF. Stateless: renders
// what the signed-in user's browser already has, so it works even when no
// project could be created for the site (e.g. the plan is full).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = rateLimit(`audit-pdf:${user.id}`, { limit: 20, windowSeconds: 3600 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = (await request.json().catch(() => ({}))) as { url?: string; audit?: unknown };
  const url = normalizeAuditUrl(body.url ?? "");
  const audit = toQuickAudit(body.audit);
  if (!url || !audit) return NextResponse.json({ error: "Nothing to download yet." }, { status: 400 });
  const host = new URL(url).hostname.replace(/^www\./, "");

  const doc = React.createElement(FirstWeekReportDocument, { host, date: reportDate(), audit });
  let buffer: Buffer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buffer = await renderToBuffer(doc as any);
  } catch (err) {
    console.error("[report-pdf] render failed:", err);
    const detail = process.env.NODE_ENV === "development" && err instanceof Error ? `: ${err.message}` : "";
    return NextResponse.json({ error: `We couldn't build the PDF${detail}` }, { status: 500 });
  }
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="conduikt-site-check-${safeFileHost(host)}.pdf"`,
    },
  });
}
