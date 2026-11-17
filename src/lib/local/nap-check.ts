// Name, address and phone consistency check ("NAP" in the trade; the UI
// says "Check your details are consistent").
//
// Google and the AI answer engines trust a local business more when its
// name, address and phone number read the same everywhere. This module
// takes the details saved on the project and the pages we crawled, and
// reports, for each of the three: which pages carry it, every different
// spelling seen, and whether that is consistent. It also reads any
// LocalBusiness / Organization structured data on the pages and says
// whether those values match.
//
// Pure functions first (unit tested with fixture pages); runNapCheck at
// the bottom does the crawl. No model call anywhere.

import { crawlSite, type CrawledPage } from "@/src/lib/crawl/site-crawler";
import { extractJsonLd, textOf } from "@/src/lib/crawl/html";

export interface NapInput {
  name: string;
  phone?: string | null;
  address_line?: string | null;
  city?: string | null;
}

/** The subset of CrawledPage the check reads. */
export type NapPage = Pick<CrawledPage, "url" | "title" | "headings" | "textExcerpt"> & { html?: string };

export interface NapFieldReport {
  /** What the project settings say, or null when the owner left it blank. */
  expected: string | null;
  /** Pages where a matching value appears. */
  found_on: string[];
  /** Every distinct way it is written, the saved value first. */
  variants: string[];
  /** Found somewhere, and written one way only. */
  consistent: boolean;
}

export interface NapPhoneReport extends NapFieldReport {
  /** Other phone numbers seen on the site that are not this one. */
  other_numbers: string[];
}

export interface NapAddressReport extends NapFieldReport {
  /** Pages that mention the city (when one is saved). */
  city_found_on: string[];
}

export interface NapStructuredData {
  /** Some LocalBusiness / Organization structured data exists. */
  found: boolean;
  pages: string[];
  types: string[];
  /** null when the structured data (or the saved value) has nothing to compare. */
  name_matches: boolean | null;
  phone_matches: boolean | null;
  address_matches: boolean | null;
}

export interface NapReport {
  checked_at: string;
  pages_checked: number;
  name: NapFieldReport;
  phone: NapPhoneReport;
  address: NapAddressReport;
  structured_data: NapStructuredData;
  /** Plain one-liners for the UI, worst first. Empty when all is well. */
  issues: string[];
}

export const NAP_MAX_PAGES = 30;

// ---------------------------------------------------------------------------
// Normalisers
// ---------------------------------------------------------------------------

/** Collapse whitespace; the "as written" form we show as a variant. */
export function tidy(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Letters and digits only, lower case: "Acme Plumbing Ltd." -> "acmeplumbingltd". */
export function normaliseName(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
}

/**
 * Digits only, international without the plus. Nigerian local numbers
 * ("0803 123 4567") get the 234 code so they compare equal to "+234 803
 * 123 4567". Returns null when it cannot be a phone number.
 */
export function normalisePhoneDigits(raw: string | null | undefined, defaultCountryCode = "234"): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);
  digits = digits.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  } else if (digits.startsWith("0")) {
    digits = `${defaultCountryCode}${digits.replace(/^0+/, "")}`;
  } else if (digits.length === 10 && defaultCountryCode === "234") {
    digits = `234${digits}`;
  } else if (digits.startsWith(`${defaultCountryCode}0`) && digits.length === defaultCountryCode.length + 11) {
    // "+234 (0) 803 123 4567": the trunk zero was kept after the country code.
    digits = `${defaultCountryCode}${digits.slice(defaultCountryCode.length + 1)}`;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** The same number written two ways: equal digits, or one is the local form of the other. */
export function samePhone(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const short = a.length < b.length ? a : b;
  const long = a.length < b.length ? b : a;
  return short.length >= 7 && long.endsWith(short);
}

const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  street: "st",
  road: "rd",
  avenue: "ave",
  av: "ave",
  boulevard: "blvd",
  drive: "dr",
  lane: "ln",
  close: "cl",
  crescent: "cres",
  court: "ct",
  place: "pl",
  square: "sq",
  suite: "ste",
  floor: "fl",
  building: "bldg",
  apartment: "apt",
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  number: "no",
  "#": "no",
};

/** Lower case, abbreviations expanded to their short form, punctuation gone. */
export function normaliseAddress(s: string): string {
  return s
    .toLowerCase()
    .replace(/[#]/g, " no ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => ADDRESS_ABBREVIATIONS[w] ?? w)
    .join(" ")
    .trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A regex that finds the saved address in page text however it is
 * punctuated or abbreviated ("12 Admiralty Way" matches "12, Admiralty
 * Way", "12 ADMIRALTY WAY" and "12 admiralty wy" does not).
 */
export function addressPattern(addressLine: string): RegExp | null {
  const words = normaliseAddress(addressLine).split(" ").filter(Boolean);
  if (words.length === 0) return null;
  const parts = words.map((w) => {
    const longForms = Object.entries(ADDRESS_ABBREVIATIONS)
      .filter(([, short]) => short === w)
      .map(([long]) => long)
      .filter((long) => /^[a-z]+$/.test(long));
    const alts = [w, ...longForms].map(escapeRe);
    return `(?:${alts.join("|")})\\.?`;
  });
  return new RegExp(`\\b${parts.join("[\\s,.\\-/]+")}\\b`, "gi");
}

// ---------------------------------------------------------------------------
// Per-page extraction
// ---------------------------------------------------------------------------

export interface PhoneCandidate {
  /** As written. */
  raw: string;
  /**
   * True when this spelling appears only inside a tel: href and never in
   * the visible text. Hrefs are machine-formatted ("tel:08031234567"), so
   * they count for matching but are not a spelling the visitor sees.
   */
  fromHref: boolean;
}

/** Phone-looking strings on a page: tel: links first, then the text. */
export function phoneCandidates(page: NapPage): PhoneCandidate[] {
  // raw -> fromHref. Text wins: a value seen both in an href and on the
  // page is a visible spelling.
  const out = new Map<string, boolean>();
  if (page.html) {
    const re = /href\s*=\s*["']tel:([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(page.html)) !== null) {
      let decoded = m[1];
      try {
        decoded = decodeURIComponent(m[1]);
      } catch {
        // Malformed escape; use the href as written.
      }
      const raw = tidy(decoded);
      if (normalisePhoneDigits(raw) && !out.has(raw)) out.set(raw, true);
    }
  }
  const text = pageText(page);
  const re = /(?:\+|00)?\d[\d\s().\- ]{6,18}\d/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = tidy(m[0].replace(/ /g, " "));
    const digits = raw.replace(/\D/g, "");
    // 10 to 15 digits, and written like a phone number (leading + or 0,
    // or grouped) so years, prices and order numbers stay out.
    if (digits.length < 10 || digits.length > 15) continue;
    if (!/^(?:\+|0)/.test(raw) && !/[\s().-]/.test(raw)) continue;
    if (normalisePhoneDigits(raw)) out.set(raw, false);
  }
  return [...out].map(([raw, fromHref]) => ({ raw, fromHref }));
}

/** Everything readable on the page, including the parts the excerpt cut. */
export function pageText(page: NapPage): string {
  const parts = [page.title ?? "", ...page.headings, page.textExcerpt];
  if (page.html) {
    const body = page.html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ");
    parts.push(textOf(body));
  }
  return parts.join(" \n ");
}

/** Every distinct way the business name is written on the page. */
export function nameVariantsOn(page: NapPage, name: string): string[] {
  const words = tidy(name).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const re = new RegExp(`(?<![a-z0-9])${words.map(escapeRe).join("[\\s\\-]*")}(?![a-z0-9])`, "gi");
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const text = pageText(page);
  while ((m = re.exec(text)) !== null) out.add(tidy(m[0]));
  return [...out];
}

/** Every distinct way the street address is written on the page. */
export function addressVariantsOn(page: NapPage, addressLine: string): string[] {
  const re = addressPattern(addressLine);
  if (!re) return [];
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const text = pageText(page);
  while ((m = re.exec(text)) !== null) out.add(tidy(m[0]));
  return [...out];
}

function mentions(page: NapPage, needle: string): boolean {
  const n = normaliseName(needle);
  return n.length > 0 && normaliseName(pageText(page)).includes(n);
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

const BUSINESS_TYPE_RE = /(business|organization|organisation|store|shop|restaurant|dentist|physician|attorney|salon|hotel|school|church|gym|clinic|hospital|pharmacy|bakery|cafe|bar|agency|company|corporation|ngo)$/i;

export interface StructuredBusiness {
  type: string;
  name: string | null;
  telephone: string | null;
  streetAddress: string | null;
  addressLocality: string | null;
}

function typesOf(node: Record<string, unknown>): string[] {
  const t = node["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

function str(v: unknown): string | null {
  if (typeof v === "string") return tidy(v) || null;
  if (v && typeof v === "object" && typeof (v as { name?: unknown }).name === "string") return tidy((v as { name: string }).name) || null;
  return null;
}

/** Every LocalBusiness / Organization-like node in a page's JSON-LD, @graph included. */
export function structuredBusinesses(html: string): StructuredBusiness[] {
  const out: StructuredBusiness[] = [];
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 6) return;
    if (Array.isArray(node)) {
      for (const n of node) visit(n, depth + 1);
      return;
    }
    const obj = node as Record<string, unknown>;
    const types = typesOf(obj);
    const businessType = types.find((t) => BUSINESS_TYPE_RE.test(t));
    if (businessType) {
      const address = obj.address;
      const addr = address && typeof address === "object" && !Array.isArray(address) ? (address as Record<string, unknown>) : null;
      out.push({
        type: businessType,
        name: str(obj.name),
        telephone: str(obj.telephone),
        streetAddress: addr ? str(addr.streetAddress) : typeof address === "string" ? tidy(address) : null,
        addressLocality: addr ? str(addr.addressLocality) : null,
      });
    }
    for (const key of ["@graph", "mainEntity", "publisher", "provider", "author", "itemListElement"]) {
      if (key in obj) visit(obj[key], depth + 1);
    }
  };
  for (const block of extractJsonLd(html)) visit(block, 0);
  return out;
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

function fieldReport(expected: string | null, foundOn: string[], seen: Set<string>): NapFieldReport {
  const variants = expected ? [tidy(expected), ...[...seen].filter((v) => v !== tidy(expected))] : [...seen];
  return {
    expected: expected ? tidy(expected) : null,
    found_on: foundOn,
    variants,
    consistent: foundOn.length > 0 && variants.length <= 1,
  };
}

export function buildNapReport(input: NapInput, pages: NapPage[], now: Date = new Date()): NapReport {
  const name = tidy(input.name ?? "");
  const phone = input.phone ? tidy(input.phone) : null;
  const phoneDigits = normalisePhoneDigits(phone);
  const addressLine = input.address_line ? tidy(input.address_line) : null;
  const city = input.city ? tidy(input.city) : null;

  const nameFound: string[] = [];
  const nameSeen = new Set<string>();
  const phoneFound: string[] = [];
  const phoneSeen = new Set<string>();
  const otherNumbers = new Map<string, string>(); // digits -> as written
  const addressFound: string[] = [];
  const addressSeen = new Set<string>();
  const cityFound: string[] = [];

  const sdPages: string[] = [];
  const sdTypes = new Set<string>();
  let sdName: boolean | null = null;
  let sdPhone: boolean | null = null;
  let sdAddress: boolean | null = null;

  for (const page of pages) {
    if (name) {
      const v = nameVariantsOn(page, name);
      if (v.length > 0) {
        nameFound.push(page.url);
        v.forEach((x) => nameSeen.add(x));
      }
    }

    const candidates = phoneCandidates(page);
    let matched = false;
    for (const { raw, fromHref } of candidates) {
      const digits = normalisePhoneDigits(raw);
      if (phoneDigits && samePhone(digits, phoneDigits)) {
        matched = true;
        // A tel: href is how the link dials, not how the number is
        // written on the page, so it counts as found but not as a variant.
        if (!fromHref) phoneSeen.add(raw);
      } else if (digits && !otherNumbers.has(digits)) {
        otherNumbers.set(digits, raw);
      }
    }
    if (matched) phoneFound.push(page.url);

    if (addressLine) {
      const v = addressVariantsOn(page, addressLine);
      if (v.length > 0) {
        addressFound.push(page.url);
        v.forEach((x) => addressSeen.add(x));
      }
    }
    if (city && mentions(page, city)) cityFound.push(page.url);

    if (page.html) {
      for (const biz of structuredBusinesses(page.html)) {
        if (!sdPages.includes(page.url)) sdPages.push(page.url);
        sdTypes.add(biz.type);
        if (name && biz.name) {
          const ok = normaliseName(biz.name) === normaliseName(name);
          sdName = sdName === null ? ok : sdName && ok;
        }
        if (phoneDigits && biz.telephone) {
          const ok = samePhone(normalisePhoneDigits(biz.telephone), phoneDigits);
          sdPhone = sdPhone === null ? ok : sdPhone && ok;
        }
        if (addressLine && biz.streetAddress) {
          const ok = normaliseAddress(biz.streetAddress).includes(normaliseAddress(addressLine));
          sdAddress = sdAddress === null ? ok : sdAddress && ok;
        }
      }
    }
  }

  // A tidy-equal variant is one spelling; keep the saved form first so the
  // UI can say "you saved X, your site says Y".
  const nameReport = fieldReport(name || null, nameFound, nameSeen);
  const phoneReport: NapPhoneReport = {
    ...fieldReport(phone, phoneFound, phoneSeen),
    other_numbers: [...otherNumbers.values()].slice(0, 10),
  };
  const addressReport: NapAddressReport = {
    ...fieldReport(addressLine, addressFound, addressSeen),
    city_found_on: cityFound,
  };

  const structured: NapStructuredData = {
    found: sdPages.length > 0,
    pages: sdPages,
    types: [...sdTypes],
    name_matches: sdName,
    phone_matches: sdPhone,
    address_matches: sdAddress,
  };

  const issues: string[] = [];
  if (pages.length === 0) issues.push("We couldn't read any pages on your website.");
  if (phone) {
    if (phoneFound.length === 0) issues.push("Your phone number isn't on any page we checked.");
    else if (phoneReport.variants.length > 1) issues.push(`Your phone number is written ${phoneReport.variants.length} different ways.`);
  }
  if (phoneReport.other_numbers.length > 0) {
    issues.push(`${phoneReport.other_numbers.length === 1 ? "Another phone number appears" : `${phoneReport.other_numbers.length} other phone numbers appear`} on your site.`);
  }
  if (addressLine) {
    if (addressFound.length === 0) issues.push("Your address isn't on any page we checked.");
    else if (addressReport.variants.length > 1) issues.push(`Your address is written ${addressReport.variants.length} different ways.`);
  }
  if (name && pages.length > 0) {
    if (nameFound.length === 0) issues.push("Your business name isn't on any page we checked.");
    else if (nameReport.variants.length > 1) issues.push(`Your business name is written ${nameReport.variants.length} different ways.`);
  }
  if (pages.length > 0 && !structured.found) issues.push("No page tells Google what kind of business this is (no business structured data).");
  if (structured.name_matches === false) issues.push("The business name in your structured data doesn't match.");
  if (structured.phone_matches === false) issues.push("The phone number in your structured data doesn't match.");
  if (structured.address_matches === false) issues.push("The address in your structured data doesn't match.");

  return {
    checked_at: now.toISOString(),
    pages_checked: pages.length,
    name: nameReport,
    phone: phoneReport,
    address: addressReport,
    structured_data: structured,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface RunNapCheckOptions {
  maxPages?: number;
  /** Test seam, passed through to the crawler. */
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
}

/** Crawl the site (at most NAP_MAX_PAGES) and build the report. */
export async function runNapCheck(siteUrl: string, input: NapInput, opts: RunNapCheckOptions = {}): Promise<NapReport> {
  const maxPages = Math.max(1, Math.min(NAP_MAX_PAGES, opts.maxPages ?? NAP_MAX_PAGES));
  const crawl = await crawlSite(siteUrl, { maxPages, keepHtml: true, fetchImpl: opts.fetchImpl });
  return buildNapReport(input, crawl.pages);
}
