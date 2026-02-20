# Conduikt — Architecture Addendum: Agent Rebrand & Navigation Redesign

**Version:** 2.1 Addendum
**Date:** February 20, 2026
**Applies to:** SYSTEM_ARCHITECTURE_v2.md

---

## SUMMARY

This addendum introduces two changes:

1. **Rename "Skills" to "Agents"** throughout the entire codebase, UI, database, and documentation
2. **Redesign sidebar navigation** with expandable project trees showing agents, plus agent card grid on project overview

These changes are branding + UX improvements. No new features — just better framing and navigation of existing features.

---

## 1. AGENT RENAME — Global Find & Replace

### Why

"Agent" implies autonomy — something that works on your behalf. "Skill" implies a tool you operate manually. In 2025-2026, "AI agent" is the dominant framing buyers understand. This is a free marketing upgrade.

### What Changes

| Old Term | New Term |
|---|---|
| Skills | Agents |
| Skill | Agent |
| AI Skills Engine | AI Agent Engine |
| Content Studio skill selector | Agent selector |
| Playground skill picker | Agent picker |
| `src/lib/ai/skills/` | `src/lib/ai/agents/` |
| `skill_used` (in ai_generations table) | `agent_used` |
| `skills/index.ts` | `agents/index.ts` |
| Each `SkillConfig` type | `AgentConfig` |
| `buildSystemPrompt` | `buildSystemPrompt` (no change — internal) |
| `seo-audit` skill ID | `seo-audit` agent ID (IDs stay the same) |
| "7 AI skills" in marketing copy | "10 AI Marketing Agents" |
| "Pick a skill" in UI labels | "Choose an Agent" |

### Agent Display Names (for UI)

| Agent ID | Display Name | Icon | Short Description |
|---|---|---|---|
| `seo-audit` | SEO Audit Agent | 🔍 | Audit your site and get actionable SEO fixes |
| `page-cro` | CRO Agent | 🎯 | Optimize landing pages for conversion |
| `copywriting` | Copywriting Agent | ✍️ | Generate conversion-focused marketing copy |
| `social-content` | Social Agent | 📱 | Create platform-optimized social posts |
| `email-sequence` | Email Agent | 📧 | Build automated email sequences |
| `content-strategy` | Strategy Agent | 🗺️ | Plan your content calendar and topics |
| `competitor-analysis` | Competitor Agent | 🏁 | Analyze competitor positioning and gaps |
| `blog-post` | Blog Agent | 📝 | Write SEO-optimized long-form blog posts |
| `keyword-research` | Keyword Agent | 🔑 | Discover and score keyword opportunities |
| `growth-playbook` | Growth Agent | 📈 | Get a prioritized, data-driven marketing plan |

### Database Migration

```sql
-- Rename column in ai_generations
ALTER TABLE ai_generations RENAME COLUMN skill_used TO agent_used;
```

### File Renames

```bash
# Rename the skills directory to agents
mv src/lib/ai/skills/ src/lib/ai/agents/

# Rename all internal references
# (Claude Code should do a global find-replace across all .ts/.tsx files)
# SkillConfig → AgentConfig
# SkillOutput → AgentOutput  
# skill_used → agent_used
# getSkill → getAgent
# skillRegistry → agentRegistry
```

### Marketing Copy Updates

**Landing page hero:**
- Old: "7 AI marketing skills at your fingertips"
- New: "10 AI Marketing Agents working for your business"

**Pricing table feature list:**
- Old: "7 AI skills"
- New: "10 AI Agents"

**Playground page:**
- Old: "Select a skill to generate marketing content"
- New: "Choose an Agent to work on your marketing"

**Content Studio:**
- Old: "Skills" tab/selector
- New: "Agents" tab/selector with agent icon + name

---

## 2. SIDEBAR NAVIGATION REDESIGN

### Current Problem

The sidebar is flat. A user with 3 projects sees:
```
Dashboard
Projects (link to list)
Playground
Settings
```

Then clicking a project takes them to a project overview, and THEN they navigate to sub-pages (Audit, Content, Blog, etc.) via tabs or secondary nav. This is two clicks to reach any agent, and the user loses context of which project they're in.

### New Design: Expandable Project Tree with Agents

```
┌─────────────────────────────┐
│ 🔶 Conduikt                 │  ← Logo + wordmark
│                             │
│ ▫ Dashboard                 │  ← Global dashboard (all projects)
│                             │
│ MY PROJECTS                 │  ← Section header (caption style)
│                             │
│ ▾ Conduikt.com              │  ← Expanded project (click toggles)
│   ├ 🔍 SEO Audit Agent      │  ← Each agent is a direct link
│   ├ ✍️ Copywriting Agent     │
│   ├ 📱 Social Agent          │
│   ├ 📝 Blog Agent            │
│   ├ 🔑 Keyword Agent         │
│   ├ 📈 Growth Agent          │
│   ├ 📊 Analytics             │  ← Not an agent, but a page
│   └ ⚙️ Project Settings      │
│                             │
│ ▸ Client Site B             │  ← Collapsed project
│ ▸ Client Site C             │  ← Collapsed project
│                             │
│ + New Project               │  ← Quick create button
│                             │
│ ─────────────────           │  ← Divider
│                             │
│ 🧪 Playground               │  ← Global playground
│ ⚙️ Settings                  │  ← Account settings
│                             │
│ ─────────────────           │
│ 🔶 Pro Plan                 │  ← Current plan badge
│ 67/100 generations          │  ← Usage indicator
└─────────────────────────────┘
```

### Interaction Details

**Project expansion:**
- Click project name → toggles expand/collapse
- Click project name when already expanded → navigates to project overview
- Or: small chevron (▾/▸) toggles expand, project name always navigates to overview
- Default: most recently accessed project is expanded, others collapsed
- Remember expansion state in Zustand UI store (persisted to localStorage)

**Agent navigation:**
- Click any agent → navigates to `/projects/[id]/agents/[agent-id]`
- Active agent highlighted with copper accent (same as current active nav style)
- Hover shows agent short description as tooltip

**Collapsed sidebar (64px):**
- Projects section shows project initial avatars (first letter, colored)
- Click project avatar → expands sidebar + expands that project
- Agents not visible when collapsed (too much info for 64px)

**Mobile sidebar:**
- Slides in from left (existing behavior)
- Projects are expandable accordions
- Tapping an agent navigates + closes sidebar

### Updated URL Structure

```
OLD                                    NEW
/projects/[id]                    →    /projects/[id]                  (overview — agent card grid)
/projects/[id]/audit              →    /projects/[id]/agents/seo-audit
/projects/[id]/content            →    /projects/[id]/agents/content   (multi-agent content studio)
/projects/[id]/blog               →    /projects/[id]/agents/blog
/projects/[id]/keywords           →    /projects/[id]/agents/keywords
/projects/[id]/analytics          →    /projects/[id]/analytics        (not an agent — stays as-is)
/projects/[id]/growth             →    /projects/[id]/agents/growth
/projects/[id]/settings           →    /projects/[id]/settings         (not an agent — stays as-is)
/projects/[id]/campaigns          →    /projects/[id]/agents/campaigns (coming soon)
/projects/[id]/calendar           →    /projects/[id]/agents/calendar  (coming soon)
```

### Agent Page Layout Pattern

Every agent page follows the same layout structure for consistency:

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER                                                           │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🔍 SEO Audit Agent              [Project: Conduikt.com ▾]   │ │
│ │ Audit your site and get actionable SEO fixes                  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ WORKSPACE (agent-specific)                                       │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │                                                              │ │
│ │  [URL input]                          [Run Audit]            │ │
│ │                                                              │ │
│ │  ... agent-specific workspace UI ...                         │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ HISTORY / RESULTS                                                │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Previous runs / saved outputs for this agent + project       │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Header:** Agent icon + name + description + project context selector (dropdown to switch projects without leaving the agent)

**Workspace:** The main interactive area. Varies per agent:
- SEO Audit Agent: URL input → audit results
- Blog Agent: topic/keyword inputs → markdown preview + image picker
- Keyword Agent: seed keyword → opportunities table
- Growth Agent: one-click → playbook display

**History:** Previous outputs from this agent for this project. Shows most recent at top. Click any to reload into workspace.

---

## 3. PROJECT OVERVIEW PAGE REDESIGN

### Current State

Dashboard-style stats grid with numbers. Functional but doesn't guide the user to take action.

### New Design: Agent Card Grid

When user clicks a project name, they see:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Conduikt.com                              [Project Settings ⚙️] │
│  https://conduikt.com                                            │
│                                                                  │
│  ┌─── QUICK STATS ──────────────────────────────────────────┐   │
│  │ Audit Score: 78 ▲12  │ Content: 47 pieces │ Keywords: 23 │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  YOUR AGENTS                                                     │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ 🔍 SEO Audit     │  │ ✍️ Copywriting    │  │ 📱 Social     │  │
│  │    Agent          │  │    Agent          │  │    Agent      │  │
│  │                   │  │                   │  │               │  │
│  │ Score: 78/100     │  │ 12 pieces created │  │ 8 posts made  │  │
│  │ ▲ +12 from start  │  │ Last: 2 hrs ago   │  │ Last: today   │  │
│  │                   │  │                   │  │               │  │
│  │ [Run Audit →]     │  │ [Create Copy →]   │  │ [Create →]    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ 📝 Blog          │  │ 📧 Email          │  │ 🗺️ Strategy   │  │
│  │    Agent          │  │    Agent          │  │    Agent      │  │
│  │                   │  │                   │  │               │  │
│  │ 3 posts written   │  │ 1 sequence built  │  │ Last: 5d ago  │  │
│  │ Last: yesterday   │  │ Last: 3 days ago  │  │               │  │
│  │                   │  │                   │  │               │  │
│  │ [Write Post →]    │  │ [Build Flow →]    │  │ [Plan →]      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ 🔑 Keyword       │  │ 📈 Growth         │  │ 🏁 Competitor │  │
│  │    Agent          │  │    Agent          │  │    Agent      │  │
│  │                   │  │                   │  │               │  │
│  │ 23 tracked        │  │ Health: 72/100    │  │ 2 competitors │  │
│  │ 5 quick wins      │  │ 5 priorities      │  │ Last: 1w ago  │  │
│  │                   │  │                   │  │               │  │
│  │ [Research →]      │  │ [View Plan →]     │  │ [Analyze →]   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  COMING SOON                                                     │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ 🎯 CRO Agent     │  │ 📅 Calendar       │  │ 🔄 Campaign   │  │
│  │ (Available)       │  │ Agent             │  │    Agent      │  │
│  │                   │  │ Coming Soon       │  │ Coming Soon   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Agent Card Component Spec

```typescript
// components/dashboard/agent-card.tsx

interface AgentCardProps {
  agent: {
    id: string;
    name: string;          // "SEO Audit Agent"
    icon: string;          // Emoji or Lucide icon
    description: string;   // Short description
    status: 'active' | 'coming_soon';
  };
  projectId: string;
  metrics?: {
    primary: { label: string; value: string };     // "Score: 78/100"
    secondary?: { label: string; value: string };  // "▲ +12 from start"
    lastUsed?: string;                              // "2 hours ago"
  };
  ctaLabel: string;        // "Run Audit"
}
```

**Card styling (Mineral design system):**
- Background: `var(--surface-1)`
- Border: `1px solid var(--border-default)`
- Border-radius: 12px
- Hover: border transitions to `var(--border-strong)`, shadow elevates, subtle scale(1.01)
- Active agent (most recently used): copper left border accent
- Coming Soon: 50% opacity, no hover effect, "Coming Soon" badge
- Agent icon: displayed at 24px, copper-tinted on hover
- CTA button: Ghost style by default, Primary on hover
- Metrics: `var(--font-mono)` for numbers, `var(--text-secondary)` for labels
- Trend indicators: `var(--success)` for positive (▲), `var(--error)` for negative (▼)

**Metric data sources per agent card:**

| Agent | Primary Metric | Secondary Metric | Data Source |
|---|---|---|---|
| SEO Audit | Latest score (X/100) | Delta from first audit | `audits` table, ordered by created_at |
| Copywriting | Pieces created (count) | Last generated (time ago) | `assets` where agent_used = 'copywriting' |
| Social | Posts created (count) | Last generated | `assets` where channel IN ('x', 'linkedin') |
| Blog | Posts written (count) | Last generated | `assets` where type = 'blog_post' |
| Email | Sequences built (count) | Last generated | `email_sequences` count |
| Strategy | Last run (time ago) | — | `ai_generations` where agent_used = 'content-strategy' |
| Keyword | Keywords tracked (count) | Quick wins found | `keyword_data` count + opportunity_score > 70 |
| Growth | Health score (X/100) | Priorities pending | Latest `growth-playbook` generation output |
| Competitor | Competitors analyzed (count) | Last run | `ai_generations` where agent_used = 'competitor-analysis' |

**API endpoint for agent card metrics:**

```
GET /api/projects/[id]/agent-metrics
```

Returns aggregated metrics for all agents in one query (efficient — avoids N+1 requests per card).

```typescript
// Response shape
{
  "seo-audit": { primary: "78/100", secondary: "▲ +12", lastUsed: "2025-02-19T..." },
  "copywriting": { primary: "12 pieces", secondary: null, lastUsed: "2025-02-19T..." },
  "blog-post": { primary: "3 posts", secondary: null, lastUsed: "2025-02-18T..." },
  // ... all agents
}
```

---

## 4. SIDEBAR COMPONENT IMPLEMENTATION

### Zustand Store Update

```typescript
// stores/ui-store.ts — add project expansion state

interface UIState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  expandedProjectIds: string[];      // NEW: which projects are expanded
  
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  toggleProjectExpanded: (id: string) => void;  // NEW
  setProjectExpanded: (id: string, expanded: boolean) => void;  // NEW
}
```

### Sidebar Component Structure

```typescript
// components/layout/sidebar.tsx — updated structure

<aside className={sidebarClasses}>
  {/* Logo */}
  <SidebarLogo collapsed={collapsed} />
  
  {/* Global nav */}
  <SidebarNavItem icon={Home} label="Dashboard" href="/dashboard" />
  
  {/* Projects section */}
  <SidebarSection label="My Projects">
    {projects.map(project => (
      <SidebarProject 
        key={project.id}
        project={project}
        expanded={expandedProjectIds.includes(project.id)}
        onToggle={() => toggleProjectExpanded(project.id)}
        agents={AGENT_REGISTRY}  // Static list of available agents
        currentPath={pathname}
      />
    ))}
    <SidebarNavItem icon={Plus} label="New Project" href="/projects/new" />
  </SidebarSection>
  
  {/* Global tools */}
  <SidebarDivider />
  <SidebarNavItem icon={FlaskConical} label="Playground" href="/playground" />
  <SidebarNavItem icon={Settings} label="Settings" href="/settings" />
  
  {/* Plan indicator */}
  <SidebarPlanBadge plan={profile.plan} usage={profile.generation_count} limit={planLimit} />
</aside>
```

### SidebarProject Sub-Component

```typescript
// components/layout/sidebar-project.tsx

function SidebarProject({ project, expanded, onToggle, agents, currentPath }) {
  return (
    <div>
      {/* Project header — click to toggle */}
      <button onClick={onToggle} className="sidebar-project-header">
        <ChevronRight className={expanded ? 'rotate-90' : ''} />
        <span className="truncate">{project.name}</span>
      </button>
      
      {/* Agent list — only visible when expanded */}
      {expanded && (
        <div className="sidebar-agent-list">
          {agents
            .filter(a => a.status === 'active')
            .map(agent => (
              <SidebarNavItem
                key={agent.id}
                icon={agent.icon}
                label={agent.shortName}  // "SEO Audit" not "SEO Audit Agent" (space)
                href={`/projects/${project.id}/agents/${agent.id}`}
                active={currentPath === `/projects/${project.id}/agents/${agent.id}`}
                indent={true}  // Indented under project
              />
            ))
          }
          {/* Non-agent pages */}
          <SidebarNavItem
            icon={BarChart3}
            label="Analytics"
            href={`/projects/${project.id}/analytics`}
            indent={true}
          />
          <SidebarNavItem
            icon={Settings}
            label="Settings"
            href={`/projects/${project.id}/settings`}
            indent={true}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 5. AGENT REGISTRY (Centralized)

Create a single source of truth for all agents:

```typescript
// lib/ai/agents/registry.ts

export interface AgentDefinition {
  id: string;
  name: string;              // Full name: "SEO Audit Agent"
  shortName: string;         // Sidebar label: "SEO Audit"
  icon: string;              // Lucide icon name or emoji
  description: string;       // One-liner for tooltips and headers
  status: 'active' | 'coming_soon';
  tier: 'free' | 'pro' | 'growth' | 'agency';
  category: 'analysis' | 'creation' | 'strategy' | 'distribution';
  ctaLabel: string;          // Button text: "Run Audit", "Write Post"
  route: string;             // URL segment: "seo-audit", "blog", "keywords"
}

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: 'seo-audit',
    name: 'SEO Audit Agent',
    shortName: 'SEO Audit',
    icon: 'Search',          // Lucide icon
    description: 'Audit your site and get actionable SEO fixes',
    status: 'active',
    tier: 'free',
    category: 'analysis',
    ctaLabel: 'Run Audit',
    route: 'seo-audit',
  },
  {
    id: 'page-cro',
    name: 'CRO Agent',
    shortName: 'CRO',
    icon: 'Target',
    description: 'Optimize landing pages for higher conversion',
    status: 'active',
    tier: 'free',
    category: 'analysis',
    ctaLabel: 'Analyze Page',
    route: 'cro',
  },
  {
    id: 'copywriting',
    name: 'Copywriting Agent',
    shortName: 'Copywriting',
    icon: 'PenTool',
    description: 'Generate conversion-focused marketing copy',
    status: 'active',
    tier: 'free',
    category: 'creation',
    ctaLabel: 'Create Copy',
    route: 'copywriting',
  },
  {
    id: 'social-content',
    name: 'Social Agent',
    shortName: 'Social',
    icon: 'Smartphone',
    description: 'Create platform-optimized social posts',
    status: 'active',
    tier: 'free',
    category: 'creation',
    ctaLabel: 'Create Post',
    route: 'social',
  },
  {
    id: 'email-sequence',
    name: 'Email Agent',
    shortName: 'Email',
    icon: 'Mail',
    description: 'Build automated email sequences',
    status: 'active',
    tier: 'pro',
    category: 'creation',
    ctaLabel: 'Build Sequence',
    route: 'email',
  },
  {
    id: 'content-strategy',
    name: 'Strategy Agent',
    shortName: 'Strategy',
    icon: 'Map',
    description: 'Plan your content calendar and topics',
    status: 'active',
    tier: 'pro',
    category: 'strategy',
    ctaLabel: 'Plan Content',
    route: 'strategy',
  },
  {
    id: 'competitor-analysis',
    name: 'Competitor Agent',
    shortName: 'Competitor',
    icon: 'Flag',
    description: 'Analyze competitor positioning and gaps',
    status: 'active',
    tier: 'pro',
    category: 'analysis',
    ctaLabel: 'Analyze',
    route: 'competitor',
  },
  {
    id: 'blog-post',
    name: 'Blog Agent',
    shortName: 'Blog',
    icon: 'FileText',
    description: 'Write SEO-optimized long-form blog posts',
    status: 'active',
    tier: 'pro',
    category: 'creation',
    ctaLabel: 'Write Post',
    route: 'blog',
  },
  {
    id: 'keyword-research',
    name: 'Keyword Agent',
    shortName: 'Keywords',
    icon: 'Key',
    description: 'Discover and score keyword opportunities',
    status: 'active',
    tier: 'free',           // Basic (autocomplete). Growth for GSC data.
    category: 'strategy',
    ctaLabel: 'Research',
    route: 'keywords',
  },
  {
    id: 'growth-playbook',
    name: 'Growth Agent',
    shortName: 'Growth',
    icon: 'TrendingUp',
    description: 'Get a prioritized, data-driven marketing plan',
    status: 'active',
    tier: 'growth',
    category: 'strategy',
    ctaLabel: 'View Playbook',
    route: 'growth',
  },
  // --- Coming Soon ---
  {
    id: 'campaigns',
    name: 'Campaign Agent',
    shortName: 'Campaigns',
    icon: 'Zap',
    description: 'Orchestrate multi-step marketing campaigns',
    status: 'coming_soon',
    tier: 'pro',
    category: 'distribution',
    ctaLabel: 'Build Campaign',
    route: 'campaigns',
  },
  {
    id: 'calendar',
    name: 'Calendar Agent',
    shortName: 'Calendar',
    icon: 'Calendar',
    description: 'Schedule and manage content publishing',
    status: 'coming_soon',
    tier: 'pro',
    category: 'distribution',
    ctaLabel: 'View Calendar',
    route: 'calendar',
  },
  {
    id: 'ab-test-setup',
    name: 'A/B Test Agent',
    shortName: 'A/B Tests',
    icon: 'GitBranch',
    description: 'Design and analyze marketing experiments',
    status: 'coming_soon',
    tier: 'growth',
    category: 'analysis',
    ctaLabel: 'Design Test',
    route: 'ab-test',
  },
];

// Helper functions
export function getAgent(id: string) {
  return AGENT_REGISTRY.find(a => a.id === id);
}

export function getActiveAgents() {
  return AGENT_REGISTRY.filter(a => a.status === 'active');
}

export function getAgentsByCategory(category: AgentDefinition['category']) {
  return AGENT_REGISTRY.filter(a => a.category === category);
}

export function getAgentsForTier(tier: string) {
  const tierOrder = ['free', 'pro', 'growth', 'agency'];
  const tierIndex = tierOrder.indexOf(tier);
  return AGENT_REGISTRY.filter(a => tierOrder.indexOf(a.tier) <= tierIndex);
}
```

---

## 6. UPDATED DIRECTORY STRUCTURE (Agent-Centric)

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── projects/
│   │   │   └── [id]/
│   │   │       ├── page.tsx                    # Project overview (agent card grid)
│   │   │       ├── analytics/page.tsx          # Impact dashboard
│   │   │       ├── settings/page.tsx           # Project settings
│   │   │       └── agents/                     # NEW: agent routes
│   │   │           ├── seo-audit/page.tsx      # Was: /audit
│   │   │           ├── cro/page.tsx            # Was: embedded in content
│   │   │           ├── copywriting/page.tsx    # Was: embedded in content
│   │   │           ├── social/page.tsx         # Was: embedded in content
│   │   │           ├── email/page.tsx          # Was: embedded in content
│   │   │           ├── strategy/page.tsx       # Was: embedded in content
│   │   │           ├── competitor/page.tsx     # Was: embedded in content
│   │   │           ├── blog/page.tsx           # NEW
│   │   │           ├── keywords/page.tsx       # NEW
│   │   │           ├── growth/page.tsx         # NEW
│   │   │           └── layout.tsx              # Shared agent page layout
│   │   │                                       # (header with agent name + project context)
│   │
│   ├── api/
│   │   ├── projects/
│   │   │   └── [id]/
│   │   │       ├── agent-metrics/route.ts      # NEW: aggregated metrics for all agent cards
│   │   │       └── ...existing routes
│
├── lib/
│   ├── ai/
│   │   ├── agents/                             # Renamed from skills/
│   │   │   ├── registry.ts                     # NEW: centralized agent definitions
│   │   │   ├── index.ts                        # Re-exports all agents
│   │   │   ├── seo-audit.ts
│   │   │   ├── page-cro.ts
│   │   │   ├── copywriting.ts
│   │   │   ├── social-content.ts
│   │   │   ├── email-sequence.ts
│   │   │   ├── content-strategy.ts
│   │   │   ├── competitor-analysis.ts
│   │   │   ├── blog-post.ts
│   │   │   ├── keyword-research.ts
│   │   │   └── growth-playbook.ts
│   │   ├── orchestrator.ts
│   │   └── prompt-builder.ts
│
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                         # UPDATED: expandable project tree
│   │   ├── sidebar-project.tsx                 # NEW: project expansion component
│   │   ├── sidebar-plan-badge.tsx              # NEW: plan + usage indicator
│   │   └── agent-page-header.tsx               # NEW: shared header for agent pages
│   ├── dashboard/
│   │   ├── agent-card.tsx                      # NEW: agent card for project overview
│   │   └── agent-card-grid.tsx                 # NEW: responsive grid of agent cards
```

---

## 7. CONTENT STUDIO → MULTI-AGENT WORKSPACE

The old "Content Studio" page (`/projects/[id]/content`) combined all content-creation skills into one page with a skill selector dropdown. With the agent redesign, each creation agent gets its own page.

However, the Copywriting Agent, Social Agent, and Email Agent pages should share a similar workspace layout:

```
┌─────────────────────────────────────────────────────────────┐
│ Agent Header (icon + name + project)                        │
├─────────────────────────────┬───────────────────────────────┤
│ INPUT PANEL                 │ OUTPUT PANEL                  │
│                             │                               │
│ Brief/prompt textarea       │ Generated content             │
│                             │ (streaming)                   │
│ Context indicators:         │                               │
│ ✓ Brand voice loaded        │ Channel previews:             │
│ ✓ Audience context          │ [X] [LinkedIn] [Email] [Raw]  │
│ ✓ 23 keywords available     │                               │
│                             │ [Copy] [Save Draft] [Regen]   │
├─────────────────────────────┴───────────────────────────────┤
│ SAVED OUTPUTS                                               │
│ Previous generations from this agent, most recent first     │
└─────────────────────────────────────────────────────────────┘
```

This replaces the old skill-selector dropdown. Each agent is its own focused workspace.

---

## 8. IMPLEMENTATION ORDER FOR CLAUDE CODE

**Session priority — do these in order:**

### Step 1: File Renames & Database (30 min)
```bash
# 1. Rename directory
mv src/lib/ai/skills/ src/lib/ai/agents/

# 2. Global find-replace in all .ts/.tsx files:
#    SkillConfig → AgentConfig
#    SkillOutput → AgentOutput
#    skill_used → agent_used (in code referencing the column)
#    getSkill → getAgent
#    skillRegistry → agentRegistry
#    /skills/ → /agents/ (in import paths)
#    "skill" → "agent" (in UI strings — be careful, review each)

# 3. Database migration
ALTER TABLE ai_generations RENAME COLUMN skill_used TO agent_used;

# 4. Create registry.ts with AGENT_REGISTRY
```

### Step 2: URL Route Migration (30 min)
```
# Create src/app/(dashboard)/projects/[id]/agents/ directory
# Move existing page components:
#   audit/page.tsx → agents/seo-audit/page.tsx
#   content/page.tsx → split into agents/copywriting/, agents/social/, etc.
#   blog/page.tsx → agents/blog/page.tsx (if exists)
# Create agents/layout.tsx (shared agent page header)
# Update all internal links and router.push() calls
```

### Step 3: Sidebar Redesign (1 hour)
```
# Update sidebar.tsx with expandable project tree
# Create sidebar-project.tsx sub-component
# Create sidebar-plan-badge.tsx
# Update Zustand UI store with expandedProjectIds
# Test collapsed/expanded states
# Test mobile behavior
```

### Step 4: Project Overview Redesign (1 hour)
```
# Rebuild /projects/[id]/page.tsx with agent card grid
# Create agent-card.tsx component
# Create agent-card-grid.tsx (responsive grid)
# Create GET /api/projects/[id]/agent-metrics endpoint
# Wire metrics to cards
# Style with Mineral design system
```

### Step 5: UI Label Updates (20 min)
```
# Landing page: "skills" → "agents", update hero copy
# Pricing page: update feature lists
# Playground: "Select a skill" → "Choose an Agent"
# All page headers referencing "skills"
```

---

## 9. THINGS TO NOT DO

1. **Don't make agents feel like chat interfaces.** Okara's agents are essentially chat prompts. Conduikt's agents are purpose-built workspaces with structured inputs and outputs. The word "agent" is branding — the UX stays as structured forms + results panels, not chatboxes.

2. **Don't give each agent its own independent landing/marketing page** (like Okara does with /agent/seo). That's for a platform selling agents individually. Conduikt sells a unified platform. The marketing site talks about "10 AI Marketing Agents" as a collective — individual agent pages are inside the authenticated dashboard only.

3. **Don't add an "Agent Store" or "Agent Marketplace."** You're not a platform for other people's agents. You build the agents. Keep it focused.

4. **Don't break existing functionality during the rename.** The underlying AgentConfig objects, prompt builders, and API routes work the same. This is a naming + navigation refactor, not a feature rebuild.

---

*This addendum should be applied alongside SYSTEM_ARCHITECTURE_v2.md. Feed both documents to Claude Code for the next build session.*
