# Conduikt — Work Plan

## Current Phase: Phase 1 — MVP Core (Week 1)

### Completed
- [x] Project scaffolding (Next.js 15, TypeScript, Tailwind v4)
- [x] Supabase project created (us-east-1) with full database schema
- [x] Mineral design system implemented (CSS tokens, typography, animations)
- [x] Base UI component library (Button, Input, Card, Badge, Dialog, Tabs, Skeleton)
- [x] Layout shell (sidebar, header, grain overlay)
- [x] Auth flow (login, signup, Supabase middleware)
- [x] Dashboard home page with stats grid and quick actions
- [x] Projects list page with empty state
- [x] New project wizard (3-step: URL → context → audit)
- [x] Project overview dashboard with scores and findings
- [x] SEO audit page with findings list and filters
- [x] Content studio with generation panel and channel previews
- [x] Campaigns page with campaign type selector
- [x] Content calendar page
- [x] Analytics dashboard page
- [x] Settings pages (profile, billing, integrations, team)
- [x] AI Playground (quick generation sandbox)
- [x] Marketing landing page (hero, features, pricing, CTA)
- [x] Pricing page
- [x] Features page
- [x] AI skills infrastructure (seo-audit, page-cro, copywriting, social-content, email-sequence)
- [x] API routes (ai/generate, ai/audit, ai/suggest)
- [x] n8n build-in-public content engine workflow

### In Progress
- [ ] Wire up real Supabase queries to dashboard pages
- [ ] Connect AI generation to live Claude API
- [ ] Implement streaming responses for content generation

### Next Up (Week 2)
- [ ] Project onboarding wizard with real URL fetching
- [ ] Live SEO audit running against real pages
- [ ] Content generation with streaming AI responses
- [ ] Generation tracking and limits enforcement

### Week 3
- [ ] X OAuth 2.0 PKCE flow + publishing
- [ ] LinkedIn OAuth 2.0 flow + publishing
- [ ] Content calendar with scheduled posts
- [ ] Stripe billing integration
- [ ] Deploy MVP to Vercel
