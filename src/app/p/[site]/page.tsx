import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/src/lib/supabase/service";
import { hostedPagePath, hostedSiteUrl } from "@/src/lib/hosted-pages/templates";
import { formatDate } from "@/src/lib/hosted-pages/html";
import type { MissingPageContent } from "@/src/lib/missing-pages/types";

// The index of one hosted site: every published page, newest first.

export const revalidate = 300;

type Params = Promise<{ site: string }>;

async function loadSite(site: string) {
  const supabase = createServiceClient();
  const { data: pages } = await supabase
    .from("hosted_pages")
    .select("slug, title, meta_description, page, project_id, published_at")
    .eq("site_slug", site)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (!pages || pages.length === 0) return null;
  const { data: project } = await supabase.from("projects").select("name, value_proposition, business_location").eq("id", pages[0].project_id).single();
  return { pages, project: project ?? { name: site, value_proposition: null, business_location: null } };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { site } = await params;
  const loaded = await loadSite(site);
  if (!loaded) return { title: "Site not found", robots: { index: false } };
  return {
    title: loaded.project.name,
    description: loaded.project.value_proposition ?? `Pages from ${loaded.project.name}`,
    alternates: { canonical: hostedSiteUrl(site) },
    robots: { index: true, follow: true },
  };
}

export default async function HostedSiteIndex({ params }: { params: Params }) {
  const { site } = await params;
  const loaded = await loadSite(site);
  if (!loaded) notFound();
  const { pages, project } = loaded;

  return (
    <div className="min-h-screen bg-ground text-text">
      <header className="bg-ink text-ink-text">
        <div className="mx-auto max-w-[760px] px-4 py-14 md:px-10 md:py-20">
          {project.business_location && <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-ink-accent">{project.business_location}</p>}
          <h1 className="text-display-m text-ink-text">{project.name}</h1>
          {project.value_proposition && <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-ink-text-2">{project.value_proposition}</p>}
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-4 py-12 md:px-10 md:py-16">
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {pages.map((p) => {
            const content = p.page as MissingPageContent;
            return (
              <li key={p.slug} className="px-4 py-4">
                <a href={hostedPagePath(site, p.slug)} className="text-heading text-text hover:text-accent-hover">
                  {content.h1 || p.title}
                </a>
                <p className="mt-1 text-body text-text-2">{p.meta_description ?? content.metaDescription}</p>
                <p className="mt-2 font-mono text-[11px] text-text-3">Updated on {formatDate(content.updatedOn)}</p>
              </li>
            );
          })}
        </ul>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-4 py-6 font-mono text-[11px] text-text-3 md:px-10">
          <span>{project.name}</span>
          <a href="https://conduikt.com" className="hover:text-text">
            Made with Conduikt
          </a>
        </div>
      </footer>
    </div>
  );
}
