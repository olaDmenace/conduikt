# Conduikt — Work Plan

## Status: Phase 2B — Delivery & Retention
**Updated:** February 19, 2026
**Live at:** https://conduikt.vercel.app

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
- [x] Email confirmation route handler
- [x] Supabase redirect URLs configured

### Pages (Phase 1)
- [x] Landing page, features, pricing, privacy, terms
- [x] Dashboard (real Supabase data, smart project-aware links)
- [x] Projects list + new project wizard (3-step)
- [x] Project overview with full tool navigation
- [x] SEO Audit page (live Claude API)
- [x] Content Studio (10 AI skills, streaming, social publish cards)
- [x] Analytics (Recharts impact dashboard)
- [x] Project settings (edit + delete)
- [x] Settings: profile, billing, integrations, team
- [x] AI Playground (10-skill sandbox)

### AI Skills (10)
- [x] seo-audit, page-cro, copywriting, social-content, email-sequence
- [x] content-strategy, competitor-analysis
- [x] blog-post, keyword-research, growth-playbook

### Billing
- [x] Lemon Squeezy checkout (Pro $49, Growth $99, Agency $249)
- [x] Webhook handler (order_created + subscription events)
- [x] Plan enforcement (generation limits per tier)
- [x] Billing portal

### Infrastructure
- [x] Vercel deployment
- [x] All env vars on Vercel
- [x] n8n build-in-public workflow (24 nodes, X + LinkedIn)

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
- [x] `ProjectNav` shared component on all project sub-pages
- [x] Dashboard: smart Quick Actions + All Tools grid (project-aware)
- [x] Project overview: "Your Tools" section with all feature links
- [x] Keyword → Blog pipeline (URL params pre-fill)
- [x] Blog → Social pipeline (post-save CTA)
- [x] Content Studio reads `?skill=` and `?prompt=` URL params

---

## 🔄 In Progress / Pending User Actions

- [ ] Add `UNSPLASH_ACCESS_KEY` and `UNSPLASH_SECRET_KEY` to Vercel env vars
- [ ] Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel env vars (for GSC)
- [ ] n8n workflow deployed and posting live

---

## 📋 Phase 2B — Delivery & Retention

### Email (Resend)
- [ ] Add `RESEND_API_KEY` to env (resend.com)
- [ ] Welcome email triggered on new signup (Supabase webhook → Resend)
- [ ] Transactional emails: password reset confirmation, plan upgrade notice
- [ ] Email sequence delivery from the platform (trigger + send steps via Resend)

### Scheduled Publishing
- [ ] pg_cron extension enabled in Supabase
- [ ] Cron job: poll `scheduled_posts` table every 5 min, call publish routes
- [ ] "Schedule for later" UI on social post cards
- [ ] Calendar view (`/projects/[id]/calendar`) — show scheduled posts

### GSC Deep Sync
- [ ] `/api/integrations/gsc/sync` — fetch queries/impressions/clicks from GSC API
- [ ] Store in `keyword_data` with real volume data
- [ ] Surface GSC data on Analytics and Keyword Research pages

---

## 📋 Phase 3 — Scale & Launch

- [ ] Campaign orchestrator (multi-skill chaining, visual builder)
- [ ] Team member invites + RBAC (owner, admin, member, viewer)
- [ ] White-label PDF audit reports (React PDF)
- [ ] Light mode theme toggle
- [ ] Onboarding tour for new users (first-time flow)
- [ ] Product Hunt launch prep (assets, description, positioning)
- [ ] Programmatic SEO landing pages ("Conduikt vs X", "How to automate Y")
- [ ] Analytics feedback loop (inject post performance into AI context)
