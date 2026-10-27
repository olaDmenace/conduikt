// Small HTML helpers shared by the crawler and the answer-readiness check.
// Regex-based on purpose: no DOM parser is installed, and the four or five
// fields we read don't justify one (same approach as onboarding/magic-audit).

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Strip tags from an HTML fragment and collapse whitespace. */
export function textOf(fragment: string): string {
  return decodeEntities(fragment.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function matchFirst(source: string, re: RegExp): string | null {
  const m = source.match(re);
  return m?.[1] ?? null;
}

export function extractTitle(html: string): string | null {
  const t = matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  return t ? textOf(t) || null : null;
}

export function extractMetaDescription(html: string): string | null {
  // Backreferenced quote so apostrophes inside the content don't end it.
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=(["'])((?:(?!\1)[\s\S])*)\1/i) ||
    html.match(/<meta[^>]+content=(["'])((?:(?!\1)[\s\S])*)\1[^>]*name=["']description["']/i);
  return m?.[2] ? decodeEntities(m[2].trim()) : null;
}

export function extractH1(html: string): string | null {
  const h = matchFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h ? textOf(h) || null : null;
}

/** All h1–h3 texts in document order. */
export function extractHeadings(html: string): string[] {
  const out: string[] = [];
  const re = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const t = textOf(m[2]);
    if (t) out.push(t);
  }
  return out;
}

/** Visible body text: scripts, styles, nav and footer removed. */
export function extractVisibleText(html: string, max = 1500): string {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  return textOf(body).slice(0, max);
}

/** Every href on the page, raw (not yet resolved). */
export function extractHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*?\shref\s*=\s*(["'])(.*?)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[2]) out.push(decodeEntities(m[2].trim()));
  }
  return out;
}

/** Parsed <script type="application/ld+json"> blocks; invalid JSON is skipped. */
export function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      // malformed block: ignore
    }
  }
  return out;
}
