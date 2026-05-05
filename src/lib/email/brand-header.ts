// Helpers for stamping the user's brand identity onto outgoing
// sequence emails. Today: just the logo (read from
// profiles.brand_logo_url). Future: brand colour for divider rules,
// custom from-name, etc.
//
// Why prepend at SEND time rather than at AI generation time?
//   1. Retroactive: existing sequences (already-saved drafts that
//      didn't include a logo) automatically pick up the logo on next
//      send.
//   2. Reliable: AI-generated body_html is unpredictable — the agent
//      sometimes positions images badly or skips them entirely.
//      Wrapping at send time guarantees consistent placement.
//   3. Editable: users can update their brand logo in /settings/brand
//      and the next drip email reflects the new logo without
//      regenerating sequences.

const LOGO_MAX_HEIGHT_PX = 48;
const LOGO_MAX_WIDTH_PX = 220;

export interface BrandHeaderInput {
  // Public URL of the logo image. Pass null/undefined to skip the header.
  logoUrl?: string | null;
  // Alt text for the logo. Use the project / brand name when available.
  // Falls back to "Logo" if blank.
  altText?: string | null;
}

// Returns an email-safe HTML <table> block with the logo centered, or
// an empty string when no logo is configured.
//
// Design notes:
// - Uses table-based layout because Outlook (and a few corporate mail
//   clients) still strip non-table block-level layouts.
// - Inline styles only — most clients drop <style> blocks.
// - max-height + width:auto preserves the logo's aspect ratio at the
//   ~48px tall sweet spot for email headers.
// - 24px bottom padding gives the body content air without an extra
//   <hr>; the body's existing top margin handles the rest.
export function buildBrandHeader(input: BrandHeaderInput): string {
  const url = (input.logoUrl ?? "").trim();
  if (!url) return "";
  const alt = (input.altText ?? "").trim() || "Logo";
  // Conservative escaping for the alt + URL (single-quoted attr values)
  const safeUrl = url.replace(/'/g, "%27");
  const safeAlt = alt.replace(/'/g, "&#39;").replace(/</g, "&lt;");
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 24px 0;">
  <tr>
    <td style="padding:0 0 16px 0;text-align:center;">
      <img src='${safeUrl}' alt='${safeAlt}' style="max-height:${LOGO_MAX_HEIGHT_PX}px;width:auto;max-width:${LOGO_MAX_WIDTH_PX}px;display:inline-block;border:0;outline:none;" />
    </td>
  </tr>
</table>
`;
}

// Prepends the brand header (if any) to the AI-generated body HTML.
// If the body already has a <body> opening tag, the header is inserted
// just inside it; otherwise it goes at the very start. This keeps the
// header inside the document body for clients that strip content
// outside <body>.
export function prependBrandHeader(
  html: string,
  input: BrandHeaderInput
): string {
  const header = buildBrandHeader(input);
  if (!header) return html;
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (m) => `${m}\n${header}`);
  }
  return `${header}${html}`;
}
