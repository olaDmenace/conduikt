import type { ProjectContext } from '@/src/lib/ai/agents/types'

// Standard mock project context used across all agent tests
export const mockProjectContext: ProjectContext = {
  name: 'TestCo',
  websiteUrl: 'https://testco.com',
  description: 'A SaaS tool for developers',
  targetAudience: {
    personas: ['Solo founders', 'Small dev teams'],
    pain_points: ['Slow marketing workflows', 'No time for content creation'],
  },
  valueProposition: 'Automates repetitive engineering tasks so devs ship faster',
  industry: 'SaaS / Developer Tools',
  competitors: [
    { name: 'Linear', url: 'https://linear.app', strengths: ['Great UX', 'Fast'] },
    { name: 'Jira', url: 'https://jira.com', strengths: ['Enterprise features'] },
  ],
  keywords: [
    { term: 'marketing automation', volume: 5000, difficulty: 60 },
    { term: 'ai marketing tool', volume: 2000, difficulty: 45 },
  ],
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
