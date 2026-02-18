# Conduikt — AI Marketing Automation SaaS

## System Architecture & Build Plan

**Version:** 1.1
**Author:** Olayinka (Technicity Digital)
**Build Tool:** Claude Code
**Target Timeline:** 7 weeks (3 phases + parallel content engine)

---

## 1. PRODUCT VISION

Conduikt is an AI-powered marketing automation platform that turns the raw power of Claude's marketing intelligence into a usable product for founders, marketers, and agencies. Users connect their website, and the platform audits, generates, orchestrates, and publishes marketing assets across multiple channels — with persistent learning from results.

### Core Value Proposition

"Connect your site. Get a marketing team that never sleeps."

Unlike Corey Haines' open-source marketing skills (which require Claude Code terminal access), Conduikt wraps that intelligence into a visual platform anyone can use — with multi-channel publishing, campaign orchestration, analytics feedback loops, and team collaboration.

### Target Users

- **Solo founders** building SaaS products who can't afford a marketing agency
- **Growth marketers** at early-stage startups who want to 10x their output
- **Small agencies** managing multiple client accounts who want to automate execution

### Business Model

| Tier | Price | Features |
|------|-------|----------|
| Free | $0/mo | 1 project, basic audit + recommendations, 5 AI generations/month |
| Pro | $49/mo | 3 projects, multi-channel publishing, email sequences, 100 AI generations/month |
| Growth | $99/mo | 10 projects, analytics feedback loop, A/B test setup, unlimited generations |
| Agency | $249/mo | Unlimited projects, multi-client management, white-label reports, team seats, API access |

---

## 2. DESIGN SYSTEM — "Mineral"

### Design Philosophy

The design system is called **"Mineral"** — inspired by raw geological forms, crystalline structures, and earth materials. This is NOT another shadcn/Tailwind template. It should feel like a premium tool built by designers, not a generic dashboard clone.

### Core Aesthetic Direction

- **Theme:** Dark-mode primary with warm mineral accents. Think obsidian surfaces with copper/amber highlights
- **Mood:** Professional but with warmth. Industrial precision meets organic texture
- **Differentiator:** Layered depth through subtle gradients, grain textures, and glassmorphism done tastefully

### Color Palette

```css
:root {
  /* --- Base Surfaces (Dark Obsidian) --- */
  --surface-0: #0C0C0E;         /* Deepest background — app shell */
  --surface-1: #141418;         /* Card/panel backgrounds */
  --surface-2: #1C1C22;         /* Elevated elements, dropdowns */
  --surface-3: #24242C;         /* Hover states, active items */

  /* --- Text --- */
  --text-primary: #E8E4DE;      /* Warm off-white — NOT pure white */
  --text-secondary: #9B958C;    /* Muted warm gray */
  --text-tertiary: #5E5A54;     /* Disabled/hint text */

  /* --- Accent: Copper/Amber --- */
  --accent-primary: #D4945A;    /* Primary CTA, active states */
  --accent-hover: #E0A76B;      /* Hover on primary accent */
  --accent-muted: #D4945A1A;    /* 10% opacity — subtle backgrounds */
  --accent-glow: #D4945A33;     /* 20% opacity — focus rings, glows */

  /* --- Secondary Accent: Slate Blue --- */
  --accent-secondary: #6B8FAD;  /* Links, secondary actions */
  --accent-secondary-hover: #7FA3C1;

  /* --- Semantic --- */
  --success: #6B9E78;           /* Earthy green — not neon */
  --warning: #C9A84C;           /* Golden amber */
  --error: #B85C5C;             /* Muted red clay */
  --info: #6B8FAD;              /* Same as secondary accent */

  /* --- Borders & Dividers --- */
  --border-subtle: #FFFFFF08;   /* 3% white — barely visible structure */
  --border-default: #FFFFFF12;  /* 7% white — card borders */
  --border-strong: #FFFFFF20;   /* 12% white — input borders */

  /* --- Special Effects --- */
  --grain-opacity: 0.03;        /* Noise texture overlay */
  --glass-bg: #14141880;        /* Glassmorphism panels */
  --glass-border: #FFFFFF10;
  --glass-blur: 16px;
  --shadow-ambient: 0 0 0 1px var(--border-subtle), 0 2px 8px #00000040;
  --shadow-elevated: 0 0 0 1px var(--border-default), 0 8px 32px #00000060;
}
```

### Typography

Use Google Fonts. The pairing should feel editorial and premium:

```css
/* Display / Headlines — DM Serif Display */
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');

/* Body / UI — Outfit */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

/* Monospace / Code / Data — JetBrains Mono */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body: 'Outfit', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

/* Type Scale */
.text-hero    { font: 700 3.5rem/1.1 var(--font-display); letter-spacing: -0.02em; }
.text-h1      { font: 700 2.25rem/1.2 var(--font-display); letter-spacing: -0.01em; }
.text-h2      { font: 600 1.5rem/1.3 var(--font-body); }
.text-h3      { font: 600 1.125rem/1.4 var(--font-body); }
.text-body    { font: 400 0.9375rem/1.6 var(--font-body); }
.text-small   { font: 400 0.8125rem/1.5 var(--font-body); }
.text-caption  { font: 500 0.6875rem/1.4 var(--font-body); letter-spacing: 0.05em; text-transform: uppercase; }
.text-data    { font: 500 0.875rem/1.4 var(--font-mono); }
```

### Component Patterns

#### Cards
```
- Background: var(--surface-1)
- Border: 1px solid var(--border-default)
- Border-radius: 12px
- Shadow: var(--shadow-ambient)
- Padding: 24px
- On hover: border-color transitions to var(--border-strong), shadow becomes var(--shadow-elevated)
- Noise texture overlay at var(--grain-opacity)
```

#### Buttons
```
Primary:
  - Background: linear-gradient(135deg, var(--accent-primary), #C88550)
  - Text: var(--surface-0)
  - Border: none
  - Border-radius: 8px
  - Padding: 12px 24px
  - Font: 500 0.875rem var(--font-body)
  - Hover: brightness(1.1) + subtle scale(1.02)
  - Active: brightness(0.95) + scale(0.98)
  - Box-shadow: 0 0 20px var(--accent-glow)

Secondary:
  - Background: transparent
  - Border: 1px solid var(--border-strong)
  - Text: var(--text-primary)
  - Hover: background var(--surface-3)

Ghost:
  - Background: transparent
  - Border: none
  - Text: var(--text-secondary)
  - Hover: text var(--text-primary)
```

#### Inputs
```
- Background: var(--surface-0)
- Border: 1px solid var(--border-strong)
- Border-radius: 8px
- Padding: 12px 16px
- Text: var(--text-primary)
- Placeholder: var(--text-tertiary)
- Focus: border-color var(--accent-primary), box-shadow 0 0 0 3px var(--accent-glow)
- Font: var(--font-body)
```

#### Sidebar Navigation
```
- Background: var(--surface-0) with noise texture
- Width: 260px collapsible to 64px
- Nav items: 
  - Padding: 10px 16px, border-radius: 8px
  - Idle: transparent, text var(--text-secondary)
  - Hover: bg var(--surface-2), text var(--text-primary)
  - Active: bg var(--accent-muted), text var(--accent-primary), left border 2px solid var(--accent-primary)
- Section headers: var(--text-caption) style
```

#### Data Visualization
```
- Charts: Use Recharts with custom theme
- Primary line/bar color: var(--accent-primary)
- Secondary: var(--accent-secondary)  
- Grid lines: var(--border-subtle)
- Axis text: var(--text-tertiary) in var(--font-mono)
- Tooltips: var(--surface-2) with var(--shadow-elevated)
```

### Animations & Micro-Interactions

```css
/* Page transitions — staggered fade-up */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-in { animation: fadeUp 0.4s ease-out forwards; }
.animate-in:nth-child(1) { animation-delay: 0ms; }
.animate-in:nth-child(2) { animation-delay: 60ms; }
.animate-in:nth-child(3) { animation-delay: 120ms; }
/* ... up to 10 children */

/* Skeleton loading — warm shimmer, not generic gray */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}

/* Grain texture overlay — apply to body or panels */
.grain::after {
  content: '';
  position: fixed;
  inset: 0;
  opacity: var(--grain-opacity);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
}

/* Button press — tactile feel */
.btn:active { transform: scale(0.97); transition: transform 0.1s; }

/* Focus ring — amber glow, not browser default */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--surface-0), 0 0 0 4px var(--accent-primary);
}
```

### Layout Principles

- **Sidebar + main content** pattern (NOT top-nav)
- **Max content width:** 1200px for main area
- **Grid:** 12-column CSS Grid for dashboard layouts
- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
- **Cards prefer vertical rhythm** — stack, don't cram horizontally
- **White space is sacred** — panels should breathe, especially between sections
- **Asymmetric hero sections** on marketing pages — text left, visual right, with overlap

### Light Mode (Optional — Phase 2)

```css
[data-theme="light"] {
  --surface-0: #F5F2ED;        /* Warm parchment */
  --surface-1: #FFFFFF;
  --surface-2: #F0EDE7;
  --surface-3: #E8E4DE;
  --text-primary: #1A1917;
  --text-secondary: #6B665E;
  --text-tertiary: #9B958C;
  --border-subtle: #0000000A;
  --border-default: #00000012;
  --border-strong: #00000020;
  /* Accents stay the same */
}
```

### Design Rules for Claude Code

1. **NEVER** use default Tailwind gray. Always use the warm custom palette above
2. **NEVER** use `rounded-lg` generically. Use `rounded-xl` (12px) for cards, `rounded-lg` (8px) for buttons/inputs
3. **NEVER** use pure white (#FFFFFF) text on dark backgrounds. Use --text-primary (#E8E4DE)
4. **NEVER** use stock shadcn components without restyling them to match this system
5. **ALWAYS** add the grain texture overlay to the main layout
6. **ALWAYS** use the type scale classes — don't ad-hoc font sizes
7. **ALWAYS** apply staggered fade-up animation to list/grid items on page load
8. **ALWAYS** use the copper accent for primary CTAs and active states
9. **PREFER** border/shadow depth over background color changes for hierarchy
10. **PREFER** the display font (DM Serif Display) for page titles and hero sections only — NOT for nav items or buttons

---

## 3. TECH STACK

### Frontend
```
Framework:      Next.js 15 (App Router)
Language:       TypeScript (strict mode)
Styling:        Tailwind CSS v4 + CSS custom properties (the Mineral design tokens above)
Components:     Custom component library built on Radix UI primitives (NOT shadcn defaults — restyle everything)
Charts:         Recharts
Animations:     Framer Motion
Forms:          React Hook Form + Zod validation
State:          Zustand (client) + React Query / TanStack Query (server)
Icons:          Lucide React
```

### Backend
```
Runtime:        Node.js (Next.js API routes for simple endpoints)
Database:       Supabase (PostgreSQL) — auth, storage, realtime
ORM:            Drizzle ORM
Queue:          Inngest (serverless job queue for async AI tasks)
AI:             Anthropic Claude API (claude-sonnet-4-5-20250929 for speed, claude-opus-4-6 for quality tasks)
Email:          Resend (transactional) + React Email (templates)
Payments:       Stripe (subscriptions)
Hosting:        Vercel
```

### External Integrations
```
X/Twitter:      Twitter API v2 (OAuth 2.0 PKCE)
LinkedIn:       LinkedIn Marketing API (OAuth 2.0)
Email Platforms: Mailchimp API, ConvertKit API, Resend API
Analytics:      Google Analytics 4 (Measurement Protocol)
SEO:            Google Search Console API
Deployment:     Vercel API (for deploying generated SEO pages)
```

### n8n (Build-in-Public Content Engine)
```
Host:           Self-hosted on GCP (existing infrastructure)
Triggers:       Cron schedule + GitHub webhook + manual
AI Provider:    Claude API (replacing Gemini from the Cross workflow)
Outputs:        X API v2, LinkedIn API
```

---

## 4. DATABASE SCHEMA

### Core Tables

```sql
-- Users & Auth (managed by Supabase Auth, extended here)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'growth', 'agency')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  generation_count INTEGER DEFAULT 0,
  generation_reset_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (each website/product being marketed)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  description TEXT,
  -- Product Marketing Context (from Corey's product-marketing-context skill)
  target_audience JSONB,           -- { "personas": [...], "pain_points": [...] }
  value_proposition TEXT,
  brand_voice JSONB,               -- { "tone": "...", "dos": [...], "donts": [...] }
  competitors JSONB,               -- [{ "name": "...", "url": "...", "strengths": [...] }]
  positioning_statement TEXT,
  keywords JSONB,                  -- [{ "term": "...", "volume": ..., "difficulty": ... }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns (orchestrated marketing efforts)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'seo_audit', 'page_cro', 'email_sequence', 'social_content',
    'programmatic_seo', 'launch', 'ab_test', 'full_funnel'
  )),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'failed')),
  config JSONB,                    -- Campaign-specific settings
  results JSONB,                   -- Performance data after execution
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Assets (individual pieces of content)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'landing_page', 'email', 'social_post', 'seo_page',
    'meta_tags', 'copy_block', 'cta', 'headline',
    'ad_copy', 'schema_markup', 'audit_report'
  )),
  channel TEXT CHECK (channel IN ('x', 'linkedin', 'email', 'web', 'google_ads', 'meta_ads')),
  title TEXT,
  content JSONB NOT NULL,          -- The actual generated content
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  external_id TEXT,                -- ID from the platform after publishing (tweet ID, etc.)
  performance JSONB,               -- { "impressions": ..., "clicks": ..., "conversions": ... }
  version INTEGER DEFAULT 1,
  parent_asset_id UUID REFERENCES assets(id),  -- For A/B test variants
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Generation Log (track every Claude call for debugging & learning)
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  skill_used TEXT NOT NULL,        -- Which marketing skill was invoked
  prompt_hash TEXT,                -- Hash of the prompt for deduplication
  input_tokens INTEGER,
  output_tokens INTEGER,
  model TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Results (from SEO audit, page CRO, etc.)
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('seo', 'cro', 'performance', 'accessibility', 'copy')),
  url TEXT NOT NULL,               -- The page that was audited
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  findings JSONB NOT NULL,         -- [{ "severity": "critical|warning|info", "title": "...", "detail": "...", "fix": "..." }]
  auto_fixes_applied JSONB,       -- What was automatically fixed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Posts (content calendar)
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('x', 'linkedin')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  posted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed', 'cancelled')),
  error_message TEXT,
  external_id TEXT,                -- Tweet ID or LinkedIn post ID after posting
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Sequences
CREATE TABLE email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('welcome', 'nurture', 'onboarding', 're_engagement', 'launch', 'custom')),
  trigger_event TEXT,              -- What starts the sequence
  exit_conditions JSONB,           -- When to pull someone out
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_hours INTEGER DEFAULT 24,  -- Hours after previous step (or trigger for step 1)
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);

-- Team & Agency Features
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (apply similar pattern to all tables)
CREATE POLICY "Users can access own projects" ON projects
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can access own campaigns" ON campaigns
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
```

### Indexes

```sql
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_campaigns_project ON campaigns(project_id);
CREATE INDEX idx_assets_project ON assets(project_id);
CREATE INDEX idx_assets_campaign ON assets(campaign_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_scheduled_posts_channel_status ON scheduled_posts(channel, status, scheduled_for);
CREATE INDEX idx_audits_project_type ON audits(project_id, type);
CREATE INDEX idx_ai_generations_project ON ai_generations(project_id);
```

---

## 5. APPLICATION ARCHITECTURE

### Directory Structure

```
conduikt/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth layout group
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # Authenticated layout group
│   │   │   ├── layout.tsx            # Sidebar + header layout
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx          # Project list
│   │   │   │   ├── new/page.tsx      # Create project (onboarding wizard)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Project overview dashboard
│   │   │   │       ├── audit/page.tsx
│   │   │   │       ├── content/page.tsx
│   │   │   │       ├── campaigns/page.tsx
│   │   │   │       ├── calendar/page.tsx
│   │   │   │       ├── analytics/page.tsx
│   │   │   │       └── settings/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx          # User settings
│   │   │   │   ├── billing/page.tsx
│   │   │   │   ├── integrations/page.tsx
│   │   │   │   └── team/page.tsx
│   │   │   └── playground/page.tsx   # Quick AI generation sandbox
│   │   ├── (marketing)/              # Public marketing site
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── pricing/page.tsx
│   │   │   ├── features/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   ├── generate/route.ts       # Core AI generation endpoint
│   │   │   │   ├── audit/route.ts          # SEO/CRO audit
│   │   │   │   └── suggest/route.ts        # Quick suggestions
│   │   │   ├── publish/
│   │   │   │   ├── x/route.ts              # Post to X
│   │   │   │   ├── linkedin/route.ts       # Post to LinkedIn
│   │   │   │   └── email/route.ts          # Send via Resend/Mailchimp
│   │   │   ├── webhooks/
│   │   │   │   ├── stripe/route.ts
│   │   │   │   └── inngest/route.ts
│   │   │   ├── projects/route.ts
│   │   │   ├── campaigns/route.ts
│   │   │   └── assets/route.ts
│   │   └── layout.tsx                # Root layout
│   │
│   ├── components/
│   │   ├── ui/                       # Base UI components (Radix + Mineral styling)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── page-header.tsx
│   │   │   └── grain-overlay.tsx     # The noise texture component
│   │   ├── dashboard/
│   │   │   ├── project-card.tsx
│   │   │   ├── stats-grid.tsx
│   │   │   ├── activity-feed.tsx
│   │   │   └── quick-actions.tsx
│   │   ├── audit/
│   │   │   ├── audit-runner.tsx      # Animated audit progress
│   │   │   ├── findings-list.tsx
│   │   │   ├── score-gauge.tsx
│   │   │   └── fix-preview.tsx
│   │   ├── content/
│   │   │   ├── asset-editor.tsx      # Rich content editor with AI assist
│   │   │   ├── generation-panel.tsx  # AI generation controls
│   │   │   ├── channel-preview.tsx   # Preview how content looks on X/LinkedIn/email
│   │   │   └── content-calendar.tsx
│   │   ├── campaign/
│   │   │   ├── campaign-builder.tsx  # Visual campaign flow builder
│   │   │   ├── step-card.tsx
│   │   │   └── campaign-status.tsx
│   │   └── charts/
│   │       ├── performance-chart.tsx
│   │       ├── funnel-chart.tsx
│   │       └── comparison-chart.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server client
│   │   │   ├── middleware.ts         # Auth middleware
│   │   │   └── types.ts             # Generated types from schema
│   │   ├── ai/
│   │   │   ├── client.ts            # Anthropic SDK wrapper
│   │   │   ├── skills/              # Marketing skill prompts (see Section 7)
│   │   │   │   ├── index.ts
│   │   │   │   ├── seo-audit.ts
│   │   │   │   ├── page-cro.ts
│   │   │   │   ├── copywriting.ts
│   │   │   │   ├── email-sequence.ts
│   │   │   │   ├── social-content.ts
│   │   │   │   ├── programmatic-seo.ts
│   │   │   │   ├── content-strategy.ts
│   │   │   │   ├── competitor-analysis.ts
│   │   │   │   ├── pricing-strategy.ts
│   │   │   │   ├── launch-strategy.ts
│   │   │   │   └── ab-test-setup.ts
│   │   │   ├── orchestrator.ts       # Chains skills together for campaigns
│   │   │   └── prompt-builder.ts     # Builds prompts with project context
│   │   ├── integrations/
│   │   │   ├── twitter.ts            # X API v2 client
│   │   │   ├── linkedin.ts           # LinkedIn API client
│   │   │   ├── mailchimp.ts
│   │   │   ├── convertkit.ts
│   │   │   └── google-search-console.ts
│   │   ├── stripe/
│   │   │   ├── client.ts
│   │   │   └── plans.ts
│   │   └── utils/
│   │       ├── cn.ts                 # Class name utility
│   │       ├── format.ts
│   │       └── validators.ts
│   │
│   ├── hooks/
│   │   ├── use-project.ts
│   │   ├── use-generation.ts         # AI generation with loading/streaming
│   │   ├── use-publish.ts
│   │   └── use-subscription.ts
│   │
│   ├── stores/
│   │   ├── ui-store.ts               # Sidebar state, theme, etc.
│   │   └── generation-store.ts       # Current AI generation state
│   │
│   └── styles/
│       ├── globals.css               # Mineral design tokens + base styles
│       ├── grain.css                 # Noise texture utility
│       └── animations.css            # Shared keyframes
│
├── supabase/
│   ├── migrations/                   # Database migrations
│   └── seed.sql                      # Development seed data
│
├── inngest/
│   ├── functions/
│   │   ├── run-audit.ts              # Async SEO/CRO audit
│   │   ├── generate-campaign.ts      # Multi-step campaign generation
│   │   ├── publish-scheduled.ts      # Publish scheduled posts
│   │   ├── fetch-analytics.ts        # Pull performance data
│   │   └── send-email-step.ts        # Send email sequence step
│   └── client.ts
│
├── public/
│   ├── fonts/                        # Self-hosted fonts (fallback)
│   └── og/                           # OG images
│
├── .env.local.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
└── next.config.ts
```

---

## 6. MARKETING SKILLS INTEGRATION

### How Corey's Skills Map to Our System

The open-source repo at `github.com/coreyhaines31/marketingskills` contains markdown skill files designed for Claude Code terminal usage. For Conduikt, we adapt these into **structured system prompts** that the Claude API calls with project-specific context injected.

### Installation for Claude Code (Development)

During development, install the skills directly so Claude Code uses them while building the product:

```bash
# Clone into project
git clone https://github.com/coreyhaines31/marketingskills.git .claude/marketingskills

# Or install specific skills needed during build
npx skills add coreyhaines31/marketingskills --skill copywriting page-cro launch-strategy content-strategy programmatic-seo seo-audit email-sequence social-content
```

### Skills Mapping to Platform Features

| Platform Feature | Primary Skill | Secondary Skills | User Action |
|---|---|---|---|
| Site Audit | `seo-audit` | `schema-markup`, `page-cro` | User enters URL → runs full audit |
| Landing Page Optimizer | `page-cro` | `copywriting`, `marketing-psychology` | User selects page → gets CRO recommendations |
| Copy Generator | `copywriting` | `copy-editing`, `marketing-psychology` | User describes need → gets conversion copy |
| Email Sequences | `email-sequence` | `copywriting`, `onboarding-cro` | User picks sequence type → gets full flow |
| Social Content | `social-content` | `content-strategy` | User sets schedule → gets week of posts |
| SEO Pages | `programmatic-seo` | `seo-audit`, `schema-markup` | User defines template → generates at scale |
| Competitor Analysis | `competitor-alternatives` | `content-strategy` | User lists competitors → gets vs. pages |
| Launch Plan | `launch-strategy` | `marketing-ideas`, `email-sequence`, `social-content` | User enters launch date → gets full plan |
| Pricing Page | `pricing-strategy` | `page-cro`, `copywriting` | User enters plans → gets optimized page |
| A/B Tests | `ab-test-setup` | `page-cro`, `copywriting` | User picks element → gets test variants |

### Skill Prompt Architecture

Each skill is wrapped as a TypeScript module that builds a Claude API system prompt:

```typescript
// lib/ai/skills/seo-audit.ts

import { SkillConfig, ProjectContext, SkillOutput } from './types';

export const seoAuditSkill: SkillConfig = {
  id: 'seo-audit',
  name: 'SEO Audit',
  description: 'Comprehensive technical and on-page SEO analysis',
  model: 'claude-sonnet-4-5-20250929',  // Fast model for audits
  maxTokens: 4000,

  buildSystemPrompt: (context: ProjectContext) => `
You are an expert SEO auditor analyzing a website for technical and on-page SEO issues.

## Project Context
- Website: ${context.websiteUrl}
- Industry: ${context.industry || 'Not specified'}
- Target audience: ${JSON.stringify(context.targetAudience)}
- Known competitors: ${JSON.stringify(context.competitors)}

## Your Task
Analyze the provided page HTML and return a structured audit with:
1. Overall SEO score (0-100)
2. Critical issues (must fix immediately)
3. Warnings (should fix soon)
4. Opportunities (nice to have)
5. For each finding: title, explanation, specific fix with code if applicable

## Output Format
Return valid JSON matching this schema:
{
  "score": number,
  "findings": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "meta" | "content" | "technical" | "performance" | "schema",
      "title": "string",
      "detail": "string",
      "fix": "string (include code snippets where relevant)",
      "impact": "high" | "medium" | "low"
    }
  ],
  "summary": "string (2-3 sentence executive summary)"
}

Focus on actionable, specific findings. Don't flag generic best practices — only issues actually present on this page.
  `,

  buildUserPrompt: (input: { html: string; url: string }) => `
Audit this page: ${input.url}

Page HTML:
\`\`\`html
${input.html.substring(0, 30000)}
\`\`\`
  `,

  parseResponse: (response: string): SkillOutput => {
    const parsed = JSON.parse(response);
    return {
      type: 'audit_report',
      data: parsed,
      usage: { inputTokens: 0, outputTokens: 0 }  // filled by orchestrator
    };
  }
};
```

### Campaign Orchestrator

The orchestrator chains multiple skills together for complex campaigns:

```typescript
// lib/ai/orchestrator.ts

export async function runFullFunnelCampaign(project: Project, config: CampaignConfig) {
  const steps = [
    // Step 1: Audit current state
    { skill: 'seo-audit', input: { url: project.websiteUrl } },
    { skill: 'page-cro', input: { url: project.websiteUrl } },

    // Step 2: Generate strategy (uses audit results as context)
    { skill: 'content-strategy', input: { auditResults: '$step1', croResults: '$step2' } },

    // Step 3: Generate assets based on strategy
    { skill: 'copywriting', input: { strategy: '$step3', pages: config.targetPages } },
    { skill: 'email-sequence', input: { strategy: '$step3', sequenceType: config.emailType } },
    { skill: 'social-content', input: { strategy: '$step3', channels: config.channels, weeks: 4 } },

    // Step 4: Generate SEO pages if applicable
    ...(config.includeSeo ? [
      { skill: 'programmatic-seo', input: { strategy: '$step3', template: config.seoTemplate } }
    ] : []),
  ];

  // Execute steps via Inngest for reliability
  return await inngest.send({
    name: 'campaign/run',
    data: { projectId: project.id, steps, config }
  });
}
```

---

## 7. KEY USER FLOWS

### Flow 1: New Project Onboarding (Critical Path)

```
1. User signs up → lands on empty dashboard
2. Clicks "New Project" → wizard opens:
   a. Enter website URL
   b. System fetches site, extracts meta info, detects tech stack
   c. AI generates initial product-marketing-context (target audience, value prop, brand voice)
   d. User reviews and edits the generated context
   e. System runs initial SEO audit + page CRO in background
3. Project dashboard opens with:
   - Audit results with score gauge (animated)
   - Top 5 critical findings with one-click fix previews
   - Suggested first actions: "Improve your homepage copy", "Set up email welcome sequence", "Schedule first week of social posts"
```

### Flow 2: Content Generation & Publishing

```
1. User navigates to Project → Content
2. Selects content type (social post, email, landing page copy, etc.)
3. Fills minimal inputs:
   - For social: topic/angle, channel (X/LinkedIn), tone
   - For email: sequence type, trigger event, number of emails
   - For copy: target page, goal (signups, demo requests, etc.)
4. AI generates content with streaming display
5. User sees channel-specific preview (how it'll look on X, LinkedIn, in inbox)
6. User can:
   - Edit inline
   - Regenerate with feedback ("make it shorter", "more urgent tone")
   - Approve → schedule or publish immediately
7. Published content tracked in calendar view with performance metrics
```

### Flow 3: Campaign Builder

```
1. User navigates to Project → Campaigns → New Campaign
2. Selects campaign type:
   - Product Launch
   - Awareness / Brand Building
   - Lead Generation
   - Re-engagement
   - Custom
3. Visual builder shows campaign flow as connected cards:
   [Audit] → [Strategy] → [Content Gen] → [Schedule] → [Publish] → [Measure]
4. Each card expandable to configure:
   - Which channels to include
   - Content mix (% social, email, SEO)
   - Timeline
5. User hits "Run Campaign" → Inngest processes steps asynchronously
6. Dashboard shows real-time progress as each step completes
```

---

## 8. n8n BUILD-IN-PUBLIC CONTENT ENGINE

This is the adapted version of the Cross workflow, designed to market Conduikt during development.

### Workflow Overview

```
Triggers (3 inputs):
├── Schedule: 10:00, 14:00, 18:00 WAT daily
├── GitHub Push: conduikt repo → master branch
└── Manual: For testing

Pipeline:
├── Configuration (API keys, dry_run flag)
├── Fetch Context
│   ├── WORKPLAN.md from GitHub
│   ├── CHANGELOG.md from GitHub
│   ├── Recent commits (last 10)
│   └── Screenshots index
├── Load Memory (static data — posted history)
├── Prepare Inputs (decode base64, merge all context)
├── Construct Prompt (category rotation + full context)
├── Claude API (NOT Gemini — using Claude for brand consistency)
├── Parse Response
├── Check Duplicate + Banned Topics
├── Has Post? → Yes/No
│   ├── Yes → Select Image → Is Dry Run?
│   │   ├── Dry Run → Log → Save State
│   │   └── Live → Has Image?
│   │       ├── With Image → Upload Media → Sign → Post Media Tweet → [also post to LinkedIn] → Save State
│   │       └── Text Only → Sign → Post Tweet → [also post to LinkedIn] → Save State
│   └── No → Log Skip
```

### Key Changes from Cross Workflow

1. **AI Provider: Claude API instead of Gemini**
   ```json
   {
     "method": "POST",
     "url": "https://api.anthropic.com/v1/messages",
     "headers": {
       "x-api-key": "{{ $node['Configuration'].json['claude_api_key'] }}",
       "anthropic-version": "2023-06-01",
       "content-type": "application/json"
     },
     "body": {
       "model": "claude-sonnet-4-5-20250929",
       "max_tokens": 1024,
       "messages": [{ "role": "user", "content": "{{ $json.prompt }}" }]
     }
   }
   ```

2. **Dual-Platform Output: X + LinkedIn**
   After generating a post, add a LinkedIn variant node:
   ```
   Post Tweet → LinkedIn Adapter → Post to LinkedIn
   ```
   The LinkedIn Adapter transforms the X post:
   - Expands from 280 chars to 500-700 chars
   - Adds paragraph breaks
   - More professional/insight-driven tone
   - Adds relevant context about the build

3. **Category Rotation (Updated for SaaS marketing build)**
   ```
   Categories:
   1. market_insight    — Share a finding about the marketing automation space
   2. build_log         — What you shipped today with Claude Code (reference commits)
   3. before_after      — Show a website before/after the tool optimizes it
   4. founder_lesson    — Honest takes on building as a solo founder in Lagos
   5. product_tease     — Preview a specific feature with enough detail to intrigue
   6. technical_deep    — Architecture decisions, why Claude over GPT, Supabase patterns
   ```

4. **Context Sources (Updated)**
   Instead of fetching WORKPLAN.md from `olaDmenace/cross`, fetch from the Conduikt repo:
   - `WORKPLAN.md` — Current development status
   - `CHANGELOG.md` — What shipped recently
   - `DESIGN_SYSTEM.md` — For before/after visual posts
   - Recent commits from `conduikt` repo

5. **Screenshot Pipeline**
   Store screenshots in `screenshots/` folder in the repo, organized by category:
   ```
   screenshots/
   ├── dashboard/        # Dashboard UI screenshots
   ├── audit/            # Audit results screenshots
   ├── before-after/     # Website optimization comparisons
   ├── generation/       # AI content generation in action
   └── index.json        # Category → filename mapping
   ```

### Prompt Template for Build-in-Public Posts

```
SYSTEM INSTRUCTION:
You are the content voice for Conduikt — an AI marketing automation SaaS being built by a solo developer in Lagos, Nigeria using Claude Code.

Your audience: Technical founders, indie hackers, growth marketers on X and LinkedIn.

POST CATEGORY: {{ nextCategory }}

{{ categoryDescription }}

TONE:
- Authentic builder voice — show the real work, not just highlights
- Technical enough to impress developers, clear enough for marketers
- Confident but not arrogant — you're building something real, not just hyping
- Nigerian founder perspective is a strength — lean into it naturally when relevant
- NO hashtags, NO "follow for more", NO generic motivation

RECENT COMMITS:
{{ recentCommits }}

CURRENT WORKPLAN STATUS:
{{ workplan }}

PREVIOUSLY POSTED (DO NOT REPEAT):
{{ postedList }}

Generate 1 post for X (max 280 chars) and 1 adapted version for LinkedIn (400-700 chars).

Output JSON:
{
  "x_post": { "text": "...", "image_category": null | "category_name" },
  "linkedin_post": { "text": "...", "image_category": null | "category_name" },
  "category": "{{ nextCategory }}",
  "skip_reason": null
}
```

---

## 9. BUILD PHASES & TIMELINE

### Parallel Track — n8n Build-in-Public Engine (Starts Day 1)

This runs alongside ALL phases. The content engine is your distribution channel and should be live before the product ships. You already have a working n8n workflow from Cross — this is adaptation, not greenfield.

**Day 1-2 (During Week 1 setup):**
- [ ] Fork the Cross n8n workflow JSON
- [ ] Create Conduikt GitHub repo with WORKPLAN.md, CHANGELOG.md, CONTENT_STRATEGY.md
- [ ] Swap Gemini Planner node → Claude API HTTP Request node (see Section 8 for config)
- [ ] Update all Fetch nodes to point at Conduikt repo instead of `olaDmenace/cross`
- [ ] Update Configuration node: add `claude_api_key`, `linkedin_access_token`, remove Gemini key
- [ ] Update Construct Prompt with new category rotation (market_insight, build_log, before_after, founder_lesson, product_tease, technical_deep)
- [ ] Update banned topics list for Conduikt context (remove Cross-specific bans)
- [ ] Set dry_run to `true`, run 5+ test generations, review quality

**Day 3:**
- [ ] Add LinkedIn Adapter node (transforms X post into longer LinkedIn format)
- [ ] Add Post to LinkedIn node parallel to Post Tweet
- [ ] Set up screenshots/ folder in repo with initial categories (dashboard/, audit/, before-after/, generation/)
- [ ] Flip dry_run to `false` — content engine is now live
- [ ] First automated build-in-public posts go out on X and LinkedIn

**Ongoing (Weeks 1-7):**
- [ ] Add screenshots to repo as UI is built (feeds into feature_showcase and before_after posts)
- [ ] Update WORKPLAN.md and CHANGELOG.md as features ship (feeds into build_log posts)
- [ ] Monitor engagement, tune prompt based on what performs
- [ ] Week 4+: Add engagement tracking feedback loop node (fetch X/LinkedIn metrics for past posts, inject into prompt context)

### Phase 1 — MVP Core (Weeks 1-3)

**Week 1: Foundation**
- [ ] Initialize Next.js 15 project with TypeScript
- [ ] Set up Supabase project (auth, database, RLS)
- [ ] Run migrations for core schema (profiles, projects, campaigns, assets, audits)
- [ ] Implement Mineral design system (CSS tokens, base components)
- [ ] Build layout shell (sidebar, header, grain overlay)
- [ ] Auth flow (signup, login, protected routes)
- [ ] Install Corey's marketing skills into Claude Code dev environment

**Week 2: Core AI Pipeline**
- [ ] Build AI client wrapper (Anthropic SDK)
- [ ] Implement first 3 skills as API routes: `seo-audit`, `page-cro`, `copywriting`
- [ ] Build project onboarding wizard (URL → fetch → audit → results)
- [ ] Build audit results dashboard with score gauge and findings list
- [ ] Build content generation page with streaming AI responses
- [ ] Implement generation tracking (ai_generations table)

**Week 3: Content & Publishing**
- [ ] Build asset editor with channel-specific previews
- [ ] Implement X OAuth 2.0 PKCE flow + publishing
- [ ] Implement LinkedIn OAuth 2.0 flow + publishing
- [ ] Build content calendar view
- [ ] Build scheduled posts system (Inngest cron job)
- [ ] Stripe integration for billing (4 tiers)
- [ ] Deploy MVP to Vercel

### Phase 2 — Differentiation (Weeks 4-5)

**Week 4: Campaign Engine**
- [ ] Implement remaining skills: `email-sequence`, `social-content`, `programmatic-seo`, `content-strategy`, `competitor-alternatives`
- [ ] Build campaign orchestrator (multi-skill chaining)
- [ ] Campaign builder UI (visual flow)
- [ ] Email sequence builder + Resend integration
- [ ] A/B test setup flow

**Week 5: Analytics & Feedback Loop**
- [ ] X API engagement metrics fetching (impressions, likes, clicks)
- [ ] LinkedIn analytics integration
- [ ] Performance dashboard per project
- [ ] Feed analytics data back into AI context for smarter generations
- [ ] SEO page deployment pipeline (generate → deploy to user's site)

### Phase 3 — Launch & Scale (Weeks 6-7)

**Week 6: Agency Features & Polish**
- [ ] Team member invites and role-based access
- [ ] Multi-client project switching
- [ ] White-label audit reports (PDF export)
- [ ] Light mode theme
- [ ] Onboarding tour for new users

**Week 7: Launch**
- [ ] Landing page (using our own copywriting skill — dogfooding the product)
- [ ] Launch prep: Product Hunt listing, X/LinkedIn announcement campaign
- [ ] Generate launch email sequence using the platform's own email-sequence skill
- [ ] Programmatic SEO pages: "Conduikt vs [competitor]", "How to automate [marketing task]"
- [ ] Press/outreach to founders who engaged with Corey's skills post (warm leads)

---

## 10. ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# X/Twitter
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Resend (Email)
RESEND_API_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# App
NEXT_PUBLIC_APP_URL=https://conduikt.io
```

---

## 11. SUCCESS METRICS

### Week 1 (Content Engine Live)
- n8n build-in-public workflow posting 2-3x/day to X + LinkedIn
- Conduikt repo initialized with WORKPLAN.md, CHANGELOG.md, CONTENT_STRATEGY.md
- Foundation scaffolded: Next.js + Supabase + Mineral design system

### Week 3 (MVP Launch)
- Platform functional end-to-end: signup → create project → audit → generate content → publish to X
- At least 1 real user (yourself) using it daily
- Build-in-public posts generating engagement (>50 likes/day)

### Week 5 (Beta)
- 20 beta users signed up
- 3 different campaign types working (audit, social content, email sequence)
- Analytics feedback loop live (performance data feeding back into AI generations)

### Week 7 (Launch)
- 100 users signed up
- 10 paying customers
- Product Hunt launch prepared
- Full campaign orchestrator working

---

## 12. RISK MITIGATION

| Risk | Mitigation |
|------|------------|
| Claude API costs scaling | Implement strict generation limits per tier. Cache common audit patterns. Use Sonnet for speed tasks, Opus only for quality-critical generations |
| X/LinkedIn API rate limits | Queue posts through Inngest, respect rate limits, implement exponential backoff |
| Corey ships a similar SaaS | Our moat is the platform layer (UI, orchestration, analytics, multi-channel). His skills are the engine, we're the car. Even if he builds a UI, we'll have user data and feedback loops |
| Scope creep | This document IS the scope. If it's not in the phases above, it waits |
| Design implementation drift | The Mineral design system tokens are defined as CSS variables. Claude Code should reference this document's Section 2 for every UI component |

---

## APPENDIX A: n8n WORKFLOW JSON (DAY 1 PRIORITY)

**This is the first thing to set up — before any product code is written.** The build-in-public n8n workflow should be adapted from the existing Cross workflow (provided separately) with the modifications outlined in Section 8. This must be live by Day 3 of Week 1.

Key node changes:

1. **Gemini Planner node** → Replace with Claude API HTTP Request node
2. **Add LinkedIn Adapter node** after Parse Response
3. **Add Post to LinkedIn node** parallel to Post Tweet
4. **Update Configuration node** with Claude API key, LinkedIn credentials
5. **Update Fetch nodes** to point to Conduikt repo instead of Cross repo
6. **Update Construct Prompt** with new category rotation and Conduikt-specific context

The existing Cross workflow JSON should be used as the starting template and modified according to these specifications.

---

## APPENDIX B: MARKETING SKILLS REFERENCE

Skills to install from `github.com/coreyhaines31/marketingskills`:

**Priority 1 (Install for MVP):**
- `seo-audit` — Technical and on-page SEO analysis
- `page-cro` — Landing page conversion optimization
- `copywriting` — Conversion-focused marketing copy
- `copy-editing` — Polish and tighten existing copy
- `social-content` — Social media content creation

**Priority 2 (Install for Phase 2):**
- `email-sequence` — Automated email flows
- `content-strategy` — Content planning
- `programmatic-seo` — Scaled SEO page generation
- `competitor-alternatives` — Comparison pages
- `schema-markup` — Structured data for search
- `analytics-tracking` — Event tracking setup
- `ab-test-setup` — Experiment design

**Priority 3 (Install for Phase 3):**
- `marketing-psychology` — Behavioral psychology for marketing
- `pricing-strategy` — Pricing and packaging
- `launch-strategy` — Product launch planning
- `referral-program` — Referral systems
- `marketing-ideas` — Brainstorming tactics
- `onboarding-cro` — Post-signup optimization
- `form-cro` — Form optimization
- `popup-cro` — Popup optimization
- `paywall-upgrade-cro` — Upgrade flow optimization
- `free-tool-strategy` — Marketing tools and calculators
- `paid-ads` — Paid advertising management
- `signup-flow-cro` — Signup funnel optimization
- `product-marketing-context` — Positioning and audience definition

Each skill's markdown content should be studied, then adapted into a TypeScript module following the pattern shown in Section 6 (Skill Prompt Architecture).

---

*This document is the single source of truth for the Conduikt build. Claude Code should reference it for every architectural decision, design implementation, and feature prioritization.*
