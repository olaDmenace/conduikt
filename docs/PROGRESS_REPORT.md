# Conduikt — Progress Report

**Date:** February 19, 2026
**Phase:** 2A (Differentiation) — Complete. Phase 2B — Next.
**Author:** Claude Code (Sonnet 4.6)

---

## Executive Summary

Conduikt is a fully deployed AI marketing SaaS at `https://conduikt.vercel.app`. Phase 1 (MVP Core) and Phase 2A (Differentiation) are both complete. The platform now ships 10 AI skills, a blog post generator with Unsplash image picker, keyword research with autocomplete, a 90-day growth playbook, an impact analytics dashboard, X/LinkedIn/GSC OAuth integrations, and a full social publishing pipeline. All project sub-pages share a unified navigation bar. The dashboard surfaces all features intelligently based on whether the user has a project.

---

## Completed Work

### Phase 1 — MVP Core ✅

#### Infrastructure & Database
| Item | Status | Details |
|------|--------|---------|
| Supabase Project | Done | `yybpacultmaxqxjfsrvx` in us-east-1 |
| Core Tables | Done | 12 tables: profiles, projects, campaigns, assets, ai_generations, audits, scheduled_posts, email_sequences, email_sequence_steps, team_members, connected_accounts, keyword_data |
| Row Level Security | Done | RLS enabled on all tables with user-scoped policies |
| Indexes | Done | Performance indexes on all key columns |
| Triggers | Done | Auto-create profile on signup, auto-update timestamps |
| Migrations | Done | 7 migrations applied |

#### Mineral Design System
| Item | Status |
|------|--------|
| CSS Design Tokens | Done |
| Typography (DM Serif / Outfit / JetBrains Mono) | Done |
| Animations (fade-up, shimmer, grain) | Done |
| Light Mode Tokens | Done (activation Phase 3) |
| `prose-conduikt` markdown styles | Done |

#### UI Component Library
Button, Input, Card, Badge, Dialog, Tabs, Skeleton, Toast, PageHeader, ProjectNav — all done.

#### Auth & Security
Email/password, X social login, LinkedIn social login, PKCE password reset, email confirmation, middleware route protection — all done.

#### Billing
Lemon Squeezy checkout (Pro $49, Growth $99, Agency $249), webhook handler (order_created + subscription events), plan enforcement, billing portal — all done.

---

### Phase 2A — Differentiation ✅

#### New AI Skills (10 total, was 7)
| Skill | Status |
|-------|--------|
| seo-audit | Done |
| page-cro | Done |
| copywriting | Done |
| social-content | Done (JSON parsed → per-post publish cards) |
| email-sequence | Done |
| content-strategy | Done |
| competitor-analysis | Done |
| **blog-post** | **Done** (8k tokens, SEO metadata + social snippets output) |
| **keyword-research** | **Done** (primary/long-tail/questions/clusters schema) |
| **growth-playbook** | **Done** (3-phase 90-day plan with actions, levers, Week 1 checklist) |

#### New Pages (49 routes total, was 35)
| Route | Status | Notes |
|-------|--------|-------|
| `/projects/[id]/blog` | Done | SEO blog generator with 4-tab preview, Unsplash image picker, social nudge |
| `/projects/[id]/keywords` | Done | Keyword research with Google Autocomplete, tabbed results, Keyword→Blog pipeline |
| `/projects/[id]/growth` | Done | 90-day growth playbook with collapsible phases, check-off, action routing |
| `/projects/[id]/analytics` | Done | Recharts impact dashboard (line + bar charts, skill breakdown) |
| `/api/keywords/autocomplete` | Done | Google Suggest proxy with 5-min cache |
| `/api/blog/image` | Done | Unsplash search proxy + download tracker |
| `/api/integrations/gsc/connect` | Done | Google OAuth initiation |
| `/api/integrations/gsc/callback` | Done | Token exchange + connected_accounts upsert |

#### Integrations
| Integration | Status | Notes |
|-------------|--------|-------|
| X (Twitter) — social login | Done | |
| X (Twitter) — publishing | Done | `/api/publish/x`, per-post cards |
| LinkedIn — social login | Done | |
| LinkedIn — publishing | Done | `/api/publish/linkedin`, per-post cards |
| Google Search Console | Done (foundation) | OAuth flow complete; deep sync pending |
| Unsplash | Done | Image search for blog hero photos, attribution compliant |

#### UX Pipeline Wiring
- **Keyword → Blog**: "Blog" button on each keyword routes to `/blog?keyword=...`, pre-fills target keyword
- **Blog → Social**: After saving a blog post, "Generate Social Posts" CTA routes to Content Studio with skill + prompt pre-filled
- **Content Studio**: Reads `?skill=` and `?prompt=` URL params on load
- **Growth Playbook actions**: Each action card has a direct link to the relevant Conduikt tool page
- **ProjectNav**: Shared nav bar on all 7 project sub-pages (Overview / Audit / Content / Blog / Keywords / Growth / Analytics / Settings)
- **Dashboard**: Smart Quick Actions + All Tools grid — project-aware linking when a project exists

#### Database Migrations (7 total)
1. `create_core_tables`
2. `enable_rls_and_policies`
3. `fix_function_search_paths`
4. `rename_stripe_to_lemonsqueezy`
5. `create_n8n_content_state`
6. `create_connected_accounts`
7. `create_keyword_data_table`
8. `extend_asset_types_and_gsc` — adds blog_post, growth_playbook to assets.type; gsc to connected_accounts.platform; gsc_site_url to projects

---

## Architecture Decisions

| Item | Decision | Reason |
|------|----------|--------|
| Stripe → Lemon Squeezy | LS | Simpler for solo founder, better for Africa |
| Inngest | Skipped | n8n handles scheduling; Supabase pg_cron for jobs |
| Drizzle ORM | Skipped | Supabase client sufficient |
| Model | claude-sonnet-4-6 | Latest, most capable |
| react-markdown + remark-gfm | Installed | Blog post markdown preview |
| Recharts | Used | Impact dashboard charts |
| Unsplash API | Integrated | Blog hero image picker |

---

## Metrics

| Metric | Value |
|--------|-------|
| Routes (pages + API) | 49 |
| AI Skills | 10 |
| DB Tables | 12 |
| DB Migrations | 8 |
| Build Status | ✅ Zero errors |
| Deployment | Live — https://conduikt.vercel.app |
| Paying Users | 1 (Pro plan) |
| n8n Nodes | 24 |

---

## What's Next

### Phase 2B — Delivery & Retention
1. **Resend integration** — Welcome email on signup, transactional notifications
2. **Email sequence delivery** — Trigger + deliver email_sequences from the platform
3. **Scheduled posts** — pg_cron queue for X/LinkedIn publishing
4. **GSC deep sync** — Fetch real keyword rankings and impressions; inject into growth playbook

### Phase 3 — Scale
5. Campaign orchestrator (multi-skill chaining)
6. Team member invites + RBAC
7. White-label PDF audit reports
8. Light mode theme toggle
9. Onboarding tour
10. Product Hunt launch prep

### System Hardening
- System hardening — session scripts and agent checklist — complete — 2026-03-14

### Video Agent — UGC Type
- UGC video type — script agent, HeyGen pipeline, UI, DB migration — complete — 2026-03-14
- HEYGEN_UGC_AVATAR_ID — removed — replaced with smart 3-level fallback (unfiltered pool → DEFAULT_AVATAR_ID → clear error)

### UGC Avatar Selection
- 3-mode avatar selection (random, pick, brand-matched) — complete — 2026-03-14
- Avatar utility layer: getAvatars, getUGCAvatars, selectRandomAvatar, selectBrandMatchedAvatar, resolveUGCAvatar — complete
- API route: GET /api/video/avatars with gender filter — complete
- Avatar picker modal with grid UI — complete
- Brand context injection into UGC script agent — complete
- DB migration: avatar_mode, selected_avatar_id, avatar_gender columns on video_jobs — applied

### Phase 3 Full Build — Tier 1
- Feature 1.1 — Onboarding Questionnaire — complete — 2026-03-14
  - 5-step flow at /projects/[id]/onboarding (business, audience, brand voice, competitors, confirmation)
  - DB migration: industry, business_description, audience_pain_point, online_channels, brand_voice_example, primary_goal, onboarding_completed columns
  - Pre-fills from existing project data, redirects if already completed
  - Banner on project overview when onboarding not completed
  - Prompt builder updated to use new onboarding columns
- Feature 1.2 — Social Engagement Pull-back — complete — 2026-03-14
  - Inngest scheduled function: sync-social-metrics (every 6 hours, all platforms)
  - GET /api/analytics/post-metrics/[postId] route with ownership check
  - Existing manual sync routes verified working
- Feature 1.3 — AI Content Scoring — complete — 2026-03-14
  - New content-scorer agent with 4 dimensions: clarity, relevance, engagement_potential, brand_alignment (0-25 each, total 0-100)
  - Registered in agents/index.ts
  - content_scores table with RLS — migration applied
  - Dedicated route: POST /api/agents/content-scorer (persists scores)
  - Existing /api/ai/score-content rewritten to use new agent and persist
  - ContentScorePanel component rebuilt with 4 gauges + total
  - ContentScoreBadge export for inline score display on content lists
- Feature 1.4 — Analytics Charts — already BUILT — skipped
- Feature 2.1 — Drag & Drop Calendar — already BUILT — skipped
- Feature 2.2 — Notifications — complete — 2026-03-14
  - Migration file for notifications table (already existed in cloud, now versioned)
  - createNotification() helper at src/lib/notifications.ts
  - Wired into video pipeline (complete + failed events)
  - Notification panel updated to support action_url routing
  - Added video_complete and video_failed notification types
- Feature 2.3 — Command Palette — already BUILT — skipped
- Feature 2.4 — Competitor Tracking — complete — 2026-03-14
  - Migration file for competitor_trackers and competitor_snapshots tables
  - Inngest weekly scheduled function: sync-competitors (Monday 3am UTC)
  - Rate limiting: max once per 24 hours per competitor on manual analysis
  - All existing CRUD routes and UI verified working
- Feature 3.1 — A/B Content Variants — complete — 2026-03-14
  - Plan gating added to /api/ai/generate-variants (Growth + Agency only)
  - VariantPanel integrated into Content Studio page (shown after generation)
  - Existing component and route verified working
- Feature 3.2 — Bulk Generation — complete — 2026-03-14
  - bulk_jobs table with RLS — migration created
  - POST /api/bulk-jobs: plan-gated (Growth + Agency), creates job + processes in background
  - GET /api/bulk-jobs/[id]: progress polling with ownership check
  - BulkGenerateDialog component: paste up to 30 topics, live progress bar, completion notification
  - Integrated into Content Studio page with "Bulk Generate" button
  - Auto-saves each generated piece as draft asset + logs to ai_generations
- Feature 3.3 — White-Label PDF Reports — complete — 2026-03-14
  - Migration: client_name, client_logo_url, report_accent_color columns on projects
  - Audit PDF updated with client branding (logo, name, accent color, agency footer)
  - Analytics PDF report: AnalyticsReportDocument component + GET /api/projects/[id]/analytics/pdf route
  - Export PDF button on analytics page
  - Client Branding section in project settings (Agency plan only): logo upload, client name, accent color
  - File upload API: POST /api/upload (Supabase Storage, 2MB max, image types only)
  - Agency plan gating on analytics PDF export route
- Feature 3.4 — Outbound Webhooks — complete — 2026-03-14
  - Migration: webhook_configs table with RLS
  - Crypto utility: AES-256-GCM encrypt/decrypt for auth tokens (src/lib/crypto.ts)
  - Test endpoint: POST /api/webhooks/[id]/test (sends test payload, 10s timeout)
  - "Send to..." dropdown component integrated into Content Studio
  - Webhook GET route updated with project_id filtering
  - Existing CRUD routes and settings page verified working
- Feature 4.1 — Campaign Orchestrator — complete — 2026-03-14
  - Visual flow builder using @xyflow/react with custom AgentNode and ActionNode types
  - Node-based editor: drag-drop agents, connect outputs→inputs, topological sort for execution order
  - Agent picker panel with all active agents from registry
  - Action nodes: Publish, Schedule, Wait
  - Dark-themed canvas matching Mineral design system (dot grid, custom controls/minimap)
  - "Visual Builder" button added to campaigns page alongside existing template wizard
  - Existing template campaigns, execution engine, and CampaignRunner verified working

### Navigation Audit & Wiring — complete — 2026-03-16
- Full audit of all 39 dashboard routes
- Orphaned routes wired into navigation:
  - `/projects` — "My Projects" heading in sidebar now clickable
  - `/projects/[id]/audit` — added to sidebar per-project section + ProjectNav
  - `/playground` — added to sidebar as global item
  - `/settings/team` — added as Settings sub-nav item
  - `/settings/integrations` — added as Settings sub-nav item
  - `/settings/integrations/webhooks` — added as Settings sub-nav item
- Per-project sidebar expanded with: Overview, Audit, Analytics, Calendar, Campaigns, Competitors, Video, Library, Settings
- Settings section now auto-expands sub-nav (Profile, Team, Billing, Integrations, Webhooks) when on /settings/*
- Verified: NotificationPanel in header, CommandPalette in layout, onboarding banner, Export PDF button, Send to... dropdown, Campaign orchestrator — all reachable

### HeyGen UGC Avatar Fallback Removal — complete — 2026-03-16
- Removed HEYGEN_UGC_AVATAR_ID from all code, docs, and env references
- Replaced with 3-level smart fallback in selectRandomAvatar(), selectBrandMatchedAvatar(), resolveUGCAvatar():
  1. Unfiltered avatar pool (any avatar from API)
  2. HEYGEN_DEFAULT_AVATAR_ID (already configured for Presenter videos)
  3. Clear descriptive error throw (never silently proceeds with undefined)
- Also removed from createHeyGenVideo() — simplified to use req.avatarId ?? DEFAULT_AVATAR_ID
- Updated ARCHITECTURE_ADDENDUM_v2.1.md to document new fallback strategy

### UGC Video Bug Fixes — complete — 2026-03-16
- **BUG 1 — Voice/Avatar Gender Mismatch**: `resolveUGCAvatar()` now returns `ResolvedAvatar` object `{ avatarId, gender }` instead of plain string. Both pipeline files updated to use gender-aware voice selection via `HEYGEN_DEFAULT_VOICE_ID_MALE` / `HEYGEN_DEFAULT_VOICE_ID` env vars.
- **BUG 2 — Studio Background on UGC**: Added `backgroundStyle` parameter to `HeyGenVideoRequest` ("studio" | "natural"). UGC videos now use warm off-white `#F5F5F0` instead of dark navy `#1a1a2e`. Pipeline files pass `backgroundStyle: "natural"` for UGC and skip thumbnailUrl.
- **BUG 3 — Brand-Matched Gender Consistency**: AI casting director prompt updated to consider avatar gender → voice gender relationship. `selectBrandMatchedAvatar()` returns full `ResolvedAvatar` with gender.
- Removed `HEYGEN_UGC_AVATAR_ID` from `.env.local`
- Added `HEYGEN_DEFAULT_VOICE_ID_MALE` to `.env.local`

### A/B Test Agent — activated — 2026-03-16
- Standalone agent page at /projects/[id]/agents/ab-test
  - Two-panel workspace: input (content type, brief, variant count) + output (tabbed variants with auto-scoring)
  - Generates original content via copywriting agent, then creates variants via existing generate-variants API
  - Each variant auto-scored in background via content-scorer agent (4 dimensions + total)
  - Save to library and copy-to-clipboard actions per variant
  - Plan gated: Growth and Agency only, locked state with upgrade prompt for Free/Pro
- Agent registry updated: ab-test-setup status changed from "coming_soon" to "active"
- 14 agents now active, 0 coming soon
- Added to ProjectNav with GitBranch icon
- Sidebar automatically includes it (uses AGENT_REGISTRY filter)
- Project overview automatically shows 14 active agents (no more "Coming Soon" section)

---

*Updated by Claude Code (Opus 4.6) on March 16, 2026*
