import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServiceClient } from "@/src/lib/supabase/service";

// Social crawlers we want to serve a rich OG card to instead of a 302.
// Matters because some platforms (LinkedIn, WhatsApp, Slack) won't follow
// redirects to find meta tags, so referral links would otherwise share as
// a bare URL with no preview. Humans never hit this branch.
const CRAWLER_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|SkypeUriPreview|Pinterest|vkShare|W3C_Validator|bitlybot|embedly|redditbot|Applebot|Googlebot|Bingbot|DuckDuckBot|YandexBot|Baiduspider/i;

// OG card is identical to the homepage. Canonical + og:url point to
// conduikt.com/ so the preview reads as a direct share of the main site.
// Silent attribution: a recipient clicking the card can't tell from the
// preview that a referral code is attached, which is the whole point —
// people strip suffixes they suspect inflate their price.
const CRAWLER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Conduikt: AI Marketing Automation for SaaS Founders</title>
<meta name="description" content="Conduikt audits your site, generates SEO content, publishes to LinkedIn and X, and produces ready-to-export email sequences. AI marketing automation built for SaaS founders. Start free.">
<link rel="canonical" href="https://conduikt.com/">
<meta name="robots" content="noindex,follow">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_US">
<meta property="og:site_name" content="Conduikt">
<meta property="og:title" content="Conduikt: AI Marketing Automation for SaaS Founders">
<meta property="og:description" content="Conduikt audits your site, generates SEO content, publishes to LinkedIn and X, and produces ready-to-export email sequences. AI marketing automation built for SaaS founders. Start free.">
<meta property="og:url" content="https://conduikt.com/">
<meta property="og:image" content="https://conduikt.com/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Conduikt AI marketing dashboard showing SEO audit, content generation, and multi-channel publishing">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@conduikt">
<meta name="twitter:creator" content="@olayinkafag">
<meta name="twitter:title" content="Conduikt: AI Marketing Automation for SaaS Founders">
<meta name="twitter:description" content="Conduikt audits your site, generates SEO content, publishes to LinkedIn and X, and produces ready-to-export email sequences.">
<meta name="twitter:image" content="https://conduikt.com/og-image.png">
<meta name="twitter:image:alt" content="Conduikt AI marketing dashboard showing SEO audit, content generation, and multi-channel publishing">
</head>
<body>
<noscript><meta http-equiv="refresh" content="0;url=/"></noscript>
<p>Redirecting to <a href="https://conduikt.com/">conduikt.com</a></p>
</body>
</html>`;

// GET /r/{code} — public referral redirect
// Sets a 30-day attribution cookie, logs the click, redirects to landing.
// Social crawlers get an HTML shell with OG tags instead, so shared
// referral links render a proper Conduikt card on X/LinkedIn/WhatsApp.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ua = request.headers.get("user-agent") ?? "";
  if (CRAWLER_UA.test(ua)) {
    return new NextResponse(CRAWLER_HTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

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
