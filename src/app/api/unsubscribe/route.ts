import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { unsubscribeContactByToken } from "@/src/lib/email/unsubscribe";

// Handles unsubscribe requests from two sources:
//
// 1. Human click — the /unsubscribe page renders a confirm button that
//    POSTs here with form data. We update status, then redirect back to
//    the confirmation page with ?done=1.
//
// 2. RFC 8058 one-click List-Unsubscribe — the user's mail client
//    auto-POSTs here without rendering the page. Triggered by the
//    `List-Unsubscribe` and `List-Unsubscribe-Post` headers we set on
//    sequence emails. No redirect, just a 200 ack.
//
// We use the service-role client because the request is unauthenticated:
// the only credential is the per-contact unsubscribe_token in the
// audience_contacts row.

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token");

  if (!token) {
    // Fallback: form-encoded body (manual button on the page).
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = await request.text();
      const params = new URLSearchParams(body);
      token = params.get("token");
    } else if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => ({}))) as { token?: string };
      token = typeof body.token === "string" ? body.token : null;
    }
  }

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const result = await unsubscribeContactByToken(supabase, token);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Unsubscribe failed" },
      { status: 400 }
    );
  }

  // One-click path: tell the mail client we're done.
  const isOneClick = (request.headers.get("user-agent") ?? "").length > 0
    && !request.headers.get("referer");

  // Mail clients sending one-click expect a 2xx with no body. Browser
  // form posts get redirected to a friendly confirmation page.
  if (isOneClick) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(
    new URL(`/unsubscribe?token=${encodeURIComponent(token)}&done=1`, request.url),
    { status: 303 }
  );
}
