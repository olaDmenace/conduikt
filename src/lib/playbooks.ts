// Playbooks: one engine, four kinds of business (audit 2026-10-24 §4.1).
//
// A playbook is configuration, not code. The business type chosen in the
// new-project wizard sets the default channels, which agents the first-week
// pack runs and in what order, the search-intent seeds Missing Pages starts
// from, the questions the wizard asks, and the pricing note shown.
//
// This module is pure and has no runtime imports, so the wizard (a client
// component) can use it without pulling in the agent registry.

import type { FirstWeekAgentId } from "@/src/lib/first-week/plan";

export const BUSINESS_TYPES = ["saas", "local", "agency", "creator"] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

/** Where a project publishes. Ids match the platform keys used elsewhere. */
export type Channel =
  | "x"
  | "linkedin"
  | "blog"
  | "email"
  | "gbp"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "hosted_pages";

export interface PlaybookQuestion {
  id: string;
  question: string;
  multi?: boolean;
  options: string[];
}

export interface Playbook {
  id: BusinessType;
  /** Shown on the wizard card. */
  label: string;
  /** One plain line under the label. */
  blurb: string;
  defaultChannels: Channel[];
  /** Subset of FIRST_WEEK_AGENT_IDS, in the order the pack runs them. */
  firstWeekAgentIds: FirstWeekAgentId[];
  /** Search-intent templates Missing Pages starts from. {service}, {location}, {product} etc. are filled from the project. */
  intentSeeds: string[];
  /** The adaptive questionnaire (wizard step 3). */
  questions: PlaybookQuestion[];
  pricingNote: string;
}

// Shared questions, in the order the wizard asks them. "Who is this project
// for?" is gone: the business-type card answers it.
const contentCreation: PlaybookQuestion = {
  id: "content_creation",
  question: "What are you currently using for content creation?",
  options: ["Nothing yet", "ChatGPT / Claude", "Jasper / Copy.ai", "A marketing agency", "In-house team"],
};

const biggestChallenge: PlaybookQuestion = {
  id: "biggest_challenge",
  question: "What's your biggest marketing challenge right now?",
  options: [
    "Getting more traffic",
    "Converting visitors into customers",
    "Staying consistent with content",
    "Not enough time to do it all",
    "Don't know where to start",
  ],
};

const gscStatus: PlaybookQuestion = {
  id: "gsc_status",
  question: "Is Google Search Console set up for your site?",
  options: ["Yes, it's connected", "Yes but I haven't set it up", "No", "What's Google Search Console?"],
};

const gbpStatus: PlaybookQuestion = {
  id: "gbp_status",
  question: "Is your business on Google Maps (a Google Business Profile)?",
  options: ["Yes, and I keep it updated", "Yes, but I rarely touch it", "No", "Not sure"],
};

const contentOutput: PlaybookQuestion = {
  id: "content_output",
  question: "How would you describe your current content output?",
  options: [
    "Zero — starting from scratch",
    "Occasional posts (less than weekly)",
    "Weekly content",
    "Daily / multiple times a week",
  ],
};

function activeChannels(options: string[]): PlaybookQuestion {
  return {
    id: "active_channels",
    question: "Which channels are you actively posting on?",
    multi: true,
    options,
  };
}

export const PLAYBOOKS: Record<BusinessType, Playbook> = {
  saas: {
    id: "saas",
    label: "SaaS or online product",
    blurb: "Software, an app, or anything people sign up for online.",
    defaultChannels: ["x", "linkedin", "blog", "email"],
    // Today's pack, in today's order. A test keeps this equal to FIRST_WEEK_AGENT_IDS.
    firstWeekAgentIds: [
      "seo-audit",
      "social-content",
      "keyword-research",
      "copywriting",
      "page-cro",
      "email-sequence",
      "content-strategy",
      "posting-plan",
      "competitor-analysis",
      "blog-post",
      "growth-playbook",
      "launch-strategy",
      "video-ad",
      "ab-test-setup",
      "programmatic-seo",
    ],
    intentSeeds: [
      "{product} pricing",
      "{product} alternative",
      "{product} vs {competitor}",
      "{category} for {audience}",
      "how to {job}",
      "best {category} tools",
    ],
    questions: [
      contentCreation,
      activeChannels(["X (Twitter)", "LinkedIn", "Email newsletter", "Blog", "None yet"]),
      biggestChallenge,
      gscStatus,
      contentOutput,
    ],
    pricingNote: "Priced in dollars.",
  },
  local: {
    id: "local",
    label: "Local service business",
    blurb: "You serve customers in a city or area: cleaning, repairs, clinics, salons, food.",
    defaultChannels: ["gbp", "whatsapp", "instagram", "hosted_pages"],
    firstWeekAgentIds: [
      "programmatic-seo",
      "seo-audit",
      "social-content",
      "keyword-research",
      "copywriting",
      "page-cro",
      "email-sequence",
      "content-strategy",
      "posting-plan",
      "competitor-analysis",
      "blog-post",
      "growth-playbook",
      "launch-strategy",
    ],
    intentSeeds: [
      "{service} near me",
      "{service} prices",
      "emergency {service}",
      "same-day {service}",
      "best {service} in {location}",
      "free estimate {service}",
      "{service} in {location}",
    ],
    questions: [
      contentCreation,
      activeChannels(["Google Business Profile", "WhatsApp", "Instagram", "Facebook", "None yet"]),
      biggestChallenge,
      gbpStatus,
      contentOutput,
    ],
    pricingNote: "Priced in naira soon.",
  },
  agency: {
    id: "agency",
    label: "Agency or freelancer",
    blurb: "You market other people's businesses. One project per client, reports you can send them.",
    defaultChannels: ["x", "linkedin", "instagram", "facebook", "blog", "email", "gbp", "whatsapp", "hosted_pages"],
    firstWeekAgentIds: [
      "seo-audit",
      "competitor-analysis",
      "keyword-research",
      "content-strategy",
      "social-content",
      "copywriting",
      "page-cro",
      "email-sequence",
      "posting-plan",
      "blog-post",
      "growth-playbook",
      "launch-strategy",
      "video-ad",
      "ab-test-setup",
      "programmatic-seo",
    ],
    intentSeeds: [
      "{service} agency in {location}",
      "{service} for {audience}",
      "hire {service} freelancer",
      "{service} pricing",
      "best {service} agency",
    ],
    questions: [
      contentCreation,
      activeChannels(["X (Twitter)", "LinkedIn", "Instagram", "Facebook", "Email newsletter", "Blog", "None yet"]),
      biggestChallenge,
      gscStatus,
      contentOutput,
    ],
    pricingNote: "One plan covers every client project.",
  },
  creator: {
    id: "creator",
    label: "Creator or coach",
    blurb: "You are the brand: courses, coaching, a newsletter, a channel.",
    defaultChannels: ["instagram", "x", "email", "blog"],
    firstWeekAgentIds: [
      "social-content",
      "posting-plan",
      "email-sequence",
      "blog-post",
      "seo-audit",
      "keyword-research",
      "copywriting",
      "content-strategy",
      "competitor-analysis",
      "growth-playbook",
      "launch-strategy",
      "video-ad",
    ],
    intentSeeds: [
      "{topic} course",
      "{topic} coach",
      "how to {job}",
      "{topic} for beginners",
      "{name} newsletter",
      "best {topic} creators to follow",
    ],
    questions: [
      contentCreation,
      activeChannels(["Instagram", "X (Twitter)", "YouTube", "TikTok", "Email newsletter", "Blog", "None yet"]),
      biggestChallenge,
      gscStatus,
      contentOutput,
    ],
    pricingNote: "Priced in dollars.",
  },
};

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && (BUSINESS_TYPES as readonly string[]).includes(value);
}

/** The playbook for a project. Old rows have no business type and count as SaaS. */
export function playbookFor(businessType: BusinessType | string | null | undefined): Playbook {
  return isBusinessType(businessType) ? PLAYBOOKS[businessType] : PLAYBOOKS.saas;
}

/** Wizard answer labels to channel ids. Labels not listed here (e.g. "None yet") add nothing. */
const CHANNEL_BY_LABEL: Record<string, Channel> = {
  "X (Twitter)": "x",
  "X/Twitter": "x",
  X: "x",
  LinkedIn: "linkedin",
  "Email newsletter": "email",
  "Email newsletters": "email",
  Email: "email",
  Blog: "blog",
  "Google Business Profile": "gbp",
  WhatsApp: "whatsapp",
  Instagram: "instagram",
  Facebook: "facebook",
  TikTok: "tiktok",
  YouTube: "youtube",
};

/**
 * The channels a project should start with: the playbook's defaults first,
 * then anything the owner said they already post on. Order is stable and
 * nothing repeats.
 */
export function resolveChannels(
  playbook: Playbook,
  answers: Record<string, string | string[] | undefined> | null | undefined
): Channel[] {
  const out: Channel[] = [...playbook.defaultChannels];
  const raw = answers?.active_channels;
  const picked = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  for (const label of picked) {
    const id = CHANNEL_BY_LABEL[label];
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}
