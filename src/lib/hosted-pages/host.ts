// Routing for hosted pages on tenant hosts ({site}.conduikt.site).
//
// A tenant host serves exactly one site: its index, its pages and its
// sitemap, all of which live under /p/{site}/... on the main app. Anything
// else on that host (the dashboard, API routes, another site's /p/ path)
// is not that tenant's and gets a 404, so a subdomain never doubles as a
// mirror of the whole application.

export type HostedRoute =
  | { kind: "pass" }
  | { kind: "rewrite"; pathname: string }
  | { kind: "not_found" }
  | { kind: "main" };

/** The site slug when `host` is a tenant subdomain of `domain`, else null. */
export function hostedSiteOfHost(host: string | null | undefined, domain: string): string | null {
  const h = (host ?? "").split(":")[0].toLowerCase();
  if (!h.endsWith(`.${domain}`)) return null;
  const site = h.slice(0, -(domain.length + 1));
  if (!site || site === "www" || site.includes(".")) return null;
  return site;
}

/** Decide what the middleware does with a request on a tenant host. */
export function resolveHostedRoute(site: string | null, pathname: string): HostedRoute {
  if (!site) return { kind: "main" };
  if (pathname.startsWith("/_next/")) return { kind: "pass" };
  if (pathname === `/p/${site}` || pathname.startsWith(`/p/${site}/`)) return { kind: "pass" };
  if (pathname.startsWith("/p/") || pathname === "/p" || pathname.startsWith("/api/") || pathname === "/api") {
    return { kind: "not_found" };
  }
  return { kind: "rewrite", pathname: pathname === "/" ? `/p/${site}` : `/p/${site}${pathname}` };
}
