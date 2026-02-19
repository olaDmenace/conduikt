# Conduikt — Work Plan

## Current Phase: Phase 2 — Differentiation

**Status as of February 18, 2026**
**Live at:** https://conduikt.vercel.app

---

## Completed (Phases 1 + partial Phase 2)

### Core Platform
- [x] Project scaffolding (Next.js 15, TypeScript, Tailwind v4)
- [x] Supabase project with full database schema (10 tables, RLS, triggers)
- [x] Mineral design system (CSS tokens, typography, animations)
- [x] Base UI component library (Button, Input, Card, Badge, Dialog, Tabs, Skeleton, Toast)
- [x] Layout shell (sidebar, header, grain overlay)
- [x] Mobile responsive sidebar with hamburger menu
- [x] Zustand UI store (sidebar collapse, mobile menu)
- [x] Error boundary + custom 404 page

### Auth
- [x] Email/password login and signup
- [x] Social login — X (Twitter)
- [x] Social login — LinkedIn OIDC
- [x] Forgot password flow
- [x] Reset password (PKCE + hash fragment handling)
- [x] Email confirmation route handler (/auth/confirm)
- [x] Supabase Site URL + redirect URLs configured

### Pages
- [x] Marketing landing page, pricing page, features page
- [x] Privacy Policy (/privacy) and Terms of Service (/terms)
- [x] Dashboard home (real Supabase data)
- [x] Projects list + new project wizard
- [x] Project overview dashboard
- [x] SEO audit page (live Claude API)
- [x] Content studio (7 skills, generation panel, channel previews)
- [x] Analytics page (real ai_generations data)
- [x] Project settings (edit + delete)
- [x] AI Playground (7-skill sandbox)
- [x] Settings: profile, billing
- [x] Coming Soon: campaigns, calendar, integrations, team

### AI Skills (7 total)
- [x] seo-audit
- [x] page-cro
- [x] copywriting
- [x] social-content
- [x] email-sequence
- [x] content-strategy
- [x] competitor-analysis

### Billing
- [x] Lemon Squeezy checkout (Pro $49, Growth $99, Agency $249)
- [x] Webhook handler (order_created + subscription events)
- [x] Plan enforcement (generation limits per tier)
- [x] Billing portal link

### Infrastructure
- [x] Vercel deployment (https://conduikt.vercel.app)
- [x] All environment variables on Vercel
- [x] n8n build-in-public workflow (24 nodes, X + LinkedIn)

---

## In Progress

- [ ] Lemon Squeezy webhook URL updated in LS dashboard (pending user action)
- [ ] n8n workflow deployed and posting live

---

## Next Up — Phase 2 Priorities

### Publishing (Highest Value)
- [ ] Per-user OAuth token storage (X + LinkedIn access tokens in Supabase)
- [ ] `/api/publish/x` — post to X on behalf of user
- [ ] `/api/publish/linkedin` — post to LinkedIn on behalf of user
- [ ] Connect content studio "Publish" button to live routes
- [ ] Scheduled posts system (Supabase pg_cron — no Inngest needed)

### Email
- [ ] Resend integration for transactional emails
- [ ] Welcome email on signup
- [ ] Email sequence delivery from the platform

### AI Streaming
- [ ] Real-time token streaming on content generation page
- [ ] Streaming on playground

### Analytics Feedback Loop
- [ ] Fetch X post engagement metrics (likes, impressions, clicks)
- [ ] Fetch LinkedIn post analytics
- [ ] Inject past performance into AI generation context

### More Skills
- [ ] programmatic-seo skill
- [ ] ab-test-setup skill
- [ ] launch-strategy skill (Phase 2/3 boundary)

---

## Phase 3 — Launch & Scale

- [ ] Campaign orchestrator (multi-skill chaining)
- [ ] Visual campaign builder UI
- [ ] Team member invites + RBAC (owner, admin, member, viewer)
- [ ] White-label PDF audit reports
- [ ] Light mode theme toggle
- [ ] Onboarding tour for new users
- [ ] Google Search Console integration
- [ ] Product Hunt launch prep
- [ ] Programmatic SEO landing pages ("Conduikt vs X", "How to automate Y")
