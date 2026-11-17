// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ctaFallbackHref, factsFromProject, hasSomethingToCheck, mapAddressOf, telHrefOf } from "./facts";

const base = { id: "p1", name: "Lekki Plumbers", business_type: "local", business_location: "Lekki, Lagos", services: ["emergency plumbing"] };

describe("factsFromProject (project profile columns)", () => {
  it("reads address, city, booking and review links when the columns exist", () => {
    const facts = factsFromProject({ ...base, address_line: " 12 Admiralty Way ", city: "Lekki", booking_url: "https://book.lekki.ng", review_url: "https://g.page/r/lekki/review", phone: "0800 000 0000" });
    expect(facts.address).toBe("12 Admiralty Way");
    expect(facts.city).toBe("Lekki");
    expect(facts.bookingUrl).toBe("https://book.lekki.ng");
    expect(facts.reviewUrl).toBe("https://g.page/r/lekki/review");
  });

  it("is quiet when the columns are missing, empty or junk", () => {
    const facts = factsFromProject({ ...base, booking_url: "not a link", city: "", address_line: 42 });
    expect(facts.address).toBeNull();
    expect(facts.city).toBeNull();
    expect(facts.bookingUrl).toBeNull();
    expect(facts.reviewUrl).toBeNull();
  });
});

describe("hasSomethingToCheck", () => {
  it("needs a website or at least one service", () => {
    expect(hasSomethingToCheck({ websiteUrl: null, services: [] })).toBe(false);
    expect(hasSomethingToCheck({ websiteUrl: "https://lekki.ng", services: [] })).toBe(true);
    expect(hasSomethingToCheck({ websiteUrl: null, services: ["plumbing"] })).toBe(true);
  });
});

describe("mapAddressOf", () => {
  it("joins street, city and place without repeating a place the broader one contains", () => {
    expect(mapAddressOf({ address: "12 Admiralty Way", city: "Lekki", location: "Lekki, Lagos" })).toBe("12 Admiralty Way, Lekki, Lagos");
    expect(mapAddressOf({ address: null, city: null, location: "Lekki, Lagos" })).toBe("Lekki, Lagos");
    expect(mapAddressOf({ address: null, city: "Ikeja", location: "Lagos" })).toBe("Ikeja, Lagos");
    expect(mapAddressOf({ address: null, city: null, location: null })).toBeNull();
  });
});

describe("ctaFallbackHref", () => {
  it("prefers the booking link, then a call, then the contact anchor", () => {
    expect(ctaFallbackHref({ bookingUrl: "https://book.lekki.ng", phone: "0800 000 0000" })).toBe("https://book.lekki.ng");
    expect(ctaFallbackHref({ bookingUrl: null, phone: "+234 800-000 0000" })).toBe("tel:+2348000000000");
    expect(ctaFallbackHref({ bookingUrl: null, phone: null })).toBe("#contact");
    expect(telHrefOf("12")).toBeNull();
  });
});
