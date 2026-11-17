// Turn a projects row into the plain facts the agents may use. Tolerant of
// the row's history: target_audience and competitors have been strings,
// arrays and objects at different times; business_type may be null.

import type { BusinessType, ProjectFacts } from "./types";

export interface ProjectRow {
  id: string;
  name: string;
  website_url?: string | null;
  description?: string | null;
  business_description?: string | null;
  industry?: string | null;
  value_proposition?: string | null;
  target_audience?: unknown;
  competitors?: unknown;
  business_type?: string | null;
  automation_mode?: string | null;
  business_location?: string | null;
  services?: unknown;
  wants_hosted_page?: boolean | null;
  missing_pages_enabled?: boolean | null;
  positioning_statement?: string | null;
  phone?: string | null;
  contact_email?: string | null;
  social_links?: unknown;
  // Added by the 20261117 project-profile migration; read defensively so
  // the code works before and after it lands.
  address_line?: unknown;
  city?: unknown;
  booking_url?: unknown;
  review_url?: unknown;
}

const TYPES: BusinessType[] = ["saas", "local", "ecommerce", "creator", "agency", "other"];

export function businessTypeOf(raw: string | null | undefined): BusinessType {
  const t = (raw ?? "").toLowerCase();
  return (TYPES as string[]).includes(t) ? (t as BusinessType) : "saas";
}

function strings(value: unknown, pick?: (o: Record<string, unknown>) => unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(/[,\n;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : v && typeof v === "object" ? (pick?.(v as Record<string, unknown>) ?? (v as { name?: unknown }).name) : null))
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
  }
  if (typeof value === "object") {
    const o = value as { personas?: unknown; name?: unknown };
    if (Array.isArray(o.personas)) return strings(o.personas);
    if (typeof o.name === "string") return [o.name];
  }
  return [];
}

/** A trimmed string from a column that may not exist yet (or hold junk). */
function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalUrl(value: unknown): string | null {
  const s = optionalText(value);
  return s && /^https?:\/\//i.test(s) ? s : null;
}

export function factsFromProject(row: ProjectRow): ProjectFacts {
  const businessType = businessTypeOf(row.business_type);
  const services = strings(row.services);
  const sameAs = strings(row.social_links, (o) => o.url).filter((s) => /^https?:\/\//.test(s));
  return {
    id: row.id,
    name: row.name,
    websiteUrl: row.website_url?.trim() || null,
    businessType,
    services,
    location: row.business_location?.trim() || null,
    description: row.business_description?.trim() || row.description?.trim() || null,
    valueProposition: row.value_proposition?.trim() || null,
    audience: strings(row.target_audience).slice(0, 5),
    competitors: strings(row.competitors).slice(0, 6),
    category: row.industry?.trim() || null,
    phone: row.phone?.trim() || null,
    email: row.contact_email?.trim() || null,
    sameAs,
    address: optionalText(row.address_line),
    city: optionalText(row.city),
    bookingUrl: optionalUrl(row.booking_url),
    reviewUrl: optionalUrl(row.review_url),
  };
}

/** Shown when a run has nothing to read and nothing to look for. */
export const NOTHING_TO_CHECK_MESSAGE = "Add what you offer in Settings so we know what to look for.";

/**
 * A run needs a site to read or a list of services to build searches
 * from. With neither, every search would be an estimate about nothing.
 */
export function hasSomethingToCheck(facts: Pick<ProjectFacts, "websiteUrl" | "services">): boolean {
  return Boolean(facts.websiteUrl) || facts.services.length > 0;
}

/** The address a map can find: street first, then city, then the broader place. */
export function mapAddressOf(facts: Pick<ProjectFacts, "address" | "city" | "location">): string | null {
  const parts = [facts.address, facts.city, facts.location].map((p) => p?.trim() ?? "").filter(Boolean);
  if (parts.length === 0) return null;
  // "Lekki" inside "Lekki, Lagos": keep the broader one only once.
  const unique = parts.filter((p, i) => !parts.slice(i + 1).some((later) => later.toLowerCase().includes(p.toLowerCase())));
  return unique.join(", ");
}

/** A phone number as a tel: link (digits and a leading + only), or null. */
export function telHrefOf(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 6 ? `tel:${digits}` : null;
}

/**
 * Where a page's button should go when the writer left it at "#contact":
 * the booking link, else a call, else the contact anchor.
 */
export function ctaFallbackHref(facts: Pick<ProjectFacts, "bookingUrl" | "phone">): string {
  return facts.bookingUrl ?? telHrefOf(facts.phone) ?? "#contact";
}

export type AutomationMode = "check_all" | "social_runs" | "hands_off";

export function automationModeOf(raw: string | null | undefined): AutomationMode {
  return raw === "hands_off" || raw === "social_runs" ? raw : "check_all";
}
