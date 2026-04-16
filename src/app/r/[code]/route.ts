import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServiceClient } from "@/src/lib/supabase/service";

// GET /r/{code} — public referral redirect
// Sets a 30-day attribution cookie, logs the click, redirects to landing.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createServiceClient();

  const { data: link } = await supabase
    .from("referral_links")
    .select("id, active")
    .eq("code", code)
    .maybeSingle();

  // Unknown or inactive → send to landing without attribution
  const origin = new URL(request.url).origin;
  const raw = request.nextUrl.searchParams.get("to") ?? "/";
  const redirectTo = new URL(raw, origin);
  // Block open redirects
  if (redirectTo.origin !== new URL(origin).origin) {
    return NextResponse.redirect(new URL("/", origin));
  }
  const response = NextResponse.redirect(redirectTo);

  if (!link || !link.active) {
    return response;
  }

  // Log click fire-and-forget
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "";
  const ipHash = ip
    ? createHash("sha256").update(ip).digest("hex").slice(0, 32)
    : null;

  supabase
    .from("referral_clicks")
    .insert({
      referral_link_id: link.id,
      ip_hash: ipHash,
      user_agent: request.headers.get("user-agent") ?? null,
      referer: request.headers.get("referer") ?? null,
      country: request.headers.get("x-vercel-ip-country") ?? null,
    })
    .then(() => {});

  // 30-day attribution cookie
  response.cookies.set("conduikt_ref", code, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  return response;
}
