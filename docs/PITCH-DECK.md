---
marp: true
theme: default
paginate: true
size: 16:9
header: 'Conduikt — AI Marketing Automation'
footer: 'conduikt.com'
style: |
  section { font-family: 'Segoe UI', sans-serif; font-size: 22px; }
  h1 { color: #1F6B66; font-size: 44px; }
  h2 { color: #1F6B66; font-size: 34px; }
  h3 { color: #D9663A; font-size: 26px; }
  table { font-size: 18px; }
  code { background: #f4f1ec; padding: 2px 6px; border-radius: 4px; }
  blockquote { border-left: 4px solid #D9663A; padding-left: 16px; color: #555; }
---

# Conduikt
### AI Marketing Automation — a working application of multi-agent AI in industry

> Pitch deck / lecture supplement
> Audience: MSc IT students and industry practitioners
> One-liner: **The marketing department, replaced by a constellation of specialised AI agents.**

---

## Slide 1 — Cover

**Conduikt**
The AI-native marketing operating system.

> "A team of 20 specialised AI agents that research, strategise, write, design, schedule, publish, measure, and iterate — for any business, in any niche, in any language."

- Founded: Lagos, Nigeria
- Stack: Next.js 15 · Supabase · Anthropic Claude · Inngest · HeyGen · ElevenLabs
- Status: Live at **conduikt.com**

---

## Slide 2 — The problem

A modern marketing team needs **9 distinct skill sets** to function:

| Role | What they do |
|---|---|
| SEO strategist | Keyword research, site audits |
| Content strategist | Editorial calendars, pillar content |
| Copywriter | Landing pages, ads, emails |
| Social media manager | Daily posts across 4+ platforms |
| Video producer | Short-form ad creative |
| Email marketer | Sequences, broadcasts, list hygiene |
| Growth marketer | A/B tests, CRO, launch plans |
| Data analyst | GA4, Search Console, post-level metrics |
| Designer | Visual assets, brand consistency |

**Cost:** $20k–$60k/month for a small team. **Speed:** 2–8 weeks per campaign.

**The gap:** Most startups, SMBs, and even agency clients cannot afford this stack. They ship sporadic, inconsistent marketing — and lose to better-resourced incumbents.

---

## Slide 3 — The solution

**One platform. One operator. 20 AI agents. Continuous output.**

```
User input ──► Onboarding Agent ──► Strategy → Content → Distribution → Measurement
                                          ↑__________ feedback loop _________|
```

A user describes their business once. From that moment, Conduikt:

1. **Researches** the market, competitors, keywords, and audience.
2. **Plans** a 30/60/90-day marketing strategy with KPIs.
3. **Generates** blog posts, social content, email sequences, ad copy, and short-form video.
4. **Publishes** on a schedule across LinkedIn, X, email, and the site's own blog.
5. **Measures** real performance via GA4, Search Console, and platform APIs.
6. **Learns** from results and feeds insight back into the next generation.

---

## Slide 4 — System architecture (one diagram)

```
┌──────────────────────────────────────────────────────────────────┐
│                        Conduikt Web App                          │
│            (Next.js 15, App Router, React Server Components)     │
└──────────────────────────────────────────────────────────────────┘
                │                            │                  │
                ▼                            ▼                  ▼
     ┌──────────────────┐         ┌──────────────────┐  ┌──────────────┐
     │  Supabase Postgres│        │  Anthropic Claude │  │  Inngest     │
     │  (RLS, RPC, JSONB)│        │  (Sonnet/Opus)   │  │  durable     │
     │  · 10 tables     │         │  · 20 agents     │  │  workflows   │
     │  · pg_cron       │         │  · Tool use      │  │              │
     └──────────────────┘         └──────────────────┘  └──────────────┘
                │                            │                  │
                └──────────────┬─────────────┴───────────────┬──┘
                               ▼                             ▼
            ┌─────────────────────────────┐    ┌───────────────────────┐
            │  Publishing connectors      │    │  Measurement APIs     │
            │  · LinkedIn API             │    │  · Google Analytics 4 │
            │  · X (Twitter) API v2       │    │  · Search Console     │
            │  · Resend (email)           │    │  · YouTube Data API   │
            │  · HeyGen (avatar video)    │    │  · Platform metrics   │
            │  · ElevenLabs (voice)       │    │                       │
            └─────────────────────────────┘    └───────────────────────┘
```

Three primary subsystems: **knowledge (DB)**, **intelligence (agents)**, **action (connectors)**.

---

## Slide 5 — The AI layer

Conduikt runs **20 specialised Claude agents**, each with its own:
- System prompt (3,000–8,000 tokens)
- Output schema (strict JSON)
- Tool repertoire (search, scrape, image, etc.)
- Retry & validation policy

### Strategy agents (5)

| # | Agent | Job |
|---|---|---|
| 1 | **Onboarding Advisor** | Interviews the user, extracts brand DNA, proposes a 30-day plan |
| 2 | **Content Strategy** | Quarterly pillar plan with topic clusters and editorial calendar |
| 3 | **Launch Strategy** | Day-by-day pre-launch / launch / first-30-days plan with assets |
| 4 | **Growth Playbook** | Prioritised activation, retention, and referral plays |
| 5 | **Posting Plan** | Week-by-week X + LinkedIn cadence with hooks and video briefs |

### Analysis agents (5)

| # | Agent | Job |
|---|---|---|
| 6 | **Competitor Intel** | One-shot AI analysis of competitor positioning and content gaps |
| 7 | **Keyword Research** | Ideation + clustering + intent classification + difficulty |
| 8 | **SEO Audit** | Technical + on-page audit, prioritised fixes ranked by ROI |
| 9 | **Page CRO** | Conversion audit of any live landing page |
| 10 | **A/B Test Setup** | Hypothesis, sample size, decision rules + variants |

### Creation agents (6)

| # | Agent | Job |
|---|---|---|
| 11 | **Blog** | SEO-optimised 1500-word articles with image selection |
| 12 | **Social Content** | Platform-native posts (LI, X, FB, IG) with hashtags |
| 13 | **Copywriting** | Landing pages, ad copy, taglines, hero sections |
| 14 | **Email Sequence** | 3–7 step drip nurtures with trigger + delay logic |
| 15 | **Programmatic SEO** | Batch-generates unique templated landing pages from a dataset |
| 16 | **Video Ad / Script** | 30/60/90-second short-form video scripts → HeyGen pipeline |

### Distribution & orchestration agents (3)

| # | Agent | Job |
|---|---|---|
| 17 | **Campaign Orchestrator** | Multi-step campaign: research → write → schedule → publish → measure |
| 18 | **Calendar Agent** | Smart scheduling across channels, conflict-aware, audience-time-zone aware |
| 19 | **Client Reports** | White-label PDF reports with branding, metrics, and content analysis |

### Quality-control agent (1)

| # | Agent | Job |
|---|---|---|
| 20 | **Content Scorer** | LLM-as-judge: grades any generated asset against a rubric, suggests revisions |

Each agent is a **first-class citizen** with its own model, temperature, max tokens, and evaluation harness.

---

## Slide 6 — The data model

10 normalised Postgres tables under Supabase Row-Level Security:

- `profiles` · `projects` · `assets` · `campaigns`
- `audiences` · `contacts` · `email_sequences` · `broadcasts`
- `scheduled_posts` · `video_jobs`

**Why it matters:** because data is structured (not just dumped to a vector DB), Conduikt can:
- Re-render any asset across formats (blog → LinkedIn thread → email → tweet)
- Reuse research across agents (one keyword report feeds 14 downstream agents)
- Run analytics across users at the row level, not by re-prompting an LLM

---

## Slide 7 — Feature pillar 1: STRATEGY

The user provides a URL. Within 90 seconds, Conduikt produces:

- **Brand DNA brief**: positioning, voice, audience personas
- **Competitor map**: top 5 competitors, their angles, weaknesses
- **Keyword universe**: 100+ keywords clustered by intent + difficulty
- **30/60/90-day plan**: weekly objectives, KPIs, content calendar
- **SEO audit**: Lighthouse + crawl + recommendations, ranked by ROI

**AI application:** retrieval-augmented planning. Each agent uses **tool calling** (web fetch, sitemap parse, Lighthouse API) to ground its output in the user's actual site, not training data.

---

## Slide 8 — Feature pillar 2: CONTENT

One brief → many native formats:

| Format | Agent | Length | Median time |
|---|---|---|---|
| Blog post | `blog-post` | 1500 words + 4 images | 45 s |
| LinkedIn post | `social-content` | 1300 chars + image | 6 s |
| X thread | `social-content` | 5–8 tweets | 8 s |
| Email | `email-sequence` | 250-word HTML | 5 s |
| Video ad (UGC presenter) | `video-script` + HeyGen | 30–60 s MP4 | 4–6 min |
| Landing page | `copywriting` | Full hero + CTAs | 12 s |
| Ad copy | `copywriting` | Google + Meta variants | 7 s |

**AI application:** structured generation. Each agent returns **strict JSON** with schema validation; renderers turn JSON into HTML/MP4/CSV. Drift between formats is impossible because the source-of-truth is structured data.

---

## Slide 9 — Feature pillar 3: VIDEO

This is the most technically dense agent in the system.

```
Brief
  │
  ▼
[video-script agent]  ──── Claude Sonnet generates a 90s shooting script
  │                        Strict JSON: { scenes[], voiceover, hook, cta }
  ▼
[HeyGen API]          ──── Picks brand-matched avatar (gender, ethnicity, vibe)
  │                        Renders avatar with lip-synced TTS
  ▼
[Supabase Storage]    ──── Re-uploads .mp4 + thumbnail for CDN delivery
  │
  ▼
Final 30-60 sec video, ready to post.
```

**Inngest** orchestrates the long-running job (4–6 min) as a **durable function** — survives serverless time limits, retries failed steps idempotently, refunds credit on failure.

**AI application:** multi-modal pipeline (text generation → speech synthesis → avatar rendering → video assembly). End user never sees the seams.

---

## Slide 10 — Feature pillar 4: DISTRIBUTION

Generated content goes nowhere without distribution. Conduikt publishes to:

- **LinkedIn** — Posts + organisation pages via LinkedIn API v2
- **X (Twitter)** — Single posts and threads via API v2
- **Email** — Broadcasts to opted-in audiences via Resend
- **Blog** — One-click publish to the user's own conduikt-hosted blog
- **(In progress)** Facebook, Instagram, TikTok, YouTube

**Scheduler:**
- `pg_cron` runs every 5 minutes inside Supabase Postgres
- Looks for `scheduled_posts WHERE scheduled_for <= now() AND status = 'pending'`
- Calls a Next.js route that resolves the user's OAuth token and posts
- Idempotent — won't double-publish if the cron fires twice

**AI application:** the AI doesn't "use" the social APIs directly — it produces **structured payloads** that a deterministic publisher executes. This separation is critical for safety (no rogue LLM tweets) and for compliance.

---

## Slide 11 — Feature pillar 5: MEASUREMENT

What separates a marketing tool from a marketing **system** is the feedback loop.

Conduikt connects to:

- **Google Analytics 4** — Traffic, conversions, attribution
- **Google Search Console** — Impressions, clicks, position by query
- **YouTube Data API** — View velocity, watch time
- **LinkedIn + X APIs** — Per-post impressions, reactions, comments

Every 12 hours, a sync job pulls the latest numbers into Postgres. Agents read this on the next generation — so over time, the system **knows what's working** and biases toward formats/topics/timings that perform.

**AI application:** the closed loop. This is what turns a content generator into an *optimiser*.

---

## Slide 12 — Feature pillar 6: OPERATIONS

The boring-but-essential layer:

- **Audiences** — Contacts, segments, lead capture forms
- **Email sequences** — Drip campaigns with trigger + delay + branching
- **Webhooks** — Outbound events to Zapier/Make/n8n
- **Automation queue** — Background jobs (Inngest), retry policy, error log
- **Client reports** — White-label PDFs for agencies
- **Team & roles** — Multi-seat workspaces with RBAC
- **Billing** — Flutterwave for cards + bank transfers across Africa & globally

This layer is what makes Conduikt usable by an **agency managing 30 client accounts**, not just a solo founder.

---

## Slide 13 — AI applications matrix

> The academic angle: **which AI capability is doing the work in each feature?**

| Feature | AI capability applied |
|---|---|
| Onboarding interview | **Multi-turn dialogue + structured extraction** |
| Competitor analysis | **Tool use** (web fetch) + **summarisation** |
| Keyword research | **Ideation + clustering** (semantic similarity) |
| SEO audit | **Multi-modal reasoning** (Lighthouse JSON → ranked recommendations) |
| Blog generation | **Long-form structured generation** with schema |
| Image selection | **Cross-modal retrieval** (text → Unsplash via embeddings) |
| Video script | **Constrained generation** (scene-by-scene shooting script) |
| Avatar video | **Multi-modal pipeline** (text → speech → lip-sync) |
| Content scoring | **LLM-as-judge** (rubric-based grading) |
| A/B variant generation | **Controlled variation** (one hypothesis, N versions) |
| Posting schedule | **Combinatorial optimisation** (channels × times × content) |
| Performance feedback | **Retrieval-augmented re-generation** |
| Copy localisation | **Cross-lingual generation** with brand voice preservation |

**Takeaway:** Conduikt is a textbook example of **agentic AI in production** — not one big chatbot, but a *system of specialised agents* with deterministic glue.

---

## Slide 14 — Why specialised agents > one big chatbot

| Approach | Issue |
|---|---|
| Single GPT chat | Loses context. Can't enforce schema. No retry. No tools. |
| RAG over docs | Knows past — can't act, can't measure, can't iterate. |
| **Specialised agents** | Each agent has tight scope, strict output schema, isolated tool budget, independent eval set. |

Specialisation also means:
- **Smaller prompts** → cheaper inference (~70% cost reduction vs. monolithic)
- **Independent improvement** → upgrade one agent without breaking the rest
- **Auditable** → every output traces back to one agent's prompt + inputs
- **Composable** → agents call each other through structured data, not strings

---

## Slide 15 — Engineering principles

What makes Conduikt's AI usage **production-grade** (not a demo):

1. **Strict JSON output** — every agent uses tool-use mode for schema enforcement
2. **Idempotent side effects** — every publishing action is keyed and de-duplicated
3. **Refund on failure** — if an AI job fails, the user's credit is automatically restored
4. **Friendly errors** — internal errors are mapped to user-readable strings before display
5. **Durable workflows** — Inngest re-runs failed steps without re-charging upstream work
6. **Row-Level Security** — Postgres RLS guarantees one user can never see another's data, even if the app layer has a bug
7. **Rate limiting** — token bucket per user, per action
8. **Telemetry** — every agent invocation logged with input/output/latency/cost

These are the patterns we teach **every industry team adopting agentic AI**.

---

## Slide 16 — Tech stack (the receipts)

| Layer | Technology | Why |
|---|---|---|
| Web framework | Next.js 15 (App Router, RSC) | Streaming UI, edge caching |
| UI | React + Tailwind v4 (custom design tokens) | "Mineral" dark theme, copper + teal |
| Database | Supabase Postgres + RLS | Strong consistency + row security |
| AI | Anthropic Claude (Sonnet 4.6, Opus 4.7) | Best-in-class for structured + long-context |
| Workflows | Inngest | Durable functions, step memoisation |
| Cron | Postgres `pg_cron` | In-DB scheduler, no extra infra |
| Email | Resend | Audiences, broadcasts, webhooks |
| Video | HeyGen + ElevenLabs | Avatar + voice |
| Search/Images | Unsplash | Licensed editorial photography |
| Auth | Supabase Auth | Email + Google OAuth |
| Billing | Flutterwave | Africa + global cards |
| Hosting | Vercel | Edge runtime + serverless |
| Observability | Vercel Analytics + Inngest dashboard | Latency + retry tracking |

---

## Slide 17 — Numbers that matter (real ops)

- **20** specialised AI agents in production
- **10** Postgres tables under RLS
- **~85** API routes
- **4** social/email distribution channels live (LI, X, Resend, blog)
- **3** measurement integrations (GA4, GSC, YouTube)
- **5 min** — `pg_cron` cadence for scheduled publishing
- **30–60 sec** — typical video output length
- **4–6 min** — median video render time (HeyGen)
- **<1 min** — typical blog generation time
- **<10 sec** — typical social post generation time

---

## Slide 18 — Where AI **doesn't** decide

Equally important: where Conduikt **does not** let the AI act autonomously.

| Action | Decided by |
|---|---|
| Posting to a social account | User confirms each post OR pre-approves a calendar |
| Sending email to a list | User clicks "Send broadcast" |
| Charging the user's card | Stripe-compatible billing flow, never agent |
| Deleting data | RLS-enforced, user-initiated only |
| Connecting an integration | OAuth, with explicit scopes shown |

**AI generates. The user (or deterministic code) acts.** This is the safety boundary every production agentic system needs.

---

## Slide 19 — Lessons learned (for the classroom)

What we learned shipping a multi-agent SaaS:

1. **JSON mode is the unsung hero.** Strict schemas eliminate 90% of "the AI did something weird" bugs.
2. **Token budgets are budgets.** Track them per agent per user. Cap them. Refund on failure.
3. **Long jobs need durable execution.** Plain serverless will time out on video, deep crawls, or large generations.
4. **Closed loops > one-shot generation.** The moment the AI sees its own past performance, output quality jumps.
5. **The DB schema is the architecture.** Get the data model right and the AI agents become thin wrappers.
6. **Most users don't want a chatbot.** They want a *button*. Hide the AI behind familiar UI.
7. **Errors must be friendly.** Map provider errors (HeyGen "MOVIO_PAYMENT_INSUFFICIENT_CREDIT") to plain English before showing them.

---

## Slide 20 — Who is it for?

| Segment | Use case |
|---|---|
| **Solo founders / indie hackers** | Run all of marketing without hiring |
| **SMB owners** | Replace a $5k/month agency retainer |
| **Marketing agencies** | Manage 10–50 client accounts with one operator |
| **Course creators & coaches** | Daily content output across 4 channels |
| **B2B startups** | LinkedIn-led growth on autopilot |
| **Local businesses** | SEO + Google reviews + email |

Pricing tiers:
- **Free** — Try one project
- **Growth** — Solo / SMB
- **Agency** — Multi-client, white-label, team

---

## Slide 21 — Demo flow (60 seconds, live)

1. Paste a website URL.
2. Conduikt scrapes, analyses, and proposes a strategy. **(0:00–0:20)**
3. Click "Generate week's content." 5 social posts + 1 blog + 1 email queued. **(0:20–0:40)**
4. Click "Schedule." Posts go to LinkedIn + X over 7 days via `pg_cron`. **(0:40–0:50)**
5. Click "Make a video ad." Avatar reads a 60s script in under 6 minutes. **(0:50–6:00)**

End-to-end: **a week of marketing produced and scheduled in under 10 minutes**.

---

## Slide 22 — What's next on the roadmap

- **TikTok & Instagram Reels** publishing — the natural home for HeyGen-generated short video
- **Facebook + Instagram** (pending Meta business verification)
- **Voice cloning** — brand-specific voices via ElevenLabs Pro
- **Multi-language** generation with consistent brand voice
- **Slack bot** for in-team approvals
- **Marketplace** for community-shared playbooks

---

## Slide 23 — The thesis (one slide if I had only one)

> **The next decade of software is not "AI features inside SaaS." It is AI-native SaaS, where the agents *are* the product.**

> Conduikt is what marketing looks like when you give one operator a team of 20 specialised AI agents, a real database, a scheduler, and the publishing rails.

> The same pattern works for legal ops, recruiting, customer support, financial analysis, and engineering management.

> The students sitting in this lecture are the ones who will build it.

---

## Slide 24 — Links + contact

- **Live product:** https://conduikt.com
- **Founder:** Olayinka Fagbenro · Technicity Digital · Lagos, Nigeria
- **Email:** hello@conduikt.com
- **X / LinkedIn:** linked in JSON-LD on the site footer
- **Open positions:** check the site

> Slide deck prepared for educational use. Conduikt and "Mineral" design system © Technicity Digital 2026.

---

## Appendix A — One paragraph the professor can paste into a slide

> **Conduikt** is an AI-native marketing operating system built on Next.js, Supabase, and Anthropic's Claude. It coordinates **20 specialised AI agents** — for strategy, SEO, content, video, email, and analytics — into a single workflow that takes a business from "URL" to "scheduled multi-channel campaign" in under 10 minutes. Each agent has its own strict JSON output schema, tool budget, and evaluation harness; deterministic services handle the side effects (publishing, billing, scheduling). It is a practical example of **multi-agent AI in production**, demonstrating tool use, structured generation, multi-modal pipelines (text→speech→avatar video), durable workflows, and closed-loop performance feedback. Used by founders, SMBs, and marketing agencies in Africa and globally. **conduikt.com**.

---

## Appendix B — Suggested student exercises (for the professor)

1. Pick one Conduikt agent and design its system prompt + JSON schema.
2. Map the data flow from "user pastes URL" to "scheduled LinkedIn post" — list every system involved.
3. Design a new agent (e.g. "podcast script writer") and integrate it into the existing data model.
4. Identify three failure modes specific to multi-agent systems and propose mitigations.
5. Build a minimal version of the `pg_cron`-driven scheduler with idempotency guarantees.
