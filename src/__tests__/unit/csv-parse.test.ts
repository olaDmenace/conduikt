import { describe, it, expect } from "vitest";
import { parseContactsCsv } from "@/src/lib/email/csv-parse";

describe("parseContactsCsv", () => {
  describe("happy paths", () => {
    it("parses a minimal email-only CSV", () => {
      const csv = `email\nalice@example.com\nbob@example.com`;
      const r = parseContactsCsv(csv);
      expect(r.contacts).toHaveLength(2);
      expect(r.contacts[0]).toEqual({ email: "alice@example.com", custom_fields: {} });
      expect(r.errors).toEqual([]);
      expect(r.totalRows).toBe(2);
    });

    it("parses standard ESP-export CSV with names", () => {
      const csv = `email,first_name,last_name\nalice@example.com,Alice,Anderson\nbob@example.com,Bob,Brown`;
      const r = parseContactsCsv(csv);
      expect(r.contacts).toEqual([
        { email: "alice@example.com", first_name: "Alice", last_name: "Anderson", custom_fields: {} },
        { email: "bob@example.com", first_name: "Bob", last_name: "Brown", custom_fields: {} },
      ]);
    });

    it("recognizes header aliases (Email, FirstName, etc.)", () => {
      const csv = `Email,FirstName,LastName\nalice@example.com,Alice,Anderson`;
      const r = parseContactsCsv(csv);
      expect(r.contacts[0]).toEqual({
        email: "alice@example.com",
        first_name: "Alice",
        last_name: "Anderson",
        custom_fields: {},
      });
    });

    it("treats unknown columns as custom_fields", () => {
      const csv = `email,company,plan\nalice@example.com,Acme,enterprise`;
      const r = parseContactsCsv(csv);
      expect(r.contacts[0]).toEqual({
        email: "alice@example.com",
        custom_fields: { company: "Acme", plan: "enterprise" },
      });
    });

    it("handles quoted fields with commas inside", () => {
      const csv = `email,company\nalice@example.com,"Acme, Inc."`;
      const r = parseContactsCsv(csv);
      expect(r.contacts[0].custom_fields).toEqual({ company: "Acme, Inc." });
    });

    it("handles escaped quotes inside quoted fields", () => {
      const csv = `email,company\nalice@example.com,"He said ""hi"""`;
      const r = parseContactsCsv(csv);
      expect(r.contacts[0].custom_fields).toEqual({ company: 'He said "hi"' });
    });

    it("handles \\r\\n line endings (Windows CSV exports)", () => {
      const csv = `email\r\nalice@example.com\r\nbob@example.com\r\n`;
      const r = parseContactsCsv(csv);
      expect(r.contacts).toHaveLength(2);
    });

    it("strips UTF-8 BOM", () => {
      const csv = `﻿email\nalice@example.com`;
      const r = parseContactsCsv(csv);
      expect(r.contacts).toHaveLength(1);
      expect(r.contacts[0].email).toBe("alice@example.com");
    });

    it("normalizes email to lowercase", () => {
      const csv = `email\nALICE@EXAMPLE.COM`;
      const r = parseContactsCsv(csv);
      expect(r.contacts[0].email).toBe("alice@example.com");
    });

    it("dedups within the same file", () => {
      const csv = `email\nalice@example.com\nALICE@example.com\nbob@example.com`;
      const r = parseContactsCsv(csv);
      expect(r.contacts).toHaveLength(2);
      expect(r.contacts.map((c) => c.email)).toEqual(["alice@example.com", "bob@example.com"]);
    });
  });

  describe("error reporting", () => {
    it("rejects CSV with no email column", () => {
      const csv = `name,company\nAlice,Acme`;
      const r = parseContactsCsv(csv);
      expect(r.contacts).toEqual([]);
      expect(r.errors[0].message).toMatch(/no.*email.*column/i);
    });

    it("reports invalid email rows but keeps valid ones", () => {
      const csv = `email\nalice@example.com\nnot-an-email\nbob@example.com`;
      const r = parseContactsCsv(csv);
      expect(r.contacts).toHaveLength(2);
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0].row).toBe(3);
      expect(r.errors[0].message).toMatch(/invalid email/i);
    });

    it("reports empty-email rows", () => {
      const csv = `email,first_name\nalice@example.com,Alice\n,Bob`;
      const r = parseContactsCsv(csv);
      expect(r.contacts).toHaveLength(1);
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0].message).toMatch(/empty email/i);
    });

    it("returns empty result for empty CSV", () => {
      const r = parseContactsCsv("");
      expect(r.contacts).toEqual([]);
      expect(r.totalRows).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("ignores blank trailing rows", () => {
      const csv = `email\nalice@example.com\n\n\n`;
      const r = parseContactsCsv(csv);
      expect(r.contacts).toHaveLength(1);
    });

    it("trims whitespace around values", () => {
      const csv = `email,first_name\n  alice@example.com  ,  Alice  `;
      const r = parseContactsCsv(csv);
      expect(r.contacts[0]).toEqual({
        email: "alice@example.com",
        first_name: "Alice",
        custom_fields: {},
      });
    });

    it("handles single quoted email value", () => {
      const csv = `email\n"alice@example.com"`;
      const r = parseContactsCsv(csv);
      expect(r.contacts[0].email).toBe("alice@example.com");
    });
  });
});
