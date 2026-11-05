# Conduikt — full audit, idea validation and roadmap

**Date:** 24 October 2026
**Scope:** codebase (main @ f8a9626), live site (conduikt.com), local walkthrough with a demo account, the eight proposed features, the 15-point local-SEO checklist PDF, the Instagram "$5000 AI agent" reel, and market demand (global + Nigeria/Africa).
**Method:** three read-only code audits (routes/orphans, feature inventory, code health), a signed-in walkthrough on localhost, fourteen web searches, a cross-check of every strategy document in the repo (architecture v1/v2 and addendum, pitch deck, YC briefing, product plan, positioning, pricing, design definition, launch checklist), and the office-hours lens (demand reality, status quo, narrowest wedge) applied to each idea.

**Revision 2 (same day):** added section 4.1 to 4.3 (the one-product decision and goal statement), 5.9 (AEO, GEO and the other "EOs"), and 7 (alignment with the existing infrastructure and the written plan). Corrected the positioning quote in section 4.

---

## 0. The short version

1. **The product is real and further along than the docs say.** 72 pages, 123 API routes, 18 agents, 50 migrations, 893 passing unit tests, billing live on Flutterwave, X/LinkedIn/TikTok publishing, email marketing on Resend, a feedback loop that is wired but starved of data. Lint and typecheck are clean.
2. **Your orphan suspicion is right, with a twist.** There is no missing "project dashboard" route. The v2 Overview at `/dashboard` is the screen the design doc calls Home, but once a project exists the sidebar "Home" points at the legacy agent-grid page `/projects/[id]`. New projects never land on `/dashboard`. Three more pages are fully orphaned (`/share`, `/projects/[id]/competitors`, `/projects/[id]/forms`) and one link 404s.
3. **Without Anthropic credit the product is a shell.** Every agent, the site check, the first-week pack, campaigns and bulk jobs fail with a bare "This one hit a problem". There is no preview/mock mode. Auth, projects, calendar, publishing, email, analytics and billing still work.
4. **The eight ideas pull toward a wider customer than the June positioning.** `POSITIONING.md` (June) says "solo SaaS founders, explicitly not agencies". Every earlier and later document (architecture v1/v2, pitch deck, overview, pricing, the Google per-project migration) assumes founders, small businesses, agencies and local businesses. The PDF checklist, the Instagram reel, the website builder, the review flows and the Meta Ads idea are all **local service business** features, and the four testimonials on the homepage are not SaaS founders. The mechanism never changed; the audience statement did, three times. Section 4 settles it: one engine, playbooks per business type, positioning stays "people without a marketing team".
5. **The roadmap is in line with the original plan and the infrastructure.** Page deployment to the user's site was planned in February (architecture v1, Phase 2 week 5) and again in the YC briefing; Instagram, paid-ads, DataForSEO and a schema agent were all planned and never built. Every item except hosted pages extends an existing pattern (agent registry, scheduler handlers, channel migrations, connected accounts, the performance-context builder). Hosted pages are the one new piece of infrastructure. Details in section 7.
6. **Build order recommendation:** fix the orphans and the no-credit failure mode (days) → adaptive onboarding questionnaire with a business-type fork, and decide the Modes setting (week) → the "missing pages" agent from the reel, which is 80% existing primitives, with answer-engine readiness built into its editor step (2 to 3 weeks) → WhatsApp + Instagram as channels and read-only Meta Ads insights, all unlocked by the same Meta business verification you are already waiting on → hosted pages as the website-builder wedge. Do not build an outbound email sales agent (Explee clone) or a separate "GTM agent"; the first is the wrong channel and infra for your market, the second already exists in pieces.

---

## 1. State of the product (what is actually there)

### 1.1 By the numbers

| Thing | Count | Note |
| --- | --- | --- |
| Pages (`page.tsx`) | 72 | marketing, auth, dashboard, admin |
| API routes (`route.ts`) | 123 | 98 under `src/app/api` listed in the route map |
| Agents | 18 ids in `src/lib/ai/agents/index.ts` | all on `claude-sonnet-4-6`, all wrapped with "Your direction" |
| Migrations | 50 | none for the 17 oldest core tables (no baseline schema committed) |
| Tables referenced in code | ~45 | RLS verified on the 28 created in migrations; unverifiable for the 17 core ones from source |
| Unit/integration tests | 893 across 67 files | green when run alone; suite takes ~6 min because every test boots jsdom |
| E2E specs | 4 | opt-in in CI, target pre-v2 screens, effectively dead |
| Lint | 0 errors, 82 warnings | 38 `any`, 27 unused vars, 13 missing hook deps |
| Typecheck | 0 errors | |
| Client components | 110 of 177 tsx | Content Studio page is 2,355 lines with no memoization |
| Unused deps | 14 | 9 radix packages, react-query, react-hook-form, dnd-kit extras, paystack inline |
| Dead files | 13 (~1,400 lines) | plus the PitchOdds/X-playbook side project living in the SaaS repo |

### 1.2 What works end to end today

- **Audit → plan → write → publish → learn** for X and LinkedIn (and TikTok inbox drafts). Native cards, calendar, scheduled publishing via pg_cron, metrics sync via Inngest, learnings surfaced in "What we learned".
- **Email marketing**: Resend audiences, broadcasts, sequences with scheduler, lead forms with embed, unsubscribe, bounce/complaint suppression. Missing: double opt-in, custom sending domain (page is a waitlist), suppression UI.
- **Onboarding**: signed-out "Check my site" (Turnstile, rate limited, SSRF-guarded) → magic audit → first-week pack that queues every agent and shows progress. Good idea, good screen.
- **Billing**: Flutterwave primary, Paystack failover, webhook signatures verified with timing-safe compares, quotas enforced on the main generate path.
- **Admin**: users, projects, generations, usage, subscriptions, finance, referrals.
- **Analytics inputs**: GSC, GA4, YouTube (read-only), X/LinkedIn metrics. Facebook publishing is coded but flagged off pending Meta verification.

### 1.3 What I saw in the walkthrough (demo account, Free plan)

Credentials for `demo-audit@conduikt.com` are in `e2e/.env.local` (git-ignored). The fixture user the e2e setup expects (`test@conduikt.com`) does not exist.

- **Landing page** reads well: "Your marketing, done every week. Better every time." The loop is the pitch, the sample week is a strong device, the pricing is clear.
- **Sign in** is clean. The Tawk chat widget floats over the auth screens; it should be suppressed on `/login`, `/signup`, `/forgot-password`.
- **First dashboard visit** shows a 5-slide passive tour ("Welcome", "Create a project", "Check your site", "Write something", "Schedule and post"). It is a tour, not a questionnaire. It sits on top of an empty-state card that already says the same thing.
- **New project wizard** is 4 steps: URL → 6 questions → "About your business" (2 free-text fields) → site check. The six questions are: current content tooling, active channels, biggest challenge, GSC status, content output, and "Who is this project for?" (own product / a client / my agency / side project). The agency and client options directly contradict the positioning doc, which is fine, but nothing downstream changes based on the answer.
- **After creation** the user lands on `/projects/[id]/first-week`. With no API credit all three free agents show "DIDN'T FINISH. This one hit a problem. Try again." The server log says exactly why ("credit balance is too low"); the user is told nothing. Locked agents show a "preview" that also silently fails.
- **Sidebar Home** then goes to `/projects/[id]`, the legacy launcher (brand-profile banner, score card, four collapsed agent groups). The v2 Overview at `/dashboard` with approvals, first-week card and history is only reachable from the logo and Ctrl+K.
- **Content Studio** loads with the project details injected and a helpful "content builds momentum" note. Generate fails without credit.
- **Connected accounts** lists X, LinkedIn, Facebook (coming soon), TikTok, and explains Google connections live per project. Instagram, WhatsApp, YouTube publishing and Google Business Profile are absent.
- **`/share`** (marketing kit) drops project context in the sidebar ("Add your website" appears even though a project exists) because the page is outside project scope.
- **Accessibility**: the sidebar nav links expose no accessible name to the accessibility tree (only hrefs). Verify with a screen reader; likely the label span is `aria-hidden` or the icon-only collapsed variant leaks.
- **Performance on this machine**: Turbopack cannot start (Windows paging-file limit); webpack dev works but each route's first compile is 20 to 45 seconds. Not a product bug, but it is why the browser froze twice during the walk.

---

## 2. Orphaned pages and dead links (confirmed with file:line)

| Route | Status | Evidence |
| --- | --- | --- |
| `/dashboard` (v2 Overview, the design doc's "Home") | **Nav orphan once a project exists** | `src/components/layout/sidebar.tsx:261` sets Home to `/projects/[id]`; `:121-122` auto-selects the first project. Only the logo (`:192`), Ctrl+K and post-login reach it. New projects go to `first-week` (`projects/new/page.tsx:212`), then nowhere. |
| `/projects/[id]` (legacy agent-grid launcher) | **Should be retired** | `docs/DESIGN.md:352,390` says the launcher and "All Tools" grid were removed; the sidebar still makes it Home. Two competing home screens. |
| `/projects/[id]/competitors` | **Orphaned** | No inbound link; the Competitor Watch agent routes to `content?skill=competitor-analysis` (`src/lib/ai/agents/registry.ts:122-123`). Duplicate surface. |
| `/projects/[id]/forms` | **Orphaned** | Sidebar label says "Subscribers & sign-up forms" (`sidebar.tsx:330`) but links to `/audiences`; audiences page has no link to forms. |
| `/share` (marketing kit) | **Orphaned** | No href anywhere; only `src/lib/x-playbook/shipping-digest.json:560`. Also missing from `protectedPaths` (`src/lib/supabase/middleware.ts:91`). |
| `/projects` (list) | **Nearly orphaned** | Only reached from project-not-found and after delete. No nav entry. |
| `/launch` | Intentional external landing page | sitemap only. Fine. |
| `/projects/[id]/assets` | **Dead link (404)** | `src/app/(dashboard)/dashboard/page.tsx:432` links to it; only `assets/[assetId]` exists. Should be `/library`. |
| `/playground`, `/agents/*` | Retired, redirect | `next.config.ts:91-93`; still listed in middleware `protectedPaths`. Stale comment at `registry.ts:11`. |
| `/projects/[id]/onboarding` (11-field brand profile) | Reachable only from a banner | Third onboarding surface alongside the tour and the wizard. |

Settings tab lists are defined twice (`settings/page.tsx:27-61` has 8 tabs; `settings/brand/page.tsx:22-27` has 6).

**Fix (one PR, S):** make sidebar Home = `/dashboard` (project-scoped), retire `/projects/[id]` into the Overview, link Forms from Audiences, link Competitors from the Overview or delete the page, link the marketing kit from Settings or delete it, fix the `/assets` href, add `/share` to protected paths, single source for settings tabs.

---

## 3. Code health: top 10 (from the health audit)

| # | Sev | Effort | Fix |
| --- | --- | --- | --- |
| 1 | High | M | Commit a baseline schema (`supabase db dump --schema public`); verify and enable RLS + policies on the 17 core tables (`profiles`, `projects`, `connected_accounts`, `assets`, `scheduled_posts`, …). Run Supabase Security Advisor. The MCP returned "no permission" so I could not check live. |
| 2 | High | S | Generate `src/types/database.ts` and type the Supabase clients. Kills most of the 215 `any`s and makes schema drift a compile error. |
| 3 | High | M | Rate limiter is an in-memory Map per lambda (`src/lib/security/rate-limit.ts`), so effectively none on Vercel. Move to Upstash/KV and cover the nine Claude-calling routes that have no limit (`ai/suggest`, `generate-variants`, `score-content`, `content-scorer`, `campaigns/run`, `audits`, `onboarding-plan`, `competitors`, `keywords/autocomplete`) plus `forms/[formId]/submit`. |
| 4 | High | M | Zero tests on the money path: Flutterwave/Paystack webhooks, `billing/initialize`, `admin/role`. |
| 5 | Med | S | CSP has been Report-Only since before launch with `unsafe-inline unsafe-eval`. Flip it or set a date; rate-limit `csp-report`. |
| 6 | Med | S | `CRON_SECRET` accepted as `?secret=` query param (`cron/publish/route.ts:53`) ends up in logs. Header only. |
| 7 | Med | S | GA4/GSC/YouTube callbacks store access tokens in plaintext (no `encryptToken`), unlike X/LinkedIn/TikTok. |
| 8 | Med | S | Remove 14 unused deps, 13 dead files, duplicate `lib/crypto.ts`, empty `vercel.json`, `paystack.d.ts`. |
| 9 | Med | M | Move PitchOdds/X-playbook code, tables, scripts and `FOOTBALL_DATA_API_KEY` to their own repo. It is personal automation inside the SaaS. |
| 10 | Med | S | Repo hygiene: untrack `pitch-deck/` (9.7 MB PNGs + PDF), delete the four prompt-scaffold MDs, move product docs to `docs/`, move the visa/interview and YC drafts out of the working tree (they are gitignored by fragile globs), delete `public/screenshots` + `scripts/generate-analysis-pdf.mjs`, rewrite `.env.example` (it still documents Lemon Squeezy and omits all 34 live vars). |

Also worth doing: `loading.tsx` per `projects/[id]/*` route and a `global-error.tsx`; split the 2,355-line Content Studio; `environment: 'node'` for lib tests to cut the suite from 6 minutes to under 1; upgrade `@anthropic-ai/sdk` 0.74 → 1.x and `inngest` 3 → 4 deliberately.

---

## 4. The decision that gates everything: who is this for?

**What the docs say.** They disagree, by date:

| Document (date) | Who it is for |
| --- | --- |
| Architecture v1 and v2 (Feb 2026) | "founders, marketers, and agencies"; personas: solo SaaS founders, growth marketers, small agencies |
| Pitch deck (spring 2026) | "any business, in any niche"; slide 20 lists SMB owners, agencies with 10 to 50 clients, course creators, B2B startups and **local businesses (SEO + Google reviews + email)** |
| Pricing v2 (Apr 2026) | Agency tier: "manage multiple clients from one account", "API access" |
| `POSITIONING.md` (28 Jun 2026) | Primary: solo SaaS founders. Explicitly not: enterprise, "agencies servicing many clients", e-commerce, content publishers, B2C consumer apps. Local businesses are not mentioned either way. |
| YC briefing (8 Jul 2026) | Primary as positioning; secondary: small agencies via white-label reports and agency pilots |
| `docs/DESIGN.md` (7 Oct 2026) | "Write for a founder who has never done marketing… a smart friend who runs a bakery" |

The mechanism (audit → generate → publish → measure → learn) is constant in every document since February. Only the audience line moved: wide in February, narrow in June and July, quietly wide again in October. `POSITIONING.md` even lists its own revisit triggers: "Buyer turns out to be agencies → revise ICP", "Geography clarifies: Lagos/Africa-first or global-SaaS-first? Currently we straddle and it shows", "First 10 paying customers tell us… trust them". Homepage headline today: "For founders without a marketing team."

**What the product and the market say.**
- Your testimonials are a brand strategist, a "business owner", a website-performance user and a landing-page user.
- The wizard already asks "a client's business / my agency".
- The integrations page already explains per-project Google accounts "which helps agencies with several client sites".
- Every new idea on your list (website builder, review requests, GBP posts, map-grid ranking, Meta Ads, the reel's "someone nearby asks… job booked") is a **local service business** feature.
- In Nigeria the solo-SaaS-founder population is tiny; local service businesses and the agencies/freelancers who market them are the market. The GeoPoll/Africa 118 MSME Pulse (2025) found 58% of MSMEs across Nigeria, Kenya, South Africa and Ethiopia already use AI tools, mostly for content and ad targeting; a Column/Smarketers Hub survey (Sept 2025, 90 of 100 respondents in Nigeria) found 71% of marketers use AI regularly but only 26% have training. Awareness is high, tooling is low, and the local businesses are "virtually invisible" in Google local results because of incomplete profiles and no review strategy (Oladejo Elisha, Aug 2025).

**Premises to agree or reject before building anything in section 5:**

1. Conduikt's real users today are small service businesses and the people who market them, not SaaS founders. (Evidence: your own homepage testimonials.)
2. The feedback loop is the moat, but it only has data if customers publish through Conduikt. Channels that Nigerian SMBs actually use (WhatsApp, Instagram, Google Business Profile) are all absent, so the loop is starved by design, not by adoption.
3. Nothing on your list requires a new platform; everything is a vertical layer on the existing audit → plan → write → publish → learn spine.
4. A feature the user cannot run without API credit is a feature that does not exist for a trial user. Cost control and a preview mode are product work, not ops.

**Three ways to resolve it:**

- **A. Minimal: keep the SaaS-founder positioning, ship only the horizontal items** (orphans, onboarding, no-credit mode, Meta Ads insights). Effort S. Risk: you keep building for a user you do not have.
- **B. Ideal: add a second ICP, "local service businesses", as a first-class mode chosen in onboarding.** Same product, two playbooks: SaaS (X, LinkedIn, blog, email) and Local (GBP, WhatsApp, Instagram, service pages, reviews). Effort M over a quarter; every item in section 5 slots in. Recommended.
- **C. Lateral: reposition entirely as "the marketing team for Nigerian small businesses, priced in naira", agencies as the distribution channel (white-label client reports already exist).** Highest upside locally, abandons the global founder story. Keep as a 2027 option once B has data.

**Recommendation: B.** It is the only option where the ideas you already want to build make sense together, and it does not require rewriting the homepage on day one.

### 4.1 The owner's proposal: one product for A, B and C, regardless of profession or business type

Olayinka's response to the three options: build a product suitable for all three, for anyone, whatever their business. Here is the honest read.

**Where it is right.** A, B and C were positioning options, not product architectures. The product that serves a Lagos cleaning company, a London SaaS founder and an Abuja agency is the same product: one engine (check → plan → write → publish → learn), one data model (project, assets, scheduled work, connected accounts, learnings), one approval surface. Nothing in the codebase is SaaS-specific except prompt wording, the list of channels, and the programmatic-SEO templates. So "one product for everyone" is already true at the engine level, and option B is simply that engine with the business type made explicit.

**Where "for everyone" fails.** It fails in three places, and all three are already visible in the repo:
1. **Copy.** `POSITIONING.md` §4 is right that "all-in-one platform" and "for any business" are scope words that nobody buys. A bakery owner and a SaaS founder need different words on the page even when the engine is identical. Your own design doc solves this with the "smart friend who runs a bakery" test; keep it.
2. **Defaults.** A SaaS founder's first week is X, LinkedIn, a blog post and an email series. A cleaner's first week is a Google Business Profile, a WhatsApp number, service pages and a review request. If the product has one default, one of them gets a useless first week and churns before the loop produces anything. The first-week pack and the agent tiers currently have exactly one default.
3. **Pricing.** $49 means one thing to a SaaS founder and another to a Lagos service business. One price list for everyone is the same mistake as one default.

**The synthesis: one engine, four playbooks.** A playbook is configuration, not code: a business type chosen in onboarding that sets default channels, which agents the first-week pack runs, which page templates and intent lists Missing Pages uses, the prompt framing, and the price list shown. Four to start: **SaaS or online product**, **Local service business**, **Agency or freelancer** (which is "run a playbook per client" plus client reports), **Creator or coach**. The positioning line stays horizontal and true: "for people who don't have a marketing team". The homepage can show the four playbooks as tabs on the sample week. In code this is a `business_type` column on `projects`, a `playbooks` field on each agent in `src/lib/ai/agents/registry.ts`, a playbook-aware first-week plan in `src/lib/first-week/plan.ts`, and channel defaults in the wizard. Small.

So: yes to building for A, B and C. No to saying "for everyone" anywhere a customer reads it, and no to one default. That is what option B meant; calling it "one engine, four playbooks" makes it buildable.

### 4.2 Decision record

| # | Decision | Status |
| --- | --- | --- |
| D1 | One product, one engine, with explicit business-type playbooks (SaaS, Local, Agency, Creator) chosen in onboarding. Positioning stays "people without a marketing team"; no page says "for any business". | **Decided 26 Oct 2026 (owner)** |
| D2 | Local service business becomes a first-class playbook now; agency is a playbook that wraps the others (per-client projects, client reports, team seats). Keep the Agency tier's promised "API access" off the pricing page until it exists. | **Decided 26 Oct 2026** |
| D3 | Pricing follows playbook: USD for SaaS/global, a naira Local tier (section 6) once Phase 1 data shows local sign-ups. | **Decided 26 Oct 2026**; naira plan IDs on Flutterwave still to be created by the owner |
| D4 | The "Modes" band in the design doc (Check all / Let social run / Hands off) becomes a real per-project setting, because Missing Pages' nightly publish and WhatsApp follow-ups are only acceptable under the user-approves rule if the user chose Hands off. | **Decided 26 Oct 2026** |
| D5 | Consolidating the five planning agents into one Plan agent changes the "18 agents" number used on the homepage, in the design doc and in the pricing tiers (10 / 14 / 15 agents). Do it only together with a pricing-page edit, or defer. | **Decided 26 Oct 2026: deferred** until the pricing page is next edited |
| D6 | Goal statement in 4.3 becomes the first line of `POSITIONING.md`. | **Decided 26 Oct 2026** |

Execution of these decisions started on 26 Oct 2026; see `docs/audits/2026-10-26-execution-plan.md` and section 11 of this document for what was built and tested.

### 4.3 Goal statement

Olayinka framed the goal as removing "every form of objective utility". Two readings, and the product should satisfy both:

- **Remove every other utility.** The customer should need no other marketing tool. `POSITIONING.md` §2 describes the pain exactly: a writer, a scheduler, an analytics dashboard, an SEO checker and an email tool, duct-taped, none talking to each other. Conduikt replaces the stack, not one tool in it. Every roadmap item in this document is a utility the customer currently buys or does by hand: a page builder, a review tool, a WhatsApp broadcaster, an ads dashboard, an answer-engine checker.
- **Remove every objection.** No reason left to say "not yet": no site (we build the page), no content (we write it), no channel connected (we connect it), no time (it runs nightly), no API credit visible to the customer (preview mode), no idea if it worked (the loop shows it).

Proposed one-line goal: **"A business owner needs no other marketing tool and no marketer to get found, publish, and improve every week."** The loop is how; the playbooks are for whom; "no other tool, no objection left" is the test for every feature. If a feature does not remove a tool or an objection, it waits.

---

## 5. The eight ideas, validated one by one

Each: what it is, demand evidence, what exists, narrowest wedge, effort (human team / Claude Code), verdict.

### 5.1 Website builder (design style, fonts, generated copy, royalty-free images)

- **Demand.** Global AI website builder market estimated at $3.2B (Precedence Research) to $6.3B in 2026, growing 20 to 26% a year; about 1 in 3 US small businesses still has no website; 58% of small businesses use generative AI (Hostinger, vendor data). Nigeria: no clean 2026 figure for website ownership; the Mastercard 2026 SME Confidence Index has 57% of Nigerian businesses operating across physical and online channels, and the Africa MSME Survey has 53% marketing online. Many Nigerian SMBs are Instagram/WhatsApp-only with no site at all.
- **Competition.** Wix ADI, Hostinger, Durable, 10Web, Framer AI, Squarespace Blueprint. A general builder is a crowded, capital-heavy fight you will not win on builder features.
- **What exists.** Programmatic SEO agent drafts page variants (meta, H1, sections, FAQ, schema) as JSON; Unsplash picker; copywriting agent; brand kit; the questionnaire captures audience and voice. No hosting, no templates, no domain mapping.
- **Wedge.** Not "a website builder". **Hosted pages**: Conduikt publishes the pages its agents write to `{slug}.conduikt.site` (later a custom domain), with three opinionated layouts (service page, local landing page, launch page) that use Direction C tokens. For a business with no site, the first-week pack generates a one-page site from the questionnaire. This is the publish target the reel's loop needs (5.3) and it is what Durable charges $15 to $25 a month for.
- **Effort.** Human ~6 weeks / CC ~1 to 2 weeks for hosted pages with three templates; a full builder is human ~6 months.
- **Verdict: build later as hosted pages, after 5.3 and 5.8. Don't build a general builder.**

### 5.2 Explee-style sales agent

- **What Explee is.** Paste your URL → AI infers ICP → finds prospects from a B2B database → sends from pre-warmed domains → handles replies → books meetings. Pay-per-email (~$0.03) or sales-gated tiers.
- **Demand.** The AI-SDR category is hot and crowded (Artisan, 11x, Landbase, Clay, Apollo). Market claims ($58B → $240B by 2030) are vendor numbers. Reviewers flag limited control over what the agent sends.
- **Fit.** Cold email needs warmed domain pools, a contact database, deliverability ops and compliance (NDPA 2023, GDPR, CAN-SPAM). None exists in Conduikt and all are expensive to run. In Nigeria B2B cold email is a weak channel; WhatsApp and referrals close deals.
- **What exists.** Inbound only: lead forms → audience → sequence. No scoring, CRM or prospecting.
- **Wedge.** An **inbound sales assistant**: lead form or WhatsApp inbound → qualification questions → scored lead → follow-up sequence on email/WhatsApp → booking link. Reuses forms, sequences and the scheduler; adds a lead score and a simple pipeline view. Prospect data, if ever, via a partner (Apollo/Clay/Bright Data MCP) rather than your own database.
- **Effort.** Inbound assistant human ~4 weeks / CC ~1 week. Explee clone human ~6 months plus ongoing deliverability ops.
- **Verdict: don't build the outbound agent. Build the inbound assistant after WhatsApp exists (section 6).**

### 5.3 The Instagram reel automation (shanepduggan, "Steal my $5000 AI agent automation")

I played the embed and captured the frames. The reel is a timestamped overnight loop for a local service business:

| Time in reel | Step | What it does |
| --- | --- | --- |
| 2:00 AM | Trigger | Scheduled nightly run. |
| 3:23 AM | Crawl + compare | Reads the site map (Home, Services, About, Contact). For each search people make ("same-day service", "free estimate", "weekend hours", "prices near me", "emergency repair", "best rated") asks "You have a page?" Finds "6 searches you're missing", each with monthly search volume. |
| 3:37 AM | Strategy agent | Scores each gap on searches a month, competition and bookings. "Picks the best one." |
| (unseen) | Builder | Writes the page. |
| 4:46 AM | Editor agent | "Checks the page" against best practices, with Google and ChatGPT readiness checks. |
| 6:03 AM | Publish | "Live on your site." Branch: existing older page → "Updated" instead of new. |
| 6:32 AM | Outcome | "Someone nearby asks" Google / ChatGPT "Who should I call near me?" |
| 6:56 AM | Outcome | "Your business in the answer" → new customer → job booked. |

**Can Conduikt do this?** Mostly, with existing pieces:

| Reel step | Conduikt today | Gap |
| --- | --- | --- |
| Crawl site structure | Site Audit fetches and scores a page (`src/lib/ai/agents/seo-audit.ts`, `/api/ai/audit`) | Audits one URL, not the site map. Add a crawl of internal links (cap 50 pages). |
| Search demand per intent | Keyword Finder + GSC data + Google autocomplete proxy (`/api/keywords/autocomplete`) | No volume/competition numbers. Needs a SERP/keyword API (DataForSEO, SerpApi, or Google Ads Keyword Planner via the Ads API). Budget ~$50/month at launch. |
| "You have a page?" matching | none | New: map intents → existing URLs with an embedding or a Claude call. |
| Strategy agent scoring | Growth Plan / Strategy agents plan at a high level | New scoring prompt: volume × low competition × booking intent. Small. |
| Builder | Programmatic SEO agent drafts pages; Copywriter; Unsplash | Output is JSON/export only. Needs a publish target (5.1 hosted pages, or the site's CMS via 5.5). |
| Editor agent | Conversion Check + Site Audit rubric + content scorer | Add an "AI-search readiness" check (clear entity statements, FAQ, schema). |
| Publish | Outbound webhooks to WordPress/Webflow/Buffer; blog publishes to conduikt.com's own blog | Needs WordPress MCP/REST publish and hosted pages. |
| Nightly run | pg_cron scheduler tick + handlers; first-week queue | Add a `missing_pages` handler. Small. |
| Outcome tracking | GSC positions, GA4 | Add page-level "appeared in AI answers" tracking later (manual spot checks first). |

**Verdict: build this first.** It is the clearest expression of "watches what worked and does better next week" and it is the feature in your list with the most reuse. Call it **Missing Pages** ("Finds the searches you have no page for, writes the page, puts it live"). Effort human ~5 weeks / CC ~2 to 3 weeks including hosted pages. Needs 5.5(a) for customers on WordPress.

Two things the written plan adds. First, this is not new scope: architecture v1 (February) scheduled an "SEO page deployment pipeline (generate → deploy to user's site)" for Phase 2 week 5, and the YC briefing lists "Programmatic SEO publishing loop" as the next thing to ship. `keyword_data` already carries `content_exists` and `asset_id` columns, which is the reel's "You have a page?" check. Second, "live on your site at 6 AM" collides with the product's own rule that the user approves before anything goes out (pitch deck slide 18, design principle 4). The page must land in "Drafts waiting for your OK" unless the project's Modes setting is Hands off (decision D4). The crawl of up to 50 pages is a long job and belongs on Inngest, which the pitch deck names as the durable layer, not on the 5-minute pg_cron tick.

### 5.4 The PDF checklist (15 local-SEO items) against the codebase

Result: **0 done, 3 partial, 12 not done**, and three items should not be built as written.

| # | Item | Status | Evidence / note |
| --- | --- | --- | --- |
| 1 | Optimise GBP categories and services | Not done | No Google Business Profile code anywhere. |
| 2 | Dedicated service pages | Partial | Programmatic SEO drafts page variants; nothing hosts or publishes them. Becomes 5.3. |
| 3 | Optimise title tags and H1s | Partial | Site Audit flags and fixes; magic audit extracts them; no per-page rewrite tool. |
| 4 | Genuinely useful local pages | Not done | PSEO templates are SaaS-shaped ("[tool] for [audience]"), no geo templates. |
| 5 | Keep business details (NAP) consistent | Not done | Needs a citation checker; start with a NAP field set in the project and a "your details on Google vs your site" diff. |
| 6 | Automate personalised review requests | Not done | Email sequences can carry it; add a "job done" trigger (form, CSV, or Zapier/webhook in) and a neutral, every-customer request. |
| 7 | Track rankings across a map grid | Not done | Only GSC positions. Needs a local-rank API (DataForSEO maps grid or similar). Cost item. |
| 8 | Build relevant local backlinks | Not done | Low-automation task; at most a "directories to list in" suggestion list. Skip for now. |
| 9 | Publish weekly GBP posts | Not done | Scheduler supports x/linkedin/tiktok/facebook only; add `gbp` as a channel once the Business Profile API is approved. |
| 10 | Add relevant structured data | Partial | Audit flags missing schema; PSEO suggests types; no generator for customer sites. Ship a LocalBusiness/Service/FAQ JSON-LD generator inside Missing Pages. |
| 11 | Embed Google Maps on every site | Not done | Trivial inside hosted pages. |
| 12 | Prioritise review velocity over totals | Not done | A metric on a reviews dashboard; needs 1/9 first. |
| 13 | llms.txt | Not done | **Low value.** Google's June 2026 guidance says Search does not use it; John Mueller called it the meta keywords of 2026; Ahrefs reportedly found 97% of published files got zero requests. Cheap to add to hosted pages, do not sell it as a ranking lever. |
| 14 | Divert 1 to 3 star reviews away from Google | Not done | **Do not build.** Review gating is prohibited by Google's rating-manipulation policy (tightened April 2026) and sources cite FTC penalties since October 2024. Compliant version: ask every customer the same way, respond to every review. |
| 15 | Add keywords to the GBP business name | Not done | **Do not build.** Violates Google's business-name guidelines; suspension risk for the customer. |

The compliant, automatable set (1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12) is a coherent **"Local pack"** and most of it is downstream of Missing Pages plus a Google Business Profile connection. The Business Profile API requires Google approval per project; apply early because it takes weeks.

### 5.5 An MCP for Conduikt to work with client websites

Two different things hide in this idea:

- **(a) Conduikt as an MCP client to the customer's site.** The official `WordPress/mcp-adapter` plugin (Application Passwords, Streamable HTTP) is now the default path; Automattic's `wordpress-mcp` was archived in January 2026. Hosts such as InstaWP and Cloudways expose hosted MCP endpoints agencies already use to manage many client sites. This is exactly the publish target 5.3 needs for customers on WordPress, and it replaces the current outbound-webhook approach with a two-way one (read existing pages, publish new ones, update old ones, which is the reel's "older page → Updated" branch). **Demand is real because it is a dependency, not a feature.**
- **(b) Conduikt as an MCP server for agencies** (drive Conduikt from Claude/ChatGPT/Cursor). No independent evidence of customer pull for SaaS-exposed MCP servers yet; it is a developer-marketing play. Cheap once a customer API exists, which it does not (no API keys, outbound webhooks only).

**Verdict:** build (a) inside Missing Pages (WordPress first, Webflow/Shopify later). Defer (b) until there is a customer API; when you do it, expose five tools (audit site, list drafts, approve draft, schedule post, get learnings) and nothing else.

### 5.6 Meta Ads (and other ads) MCP for performance insight

- **What changed.** Meta launched its own hosted Ads MCP server (mcp.facebook.com/ads) in April 2026, Meta Business OAuth, roughly 29 tools, performance queries for spend, impressions, CTR, ROAS with breakdowns. Salesforce, Triple Whale and Snowflake have endorsed it. Unofficial servers are an active ban vector; Superads recommends read-only tools for monitoring.
- **Fit.** Read-only ads performance is the best new input for the feedback loop you have: it tells the Social and Copywriter agents which hooks and audiences converted, with money attached. It also makes the "Video Ad" agent measurable.
- **What exists.** Facebook app and OAuth code (flagged off). The Meta business verification you are already waiting on is the same gate.
- **Wedge.** Connect ad account (read-only `ads_read`), nightly pull of campaign/ad-set/ad insights into a `ad_insights` table, surface in Analytics, and feed `buildPerformanceContext()` so generation prompts see "ad A (hook X) 2.1% CTR vs ad B 0.6%". Creation/editing of ads: later, approval-gated.
- **Effort.** Human ~3 weeks / CC ~1 week. Google Ads next (same shape, separate OAuth and developer token).
- **Verdict: build after verification lands; read-only first; use the official server or the Insights endpoint, never a community server.**

### 5.7 A GTM agent

- **Reality check.** "GTM agent" in the 2026 market (Landbase, Artisan, 11x, Reply.io) means autonomous outbound execution, which is 5.2. What you mean is a planning agent: positioning → ICP → channels → launch week → first 90 days.
- **What exists.** Strategy (90-day plan), Growth Plan, Launch Plan, Posting Plan, Campaign (chains agents), content-strategy. That is already five planning agents; the homepage lists them under "Plan what to say".
- **Verdict: don't add an eighth planner.** Consolidate: one **Plan** agent whose output is a dated, executable plan whose steps are Campaign runs, so "plan" becomes "scheduled work" instead of a document. That is a prompt and orchestration change (human ~2 weeks / CC ~3 days) and it removes three menu items the user has to understand. Caveat (decision D5): the agent count is load-bearing in the pricing tiers and on the homepage, so consolidate when the pricing page is next edited, not before.

### 5.8 Onboarding as a questionnaire

- **Today** there are four overlapping onboarding surfaces: the 5-slide tour (`components/onboarding/onboarding-tour.tsx`), the 4-step wizard with 6 questions, the optional 11-field brand profile at `/projects/[id]/onboarding` (industry, description, audience, pain point, channels, voice, voice example, goal, competitors), and "Your direction" in settings. Plus the signed-out magic audit path. None of them changes what the product does afterwards; the answers are injected into prompts.
- **Verdict: build now, and make it the fork for section 4.** One adaptive questionnaire, 6 to 8 questions, first question "What kind of business?" (SaaS or online product / local service business / agency or freelancer marketing clients / creator). The answer sets: default channels (SaaS → X, LinkedIn, email; Local → GBP, WhatsApp, Instagram, hosted pages), which agents the first-week pack runs, the brand-profile fields, and whether to offer "we'll build your site" when there is no URL. Kill the slide tour; the empty-state card already explains the next step. Fold the 11-field profile into the questionnaire so there is one place.
- **Effort.** Human ~2 weeks / CC ~3 to 4 days.

### 5.9 AEO, GEO and the other "EOs": being the answer, not just the result

**The vocabulary, so the team uses one word each.**
- **SEO**: ranking in the ten blue links.
- **AEO** (answer engine optimisation): being the direct answer in Google's AI Overviews, featured snippets, People Also Ask, and voice assistants. The unit is a question and a self-contained answer.
- **GEO** (generative engine optimisation, also sold as LLMO or AIO): being mentioned or cited when ChatGPT, Perplexity, Gemini or Claude answer "who should I call for X in Lagos" or "best tool for Y". The unit is an entity with consistent facts and third-party corroboration.
- **SXO** (search experience optimisation): what happens after the click; your Conversion Check agent already covers it.
- The reel's last three frames ("Someone nearby asks Google / ChatGPT", "Your business in the answer") are AEO + GEO. Nothing in any Conduikt document mentions either; the only related hook is a `schema-markup` agent planned in February and never built.

**What the evidence says moves AEO/GEO** (and what does not):
- Crawlable, allowed content: robots must not block GPTBot, PerplexityBot, ClaudeBot, Google-Extended. Many sites block them by accident.
- Answer-first structure: a question as the heading, a two-sentence direct answer, then detail. Self-contained sections that still make sense when lifted out of the page.
- Entity clarity: the business says plainly what it is, where it is, who it serves, since when, with the same name, address and phone everywhere (this is the NAP item from the PDF, seen from the AI side).
- Claims with dates and sources; freshness signals (dated updates).
- Structured data that matches the visible text: Organization or LocalBusiness, Service, FAQPage, Article. Schema is the one machine-readable statement of the entity.
- Off-site corroboration: Google Business Profile, reviews, directories, press, Reddit and forum mentions. Generative engines weight multi-source agreement; a page alone rarely gets cited.
- **Not** llms.txt (Google says Search does not use it; near-zero crawler requests in the wild), not word-count rules, not guaranteed placements. Treat any vendor promising "rank in ChatGPT" the way you treat "rank #1 on Google" promises.

**How to implement it with what exists** (no new infrastructure; each is a prompt, a rubric row, a table or a scheduled job):

| # | Piece | Builds on | Effort (human / CC) |
| --- | --- | --- | --- |
| 1 | **Answer readiness in Site Audit.** Add a scored section to the rubric in `src/lib/ai/agents/seo-audit.ts`: AI-crawler access in robots, entity statement present, question headings, direct answers, FAQ block, dated content, schema present and matching visible text. Surfaces as one line on the site score: "How ready the site is for Google and AI answers". | audit rubric, `/api/ai/audit` | 1 week / 2 days |
| 2 | **Answer-first writing rules** in Blog, Copywriter, Landing Pages and Missing Pages prompts: question heading, two-sentence answer, entity sentence, FAQ, date. The content scorer gets an "answerability" dimension. | agent prompts, `content-scorer` | 3 days / 1 day |
| 3 | **Schema generator.** JSON-LD for LocalBusiness / Organization, Service, FAQPage, Article, emitted with every hosted page and offered as a paste-ready snippet in audit fixes for external sites. This is the February `schema-markup` agent, finally. | audit code-fix output, hosted pages | 1 week / 2 days |
| 4 | **Found-by-AI monitor.** Nightly job asks a set of generative engines the project's 5 to 10 money questions ("best X near Y", "who should I call for Z") and records whether the business is named or cited, with the competitor that was. Store in `ai_visibility_checks`; show on Analytics; feed `buildPerformanceContext()` so next week's Missing Pages targets the questions you lost. Start with Perplexity's API and Claude with web search; add Gemini and ChatGPT as their APIs allow. Budget-capped per plan. | Inngest, Analytics, performance context | 2 weeks / 4 days |
| 5 | **Corroboration playbook.** For Local: GBP, reviews, directories (the Local pack). For SaaS: G2, Product Hunt, Reddit threads, which the Launch Plan agent already lists; make them tracked tasks with a "mentioned?" check instead of a document. | Launch Plan, scheduler | 1 week / 2 days |
| 6 | **Conduikt's own site** sets the example: allow AI crawlers, add FAQPage and Organization schema to the homepage (there is already an Organization JSON-LD in `src/lib/seo/homepage-schema.ts`), answer-first guides. Zero product work, same week. | marketing site | 1 day |

Sequencing: 1, 2 and 3 ride inside Missing Pages (Phase 2); 4 is Phase 3 with the Meta work; 5 is Phase 4 with the Local pack; 6 is this week. Sell it with the design doc's words, not the acronyms: "Ready for Google and AI answers", never "AEO".

---

## 6. What you are missing

Ranked by how much they change the business, not by effort.

1. **WhatsApp as a channel (Business Platform / Cloud API).** Nigeria has 55 to 90 million WhatsApp users depending on source; vendor data puts business-message open rates at 95%+ and Meta's 2026 Nigeria marketing conversation price at about $0.05. It is where Nigerian customers actually talk to businesses. Use cases that drop straight into existing primitives: review requests (5.4 #6), sequence steps, broadcast one-off messages, inbound lead capture for 5.2. Requires consent under NDPA 2023 and the same Meta verification. This is the single biggest missing channel for the local ICP.
2. **Instagram publishing.** Absent entirely, yet it is the primary channel for the testimonial users and for Nigerian SMBs. Same Meta app. The Video Ad agent has no native home without it.
3. **A no-credit / preview mode and cost control.** Every trial depends on your Anthropic balance. Add: a cached sample output per agent for the signed-out and Free previews; per-plan model routing (Haiku for previews and scoring, Sonnet for paid runs); a hard daily spend cap with an admin alert; honest error copy ("We couldn't reach the writing service, nothing was charged, try again in a few minutes") instead of "This one hit a problem".
4. **Naira pricing.** $49 is ₦75,000+ today. Flutterwave is live; a ₦-denominated Local tier (₦15,000 to ₦25,000) with WhatsApp and GBP included would be the first thing a Lagos agency compares against a freelancer's retainer. Keep USD for the global SaaS tier.
5. **Google Business Profile connection** (apply for API access now; it gates 5.4 #1, #9, #12).
6. **Email deliverability basics**: double opt-in (absent), custom sending domain (waitlist), a suppression list screen. Without these, broadcasts from a shared domain will hurt the sender reputation you share across customers.
7. **Observability.** The plan left "Sentry vs Vercel Observability" undecided. Pick one this week; the failed first-week runs above would have paged you.
8. **Security items from section 3** (RLS baseline, global rate limiting, CSP enforce, cron header, token encryption on Google callbacks).
9. **Honesty gaps in copy.** The homepage says "16 agents" and "Posts to X and LinkedIn"; the app has 18 ids and Facebook "coming soon" has been there since the Meta verification started. The Agency tier has advertised "API access" since February and no customer API exists. Keep the count in one place (`AI_AGENT_COUNT` in `src/lib/ai/agents/display.ts` already does this for the marketing site; the registry's extra "tool" agents are what make it 18) and remove "coming soon" tiles until they are two weeks away.
10. **Repo hygiene** (section 3 #9 and #10) before you show the repo to anyone again.

---

## 7. Alignment with the existing infrastructure and the written plan

Short answer: the roadmap does not deviate from the goal. It deviates from one document (the June positioning), which every other document and the code already contradict, and it adds one piece of infrastructure (hosted pages). Everything else extends a pattern that is already in the repo.

### 7.1 Each roadmap item against the architecture

| Roadmap item | Existing pattern it extends | Already in the written plan? | New infrastructure? |
| --- | --- | --- | --- |
| Orphan/nav fix, preview mode, error copy | sidebar, dashboard overview, `generateWithClaude` | Product plan §4.1 wanted the tour sunset and the onboarding surfaces reduced | No |
| Adaptive onboarding with business-type fork | `projects` onboarding columns (Mar 2026 migration), first-week plan, wizard | Yes in spirit (product plan); `business_type` column is additive | No |
| Missing Pages agent | `AgentConfig` registry; `scheduled_executions` handlers; `keyword_data.content_exists` / `asset_id`; programmatic-seo agent; audit fetcher | **Yes**: architecture v1 Phase 2 week 5 "SEO page deployment pipeline"; YC #5 "Programmatic SEO publishing loop"; DataForSEO planned in v2 §3 | Paid keyword/SERP API; long crawl on Inngest |
| Hosted pages on `*.conduikt.site` | Next.js App Router, Vercel | Pitch deck already claims a conduikt-hosted blog; `build.conduikt.com` named in the design doc's out-of-scope list | **Yes**: wildcard domain on Vercel (requires Vercel nameservers for the wildcard certificate), a public non-RLS read path, a `hosted_pages` table, later custom domains via TXT verification. Vercel's Platforms starter kit is the reference pattern. |
| WordPress MCP / REST publish | `src/lib/integrations/*` clients, `webhook-dispatch.ts` deterministic publisher | Partly (webhooks to WordPress exist) | New inbound-read capability and a `site_connections` entity; no new service |
| Instagram publishing | Facebook/TikTok channel migrations (three CHECK constraints each), `connected_accounts`, publish cron | Yes: pitch deck slide 10 and 22 | No; same Meta app, pending verification |
| WhatsApp (Cloud API) | `scheduled_executions` handler like `email-sequence-step`; audiences/contacts | **No document mentions it** | New platform and inbound webhook; consent fields on contacts; Meta verification |
| Meta Ads read-only insights | Inngest sync functions, `post_metrics` pattern, `buildPerformanceContext()`; `assets.channel` has carried `meta_ads` / `google_ads` since v1 | Yes: `paid-ads` skill planned in v1 and v2, never built | `ad_insights` table only |
| Google Business Profile | per-project Google connections (May 2026 migration, written for agencies); new `gbp` channel | Only pitch deck slide 20 ("Local businesses: SEO + Google reviews + email") | Google API approval (manual review, 0 QPM until approved, website on the request must match the profile); apply now |
| AEO/GEO pieces (5.9) | audit rubric, agent prompts, Inngest, Analytics | `schema-markup` skill planned in v1/v2, never built; otherwise absent | `ai_visibility_checks` table; engine API spend |
| Consolidating planners | registry only | Conflicts with design doc "out of scope: any change to the agent registry or pricing" and with tier definitions by agent count | No, but decision D5 |
| Inbound sales assistant | lead forms, sequences, scheduler | No | Lead score column, pipeline view |

### 7.2 Where this document corrects itself after the cross-check

- Section 4 originally said `POSITIONING.md` excludes local businesses. It does not; it excludes agencies, enterprise, e-commerce, publishers and B2C apps, and never mentions local businesses. The pitch deck and overview include them. Corrected above.
- Missing Pages was presented as new scope. It is the February page-deployment pipeline and the YC "next to ship" item, with a strategy step in front. That strengthens the case.
- The nightly auto-publish in the reel must respect the user-approves rule unless Hands off is chosen (decision D4).
- The scheduler's channel constraint also allows `email`, not only x / linkedin / tiktok / facebook.
- Two job systems coexist (pg_cron handlers for short, scheduled work; Inngest for long, durable jobs). Crawls, ad-insight syncs and the found-by-AI monitor go on Inngest; page publishing and WhatsApp steps go on the scheduler handlers.
- Product plan §9 shelves white-label portals and custom domains until three paying Pro customers ask. Hosted pages on a Conduikt subdomain do not reopen that; custom domains on hosted pages do, so they stay in "Later" with the same evidence rule.

### 7.3 Open decisions this plan inherits from the docs

- Modes (Check all / Let social run / Hands off) as a real setting: design doc "Open decisions". Needed by Phase 2.
- Sentry vs Vercel Observability: product plan. Needed by Phase 0.
- CSP enforce date: product plan. Phase 0.
- Agency "API access" promise: pricing page. Remove the line or ship a minimal key-based API with the MCP server in "Later".

---

## 8. Recommended sequence

| Phase | Weeks | Ships | Why first |
| --- | --- | --- | --- |
| 0. Stop the bleeding | 1 | Orphan/nav fix (section 2); no-credit preview mode and error copy; Tawk off auth pages; Sentry; RLS baseline + typed DB; cron header; Google token encryption; repo hygiene; AI crawlers allowed + FAQ schema on conduikt.com (5.9 #6); apply for the Google Business Profile API and chase Meta verification | Cheap, unblocks demos, removes the "two homes" confusion every new user hits; starts the two external clocks |
| 1. Decide and ask | 1 | Confirm decisions D1 to D6; rewrite `POSITIONING.md` §1 and §7; adaptive onboarding questionnaire with the business-type fork (5.8); remove slide tour; Modes as a real per-project setting (D4); planner consolidation only if pricing is edited (D5) | Creates the data that settles section 4 and routes users to the right playbook |
| 2. Missing Pages | 3 | Site crawl on Inngest, intent gap finder with real volumes, scoring, page builder with answer-first rules, editor check with answer readiness + schema + FAQ (5.9 #1 to #3), hosted pages on `*.conduikt.site`, WordPress MCP publish, nightly run into Drafts (or live under Hands off), "older page → updated" branch (5.3, 5.1 wedge, 5.5a, 5.4 #2 #3 #4 #10 #11) | Biggest reuse, strongest demo, the reel's loop end to end, and the February plan finally shipped |
| 3. Meta unlock | 2 (after verification) | Instagram publishing, Facebook publishing on, WhatsApp Cloud API as a sequence/broadcast channel, read-only Meta Ads insights into the loop, Found-by-AI monitor (5.6, 5.9 #4, section 6 #1 #2) | One verification unlocks four features; the loop finally gets local-channel and answer-engine data |
| 4. Local pack | 3 | GBP connect + weekly GBP posts + review requests on WhatsApp/email + reviews dashboard with velocity + NAP check + map-grid rank (paid API) + corroboration tasks (5.4 compliant set, 5.9 #5); naira Local tier (D3) | Completes the local playbook; sells to agencies as a per-client retainer replacement |
| 5. Inbound sales assistant | 2 | Lead scoring, pipeline view, WhatsApp follow-ups, booking link (5.2 wedge) | Only after WhatsApp exists |
| Later | — | Custom domains on hosted pages, Google Ads insights, Conduikt MCP server for agencies (5.5b), naira Local tier (can go earlier if Phase 1 data says local) | |

Total: roughly one quarter of focused work with Claude Code; the Meta verification is the only external dependency on the critical path, so chase it now.

---

## 9. The assignment (office-hours rule: one real-world action)

Before Phase 2, sit behind three of the people who already use Conduikt (start with the four on the homepage) and watch them use it for twenty minutes without helping. Ask one question at the end: "What would you pay ₦20,000 a month for Conduikt to do without you touching it?" If two of three say something in the Local pack, section 4 is settled. If they say "write my LinkedIn posts", keep the SaaS-founder story and ship Phase 2 as a SaaS feature (missing pages works for SaaS too; the intents just change).

---

## 10. Sources

Market and demand
- AI website builder market: [Precedence Research via web60](https://web60.ie/blog/ai-website-builder-market-3-billion), [Hostinger 2026 stats](https://www.hostinger.com/blog/ai-website-builder), [uithings](https://uithings.com/website-builder-statistics), [trakkr consensus](https://trakkr.ai/ai-recommends/website-builders/small-business)
- Explee: [G2 pricing](https://g2.com/products/explee/pricing), [Salesforge review](https://www.salesforge.ai/blog/explee-review), [xpay agent-ready index](https://www.xpay.sh/agent-ready-index/explee/), [AlternativeTo](https://alternativeto.net/software/explee-com/about)
- GTM agents: [Reply.io](https://reply.io/blog/best-ai-gtm-agent-tools/), [Landbase](https://www.landbase.com/blog/best-tools-go-to-market-automation), [Artisan](https://www.artisan.co/blog/the-best-ai-gtm-platforms), [GTM stats](https://www.shno.co/marketing-statistics/go-to-market-strategy-statistics)
- Meta Ads MCP: [Meta developer blog](https://developers.facebook.com/blog/post/2026/07/16/meta-ads-mcp-server/), [Meta docs](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview), [ppc.land](https://ppc.land/meta-opens-ads-mcp-to-any-app-cutting-integration-code-to-zero/), [Superscale](https://superscale.ai/learn/meta-ads-mcp/), [Superads on ban vectors](https://www.superads.ai/blog/facebook-ads-mcp), [Markifact](https://kdhnews.com/online_features/press_releases/markifact-launches-meta-ads-mcp-for-claude-chatgpt-and-ai-agents/article_ad72a478-ceae-5382-a0c3-3e05cf9ade66.html)
- WordPress MCP: [InstaWP comparison](https://instawp.com/best-wordpress-mcp-servers-compared/), [WP Umbrella](https://wp-umbrella.com/?p=5618), [GravityKit](https://www.gravitykit.com/what-is-a-wordpress-mcp-server/), [Cloudways agency use](https://www.cloudways.com/blog/mcp-cloud-agency-use-cases/)
- Instagram DM automation market: [Inro](https://inro.social/blog/manychat-competitors-alternatives-2026), [Hyperleap](https://hyperleap.ai/comparison/best-instagram-dm-automation-2026), [Boei](https://boei.help/blog/best-instagram-chatbot/), [ReplyRush](https://www.replyrush.com/post/best-manychat-alternative)
- Review/GBP software: [Birdeye 2026](https://birdeye.com/blog/google-review-management-software-2026/), [Synup automation guide](https://www.synup.com/fr/learn/automated-local-seo-tools-workflows), [Acquire.com GBP SaaS listing](https://app.acquire.com/startup/k4lqrh58ay-ai-automated-google-business-profile-management-134k-arr-94-margins-308-yoy-growth)

Policy
- Review gating: [BetterBunch on 2026 policy](https://www.betterbunch.com/blogs-and-articles/google-2026-policy-updates), [Reviewflowz myths](https://help.reviewflowz.com/en/articles/15809716-google-review-policy-the-myths-everyone-repeats-debunked-with-google-s-own-words), [Adapt compliance report](https://adaptdigitalsolutions.com/articles/google-review-policy-2026-compliance-guide/), [Vendasta](https://www.vendasta.com/blog/?p=69382)
- llms.txt: [Search Engine Journal](https://searchenginejournal.com/googles-mueller-says-llms-txt-cant-help), [Shopifreaks](https://www.shopifreaks.com/?p=19531), [Passionfruit on Google guidance](https://www.getpassionfruit.com/blog/should-i-create-an-llms.txt-file-google-s-2026-guidance-explained), [Gupta](https://guptadeepak.com/llms-txt-meta-keywords-2026/)

Nigeria and Africa
- [GeoPoll/Africa 118 MSME Pulse via Africa B2B Tech Report](https://ctlaughlin.substack.com/p/the-africa-b2b-tech-report-9f8?open=false), [TechEconomy on African marketers' AI usage](https://techeconomy.ng/african-marketers-ai-usage-skills-gap-2025), [TechEconomy on AI in Nigerian marketing](https://techeconomy.ng/ais-impact-a-new-era-for-tech-marketing-in-nigeria), [Mastercard SME Confidence Index via Digg](https://digg.com/tech/82192182-821b-402b-8f58-a7d43bdac5bc), [Moniepoint small business stats](https://blog.moniepoint.com/nigeria-small-business-statistics/), [GSMA MSME e-commerce](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/gsma_resources/webinar-e-commerce-in-nigeria-unleashing-the-opportunity-for-msmes/)
- Local SEO gap: [Oladejo Elisha](https://www.barchart.com/story/news/33938190/oladejo-elisha-warns-of-ongoing-local-seo-gap-hurting-nigerian-businesses), [Ranktracker Nigeria guide](https://www.ranktracker.com/blog/a-complete-guide-for-doing-local-seo-in-nigeria/), [NEWMEDIA GBP stats](https://newmedia.com/blog/google-business-profile-statistics)
- WhatsApp: [ChatDaddy Nigeria guide](https://chatdaddy.tech/blog/whatsapp-business-api-nigeria-guide), [Chatmaxima stats](https://chatmaxima.com/blog/?p=3556), [TechRT](https://techrt.com/whatsapp-business-usage-statistics/), [MSME Africa on Oct 2026 reply charges](https://msmeafricaonline.com/whatsapp-to-charge-businesses-for-customer-replies-from-october-2026/), [Yournotify](https://yournotify.com/blog/whatsapp-marketing-whatsapp-business-api-guide/)
- Reel: [instagram.com/reel/Dd_cB-QThC_](https://www.instagram.com/reel/Dd_cB-QThC_/) (frames captured via the embed endpoint)

Infrastructure
- Vercel multi-tenant: [Platforms docs](https://vercel.com/docs/platforms/multi-tenant-platforms/concepts), [configuring wildcard domains](https://vercel.com/docs/platforms/multi-tenant-platforms/configuring-domains), [Platforms starter kit](https://vercel.com/templates/next.js/platforms-starter-kit)
- Google Business Profile API: [Google FAQ](https://developers.google.com/my-business/content/faq), [access and OAuth setup](https://unified.to/blog/how_to_set_up_google_business_profile_api_access_and_get_oauth_2_credentials), [2026 access guide](https://slashpost.ai/blogs/google-business-profile/google-business-profile-api-documentation-2026), [quota 0 QPM thread](https://discuss.google.dev/t/gbp-api-access-request-no-response-quota-still-0-qpm-after-resubmission/380564)

Internal documents cross-checked: `SYSTEM_ARCHITECTURE.md`, `SYSTEM_ARCHITECTURE_v2.md`, `ARCHITECTURE_ADDENDUM_v2.1.md`, `PITCH-DECK.md`, `YC-APPLICATION-BRIEFING.md`, `PRODUCT-PLAN.md`, `PROGRESS_REPORT.md`, `CHANGELOG.md`, `POSITIONING.md`, `conduikt-pricing-strategy-v2.md`, `CONDUIKT-OVERVIEW.md`, `docs/DESIGN.md`, `docs/launch/LAUNCH-CHECKLIST.md`, and the owner's PDF "B2C email marketing campaigns" (a 15-item local-SEO checklist, section 5.4).

---

## 11. Execution feedback (26 Oct 2026, session cut short by the usage limit)

**Built (uncommitted, on `main` working tree):** six workstreams from `docs/audits/2026-10-26-execution-plan.md`.
- Phase 0: sidebar Home is the Overview, legacy launcher redirects, orphans linked (forms, competitors, marketing kit), settings tabs from one source, slide tour removed, Tawk off auth pages, dead link fixed; typed `AIUnavailableError` with one honest sentence and 503s across every model route, sample previews when the model is unreachable, cheap-model routing for previews/scoring, daily spend cap with admin alert; cron secret header-only (+ migration), Google tokens encrypted, csp-report rate-limited, AI crawlers allowed in robots, FAQ schema moved to the homepage, `.env.example` rewritten, 4 scaffold docs deleted, 13 docs moved to `docs/`, personal files moved to `../conduikt-private/`, pitch-deck binaries untracked, 13 dead files and 14 unused packages removed.
- Phase 1: playbooks (`src/lib/playbooks.ts`), 5-step wizard with the business-type fork and "I don't have a website yet", Modes and business type in project settings, zod-validated project APIs, "API access" removed from pricing, `docs/POSITIONING.md` rewritten (D1, D6), decisions D1 to D6 recorded as decided.
- Phase 2: site crawler, keyword-volume provider (DataForSEO or estimate), intents/gaps/score/build/review/run, `missing-page` agent, hosted pages (`/p/{site}/{slug}` now, `*.conduikt.site` when DNS exists), WordPress publish, Missing Pages page and APIs, nightly Inngest job, answer-readiness checker and schema generator, answer-first rules in Blog/Copywriter/Landing Pages prompts, answer-readiness rows in the Site Audit rubric.
- Phase 3 scaffolds: Instagram publish (behind the Facebook flag, wired into the publish cron), Meta Ads read-only insights (OAuth, sync, summary, analytics card, prompt context), WhatsApp Cloud API (connect, webhook, sequence step handler, consent fields), Found-by-AI monitor (Perplexity provider, nightly job, card, prompt context).

**Verified:** `tsc` 0 errors; eslint 0 errors (warnings only); hex check unchanged at 152; vitest 1,075 tests green across 89 files (two tests updated to the new contracts: cron rejects `?secret=`, audit prompt bound 3,500). Browser: Tawk absent on /login; Overview is Home with a Project settings link; pricing has no "API access"; homepage carries FAQPage and Organization schema; unknown hosted page returns 404; cron returns 401 for query-string and wrong-header secrets; the new wizard shows the four playbooks, the no-website fork (business name, where you work, what you offer) and the Local channel question (Google Business Profile, WhatsApp, Instagram, Facebook). The walkthrough stopped at wizard question 2 of 5 when the session's usage limit was reached.

**Walkthrough continued (27 Oct):** settings tabs include Marketing kit and the marketing kit page renders; the sign-up forms page is reachable; project settings show the three Modes, the four business types and "Build my page"; the Missing Pages page renders with the hosted-site target (`demo-audit-co.conduikt.site`), WordPress option and nightly toggle; the analytics page shows the ads and answer-engine cards in their honest "not connected" states; re-running a failed first-week agent now shows "The writing service is unavailable. Nothing was charged." with Try again; both "Go to your overview" links are present.

**Blocked on database access:** project creation end to end, Modes save, Missing Pages run and nightly jobs all write the new columns and tables from the seven `20261026_*` migrations. The Supabase connector in this session is signed in to an account that can only see a different project (another organisation), and no CLI, `psql` or database URL is configured on this machine. To unblock, either invite that account to the Conduikt organisation (Supabase dashboard → Organization → Team) or put the project's Session-pooler connection string into `.env.local` as `SUPABASE_DB_URL` (Project Settings → Database → Connection string); the migrations then apply with `npx supabase@latest db push --db-url "$SUPABASE_DB_URL"`. Never paste the password into chat.

**5 Nov 2026, database and end-to-end run.** The app-level Supabase connector reached the Conduikt project. Eight migrations were applied in order (the seven `20261026_*` files plus `20260908_content_revisions`, which had never reached production, so revision history was broken there until today). Verification: all 52 tables have RLS on; every new table has its policies; the security advisor reports only pre-existing items (nine SECURITY DEFINER functions callable through the API, two functions with a mutable search path, two side-project tables with no policies, leaked-password protection off). The cron re-schedule migration was found to be unsafe as written: production's `publish-scheduled-posts` and `scheduler-tick` already send the header with the secret embedded, and `app.cron_secret` is not set, so the migration was rewritten to be a no-op until that setting exists; the live jobs were left untouched and keep succeeding. `fill-x-bracket-daily` already uses the unset setting and therefore sends an empty header; fix by setting `app.cron_secret` or re-creating that job like the other two.

Headless Playwright walkthrough as the demo user: sign-in; wizard as "Local service business" with "I don't have a website yet" (business name, where you work, what you offer; five Local questions including Google Business Profile and WhatsApp as channels; the About-your-business step); the plan limit correctly blocked a second Free-plan project with an Upgrade prompt; after removing the earlier demo project, creation succeeded with `business_type = local`, `wants_hosted_page = true`, location and services stored; Modes saved to Hands off through the API; a manual Missing Pages run checked 21 searches, wrote "Pipe repairs near me in Lekki, Lagos" with an answer-readiness score of 100 and, because the project was in Hands off, published it to the hosted site; the public page, site index and sitemap render with JSON-LD and a FAQ at `/p/ade-s-plumbing/…`.

Three fixes came out of the run: the support chat bubble sat over the wizard's Next button on narrow screens (hidden on the wizard now); projects with no website queued no first-week agents (they now start a Missing Pages run and land on that page, and the first-week screen explains the path); and Missing Pages generations were not counted against the plan (they now check the limit first, record the generation and increment the owner's count, returning 429 when the plan is exhausted). The fictional demo project was deleted through the app afterwards so its page never goes public.

**Also left for the owner:** Meta verification, Google Business Profile API approval, DataForSEO and Perplexity keys, the `*.conduikt.site` wildcard domain on Vercel, CRON_SECRET rotation and `app.cron_secret`, enabling leaked-password protection in Supabase Auth, and a decision on the SECURITY DEFINER functions the advisor lists. The work is committed on branch `feat/audit-roadmap-execution` (not pushed).
