# Changelog

## [0.6.0] - 2026-11-17

Closes out the October 2026 roadmap for everything that needs no outside approval: the email items, the buildable half of the Local pack, the inbound leads pipeline, Missing Pages polish, and platform hardening. Agents now run on Claude Opus 5.5 and Haiku 5.5.

### Added
- Custom sending domain (Pro and above): add a domain, see the DNS records, check again until verified; broadcasts, email series and confirmations then send from it
- Double opt-in per list with a branded confirm page; pending contacts are never enrolled or emailed until they confirm
- Suppression actions: suppress or unsuppress a contact, filter by status, paste a suppression list
- White-label unsubscribe and confirm pages for Agency-tier owners
- Business details on the project (phone, address, city, booking link, review link) and a name-address-phone consistency check against the website
- Leads pipeline: five stages, a rule-based lead score, a "send booking link" message
- Review requests by email (WhatsApp when connected), five a month on Free, unlimited from the Local tier; CSV paste up to 50 customers
- "Get mentioned" tasks per business type on the analytics page, with an automatic "mentioned?" check through the answer engines
- A Claude web-search answer engine for the Found-by-AI monitor, so it runs without a Perplexity key
- Naira Local tier through plans, billing and both payment webhooks (`FLUTTERWAVE_PLAN_LOCAL`, `PAYSTACK_PLAN_LOCAL`)
- Instagram and Meta Ads entry points, hidden until Meta verification (`NEXT_PUBLIC_ENABLE_FACEBOOK_INTEGRATION`)
- Missing Pages: a revision waits for approval when a live page is re-written; Google Maps embed and llms.txt on hosted sites; a title and H1 rewrite tool with WordPress apply; an answerability dimension in the content scorer; a paste-ready schema snippet in Site Audit
- Rate limits backed by Postgres (`rate_limits` table and `rate_limit_hit` function) on every model and send route
- Error and loading boundaries (`global-error.tsx`, project `loading.tsx`); money-path tests for Flutterwave, Paystack, billing and admin routes; a typed database baseline (`src/types/database.ts`) and schema snapshot (`docs/db/`)
- Audit section 5.10: the dograh voice-marketing verdict (build later; missed-call text-back on WhatsApp is the wedge)

### Changed
- Agents run on `claude-opus-5-5` (generate, analyse) and `claude-haiku-5-5` (previews, scoring) with effort routed per purpose; `AI_MODEL_*` and `AI_EFFORT_*` overrides are validated against the known ids
- One request builder for every model call: no sampling parameters, no thinking field, explicit effort, a 2,048 max_tokens floor, text read by block type, `refusal` surfaced as a 422 with an honest message, truncation continued as a user turn
- Content Security Policy is enforced (was report-only), with the Google Analytics collect host and the Maps embed frame allowed
- Video credits are charged through the quota function instead of a direct profile write
- Migrations applied to production on 2026-11-17: `business_details_leads`, `content_scores_answerability`, `email_completeness`, `missing_pages_revisions`, `reviews_corroboration`, `seo_titles_asset_type`; `profiles_protect_columns` and `rate_limits` are for the owner to apply

### Removed
- The non-clickable "Cinematic ad" tile and its dead API branch; "Annual plans coming soon" on pricing; the email-domain waitlist stub and its "Notify me" promise

---

## [0.5.0] - 2026-11-06

Executes the October 2026 audit roadmap: one engine, four playbooks (SaaS, local, agency, creator), three modes, and a Missing Pages loop that gets businesses found by Google and AI answers without a website or a marketer.

### Added
- Audit and roadmap of record at `docs/audits/2026-10-24-full-audit-and-roadmap.md` (+ PDF) with the decision record (D1-D6), AEO/GEO plan and execution feedback; execution plan at `docs/audits/2026-10-26-execution-plan.md`; `docs/POSITIONING.md` rewritten around the four playbooks
- Playbooks and Modes (`check_all`, `social_runs`, `hands_off`) on projects, with a Modes settings page and a five-step questionnaire onboarding (business type, location, services, website optional)
- Missing Pages loop: crawl -> intents -> gaps -> volume -> score -> write -> answer-readiness review -> draft or publish; nightly Inngest run and manual "Find missing pages"
- Hosted pages at `/p/{site}/{slug}` and `*.conduikt.site`, with site index, sitemap, JSON-LD and FAQ; WordPress REST publishing
- "Ready for Google and AI answers": answer-first prompt rules, schema generator, answer-readiness rubric rows in the SEO audit, AI visibility checks and `ai_visibility` tables
- Ad insights sync (`ad_insights`) and Instagram/WhatsApp channels with WhatsApp sequence steps
- Honest 503s when the AI provider is unavailable (`AIUnavailableError`), sample previews (`AI_PREVIEW_MODE`), model routing (Haiku for previews and scoring) and a daily spend cap
- Missing-page agent in the registry, performance context for ads and visibility, analytics cards
- Migrations: `ad_insights`, `ai_visibility`, `hosted_pages`, `missing_pages`, `instagram_whatsapp_channels`, `playbooks_and_modes`, `cron_jobs_header_auth` (all applied to production 2026-11-05, together with the previously unapplied `content_revisions`)

### Fixed
- Missing Pages generations now count against the plan: limit check before writing, `increment_generation_count` after, 429 `generation_limit` when exhausted
- Projects created without a website now start a Missing Pages run and land on it; the first-week page explains the path instead of queueing nothing
- Support chat bubble no longer covers the onboarding wizard's Next button
- Cron auth migration is a guarded no-op until `app.cron_secret` is set, so re-running it cannot blank the Authorization header on live jobs; `?secret=` query auth removed (401)
- Hosted page CTA links are allow-listed (`http(s)`, `mailto`, `tel`, site-relative); `javascript:`/`data:` output from the model falls back to `#contact`
- A Missing Pages candidate is released from `writing` to `failed` if saving its asset or page throws, instead of blocking re-writes with 409 forever
- Writing a page refuses an address already owned by another project rather than re-parenting it through the service-role upsert
- FAQ JSON-LD moved from the root layout to the homepage; brand settings Palette import; Tawk widget ref-during-render lint error

### Changed
- Agent registry gains a `growth` tier and project-scoped paths; scheduler handlers register the WhatsApp step
- `src/lib/plans` is the single source for generation limits across agents and Missing Pages

---

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
