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
  };
}

export type AutomationMode = "check_all" | "social_runs" | "hands_off";

export function automationModeOf(raw: string | null | undefined): AutomationMode {
  return raw === "hands_off" || raw === "social_runs" ? raw : "check_all";
}
