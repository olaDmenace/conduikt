// Renders a hosted page from its JSON. Server-safe (no hooks), so the
// public route and the owner's draft preview share it. Direction C: sand
// ground, one ink band, one orange call to action, 6px radius, no shadows.

import type { HostedTemplate, MissingPageContent, ProjectFacts } from "@/src/lib/missing-pages/types";
import { formatDate } from "./html";

export interface HostedPageViewProps {
  page: MissingPageContent;
  project: Pick<ProjectFacts, "name" | "location" | "phone" | "websiteUrl">;
  template: HostedTemplate;
  jsonLd?: unknown;
  /** Link for the site name in the header (the site's index). */
  siteHref?: string;
  /** Draft preview inside the dashboard: no outer page chrome. */
  embedded?: boolean;
}

function Paragraphs({ body }: { body: string }) {
  return (
    <>
      {body
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="text-body text-text-2">
            {p}
          </p>
        ))}
    </>
  );
}

export function HostedPageView({ page, project, template, jsonLd, siteHref = "/", embedded = false }: HostedPageViewProps) {
  const eyebrow = template === "launch" ? "New" : template === "local" && project.location ? project.location : project.name;
  const telHref = project.phone ? `tel:${project.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className={embedded ? "bg-ground text-text" : "min-h-screen bg-ground text-text"}>
      {jsonLd !== undefined && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}

      <header className="bg-ink text-ink-text">
        <div className="mx-auto max-w-[760px] px-4 py-14 md:px-10 md:py-20">
          <nav className="mb-8 flex items-center justify-between text-sm">
            <a href={siteHref} className="font-medium text-ink-text hover:text-ink-accent">
              {project.name}
            </a>
            {telHref && (
              <a href={telHref} className="font-mono text-[13px] text-ink-text-2 hover:text-ink-accent">
                {project.phone}
              </a>
            )}
          </nav>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-ink-accent">{eyebrow}</p>
          <h1 className="text-display-m text-ink-text">{page.h1}</h1>
          <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-ink-text-2">{page.answer}</p>
          {template === "launch" && (
            <p className="mt-4 font-mono text-[12px] text-ink-text-3">
              Updated on <time dateTime={page.updatedOn}>{formatDate(page.updatedOn)}</time>
            </p>
          )}
          <a
            href={page.cta.href}
            className="mt-8 inline-flex h-12 items-center rounded-md bg-accent px-5 text-[15px] font-medium text-white hover:bg-accent-hover"
          >
            {page.cta.label}
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-4 py-12 md:px-10 md:py-16">
        {page.entitySentence && (
          <p className="mb-10 rounded-md border border-line bg-surface px-4 py-3 text-body text-text">{page.entitySentence}</p>
        )}

        {template === "local" && project.location && (
          <p className="mb-10 font-mono text-[12px] uppercase tracking-wider text-text-3">Serving {project.location}</p>
        )}

        <div className="space-y-10">
          {page.sections.map((s, i) => (
            <section key={i} className="space-y-3">
              <h2 className="text-heading text-text">{s.heading}</h2>
              <Paragraphs body={s.body} />
            </section>
          ))}
        </div>

        {page.faq.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 text-heading text-text">Questions people ask</h2>
            <div className="divide-y divide-line rounded-lg border border-line bg-surface">
              {page.faq.map((f, i) => (
                <details key={i} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none text-body font-medium text-text marker:content-none">{f.q}</summary>
                  <p className="mt-2 text-body text-text-2">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 rounded-lg border border-line bg-surface p-6 md:p-8">
          <p className="text-body text-text">
            {template === "local" && project.location ? `Ready to talk? We are in ${project.location}.` : "Ready when you are."}
          </p>
          <a
            href={page.cta.href}
            className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            {page.cta.label}
          </a>
        </section>

        <p className="mt-10 font-mono text-[12px] text-text-3">
          Updated on <time dateTime={page.updatedOn}>{formatDate(page.updatedOn)}</time>
        </p>
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
