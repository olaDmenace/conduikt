# Conduikt Design Definition v2

> Exported from the living doc on 7 Oct 2026. Mockups (Directions A, B, C; C is the chosen one): https://claude.ai/artifact/UfEhZDj9Grn6g7FwaSstnM
> Suggested location in the repo: `docs/DESIGN.md`, referenced from `CLAUDE.md`.

Oct 7, 2026 · @Olayinka

## Purpose and scope

This is the single source of truth for Conduikt's visual system and app structure, written so Claude Code can execute it without guessing. It replaces three conflicting documents: `DESIGN_SYSTEM.md` (a homepage reskin brief), the Mineral section of `SYSTEM_ARCHITECTURE_v2.md` (copper, DM Serif, Outfit) and the ad hoc values in `src/styles/globals.css`. After adoption, `globals.css` holds the tokens in Section 11 and nothing else defines colour or type.

It covers the marketing site (conduikt.com), the authenticated app under `src/app/(dashboard)`, and the shared component layer in `src/components`. It does not cover email templates, generated social assets, or the pitch deck.

The direction is "Direction C" on the [design canvas](https://claude.ai/artifact/UfEhZDj9Grn6g7FwaSstnM): Blaze's posture (sand ground, ink bands, one loud accent, huge light type) carried by Conduikt's own orange, teal and ink.

## Design principles

Five rules decide every screen. When two conflict, the earlier one wins.

1. **Show the loop, not the feature list.** Every surface makes audit → plan → create/publish → learn visible. A screen that only lists tools is wrong.
2. **Two tones and one loud accent.** Sand and ink are the only grounds. Orange is for the one action that matters on a band or screen; teal is for data and status only. Never both on the same element.
3. **Big, light, few.** Display type is large and weight 300. One headline per band, one statement per section. If a section needs three headlines it is three sections.
4. **The user approves, the agents do.** Default affordances are Approve, Edit, Regenerate. "Generate" buttons appear only inside an agent, never on the home screen.
5. **Square, flat, quiet.** 6px radius, 1px borders, no drop shadows, no gradient washes, no glass. Depth comes from tone changes (sand → card → ink), not from blur.

## Voice and words

Write for a founder who has never done marketing and let the experienced one skim. The test for every line: would a smart friend who runs a bakery understand it on first read?

Rules:

1. Say what the reader gets before how it works. "Your Tuesday posts get seen twice as much" before "applied to the schedule".
2. No acronym the reader did not type. SEO, CRO, GSC, GA4, ESP, A/B, KD, CTA, ROI are banned in headlines, buttons, labels and body copy. Spell the thing out the first time ("Google Search Console") and use the plain job after ("how people find you on Google").
3. Numbers always say what they count: "87 out of 100", "3,420 views from 14 posts", never a bare "87" or "3,420".
4. Short words, short sentences. Aim under 15 words per sentence in marketing copy and under 8 in UI labels. Reading level of a good newspaper.
5. Keep "agents". It is the brand's word. Introduce it once per page with a plain gloss ("a marketing team you hire in one click") and give every agent a one-line job description wherever its name appears.
6. Buttons are verbs the user would say: "Check my site free", "Try Pro", "Talk to us", "Watch", "Approve", "Try again". Never "Submit", "Generate", "Regenerate", "Execute".
7. Technical texture is allowed only in the mono labels and timestamps inside product UI, where it signals real software. It never appears in a headline or a sentence.
8. Placeholders in a text box are an example of what to type, not a label: "Try: write 3 posts about our new feature".

### Words we use, words we don't

| Instead of | Say |
| --- | --- |
| SEO score, SEO audit | Site score (out of 100), site check |
| CRO | Why visitors don't sign up |
| Impressions | Views |
| Open rate | Emails opened |
| Generations, credits | Pieces of content |
| Keyword clusters | Topics people search for |
| KD 30 | Topics you could rank for quickly |
| Schema added | Ready for Google |
| Programmatic SEO | Many landing pages at once |
| Export to your ESP | Send to Mailchimp, Resend, or whatever you use for email |
| Closed loop, the loop | Watches what worked and uses it next week |
| Learnings | What we learned this week |
| Run, campaign run | Task, this week's marketing |
| Approvals, needs you | Drafts waiting for your OK, waiting for you |
| Autopilot | Hands off |
| Regenerate | Try again |
| Sequences, broadcasts | Email series, one-off emails |
| Audiences | Subscribers |
| Integrations | Connected accounts |
| Brand voice | How you sound |
| Library | Everything we made |

### Agent names as the user sees them

The registry keys stay as they are in code. The display names change where the old name was a marketing term.

| Registry | Display name | One-line job |
| --- | --- | --- |
| SEO Audit | Site Audit | Finds what to fix on your website |
| CRO | Conversion Check | Finds why visitors don't sign up |
| Competitor Intel | Competitor Watch | Sees what rivals are doing |
| A/B Test | Split Test | Tries two versions, keeps the winner |
| Client Reports | Client Reports | Reports you can send to clients |
| Copywriting | Copywriter | Headlines and page copy |
| Social | Social | Writes posts for X and LinkedIn |
| Email | Email | Welcome and follow-up emails |
| Blog | Blog | Full articles, ready to publish |
| Video Ad | Video Ad | Short video ads with a voice |
| Programmatic SEO | Landing Pages | Many search pages at once |
| Strategy | Strategy | Your plan for the next 90 days |
| Posting Plan | Posting Plan | What to post, and when |
| Keyword | Keyword Finder | Finds what people search for |
| Growth | Growth Plan | Ideas to get more signups |
| Launch Strategy | Launch Plan | A step-by-step launch week |
| Campaign | Campaign | Chains agents into one run |
| Calendar | Calendar | Schedules everything |

## Brand DNA: what we take from Blaze, what stays Conduikt

Measured from [blaze.ai](https://www.blaze.ai/) on 7 Oct 2026: body ground `#EAE4D5`, alternating near-black bands, headline grotesk at 110px weight 300, body in Söhne, CTAs `#EE241B` with 4px radius, no serif anywhere. The table maps each trait to Conduikt's version.

| Trait | Blaze | Conduikt (this spec) | Why |
| --- | --- | --- | --- |
| Page ground | Sand `#EAE4D5` | Sand `#EAE4D5` | Same warmth; already close to the existing light-mode cream `#F5F2ED` |
| Dark band | Near-black `#0A0A0A` | Ink `#1E2A2E` (existing `--brand-ink`) | Keeps the band ours; blue-black reads as Conduikt, not Blaze |
| Accent | Red `#EE241B` | Orange `#B24E27` on buttons, `#D9663A` in display | Existing `--brand-orange-600/500`; 600 passes AA with white text, 500 does not |
| Second colour | None | Teal `#1F6B66` light / `#3FA09A` on ink | Data, status, "done". Never on a CTA |
| Display type | NB grotesk, 300 | Space Grotesk 300 (already loaded) | Same gesture, no new licence |
| Body type | Söhne | Geist | Neutral grotesk, free, variable; replaces Inter |
| Button shape | 4px, square | 6px, square | Pills are retired everywhere |
| Page rhythm | Alternating sand / black bands | Alternating sand / ink bands | One statement headline per band |
| Product proof | Autoplay video | Live run feed and product strip | Shows the loop running without a video asset |
| Positioning line | "Marketing done for you" | "Your marketing, done every week. Better every time." | Blaze sells done-for-you; Conduikt sells the closed loop |

Not borrowed: Blaze's red, its pure black, its "fully managed from $999" service tier framing, and its copy.

## Colour tokens

Two surfaces (sand, ink), each with its own text and accent ramp. Contrast ratios are computed against the surface named in the row; anything below 4.5:1 is flagged for large text (24px+) only.

### Sand surface (default page and app ground)

| Token | Hex | Role | Contrast on sand | AA |
| --- | --- | --- | --- | --- |
| `--ground` | `#EAE4D5` | Page background | - | - |
| `--surface` | `#F6F2E9` | Cards, inputs, rail buttons | - | - |
| `--surface-2` | `#E0D9C8` | Hover, quiet chips, progress tracks | - | - |
| `--line` | `#D9D1C0` | Card and divider borders | - | - |
| `--line-strong` | `#1E2A2E` | Input borders, outline buttons | - | - |
| `--text` | `#1E2A2E` | Headlines, body | 11.6:1 | Pass |
| `--text-2` | `#4A5559` | Secondary body, nav links | 6.1:1 | Pass |
| `--text-3` | `#5A6568` | Captions, timestamps (replaces `#6B7478`, which was 3.8:1) | 4.7:1 | Pass |
| `--accent` | `#B24E27` | Primary button fill, with white text | 5.2:1 (white on it) | Pass |
| `--accent-hover` | `#9A3F1D` | Button hover, and text links on sand | 5.3:1 | Pass |
| `--accent-display` | `#D9663A` | Display-size words only (56px+) | 3.3:1 | Large only |
| `--accent-soft` | `#F3E3DA` | Tier chips, live-run row tint | with `#9A3F1D` text 5.4:1 | Pass |
| `--teal` | `#1F6B66` | Positive deltas, done states, sparklines | 4.9:1 | Pass |
| `--teal-soft` | `#E3F0EE` | Connected and done chips | with `#1F6B66` text 5.4:1 | Pass |

### Ink surface (bands, sidebar plan card, "Needs you" tile)

| Token | Hex | Role | Contrast on ink | AA |
| --- | --- | --- | --- | --- |
| `--ink` | `#1E2A2E` | Band background | - | - |
| `--ink-surface` | `#263439` | Cards on ink | - | - |
| `--ink-line` | `#34444A` | Borders on ink | - | - |
| `--ink-text` | `#EAE4D5` | Headlines, body on ink | 11.6:1 | Pass |
| `--ink-text-2` | `#B9C2C0` | Secondary body on ink | 8.1:1 | Pass |
| `--ink-text-3` | `#8FA0A3` | Captions on ink | 5.4:1 | Pass |
| `--ink-accent` | `#E78457` | Eyebrows, links on ink (existing `--brand-orange-400`) | 5.5:1 | Pass |
| `--ink-accent-display` | `#D9663A` | Display words, highlighted borders on ink | 4.2:1 | Large only |
| `--ink-teal` | `#3FA09A` | Data, done states on ink | 4.7:1 | Pass |

### Semantic

| Token | Sand | Ink | Use |
| --- | --- | --- | --- |
| `--success` | `#1F6B66` | `#3FA09A` | Published, connected, positive delta |
| `--warning` | `#9A3F1D` | `#E78457` | Needs approval, negative delta, quota at 80% |
| `--danger` | `#8E2F2F` | `#E07A7A` | Failed run, disconnected integration |
| `--info` | `#4A5559` | `#B9C2C0` | Neutral status |

Rules: no colour outside this table appears in `src/`. Charts use `--teal` for the primary series, `--accent` for the comparison series, `--text-3` for axes; the neon `#4ADE80 / #60A5FA / #A78BFA` set in analytics is removed. Dark mode is not a separate theme: the ink surface is the dark mode, used where the layout calls for it.

## Typography

Three families, all free on Google Fonts and loadable through `next/font/google`: Space Grotesk for display (already in the project), Geist for interface and body (replaces Inter), JetBrains Mono for labels and numbers that align. No serif.

| Role | Family | Size / line height | Weight | Letter spacing | Where |
| --- | --- | --- | --- | --- | --- |
| Display XL | Space Grotesk | 108px / 0.98 | 300 | -0.035em | Landing hero only |
| Display L | Space Grotesk | 88px / 0.98 | 300 | -0.035em | Final CTA band |
| Display M | Space Grotesk | 64px / 1.0 | 300 | -0.035em | Band headlines on landing |
| Display S | Space Grotesk | 44px / 1.0 | 300 | -0.03em | App page greeting, big KPI numbers |
| Heading | Space Grotesk | 22px / 1.2 | 500 | -0.01em | Section titles inside bands |
| Title | Geist | 15px / 1.3 | 500 | 0 | Card titles, run names |
| Body | Geist | 15px / 1.55 | 400 | 0 | Paragraphs, table cells |
| Body S | Geist | 13px / 1.5 | 400 | 0 | Secondary lines under titles |
| Caption | Geist | 12px / 1.4 | 400 | 0 | Timestamps, helper text. Minimum size anywhere |
| Label | JetBrains Mono | 11-12px / 1 | 500 | 0.06em, uppercase | Eyebrows, KPI labels, chips, step numbers |
| Numeric | Space Grotesk | 26-56px / 1 | 300 | -0.03em | Scores, counts, prices |

Rules:

- Display sizes step down at breakpoints: XL 108 → 72 (tablet) → 48 (phone); M 64 → 48 → 36; S 44 → 34 → 28.
- Emphasis inside a display line uses weight 500 or `--accent-display`, never bold 700 and never italic.
- Nothing is set below 12px. The current `text-[9px]`, `text-[10px]` and `text-[0.55rem]` uses in 11 files are raised to Caption or Label.
- Prices and KPIs use Space Grotesk at weight 300 with `font-variant-numeric: tabular-nums` so columns align.
- Body copy maximum measure is 64 characters (about 560px at 15px).

## Spacing, radius, borders, shadows, motion

Everything sits on a 4px grid; layout uses the 8px multiples below.

| Token | Value | Use |
| --- | --- | --- |
| `--space-1..3` | 4, 8, 12px | Inside chips, between icon and label, list gaps |
| `--space-4..6` | 16, 20, 24px | Card padding (app), gaps between cards |
| `--space-8` | 32px | Section inner gaps, hero grid gap |
| `--space-10` | 40px | Page side gutter at desktop |
| `--space-14` | 56px | Between hero copy and product strip |
| `--band-y` | 104px desktop, 72px tablet, 56px phone | Vertical padding of every landing band |
| `--container` | 1280px landing, 1200px app content | Max width |
| `--rail` | 240px | App sidebar width; collapses to 64px icon rail, drawer under 768px |
| `--radius` | 6px | Buttons, inputs, chips (4px), small cards |
| `--radius-lg` | 8px | Cards, panels, tables. Nothing larger; pills retired except prompt-bar suggestion chips |
| `--border` | 1px `--line` | Every card and divider. No 2px borders; emphasis is a `--accent` border, same width |
| `--shadow` | none | Flat by rule. The one exception: a dropdown or drawer gets `0 8px 24px rgba(30,42,46,.12)` so it reads as above the page |
| `--grain`, `--glass-*` | removed | No noise texture, no backdrop blur |

Motion is one system: a soft fade-up on entry, a slow fade on hero photographs, and nothing that loops.

| Token | Value | Use |
| --- | --- | --- |
| `--ease-out-soft` | `cubic-bezier(.2,.8,.2,1)` | Every transition and animation |
| `--duration-fast` | 150ms | Hover and focus colour changes on buttons, links, chips |
| `--duration-base` | 250ms | Drawers, menus, tab switches |
| `--duration-reveal` | 700ms | `fadeup`: opacity 0 to 1 with a 10px rise, applied to each band's heading, copy and cards as they enter the viewport |
| `--duration-photo` | 1600ms | `slowfade`: hero and CTA photographs fade from 0 to 1 while settling from scale 1.03 to 1 |
| Stagger | 80ms per sibling, 5 steps maximum | Cards in a strip, lines in a hero, roster tiles |

Rules: reveals run once, triggered by `IntersectionObserver` at 15% visibility (the mockup runs them on load). Nothing moves more than 10px. No parallax, no continuous loops except the 8px live-run pulse. `prefers-reduced-motion: reduce` turns every animation off and shows the final state.

## Photography

Real people are the human layer of the brand. Photographs appear in five places on the homepage and nowhere in the app, and every one shows people at work, never a stock smile at a camera in a studio.

| Placement | Subject | Treatment | Ratio |
| --- | --- | --- | --- |
| Hero | Two founders at a shared screen | Full-bleed, dark overlay: vertical gradient `rgba(20,24,26)` at .55 top, .35 middle, .82 bottom, plus a left-to-right .55 to 0 side gradient so text sits on the darkest zone | 3:2, 1800px wide, under 250 KB |
| Why band | A founder presenting to a small team | No overlay, 8px radius | 7:5 |
| Modes band | Two colleagues reacting to a result | No overlay, 8px radius | 4:5 |
| Customer stories | Portraits of the two quoted founders | Inside an ink card, 160px column, no overlay | 1:1 crop from portrait |
| Final CTA | A team working around a table | Full-bleed, horizontal overlay .88 to .30 | 3:2 |

Rules:

- Overlays are ink-black (`#14181A`), not teal and not orange. The photograph supplies the warmth; the overlay only buys contrast. Text on an overlaid photo is `#F4EFE4` and must measure 4.5:1 against the darkest sampled point behind it; if a photo fails, raise the overlay alpha, do not shrink the text.
- Source: Unsplash under the Unsplash License (free for commercial use, no attribution required, credit appreciated), or Pexels. The mockup uses six Unsplash photos chosen for diversity and for showing work, not posing; swap them for your own customers' photos as soon as you have permission, starting with the two testimonial portraits.
- Serve through `next/image` with `sizes` set per placement and `priority` on the hero only. Export WebP at quality 60 to 70; the hero stays under 250 KB.
- Never put a photograph behind body copy, a table, or the pricing cards. Photos sit beside or behind display headlines only.
- The app keeps the sand surface with no photography; the human layer there is the user's own content and avatars.

## Icons

One icon set everywhere: [IconPark](https://iconpark.oceanengine.com/official) by ByteDance, Apache-2.0, 2,000+ icons, installed as `@icon-park/react`. The website's customiser lets you set theme, stroke and fill colours, so brand-coloured exports match what the npm component renders. The current `lucide-react` icons are replaced in Phase 2 so the app never shows two icon styles side by side.

| Setting | Value | Why |
| --- | --- | --- |
| `theme` | `outline` by default; `two-tone` only for the four loop steps and empty states | Outline matches the thin display type; two-tone gives the loop its one decorative moment |
| `strokeWidth` | 3 | IconPark draws on a 48px grid where 4 is the default; 3 reads lighter and closer to Space Grotesk 300 |
| `strokeLinecap`, `strokeLinejoin` | `round` | Softer corners, same as the 6px radius language |
| `size` | 16 in chips and table rows, 20 in buttons and sidebar, 24 in cards, 32 in the marketing product strip | Never scale an icon with CSS; pass the size |
| `fill` on sand | outline: `#1E2A2E`; two-tone: `['#1E2A2E', '#F3E3DA']`; accent icon: `#B24E27` | Ink stroke with a soft orange plate |
| `fill` on ink | outline: `#EAE4D5`; two-tone: `['#EAE4D5', '#34444A']`; accent icon: `#E78457` | Same idea inverted |
| Status icons | success `#1F6B66` / `#3FA09A`, warning `#9A3F1D` / `#E78457` | Always paired with a word |

Global defaults go in one place so no component repeats them:

```tsx
// app/providers.tsx
import { IconProvider, DEFAULT_ICON_CONFIGS } from '@icon-park/react';

const iconConfig = {
  ...DEFAULT_ICON_CONFIGS,
  theme: 'outline' as const,
  size: 20,
  strokeWidth: 3,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  prefix: 'ck',
};

export function Providers({ children }: { children: React.ReactNode }) {
  return <IconProvider value={iconConfig}>{children}</IconProvider>;
}

// usage: colour comes from the token, never a literal
<Search fill="var(--color-text)" />
<Refresh theme="two-tone" fill={['var(--color-text)', 'var(--color-accent-soft)']} size={32} />
```

Suggested mapping for the names this spec uses (IconPark component names):

| Meaning | IconPark | Where |
| --- | --- | --- |
| Check your site | `Search` | Loop step 1, Site Audit agent |
| Write | `Edit`, `Write` | Loop step 2, content agents |
| Post / send | `SendOne` | Loop step 3, Publish, approvals |
| Learn / loop | `Refresh`, `Cycle` | Loop step 4, Learnings |
| Calendar | `Calendar` | Calendar, scheduled rows |
| Views, charts | `ChartLine`, `Analysis` | Analytics, KPI strip |
| Approve | `CheckOne` | Approve buttons, done chips |
| Waiting for you | `Attention` | Needs-you tile, draft rows |
| Running | `Lightning` | Live run row |
| Connect | `Link`, `Plug` | Channel health, Connected accounts |
| Email | `Mail` | Email agent, email list section |
| Home | `Home` | Sidebar |
| Settings | `SettingTwo` | Sidebar |
| Search / command | `Search` + `Command` | ⌘K button |

Rules: every icon-only control has an `aria-label`; decorative icons get `aria-hidden`. Never emoji in UI (the mockup's one 🧵 is inside a user's draft tweet, which is content, not UI). Verify each name exists in the IconPark search before using it; where a name above is not found, pick the closest outline icon from the same family and record the swap in this table.

## Components

Classes assume the `@theme` block in Section 11, so `bg-ground`, `text-text-2`, `border-line`, `bg-accent` resolve to the tokens above. Each component lives once in `src/components/ui` and is the only way that pattern is rendered.

| Component | Anatomy | Tailwind v4 classes | Notes |
| --- | --- | --- | --- |
| Button / primary | 36px app, 48px marketing; 14-15px, weight 500 | `inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3.5 text-sm font-medium text-white hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ground` | One per screen or band. Replaces the gradient `from-[#D9663A] to-[#B24E27]` button |
| Button / outline | Same sizes, 1px ink border | `... rounded-md border border-line-strong bg-transparent text-text hover:bg-surface-2` | On ink: `border-ink-text text-ink-text hover:bg-ink-text/10` |
| Button / quiet | Same, `--line` border | `... rounded-md border border-line bg-surface text-text hover:bg-surface-2` | Default for secondary row actions (View, Edit) |
| Card | 8px radius, 1px line, surface fill, 16-24px padding | `rounded-lg border border-line bg-surface p-4 md:p-6` | No hover scale. Emphasis = `border-accent` |
| Card / ink | Same on ink | `rounded-lg border border-ink-line bg-ink-surface p-5 text-ink-text` | Used in bands and the sidebar plan tile |
| Chip / status | 22px, mono 11px, 4px radius | `inline-flex h-[22px] items-center rounded px-2 font-mono text-[11px] tracking-wide` + one of `bg-teal-soft text-teal` (done, connected), `bg-accent-soft text-accent-hover` (running, needs you), `bg-surface-2 text-text-3` (queued), `bg-ink text-ink-text` (count) | Replaces every ad hoc badge, including `text-[0.55rem]` lock badges |
| Chip / tier | Same shape | Free `bg-teal-soft text-teal`, Pro `bg-accent-soft text-accent-hover`, Growth and Agency `bg-ink text-ink-text` | Shown once per agent card, never inline in nav |
| Input | 48px marketing, 40px app, 1px ink border, surface fill | `h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[15px] placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent` | Always paired with a `<label>` (visually hidden is fine) |
| Prompt bar | Input + primary button + suggestion chips | Input as above at `h-12`, chips `h-[30px] rounded-full border border-line text-xs` | App home only. Routes to ⌘K agent picker with the text prefilled |
| KPI strip | 5 cells joined by 1px gaps | Wrapper `grid grid-cols-5 gap-px overflow-hidden rounded-lg border border-line bg-line`, cell `flex flex-col gap-1.5 bg-surface p-5` | Last cell may be `bg-ink text-ink-text` for "Needs you". Collapses to 2 columns under 1000px |
| Run row | 110px mono time, title + sub, one action | `grid grid-cols-[110px_1fr_auto] items-center gap-3.5 border-t border-line px-4 py-3` | Live row gets `bg-accent-soft`; action is Approve (primary) only when approval is the next step |
| Approval card | Channel chip, time, body text, Approve / Edit / Regenerate | `rounded-md border border-line bg-ground p-3` inside a Card; buttons at `h-[30px] text-xs` | Shows the real draft text, never a summary of it |
| Agent card | Tier chip, name, one-line description, last used | `flex flex-col gap-2 rounded-md border border-line bg-surface p-3.5 text-sm font-medium hover:border-accent` | Whole card is the link (`<a>`), no inner button. Category label is the formatted name, not the slug |
| Sidebar item | 36px, 6px radius, 14px | `flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-text-2 hover:bg-surface-2 hover:text-text aria-[current=page]:bg-ink aria-[current=page]:text-ink-text` | Section labels are mono 11px uppercase `text-text-3` |
| Table | Mono uppercase headers, 1px row lines | `w-full text-sm [&_th]:font-mono [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-text-3 [&_td]:border-t [&_td]:border-line [&_td]:px-3.5 [&_td]:py-3` | Wrapped in `overflow-x-auto` always |
| Sparkline | 36px tall inline SVG, 2px stroke | stroke `--teal`, or `--accent` when the trend is the problem | No axes, no fill |
| Drawer | Right slide-over, 480px, shadow allowed | `fixed inset-y-0 right-0 w-[480px] max-w-full border-l border-line bg-ground shadow-[0_8px_24px_rgba(30,42,46,.12)]` | Agent output opens here; the page behind keeps its scroll position |
| Skeleton | Surface-2 blocks, 1.2s pulse | `animate-pulse rounded-md bg-surface-2` | Replaces the centred `Loader2` spinner in all 41 pages |
| Empty state | Dashed card, one line, one primary action | `rounded-lg border border-dashed border-line p-8 text-center` | One shared component, not re-implemented per page |

## Marketing site structure

The homepage is ten bands alternating sand and ink, each carrying one statement. Mockup: artboard "C · Landing page" on the canvas.

| # | Band | Surface | Headline (Display M unless noted) | Content | CTA |
| --- | --- | --- | --- | --- | --- |
| 0 | Nav | Sand | - | Logo, How it works, What it does, Pricing, Customers, Questions; Sign in (outline), Start free (primary) | Start free |
| 1 | Hero | Photograph, dark overlay | Display XL: "Your marketing, done every week. Better every time." | Two founders at a screen behind the headline; eyebrow; 19px sub; a "used by founders in" city line. The 4-card strip (Check 87 out of 100, Write, Post, Learn) sits just below the hero on sand | Start free (primary), See it work (outline) |
| 2 | Why | Sand | "Other AI tools write a draft and stop. Conduikt posts it, watches what happens, and does better next week." | Statement beside a photo of a founder presenting to a team; then the 3-column comparison: AI writing tools / Freelancers and agencies / Conduikt (ink cell) | - |
| 3 | How it works | Ink | "Check. Write. Post. Learn. Then do it again next week." | 4 rows with 72px numerals, plain job name, one sentence, the agents that do it | - |
| 4 | Agents | Sand | "Eighteen agents. Each one does one marketing job." | 6-column roster of all 18 with tier chip, display name and one-line job | See all 18 |
| 5 | Hands-on | Sand (same band) | "You decide how hands-on to be." | 3 stacked rows: Check all / Let social run (highlighted) / Hands off, beside a 4:5 photo | - |
| 6 | Customer stories | Ink | "Real people. Real results." | The four real testimonials from conduikt.com in a 2x2 grid of ink cards, full quote, name, role, monogram avatar in a brand colour. No stock portraits next to real names; no carousel | - |
| 7 | Pricing | Sand | "Start free. Pay when it's working for you." | 4 cards, Pro as the one ink card; prices in Display 56px; "pieces of content" not "generations" | Try Pro (primary), others outline |
| 8 | Questions | Sand | "Things people ask before they start." | The six FAQ items from conduikt.com rewritten in plain words, as a native details/summary accordion with a rotating + and a short fade on open; first item open by default | - |
| 9 | Final CTA | Photograph, dark overlay | Display L: "Every founder deserves a marketing team." | URL input + Check my site free | Check my site free |
| 10 | Footer | Sand, top line | - | Copyright, Compare, Blog, Guides, Privacy, Terms, Delete my data | - |

Rules for every marketing page (features, pricing, compare, blog, guides, launch):

- Same nav on every page, including Compare. The current inconsistency goes away because nav is one component.
- Testimonials: real names and quotes only, the four existing ones on the homepage in a grid, set at 17px inside ink cards with a monogram avatar. Never a stock photo beside a real name; a real photo only with that person's permission. No carousel, no autoplay.
- The Product Hunt badge moves to the footer. The chat widget is hidden on the homepage above the fold and never overlaps a CTA.
- Mobile: Display XL drops to 48px, the product strip becomes a vertical list, bands keep their order, nav collapses to a sheet with the same six links plus both buttons visible at 375px.
- Removed: the "Now in Beta" chip, the dashboard screenshot with a play button, the six feature cards, the testimonial carousel (the quotes stay, the carousel goes). The FAQ stays on the homepage, rewritten in plain words, and also appears on /pricing.

## App architecture

The app home stops being a launcher and becomes a status surface: what ran, what needs you, what was learned. Agents are reached through the prompt bar and ⌘K, and through one grouped section of the sidebar. Mockup: artboard "C · App dashboard".

```text
Project switcher (conduikt.com)
├── Primary views
│   ├── Home
│   ├── Drafts waiting for your OK · count
│   ├── Calendar
│   ├── Analytics
│   └── What we learned
├── Ask an agent to  (also ⌘K and the prompt bar; the only place agents appear in the rail)
│   ├── Check my site · 5 agents
│   ├── Plan what to say · 5 agents
│   ├── Write something · 6 agents
│   └── Post and schedule · 2 agents
├── Your email list
│   ├── Email series
│   ├── Subscribers & sign-up forms
│   └── One-off emails
└── Settings
    ├── Everything we made
    ├── How you sound
    └── Connected accounts
```

The highlighted branch is the only place agents appear in the rail; the same picker is reached from ⌘K and the prompt bar, so the 18 agents are rendered by one component instead of four.

### Navigation model

| Level | Items | Behaviour |
| --- | --- | --- |
| Project switcher | One button at the top of the rail | Switching project swaps the whole rail context; no nested project tree |
| Primary | Home, Drafts waiting for your OK (with count), Calendar, Analytics, What we learned | Always visible. Replaces Pulse / Audience / Studio zones |
| Run an agent | Check my site (5), Plan what to say (5), Write something (6), Post and schedule (2); the section label reads "Ask an agent to" | Each opens a grouped picker; the same `AgentPicker` component serves ⌘K and the prompt bar |
| Audience | Sequences, Audiences & forms, Broadcasts | Unchanged routes |
| Workspace | Library, Brand voice, Integrations | Settings items that users visit, not account plumbing |
| Footer | Plan tile (usage bar, Upgrade), Sign out, legal links | Plan tile is an ink card |

The global `/agents` menu, `/playground`, and the "All Tools" grid are removed; their routes redirect to the picker.

### Overview screen, top to bottom

1. Greeting in Display S with a one-line status ("One run live, seven drafts waiting for you"), then the prompt bar with four suggestion chips drawn from recent learnings.
2. KPI strip: SEO score, Impressions 7d, Open rate, Next publish, Needs you (ink cell). Each cell shows value, delta, one context line.
3. Runs panel (left, 60%): Active / Scheduled / History tabs; run rows with one action each. The live run is tinted and links to the campaign canvas.
4. Next approval card (right, 40%) showing the actual draft with Approve / Edit / Regenerate, then the latest learning as an ink card.
5. Channel health: X, LinkedIn, Email, Search Console, each with a sparkline or a Connect action.

### Agent output drawer

Running an agent from anywhere opens the 480px right drawer over the current page: brief at the top, streamed output, variants as tabs, Approve / Edit / Regenerate at the bottom, "Open full editor" for Content Studio. The page behind does not navigate. Closing the drawer leaves the result in Runs > History.

### States

| State | Rule |
| --- | --- |
| Loading | Skeleton in the shape of the final layout. `loading.tsx` added at `(dashboard)` and per route group |
| Empty | Shared `EmptyState`: one sentence, one primary action. First-run Overview shows the prompt bar and "Run your first audit" only |
| Error | `error.tsx` at `(dashboard)`: what failed, Retry, and the run id. No bare dashes in KPI cells |
| Locked (tier) | Agent card shows the tier chip and "Unlock" instead of a 60% opacity treatment |
| Live | 8px pulsing dot and `--accent-soft` row tint; never a spinner |

## Accessibility and responsive rules

Target is WCAG 2.2 AA on every page, verified in CI with axe on the Playwright suite.

- Text contrast 4.5:1 minimum, 3:1 for Display sizes. The token tables above already meet this; no opacity modifiers (`/60`, `/80`) on text, ever.
- Every icon-only button has `aria-label`. Current count is about 10 `aria-*` attributes across 113 buttons; the component layer fixes this by making the label a required prop on `IconButton`.
- Focus ring: 2px `--accent` with 2px ground offset, on `:focus-visible` only. Collapsed-rail items use a tooltip, not `title`.
- Touch targets 44px minimum on phone; the 30px approval buttons grow to 40px under 768px.
- Current-page nav items carry `aria-current="page"`; collapsible sections carry `aria-expanded`.
- Colour never carries meaning alone: every status chip has a word, every delta has a sign.
- `prefers-reduced-motion` turns off the live pulse and band reveals.

| Breakpoint | Landing | App |
| --- | --- | --- |
| ≥ 1280px | 1280px container, 40px gutter, Display XL 108px | 240px rail, 1200px content, KPI strip 5 across |
| 1000-1279px | Container fluid, Display XL 88px, roster 6 → 4 columns | Rail 240px, KPI strip 5 across, runs and approvals still side by side |
| 768-999px | Display XL 72px, comparison stacks, roster 3 columns, tiers 2 across | Rail collapses to 64px icons, KPI strip 2 across, columns stack |
| < 768px | Display XL 48px, 16px gutter, product strip vertical, nav becomes a sheet | Rail becomes a drawer, prompt bar full width, run rows drop the time column into the sub line, flow editor shows a read-only step list |

## Implementation

Four phases, each shippable on its own. Phase 1 is a prerequisite for the rest because every later prompt references the tokens by name.

### Phase 1: tokens (globals.css)

Replace the existing `:root` palette and `@theme inline` block in `src/styles/globals.css` with the block below. Delete `DESIGN_SYSTEM.md` and the Mineral section of `SYSTEM_ARCHITECTURE_v2.md`, and point `CLAUDE.md` at this document. Add an ESLint rule (or a grep step in CI) that fails on `#[0-9A-Fa-f]{3,6}` inside `src/` outside this file.

```css
@import "tailwindcss";

@theme {
  /* grounds */
  --color-ground: #EAE4D5;
  --color-surface: #F6F2E9;
  --color-surface-2: #E0D9C8;
  --color-line: #D9D1C0;
  --color-line-strong: #1E2A2E;
  /* text on sand */
  --color-text: #1E2A2E;
  --color-text-2: #4A5559;
  --color-text-3: #5A6568;
  /* accent */
  --color-accent: #B24E27;
  --color-accent-hover: #9A3F1D;
  --color-accent-display: #D9663A;
  --color-accent-soft: #F3E3DA;
  --color-teal: #1F6B66;
  --color-teal-soft: #E3F0EE;
  /* ink surface */
  --color-ink: #1E2A2E;
  --color-ink-surface: #263439;
  --color-ink-line: #34444A;
  --color-ink-text: #EAE4D5;
  --color-ink-text-2: #B9C2C0;
  --color-ink-text-3: #8FA0A3;
  --color-ink-accent: #E78457;
  --color-ink-teal: #3FA09A;
  /* semantic */
  --color-success: #1F6B66;
  --color-warning: #9A3F1D;
  --color-danger: #8E2F2F;
  /* type */
  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-sans: "Geist", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  /* shape */
  --radius-md: 6px;
  --radius-lg: 8px;
  /* motion */
  --ease-out-soft: cubic-bezier(.2,.8,.2,1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
}

@layer base {
  body { @apply bg-ground text-text font-sans antialiased; }
  .band-ink { @apply bg-ink text-ink-text; }
  :focus-visible { @apply outline-none ring-2 ring-accent ring-offset-2 ring-offset-ground; }
}
```

Fonts load through `next/font/google` in `app/layout.tsx`: `Space_Grotesk({ weight: ['300','400','500','600'] })`, `Geist({ weight: ['400','500','600'] })`, `JetBrains_Mono({ weight: ['400','500'] })`, each exposed as a CSS variable the `@theme` block reads.

### Phase 2: component layer

Build or rewrite in `src/components/ui`: `Button` (primary / outline / quiet, sm / md / lg), `IconButton` (label required), `Card` and `InkCard`, `Chip` (status, tier, count), `Input` with `Field` wrapper, `KpiStrip`, `RunRow`, `ApprovalCard`, `AgentCard`, `Sidebar` with `SidebarItem`, `DataTable`, `Sparkline`, `Drawer`, `Skeleton`, `EmptyState`. Delete the second `theme-toggle.tsx`; theme toggling is removed with the single-surface model. Replace every lucide-react import with the IconPark equivalent from the Icons section and remove lucide-react from package.json. Apply the display names and one-line jobs from "Agent names as the user sees them" through a single agentDisplay map next to the registry, leaving the registry keys untouched.

### Phase 3: marketing site

Rebuild `app/(marketing)/page.tsx` as the eight bands. Then features, pricing (gains the FAQ), compare, blog and guide templates on the same band system.

### Phase 4: app

Sidebar and header first, then Overview, then the agent picker and output drawer, then `loading.tsx` / `error.tsx`, then page-by-page conversion of the 30 project routes (Content Studio and Analytics last, they are the largest).

### Prompt template for Claude Code

One task per prompt. Name the component, the phase, and the acceptance checks.

```markdown
Context: docs/DESIGN.md is the design definition. Tokens are in src/styles/globals.css. Do not add colours, fonts or radii outside it.

Task: Rewrite src/components/layout/sidebar.tsx to the Navigation model in DESIGN.md section 9.

Requirements:
- Rail 240px on >= 768px, 64px icon rail on 768-999px, drawer below 768px.
- Sections in this order: project switcher, primary (Overview, Approvals with count, Calendar, Analytics, Learnings), Run an agent (4 groups with counts from the registry), Audience, Workspace, footer plan tile.
- Use SidebarItem from src/components/ui; current route gets aria-current="page".
- Remove the per-project nested tree, the global Agents menu and Playground.
- No hex values, no text below 12px, no opacity modifiers on text.

Acceptance:
- pnpm typecheck and pnpm test pass.
- Playwright axe scan of /dashboard has zero serious or critical violations.
- Screenshot at 1440, 1024 and 375 attached to the PR.
```

Repeat the same shape for each component in Phase 2 and each band in Phase 3.

## Open decisions and out of scope

- [ ] Confirm Geist as the body face, or keep Space Grotesk at weight 400 for body and run a two-font system. Geist is the recommendation; it is quieter next to large light display type.
- [ ] Decide whether the "Modes" band (Review / Assisted / Autopilot) describes a real setting or a future one. If future, it moves off the homepage until it ships.
- [ ] Pick the two testimonials for the homepage and get written permission to use names and companies.
- [ ] Decide the fate of the light/dark toggle. This spec removes it; the ink surface covers the dark use case. If users ask for a full dark app, it becomes a Phase 5 with an inverted token set, not a second palette.
- [ ] Logo: the horizontal lockup is JPEG-sourced. An SVG redraw is needed before the 108px hero and the favicon ship.

Out of scope for this version: email templates sent by the Email agent, generated social images, the pitch deck, the `build.conduikt.com` concept, and any change to the agent registry or pricing.

Sources: [conduikt.com](https://conduikt.com/) and `src/` audit on 7 Oct 2026; [blaze.ai](https://www.blaze.ai/) computed styles on 7 Oct 2026; [design canvas with Directions A, B and C](https://claude.ai/artifact/UfEhZDj9Grn6g7FwaSstnM); research note `claude/ui-upgrade-research.md` in the Conduikt project.
