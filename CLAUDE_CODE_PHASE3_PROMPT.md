# Conduikt — Phase 3 Master Build Prompt
**For:** Claude Code  
**Project:** Conduikt (`https://conduikt.vercel.app`)  
**Stack:** Next.js 15 (App Router), TypeScript, Supabase, Anthropic SDK, Lemon Squeezy, Mineral Design System  
**Reference docs:** `SYSTEM_ARCHITECTURE_v2.md`, `ARCHITECTURE_ADDENDUM_v2.1.md`, `PROGRESS_REPORT.md`

---

## Context: Where We Are

Phases 1, 2A, and 2B are complete. The platform is live with:
- 10 AI marketing agents (SEO audit, copywriting, social, email, blog, keywords, growth playbook, content strategy, competitor analysis, CRO)
- X and LinkedIn publishing pipelines
- Google Search Console OAuth integration (connect/callback done; deep sync pending)
- Recharts analytics dashboard (audit score trend, content velocity, agent usage)
- Lemon Squeezy billing (Pro $49 / Growth $99 / Agency $249)
- Mineral dark-mode design system
- n8n build-in-public content automation engine
- Light mode (functional but needs polish)

What has NOT been built yet is laid out below as the Phase 3 roadmap. Work through it in the order presented — Tier 1 first, then Tier 2, then Tier 3. Do not skip ahead. Confirm completion of each feature before moving to the next.

---

## TIER 1 — Pre-Launch Critical (Build These First)

### 1. Social Engagement Pull-Back (Analytics Feedback Loop)

This is the single most important missing feature. The platform can publish to X and LinkedIn but cannot yet retrieve performance data back from those platforms. Without this, the "impact dashboard" cannot show ROI.

**What to build:**

**X (Twitter) engagement sync:**
- Create `/api/integrations/x/sync-metrics` — POST route that fetches engagement metrics (impressions, likes, retweets, replies, link clicks) for all posts in `scheduled_posts` where `channel = 'x'` and `status = 'published'` and `external_post_id` is not null
- Use the X API v2 `/tweets` endpoint with the `public.metrics` field
- Store results back into a new `post_metrics` table (schema below)
- Trigger sync: on-demand button in analytics page + auto-sync via Inngest cron job (daily at 6am UTC)

**LinkedIn engagement sync:**
- Create `/api/integrations/linkedin/sync-metrics` — same pattern, using LinkedIn UGC Posts API `/ugcPosts/{id}/statistics`
- Same `post_metrics` table, same trigger pattern

**New Supabase table — `post_metrics`:**
```sql
create table post_metrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  scheduled_post_id uuid references scheduled_posts(id) on delete cascade,
  channel text not null, -- 'x' | 'linkedin'
  external_post_id text not null,
  impressions integer default 0,
  likes integer default 0,
  shares integer default 0,
  comments integer default 0,
  clicks integer default 0,
  synced_at timestamptz default now(),
  created_at timestamptz default now()
);
-- RLS: user can only read their own project metrics
alter table post_metrics enable row level security;
create policy "project_owner_metrics" on post_metrics
  for all using (
    project_id in (select id from projects where user_id = auth.uid())
  );
```

**Analytics page updates:**
- Add a "Social Performance" section to `/projects/[id]/analytics` below the existing charts
- Show: total impressions, total likes, best performing post (by impressions), engagement rate trend line (Recharts)
- Add "Sync Now" button that calls both sync routes and refreshes the data
- Show last synced timestamp

**AI feedback injection:**
- In `src/lib/ai/context-builder.ts` (or equivalent), when building prompt context for social-content agent, inject the top 3 performing posts as examples: "Your best performing X post got 2,400 impressions. Here it is: [post text]. Mirror this tone and structure."
- Pull this from `post_metrics` joined with `assets` for the current project

---

### 2. Marketing Infrastructure Questionnaire (Onboarding Enhancement)

Currently onboarding is: URL → context → audit. We need a new step inserted between URL and context that asks the user about their existing marketing setup. This data personalises the entire platform experience from minute one and feeds the growth playbook agent.

**Insert a new step "setup" between the URL step and context step in `/app/(dashboard)/projects/new/page.tsx`**

The step flow becomes: `url → setup → context → audit`

**The questionnaire — 6 questions, visual multiple-choice (not a text form). Use card-style selectable tiles, not dropdowns:**

```
Q1: "What are you currently using for content creation?"
Options: Nothing yet | ChatGPT / Claude | Jasper / Copy.ai | A marketing agency | In-house team

Q2: "Which channels are you actively posting on?"
Options (multi-select): X (Twitter) | LinkedIn | Email newsletter | Blog | None yet

Q3: "What's your biggest marketing challenge right now?"
Options: Getting more traffic | Converting visitors into customers | Staying consistent with content | Not enough time to do it all | Don't know where to start

Q4: "Is Google Search Console set up for your site?"
Options: Yes, it's connected | Yes but I haven't set it up | No | What's Google Search Console?

Q5: "How would you describe your current content output?"
Options: Zero — starting from scratch | Occasional posts (less than weekly) | Weekly content | Daily / multiple times a week

Q6: "Who is this project for?"
Options: My own product / startup | A client's business | My agency (multiple clients) | Side project / experiment
```

**Store responses in a new `onboarding_answers` JSONB column on the `projects` table:**
```sql
alter table projects add column if not exists onboarding_answers jsonb;
```

**After completing the questionnaire, generate a personalised setup plan:**
- Call `/api/ai/generate` with the `onboarding-advisor` prompt (create this new agent prompt)
- The prompt receives the questionnaire answers + audit score (if available) and returns: recommended first agent to use, 3 "quick wins" specific to their setup, and which integrations to connect first
- Display this as a "Your Personalised Setup" card at the top of the project overview page (dismissible, shown only until the user has used 3+ agents)

**Agent prompt — `src/lib/ai/agents/prompts/onboarding-advisor.ts`:**
The prompt should analyse the questionnaire answers and output a JSON object:
```json
{
  "firstAgent": "seo-audit | blog-post | social-content | ...",
  "firstAgentReason": "one sentence explanation",
  "quickWins": ["action 1", "action 2", "action 3"],
  "integrationsToConnect": ["gsc | x | linkedin | none"],
  "setupMessage": "2-3 sentence personalised welcome message"
}
```

---

### 3. AI Content Scoring (Pre-Publish Quality Check)

Before a user publishes or saves any piece of generated content, score it automatically across three dimensions and surface improvement suggestions.

**Where to add this:**
- Blog agent page (`/projects/[id]/blog`) — score the full post before showing the Publish button
- Social content agent (`/projects/[id]/content`) — score each generated post card
- Copywriting agent — score the generated copy block

**Create a new API route `/api/ai/score-content`:**
```typescript
// POST body:
{
  content: string,
  contentType: 'blog' | 'social' | 'copy' | 'email',
  targetKeyword?: string, // for blog scoring
  channel?: 'x' | 'linkedin' // for social scoring
}

// Response:
{
  scores: {
    readability: number,    // 0-100
    seoFit: number,         // 0-100 (blog only, else null)
    engagementPotential: number, // 0-100
    overall: number         // weighted average
  },
  suggestions: string[],    // 2-4 specific, actionable improvements
  verdict: 'publish' | 'improve' | 'rewrite' // threshold: publish >75, improve 50-75, rewrite <50
}
```

**UI component — `src/components/content/content-score-panel.tsx`:**
- Three circular score gauges (readability, SEO, engagement) using the Mineral colour system: green (>75), amber (50-75), red (<50)
- Verdict badge: "Ready to Publish ✓" | "Could be Stronger" | "Needs Rework"
- Collapsible suggestions list (max 4 items)
- "Improve with AI" button that re-runs the agent with the suggestions injected as additional instructions
- Score this automatically after generation completes — don't make the user click a button to trigger it

---

### 4. Analytics Charts Polish

The Recharts charts are already in the analytics page but need to be extended so the dashboard is genuinely useful.

**Add these to `/projects/[id]/analytics`:**

**Keyword ranking tracker** (new chart — line chart):
- Show position over time for saved keywords (from `keyword_data` table)
- X axis: date, Y axis: ranking position (inverted — position 1 at top)
- Each tracked keyword is a separate line
- Only show if GSC is connected AND keywords have been synced at least twice
- If no data: empty state card saying "Connect GSC and track keywords to see ranking trends"

**Social performance chart** (new chart — bar chart):
- Weekly impressions across X + LinkedIn combined
- Only visible once `post_metrics` has data (Tier 1.1 above must be done first)

**Generation cost tracker** (new stat card):
- Calculate approximate cost from token usage: input tokens × $0.000003 + output tokens × $0.000015 (Sonnet 4 pricing)
- Display as "~$X.XX in AI costs this month"
- Note: this is for user awareness, not billing

**Biggest win highlight card** (already in architecture, needs implementing):
- "Your audit score improved by +18 points since you started" — pull from `audits` table
- "Your best post got 3,200 impressions" — pull from `post_metrics`
- Show whichever is most impressive

---

## TIER 2 — Post-Launch Retention Features

Build these after Tier 1 is complete and the platform is stable. Do not start Tier 2 until all four Tier 1 items are done.

### 5. Content Calendar — Drag-and-Drop Upgrade

Upgrade `/projects/[id]/calendar` from a list view to a full visual week/month calendar.

**Library to use:** `@dnd-kit/core` + `@dnd-kit/sortable` (already likely installed; if not, install it). Do NOT use react-big-calendar — it conflicts with the Mineral design system.

**Views:** Week view (default) and Month view, toggle between them.

**Drag behaviour:**
- Drag a scheduled post card from one date/time slot to another
- On drop, PATCH `/api/scheduled-posts/[id]` with the new `scheduled_at` datetime
- Optimistic UI update — move the card immediately, revert if the API call fails
- Show a subtle toast: "Post rescheduled to [new date]"

**Post cards on the calendar:**
- Channel icon (X bird / LinkedIn / Email icon)
- First 60 characters of content
- Status badge (scheduled / published / failed)
- Click to open a slide-over panel with full content + publish/delete actions

---

### 6. Notifications System

**In-app notifications:**
- Create a `notifications` table in Supabase:
```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  type text not null, -- 'audit_complete' | 'post_published' | 'post_failed' | 'keyword_moved' | 'score_improved'
  title text not null,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);
```
- Bell icon in the top nav bar (already likely has the icon slot) with unread count badge
- Dropdown panel showing last 20 notifications
- Mark all as read button
- Click any notification → navigate to the relevant page

**Trigger notifications for:**
- Audit complete (success or failure)
- Scheduled post published successfully
- Scheduled post failed to publish (with reason)
- Audit score improved by more than 5 points vs. previous run
- New keyword moved into top 10 (from GSC sync)

**Email digests (weekly — via Resend):**
- Every Monday 8am UTC, send a "Your Week in Review" email to each active user
- Contents: audit score current + change, posts published count, top performing post, top keyword opportunity
- Create an Inngest scheduled function for this
- Use a minimal HTML email template styled with the Conduikt brand colours (no Mineral CSS — email-safe inline styles only)
- Users can opt out in Settings → Notifications (add a toggle there)

---

### 7. Global Search — Cmd+K Command Palette

**Library:** `cmdk` (install if not present)

**Trigger:** `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) from anywhere in the authenticated app

**Search scope:**
- Projects (by name or URL)
- Agents (by name — navigates to agent page within current project)
- Saved assets / content pieces (by title or content snippet)
- Settings pages
- Recent pages visited (last 5, stored in Zustand UI store — not persisted)

**Implementation:**
- Global keyboard listener in the dashboard layout component
- Results grouped by type: Projects / Agents / Content / Pages
- Keyboard navigation (arrow keys + Enter)
- Mineral design: dark overlay, surface-2 panel, accent highlight on selected item

---

### 8. Competitor Tracking Agent

Upgrade the existing competitor analysis agent from a one-shot analysis into an ongoing monitoring feature.

**New database table:**
```sql
create table competitor_trackers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  competitor_url text not null,
  competitor_name text,
  last_checked_at timestamptz,
  created_at timestamptz default now()
);

create table competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid references competitor_trackers(id) on delete cascade,
  keyword_overlap integer,
  content_gaps text[], -- array of topic gaps identified
  estimated_da integer, -- domain authority estimate
  top_keywords text[],
  snapshot_data jsonb,
  created_at timestamptz default now()
);
```

**New page: `/projects/[id]/competitors`**
- Add "Competitors" to ProjectNav
- List of tracked competitor domains (add up to 5 for Growth, unlimited for Agency)
- Per-competitor card showing: last snapshot date, keyword overlap count, top content gap
- "Check Now" button → runs a fresh analysis and saves a new snapshot
- Trend: "Keyword overlap increased by 3 since last check"
- Inngest cron: auto-check all tracked competitors weekly

---

## TIER 3 — Power User & Agency Features

Start Tier 3 only after Tier 2 is stable. These are high-value but not urgent for the initial public launch.

### 9. A/B Copy Variants

When any agent generates content, offer the option to generate 2 additional variants.

**Implementation:**
- "Generate Variants" button appears after the primary generation is shown
- Calls the same agent with a modified system prompt: "Generate a different version of this content. Vary the angle, opening hook, and tone while keeping the core message. Do not repeat the previous version."
- Store all variants in the `assets` table with a `variant_group_id` UUID linking them
- UI: tab switcher (Variant A / B / C) above the content panel
- "Pick Winner" button — marks one as `selected: true`, the others as `archived: true`
- In analytics, winning variants surface as training data for future scoring context

---

### 10. Bulk Generation

Allow users to queue multiple content generations at once via Inngest background jobs.

**Entry point:** New "Bulk Generate" button on the Content Studio page

**Flow:**
1. User selects: agent type, number of pieces (up to 30), variation instructions (e.g. "30 different social posts for these 30 keywords" — paste a list)
2. System creates a `bulk_job` record and queues individual Inngest tasks, one per piece
3. Progress UI: "Generating 30 posts... 12/30 complete" with a live progress bar (poll `/api/bulk-jobs/[id]` every 3 seconds)
4. When complete: "Your 30 posts are ready" notification + direct link to the generated assets

**New table:**
```sql
create table bulk_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  agent_id text not null,
  total integer not null,
  completed integer default 0,
  failed integer default 0,
  status text default 'running', -- 'running' | 'complete' | 'failed'
  created_at timestamptz default now(),
  completed_at timestamptz
);
```

**Plan gating:** Bulk generation available on Growth ($99) and Agency ($249) only. Free and Pro users see the button but get a plan upgrade prompt.

---

### 11. White-Label PDF Reports (Agency Tier)

Allow Agency tier users to export audit reports as branded PDFs with client logo and colours.

**Library:** `@react-pdf/renderer` (install if not present)

**What the PDF contains:**
- Client logo (uploaded by the agency user in project settings)
- Agency name + date
- SEO audit score gauge (rendered as SVG in the PDF)
- Top 10 findings with severity and recommended fix
- Keyword performance table (if GSC connected)
- Content velocity summary
- Growth playbook highlights (top 3 priorities)
- "Prepared by [Agency Name] using Conduikt" footer (cannot be removed — this is word-of-mouth marketing)

**Where to add it:**
- "Export PDF Report" button on the audit page and the analytics page
- Agency tier only — show a locked/upgrade prompt for lower tiers

**Project settings addition:**
- Add "Client Branding" section to `/projects/[id]/settings` for Agency users
- Fields: client logo upload (stored in Supabase Storage), client name, report accent colour

---

### 12. Webhook Integrations

Allow users to push generated content to external tools automatically.

**New page: `/settings/integrations/webhooks`** (separate from the OAuth integrations page)

**Supported outbound webhooks:**
- **WordPress** — POST generated blog posts to WordPress REST API (`/wp-json/wp/v2/posts`) as drafts. Requires WP site URL + application password.
- **Webflow** — POST to Webflow CMS Collections API. Requires Collection ID + API token.
- **Buffer** — POST social content to Buffer's API for scheduling. Requires Buffer access token.
- **Generic webhook** — POST the raw generated content as JSON to any URL the user provides. For custom Zapier/Make.com integrations.

**New table:**
```sql
create table webhook_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  type text not null, -- 'wordpress' | 'webflow' | 'buffer' | 'generic'
  endpoint_url text not null,
  auth_token text, -- encrypted at rest
  config jsonb, -- type-specific config (collection_id, etc.)
  active boolean default true,
  created_at timestamptz default now()
);
```

**Where to trigger:** After a user saves/approves a piece of content, show a "Send to..." dropdown that lists their configured webhooks. One click pushes the content.

---

### 13. Video Ad Generator (API Integration — Not Native Build)

Integrate with Runway ML (or HeyGen as fallback) to generate short video ads from Conduikt content.

**Entry point:** New "Video Agent" in the agent registry with `status: 'coming_soon'` initially, then activate once the integration is wired.

**Flow:**
1. User navigates to the Video Agent page
2. Selects a piece of existing copy or a blog post from their saved assets — OR writes a new brief
3. Conduikt generates: video script, on-screen text overlays, voiceover copy, and suggested visual direction
4. User reviews the script, clicks "Generate Video"
5. POST to Runway ML Gen-3 API (or HeyGen avatar video API) with the script and style parameters
6. Poll for completion, surface the video in the dashboard when done
7. User can download or publish directly to X/LinkedIn

**API to use:** Runway ML (`https://api.runwayml.com`) — Gen-3 Alpha Turbo model for short-form ads (5–10 seconds). Apply for API access at `runwayml.com/api`.

**Plan gating:** Growth and Agency tiers only. Each video generation counts as 10 AI generation credits.

---

### 14. Campaign Orchestrator

The most complex feature — chains multiple agents together into an automated pipeline.

This is a significant build. Start this only when all other Tier 3 items are stable.

**What it does:** User defines a multi-step campaign. Example: "Run SEO audit → generate 3 blog posts targeting top opportunities → auto-generate social promotion for each blog post → schedule all social posts across X and LinkedIn over 2 weeks."

**Implementation approach:**
- Visual flow builder (node-based — use `reactflow` library)
- Each node = one agent or one action (publish, schedule, wait)
- Edges connect outputs of one agent to inputs of the next
- Campaigns are stored as JSON workflow definitions in a `campaigns` table
- Execution engine: Inngest workflow with step functions, one step per node
- User can run a campaign manually or schedule it to repeat (weekly, monthly)

**Start small:** Build a "Campaign Templates" section first with 3 pre-built campaign types:
- "Blog → Social Promotion" (blog agent → social agent → schedule)
- "Audit → Fix → Report" (audit → copywriting → PDF export)
- "Monthly Content Sprint" (keyword research → 4 blogs → 30 social posts → schedule)

Let users run templates before building the custom visual editor.

---

## Design Notes for All Features

- All new UI must use the **Mineral design system** exclusively. No Tailwind defaults, no shadcn defaults unless they're already wrapped in Mineral components.
- Dark mode is the primary mode. Light mode should work but doesn't need to be pixel-perfect in this phase.
- All new pages must include `<PageHeader>` and `<ProjectNav>` (where inside a project context).
- All new Supabase tables need RLS enabled with user-scoped policies before anything else.
- All AI calls must go through the existing `src/lib/ai/client.ts` wrapper — do not call the Anthropic SDK directly from route handlers.
- Every new feature that generates AI content must write to the `ai_generations` table for tracking.

---

## Session Protocol

At the start of each Claude Code session:
1. Read `SYSTEM_ARCHITECTURE_v2.md` and `ARCHITECTURE_ADDENDUM_v2.1.md`
2. Check `PROGRESS_REPORT.md` for what's complete
3. Confirm which Tier and feature we're working on before writing any code
4. After completing a feature, update `PROGRESS_REPORT.md` with the new completed items

Do not mark a feature complete until:
- The database migration is applied (if applicable)
- The API route is returning correct responses
- The UI is rendering correctly in dark mode
- The feature is tested end-to-end in the browser

---

*This document is the Phase 3 build guide for Conduikt. Reference it alongside the existing architecture documents for every session.*
