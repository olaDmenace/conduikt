# Conduikt — Per-Agent Test Suite
**For:** Claude Code  
**Scope:** Individual agent prompt builders, output parsers, and schema validation  
**Prerequisite:** The main test suite (192 tests) must already be passing before running this  
**Add to:** `src/__tests__/unit/agents/` (new directory)

---

## Why This Exists

The existing `ai-generate.test.ts` only checks that agents generate without throwing.
It does NOT verify:
- Each agent's prompt builder injects the correct project context
- Each agent's output parser handles the expected JSON schema
- Each agent's output parser handles malformed/incomplete AI responses gracefully
- Plan gating is enforced per agent (free vs pro vs growth vs agency)
- Required input fields are validated per agent

This file adds a dedicated test file per agent. There are 11 active agents.

---

## Setup — Shared Agent Test Helper

Create `src/__tests__/helpers/agent-test-helper.ts`:

```typescript
import { vi } from 'vitest'
import type { ProjectContext } from '@/lib/ai/agents/types'

// Standard mock project context used across all agent tests
export const mockProjectContext: ProjectContext = {
  name: 'TestCo',
  websiteUrl: 'https://testco.com',
  description: 'A SaaS tool for developers',
  targetAudience: 'Solo founders and small dev teams',
  valueProposition: 'Automates repetitive engineering tasks so devs ship faster',
  industry: 'SaaS / Developer Tools',
  competitors: 'Linear, Jira, Notion',
  performanceContext: 'Your best X post got 1,200 impressions: "We just shipped dark mode". Mirror this casual, direct tone.',
}

// Minimal context — used to test graceful handling of missing fields
export const minimalProjectContext: ProjectContext = {
  name: 'MinimalCo',
  websiteUrl: 'https://minimal.co',
}

// Simulates what happens when the AI returns a malformed JSON response
export function malformedJsonResponse(partial: string) {
  return `Here is your content: ${partial}` // no JSON fences, no valid structure
}

// Simulates a valid JSON response wrapped in markdown code fences (common Claude output)
export function wrappedJsonResponse(obj: unknown) {
  return `\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\``
}

// Simulates a raw JSON response (no fences)
export function rawJsonResponse(obj: unknown) {
  return JSON.stringify(obj)
}
```

---

## FILE 1: `src/__tests__/unit/agents/seo-audit.agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { seoAuditAgent } from '@/lib/ai/agents/seo-audit'
import { mockProjectContext, minimalProjectContext, wrappedJsonResponse, rawJsonResponse } from '../../helpers/agent-test-helper'

describe('SEO Audit Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes the project name in the system prompt')
    it('includes the website URL in the system prompt')
    it('includes target audience when provided')
    it('does not throw when targetAudience is undefined')
    it('includes performance context when provided')
    it('instructs the AI to return valid JSON')
    it('system prompt length is under 3000 characters')
  })

  describe('buildUserPrompt', () => {
    it('includes the URL from input')
    it('includes fetched page content when provided in input')
    it('returns a non-empty string')
  })

  describe('parseResponse', () => {
    it('parses valid JSON with score, findings, recommendations fields')
    it('parses JSON wrapped in markdown code fences')
    it('score is a number between 0 and 100')
    it('findings is an array with at least 1 item')
    it('each finding has title and severity fields')
    it('severity is one of: high | medium | low | info')
    it('throws a descriptive error when JSON is completely malformed')
    it('handles missing recommendations field gracefully (defaults to empty array)')
    it('handles score of 0 without throwing')
    it('handles score of 100 without throwing')
  })
})
```

---

## FILE 2: `src/__tests__/unit/agents/copywriting.agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { copywritingAgent } from '@/lib/ai/agents/copywriting'
import { mockProjectContext, minimalProjectContext } from '../../helpers/agent-test-helper'

describe('Copywriting Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes brand voice instructions')
    it('includes value proposition when provided')
    it('includes target audience when provided')
    it('includes competitor context when provided')
    it('adapts tone when performanceContext is provided')
    it('system prompt does not contain undefined or null as literal strings')
  })

  describe('buildUserPrompt', () => {
    it('includes the copyType from input (headline, tagline, cta, etc.)')
    it('includes the product description from input')
    it('includes tone preference when provided')
    it('handles missing optional fields without throwing')
  })

  describe('parseResponse', () => {
    it('parses response with copy field')
    it('parses response with multiple variants array')
    it('strips markdown formatting from copy output')
    it('returns copy as a non-empty string')
    it('handles plain text response (no JSON) without throwing')
  })
})
```

---

## FILE 3: `src/__tests__/unit/agents/social-content.agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { socialContentAgent } from '@/lib/ai/agents/social-content'
import { mockProjectContext, wrappedJsonResponse, rawJsonResponse } from '../../helpers/agent-test-helper'

// Mock response matching the expected social content schema
const mockSocialResponse = {
  posts: [
    {
      platform: 'x',
      content: 'Just shipped dark mode. Your eyes will thank you. 🌙',
      hashtags: ['#buildinpublic', '#saas'],
      characterCount: 58,
    },
    {
      platform: 'linkedin',
      content: 'Excited to announce that we just shipped dark mode for TestCo...',
      hashtags: ['#saas', '#productupdate'],
      characterCount: 245,
    },
  ],
}

describe('Social Content Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes platform-specific character limits in the prompt')
    it('X character limit is 280')
    it('includes performance context to guide tone and style')
    it('includes brand voice from project context')
  })

  describe('buildUserPrompt', () => {
    it('includes the topic/brief from input')
    it('includes selected platforms from input')
    it('includes post count preference when provided')
  })

  describe('parseResponse', () => {
    it('parses posts array from JSON response')
    it('each post has platform, content, and characterCount fields')
    it('X posts never exceed 280 characters after parsing')
    it('handles wrapped JSON (markdown fences) correctly')
    it('handles raw JSON correctly')
    it('returns at least 1 post when AI returns valid response')
    it('throws descriptive error when posts array is missing from response')
    it('filters out posts where content is empty string')
  })

  describe('Platform validation', () => {
    it('platform field is x or linkedin (not twitter)')
    it('does not include platforms not requested in input')
  })
})
```

---

## FILE 4: `src/__tests__/unit/agents/blog-post.agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { blogPostAgent } from '@/lib/ai/agents/blog-post'
import { mockProjectContext, wrappedJsonResponse } from '../../helpers/agent-test-helper'

const mockBlogResponse = {
  title: 'How to Automate Your Marketing in 2025',
  metaTitle: 'Marketing Automation Guide 2025 | TestCo',
  metaDescription: 'Learn how to automate your marketing stack and save 20 hours per week.',
  content: '# How to Automate Your Marketing\n\nMarketing automation is...',
  internalLinkSuggestions: ['Link to /features page', 'Link to /pricing page'],
  socialSnippets: {
    x: 'Marketing automation in 2025: here\'s what actually works 🧵',
    linkedin: 'We just published a guide on marketing automation...',
    emailSubject: '5 marketing tasks you should automate today',
  },
  targetKeyword: 'marketing automation',
  wordCount: 1200,
}

describe('Blog Post Agent', () => {
  describe('buildSystemPrompt', () => {
    it('instructs AI to output SEO-optimized content')
    it('includes target keyword instructions when keyword provided in context')
    it('instructs AI to include meta title and meta description')
    it('instructs AI to suggest internal links')
    it('includes word count target from input')
    it('system prompt includes project name for brand voice')
  })

  describe('buildUserPrompt', () => {
    it('includes topic from input')
    it('includes target keyword when provided')
    it('includes word count preference')
    it('includes source content when provided (e.g. existing notes)')
  })

  describe('parseResponse', () => {
    it('parses all required fields: title, metaTitle, metaDescription, content')
    it('content field is a non-empty markdown string')
    it('metaDescription is under 160 characters')
    it('metaTitle is under 60 characters')
    it('socialSnippets object has x, linkedin, emailSubject fields')
    it('x snippet is under 280 characters')
    it('internalLinkSuggestions is an array (can be empty)')
    it('wordCount is a positive integer')
    it('handles response where socialSnippets is missing (defaults to empty object)')
    it('handles response where internalLinkSuggestions is missing (defaults to [])')
    it('throws when title or content is missing from response')
  })
})
```

---

## FILE 5: `src/__tests__/unit/agents/keyword-research.agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { keywordResearchAgent } from '@/lib/ai/agents/keyword-research'
import { mockProjectContext, wrappedJsonResponse } from '../../helpers/agent-test-helper'

const mockKeywordResponse = {
  primaryKeywords: [
    {
      keyword: 'marketing automation software',
      intent: 'transactional',
      difficulty: 'medium',
      opportunityScore: 78,
      contentType: 'landing-page',
      isQuickWin: false,
    },
  ],
  longTailKeywords: [
    {
      keyword: 'best marketing automation for startups',
      intent: 'informational',
      difficulty: 'low',
      opportunityScore: 85,
      contentType: 'blog',
      isQuickWin: true,
    },
  ],
  questions: ['What is marketing automation?', 'How does marketing automation work?'],
  contentClusters: [
    {
      pillarTopic: 'Marketing Automation',
      supportingTopics: ['Email automation', 'Social media automation', 'SEO automation'],
    },
  ],
}

describe('Keyword Research Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes project industry context')
    it('includes target audience to contextualise keyword relevance')
    it('instructs AI to score opportunity as integer 0-100')
    it('instructs AI to classify intent as informational|transactional|navigational|commercial')
    it('instructs AI to flag quick wins (low difficulty, rank 8-20 potential)')
  })

  describe('parseResponse', () => {
    it('parses primaryKeywords array')
    it('parses longTailKeywords array')
    it('parses questions array')
    it('parses contentClusters array')
    it('each keyword has: keyword, intent, difficulty, opportunityScore, contentType, isQuickWin')
    it('opportunityScore is an integer between 0 and 100')
    it('difficulty is one of: low | medium | high')
    it('intent is one of: informational | transactional | navigational | commercial')
    it('isQuickWin is a boolean')
    it('handles empty primaryKeywords array without throwing')
    it('handles missing questions field (defaults to [])')
    it('handles missing contentClusters field (defaults to [])')
  })
})
```

---

## FILE 6: `src/__tests__/unit/agents/growth-playbook.agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { growthPlaybookAgent } from '@/lib/ai/agents/growth-playbook'
import { mockProjectContext } from '../../helpers/agent-test-helper'

const mockPlaybookResponse = {
  healthScore: 62,
  phases: [
    {
      phase: 1,
      title: 'Foundation',
      duration: '30 days',
      actions: [
        {
          title: 'Fix critical SEO issues',
          description: 'Address the 3 high-severity findings from your audit',
          effort: 'low',
          impact: 'high',
          route: '/projects/[id]/audit',
          isQuickWin: true,
        },
      ],
    },
    { phase: 2, title: 'Momentum', duration: '30 days', actions: [] },
    { phase: 3, title: 'Scale', duration: '30 days', actions: [] },
  ],
  goals: [
    { metric: 'SEO Score', current: 62, target: 80 },
  ],
  week1Checklist: ['Run full SEO audit', 'Publish first blog post', 'Connect GSC'],
  strategyGaps: ['No email marketing in place', 'Missing blog content strategy'],
}

describe('Growth Playbook Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes audit score data when audits are available')
    it('includes content velocity data (generations per week)')
    it('includes keyword data when available')
    it('instructs AI to produce exactly 3 phases')
    it('instructs AI to return healthScore as integer 0-100')
    it('prompts for actionable, specific recommendations (not generic advice)')
  })

  describe('parseResponse', () => {
    it('parses healthScore as integer 0-100')
    it('phases array has exactly 3 items')
    it('each phase has: phase (number), title, duration, actions array')
    it('each action has: title, description, effort, impact, route, isQuickWin')
    it('effort is one of: low | medium | high')
    it('impact is one of: low | medium | high')
    it('route field is a valid internal path string')
    it('week1Checklist is an array of strings')
    it('strategyGaps is an array of strings')
    it('goals array has metric, current, target fields')
    it('handles missing strategyGaps (defaults to [])')
    it('handles missing week1Checklist (defaults to [])')
    it('throws when phases array is missing or not length 3')
  })
})
```

---

## FILE 7: `src/__tests__/unit/agents/email-sequence.agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { emailSequenceAgent } from '@/lib/ai/agents/email-sequence'
import { mockProjectContext, wrappedJsonResponse } from '../../helpers/agent-test-helper'

const mockEmailResponse = {
  sequenceName: 'Welcome Series',
  emails: [
    {
      position: 1,
      subject: 'Welcome to TestCo — here\'s what to do first',
      preview: 'You just made a great decision...',
      body: '# Welcome!\n\nThanks for joining...',
      sendDelay: 0,
      sendDelayUnit: 'immediately',
    },
    {
      position: 2,
      subject: 'Your first win with TestCo',
      preview: 'Quick tip to get started...',
      body: '# Quick tip\n\nHere\'s how to...',
      sendDelay: 2,
      sendDelayUnit: 'days',
    },
  ],
}

describe('Email Sequence Agent', () => {
  describe('parseResponse', () => {
    it('parses sequenceName field')
    it('parses emails array with correct structure')
    it('each email has: position, subject, preview, body, sendDelay, sendDelayUnit')
    it('position values are sequential integers starting at 1')
    it('sendDelayUnit is one of: immediately | hours | days | weeks')
    it('subject is a non-empty string')
    it('body is a non-empty string (markdown)')
    it('handles sequence with 1 email')
    it('handles sequence with 7 emails')
    it('throws when emails array is empty')
  })

  describe('buildUserPrompt', () => {
    it('includes sequenceType from input (welcome, nurture, re-engagement, etc.)')
    it('includes email count from input')
    it('includes goal from input')
  })
})
```

---

## FILE 8: `src/__tests__/unit/agents/competitor-analysis.agent.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { competitorAnalysisAgent } from '@/lib/ai/agents/competitor-analysis'
import { mockProjectContext, wrappedJsonResponse } from '../../helpers/agent-test-helper'

const mockCompetitorResponse = {
  competitorName: 'Jasper',
  competitorUrl: 'https://jasper.ai',
  strengths: ['Large content template library', 'Strong brand recognition'],
  weaknesses: ['No SEO audit', 'No publishing pipeline'],
  keywordOverlap: ['ai marketing', 'content generation', 'copywriting tool'],
  contentGaps: ['Technical SEO guides', 'Agency-focused content'],
  positioningOpportunity: 'Conduikt can own the "audit-first" positioning that Jasper ignores entirely.',
  estimatedDomainAuthority: 72,
}

describe('Competitor Analysis Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes the user\'s own product name and value proposition for comparison')
    it('includes the user\'s target audience')
    it('does NOT rely solely on the competitor URL — must use fetched page content')
  })

  describe('buildUserPrompt', () => {
    it('includes competitor page content (not just URL) in the prompt')
    it('throws or warns when pageContent is empty or missing')
  })

  describe('parseResponse', () => {
    it('parses strengths array')
    it('parses weaknesses array')
    it('parses keywordOverlap array')
    it('parses contentGaps array')
    it('parses positioningOpportunity string')
    it('estimatedDomainAuthority is a number between 0 and 100 or null')
    it('handles missing estimatedDomainAuthority (defaults to null)')
    it('strengths and weaknesses arrays are non-empty')
  })
})
```

---

## FILE 9: `src/__tests__/unit/agents/page-cro.agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { pageCroAgent } from '@/lib/ai/agents/page-cro'
import { mockProjectContext, wrappedJsonResponse } from '../../helpers/agent-test-helper'

const mockCroResponse = {
  overallScore: 58,
  findings: [
    {
      area: 'Hero Section',
      issue: 'CTA button is below the fold on mobile',
      severity: 'high',
      fix: 'Move the primary CTA above the fold on all breakpoints',
      estimatedImpact: '+8-15% conversion rate',
    },
  ],
  quickWins: ['Add social proof count near CTA', 'Increase CTA button contrast ratio'],
  testSuggestions: ['A/B test headline copy', 'Test button colour'],
}

describe('Page CRO Agent', () => {
  describe('parseResponse', () => {
    it('parses overallScore as integer 0-100')
    it('parses findings array')
    it('each finding has: area, issue, severity, fix fields')
    it('severity is one of: high | medium | low')
    it('parses quickWins array of strings')
    it('parses testSuggestions array of strings')
    it('handles missing testSuggestions (defaults to [])')
    it('handles missing quickWins (defaults to [])')
    it('throws when findings array is missing')
  })
})
```

---

## FILE 10: `src/__tests__/unit/agents/content-strategy.agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { contentStrategyAgent } from '@/lib/ai/agents/content-strategy'
import { mockProjectContext, wrappedJsonResponse } from '../../helpers/agent-test-helper'

const mockStrategyResponse = {
  themes: [
    { theme: 'Marketing Automation', rationale: 'Core product use case, high search demand' },
    { theme: 'Founder Stories', rationale: 'Build community, high engagement on social' },
  ],
  contentCalendar: [
    {
      week: 1,
      items: [
        { type: 'blog', topic: 'How to automate your first marketing task', channel: 'blog' },
        { type: 'social', topic: '3 things I wish I knew about marketing', channel: 'x' },
      ],
    },
  ],
  channelStrategy: {
    x: 'Daily build-in-public posts, 3 threads per week',
    linkedin: 'Weekly thought leadership, product updates',
    email: 'Bi-weekly newsletter with marketing tips',
    blog: '2 SEO-optimized posts per month',
  },
  kpis: ['Organic traffic +30% in 90 days', '500 newsletter subscribers'],
}

describe('Content Strategy Agent', () => {
  describe('parseResponse', () => {
    it('parses themes array with theme and rationale fields')
    it('parses contentCalendar array with week and items fields')
    it('each calendar item has: type, topic, channel fields')
    it('parses channelStrategy object')
    it('parses kpis array of strings')
    it('handles missing channelStrategy (defaults to empty object)')
    it('handles missing kpis (defaults to [])')
    it('themes array has at least 1 item')
  })

  describe('buildSystemPrompt', () => {
    it('includes active channels from project context')
    it('includes content output frequency from onboarding answers when available')
  })
})
```

---

## FILE 11: `src/__tests__/unit/agents/video-script.agent.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { videoScriptAgent } from '@/lib/ai/agents/video-script'
import { mockProjectContext, wrappedJsonResponse } from '../../helpers/agent-test-helper'

const mockVideoScriptResponse = {
  script: 'Full narration text for the presenter...',
  voiceover_script: 'Tired of spending 20 hours a week on marketing? TestCo automates it for you.',
  scenes: [
    {
      duration: '4s',
      visual: 'Abstract motion graphic — text appearing: "20 hours/week wasted on marketing?"',
      text_overlay: '20 hours/week',
      voiceover: 'Tired of spending 20 hours a week on marketing?',
    },
    {
      duration: '6s',
      visual: 'Product UI animation showing the dashboard',
      text_overlay: 'Meet TestCo',
      voiceover: 'TestCo automates your entire marketing stack.',
    },
  ],
  hook: 'Tired of spending 20 hours a week on marketing?',
  cta: 'Start free at testco.com',
  style: 'Minimal, professional, dark background with amber accents',
  platforms: ['linkedin', 'youtube_shorts'],
}

describe('Video Script Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes the scene consistency warning (no recurring human characters)')
    it('includes project name and website URL')
    it('includes performance context when available')
    it('instructs AI to output voiceover_script as a separate field from scenes')
  })

  describe('buildUserPrompt', () => {
    it('includes topic/brief from input')
    it('adjusts word count instruction based on adLength: short = 80-100 words')
    it('adjusts word count instruction based on adLength: standard = 150-180 words')
    it('adjusts word count instruction based on adLength: long = 220-260 words')
    it('includes source content when provided')
  })

  describe('parseResponse', () => {
    it('parses voiceover_script as a non-empty string')
    it('parses scenes array with at least 2 scenes')
    it('each scene has: duration, visual, text_overlay, voiceover fields')
    it('duration field is a string with time unit (e.g. "4s", "10s")')
    it('parses hook as non-empty string')
    it('parses cta as non-empty string')
    it('parses platforms array')
    it('visual descriptions do NOT reference a recurring named character across scenes')
    it('handles missing platforms (defaults to ["linkedin", "youtube_shorts"])')
    it('throws when scenes array is empty')
    it('throws when voiceover_script is missing')
  })

  describe('Scene consistency validation', () => {
    it('no scene visual description contains "same person" or "same woman" or "same man"')
    it('scenes with type hook use abstract or text-based visuals, not live actors')
  })
})
```

---

## FILE 12: `src/__tests__/unit/agents/agent-registry.test.ts`

Test the registry itself — the source of truth for all agent metadata.

```typescript
import { describe, it, expect } from 'vitest'
import {
  AGENT_REGISTRY,
  getAgentDefinition,
  getActiveAgents,
  getAgentsByCategory,
  getAgentsForTier,
} from '@/lib/ai/agents/registry'

describe('Agent Registry', () => {
  describe('Registry completeness', () => {
    const expectedActiveAgents = [
      'seo-audit', 'page-cro', 'copywriting', 'social-content',
      'email-sequence', 'content-strategy', 'competitor-analysis',
      'blog-post', 'keyword-research', 'growth-playbook', 'video-ad',
      'campaigns', 'calendar',
    ]

    expectedActiveAgents.forEach(agentId => {
      it(`${agentId} exists in the registry`)
      it(`${agentId} has status active`)
      it(`${agentId} has a non-empty name`)
      it(`${agentId} has a non-empty description`)
      it(`${agentId} has a valid route (non-empty string)`)
      it(`${agentId} has a valid tier (free | pro | growth | agency)`)
      it(`${agentId} has a valid category (creation | strategy | analysis | distribution)`)
    })
  })

  describe('getAgentDefinition', () => {
    it('returns the correct agent for a valid id')
    it('returns undefined for an unknown id')
    it('is case-sensitive (seo-AUDIT returns undefined)')
  })

  describe('getActiveAgents', () => {
    it('returns only agents with status: active')
    it('does not include coming_soon agents')
    it('video-ad is included (status was changed from coming_soon to active)')
  })

  describe('getAgentsForTier', () => {
    it('free tier returns only agents with tier: free')
    it('pro tier returns free + pro agents')
    it('growth tier returns free + pro + growth agents')
    it('agency tier returns all agents')
    it('video-ad is only available for growth and agency')
    it('keyword-research is available on free tier')
  })

  describe('Registry invariants', () => {
    it('no two agents have the same id')
    it('no two agents have the same route')
    it('all icon values exist in the Lucide icon set (check against known icon names)')
    it('ctaLabel is a non-empty string for every agent')
  })
})
```

---

## Running the New Tests

After writing all 12 files, run:

```bash
npm run test:run
```

All previous 192 tests plus the new agent tests must pass. Expected new test count: approximately 150 additional tests across the 12 files.

Then run coverage again:

```bash
npm run test:coverage
```

The agent registry and agent prompt/parser files should now show significantly higher coverage. Target:
- `src/lib/ai/agents/*.ts` — > 85% line coverage
- `src/lib/ai/agents/registry.ts` — 100% line coverage

Report the final total test count and updated coverage table when done.

---

## Important Implementation Note for Claude Code

For each agent test file, you will need to import the actual agent config object from the source file. If the agent config's `buildSystemPrompt`, `buildUserPrompt`, and `parseResponse` methods are not exported as standalone testable functions — and are instead embedded in a class or closure — refactor them to be independently importable pure functions. 

Example pattern that IS testable:
```typescript
// src/lib/ai/agents/seo-audit.ts
export const seoAuditAgent: AgentConfig = {
  buildSystemPrompt: (ctx) => `...`,  // pure function, testable
  buildUserPrompt: (input) => `...`,  // pure function, testable
  parseResponse: (raw) => { ... },    // pure function, testable
}
```

Example pattern that is NOT testable without modification:
```typescript
class SeoAuditAgent {
  private buildPrompt() { ... }  // private, untestable
}
```

If the latter pattern is found in any agent file, refactor to the exported pure function pattern before writing tests.

---

*Feed this document to Claude Code after the main 192-test suite is confirmed passing. Run tests in strict file order. All 204+ tests must pass before running coverage.*
