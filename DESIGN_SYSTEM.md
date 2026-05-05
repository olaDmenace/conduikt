# Conduikt — UI Refresh Brief for Claude Code (v3)

## How to read this document
This is **styling guidance, not a redesign**. The current Conduikt homepage already has the right structure, copy, and content — we are *re-skinning* it, not rebuilding it. The Arolax demo (https://arolax.crowdytheme-demo.com/seo-agency/home-dark/) is **visual inspiration only** for color, typography weight, motion, spacing rhythm, and a few specific accents (diagonal pinstripe, brushstroke swash, numbered-row pattern). Do NOT copy Arolax's information architecture or reproduce its sections verbatim.

The accompanying `design-reference.html` is a **component playground**, not a homepage. Treat it as a Storybook of styled atoms (buttons, cards, pinstripe panels, brushstroke swashes, counters, cursor) that you should apply to the existing JSX without restructuring it.

## Preservation rules — what must NOT change
These are content/structure decisions the team has already made. Do not "improve" them.

- **Top nav**: keep sticky behavior, keep the existing items in this order — Features, Pricing, vs Competitors, Blog, Guides, Product Launch — and the right-side "Sign in" + "Get Started" actions. Do not add or remove items.
- **Hero copy**: headline "AI Marketing Automation for SaaS Founders" with the word "SaaS" in the brand orange, the "Now in Beta" pill, the existing lead paragraph, and the two CTAs ("Start Free AI Marketing Audit" primary, "See How It Works" secondary). Keep the trust microcopy ("No credit card required", "5 free AI generations") and the Product Hunt badge.
- **Hero layout**: single content column with a max-width centered container (the current Conduikt approach), with the dashboard preview to the right of the headline on desktop. Do NOT replace this with a full-bleed 50/50 split. Take inspiration from Arolax for typography, accents, and motion only.
- **Social channel row** under "PUBLISH EVERYWHERE FROM ONE DASHBOARD": exactly four items in this order — X / Twitter, LinkedIn, Email, Your Website. Do not invent partner brand logos. Do not replace this with a marquee.
- **Feature grid**: SIX cards in a 3-column × 2-row grid (1) AI-Powered SEO Audits, (2) AI Content Generator for Social and Email, (3) Multi-Channel Publishing — Social and Email, (4) Marketing Analytics That Improve Over Time, (5) AI Email Marketing for SaaS, (6) Automated Marketing Campaign Builder. Keep all titles and descriptions exactly as written.
- **Comparison link** under the feature grid ("See how Conduikt compares to Jasper, Copy.ai, and other AI marketing tools") — keep, restyle as an underlined ghost link in brand orange.
- **Testimonials**: keep all existing quotes and authors verbatim (Dara Sobayo, Oluwatobiloba Olajide, Adeola Owoade, Olatunbosun Olalekan). Keep the existing infinite-scroll marquee. Do not fabricate new testimonials.
- **Pricing**: 4 tiers — Free $0, Pro $49 (Most Popular), Growth $99, Agency $249. Keep every feature bullet exactly as written.
- **FAQ**: keep all 6 questions and answers verbatim.
- **Footer + final CTA strip**: keep all existing copy and links.

## Default theme
Default to **system preference** via `prefers-color-scheme`, then allow the user to override with the toggle. Persist the override in `localStorage('conduikt-theme')`. On first paint:

```js
const saved = localStorage.getItem('conduikt-theme');
const sys = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
document.documentElement.dataset.theme = saved || sys;
```

If `saved` is null, the page should also re-react to OS theme changes via `matchMedia.addEventListener('change', …)`.

## Color tokens (sampled from logo)

| Token | Dark | Light |
|---|---|---|
| --brand-orange-500 | #D9663A | #D9663A |
| --brand-orange-400 | #E78457 | #E78457 |
| --brand-orange-600 | #B24E27 | #B24E27 |
| --brand-teal-500 | #1F6B66 | #1F6B66 |
| --brand-teal-400 | #2F8C85 | #2F8C85 |
| --brand-teal-600 | #144B47 | #144B47 |
| --brand-ink | #1E2A2E | #1E2A2E |
| --bg-base | #0B0F11 | #FAF7F2 |
| --bg-surface | #121719 | #FFFFFF |
| --bg-surface-2 | #1A2124 | #F1ECE3 |
| --border-subtle | rgba(255,255,255,0.08) | rgba(30,42,46,0.10) |
| --text-primary | #F4EFE7 | #1E2A2E |
| --text-secondary | #A8B0B3 | #5A6669 |
| --text-muted | #6E7679 | #8A9296 |
| --accent-cream | #F4E2C9 | #F4E2C9 |
| --stripe | rgba(255,255,255,0.06) | rgba(30,42,46,0.06) |

## Typography
- Display / Headings: Space Grotesk 600/700, fallback Inter. Tight tracking (-0.02em).
- Body: Inter 400/500.
- Mono labels: JetBrains Mono 500.
The existing Conduikt site uses a serif for the hero headline. You may keep that serif if the team prefers, OR switch to Space Grotesk for a closer Arolax feel — confirm with the team before changing.

## Container & sizing rules
- Container max-width: 1320px (matches existing Conduikt feel). Side gutters 24/32/64 responsive.
- Hero: keep the current single-column max-width container. Hero section min-height: `calc(100vh - var(--nav-height))`. Hero max-height: 920px. Do NOT make the hero taller than the viewport.
- Header: sticky, 72px tall, backdrop-blur(16px). Border-bottom appears only after scrollY > 8.
- Section vertical padding: clamp(96px, 12vw, 160px).

## Visual accents (the Arolax-inspired layer)
Apply these sparingly — the goal is "subtle pinstripe accents and brushstroke swashes" not "Arolax homepage". Use the diagonal pinstripe in **at most three places**:

1. As a low-opacity overlay (max 8%) behind the dashboard preview frame in the hero. Keeps the hero a single column but adds the textured Arolax feel.
2. Behind the testimonial section as a full-width band.
3. Behind the final CTA strip near the footer.

Do not stripe behind the feature grid, the social channel row, or the pricing cards.

## Brushstroke swash (for feature card icons)
Replace the current rounded-square icon backplates with the brushstroke SVG. Keep the existing six icons and titles unchanged — only the backplate changes.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70" aria-hidden="true">
  <path d="M6 38 C18 12, 48 6, 78 14 C108 22, 118 50, 102 60 C84 72, 44 64, 22 58 C8 54, 0 50, 6 38 Z"
        fill="var(--brand-orange-500)" opacity=".88"/>
</svg>
```

## Diagonal pinstripe (CSS-only, no asset needed)
```css
.pinstripe {
  background-image: linear-gradient(45deg,
    var(--stripe) 25%, transparent 25%,
    transparent 50%, var(--stripe) 50%,
    var(--stripe) 75%, transparent 75%, transparent);
  background-size: 8px 8px;
}
```

## Component restyle list (apply, don't restructure)
For each existing section on conduikt.com, here is what to change:

### Top nav
- Keep all items and order.
- Make the surface use `backdrop-filter: blur(16px)` over `color-mix(in srgb, var(--bg-base) 78%, transparent)`.
- Border-bottom toggles on after first scroll tick.
- Add the theme toggle as a 40px circular button to the LEFT of "Sign in".

### Hero
- Same single-column max-width layout as today.
- Headline keeps the serif-italic accent on "SaaS" (in --brand-orange-500).
- Add a subtle radial orange glow behind the headline column at 18% opacity.
- Add the diagonal pinstripe overlay at 6% opacity *only* behind the dashboard preview frame on the right.
- The hero must fit within 100vh on a 1024×768 viewport. Tighten section padding accordingly.

### "Publish everywhere" social row
- Keep exactly: X / Twitter, LinkedIn, Email, Your Website.
- Restyle: tiny eyebrow caption, four icon+label pills with hairline borders, hover lifts the pill 2px and tints the icon orange. No marquee.

### Feature grid
- 3 × 2 grid on desktop, 2 × 3 on tablet, 1 × 6 on mobile. Keep all six titles and descriptions verbatim.
- Replace each icon's rounded-square backplate with the brushstroke swash SVG, sized 56×40, with the existing line icon centered on it. Random ±2° rotation per card.
- Card hover: border becomes --brand-orange-500, card lifts 4px.

### Comparison link
Convert to a centered ghost link in --brand-orange-400 with an animated underline on hover.

### Testimonials
- Keep all existing quotes/authors verbatim.
- Keep the existing infinite-scroll marquee behavior.
- Restyle the cards on --bg-surface, 16px radius, 1px --border-subtle, with a large opening quote glyph in --brand-orange-500.
- Place the section on a full-width band that uses the diagonal pinstripe at 6% opacity.

### Pricing
- 4 cards. Featured "Pro" plan lifted 8px, with --brand-orange-500 outer glow and a "Most Popular" pill positioned on its top edge.
- Display-typography price (use the body font's bold if not switching to Space Grotesk).
- Keep all bullets verbatim. Replace bullet markers with an orange checkmark.

### FAQ
- Keep all 6 Q&A verbatim. Restyle as 1px hairline-divided rows with a + glyph that rotates 45° to × on open. Smooth height animation 240ms.

### Final CTA strip ("Ready to automate your marketing?")
- Place on a band with the diagonal pinstripe at 8% opacity and a centered radial orange glow.
- Keep the existing headline and the single CTA.

### Footer
- Keep all existing links, structure, and order.
- Restyle hover state on links to --brand-orange-400.

## "Optional Arolax inspiration" — only if the team explicitly wants
These patterns are NOT part of the current Conduikt site. Do not add them unless explicitly asked:
- Numbered services list (Arolax-style row pattern)
- Animated counter row
- Image collage section
- Custom orange cursor follower
- Vertical text rail in the hero

If the team later asks for one of these, the markdown's spec block below tells you how. But by default, leave them out. Better to ship a polished restyle than a half-built imitation.

## Optional patterns reference (do not implement by default)

### Numbered services list
Row grid: 80px / 110px / 1.2fr / 2fr / 80px. Hover: row tints orange-tint, number scales 1.15, arrow button fills orange.

### Animated counters
IntersectionObserver triggers a 1600ms cubic-out count from 0 to target on first entry. Use `toLocaleString()` and an optional suffix.

### Custom cursor
Lagged orange dot + ring. Scales 1.7x on interactives. Disable on touch via `@media (hover: none)`.

## Motion specs
- Section headings: clip-path inset reveal on enter (700ms cubic-bezier(.2,.8,.2,1), threshold 15%).
- Cards/rows: opacity 0 → 1, translateY(24px) → 0, 600ms ease-out, stagger 40ms.
- Marquees: linear loop, pause on hover and on focus-within.
- Honor `prefers-reduced-motion: reduce` everywhere.

## Accessibility
- All color pairs meet WCAG AA. Body copy must use --text-primary / --text-secondary, not orange.
- Focus rings: 2px --brand-orange-400 with 2px offset.
- Theme toggle is a real button with aria-pressed and a visible label for screen readers.
- Marquees pause on focus-within.

## Deliverables for Claude Code
1. Add the tokens to `app/globals.css` (or equivalent) under `:root[data-theme="dark"]` and `:root[data-theme="light"]`.
2. Wire the theme toggle: default to system preference, persist user override in localStorage, react to OS changes when no override is set.
3. For each existing homepage section, apply the restyle described above. Do NOT change copy, do NOT add or remove sections, do NOT touch routes or links.
4. Use `design-reference.html` as a component reference — copy atom styles (button, card, brushstroke swash, pinstripe panel, plan card, FAQ row, testimonial card) into the existing components.
5. Verify: sticky header still works, hero fits one viewport, six feature cards render, the four social channels are unchanged, all testimonial authors and quotes match the live site.
