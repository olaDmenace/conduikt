# Conduikt — Pitch Deck

15-slide pitch deck for the **Lithuanian Startup Visa committee** (submitted via Dealum).

Built with [Slidev](https://sli.dev). Single Markdown source, brand-matched to conduikt.com, exports to PDF.

## Run locally (live preview)

```bash
cd pitch-deck
npm install
npm run dev
```

Opens at <http://localhost:3030>. Hot reload on edits to `slides.md`.

## Export to PDF

```bash
npm run export
```

Produces `conduikt-pitch-deck.pdf` in this directory. Upload that to Dealum.

The first export run downloads Playwright Chromium (~150MB) — subsequent runs are instant.

## Refresh product screenshots

```bash
npm run screenshots
```

Captures public marketing pages from conduikt.com into `public/screenshots/`. The dashboard / agent screenshots are placeholders — replace them with authenticated captures manually before final export.

## File map

- `slides.md` — slide content. Edit this.
- `style.css` — brand colours, typography, layout overrides. Matches conduikt.com.
- `public/screenshots/` — product screenshots used in the Product Demo slide.
- `public/conduikt-icon.png` — logo on title slide.
- `scripts/capture-screenshots.mjs` — Playwright script for public-page captures.

## Slide structure

1. **Title** — Conduikt + founder + date
2. **Problem** — fragmented marketing tools, 60–80% of SMB marketing time on repetitive work
3. **Solution** — multi-agent platform that closes the loop
4. **Product demo** — agent playground, SEO audit, campaign builder
5. **Market** — $15B+ TAM, AI marketing fastest-growing segment
6. **Why now** — Claude 4 maturity, MCP standard, SMB margin pressure
7. **Business model** — Free / Pro $49 / Growth $99 / Agency $249
8. **Traction** — beta cohort, signups, build-in-public momentum
9. **Competitive landscape** — vs Jasper, Copy.ai, HubSpot, Marketo
10. **Go-to-market** — content + agency partnerships → PLG
11. **Founder** — Olayinka Fagbenro background
12. **Why Lithuania** — MB, Startup Lithuania, EU customer access, alumni network
13. **Financial projections** — 12 + 36 month ARR ramps
14. **Use of resources** — what relocation unlocks
15. **Ask** — Startup Visa to relocate to Vilnius

## Editing tips

- Slidev separates slides with `---` on its own line.
- Per-slide frontmatter goes between two `---` immediately after a separator.
- Brand-teal classes available globally: `text-brand`, `bg-brand`, `border-brand`.
- Copper accent: `text-copper`, `bg-copper`.
- Big-number callout: wrap a number in `<span class="stat">…</span>`.

## Visa context (for the committee — not in deck)

This deck is part of the Lithuanian Startup Visa application. Conduikt is an AI marketing automation SaaS, currently operated by Olayinka Fagbenro as sole founder from Lagos, Nigeria. The application requests relocation to Vilnius to build the company full-time, leveraging Lithuania's Startup Visa, MB structure, and EU-adjacent customer base.
