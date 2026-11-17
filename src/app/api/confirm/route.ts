import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { confirmContactByToken } from "@/src/lib/email/confirm";
import { rateLimit, rateLimitResponse } from "@/src/lib/security/rate-limit";

// Double opt-in confirmation.
//
//   GET  /api/confirm?token=X   flips the contact to 'subscribed' and
//                               redirects to /confirm?token=X&state=done
//   POST /api/confirm           { token } or form field / ?token=  -> JSON
//
// States: done | already (ok), expired | invalid | not_pending | error.
// 'not_pending' means the address unsubscribed, bounced or was suppressed
// after the link went out; the link must not undo that.
//
// Unauthenticated: the per-contact confirm_token is the only credential,
// so this runs under the service-role client like /api/unsubscribe.

function readToken(url: URL, body: string | null, contentType: string): string | null {
  const fromQuery = url.searchParams.get("token");
  if (fromQuery) return fromQuery;
  if (!body) return null;
  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(body) as { token?: unknown };
      return typeof parsed.token === "string" ? parsed.token : null;
    } catch {
      return null;
    }
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(body).get("token");
  }
  return null;
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : request.headers.get("x-real-ip") ?? "unknown").trim();
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const limited = await rateLimit(`confirm:${clientIp(request)}`, { limit: 30, windowSeconds: 600 });
  if (!limited.allowed) return rateLimitResponse(limited);

  const result = await confirmContactByToken(createServiceClient(), token);
  const state = result.ok ? (result.state === "already" ? "already" : "done") : result.state;
  return NextResponse.redirect(
    new URL(`/confirm?token=${encodeURIComponent(token)}&state=${state}`, request.url),
    { status: 303 }
  );
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") ?? "";
  const body = await request.text().catch(() => null);
  const token = readToken(url, body, contentType);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const limited = await rateLimit(`confirm:${clientIp(request)}`, { limit: 30, windowSeconds: 600 });
  if (!limited.allowed) return rateLimitResponse(limited);

  const result = await confirmContactByToken(createServiceClient(), token);
  if (!result.ok) {
    const status =
      result.state === "error"
        ? 500
        : result.state === "expired"
          ? 410
          : result.state === "not_pending"
            ? 409
            : 404;
    return NextResponse.json({ error: result.state, ok: false }, { status });
  }
  return NextResponse.json({ ok: true, state: result.state });
}
