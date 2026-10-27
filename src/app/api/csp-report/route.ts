import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

/**
 * CSP violation report sink.
 *
 * Content-Security-Policy-Report-Only sends browser-generated violation
 * reports here. We log them to stdout (Vercel captures logs) so the team
 * can see what the current policy would break BEFORE flipping it from
 * Report-Only to enforce.
 *
 * The report body can arrive in two shapes depending on the browser era:
 *   1. Legacy application/csp-report — { "csp-report": { ... } }
 *   2. Modern application/reports+json — [{ "type": "csp-violation", "body": { ... } }]
 *
 * We accept both. Persisting to a DB isn't worth it while we're just
 * shaping the policy — the logs are enough. If we later want dashboards,
 * flip this to insert into a `csp_reports` table.
 *
 * Rate-limited per client IP (violations from a compromised page, or a
 * script that targets this URL, can flood the logs). The limiter is the
 * in-memory one from src/lib/security/rate-limit.ts: per-instance, so it
 * caps a hot lambda rather than the whole fleet, which is enough here.
 */

const RATE_LIMIT = { limit: 30, windowSeconds: 60 };

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `csp-report:${ip}`;
}

interface CspReportBody {
  "csp-report"?: Record<string, unknown>;
}

interface ReportsApiEntry {
  type?: string;
  body?: Record<string, unknown>;
  url?: string;
  age?: number;
  user_agent?: string;
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(clientKey(request), RATE_LIMIT);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const raw = await request.text();
    if (!raw) return NextResponse.json({ ok: true });

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      // Malformed body — some browsers ship weird encodings. Log and move on.
      console.warn("[csp-report] non-JSON body received", {
        contentType,
        preview: raw.slice(0, 200),
      });
      return NextResponse.json({ ok: true });
    }

    // Normalize to a common shape for the log line.
    if (Array.isArray(payload)) {
      // Reports API format (application/reports+json)
      for (const entry of payload as ReportsApiEntry[]) {
        if (entry?.type !== "csp-violation") continue;
        const b = entry.body ?? {};
        console.warn("[csp-report]", {
          format: "reports-api",
          documentURL: b["documentURL"],
          blockedURL: b["blockedURL"],
          effectiveDirective: b["effectiveDirective"],
          disposition: b["disposition"],
          statusCode: b["statusCode"],
          userAgent: entry.user_agent,
        });
      }
    } else {
      // Legacy application/csp-report format
      const b = (payload as CspReportBody)?.["csp-report"] ?? {};
      console.warn("[csp-report]", {
        format: "legacy",
        documentURI: b["document-uri"],
        blockedURI: b["blocked-uri"],
        effectiveDirective:
          b["effective-directive"] ?? b["violated-directive"],
        disposition: b["disposition"],
        statusCode: b["status-code"],
        originalPolicy: b["original-policy"],
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[csp-report] handler crashed", err);
    // Never fail loudly — a broken report endpoint should not leak into
    // the browser as a network error the user sees.
    return NextResponse.json({ ok: true });
  }
}

// Some browsers preflight the report endpoint. Keep it cheap.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
