# Changelog

## [0.1.0] - 2026-02-15

### Added
- Initial project scaffolding with Next.js 15, TypeScript, Tailwind CSS v4
- Mineral design system — obsidian surfaces with copper/amber highlights
- Custom UI component library: Button, Input, Card, Badge, Dialog, Tabs, Skeleton
- Dashboard layout with collapsible sidebar, header with search, grain texture overlay
- Authentication flow: login, signup, Supabase auth middleware
- Supabase database schema: profiles, projects, campaigns, assets, audits, scheduled_posts, email_sequences, team_members
- Row-level security policies on all tables
- Auto-create profile trigger on user signup
- Dashboard home with stats grid, quick actions, getting started empty state
- Projects management: list, create wizard (3-step), overview dashboard
- Project sub-pages: audit, content studio, campaigns, calendar, analytics, settings
- SEO audit page with score gauge, severity filters, and fix previews
- Content studio with type selector, generation panel, and X/LinkedIn previews
- Campaign builder with type selection (launch, social, email, SEO)
- Content calendar with monthly grid view
- AI Playground for quick skill-based generation
- Settings: profile, billing plans, integrations, team management
- Marketing site: landing page, pricing page, features page
- AI skills engine: seo-audit, page-cro, copywriting, social-content, email-sequence
- API routes: /api/ai/generate, /api/ai/audit, /api/ai/suggest
- n8n build-in-public content engine workflow (X + LinkedIn dual posting)
- Claude API integration (claude-sonnet-4-5 for speed, claude-opus-4-6 for quality)
