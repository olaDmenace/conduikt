# Execution plan for the 24 Oct audit roadmap

**Date:** 26 October 2026. **Decisions D1 to D6 (audit §4.2): confirmed by the owner on 26 Oct.**
**Goal line (D6):** A business owner needs no other marketing tool and no marketer to get found, publish, and improve every week.
**Test for every change:** does it remove a tool the customer would otherwise need, or an objection that stops them? If neither, it waits.

## What this session builds, and what it cannot

| Phase | Built here | Gate that only the owner can clear |
| --- | --- | --- |
| 0 Stop the bleeding | Nav/orphans, preview mode and honest errors, cost cap, cron header, Google token encryption, repo hygiene, AI crawlers + FAQ schema on conduikt.com | Sentry DSN; Supabase CLI login for the baseline schema dump and typed client; CSP flip date |
| 1 Decide and ask | Playbooks (business type) in data model, registry, first-week pack and wizard; Modes as a per-project setting; positioning rewrite; "API access" removed from pricing | Naira price IDs on Flutterwave (D3) |
| 2 Missing Pages | Site crawler, intent gap finder, scoring, page builder, answer-readiness editor, hosted pages (path route now, wildcard host when DNS exists), WordPress publish, nightly job on Inngest, drafts/approvals, UI | Keyword-volume API key (DataForSEO); Vercel wildcard domain + nameservers for `*.conduikt.site` |
| 3 Meta unlock | Instagram publish path (behind the existing Facebook flag), Meta Ads read-only insights sync + analytics card, WhatsApp Cloud API provider + sequence channel, Found-by-AI monitor scaffold | Meta business verification; WhatsApp Business account; Perplexity/engine API keys |
| 4 Local pack | Not in this session beyond what Missing Pages and the schema generator cover | Google Business Profile API approval |

## Workstreams and file ownership (no two workstreams edit the same file in the same wave)

### Wave 1 (parallel)
- **WS-A Navigation and orphans.** `src/components/layout/sidebar.tsx`, `src/app/(dashboard)/projects/[id]/page.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/projects/[id]/first-week/**`, `src/app/(dashboard)/projects/[id]/audiences/page.tsx`, `src/app/(dashboard)/settings/**`, `src/components/settings/**`, `src/app/(dashboard)/share/page.tsx`, `src/lib/supabase/middleware.ts`, `src/app/layout.tsx`, `src/components/marketing/tawk-chat.tsx`, `src/components/onboarding/onboarding-tour.tsx`, `src/lib/ai/agents/registry.ts` (competitors path + stale comment only).
- **WS-B AI availability, preview mode, cost control.** `src/lib/ai/client.ts`, `src/lib/ai/model-routing.ts` (new), `src/lib/ai/samples/**` (new), `src/lib/first-week/{previews,run,status}.ts`, `src/app/api/onboarding/**`, `src/app/api/public/site-check/**`, `src/app/api/ai/**`, `src/lib/onboarding/magic-audit.ts`, `src/components/first-week/**`, `src/app/(dashboard)/onboarding/**`, `src/app/(marketing)/check/**`, `src/lib/ai/agents/content-scorer.ts`, `src/lib/loop-closure/**`.
- **WS-C Security quick wins and repo hygiene.** `src/app/api/cron/**`, new pg_cron migration, `src/app/api/integrations/{ga4,gsc,youtube}/**`, `src/lib/integrations/{ga4,gsc,youtube}.ts`, `src/app/api/csp-report/**`, `src/app/robots.ts`, `src/lib/seo/homepage-schema.ts`, `.env.example`, `.gitignore`, `package.json` (unused deps), dead files listed in the audit §3, root documents (move/delete), `pitch-deck/` tracking.

### Wave 2 (parallel)
- **WS-D Playbooks, onboarding, Modes, positioning.** New migration (`projects.business_type`, `projects.automation_mode`, `projects.wants_hosted_page`), `src/lib/playbooks.ts` (new), `src/lib/ai/agents/registry.ts` (playbooks field), `src/lib/first-week/plan.ts`, `src/app/(dashboard)/projects/new/**`, `src/app/(dashboard)/projects/[id]/onboarding/**`, `src/app/(dashboard)/projects/[id]/settings/**`, `src/app/api/projects/**` (business_type, automation_mode), `src/app/(marketing)/page.tsx` pricing band, `docs/POSITIONING.md`.
- **WS-E Missing Pages, hosted pages, AEO.** `src/lib/crawl/**`, `src/lib/missing-pages/**`, `src/lib/hosted-pages/**`, `src/lib/seo/schema-generator.ts`, `src/lib/seo/answer-readiness.ts`, `src/lib/integrations/wordpress.ts`, `src/lib/integrations/keyword-volume.ts`, `src/app/p/**` (public hosted page route), `src/app/api/projects/[id]/missing-pages/**`, `src/app/api/projects/[id]/site-connection/**`, `src/app/(dashboard)/projects/[id]/missing-pages/**`, `src/lib/inngest/functions/missing-pages-nightly.ts`, `src/lib/ai/agents/{seo-audit,blog-post,copywriting,programmatic-seo}.ts` (prompt rules only), `src/app/api/ai/audit/route.ts` (answer-readiness checks), new migrations for `hosted_pages`, `site_connections`, `missing_page_candidates`.

### Wave 3 (parallel)
- **WS-F Meta and WhatsApp scaffolds.** `src/lib/integrations/{instagram,meta-ads,whatsapp}.ts`, `src/app/api/publish/instagram/**`, `src/app/api/integrations/meta-ads/**`, `src/lib/inngest/functions/{sync-ad-insights,found-by-ai}.ts`, `src/lib/scheduler/handlers/whatsapp-step.ts`, migrations for `ad_insights`, `ai_visibility_checks`, contact consent fields, `scheduled_posts` channel `instagram`.
- **Integration edits (lead session):** register the Missing Pages agent in the registry and sidebar, register Inngest functions, wire Modes into publish paths, wire playbooks into Missing Pages intents.

## Verification
1. `npx tsc --noEmit`, `npm run lint`, `npm run check:hex` (sequential, one at a time).
2. `npx vitest run` in two halves (the full suite crashes node workers on this machine when combined with anything else).
3. Browser walkthrough on localhost (webpack): sign in → new project with business type → first week (preview samples, honest errors) → overview is Home → Missing Pages page → hosted page renders at `/p/{site}/{slug}` → settings Modes → marketing kit, forms and competitors reachable → Tawk absent on auth pages.
4. Feedback report appended to the audit as §11 and the PDF regenerated.
