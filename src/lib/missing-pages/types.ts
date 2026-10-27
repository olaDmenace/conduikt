// Shared shapes for Missing Pages.

export type BusinessType = "saas" | "local" | "ecommerce" | "creator" | "agency" | "other";

/** The plain facts about a project the agents are allowed to use. */
export interface ProjectFacts {
  id: string;
  name: string;
  websiteUrl: string | null;
  businessType: BusinessType;
  /** What the business sells or does: ["emergency plumbing", "drain cleaning"] */
  services: string[];
  /** "Lekki, Lagos" or null for a business that is not place-bound */
  location: string | null;
  description: string | null;
  valueProposition: string | null;
  /** Who it is for: ["SaaS founders", "small bakeries"] */
  audience: string[];
  competitors: string[];
  /** Industry or product category: "project management software" */
  category: string | null;
  phone?: string | null;
  email?: string | null;
  /** Social and directory links for schema sameAs */
  sameAs?: string[];
}

export interface PageSection {
  heading: string;
  body: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

/** The page the Missing Page agent writes: answer-first, plain words. */
export interface MissingPageContent {
  title: string;
  metaDescription: string;
  h1: string;
  /** Who / what / where in one sentence. */
  entitySentence: string;
  /** Two-sentence direct answer shown right under the h1. */
  answer: string;
  sections: PageSection[];
  faq: FaqItem[];
  cta: { label: string; href: string };
  /** ISO date (YYYY-MM-DD) */
  updatedOn: string;
  /** For kind 'update': three bullets on what changed. */
  changes?: string[];
}

export type CandidateKind = "new" | "update";

export interface GapMatch {
  query: string;
  matchedUrl: string | null;
  /** 0..1 lexical overlap */
  matchScore: number;
  strength: "strong" | "weak" | "none";
}

export interface ScoredCandidate {
  query: string;
  kind: CandidateKind;
  matchedUrl: string | null;
  matchScore: number;
  monthlySearches: number | null;
  competition: "low" | "medium" | "high" | null;
  estimated: boolean;
  score: number;
}

export type HostedTemplate = "service" | "local" | "launch";
