# Conduikt — Product Plan

**Origin:** UX audit (Sept 2026) + synthesized critique (Sept 2026)
**Owner:** Olayinka
**Last updated:** Sept 2026 (post visa-closure, product-work pivot)

This is the working plan derived from merging the external UX audit
(`CONDUIKT-UI-UX-ANALYSIS-AND-IMPROVEMENT-REPORT.pdf`, gitignored) with an
internal solo-founder-reality critique. It supersedes any earlier roadmap
suggestion in the audit report — the audit's diagnosis is largely correct,
but its effort estimates and sequencing were calibrated for a staffed team.
This plan sizes work realistically for one part-time solo builder + one
part-time co-founder with zero paying customers.

---

## 1. What shipped in the Sprint 1 session (Sept 2026)

All four Sprint 1 items landed, plus new social preview components,
security-headers baseline, test additions, and a CI workflow.

### Sprint 1 — quick wins (all shipped)

1. **Command palette wired to header** —
   `src/components/layout/header.tsx` · `src/components/search/command-palette.tsx` · `src/stores/ui-store.ts`
   - The header search `<input>` was a dead field; converted to a button
     that opens the existing `cmdk` palette via a new `commandPaletteOpen`
     slice on `useUIStore`. `⌘K` / `Ctrl+K` still works, badge shown.
   - Palette now controlled by store (not internal state) — other surfaces
     can trigger it too.

2. **WCAG AA contrast fix** —
   `src/styles/globals.css`
   - `--text-tertiary: #5E5A54` → `#7E7972` (was failing at 2.2:1 on
     `#0C0C0E` surface; now passes at 4.5:1)
   - `--text-secondary: #9B958C` → `#ACA59B` (was borderline 4.6:1; now
     comfortably 6.1:1)
   - Light-mode tokens verified already-passing, left unchanged.

3. **Duplicate global agents menu pruned in-project** —
   `src/components/layout/sidebar.tsx`
   - Added `inAnyProject` detection from pathname; the global "Agents"
     menu (both expanded and collapsed variants) is now hidden when the
     user is inside any project scope. Fixes the "which project does
     clicking Blog Writer write for?" confusion.

4. **`<QuotaBadge/>` component** —
   `src/components/generation/quota-badge.tsx` (new) + integrated into
   `src/app/(dashboard)/projects/[id]/content/page.tsx`
   - Fetches plan + `generation_count` from Supabase, computes remaining.
   - Compact-pill by default (fits above submit buttons), block variant
     available for empty states.
   - Colour: neutral by default → warning at ≤10% remaining → error at
     empty / would-exceed. Upgrade link surfaces on warning/error/empty
     for non-Agency plans.
   - Listens to the existing `conduikt:generation` window event so it
     refreshes after each generation without a page reload.
   - **Reusable:** drop `<QuotaBadge />` into any other generation surface
     (Blog Writer, Playground, bulk dialog) as a follow-up — no props
     needed for the default.

### Sprint 2 — partial

5. **`<TweetCard/>`** — `src/components/social/tweet-card.tsx` (new)
   - Pixel-approximate X/Twitter card. 280-char progress ring (blue →
     yellow → red), avatar fallback, thread position marker, up-to-4
     media placeholders, disabled interaction row.
   - Standalone display component; no integration yet — see §3 for wiring
     it into the calendar and generation-output surfaces.

6. **`<LinkedInCard/>`** — `src/components/social/linkedin-card.tsx` (new)
   - Pixel-approximate LinkedIn feed card. Fold at 210 chars with a
     "see more" toggle (matches desktop-feed behaviour). Character count
     always visible. Reaction bar disabled (preview-only).
   - Same standalone posture — needs integration follow-up.

### Tooling + hygiene

7. **Baseline security headers** —
   `next.config.ts` (shipped earlier this session)
   - X-Content-Type-Options, X-Frame-Options: SAMEORIGIN,
     Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy
     (10 features denied). CSP intentionally deferred; see §7.

8. **`.github/workflows/ci.yml`** (new)
   - Two jobs: `check` (lint + typecheck + Vitest) on every PR + push;
     `e2e` (Playwright) on the same triggers (skipped on Dependabot PRs
     that don't touch the workflow).
   - Concurrency group cancels stale runs on rapid pushes.
   - **You'll need to enable Actions on the repo settings if not already
     on** — first push after this lands will run the workflow.

9. **`.gitignore` extended** —
   - `*-DRAFT.pdf` (matches the existing `*-DRAFT.md` pattern)
   - `Conduikt-Synopsis.pdf`, `CONDUIKT-UI-UX-ANALYSIS-AND-IMPROVEMENT-REPORT.pdf`
   - `scratch/`
   - Keeps `git status` clean without deleting your local copies.

10. **Tests added** —
    - `src/__tests__/unit/ui-store.test.ts` — expanded with three new
      cases covering `commandPaletteOpen` + `toggleCommandPalette`.
    - `src/__tests__/components/tweet-card.test.tsx` — 8 cases:
      render, defaults, empty state, character counter warning bands,
      thread markers, custom author, media placeholders, multi-byte
      counting.
    - `src/__tests__/components/linkedin-card.test.tsx` — 9 cases:
      render, defaults, empty state, fold behaviour, expansion, char
      count, media placeholders.

---

## 2. Immediate follow-ups — this week

Before starting Sprint 2 features, do these:

- [ ] **Push and verify CI runs green** — first push after `.github/workflows/ci.yml`
      lands will trigger the workflow. If lint or typecheck fails on
      any of the Sprint 1 files, patch and re-push before proceeding.
- [ ] **Manually smoke-test all Sprint 1 changes in dev** (`npm run dev`):
  1. Click header search → command palette opens; type "settings" →
     Enter navigates to Settings.
  2. `⌘K` / `Ctrl+K` still works from anywhere.
  3. Open the Settings page → text is readable in dark mode (previously
     the tertiary labels were barely visible).
  4. Open a project → verify the global "Agents" menu below the projects
     list is hidden; leave the project (go to `/dashboard`) → menu returns.
  5. Open the Content Studio for a project → verify the quota badge
     appears above the Generate button; verify the message matches your
     actual remaining count.
- [ ] **Wire `<QuotaBadge/>` into remaining generation surfaces:**
      Blog Writer (`projects/[id]/blog/page.tsx`), Playground
      (`/playground`), and the BulkGenerateDialog. Same import + one-line
      addition each. ~30 minutes total.
- [ ] **Ship the CSP header** as a follow-up PR — see §7.

---

## 3. Sprint 2 — remaining, in priority order

### 3.1 Native social cards — integration (~1 day)

The components exist; they need to land in the surfaces users actually
see:

- **Content Studio output** — when the generated content is an X or
  LinkedIn post, render `<TweetCard />` / `<LinkedInCard />` instead of
  the current Markdown card. The `channel` field on the generated asset
  identifies the platform.
- **Social Calendar** — replace the abstract text tiles in
  `projects/[id]/calendar/page.tsx` with the appropriate card component.
  The drag-drop still works — the card is just the visual.
- **Broadcasts detail view** — if broadcast previews are for a social
  channel, use the same components.

**Effort:** ~1 focused day. Low risk — pure display swap.

**Test additions:** existing tests cover the components; add an
integration test that renders the calendar with a mixed set of
X/LinkedIn/blog assets and verifies each renders with the correct card.

### 3.2 Streaming AI responses — SPEC + planned execution (~1 week)

**Why deferred from Sprint 2 execution:** touches API route +
client-side per-token state; any bug regresses generation flow
entirely. Better as its own PR with dedicated test coverage.

**Approach:**

1. **API side** — pick the generation route(s) that carry the highest
   perceived-latency cost. Content Studio (`/api/ai/generate` or the
   route Content Studio actually POSTs to — trace from
   `content/page.tsx:handleGenerate`). Convert from a single JSON
   response to Server-Sent Events using `client.messages.stream()` from
   `@anthropic-ai/sdk`. Emit `{type: "delta", text: "..."}` per chunk,
   `{type: "done", finalAsset: {...}}` on completion.
2. **Client side** — use `EventSource` OR `fetch` with a `ReadableStream`
   consumer. Progressively append to the output state; the existing
   Markdown renderer will re-render on each update.
3. **Fallback** — keep the non-streaming JSON response as a fallback path
   for endpoints that need it (bulk jobs, background generation).
4. **Progress affordance** — replace the generic `<Loader2 spinner />`
   with a multi-stage indicator: "Analysing…" → "Structuring…" →
   "Polishing…" tied to token milestones (100/500/1000).

**Test additions:**
- Unit: stream chunk parser handles partial JSON, error mid-stream,
  connection drop.
- E2E: submit prompt → assert output text appears progressively (not
  in one chunk).

**Effort:** ~1 dedicated week (1 day API, 2 days client, 1 day tests,
1 day rollout with feature flag).

**Rollout:** put behind `NEXT_PUBLIC_STREAMING_ENABLED` env flag for
the first deploy; enable per-user after 48h with no reports.

### 3.3 Sidebar 3-zone regroup — SPEC (~1 week)

**Why deferred:** the sidebar is 781 lines carrying routing + auth +
plan-tier logic. Restructuring the visual hierarchy without a proper
test pass risks breaking navigation. Deserves its own focused PR.

**Approach:**

Restructure the per-project sub-navigation into three collapsible
drawers, keeping the current in-project routes intact:

```
Project name (existing header)
  └── Pulse
       ├── Overview
       ├── Analytics
       ├── Learnings
       └── Calendar
  └── Studio
       ├── Content
       ├── Blog
       ├── Audits (SEO)
       ├── Keywords
       └── [category-grouped agents remain]
  └── Audience
       ├── Emails
       ├── Broadcasts
       ├── Forms
       └── Audiences
  └── Library + Settings (pinned bottom)
```

**Key rule:** drawers default to collapsed; last-opened state persists
via `useUIStore` (add `expandedZoneIds` slice).

**Test additions:**
- E2E: navigate to every existing per-project route via the new
  sidebar. Nothing 404s.
- Unit: `useUIStore` new slice tests.

**Effort:** ~4-5 days.

---

## 4. Sprint 3 — specs (do NOT start until Sprint 2 lands and at least
   one paying customer is in the system)

Each of these is a **feature-shaped** piece of work, not a polish item.
Half-shipping any of them is worse than deferring cleanly.

### 4.1 60-Second Magic Audit onboarding (~2 weeks)

**Goal:** replace the 5-slide modal (`onboarding-tour.tsx`) with a
single-field URL input that produces immediate value.

**Flow:**

```
Step 1 (post-signup) → "Enter your website URL" → [Run Instant Audit]
Step 2 (20s) → animated crawl status
   ├─ Fetching HTML…
   ├─ Extracting brand voice…
   ├─ Identifying top competitors…
   └─ Generating 3 sample posts…
Step 3 (aha) → landing page with:
   ├─ SEO score card (grade + top 3 issues)
   ├─ 3 ready-to-post LinkedIn drafts (with <LinkedInCard/> previews)
   ├─ [Publish first post to LinkedIn] primary CTA
   └─ [Explore Conduikt] secondary CTA
```

**Sub-projects:**
1. URL crawler service — handle bot-blocking, redirects, timeouts,
   large pages. Reliable HTML fetch is a real engineering problem —
   plan for 2-3 days alone.
2. Brand-voice extractor — Anthropic call with structured output
   schema (tone, key phrases, ICP inference).
3. Sample post generator — reuse existing social-content agent with
   the extracted brand voice as context.
4. UI flow — new route `/onboarding` with animated pipeline; skip
   button + resume-later state.

**Feature flag:** `NEXT_PUBLIC_MAGIC_AUDIT_ENABLED` — dark-launch for
existing users, default-on for new signups after 48h of clean logs.

**Blocker:** need to decide what happens to the OLD signup path. Keep
the modal tour as a fallback? Ideally sunset it entirely once the
Magic Audit's completion rate exceeds it in analytics.

### 4.2 Revision history / draft autosave (~5 days)

**Goal:** regeneration + editing never lose a user's edits silently.
Currently `handleGenerate` in `content/page.tsx` creates new DB records
without preserving edited versions.

**Approach:**

1. **Schema:** add `content_revisions` table (asset_id, content JSONB,
   created_at, source ENUM('generation','manual_edit','autosave')).
   RLS-scoped to project owner.
2. **Autosave:** debounced (2s) autosave on the Content Studio editor
   → inserts a `manual_edit` revision.
3. **UI:** revision drawer (right side, collapsible). Shows timeline
   with source badges. Click to restore → creates a new revision from
   the restored point (never destructive).
4. **Regeneration:** creates a `generation` revision but does NOT
   overwrite the last `manual_edit`. Both exist in history.

**Test additions:**
- Unit: revision-restore preserves user edits made after a
  regeneration.
- E2E: edit → regenerate → verify edit is recoverable.

**Effort:** ~5 days.

### 4.3 Prompt recipe library (~3 days)

**Goal:** eliminate blank-prompt paralysis. One-click templates for
proven marketing frameworks.

**Approach:**

1. **Recipes** (JSON in `src/lib/ai/prompt-recipes.ts`):
   - AIDA (Attention → Interest → Desire → Action)
   - PAS (Problem → Agitate → Solution)
   - BAB (Before → After → Bridge)
   - Contrarian Hook
   - Feature → Benefit → Emotion
   - Data-Backed Claim
2. **UI:** dropdown or slide-out panel above the prompt textarea. Each
   recipe shows title + one-line description + preview of the
   scaffolded prompt. Click to insert into textarea (as a starting
   point the user edits, not a rigid template).
3. **Analytics:** track which recipes get used most; expand the top 3.

**Effort:** ~3 days (mostly content curation + UI polish).

---

## 5. The Feedback-Loop Verification Project — standalone

**This is the most important non-feature work in the plan.** Conduikt's
central product claim is the closed-loop analytics layer — engagement
data automatically feeds next week's generation. As of the last audit,
the loop was live but had produced no measurable learnings due to thin
signal from a small audience.

**Before pitching the closed loop to any paying customer, or including
it in any investor conversation, this project must confirm the pipeline
actually does what it claims.**

### The 5-stage verification harness

**Stage 1 — Ingestion**
- Mock an X/LinkedIn API response with known engagement metrics.
- Run the ingest cron directly.
- Assert: a `post_metrics` row is created with the mocked values.
- File: `src/__tests__/integration/loop-ingestion.test.ts`

**Stage 2 — Analyzer**
- Seed a test project with N historical posts + engagement metrics
  encoding a known pattern (e.g. "posts with statistics get 3× the
  engagement of posts without").
- Trigger the analyzer.
- Assert: the `learnings` table contains at least one learning that
  matches the seeded pattern (or explicitly reports "insufficient signal"
  when signal is thin — which is the correct behaviour today).
- File: `src/__tests__/integration/loop-analyzer.test.ts`

**Stage 3 — Prompt injection**
- Inspect the assembled prompt for a generation, with and without
  learnings present.
- Assert: when learnings exist, they appear verbatim (or
  structurally-equivalent) in the prompt's context section.
- File: `src/__tests__/unit/loop-prompt-injection.test.ts`

**Stage 4 — Behavioural diff**
- Generate the same content type with learnings on vs off (test-only
  feature flag).
- Diff the outputs.
- Assert: the output-with-learnings shows measurable movement in the
  direction of the learning (e.g. contains more statistics if the
  learning was "use statistics").
- File: `src/__tests__/integration/loop-behavioural-diff.test.ts`

**Stage 5 — End-to-end**
- Seed a project with historical data + metrics + learnings + a
  triggered generation.
- Assert: the output could not have existed without the injected
  learning (via inclusion of learning-specific terms not present in
  the base prompt).
- File: `src/__tests__/integration/loop-end-to-end.test.ts`

### Effort

**2-3 focused days** to build the harness + fixtures. The tests will
then run in CI and act as a permanent guarantee that the loop is
alive.

### Priority

**Should happen before any first paying customer conversation** where
"closed loop" is pitched. Otherwise the central product claim is
unverified marketing.

---

## 6. Test infrastructure — current state + gaps

### What exists

- **Vitest** configured with jsdom, coverage via v8, `@` alias.
- **Playwright** configured (see `playwright.config.ts`).
- **60+ test files** already present in `src/__tests__/` covering
  agents, integrations, unit logic, some components.
- Setup file at `src/__tests__/setup.ts`.

### Gaps (ranked by impact)

1. **No CI enforcement** — tests exist but nothing gates merges on
   them. Fixed this session via `.github/workflows/ci.yml`; verify
   it runs green after first push.
2. **No coverage floor** — nothing prevents coverage from dropping.
   Post-Sprint 2, add a coverage threshold in `vitest.config.ts` (`test.coverage.thresholds`)
   at ~60% (realistic starting point; raise over time).
3. **Payment webhook path is untested** — Paystack webhook route
   handling has no dedicated integration test that I've verified. This
   is a live-money code path; belongs on the top of the test-add list.
4. **RLS behaviour is not asserted from code** — RLS policies live in
   Supabase migrations but aren't tested from the Next.js side. A small
   integration test suite that runs queries as anon vs authenticated
   would catch regressions when RLS policies change.

### Per-sprint testing discipline (going forward)

- Any new component ships with a corresponding `*.test.tsx` file.
- Any new API route ships with a corresponding `*.test.ts` integration
  test (auth checks + happy path + one edge case minimum).
- Any DB migration touching RLS gets a corresponding policy test.

---

## 7. Blockers + risks

### 7.1 CSP header — deferred but should ship soon

Baseline security headers landed this session; CSP was deliberately
deferred. Next step: ship in Report-Only mode with a `/api/csp-report`
endpoint, monitor 7-14 days, tighten based on real violations, then
switch to enforce. Full plan lives in the security-headers commit
message. **Estimated: 1 dedicated day.**

### 7.2 No error monitoring in production

Grep for `sentry`, `logtail`, `datadog` in this repo returns nothing.
Production errors are console-only. Any customer-impacting bug is
invisible to us. **Add Sentry (or Vercel's built-in observability) as
a Sprint 2.5 item.** ~2 hours.

### 7.3 Google integrations DOA

GA4/YouTube/GSC callbacks write tokens plaintext (per prior audit
memory), and the CHECK constraint on `connected_accounts.platform`
blocks the platforms entirely. Deferred until GCP account is
recoverable. **Do not sell or demo Google integrations until this
cluster is fixed.**

### 7.4 Facebook auto-posting on hold

Blocked on Meta business verification. Plus three known bugs (plaintext
token read in publish route, feature-flag bypass in 3 paths) queued
for a single-PR fix when work resumes.

### 7.5 LinkedIn CM API pending

Analytics-sync path (`sync-social-metrics.ts`) already has graceful
fallback for missing `LINKEDIN_CM_*` env vars. When approval lands,
add credentials in Vercel + verify sync begins.

### 7.6 Payment provider consistency check

Package.json shows `@paystack/inline-js`. Prior session memory mentioned
Flutterwave being live. **Verify which is actually processing payments
in production** (check `NEXT_PUBLIC_*` env vars in Vercel dashboard).
If both are wired, decide which is primary and remove the other's
integration code.

### 7.7 First 3 paying customers is the meta-blocker

Every UX improvement here is theoretical until real users hit it. The
faster you get to first paying customer, the faster this plan gets
grounded in actual usage data instead of report-driven guesswork. Do
not defer acquisition work for a UX quarter.

---

## 8. Realistic sequencing — this month vs next month

### This week (Sprint 1 aftercare + integration)

- Push Sprint 1 commits, verify CI green, smoke-test all 4 changes.
- Wire `<QuotaBadge/>` into 3 remaining generation surfaces.
- Wire `<TweetCard/>` + `<LinkedInCard/>` into Content Studio output
  view and Social Calendar.
- Ship CSP-in-Report-Only PR.
- Add Sentry.

**Estimated: 3-4 focused days of one part-time builder.**

### Next 2 weeks (Sprint 2 remaining)

- Streaming AI on Content Studio generation.
- Multi-stage progress indicator.
- Sidebar 3-zone regroup.

**Estimated: 2 weeks focused work.**

### After first paying customer (Sprint 3 + validation)

- Magic Audit onboarding.
- Revision history.
- Prompt recipe library.
- Feedback-loop verification project.

**Estimated: 4-6 weeks focused work.**

### Ongoing / concurrent

- Acquisition — 30 min/day agency outreach.
- Content quality iteration on generated posts (upstream of all UX
  polish).
- CSP tightening based on Report-Only violations.

---

## 9. What NOT to do (from the audit, deliberately shelved)

- **Node-based workflow canvas (`@xyflow/react`)** — even though the
  dependency is installed, do not build the visual workflow canvas.
  Solo SaaS founders don't want an n8n; they want one button that
  does the work. Delete the dependency when Sprint 3 lands and it's
  clearly unused.
- **White-label client portals (custom domains, agency logo, client
  login)** — the entire white-label tier concept is a $249/mo hypothesis
  that no evidence supports yet. Do not build until at least 3 paying
  Pro-tier customers have asked for it, and then only the specific
  ask.
- **The full 2,280-line `content/page.tsx` rewrite into a split-screen
  WYSIWYG canvas** — this is a 2-3 month solo project that the audit
  positioned as a 4-week phase. Instead: extract the textarea →
  add streaming → add inline "Improve / Shorten / Change Tone" actions
  incrementally. Only rewrite fully if incremental hits a wall.

---

## 10. Reference

- **Audit source** (gitignored): `CONDUIKT-UI-UX-ANALYSIS-AND-IMPROVEMENT-REPORT.pdf`
- **Positioning spine:** `POSITIONING.md`
- **YC application briefing:** `YC-APPLICATION-BRIEFING.md`
- **Design system:** `DESIGN_SYSTEM.md`
- **Founder web deck** (published):
  https://claude.ai/code/artifact/a881afab-a218-4cf9-b3ac-21257fcf9848

---

*This plan is living. Revisit and update at the start of each new
sprint session with what actually happened + what changed.*
