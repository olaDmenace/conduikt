import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";

// Hosted pages live at {site}.conduikt.site (HOSTED_PAGES_DOMAIN). A request
// on such a host is rewritten onto the public /p/{site}/... routes; every
// other request goes through the Supabase session middleware as before.
const HOSTED_PAGES_DOMAIN = (process.env.HOSTED_PAGES_DOMAIN || "conduikt.site").toLowerCase();

function hostedSiteOf(request: NextRequest): string | null {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!host.endsWith(`.${HOSTED_PAGES_DOMAIN}`)) return null;
  const site = host.slice(0, -(HOSTED_PAGES_DOMAIN.length + 1));
  if (!site || site === "www" || site.includes(".")) return null;
  return site;
}

export async function middleware(request: NextRequest) {
  const site = hostedSiteOf(request);
  if (site) {
    const { pathname } = request.nextUrl;
    if (pathname.startsWith("/p/") || pathname.startsWith("/_next/") || pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/p/${site}` : `/p/${site}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Public hosted pages on conduikt.com need no session.
  if (request.nextUrl.pathname === "/p" || request.nextUrl.pathname.startsWith("/p/")) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
