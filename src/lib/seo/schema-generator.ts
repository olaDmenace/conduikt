// JSON-LD builders. Pure functions: hand them facts, get back objects that
// serialise straight into <script type="application/ld+json">. Used by
// hosted pages and offered as paste-ready snippets for external sites.

import type { FaqItem, MissingPageContent, ProjectFacts } from "@/src/lib/missing-pages/types";

const CONTEXT = "https://schema.org";

export interface PostalAddressInput {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

export interface LocalBusinessInput {
  name: string;
  url: string;
  description?: string;
  phone?: string | null;
  email?: string | null;
  address?: PostalAddressInput | string | null;
  areaServed?: string | string[] | null;
  sameAs?: string[] | null;
  /** Schema.org subtype, e.g. "Plumber", "Dentist". Defaults to LocalBusiness. */
  type?: string;
}

function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as T;
}

function addressOf(address: LocalBusinessInput["address"]) {
  if (!address) return undefined;
  if (typeof address === "string") return { "@type": "PostalAddress", addressLocality: address };
  return compact({ "@type": "PostalAddress", ...address });
}

export function localBusiness(input: LocalBusinessInput) {
  return compact({
    "@type": input.type ?? "LocalBusiness",
    "@id": `${input.url.replace(/\/$/, "")}/#business`,
    name: input.name,
    url: input.url,
    description: input.description,
    telephone: input.phone ?? undefined,
    email: input.email ?? undefined,
    address: addressOf(input.address),
    areaServed: input.areaServed ?? undefined,
    sameAs: input.sameAs ?? undefined,
  });
}

export interface OrganizationInput {
  name: string;
  url: string;
  description?: string;
  logo?: string;
  email?: string | null;
  sameAs?: string[] | null;
}

export function organization(input: OrganizationInput) {
  return compact({
    "@type": "Organization",
    "@id": `${input.url.replace(/\/$/, "")}/#organization`,
    name: input.name,
    url: input.url,
    description: input.description,
    logo: input.logo,
    email: input.email ?? undefined,
    sameAs: input.sameAs ?? undefined,
  });
}

export interface ServiceInput {
  name: string;
  /** Reference to the business/organization node: { "@id": ... } or a name */
  provider: { "@id": string } | string;
  areaServed?: string | string[] | null;
  description?: string;
  url?: string;
}

export function service(input: ServiceInput) {
  return compact({
    "@type": "Service",
    name: input.name,
    serviceType: input.name,
    provider: typeof input.provider === "string" ? { "@type": "Organization", name: input.provider } : input.provider,
    areaServed: input.areaServed ?? undefined,
    description: input.description,
    url: input.url,
  });
}

export function faqPage(faq: FaqItem[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export interface ArticleInput {
  headline: string;
  url: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  author: { "@id": string } | string;
  publisher?: { "@id": string } | string;
}

export function article(input: ArticleInput) {
  const person = (p: { "@id": string } | string) => (typeof p === "string" ? { "@type": "Organization", name: p } : p);
  return compact({
    "@type": "Article",
    headline: input.headline,
    url: input.url,
    description: input.description,
    datePublished: input.datePublished ?? input.dateModified,
    dateModified: input.dateModified,
    author: person(input.author),
    publisher: input.publisher ? person(input.publisher) : undefined,
    mainEntityOfPage: input.url,
  });
}

export interface WebPageInput {
  name: string;
  url: string;
  description?: string;
  dateModified?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  isPartOf?: { "@id": string };
  about?: { "@id": string };
}

export function webPage(input: WebPageInput) {
  const nodes: Record<string, unknown>[] = [
    compact({
      "@type": "WebPage",
      "@id": `${input.url}#webpage`,
      name: input.name,
      url: input.url,
      description: input.description,
      dateModified: input.dateModified,
      isPartOf: input.isPartOf,
      about: input.about,
      breadcrumb: input.breadcrumbs && input.breadcrumbs.length > 0 ? { "@id": `${input.url}#breadcrumb` } : undefined,
    }),
  ];
  if (input.breadcrumbs && input.breadcrumbs.length > 0) {
    nodes.push({
      "@type": "BreadcrumbList",
      "@id": `${input.url}#breadcrumb`,
      itemListElement: input.breadcrumbs.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        item: b.url,
      })),
    });
  }
  return nodes;
}

/** Wrap nodes into one graph document. */
export function graph(nodes: Array<Record<string, unknown> | Record<string, unknown>[]>) {
  return { "@context": CONTEXT, "@graph": nodes.flat() };
}

/** The right graph for a hosted page, by business type. */
export function pageJsonLd(
  page: MissingPageContent,
  project: ProjectFacts,
  opts: { pageUrl: string; siteUrl: string; serviceName?: string | null; template?: "service" | "local" | "launch" }
) {
  const siteUrl = opts.siteUrl.replace(/\/$/, "");
  const isLocal = project.businessType === "local";
  const entity = isLocal
    ? localBusiness({
        name: project.name,
        url: siteUrl,
        description: project.valueProposition ?? project.description ?? undefined,
        phone: project.phone,
        email: project.email,
        address: project.location,
        areaServed: project.location,
        sameAs: project.sameAs,
      })
    : organization({
        name: project.name,
        url: siteUrl,
        description: project.valueProposition ?? project.description ?? undefined,
        email: project.email,
        sameAs: project.sameAs,
      });
  const entityId = entity["@id"] as string;

  const nodes: Array<Record<string, unknown> | Record<string, unknown>[]> = [entity];
  if (opts.serviceName) {
    nodes.push(service({ name: opts.serviceName, provider: { "@id": entityId }, areaServed: project.location, description: page.answer, url: opts.pageUrl }));
  }
  nodes.push(
    webPage({
      name: page.title,
      url: opts.pageUrl,
      description: page.metaDescription,
      dateModified: page.updatedOn,
      about: { "@id": entityId },
      breadcrumbs: [
        { name: project.name, url: siteUrl },
        { name: page.h1, url: opts.pageUrl },
      ],
    })
  );
  if (page.faq.length > 0) nodes.push(faqPage(page.faq));
  if (opts.template === "launch") {
    nodes.push(article({ headline: page.h1, url: opts.pageUrl, description: page.metaDescription, dateModified: page.updatedOn, author: { "@id": entityId }, publisher: { "@id": entityId } }));
  }
  return graph(nodes);
}
