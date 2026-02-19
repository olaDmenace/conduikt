# Conduikt — AI Marketing Automation SaaS

## System Architecture & Build Plan

**Version:** 2.0
**Author:** Olayinka (Technicity Digital)
**Build Tool:** Claude Code
**Target Timeline:** 7 weeks (3 phases + parallel content engine)
**Last Updated:** February 19, 2026

---

## 1. PRODUCT VISION

Conduikt is an AI-powered marketing automation platform that turns the raw power of Claude's marketing intelligence into a usable product for founders, marketers, and agencies. Users connect their website, and the platform audits, generates, orchestrates, and publishes marketing assets across multiple channels — with persistent learning from results.

### Core Value Proposition

"Connect your site. Get a marketing team that never sleeps."

Unlike Corey Haines' open-source marketing skills (which require Claude Code terminal access), Conduikt wraps that intelligence into a visual platform anyone can use — with multi-channel publishing, campaign orchestration, analytics feedback loops, and team collaboration.

### What Makes Conduikt Different from ChatGPT / Claude.ai / Jasper

ChatGPT and Claude.ai are blank canvases. The user has to supply all context, remember what they asked before, and manually stitch outputs together. Conduikt's moat is the **persistent context layer** + **connected data pipelines** + **measurable outcomes**. Specifically:

| Capability | ChatGPT / Claude.ai | Conduikt |
|---|---|---|
| Brand context | User re-explains every session | Set once → injected into every generation |
| SEO intelligence | User must audit manually, paste data | Audit → score → track improvement over time |
| Keyword research | User asks for ideas, gets generic list | Connected to GSC data + autocomplete → real opportunity scoring |
| Blog posts | Generic output, no SEO structure | SEO-optimized with meta tags, schema, internal link suggestions, featured image |
| Content performance | Zero visibility | Track audit score trends, generation velocity, skill usage, engagement data |
| Multi-channel output | Copy-paste between tabs | Preview as X post, LinkedIn post, email, blog — all from one generation |
| Publishing | Manual copy-paste | Generate → schedule → publish → measure loop |
| Learning | No memory across sessions | Analytics feedback loop — past performance data informs future generations |
| Keyword-to-content pipeline | Doesn't exist | Discover keywords → generate optimized content → track rankings |
| Business growth insights | Generic advice | Data-driven growth playbook based on YOUR audit, content, and keyword data |
| Images for content | Separate tool entirely | Integrated Unsplash stock photos + optional AI image generation |

**The core insight:** ChatGPT is a general-purpose brain. Conduikt is a specialized marketing department that knows your business, tracks what works, and gets smarter over time.

### Target Users

- **Solo founders** building SaaS products who can't afford a marketing agency
- **Growth marketers** at early-stage startups who want to 10x their output
- **Small agencies** managing multiple client accounts who want to automate execution

### Business Model

| Tier | Price | Features |
|------|-------|----------|
| Free | $0/mo | 1 project, basic audit + recommendations, 5 AI generations/month, keyword suggestions (Google Autocomplete) |
| Pro | $49/mo | 3 projects, multi-channel publishing, email sequences, 100 AI generations/month, blog post generation, Unsplash image integration, audit score tracking |
| Growth | $99/mo | 10 projects, analytics feedback loop, A/B test setup, unlimited generations, Google Search Console integration, keyword opportunity reports, growth playbook |
| Agency | $249/mo | Unlimited projects, multi-client management, white-label reports, team seats, API access, priority AI model (Opus for quality-critical tasks), custom keyword tracking |

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
  background-image: url("data:image/svg+xml,...");
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

### Light Mode (Optional — Phase 3)

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
Markdown:       react-markdown + remark-gfm (for blog post preview rendering)
```

### Backend
```
Runtime:        Node.js (Next.js API routes for simple endpoints)
Database:       Supabase (PostgreSQL) — auth, storage, realtime
AI:             Anthropic Claude API (claude-sonnet-4-6 for speed, claude-opus-4-6 for quality tasks)
Email:          Resend (transactional) + React Email (templates)
Payments:       Lemon Squeezy (merchant of record — Nigeria-friendly)
Hosting:        Vercel
Images:         Unsplash API (stock photos) + Replicate Flux API (AI-generated images, optional)
```

### External Integrations
```
X/Twitter:      Twitter API v2 (OAuth 2.0 PKCE)
LinkedIn:       LinkedIn Marketing API (OAuth 2.0)
Email Platforms: Resend API (primary), Mailchimp API (future), ConvertKit API (future)
Analytics:      Google Analytics 4 (Measurement Protocol)
SEO:            Google Search Console API (keyword data + performance metrics)
Keywords:       Google Autocomplete API (free, no key required) + DataForSEO API (Growth/Agency tiers)
Images:         Unsplash API (50 req/hr free tier, royalty-free images)
Hosting:        Vercel
```

### n8n (Build-in-Public Content Engine)
```
Host:           Self-hosted on GCP (existing infrastructure)
Triggers:       Cron schedule + GitHub webhook + manual
AI Provider:    Claude API (claude-sonnet-4-6)
Outputs:        X API v2, LinkedIn API
Memory:         Supabase n8n_content_state table (persistent across restarts)
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
  lemon_squeezy_customer_id TEXT,
  lemon_squeezy_subscription_id TEXT,
  lemon_squeezy_variant_id TEXT,
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
  -- Product Marketing Context
  target_audience JSONB,           -- { "personas": [...], "pain_points": [...] }
  value_proposition TEXT,
  brand_voice JSONB,               -- { "tone": "...", "dos": [...], "donts": [...] }
  competitors JSONB,               -- [{ "name": "...", "url": "...", "strengths": [...] }]
  positioning_statement TEXT,
  keywords JSONB,                  -- [{ "term": "...", "volume": ..., "difficulty": ... }]
  -- Google Search Console integration (Growth/Agency tiers)
  gsc_connected BOOLEAN DEFAULT FALSE,
  gsc_refresh_token TEXT,          -- Encrypted OAuth refresh token
  gsc_site_url TEXT,               -- Verified GSC property URL
  gsc_last_synced_at TIMESTAMPTZ,
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
    'programmatic_seo', 'launch', 'ab_test', 'full_funnel', 'blog_series'
  )),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'failed')),
  config JSONB,
  results JSONB,
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
    'ad_copy', 'schema_markup', 'audit_report',
    'blog_post', 'keyword_report', 'growth_playbook'
  )),
  channel TEXT CHECK (channel IN ('x', 'linkedin', 'email', 'web', 'blog', 'google_ads', 'meta_ads')),
  title TEXT,
  content JSONB NOT NULL,          -- The actual generated content
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  featured_image_url TEXT,         -- Unsplash or AI-generated image URL
  featured_image_credit TEXT,      -- Unsplash photographer attribution
  published_at TIMESTAMPTZ,
  external_id TEXT,                -- ID from the platform after publishing (tweet ID, etc.)
  performance JSONB,               -- { "impressions": ..., "clicks": ..., "conversions": ... }
  version INTEGER DEFAULT 1,
  parent_asset_id UUID REFERENCES assets(id),  -- For A/B test variants
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Generation Log (track every Claude call)
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  skill_used TEXT NOT NULL,
  prompt_hash TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  model TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Results
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('seo', 'cro', 'performance', 'accessibility', 'copy')),
  url TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  findings JSONB NOT NULL,
  auto_fixes_applied JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword Data (from GSC sync + Autocomplete research)
CREATE TABLE keyword_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('gsc', 'autocomplete', 'manual', 'ai_suggested')),
  -- GSC metrics (null if not from GSC)
  impressions INTEGER,
  clicks INTEGER,
  ctr DECIMAL(5,4),               -- Click-through rate (0.0000 to 1.0000)
  position DECIMAL(5,1),          -- Average position in SERPs
  -- Opportunity scoring (AI-calculated)
  opportunity_score INTEGER CHECK (opportunity_score BETWEEN 0 AND 100),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  intent TEXT CHECK (intent IN ('informational', 'navigational', 'transactional', 'commercial')),
  -- Content mapping
  content_exists BOOLEAN DEFAULT FALSE,  -- Do we have content targeting this keyword?
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,  -- Linked content if exists
  -- Metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, keyword, source)
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
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Sequences
CREATE TABLE email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('welcome', 'nurture', 'onboarding', 're_engagement', 'launch', 'custom')),
  trigger_event TEXT,
  exit_conditions JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_hours INTEGER DEFAULT 24,
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

-- n8n Content Engine State (persistent memory)
CREATE TABLE n8n_content_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  posted_history JSONB DEFAULT '[]'::jsonb,
  rotation_index INTEGER DEFAULT 0,
  banned_hashes TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_data ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (apply similar pattern to all tables)
CREATE POLICY "Users can access own projects" ON projects
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can access own campaigns" ON campaigns
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own keyword data" ON keyword_data
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
CREATE INDEX idx_keyword_data_project ON keyword_data(project_id);
CREATE INDEX idx_keyword_data_opportunity ON keyword_data(project_id, opportunity_score DESC);
CREATE INDEX idx_keyword_data_source ON keyword_data(project_id, source);
```

---

## 5. APPLICATION ARCHITECTURE

### Directory Structure

```
conduikt/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── audit/page.tsx
│   │   │   │       ├── content/page.tsx
│   │   │   │       ├── blog/page.tsx           # NEW: Blog post generator
│   │   │   │       ├── keywords/page.tsx       # NEW: Keyword research & tracking
│   │   │   │       ├── analytics/page.tsx      # ENHANCED: Impact dashboard
│   │   │   │       ├── growth/page.tsx         # NEW: Growth playbook
│   │   │   │       ├── campaigns/page.tsx
│   │   │   │       ├── calendar/page.tsx
│   │   │   │       └── settings/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── billing/page.tsx
│   │   │   │   ├── integrations/page.tsx       # GSC connection, future integrations
│   │   │   │   └── team/page.tsx
│   │   │   └── playground/page.tsx
│   │   ├── (marketing)/
│   │   │   ├── page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   ├── features/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   ├── generate/route.ts
│   │   │   │   ├── audit/route.ts
│   │   │   │   ├── stream/route.ts
│   │   │   │   └── suggest/route.ts
│   │   │   ├── blog/
│   │   │   │   └── image/route.ts              # NEW: Unsplash image search proxy
│   │   │   ├── keywords/
│   │   │   │   ├── autocomplete/route.ts       # NEW: Google Autocomplete proxy
│   │   │   │   ├── gsc/route.ts                # NEW: GSC data fetch
│   │   │   │   └── analyze/route.ts            # NEW: AI keyword opportunity analysis
│   │   │   ├── publish/
│   │   │   │   ├── x/route.ts
│   │   │   │   ├── linkedin/route.ts
│   │   │   │   └── email/route.ts
│   │   │   ├── integrations/
│   │   │   │   └── gsc/
│   │   │   │       ├── connect/route.ts        # NEW: GSC OAuth flow
│   │   │   │       ├── callback/route.ts       # NEW: GSC OAuth callback
│   │   │   │       └── sync/route.ts           # NEW: Sync keyword data from GSC
│   │   │   ├── webhooks/
│   │   │   │   └── lemonsqueezy/route.ts
│   │   │   ├── projects/route.ts
│   │   │   ├── dashboard/stats/route.ts
│   │   │   ├── profile/route.ts
│   │   │   └── assets/route.ts
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # Base UI components
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── audit/
│   │   ├── content/
│   │   ├── blog/                     # NEW
│   │   │   ├── blog-editor.tsx       # Blog post editor with markdown preview
│   │   │   ├── blog-preview.tsx      # Rendered blog post preview
│   │   │   ├── image-picker.tsx      # Unsplash image search + select
│   │   │   └── seo-meta-panel.tsx    # Meta title, description, schema preview
│   │   ├── keywords/                 # NEW
│   │   │   ├── keyword-table.tsx     # Sortable keyword list with metrics
│   │   │   ├── opportunity-card.tsx  # Keyword opportunity score visualization
│   │   │   ├── keyword-research.tsx  # Autocomplete + AI suggestion panel
│   │   │   └── gsc-connect.tsx       # GSC OAuth connection button
│   │   ├── analytics/                # ENHANCED
│   │   │   ├── impact-dashboard.tsx  # The main analytics dashboard
│   │   │   ├── audit-trend-chart.tsx # Audit score over time (Recharts)
│   │   │   ├── generation-stats.tsx  # Content volume, skill usage breakdown
│   │   │   ├── velocity-chart.tsx    # Pieces per week trend
│   │   │   └── highlights-card.tsx   # Key achievements (biggest score jump, etc.)
│   │   ├── growth/                   # NEW
│   │   │   ├── playbook-view.tsx     # Growth playbook display
│   │   │   ├── priority-list.tsx     # Prioritized action items
│   │   │   └── data-summary.tsx      # Aggregated project health
│   │   ├── campaign/
│   │   └── charts/
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   ├── ai/
│   │   │   ├── client.ts
│   │   │   ├── skills/
│   │   │   │   ├── index.ts
│   │   │   │   ├── seo-audit.ts
│   │   │   │   ├── page-cro.ts
│   │   │   │   ├── copywriting.ts
│   │   │   │   ├── email-sequence.ts
│   │   │   │   ├── social-content.ts
│   │   │   │   ├── content-strategy.ts
│   │   │   │   ├── competitor-analysis.ts
│   │   │   │   ├── blog-post.ts              # NEW
│   │   │   │   ├── keyword-research.ts       # NEW
│   │   │   │   ├── growth-playbook.ts        # NEW
│   │   │   │   ├── programmatic-seo.ts       # Future
│   │   │   │   ├── ab-test-setup.ts          # Future
│   │   │   │   └── launch-strategy.ts        # Future
│   │   │   ├── orchestrator.ts
│   │   │   └── prompt-builder.ts
│   │   ├── integrations/
│   │   │   ├── twitter.ts
│   │   │   ├── linkedin.ts
│   │   │   ├── unsplash.ts                   # NEW: Unsplash API client
│   │   │   ├── google-search-console.ts      # NEW: GSC API client
│   │   │   └── google-autocomplete.ts        # NEW: Autocomplete scraper
│   │   ├── lemon-squeezy/
│   │   │   └── client.ts
│   │   └── utils/
│   │
│   ├── hooks/
│   │   ├── use-project.ts
│   │   ├── use-generation.ts
│   │   ├── use-publish.ts
│   │   ├── use-keywords.ts                   # NEW
│   │   └── use-subscription.ts
│   │
│   ├── stores/
│   │   ├── ui-store.ts
│   │   └── generation-store.ts
│   │
│   └── styles/
│       ├── globals.css
│       ├── grain.css
│       └── animations.css
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── public/
│   ├── fonts/
│   └── og/
│
├── .env.local.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 6. MARKETING SKILLS INTEGRATION

### Skills Registry (10 skills implemented + 3 planned)

| Skill ID | Name | Status | Model | Tier |
|---|---|---|---|---|
| `seo-audit` | SEO Audit | Done | claude-sonnet-4-6 | Free |
| `page-cro` | Page CRO Analysis | Done | claude-sonnet-4-6 | Free |
| `copywriting` | Marketing Copy | Done | claude-sonnet-4-6 | Free |
| `social-content` | Social Content | Done | claude-sonnet-4-6 | Free |
| `email-sequence` | Email Sequences | Done | claude-sonnet-4-6 | Pro |
| `content-strategy` | Content Strategy | Done | claude-sonnet-4-6 | Pro |
| `competitor-analysis` | Competitor Analysis | Done | claude-sonnet-4-6 | Pro |
| `blog-post` | Blog Post Generator | **NEW** | claude-sonnet-4-6 | Pro |
| `keyword-research` | Keyword Research | **NEW** | claude-sonnet-4-6 | Free (basic) / Growth (GSC) |
| `growth-playbook` | Growth Playbook | **NEW** | claude-sonnet-4-6 | Growth |
| `programmatic-seo` | Programmatic SEO Pages | Planned | claude-sonnet-4-6 | Growth |
| `ab-test-setup` | A/B Test Design | Planned | claude-sonnet-4-6 | Growth |
| `launch-strategy` | Product Launch Plan | Planned | claude-sonnet-4-6 | Pro |

### NEW SKILL: Blog Post Generator (`blog-post`)

**What it does:** Generates SEO-optimized long-form blog posts with proper structure, meta tags, internal link suggestions, and featured image selection.

**Where to source the blog post writing methodology:**

1. **Corey Haines' `content-strategy` + `copywriting` skills** — Use these as the base writing methodology. They contain principles about audience-aware writing, conversion-oriented structure, and brand voice adherence that should inform the blog skill.

2. **Surfer SEO's content guidelines** (public documentation) — Study their approach to NLP-based content optimization: target word count per keyword difficulty, heading structure, keyword density recommendations. Adapt these principles into the prompt.

3. **Ahrefs' blog post framework** (public blog posts about blogging) — Their AIDA-based structure (Hook → Problem → Solution → CTA) with SEO layered on top is well-documented and effective.

4. **The blog-post skill prompt should combine:**
   - Project context injection (audience, brand voice, competitors)
   - Target keyword optimization (from keyword_data table if available)
   - SEO structure: meta title (50-60 chars), meta description (150-160 chars), H2/H3 hierarchy, internal link suggestions
   - Content structure: hook intro, logical sections, actionable takeaways, CTA
   - Schema markup (Article schema for SEO)
   - Social promotion snippets: auto-generate 3 variants (X post, LinkedIn post, email subject line) from the blog content

**Skill implementation:**

```typescript
// lib/ai/skills/blog-post.ts

export const blogPostSkill: SkillConfig = {
  id: 'blog-post',
  name: 'Blog Post Generator',
  description: 'SEO-optimized long-form blog posts with meta tags, structure, and social promotion snippets',
  model: 'claude-sonnet-4-6',
  maxTokens: 8000,

  buildSystemPrompt: (context: ProjectContext) => `
You are an expert content marketer and SEO writer creating a blog post for a specific product/company.

## Project Context
- Website: ${context.websiteUrl}
- Product: ${context.name}
- Target Audience: ${JSON.stringify(context.targetAudience)}
- Value Proposition: ${context.valueProposition}
- Brand Voice: ${JSON.stringify(context.brandVoice)}
- Competitors: ${JSON.stringify(context.competitors)}

## Keyword Context
${context.keywordData ? `Target keyword: ${context.keywordData.primary}
Related keywords: ${context.keywordData.related?.join(', ')}
Current ranking: ${context.keywordData.currentPosition || 'Not ranking'}` : 'No keyword data available — optimize for the topic naturally.'}

## SEO Writing Rules
1. Meta title: 50-60 characters, include primary keyword near start
2. Meta description: 150-160 characters, include primary keyword, compelling CTA
3. H1: One per post, include primary keyword
4. H2/H3 hierarchy: Logical structure, include related keywords naturally
5. First paragraph: Include primary keyword within first 100 words
6. Internal link suggestions: Reference 2-3 pages on the user's site
7. Word count: Match the requested length (default 1200-1500 words)
8. Readability: Short paragraphs (2-3 sentences), clear language, no jargon unless audience expects it

## Output Format
Return valid JSON:
{
  "meta_title": "string (50-60 chars)",
  "meta_description": "string (150-160 chars)",
  "slug": "string (url-friendly)",
  "featured_image_query": "string (search term for Unsplash)",
  "schema_markup": { "@type": "Article", ... },
  "content_markdown": "string (full blog post in markdown with H2/H3 structure)",
  "internal_link_suggestions": [{ "anchor_text": "...", "suggested_page": "..." }],
  "social_promotion": {
    "x_post": "string (max 280 chars)",
    "linkedin_post": "string (500-700 chars)",
    "email_subject": "string"
  },
  "word_count": number,
  "reading_time_minutes": number
}
  `,

  buildUserPrompt: (input: BlogPostInput) => `
Write a blog post about: ${input.topic}
${input.targetKeyword ? `Target keyword: ${input.targetKeyword}` : ''}
Target word count: ${input.wordCount || 1500}
Tone: ${input.tone || 'Use brand voice from project context'}
${input.additionalContext || ''}
  `
};
```

### NEW SKILL: Keyword Research (`keyword-research`)

**What it does:** Discovers keyword opportunities by combining Google Autocomplete data, project context, and AI analysis. On Growth/Agency tiers, also incorporates Google Search Console data for data-driven recommendations.

**Data sources (layered by plan tier):**

| Source | Tier | Data |
|---|---|---|
| Google Autocomplete + People Also Ask | Free | Long-tail keyword suggestions, question-based keywords |
| Claude AI analysis | Free | Intent classification, difficulty estimation, topic clustering |
| Google Search Console | Growth/Agency | Real impressions, clicks, CTR, position data for existing keywords |
| DataForSEO API (future) | Agency | Search volume estimates, SERP features, competitor keyword gaps |

**Skill implementation:**

```typescript
// lib/ai/skills/keyword-research.ts

export const keywordResearchSkill: SkillConfig = {
  id: 'keyword-research',
  name: 'Keyword Research',
  description: 'Discover keyword opportunities from autocomplete data, project context, and optionally GSC data',
  model: 'claude-sonnet-4-6',
  maxTokens: 4000,

  buildSystemPrompt: (context: ProjectContext) => `
You are an expert SEO strategist analyzing keyword opportunities for a specific product.

## Project Context
- Website: ${context.websiteUrl}
- Product: ${context.name}
- Target Audience: ${JSON.stringify(context.targetAudience)}
- Competitors: ${JSON.stringify(context.competitors)}
- Current Keywords: ${JSON.stringify(context.existingKeywords)}

${context.gscData ? `
## Google Search Console Data (Real Performance)
${JSON.stringify(context.gscData, null, 2)}
` : ''}

## Your Task
Analyze the provided keyword data and return a prioritized list of keyword opportunities with:
1. Opportunity score (0-100) based on relevance, estimated traffic potential, and difficulty
2. Search intent classification (informational, navigational, transactional, commercial)
3. Content recommendation (what type of content to create for each keyword)
4. Quick wins (keywords where small improvements yield big results — especially from GSC data)
5. Content gaps (keywords competitors rank for but this site doesn't)

## Output Format
Return valid JSON:
{
  "opportunities": [
    {
      "keyword": "string",
      "opportunity_score": number,
      "difficulty": "easy" | "medium" | "hard",
      "intent": "informational" | "navigational" | "transactional" | "commercial",
      "content_type": "blog_post" | "landing_page" | "comparison_page" | "guide" | "tool",
      "rationale": "string (why this keyword matters for this specific business)",
      "suggested_title": "string (a blog post or page title targeting this keyword)"
    }
  ],
  "quick_wins": [
    {
      "keyword": "string",
      "current_position": number,
      "action": "string (specific action to improve ranking)"
    }
  ],
  "content_gaps": [
    {
      "keyword": "string",
      "competitor": "string",
      "opportunity": "string"
    }
  ],
  "summary": "string (2-3 sentence executive summary of keyword strategy)"
}
  `
};
```

### NEW SKILL: Growth Playbook (`growth-playbook`)

**What it does:** Synthesizes ALL project data (audit results, content performance, keyword data, generation history) into a prioritized, actionable marketing plan.

**This is the skill that makes Conduikt genuinely different from ChatGPT.** A user would need to manually compile audit scores, keyword rankings, content performance data, and competitor information, then paste it all into ChatGPT and hope for a useful response. Conduikt does this automatically because it has all the data in one place.

```typescript
// lib/ai/skills/growth-playbook.ts

export const growthPlaybookSkill: SkillConfig = {
  id: 'growth-playbook',
  name: 'Growth Playbook',
  description: 'Data-driven marketing action plan based on all project data',
  model: 'claude-sonnet-4-6',
  maxTokens: 6000,

  buildSystemPrompt: (context: GrowthContext) => `
You are a senior growth marketing strategist creating a prioritized action plan.

## Project Context
- Website: ${context.websiteUrl}
- Product: ${context.name}
- Current Plan: ${context.plan}
- Account Age: ${context.accountAge} days

## Current State Data

### SEO Audit History
${JSON.stringify(context.auditHistory)}
Latest score: ${context.latestAuditScore}/100
Score trend: ${context.auditScoreTrend}

### Content Performance
Total assets generated: ${context.totalAssets}
Assets by type: ${JSON.stringify(context.assetBreakdown)}
Most used skill: ${context.mostUsedSkill}
Generation velocity: ${context.generationsPerWeek}/week

### Keyword Data
${context.keywordData ? JSON.stringify(context.keywordData.slice(0, 20)) : 'No keyword data yet'}

### Competitor Landscape
${JSON.stringify(context.competitors)}

## Your Task
Create a prioritized growth playbook with:
1. Top 5 marketing priorities this month, ranked by estimated impact
2. For each priority: specific action, expected outcome, effort level, dependencies
3. Quick wins (can be done today/this week)
4. 30-day goals with measurable targets
5. Identified gaps in current marketing strategy

## Output Format
Return valid JSON:
{
  "health_score": number (0-100, overall marketing health),
  "priorities": [
    {
      "rank": number,
      "title": "string",
      "action": "string (specific, actionable instruction)",
      "expected_outcome": "string",
      "effort": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high",
      "category": "seo" | "content" | "conversion" | "distribution" | "retention",
      "conduikt_skill": "string (which skill to use to execute this)"
    }
  ],
  "quick_wins": [
    { "action": "string", "time_estimate": "string", "impact": "string" }
  ],
  "thirty_day_goals": [
    { "metric": "string", "current": "string", "target": "string" }
  ],
  "gaps": ["string"],
  "summary": "string (2-3 sentence executive summary)"
}
  `
};
```

---

## 7. KEY USER FLOWS

### Flow 1: New Project Onboarding (Critical Path)

```
1. User signs up → lands on empty dashboard
2. Clicks "New Project" → wizard opens:
   a. Enter website URL
   b. System fetches site, extracts meta info
   c. AI generates initial product-marketing-context (target audience, value prop, brand voice)
   d. User reviews and edits the generated context
   e. System runs initial SEO audit in background
3. Project dashboard opens with:
   - Audit results with score gauge (animated)
   - Top 5 critical findings with one-click fix previews
   - Suggested first actions
```

### Flow 2: Content Generation & Publishing

```
1. User navigates to Project → Content
2. Selects content type (social post, email, landing page copy, etc.)
3. Fills minimal inputs
4. AI generates content with streaming display
5. User sees channel-specific preview
6. User can edit, regenerate, approve → schedule or publish
7. Published content tracked in calendar with performance metrics
```

### Flow 3: Blog Post Generation (NEW)

```
1. User navigates to Project → Blog
2. Enters topic/title, optional target keyword, word count preference
3. If keyword data exists, system suggests relevant keywords
4. AI generates full blog post with:
   - Meta title + description
   - Structured markdown content
   - Internal link suggestions
   - Schema markup
5. Unsplash image picker: AI suggests search query, user picks featured image
6. Blog preview panel shows rendered post with SEO meta panel
7. User can:
   - Edit inline (markdown editor)
   - Regenerate sections
   - Save as draft → publish
   - Auto-generate social promotion snippets (X + LinkedIn + email subject)
8. On save, system auto-generates matching social posts for the blog
```

### Flow 4: Keyword Research Pipeline (NEW)

```
1. User navigates to Project → Keywords
2. System shows two panels:
   a. Discovery: Enter seed keyword → Google Autocomplete returns suggestions
   b. Existing: If GSC connected, shows real keyword performance data

3. User clicks "Analyze Opportunities" → AI evaluates all keywords:
   - Scores each by opportunity (relevance × traffic × difficulty)
   - Classifies intent (informational, transactional, etc.)
   - Suggests content type for each (blog, landing page, comparison, etc.)
   - Highlights quick wins (rank 8-20, small effort to reach page 1)

4. User can:
   - Click any keyword → "Generate Blog Post" pre-fills the blog skill
   - Click any keyword → "Generate Landing Page" pre-fills copywriting skill
   - Save keywords to project for tracking
   - View keyword coverage: which keywords have content, which don't

5. GSC sync (Growth/Agency tier):
   - User connects GSC via OAuth on Settings → Integrations
   - System syncs top 500 keywords weekly
   - Dashboard shows position changes, traffic trends
   - AI identifies keywords losing position (intervention opportunities)
```

### Flow 5: Impact Dashboard (ENHANCED)

```
1. User navigates to Project → Analytics

2. Header Stats Row:
   - Audit Score (latest, with ▲▼ trend vs. first audit)
   - Content Pieces Generated (total + this month)
   - Keywords Tracked (total, with opportunity breakdown)
   - Marketing Health Score (from growth-playbook skill)

3. Charts Section:
   a. Audit Score Trend: Line chart showing all audit scores over time
   b. Content Velocity: Bar chart showing pieces generated per week
   c. Skill Usage: Donut chart showing breakdown by skill type
   d. Keyword Coverage: Bar chart showing keywords with/without content

4. Generation History Table:
   - Searchable/filterable table of all AI generations
   - Columns: Date, Skill, Prompt snippet, Tokens, Duration, Model
   - Click any row to view full generation output

5. Highlights Cards:
   - "Biggest Win": Largest audit score improvement
   - "Most Active Week": Week with most generations
   - "Top Skill": Most-used skill with generation count
   - "Keyword Opportunity": Highest-scoring unaddressed keyword
```

### Flow 6: Growth Playbook (NEW)

```
1. User navigates to Project → Growth
2. System aggregates ALL project data:
   - Audit history and score trends
   - Content generated (volume, types, channels)
   - Keyword data (if available)
   - Competitor analysis (if run)
3. AI generates prioritized growth playbook
4. Dashboard shows:
   - Marketing Health Score (0-100, color-coded gauge)
   - Top 5 Priorities (cards with action, effort, impact badges)
   - Quick Wins (checkable list)
   - 30-Day Goals (metric → current → target)
   - Strategy Gaps (areas not yet addressed)
5. Each priority has a "Do This Now" button that routes to the appropriate skill
   (e.g., "Improve SEO score" → routes to Audit, "Write blog targeting X keyword" → routes to Blog)
6. Playbook regenerates weekly or on-demand
```

---

## 8. IMAGE INTEGRATION

### Unsplash API (Primary — Free Tier)

**API:** `https://api.unsplash.com/search/photos`
**Rate limit:** 50 requests/hour (free), 5000 requests/hour (production — apply when needed)
**Cost:** Free. Attribution required (handled automatically in UI).

**Implementation:**

```typescript
// lib/integrations/unsplash.ts

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function searchPhotos(query: string, perPage = 9) {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
  );
  const data = await res.json();
  return data.results.map((photo: any) => ({
    id: photo.id,
    url: photo.urls.regular,         // 1080px wide
    thumb: photo.urls.thumb,          // 200px wide (for picker grid)
    downloadUrl: photo.links.download_location,  // Required for attribution tracking
    alt: photo.alt_description,
    credit: {
      name: photo.user.name,
      username: photo.user.username,
      link: photo.user.links.html,   // Link to photographer's Unsplash profile
    }
  }));
}

// REQUIRED: Track downloads per Unsplash API guidelines
export async function trackDownload(downloadUrl: string) {
  await fetch(`${downloadUrl}?client_id=${UNSPLASH_ACCESS_KEY}`);
}
```

**Usage in blog post flow:**
1. Blog-post skill returns `featured_image_query` in its output
2. Frontend calls `/api/blog/image?q={query}` → backend calls Unsplash API
3. User sees 9-image grid picker, selects one
4. Selected image URL + credit stored in `assets.featured_image_url` and `assets.featured_image_credit`
5. Blog preview renders image with photographer attribution

### Replicate Flux API (Optional — AI Image Generation)

**When to use:** If user wants a custom illustration, not a stock photo. Pay-per-use, approximately $0.003-0.05 per image depending on model.

**Implementation:** Deferred to Phase 3. The Unsplash integration covers 90% of blog image needs. AI image generation is a differentiator for Growth/Agency tiers in the future.

**Env var needed:** `UNSPLASH_ACCESS_KEY` (get from unsplash.com/developers)

---

## 9. GOOGLE SEARCH CONSOLE INTEGRATION

### OAuth Flow

```
1. User goes to Settings → Integrations → "Connect Google Search Console"
2. Redirect to Google OAuth consent screen:
   - Scope: https://www.googleapis.com/auth/webmasters.readonly
   - Access type: offline (to get refresh_token)
3. User grants access → callback to /api/integrations/gsc/callback
4. Store refresh_token encrypted in projects.gsc_refresh_token
5. User selects which GSC property matches their project
6. Initial sync: fetch last 90 days of keyword data
7. Ongoing: weekly sync via pg_cron or manual trigger
```

### Data Fetched

```typescript
// GSC Search Analytics API response per keyword
interface GSCKeywordData {
  keyword: string;          // The search query
  impressions: number;      // How many times site appeared in search
  clicks: number;           // How many times users clicked
  ctr: number;              // Click-through rate
  position: number;         // Average position in SERPs
}
```

**Storage:** Upsert into `keyword_data` table with `source = 'gsc'`. AI skills can then query this table for context injection.

### Env Vars Needed
```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://conduikt.com/api/integrations/gsc/callback
```

---

## 10. n8n BUILD-IN-PUBLIC CONTENT ENGINE

This is the adapted version of the Cross workflow, designed to market Conduikt during development.

### Workflow Overview

```
Triggers (3 inputs):
├── Schedule: 09:00, 13:00, 17:00 WAT daily
├── GitHub Push: conduikt repo → master branch
└── Manual: For testing

Pipeline:
├── Configuration (API keys, dry_run flag)
├── Fetch Context
│   ├── WORKPLAN.md from GitHub
│   ├── CHANGELOG.md from GitHub
│   ├── Recent commits (last 10)
│   └── Screenshots index
├── Load Memory (Supabase n8n_content_state table — persistent)
├── Prepare Inputs (decode base64, merge all context, fallbacks for 404s)
├── Construct Prompt (system + user split, category rotation + full context)
├── Claude API (claude-sonnet-4-6, top-level system parameter)
├── Parse Response
├── Check Duplicate + Banned Topics
├── Has Post? → Yes/No
│   ├── Yes → Select Image → Is Dry Run?
│   │   ├── Dry Run → Log → Save State to Supabase
│   │   └── Live → Has Image?
│   │       ├── With Image → Upload Media → Sign → Post Media Tweet → Post to LinkedIn → Save State
│   │       └── Text Only → Sign → Post Tweet → Post to LinkedIn → Save State
│   └── No → Log Skip
```

### Key Features (Updated from original)

- **29 nodes total** (not 24)
- **Persistent memory via Supabase** (not n8n static data — survives restarts)
- **Continue-on-fail for all fetch nodes** (WORKPLAN.md, CHANGELOG.md, commits, screenshots)
- **System/User prompt split** (system instruction as top-level parameter, not crammed into user message)
- **LinkedIn API v2 current endpoint** (`/rest/posts` with `LinkedIn-Version: 202402`)
- **Text-only default** (media upload requires Twitter Pro tier)

### Banned Topics (Production-Tested)

1. "Built in 30 minutes" or trivially simple claims
2. "Faith apps are terrible" or negative comparisons
3. "Controversial opinion" / "Hot take" openers
4. "Follow along" / "Follow for more" CTAs
5. "Debugging nightmare" or exaggerated struggles
6. "Building something different" or vague differentiation
7. Any hashtags (#BuildInPublic, #IndieHacker, #SaaS)
8. "Thread 🧵" or thread-style posts
9. Emoji-heavy posts (more than 2 emojis)

### Category Rotation

```
1. market_insight    — Finding about the marketing automation space
2. build_log         — What shipped today with Claude Code (reference commits)
3. before_after      — Website before/after optimization
4. founder_lesson    — Honest takes on building as a solo founder in Lagos
5. product_tease     — Preview a specific feature with enough detail to intrigue
6. technical_deep    — Architecture decisions, why Claude, Supabase patterns
```

---

## 11. BUILD PHASES & TIMELINE

### Parallel Track — n8n Content Engine (Live)

Running since Day 1. 29 nodes, 3x/day posting to X + LinkedIn. Persistent state in Supabase.

### Phase 1 — MVP Core ✅ COMPLETE

- Project scaffolding (Next.js 15, TypeScript, Tailwind v4)
- Supabase: 10 tables with RLS, triggers, indexes
- Mineral design system + 9 UI components
- Layout shell (sidebar, header, mobile responsive)
- Auth: email/password + X + LinkedIn social login
- 7 AI skills: seo-audit, page-cro, copywriting, social-content, email-sequence, content-strategy, competitor-analysis
- SEO audit pipeline: URL → Claude → scored results
- Content studio: generate → preview → save
- Analytics page: generation history
- Project settings: edit + delete
- Lemon Squeezy billing: 4 tiers, webhook handler, generation limits
- Error boundary + custom 404
- Landing page, pricing, features, privacy, terms
- Deployed to Vercel: https://conduikt.vercel.app

### Phase 2A — Impact & Intelligence (CURRENT — NEW)

**Session 1: Impact Dashboard + Blog Post Skill**
- [ ] Enhance `/projects/[id]/analytics` with impact dashboard:
  - Audit score trend chart (Recharts line chart, all audits over time)
  - Content summary: total pieces, breakdown by skill, breakdown by channel
  - Generation velocity: pieces per week bar chart
  - Highlights card: biggest audit score improvement, most-used skill, total tokens
- [ ] Add `blog-post` skill to `src/lib/ai/skills/`
- [ ] Add `/projects/[id]/blog` page:
  - Topic/keyword/word count inputs
  - Streaming AI generation
  - Markdown preview panel (react-markdown + remark-gfm)
  - SEO meta panel (title, description, schema preview)
  - Social promotion snippets panel
- [ ] Register blog-post in Content Studio and Playground skill selectors

**Session 2: Keyword Research + Unsplash Images**
- [ ] Add `keyword-research` skill to `src/lib/ai/skills/`
- [ ] Build Google Autocomplete proxy: `/api/keywords/autocomplete?q={seed}`
- [ ] Add `/projects/[id]/keywords` page:
  - Seed keyword input → autocomplete suggestions grid
  - "Analyze Opportunities" button → Claude rates each keyword
  - Sortable keyword table (opportunity score, difficulty, intent)
  - "Generate Content" button per keyword → routes to blog or content skill
- [ ] Build Unsplash integration: `lib/integrations/unsplash.ts`
- [ ] Add `/api/blog/image` endpoint (Unsplash search proxy)
- [ ] Add image picker component to blog page
- [ ] Create `keyword_data` table migration

**Session 3: Growth Playbook + GSC Foundation**
- [ ] Add `growth-playbook` skill to `src/lib/ai/skills/`
- [ ] Add `/projects/[id]/growth` page:
  - Marketing health score gauge
  - Top 5 priorities cards with action buttons
  - Quick wins checklist
  - 30-day goals table
- [ ] Build growth context aggregator (queries audits, assets, keywords, generations)
- [ ] Add GSC OAuth flow: `/api/integrations/gsc/connect` + `/api/integrations/gsc/callback`
- [ ] Add GSC connect button on Settings → Integrations page
- [ ] Add GSC sync endpoint: `/api/integrations/gsc/sync`

**Session 4: Wire Everything Together**
- [ ] Keyword → Blog pipeline: clicking a keyword pre-fills blog generator
- [ ] Blog → Social pipeline: auto-generate promotion posts from blog content
- [ ] Growth playbook → Action routing: "Do This Now" buttons route to correct skill/page
- [ ] Audit score tracking: re-running audit shows delta from previous score
- [ ] Update sidebar navigation: add Blog, Keywords, Growth items under project
- [ ] Update landing page copy to highlight new features

### Phase 2B — Publishing & Distribution

- [ ] Per-user OAuth token storage (X + LinkedIn access tokens)
- [ ] `/api/publish/x` — post to X on behalf of user
- [ ] `/api/publish/linkedin` — post to LinkedIn on behalf of user
- [ ] Connect content studio "Publish" button to live routes
- [ ] Scheduled posts system (Supabase pg_cron)
- [ ] Resend integration for transactional emails
- [ ] Real-time token streaming on content generation

### Phase 3 — Launch & Scale

- [ ] Campaign orchestrator (multi-skill chaining)
- [ ] Visual campaign builder UI
- [ ] Team member invites + RBAC
- [ ] White-label PDF audit reports
- [ ] Light mode toggle
- [ ] Onboarding tour
- [ ] Product Hunt launch
- [ ] Programmatic SEO pages ("Conduikt vs X")
- [ ] DataForSEO integration for Agency tier keyword volume data
- [ ] Replicate Flux AI image generation for Growth/Agency tiers

---

## 12. ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Lemon Squeezy
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_VARIANT_PRO=
LEMONSQUEEZY_VARIANT_GROWTH=
LEMONSQUEEZY_VARIANT_AGENCY=
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_PRO=
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_GROWTH=
NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_AGENCY=
NEXT_PUBLIC_LEMONSQUEEZY_PORTAL_URL=

# X/Twitter
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Resend (Email)
RESEND_API_KEY=

# Unsplash (Images)
UNSPLASH_ACCESS_KEY=

# Google (Search Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# App
NEXT_PUBLIC_APP_URL=https://conduikt.com
```

---

## 13. SUCCESS METRICS (Updated)

### Week 3 (MVP Launch) ✅ ACHIEVED
- Platform functional end-to-end
- At least 1 real user (yourself) using it daily
- Build-in-public posts generating engagement

### Week 5 (Intelligence Layer)
- Impact dashboard live with audit trend tracking
- Blog post generation with Unsplash images working
- Keyword research pipeline functional
- Growth playbook generating actionable plans
- 20 beta users signed up

### Week 7 (Distribution Layer)
- Direct publishing to X/LinkedIn from the platform
- GSC integration live for Growth/Agency users
- 50 users, 5 paying customers
- Product Hunt launch prepared

### Week 10 (Scale)
- 100 users signed up
- 10+ paying customers
- Campaign orchestrator working
- Analytics feedback loop (performance data feeding AI)
- Full keyword → content → publish → measure loop operational

---

## 14. RISK MITIGATION

| Risk | Mitigation |
|------|------------|
| Claude API costs scaling | Strict generation limits per tier. Cache common audit patterns. Sonnet for speed, Opus only for Agency quality tasks |
| Unsplash rate limit | 50 req/hr is fine for MVP. Apply for production key (5000/hr) when approaching limit |
| GSC OAuth complexity | Scope down to read-only. Use existing Google OAuth libraries. Defer to Phase 2A Session 3 |
| Blog posts too generic | Project context injection + keyword data = specific output. The more data in the system, the better the output |
| Feature scope creep | Phase 2A is scoped to 4 sessions. Each session has explicit deliverables. Anything not listed waits for Phase 2B or 3 |
| Competition from ChatGPT improvements | Our moat is persistent context + connected data + measurable outcomes. ChatGPT improves the raw AI — we improve the workflow around it |

---

## 15. KILLER FEATURES — WHY PAY FOR CONDUIKT INSTEAD OF USING CHATGPT

These are the features that justify the subscription. Each one represents something that is genuinely hard or impossible to replicate by just chatting with an AI:

1. **Persistent Project Context** — Set your audience, brand voice, competitors, and value prop once. Every generation for the next 12 months uses that context automatically. ChatGPT forgets after every session.

2. **SEO Audit → Fix Pipeline** — Enter a URL, get a scored audit, click "fix" to generate the exact code/copy needed. Then re-audit to measure improvement. ChatGPT can't fetch your URL, can't track score changes over time.

3. **Keyword Intelligence Pipeline** — Google Autocomplete → AI opportunity scoring → content generation pre-filled with target keyword → track if you created content for that keyword. This is a workflow, not a conversation.

4. **Blog Post Generation with SEO Structure** — Not just "write me a blog post" but structured output: meta title (character-counted), meta description, H2/H3 hierarchy optimized for the target keyword, schema markup, internal link suggestions, social promotion snippets. Plus integrated image selection.

5. **Impact Dashboard** — See your audit score improve over time. Track how much content you're producing. Identify which skills you use most. This is accountability and progress tracking that no chat interface provides.

6. **Growth Playbook** — AI synthesizes ALL your data (audits, keywords, content, competitors) into a prioritized action plan. In ChatGPT, you'd need to copy-paste pages of data. In Conduikt, it's one click because the data is already there.

7. **Multi-Channel Preview** — See the same content rendered as an X post (with character count), LinkedIn post (with "see more" truncation), email (with subject line), and blog post. One generation, four outputs.

8. **Keyword → Content → Measure Loop** — Discover a keyword opportunity → generate optimized content → publish → track ranking changes (via GSC). This closed loop is what marketing agencies charge $5,000/month for.

---

## APPENDIX A: MARKETING SKILLS REFERENCE

Skills to install from `github.com/coreyhaines31/marketingskills`:

**Implemented (7 + 3 new):**
- `seo-audit` — Technical and on-page SEO analysis ✅
- `page-cro` — Landing page conversion optimization ✅
- `copywriting` — Conversion-focused marketing copy ✅
- `social-content` — Social media content creation ✅
- `email-sequence` — Automated email flows ✅
- `content-strategy` — Content planning ✅
- `competitor-alternatives` — Comparison analysis ✅
- `blog-post` — SEO-optimized long-form content (NEW — custom skill, informed by content-strategy + copywriting)
- `keyword-research` — Keyword opportunity analysis (NEW — custom skill with Autocomplete + GSC data)
- `growth-playbook` — Data-driven growth plan (NEW — custom skill, unique to Conduikt)

**Planned (Phase 2B/3):**
- `programmatic-seo` — Scaled SEO page generation
- `ab-test-setup` — Experiment design
- `launch-strategy` — Product launch planning
- `schema-markup` — Structured data for search
- `pricing-strategy` — Pricing and packaging
- `marketing-psychology` — Behavioral psychology for marketing
- `referral-program` — Referral systems
- `paid-ads` — Paid advertising management

---

*This document is the single source of truth for the Conduikt build. Claude Code should reference it for every architectural decision, design implementation, and feature prioritization.*

*Version 2.0 — Updated February 19, 2026*
