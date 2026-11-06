import { createServiceClient } from "@/src/lib/supabase/service";
import { hostedPageUrl, hostedSiteUrl } from "@/src/lib/hosted-pages/templates";

// Sitemap for one hosted site. On the wildcard host this is served at
// {site}.conduikt.site/sitemap.xml through the middleware rewrite.

export const revalidate = 300;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(_request: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const supabase = createServiceClient();
  const { data: pages } = await supabase
    .from("hosted_pages")
    .select("slug, updated_at, published_at")
    .eq("site_slug", site)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (!pages || pages.length === 0) return new Response("Not found", { status: 404 });

  const urls = [
    `<url><loc>${esc(hostedSiteUrl(site))}</loc><lastmod>${new Date(pages[0].updated_at as string).toISOString()}</lastmod></url>`,
    ...pages.map((p) => `<url><loc>${esc(hostedPageUrl(site, p.slug as string))}</loc><lastmod>${new Date(p.updated_at as string).toISOString()}</lastmod></url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
