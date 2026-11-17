import { createServiceClient } from "@/src/lib/supabase/service";
import { renderLlmsTxt, type LlmsPageRow } from "@/src/lib/hosted-pages/llms";
import { factsFromProject, type ProjectRow } from "@/src/lib/missing-pages/facts";

// llms.txt for one hosted site: the business facts and every published
// page (title, address, one line). On the wildcard host this is served at
// {site}.conduikt.site/llms.txt through the middleware rewrite, the same
// way sitemap.xml is.

export const revalidate = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const supabase = createServiceClient();
  const { data: pages } = await supabase
    .from("hosted_pages")
    .select("slug, title, meta_description, page, project_id")
    .eq("site_slug", site)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (!pages || pages.length === 0) return new Response("Not found", { status: 404 });

  const { data: project } = await supabase.from("projects").select("*").eq("id", pages[0].project_id).single();
  if (!project) return new Response("Not found", { status: 404 });

  const text = renderLlmsTxt(site, factsFromProject(project as ProjectRow), pages as LlmsPageRow[]);
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
