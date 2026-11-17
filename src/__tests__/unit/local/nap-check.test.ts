import { describe, it, expect } from "vitest";
import {
  addressPattern,
  buildNapReport,
  nameVariantsOn,
  normaliseAddress,
  normaliseName,
  normalisePhoneDigits,
  phoneCandidates,
  samePhone,
  structuredBusinesses,
  type NapPage,
} from "@/src/lib/local/nap-check";

const input = {
  name: "Lekki Dental Care",
  phone: "0803 123 4567",
  address_line: "12 Admiralty Way",
  city: "Lekki",
};

function page(url: string, body: string, opts: { title?: string; headings?: string[]; jsonLd?: unknown } = {}): NapPage {
  const ld = opts.jsonLd ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>` : "";
  const html = `<html><head><title>${opts.title ?? ""}</title>${ld}</head><body>${body}</body></html>`;
  return {
    url,
    title: opts.title ?? null,
    headings: opts.headings ?? [],
    textExcerpt: body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500),
    html,
  };
}

describe("normalisers", () => {
  it("normalisePhoneDigits treats local and international Nigerian numbers as one", () => {
    expect(normalisePhoneDigits("0803 123 4567")).toBe("2348031234567");
    expect(normalisePhoneDigits("+234 803 123 4567")).toBe("2348031234567");
    expect(normalisePhoneDigits("+234 (0) 803-123-4567")).toBe("2348031234567");
    expect(normalisePhoneDigits("00234 803 123 4567")).toBe("2348031234567");
    expect(normalisePhoneDigits("12")).toBeNull();
    expect(normalisePhoneDigits(null)).toBeNull();
  });

  it("samePhone accepts a local form that ends the international one", () => {
    expect(samePhone("2348031234567", "2348031234567")).toBe(true);
    expect(samePhone("8031234567", "2348031234567")).toBe(true);
    expect(samePhone("2348031234567", "2348099999999")).toBe(false);
    expect(samePhone(null, "2348031234567")).toBe(false);
  });

  it("normaliseName keeps letters and digits only", () => {
    expect(normaliseName("Lekki Dental Care Ltd.")).toBe("lekkidentalcareltd");
    expect(normaliseName("Smith & Sons")).toBe("smithandsons");
  });

  it("normaliseAddress shortens street words and drops punctuation", () => {
    expect(normaliseAddress("12, Admiralty Street")).toBe("12 admiralty st");
    expect(normaliseAddress("No. 12 Admiralty St.")).toBe("no 12 admiralty st");
    expect(normaliseAddress("Suite 4B, 12 Admiralty Road")).toBe("ste 4b 12 admiralty rd");
  });

  it("addressPattern matches however the address is punctuated or abbreviated", () => {
    const re = addressPattern("12 Admiralty Street")!;
    for (const s of ["12 Admiralty Street", "12, ADMIRALTY ST.", "12 Admiralty St, Lekki"]) {
      re.lastIndex = 0;
      expect(re.test(s), s).toBe(true);
    }
    re.lastIndex = 0;
    expect(re.test("120 Admiralty Street")).toBe(false);
    expect(addressPattern("   ")).toBeNull();
  });
});

describe("per-page extraction", () => {
  it("finds phone numbers in tel: links and in text, ignoring years and prices", () => {
    const p = page("https://x.test/contact", `<a href="tel:+2348031234567">Call</a> or 0803 123 4567. Est. 2004. Price 15,000. Order 1234567890.`);
    const found = phoneCandidates(p).map((c) => c.raw);
    expect(found).toContain("+2348031234567");
    expect(found).toContain("0803 123 4567");
    expect(found).not.toContain("2004");
    expect(found).not.toContain("15,000");
    expect(found).not.toContain("1234567890");
  });

  it("marks a number that only appears in a tel: href as not visible text", () => {
    const p = page("https://x.test/contact", `<a href="tel:08031234567">0803 123 4567</a> or <a href="tel:+2348050001111">WhatsApp</a>. Fax 0805 000 1111.`);
    const found = phoneCandidates(p);
    expect(found).toContainEqual({ raw: "08031234567", fromHref: true });
    expect(found).toContainEqual({ raw: "0803 123 4567", fromHref: false });
    expect(found).toContainEqual({ raw: "+2348050001111", fromHref: true });
    expect(found).toContainEqual({ raw: "0805 000 1111", fromHref: false });
  });

  it("treats a value seen in both a tel: href and the text as visible", () => {
    const p = page("https://x.test/contact", `<a href="tel:+2348031234567">+2348031234567</a>`);
    expect(phoneCandidates(p)).toEqual([{ raw: "+2348031234567", fromHref: false }]);
  });

  it("collects every distinct spelling of the business name", () => {
    const p = page("https://x.test/", `<h1>Lekki Dental Care</h1><p>Welcome to LEKKI DENTAL CARE, the lekki-dental care team.</p>`, {
      headings: ["Lekki Dental Care"],
    });
    const variants = nameVariantsOn(p, "Lekki Dental Care");
    expect(variants).toContain("Lekki Dental Care");
    expect(variants).toContain("LEKKI DENTAL CARE");
    expect(variants.some((v) => /lekki-dental care/i.test(v))).toBe(true);
    expect(nameVariantsOn(page("https://x.test/a", "Welcome to Lekki Dental Careers"), "Lekki Dental Care")).toEqual([]);
  });
});

describe("structured data", () => {
  it("reads LocalBusiness and Organization nodes, including inside @graph", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: "ignored" },
        {
          "@type": "Dentist",
          name: "Lekki Dental Care",
          telephone: "+234 803 123 4567",
          address: { "@type": "PostalAddress", streetAddress: "12 Admiralty Way", addressLocality: "Lekki" },
        },
      ],
    })}</script><script type="application/ld+json">{ "@type": "Organization", "name": "Lekki Dental" }</script>`;
    const biz = structuredBusinesses(html);
    expect(biz.map((b) => b.type)).toEqual(["Dentist", "Organization"]);
    expect(biz[0]).toMatchObject({ telephone: "+234 803 123 4567", streetAddress: "12 Admiralty Way", addressLocality: "Lekki" });
  });
});

describe("buildNapReport", () => {
  const NOW = new Date("2026-11-17T09:00:00Z");

  it("reports a consistent site as consistent with no issues", () => {
    const pages = [
      page(
        "https://x.test/",
        `<h1>Lekki Dental Care</h1><p>Visit us at 12 Admiralty Way, Lekki. Call <a href="tel:08031234567">0803 123 4567</a>.</p>`,
        {
          title: "Lekki Dental Care",
          jsonLd: {
            "@type": "LocalBusiness",
            name: "Lekki Dental Care",
            telephone: "0803 123 4567",
            address: { streetAddress: "12 Admiralty Way", addressLocality: "Lekki" },
          },
        }
      ),
      page("https://x.test/contact", `<p>Lekki Dental Care, 12 Admiralty Way, Lekki. Phone: 0803 123 4567</p>`),
    ];
    const report = buildNapReport(input, pages, NOW);
    expect(report.checked_at).toBe(NOW.toISOString());
    expect(report.pages_checked).toBe(2);
    expect(report.name).toMatchObject({ consistent: true, variants: ["Lekki Dental Care"] });
    expect(report.name.found_on).toEqual(["https://x.test/", "https://x.test/contact"]);
    expect(report.phone).toMatchObject({ consistent: true, variants: ["0803 123 4567"], other_numbers: [] });
    expect(report.address).toMatchObject({ consistent: true, variants: ["12 Admiralty Way"] });
    expect(report.address.city_found_on).toHaveLength(2);
    expect(report.structured_data).toMatchObject({ found: true, types: ["LocalBusiness"], name_matches: true, phone_matches: true, address_matches: true });
    expect(report.issues).toEqual([]);
  });

  it("does not count a tel: href as a second spelling of the phone number", () => {
    // The common real-world markup: unspaced digits in the href, the
    // readable form as the link text. One visible spelling, so consistent.
    const pages = [
      page("https://x.test/", `<p>Lekki Dental Care. Call <a href="tel:08031234567">0803 123 4567</a> or <a href="tel:+2348031234567">WhatsApp us</a>.</p>`),
    ];
    const report = buildNapReport(input, pages, NOW);
    expect(report.phone.found_on).toEqual(["https://x.test/"]);
    expect(report.phone.variants).toEqual(["0803 123 4567"]);
    expect(report.phone.consistent).toBe(true);
    expect(report.phone.other_numbers).toEqual([]);
    expect(report.issues).not.toContain("Your phone number is written 2 different ways.");
  });

  it("still finds the phone when it is only in a tel: href, with no extra variant", () => {
    const pages = [page("https://x.test/", `<p>Lekki Dental Care. <a href="tel:08031234567">Call us</a>.</p>`)];
    const report = buildNapReport(input, pages, NOW);
    expect(report.phone.found_on).toEqual(["https://x.test/"]);
    expect(report.phone.variants).toEqual(["0803 123 4567"]);
    expect(report.phone.consistent).toBe(true);
  });

  it("flags the variants when the phone is written two ways and the address once differently", () => {
    const pages = [
      page("https://x.test/", `<p>Lekki Dental Care. Call 0803 123 4567.</p>`),
      page("https://x.test/about", `<p>Lekki Dental Care, 12, Admiralty Way. WhatsApp +234 803 123 4567. Also try 0805 000 1111.</p>`),
    ];
    const report = buildNapReport(input, pages, NOW);
    expect(report.phone.consistent).toBe(false);
    expect(report.phone.variants).toEqual(["0803 123 4567", "+234 803 123 4567"]);
    expect(report.phone.found_on).toEqual(["https://x.test/", "https://x.test/about"]);
    expect(report.phone.other_numbers).toEqual(["0805 000 1111"]);
    expect(report.address.consistent).toBe(false);
    expect(report.address.variants).toEqual(["12 Admiralty Way", "12, Admiralty Way"]);
    expect(report.address.found_on).toEqual(["https://x.test/about"]);
    expect(report.issues).toContain("Your phone number is written 2 different ways.");
    expect(report.issues).toContain("Another phone number appears on your site.");
    expect(report.issues).toContain("Your address is written 2 different ways.");
    expect(report.issues).toContain("No page tells Google what kind of business this is (no business structured data).");
    expect(report.structured_data.found).toBe(false);
  });

  it("says when a detail is missing from every page, and when structured data disagrees", () => {
    const pages = [
      page("https://x.test/", `<h1>Lekki Dental Care</h1><p>Book online.</p>`, {
        jsonLd: { "@type": "Organization", name: "Lekki Dental Clinic", telephone: "+234 809 000 0000" },
      }),
    ];
    const report = buildNapReport(input, pages, NOW);
    expect(report.phone.consistent).toBe(false);
    expect(report.phone.found_on).toEqual([]);
    expect(report.address.found_on).toEqual([]);
    expect(report.structured_data).toMatchObject({ found: true, name_matches: false, phone_matches: false, address_matches: null });
    expect(report.issues).toContain("Your phone number isn't on any page we checked.");
    expect(report.issues).toContain("Your address isn't on any page we checked.");
    expect(report.issues).toContain("The business name in your structured data doesn't match.");
    expect(report.issues).toContain("The phone number in your structured data doesn't match.");
  });

  it("skips fields the owner left blank and copes with no pages", () => {
    const report = buildNapReport({ name: "Lekki Dental Care" }, [], NOW);
    expect(report.pages_checked).toBe(0);
    expect(report.phone).toMatchObject({ expected: null, consistent: false, variants: [], other_numbers: [] });
    expect(report.address).toMatchObject({ expected: null, consistent: false, city_found_on: [] });
    expect(report.issues).toEqual(["We couldn't read any pages on your website."]);
  });
});
