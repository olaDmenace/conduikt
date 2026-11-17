import { isBusinessType, type BusinessType } from "@/src/lib/playbooks";
import { domainOf } from "@/src/lib/integrations/ai-visibility";

// Corroboration tasks (audit 2026-10-24 §5.9 item 5).
//
// Answer engines trust a business more when the same facts appear on
// places they already read: Google's listing, a directory, a review site,
// a company page. This module is the default list of those places per
// playbook, each with a plain one-line reason and the page where the
// owner adds the business. Pure: no runtime imports beyond the playbook
// ids and the domain helper, so the Analytics card can use it too.

export interface CorroborationTaskDef {
  /** Stable key, also the unique column per project. */
  platform: string;
  title: string;
  /** Why it matters, in one line. */
  why: string;
  /** Where the owner adds the business. */
  url: string;
  /** Domains an answer engine would cite for this listing (bare, no www). */
  domains: string[];
}

const T = (
  platform: string,
  title: string,
  why: string,
  url: string,
  domains: string[]
): CorroborationTaskDef => ({ platform, title, why, url, domains });

const GOOGLE_BUSINESS_PROFILE = T(
  "google_business_profile",
  "Google Business Profile",
  "The listing Google Maps and most answer engines read first.",
  "https://business.google.com/create",
  ["google.com", "g.page"]
);

const BING_PLACES = T(
  "bing_places",
  "Bing Places",
  "Feeds Bing and the answers Copilot gives.",
  "https://www.bingplaces.com/",
  ["bing.com", "bingplaces.com"]
);

const APPLE_BUSINESS_CONNECT = T(
  "apple_business_connect",
  "Apple Business Connect",
  "What Apple Maps and Siri show for your business.",
  "https://businessconnect.apple.com/",
  ["apple.com"]
);

const FACEBOOK_PAGE = T(
  "facebook_page",
  "Facebook page",
  "A second place with your name, address and phone that engines check against your site.",
  "https://www.facebook.com/pages/create",
  ["facebook.com"]
);

const NAIRALAND = T(
  "nairaland",
  "Nairaland business listing",
  "Nigeria's biggest forum; answer engines quote it for local recommendations.",
  "https://www.nairaland.com/business",
  ["nairaland.com"]
);

const VCONNECT = T(
  "vconnect",
  "VConnect",
  "A Nigerian business directory that search engines index well.",
  "https://www.vconnect.com/",
  ["vconnect.com"]
);

const FINELIB = T(
  "finelib",
  "Finelib",
  "Another Nigerian directory; one more matching listing adds trust.",
  "https://www.finelib.com/",
  ["finelib.com"]
);

const LINKEDIN_COMPANY = T(
  "linkedin_company",
  "LinkedIn company page",
  "Engines use it to confirm the company exists and who runs it.",
  "https://www.linkedin.com/company/setup/new/",
  ["linkedin.com"]
);

const LINKEDIN_PROFILE = T(
  "linkedin_profile",
  "LinkedIn profile",
  "Confirms who you are and what you do, in your own words.",
  "https://www.linkedin.com/",
  ["linkedin.com"]
);

const G2 = T(
  "g2",
  "G2",
  "The review site answer engines cite most for software picks.",
  "https://www.g2.com/products/new",
  ["g2.com"]
);

const PRODUCT_HUNT = T(
  "product_hunt",
  "Product Hunt",
  "A launch page engines read for what a product is and who made it.",
  "https://www.producthunt.com/posts/new",
  ["producthunt.com"]
);

const CRUNCHBASE = T(
  "crunchbase",
  "Crunchbase",
  "The company record engines use for founders, funding and dates.",
  "https://www.crunchbase.com/add-new",
  ["crunchbase.com"]
);

const ALTERNATIVETO = T(
  "alternativeto",
  "AlternativeTo",
  "Where \"X alternatives\" answers come from.",
  "https://alternativeto.net/",
  ["alternativeto.net"]
);

const REDDIT = T(
  "reddit",
  "Reddit",
  "Engines lean on Reddit threads for honest recommendations; a real presence helps.",
  "https://www.reddit.com/",
  ["reddit.com"]
);

const CLUTCH = T(
  "clutch",
  "Clutch",
  "The agency directory engines quote for \"best agency\" questions.",
  "https://clutch.co/get-listed",
  ["clutch.co"]
);

const SORTLIST = T(
  "sortlist",
  "Sortlist",
  "A second agency directory so two sources agree about you.",
  "https://www.sortlist.com/",
  ["sortlist.com"]
);

const YOUTUBE_CHANNEL = T(
  "youtube_channel",
  "YouTube channel",
  "Engines cite videos for how-to questions; the channel page confirms the name.",
  "https://www.youtube.com/create_channel",
  ["youtube.com", "youtu.be"]
);

const INSTAGRAM = T(
  "instagram",
  "Instagram account",
  "Another place where your name, bio and link match your site.",
  "https://www.instagram.com/",
  ["instagram.com"]
);

const X_PROFILE = T(
  "x_profile",
  "X profile",
  "Engines read X bios and links to confirm who is behind a name.",
  "https://x.com/",
  ["x.com", "twitter.com"]
);

const SUBSTACK = T(
  "substack",
  "Substack or newsletter page",
  "A newsletter archive engines index and quote.",
  "https://substack.com/",
  ["substack.com"]
);

export const DEFAULT_TASKS: Record<BusinessType, CorroborationTaskDef[]> = {
  local: [GOOGLE_BUSINESS_PROFILE, BING_PLACES, APPLE_BUSINESS_CONNECT, FACEBOOK_PAGE, NAIRALAND, VCONNECT, FINELIB],
  saas: [G2, PRODUCT_HUNT, CRUNCHBASE, ALTERNATIVETO, LINKEDIN_COMPANY, REDDIT],
  agency: [GOOGLE_BUSINESS_PROFILE, CLUTCH, SORTLIST, LINKEDIN_COMPANY, FACEBOOK_PAGE, NAIRALAND],
  creator: [YOUTUBE_CHANNEL, INSTAGRAM, X_PROFILE, LINKEDIN_PROFILE, SUBSTACK, REDDIT],
};

/** The default list for a business type. Unknown or missing types count as SaaS. */
export function defaultTasksFor(businessType: BusinessType | string | null | undefined): CorroborationTaskDef[] {
  const type: BusinessType = isBusinessType(businessType) ? businessType : "saas";
  return DEFAULT_TASKS[type].map((t) => ({ ...t, domains: [...t.domains] }));
}

/** Look a task definition up by its platform key, across every playbook. */
export function taskDefFor(platform: string): CorroborationTaskDef | null {
  for (const list of Object.values(DEFAULT_TASKS)) {
    const hit = list.find((t) => t.platform === platform);
    if (hit) return hit;
  }
  return null;
}

/** "maps.google.com" matches "google.com"; "notgoogle.com" does not. */
export function domainMatches(citedDomain: string, platformDomain: string): boolean {
  const a = citedDomain.toLowerCase();
  const b = platformDomain.toLowerCase();
  return a === b || a.endsWith(`.${b}`);
}

/** True when any citation is on one of the task's domains. */
export function isPlatformCited(domains: string[], citations: string[]): boolean {
  for (const c of citations) {
    const d = domainOf(c);
    if (!d) continue;
    if (domains.some((pd) => domainMatches(d, pd))) return true;
  }
  return false;
}

/**
 * For each platform in `platforms`, whether the citations mention it.
 * Platforms with no known definition are reported as false.
 */
export function mentionedPlatforms(platforms: string[], citations: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const p of platforms) {
    const def = taskDefFor(p);
    out[p] = def ? isPlatformCited(def.domains, citations) : false;
  }
  return out;
}

/** The question the "mentioned?" check asks: the business name and where it is. */
export function corroborationQuestion(project: {
  name: string | null;
  city?: unknown;
  business_location?: string | null;
}): string {
  const name = (project.name ?? "").replace(/\s+/g, " ").trim();
  const place = (typeof project.city === "string" && project.city.trim()) || (project.business_location ?? "").trim();
  return [name, place].filter(Boolean).join(" ");
}
