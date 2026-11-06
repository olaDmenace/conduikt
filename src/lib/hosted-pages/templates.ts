// Three opinionated layouts for hosted pages (docs/audits §5.1): a service
// page, a local landing page, a launch page. Picked from the business type
// and the search phrase; the owner never has to choose.

import type { BusinessType, HostedTemplate } from "@/src/lib/missing-pages/types";

export const TEMPLATES: Record<HostedTemplate, { label: string; description: string }> = {
  service: { label: "Service page", description: "One thing you do, explained and answered" },
  local: { label: "Local page", description: "One thing you do, in one place" },
  launch: { label: "Launch page", description: "Something new, announced and explained" },
};

const LAUNCH_WORDS = /\b(launch\w*|new|announc\w*|introduc\w*|release\w*|now available|beta)\b/i;

export function pickTemplate(businessType: BusinessType, query: string): HostedTemplate {
  if (LAUNCH_WORDS.test(query)) return "launch";
  if (businessType === "local") return "local";
  return "service";
}

export const HOSTED_PAGES_DOMAIN = process.env.HOSTED_PAGES_DOMAIN || "conduikt.site";

/** Where a hosted site lives on the wildcard domain. */
export function hostedSiteUrl(siteSlug: string): string {
  return `https://${siteSlug}.${HOSTED_PAGES_DOMAIN}`;
}

/** The canonical page URL on the wildcard domain. */
export function hostedPageUrl(siteSlug: string, slug: string): string {
  return `${hostedSiteUrl(siteSlug)}/${slug}`;
}

/** The same page on conduikt.com, which works before DNS exists. */
export function hostedPagePath(siteSlug: string, slug?: string): string {
  return slug ? `/p/${siteSlug}/${slug}` : `/p/${siteSlug}`;
}

export function slugify(input: string, max = 60): string {
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return s || "page";
}
