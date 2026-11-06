import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";
import { hostedSiteOfHost, resolveHostedRoute } from "@/src/lib/hosted-pages/host";

// Hosted pages live at {site}.conduikt.site (HOSTED_PAGES_DOMAIN). A request
// on such a host is rewritten onto that site's public /p/{site}/... routes;
// the rest of the app (API, dashboard, other sites' pages) is not served
// there. Every other request goes through the Supabase session middleware.
const HOSTED_PAGES_DOMAIN = (process.env.HOSTED_PAGES_DOMAIN || "conduikt.site").toLowerCase();

export async function middleware(request: NextRequest) {
  const site = hostedSiteOfHost(request.headers.get("host"), HOSTED_PAGES_DOMAIN);
  const route = resolveHostedRoute(site, request.nextUrl.pathname);
  if (route.kind === "pass") return NextResponse.next();
  if (route.kind === "not_found") return new NextResponse("Not found", { status: 404 });
  if (route.kind === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = route.pathname;
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
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
