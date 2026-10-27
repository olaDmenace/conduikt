# YC Application Briefing — Conduikt

**Purpose:** Source of truth for anyone (AI or human) drafting Conduikt's Y Combinator application. Contains factual data, positioning language, rhetorical do's and don'ts, and draft answer material. The drafter's job is to synthesize this into YC's specific application questions.

**How to use this doc:**
- Read the whole thing first — the voice guidance and "what NOT to say" section is as important as the facts
- Cross-reference [POSITIONING.md](POSITIONING.md) for the positioning spine
- Use `pitch-deck/conduikt-pitch-deck.pdf` as the deck attachment
- Draft in YC's questionnaire format at [ycombinator.com/apply](https://www.ycombinator.com/apply) — don't guess the questions from memory, they change
- Olayinka reviews everything before submission

**Last updated:** 2026-07-08

---

## 1. Company facts

| Field | Value |
|---|---|
| Name | Conduikt |
| Website | https://conduikt.com |
| Code | https://github.com/olaDmenace/conduikt |
| Founded | 2026-02-15 |
| Public beta launched | April 2026 |
| Legal status | Pre-incorporation (Baltic Europe MB/OÜ planned post-visa arrival) |
| Team size | 2 (founder + co-founder) |
| Location (applying from) | Lagos, Nigeria (both founders) |
| Relocation intent | Baltic Europe via Startup Visa (Estonia + Lithuania applications in flight via Dealum) |
| Batch target | Whichever YC batch is accepting next when application is submitted |

**Two descriptions to have ready:**

- **50-char:** "Multi-agent AI marketing OS for solo SaaS founders"
- **280-char:** "18 AI agents for SaaS marketing — audit, content, publishing, analytics — with a closed-loop analytics layer that auto-informs next week's generation. Built for solo SaaS founders who are their own marketer, until they can hire one."

---

## 2. The one-line pitch

**The AI marketing team for solo SaaS founders who haven't hired a marketer yet.**

Alternative phrasings depending on the question:
- "Multi-agent AI marketing OS for SaaS founders — audit, generate, publish, analyze, improve"
- "Closed-loop AI marketing for solo SaaS founders — 18 agents that get better with your data"
- "For solo SaaS founders: 18 AI agents that run your marketing loop end-to-end"

---

## 3. Team

### Olayinka Fagbenro — Founder & CEO

- **Role at Conduikt:** Engineering, product, brand
- **Current employment:** Leading frontend at BamBam Automation (part-time, transitioning)
- **Background:** 8+ years as senior frontend engineer
- **Domain expertise:** Agentic AI workflows, MCP integration, marketing automation pipelines
- **Founder-relevant experience:** Has run marketing-as-the-founder in his own Lagos consultancy — built Conduikt as the tool he wished existed
- **Public track record:**
  - X: [@olaDmenace](https://x.com/olaDmenace)
  - GitHub: [@olaDmenace](https://github.com/olaDmenace)
  - conduikt.com is his production build
- **Location:** Lagos, Nigeria (relocating to Baltic Europe if Startup Visa lands)
- **Building Conduikt since:** February 15, 2026

### Segun Kadri — Co-founder

- **Role at Conduikt:** Customer Success + QA + Technical Operations
- **Current employment:** Mquid
- **Background:** 8-10 years technical support and customer operations
- **Prior founding experience:** Founded Computermindz Technologies
- **10-year working relationship with Olayinka** — first company built together (this preempts the "co-founder of convenience" read; document this on the founders/team question)
- **Location:** Lagos, Nigeria (remote co-founder)

### Cap table (matches Dealum submission)

- Olayinka: 85%
- Segun: 10%
- Early-hire employee pool: 5%

---

## 4. The product

### What it does today (as of 2026-07-08)

User pastes a URL. Conduikt:

1. **Audits** the site (SEO, CRO, technical, structured data)
2. **Understands** the business (competitors, target audience, brand voice)
3. **Generates** content across channels (blog posts, X/LinkedIn posts, email sequences)
4. **Publishes** to X and LinkedIn on schedule (Facebook + TikTok wired but limited on public tier)
5. **Ingests** engagement data via 6-hourly cron (X likes/retweets/comments; LinkedIn engagement is API-gated pending LinkedIn Community Management approval)
6. **Extracts patterns** via a Claude-driven analyzer, running daily at 03:00 UTC
7. **Feeds patterns back** into every future generation via performance-context injection

**18 agents in the production registry** (confirmed count as of this doc):
SEO Audit, CRO, Copywriting, Social Content, Email Sequences, Content Strategy, Posting Plan, Competitor Intel, Blog Post, Keyword Research, Growth Playbook, Campaigns, Calendar, Video Ad, A/B Test, Programmatic SEO, Launch Strategy, Client Reports.

### The genuinely novel capability — the closed loop

No other SMB-focused AI marketing tool automatically feeds performance data back into generation:

- **Jasper / Copy.ai / Writesonic:** stop at generate; users manually adjust prompts
- **HubSpot / Marketo:** enterprise-shaped price + complexity; solo founders can't use them
- **Surfer / SEMrush:** SEO-only; no generation, no publishing
- **n8n + Claude (DIY):** requires the founder to build every workflow
- **Conduikt:** has all three — multi-agent orchestration + SMB-first pricing + closed loop

The loop is technically live in production but currently produces no active learnings — the engagement signal from the 14-day playbook was thin (mostly 0-2 likes per post). The analyzer correctly refuses to synthesize learnings from noise. **Be honest about this in the application** — YC values honest founders more than magical thinking.

### Recent shipped work (Weeks 12-15 of build)

- Closed-loop analytics system (post_metrics ingestion + Claude analyzer + learnings table + generator injection)
- 14-day X launch playbook running publicly on @olaDmenace with Conduikt agents writing and scheduling every post
- Customer-critical bug fix: OAuth refresh silently deleting connections (fixed with row-preservation + admin alerts + auto-retry of queued posts)
- TikTok proactive-refresh cron for parity with X and LinkedIn
- Pitch deck for parallel Startup Visa applications (Estonia + Lithuania via Dealum)

### Dogfood angle (strong for YC)

Conduikt runs Conduikt's own marketing. The 14-day launch playbook — every X and LinkedIn post — was generated and scheduled through Conduikt itself. That's the strongest possible signal: the founder ships his own product's output publicly.

---

## 5. Traction

- **Public beta launched:** April 2026
- **Signups:** ~30 as of June 2026 (all SMB founders, mostly free tier)
- **Named customer testimonials on homepage:** Dara Sobayo, Adeola Owoade, Olatunbosun Olalekan, Oluwatobiloba Olajide
- **Paying customers:** Zero as of end of playbook (2026-07-08). Say this honestly.
- **X audience:** ~132 followers on @olaDmenace (small; treat this as an "in-progress" number)
- **Public build cadence:** Daily commits to `olaDmenace/conduikt`; every ship visible on GitHub
- **Free-access agency pilots:** Being offered (30-day white-label pilots) as post-playbook GTM
- **Real proof:** the 14-day playbook itself — every post publicly scheduled through Conduikt

**When YC asks "how many users?":** ~30. Yes, small. Don't inflate.
**When YC asks "revenue?":** Zero currently. Don't invent.
**When YC asks "growth rate?":** Pre-revenue. The growth story is engagement + upcoming pilots + agency conversations.

Committees respect honesty over inflation. YC has seen every kind of fake number.

---

## 6. Market

- **Marketing automation TAM:** $15B+
- **AI marketing subset:** ~38% CAGR
- **Target segment:** 32M+ SMBs in EU + US underserved by enterprise platforms
- **Primary ICP (from POSITIONING.md):** solo SaaS founders running their own marketing, 0-10 paying customers, no marketer on the team
- **Secondary ICP:** small agencies (2-5 people) needing multi-client leverage — the white-label reports angle

---

## 7. Business model

| Tier | Price | Users |
|---|---|---|
| Free | $0 | 3 free agents, 1 project |
| Pro | $49/mo | 10 agents, 3 projects, social publishing |
| Growth | $99/mo | All agents, 5 projects, campaigns, email |
| Agency | $249/mo | Unlimited projects, white-label reports, multi-client |

**Founding member special:** first 50 Pro users at $39/mo forever.

**Unit economics targets:**
- CAC < $200
- LTV: >$800 Pro, >$1,800 Agency (segmented — don't state as blended)
- Gross margin ~75% at scale

---

## 8. Financial projections

- **12 months:** $0 → $200k ARR, 200 customers, ~$83 blended ARPU, 75% gross margin
- **36 months:** Path to $1.5-2M ARR — **contingent on hitting agency acquisition targets** (this softening is deliberate; don't overclaim)
- **Cash-flow positive:** month 28 in base case
- **Base assumes:** organic content marketing only, no paid ads, no significant hires before month 10

---

## 9. Competition

Format the answer as a table (YC-friendly) or a wedge argument:

| Competitor | What they do | Where they stop |
|---|---|---|
| Jasper / Copy.ai / Writesonic | AI writing | Generate only — no audit, publish, or analytics loop |
| HubSpot / Marketo / Adobe | Enterprise marketing platforms | Heavy, expensive, slow — wrong shape for SMB / agency |
| Surfer / SEMrush / Ahrefs | SEO tooling | SEO-only — no content generation, no publishing |
| n8n + Claude (DIY) | Generic automation | Requires building every workflow from scratch |

**Conduikt's wedge:** Multi-agent + SMB-first + Closed loop. Nobody else has all three.

---

## 10. Why now?

Two forces converged in 2026:

1. **AI quality crossed the threshold.** Claude 4 / GPT-4-class models produce marketing output usable without heavy editing — first time true at SMB price points.
2. **MCP standard is emerging.** Agents can finally cross product boundaries cleanly — the missing piece for multi-agent platforms.

Plus two persistent structural forces:

3. **SMB margin pressure is permanent** ("do more with less" as the new operating reality).
4. **Agency margins are compressing** — agencies need output multipliers.

The window before enterprise vendors react: 18-24 months.

---

## 11. Why us?

- **Olayinka has run the pain firsthand.** He was a founder-marketer at his Lagos consultancy — spent hours writing blog posts nobody read. Built Conduikt as the tool he wished existed.
- **8+ years of production frontend + agentic AI workflows** = someone who can actually ship a multi-agent platform, not just prototype one.
- **Segun brings 8-10 years of customer operations** — the leverage most solo founders lack when going from beta to first 20 customers.
- **10-year working relationship** — not a marriage of convenience.
- **Dogfood credibility:** the 14-day launch playbook running on @olaDmenace is Conduikt building Conduikt's marketing with Conduikt.

---

## 12. What would you do with YC funding?

Concrete list, no filler:

1. **Move Olayinka to full-time** — currently part-time from BamBam Automation. Full-time focus = fastest single accelerant.
2. **First technical hire — month 6** — agent infrastructure and product engineering. EU-based candidate to match visa relocation.
3. **6-9 months of runway** — enough to prove product-market-fit at agency segment.
4. **LinkedIn Community Management API** — currently applied and awaiting approval. When it lands, extends the closed loop to LinkedIn engagement data.
5. **Programmatic SEO publishing loop** — content generation exists; publishing layer would ship if runway allows.

Total ask: standard YC investment ($500k SAFE).

---

## 13. The story to tell

Conduikt is what solo SaaS founders build for themselves when they realize:

1. They're not marketers, and Jasper doesn't help — it just writes copy
2. HubSpot's price + complexity is enterprise-shaped and wrong for them
3. What they need is opinionated defaults + a system that improves over time
4. Nobody's built this for them because it's not the fastest path to VC-scale

Conduikt is built by two people who have already lived every part of the pain: engineering (Olayinka), customer ops (Segun), and marketing-as-the-founder (Olayinka, before Conduikt). The wedge is multi-agent + SMB-first + closed-loop — nobody has all three today.

---

## 14. Voice guidance

**Match:** honest, specific, first-person plural (`we`), concrete numbers over adjectives.

**Avoid:** hype, superlatives, magical thinking, unqualified claims.

Positioning voice is documented in [POSITIONING.md](POSITIONING.md#5-voice--say--dont-say). Key patterns:

| We say | We don't say |
|---|---|
| "The AI marketing team for solo SaaS founders" | "All-in-one marketing platform" |
| "Ships measurable content" | "AI-powered marketing" |
| "Opinionated workflows" | "Customizable to your needs" |
| "Closes the loop" | "End-to-end automation" |
| Concrete numbers (open rates, signups, deltas) | "10x your marketing" |
| Honest about what doesn't work yet | "Revolutionize", "transform" |

---

## 15. Things to explicitly NOT say

- ❌ "AI-powered marketing platform" — too generic
- ❌ "10x your marketing" — buzz-word bingo
- ❌ "All-in-one marketing OS" — competitors say this
- ❌ "Revolutionize" / "transform" — never
- ❌ "Every generation is better than the last" — overpromise (loop is live but young)
- ❌ "Marketing team you'll never need" — attacks buyer's competence
- ❌ Made-up traction numbers — YC has seen every kind of inflation

---

## 16. Sample draft answers (for Cowork to refine)

### YC prompt: "What is your company going to make? Describe your product and what it does or will do."

Conduikt is the AI marketing team a solo SaaS founder hires before they can afford a real one. 18 specialized AI agents cover the full marketing loop: audit the site, understand the business, generate blog posts + social + email sequences, publish across channels, ingest engagement data, and — crucially — automatically extract what worked and feed it back into the next generation.

Nobody else in the SMB AI marketing category has that closed loop. Jasper writes copy but doesn't audit your site or measure your engagement. HubSpot is enterprise-shaped and priced. Surfer only does SEO. We built the opinionated, end-to-end system solo founders need to run their own marketing without becoming full-time marketers.

Currently 18 agents in production, running publicly on @olaDmenace (Twitter/X) — every post in our 14-day launch playbook was written and scheduled through Conduikt itself.

### YC prompt: "Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?"

Olayinka ran marketing-as-the-founder at his Lagos consultancy for years — writing blog posts nobody read, scheduling three LinkedIn posts a week that performed identically to silence, and pretending he had "a content strategy" because he had a calendar. The output was theater. The work was real.

We picked this because we lived it: shipping product and running marketing in your spare hours, stitching together five tools that don't talk to each other. That's the pain 32M+ SMBs share, and nobody's building for them specifically. Enterprise vendors chase Fortune 500. AI-writer startups chase content volume. The founder-marketer is the underserved audience.

Domain expertise: Olayinka has 8+ years of frontend engineering, deep work in agentic AI workflows and MCP integration. Segun has 8-10 years of technical support and customer operations from Computermindz Technologies and now Mquid. We're building Conduikt because we know both the engineering shape and the customer support shape it needs.

### YC prompt: "How will you make money?"

Free tier for trial. Pro at $49/mo (10 agents, 3 projects), Growth at $99/mo (all agents, campaigns), Agency at $249/mo (unlimited projects, white-label reports). Founding members: first 50 Pro at $39/mo forever.

CAC target < $200 via founder-led sales + content marketing. LTV segmented: >$800 Pro, >$1,800 Agency. Gross margin target ~75% at scale (LLM cost is variable but caching and prompt optimization bring us there).

12-month target: $200k ARR at 200 customers. 36-month path to $1.5-2M ARR, contingent on hitting agency acquisition targets.

### YC prompt: "How did you meet your co-founder?"

Ten years ago in Lagos. Segun and Olayinka worked together on early technical projects — this is the first company we've built together, but not the first time we've shipped anything together. We've watched each other's careers grow: Olayinka into senior engineering + agentic AI, Segun into customer operations. Conduikt is the intersection of those two skill sets.

Cap table reflects the reality of who's built what and who joined when: Olayinka 85% (founder, primary builder), Segun 10% (co-founder, customer + ops), 5% employee pool for the first hire.

### YC prompt: "What's your unfair advantage?"

The dogfood is public. Every X post you'll see from @olaDmenace was generated and scheduled by Conduikt. When we say "closed loop," you can watch it happening — every commit, every playbook post, every honest "this didn't work yet" is public on GitHub and X.

That means: (1) our system either works or it doesn't, in public, no theater; and (2) we can't fake the story we're telling investors — you can verify every claim.

---

## 17. Related documents & links

- **Positioning spine:** [POSITIONING.md](POSITIONING.md)
- **Pitch deck source:** `pitch-deck/slides.md`
- **Pitch deck PDF:** `pitch-deck/conduikt-pitch-deck.pdf` (attach to YC application)
- **Repo memory index:** `MEMORY.md` (in project's Claude memory folder)
- **Public code:** https://github.com/olaDmenace/conduikt
- **Public product:** https://conduikt.com
- **Founder X:** https://x.com/olaDmenace
- **Support email:** hello@conduikt.com
- **Startup Visa deck:** `pitch-deck/conduikt-pitch-deck.pdf` (same deck used for Dealum)

---

## 18. Submission workflow

1. Claude Cowork drafts each answer using this doc as source, cross-referencing POSITIONING.md and the pitch deck
2. Draft goes into a shared doc for Olayinka's review — every claim traceable to a source in this briefing
3. Olayinka corrects, tightens, and personalizes voice (some sections should be first-person from him specifically)
4. Segun reviews the co-founder / team sections
5. Record the 1-minute founder video separately (no AI here — has to be Olayinka's face and voice)
6. Submit at [ycombinator.com/apply](https://www.ycombinator.com/apply)
7. Save application PDF for later reference

---

**End of briefing.** If Cowork produces something that contradicts this doc or POSITIONING.md, flag it — likely wrong.
