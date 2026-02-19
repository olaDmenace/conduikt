# Changelog

## [0.4.0] - 2026-02-18

### Added
- Social login with X (Twitter) and LinkedIn on login and signup pages
- Privacy Policy page at `/privacy`
- Terms of Service page at `/terms`
- Allow users without email on Supabase (for X OAuth edge case)
- Supabase auth providers configured: Twitter + LinkedIn OIDC

### Fixed
- Password reset "invalid or expired" — rewrote token detection to parse hash fragment directly via `setSession()` instead of unreliable `onAuthStateChange` PASSWORD_RECOVERY event
- Audit route 500 error — wrapped `generateWithClaude` in try-catch; missing API key now returns readable error

### Changed
- Upgraded all AI models from `claude-sonnet-4-5-20250929` → `claude-sonnet-4-6` across all 9 skill files and client

---

## [0.3.0] - 2026-02-18

### Added
- Lemon Squeezy webhook handler at `/api/webhooks/lemonsqueezy`
- Handles `order_created` (one-time purchases), `order_refunded`, `subscription_*` events
- Signature verification (HMAC-SHA256)
- Custom data `user_id` mapping for plan updates

### Fixed
- Webhook previously pointing at wrong URL (`/webhook/` → `/api/webhooks/lemonsqueezy`)
- Plan not updating after payment — added `order_created` case (LS products set up as one-time, not subscriptions)

---

## [0.2.0] - 2026-02-17

### Added
- Analytics page wired to real `ai_generations` data — tokens, model, skill, duration
- `/api/projects/[id]/analytics` route
- `content-strategy` AI skill — strategic content planning with pillars, calendar, KPIs
- `competitor-analysis` AI skill — competitive intelligence and positioning gaps
- Coming Soon states for Campaigns, Calendar, Team, Integrations
- Error boundary at `src/app/error.tsx`
- Custom 404 page at `src/app/not-found.tsx`
- Mobile responsive sidebar with hamburger menu and backdrop overlay
- `mobileMenuOpen` state in Zustand UI store
- Sidebar nav items support `comingSoon: true` flag (renders as non-clickable span)
- Forgot password and reset password pages
- `/auth/confirm` route handler for email confirmation + PKCE exchange
- Dynamic redirect URLs for auth emails using `NEXT_PUBLIC_APP_URL`
- Lemon Squeezy billing (replacing Stripe): Pro ($49), Growth ($99), Agency ($249)

### Fixed
- Removed stale `app/` directory that was causing default Next.js page on Vercel

### Changed
- Billing from Stripe → Lemon Squeezy (simpler, no EU VAT complexity, better for African founders)

---

## [0.1.0] - 2026-02-15

### Added
- Initial project scaffolding with Next.js 15, TypeScript, Tailwind CSS v4
- Mineral design system — obsidian surfaces with copper/amber highlights
- Custom UI component library: Button, Input, Card, Badge, Dialog, Tabs, Skeleton, Toast
- Dashboard layout with collapsible sidebar, header with search, grain texture overlay
- Authentication flow: login, signup, Supabase auth middleware
- Supabase database schema: profiles, projects, campaigns, assets, audits, scheduled_posts, email_sequences, team_members (10 tables, full RLS)
- Auto-create profile trigger on user signup, auto-update timestamp trigger
- Dashboard home with stats grid, quick actions, getting started empty state
- Projects management: list, create wizard (3-step), overview dashboard
- Project sub-pages: audit, content studio, campaigns, calendar, analytics, settings
- SEO audit page with score gauge, severity filters, and fix previews
- Content studio with type selector, generation panel, X/LinkedIn previews
- AI Playground for quick skill-based generation
- Settings: profile, billing plans, integrations, team management
- Marketing site: landing page, pricing page, features page
- AI skills engine: seo-audit, page-cro, copywriting, social-content, email-sequence
- API routes: /api/ai/generate, /api/ai/audit, /api/ai/suggest
- n8n build-in-public content engine workflow (X + LinkedIn dual posting, 24 nodes)
- Anthropic Claude API integration (claude-sonnet-4-6)
- Vercel deployment
