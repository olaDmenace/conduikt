// Small CSV parser for contact imports. Handles:
//   - Comma separator (no auto-detect — must be CSV)
//   - Double-quote wrapped values with embedded commas
//   - Embedded "" inside quoted values (CSV escape for ")
//   - \n and \r\n line endings
//   - BOM stripping
//   - Trailing empty rows
//
// Doesn't handle: tab/semicolon separators, single-quote wrapping, escape
// chars other than "". For RFC 4180 corner cases beyond this, papaparse
// is the right tool — but for typical "exported list from Mailchimp" or
// "one column of emails" CSVs, this is enough and adds zero dependencies.

export interface ParsedContact {
  email: string;
  first_name?: string;
  last_name?: string;
  custom_fields: Record<string, string>;
}

export interface ParseResult {
  contacts: ParsedContact[];
  errors: { row: number; message: string }[];
  totalRows: number;
}

const KNOWN_HEADERS = new Map<string, "email" | "first_name" | "last_name">([
  ["email", "email"],
  ["e-mail", "email"],
  ["email_address", "email"],
  ["mail", "email"],
  ["first_name", "first_name"],
  ["firstname", "first_name"],
  ["first", "first_name"],
  ["fname", "first_name"],
  ["given_name", "first_name"],
  ["last_name", "last_name"],
  ["lastname", "last_name"],
  ["last", "last_name"],
  ["lname", "last_name"],
  ["surname", "last_name"],
  ["family_name", "last_name"],
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tokenise a single CSV row into raw string values, handling quoted fields.
 */
function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          // Escaped quote inside quoted field.
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      current += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      fields.push(current);
      current = "";
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  fields.push(current);
  return fields;
}

/**
 * Split CSV text into rows, respecting quoted fields that contain newlines.
 * Returns rows in original order, including a trailing empty row removed.
 */
function splitRows(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      current += ch;
      i++;
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      // Consume \r\n as one line break
      if (ch === "\r" && text[i + 1] === "\n") i++;
      rows.push(current);
      current = "";
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  if (current.length > 0) rows.push(current);
  return rows.filter((r) => r.trim().length > 0);
}

export function parseContactsCsv(rawText: string): ParseResult {
  // Strip UTF-8 BOM if present.
  const text = rawText.replace(/^﻿/, "");
  const rows = splitRows(text);
  if (rows.length === 0) {
    return { contacts: [], errors: [], totalRows: 0 };
  }

  // First row is the header.
  const headers = parseRow(rows[0]).map((h) => h.trim().toLowerCase());
  const headerMap = headers.map((h) => KNOWN_HEADERS.get(h) ?? null);

  const emailIdx = headerMap.indexOf("email");
  if (emailIdx === -1) {
    return {
      contacts: [],
      errors: [{ row: 1, message: "No 'email' column found. Add a column named 'email' and try again." }],
      totalRows: rows.length - 1,
    };
  }

  const contacts: ParsedContact[] = [];
  const errors: { row: number; message: string }[] = [];
  const seen = new Set<string>(); // dedup within the file

  for (let r = 1; r < rows.length; r++) {
    const fields = parseRow(rows[r]);
    const email = (fields[emailIdx] ?? "").trim().toLowerCase();

    if (!email) {
      errors.push({ row: r + 1, message: "Empty email" });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      errors.push({ row: r + 1, message: `Invalid email: ${email}` });
      continue;
    }
    if (seen.has(email)) {
      // Quiet de-dup; not an error worth reporting per row.
      continue;
    }
    seen.add(email);

    const contact: ParsedContact = { email, custom_fields: {} };
    for (let c = 0; c < headers.length; c++) {
      const known = headerMap[c];
      const value = (fields[c] ?? "").trim();
      if (!value) continue;
      if (known === "email") continue;
      if (known === "first_name") {
        contact.first_name = value;
      } else if (known === "last_name") {
        contact.last_name = value;
      } else {
        // Unknown header → goes into custom_fields under the header name.
        contact.custom_fields[headers[c]] = value;
      }
    }

    contacts.push(contact);
  }

  return { contacts, errors, totalRows: rows.length - 1 };
}
