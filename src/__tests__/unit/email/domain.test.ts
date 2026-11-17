import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  normalizeDomainStatus,
  normalizeLocalPart,
  normalizeRecordStatus,
} from "@/src/lib/email/domain";

describe("normalizeDomain", () => {
  it("accepts a bare domain and a subdomain", () => {
    expect(normalizeDomain("example.com")).toEqual({ ok: true, domain: "example.com" });
    expect(normalizeDomain("mail.example.co.uk")).toEqual({ ok: true, domain: "mail.example.co.uk" });
  });

  it("lowercases and strips protocol, path, port and trailing dot", () => {
    expect(normalizeDomain(" HTTPS://Mail.Example.com:443/path?x=1 ")).toEqual({ ok: true, domain: "mail.example.com" });
    expect(normalizeDomain("example.com.")).toEqual({ ok: true, domain: "example.com" });
  });

  it("rejects email addresses with a helpful message", () => {
    const out = normalizeDomain("hello@example.com");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/not an email address/);
  });

  it("rejects empty, single-label, numeric and bad-label input", () => {
    for (const bad of ["", "localhost", "127.0.0.1", "exa mple.com", "-bad.com", "bad-.com", "example.c0m"]) {
      expect(normalizeDomain(bad).ok).toBe(false);
    }
  });

  it("rejects Conduikt's own domains", () => {
    for (const bad of ["conduikt.com", "mail.conduikt.com", "contacts.conduikt.com", "x.resend.dev"]) {
      const out = normalizeDomain(bad);
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/Conduikt/);
    }
  });
});

describe("normalizeLocalPart", () => {
  it("defaults to hello", () => {
    expect(normalizeLocalPart("")).toEqual({ ok: true, localPart: "hello" });
    expect(normalizeLocalPart(undefined)).toEqual({ ok: true, localPart: "hello" });
  });
  it("lowercases and allows dots, dashes, underscores", () => {
    expect(normalizeLocalPart(" News.Team_1-a ")).toEqual({ ok: true, localPart: "news.team_1-a" });
  });
  it("rejects spaces, @ and leading punctuation", () => {
    for (const bad of ["he llo", "a@b", ".dot", "x".repeat(65)]) {
      expect(normalizeLocalPart(bad).ok).toBe(false);
    }
  });
});

describe("status normalisers", () => {
  it("collapses Resend record statuses", () => {
    expect(normalizeRecordStatus("verified")).toBe("verified");
    expect(normalizeRecordStatus("temporary_failure")).toBe("failed");
    expect(normalizeRecordStatus("not_started")).toBe("not_started");
    expect(normalizeRecordStatus("pending")).toBe("pending");
    expect(normalizeRecordStatus(undefined)).toBe("pending");
  });
  it("collapses Resend domain statuses to the three we store", () => {
    expect(normalizeDomainStatus("verified")).toBe("verified");
    expect(normalizeDomainStatus("failed")).toBe("failed");
    expect(normalizeDomainStatus("not_started")).toBe("pending");
    expect(normalizeDomainStatus(null)).toBe("pending");
  });
});
