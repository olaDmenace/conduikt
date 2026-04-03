# Conduikt — Work Plan

## Status: Phase 3 — Scale & Launch
**Updated:** April 3, 2026
**Live at:** https://conduikt.com

---

## ✅ Completed — Phase 1: MVP Core

### Platform
- [x] Next.js 15 + TypeScript + Tailwind v4 scaffold
- [x] Supabase: 12 tables, RLS on all, 8 migrations, triggers
- [x] Mineral design system (tokens, typography, animations, grain overlay)
- [x] UI component library (Button, Input, Card, Badge, Dialog, Tabs, Toast, Skeleton)
- [x] Layout shell (sidebar, header, grain overlay, mobile responsive)
- [x] `prose-conduikt` markdown stylesheet

### Auth
- [x] Email/password login and signup
- [x] Social login — X (Twitter)
- [x] Social login — LinkedIn OIDC
- [x] Forgot/reset password (PKCE + hash fragment)
- [x] Email confirmation (client-side PKCE flow via `/auth/confirm` page)
- [x] Supabase redirect URLs configured
- [x] Password reveal toggle on login, signup, and webhook auth fields

### Pages (Phase 1)
- [x] Landing page, features, pricing, privacy, terms
- [x] Dashboard (real Supabase data, smart project-aware links)
- [x] Projects list + new project wizard (4-step, deferred creation)
- [x] Project overview with full tool navigation
- [x] SEO Audit page (live Claude API)
- [x] Content Studio (7 AI skills, streaming, structured renderers)
- [x] Analytics (Recharts impact dashboard, AI cost card hidden, Model column removed)
- [x] Project settings (edit + delete — deletion preserves generation history)
- [x] Settings: profile, billing, integrations, team
- [x] AI Playground (10-skill sandbox)

### AI Skills (10)
- [x] seo-audit, page-cro, copywriting, social-content, email-sequence
- [x] content-strategy, competitor-analysis
- [x] blog-post, keyword-research, growth-playbook
- [x] All agents: no-emoji rule, strict JSON output (no code fences)
- [x] Structured renderers: Copywriting (variant cards), Email (iframe HTML preview + copy), Content Strategy (pillars/calendar/KPIs), Competitor Analysis (strengths/weaknesses/gaps), Blog Post (article + SEO meta + social promo), CRO Report (score + findings)

### Billing
- [x] Lemon Squeezy checkout (Pro $49, Growth $99, Agency $249)
- [x] Webhook handler (order_created + subscription events)
- [x] Plan enforcement (generation limits per tier)
- [x] Billing portal
- [x] Usage history preserved on plan upgrade (only resets on billing cycle)

### Infrastructure
- [x] Vercel deployment
- [x] All env vars on Vercel
- [x] n8n build-in-public workflow (24 nodes, X + LinkedIn)
- [x] Domain updated to conduikt.com (all code references)
- [x] Git branching: `main` (production) + `develop` (staging/preview)

---

## ✅ Completed — Phase 2A: Differentiation

### New Features
- [x] Blog Post Generator (`/projects/[id]/blog`)
  - 4-tab preview: Article / SEO Meta / Promote / Raw JSON
  - react-markdown rendering with `prose-conduikt` styles
  - Unsplash image picker (search by AI-generated query, attribution compliant)
  - Save as draft → nudges to generate social posts
- [x] Keyword Research (`/projects/[id]/keywords`)
  - Google Autocomplete proxy with 350ms debounce (`/api/keywords/autocomplete`)
  - AI-generated primary/long-tail/question keywords + content clusters
  - Intent badges, difficulty indicators, quick-win flags
  - Per-keyword "Blog" button → routes to blog page with keyword pre-filled
  - `keyword_data` table in Supabase
- [x] Growth Playbook (`/projects/[id]/growth`)
  - 90-day AI plan with 3 phases, 5–7 actions each
  - Collapsible phases, per-action check-off, progress bar
  - Each action links directly to the relevant Conduikt tool
  - Save as growth_playbook asset
- [x] Impact Analytics Dashboard (`/projects/[id]/analytics`)
  - Recharts line chart (audit score trend)
  - Bar chart (weekly content velocity)
  - Skill usage breakdown, stat cards, generation history

### Integrations
- [x] X publishing — per-post cards with publish button
- [x] LinkedIn publishing — per-post cards with publish button
- [x] Unsplash API — `lib/integrations/unsplash.ts` + `/api/blog/image`
- [x] Google Search Console — OAuth connect/callback routes, GSC card on integrations page

### UX / Navigation
- [x] Sidebar-only navigation for project sub-pages (horizontal ProjectNav removed)
- [x] Content Studio skill selector: dropdown instead of card grid
- [x] Dashboard: smart Quick Actions + All Tools grid (project-aware)
- [x] Project overview: "Your Tools" section with all feature links
- [x] Keyword → Blog pipeline (URL params pre-fill)
- [x] Blog → Social pipeline (post-save CTA)
- [x] Content Studio reads `?skill=` and `?prompt=` URL params
- [x] Project audience display: human-readable (not raw JSON)
- [x] "Streaming from Claude" and all model name references removed from UI

---

## ✅ Completed — Phase 2B: Delivery & Retention

### Email (Resend)
- [x] Welcome email triggered on new signup (via `/api/auth/welcome`)
- [x] Transactional emails: plan upgrade notice
- [x] Sender domain updated to `hello@conduikt.com`
- [x] Branded Supabase email templates drafted (confirm, reset, magic link, invite)

### Scheduled Publishing
- [x] "Schedule for later" UI on social post cards
- [x] Calendar view (`/projects/[id]/calendar`) — shows scheduled posts
- [x] Calendar CSV export
- [x] Calendar routing fixed (was pointing to agent sandbox)

### Campaigns
- [x] Campaign orchestrator (multi-skill chaining)
- [x] Campaign runner: auto-expand results, structured display, copy button

### CRO Analysis
- [x] Fixed 500 error (missing HTML in buildUserPrompt)

---

## 🔄 In Progress / Pending User Actions

- [ ] Configure custom SMTP in Supabase dashboard (Resend credentials)
- [ ] Apply branded email templates in Supabase dashboard
- [ ] Verify `conduikt.com` domain in Resend (SPF, DKIM, DMARC)
- [ ] Update Supabase Site URL to `https://conduikt.com`
- [ ] Update Supabase Redirect URLs to include `conduikt.com`
- [ ] Update `NEXT_PUBLIC_APP_URL` on Vercel to `https://conduikt.com`
- [ ] Add `UNSPLASH_ACCESS_KEY` and `UNSPLASH_SECRET_KEY` to Vercel env vars
- [ ] Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel env vars (for GSC)
- [ ] Set up Vercel staging domain for `develop` branch
- [ ] n8n workflow deployed and posting live

---

## 📋 Phase 3 — Scale & Launch

### Admin Dashboard
- [x] Admin middleware protection (`role` column on profiles, `/admin/*` route gating)
- [x] Admin dashboard pages (users, projects, generations, subscriptions, usage, settings)
- [x] Admin actions: change plan, reset generation count, disable/re-enable account (`/api/admin/users/[id]`)

### Scheduled Publishing (remaining)
- [ ] pg_cron extension enabled in Supabase
- [ ] Cron job: poll `scheduled_posts` table every 5 min, call publish routes

### GSC Deep Sync
- [ ] `/api/integrations/gsc/sync` — fetch queries/impressions/clicks from GSC API
- [ ] Store in `keyword_data` with real volume data
- [ ] Surface GSC data on Analytics and Keyword Research pages

### Campaign Visual Builder
- [ ] Visual flow editor for campaign step design

### PDF Exports
- [x] Audit Report PDF (`@react-pdf/renderer`, agency branding)
- [x] Analytics Report PDF (usage stats, GSC keywords, agency-only)
- [x] Growth Playbook PDF — cover + executive summary + per-phase actions + growth levers
- [x] Blog Post PDF — cover + article + SEO meta + social promotion snippets
- [x] Generic Content PDF — fallback for all other asset types (copy, email, social, etc.)
- [x] Generic asset PDF route `/api/projects/[id]/assets/[assetId]/pdf` — covers all saved types
- [x] Export PDF button on Growth Playbook page, Blog page, Content Studio, and Library dialog

### Platform
- [ ] Team member invites + RBAC (owner, admin, member, viewer)
- [ ] Light mode theme toggle
- [ ] Onboarding tour for new users (first-time flow)

### Bug Fixes (April 3)
- [x] Save Playbook 400 error — `growth_playbook` and `blog_post` added to API `validTypes` list (DB constraint already allowed them)
- [x] Content Studio crash on `?skill=growth-playbook` URL param — unknown skill IDs now fall back to `"copywriting"`

### Launch
- [ ] Product Hunt launch prep (assets, description, positioning)
- [ ] Programmatic SEO landing pages ("Conduikt vs X", "How to automate Y")
- [ ] Analytics feedback loop (inject post performance into AI context)
