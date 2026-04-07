import { describe, it, expect } from 'vitest'
import { buildProjectContext } from '@/src/lib/ai/prompt-builder'

describe('AI Context Builder', () => {
  const baseProject = {
    name: 'Test Project',
    website_url: 'https://example.com',
    description: 'A test project description',
    target_audience: null,
    value_proposition: 'Makes testing easy',
    brand_voice: null,
    competitors: null,
    keywords: null,
  }

  it('builds context without throwing when project has minimal data', () => {
    const context = buildProjectContext(baseProject)
    expect(context).toBeDefined()
    expect(context.name).toBe('Test Project')
    expect(context.websiteUrl).toBe('https://example.com')
  })

  it('injects target_audience when present', () => {
    const project = {
      ...baseProject,
      target_audience: { personas: ['Developers'], pain_points: ['Slow testing'] },
    }
    const context = buildProjectContext(project)
    expect(context.targetAudience).toBeDefined()
    expect(context.targetAudience?.personas).toContain('Developers')
  })

  it('injects value_proposition when present', () => {
    const context = buildProjectContext(baseProject)
    expect(context.valueProposition).toBe('Makes testing easy')
  })

  it('does NOT inject undefined or null values as strings', () => {
    const project = {
      ...baseProject,
      description: null,
      target_audience: null,
      brand_voice: null,
    }
    const context = buildProjectContext(project)
    expect(context.description).toBeUndefined()
    // target_audience and brand_voice are cast with `as`, so null passes through
    expect(context.targetAudience).toBeNull()
    expect(context.brandVoice).toBeNull()
  })

  it('handles null website_url gracefully', () => {
    const project = { ...baseProject, website_url: null }
    const context = buildProjectContext(project)
    expect(context.websiteUrl).toBe('')
  })

  it('passes competitors array through correctly', () => {
    const project = {
      ...baseProject,
      competitors: [{ name: 'Rival', url: 'https://rival.com', strengths: ['Speed'] }],
    }
    const context = buildProjectContext(project)
    expect(context.competitors).toHaveLength(1)
    expect(context.competitors![0].name).toBe('Rival')
  })

  it('passes keywords array through correctly', () => {
    const project = {
      ...baseProject,
      keywords: [{ term: 'marketing automation', volume: 5000, difficulty: 60 }],
    }
    const context = buildProjectContext(project)
    expect(context.keywords).toHaveLength(1)
    expect(context.keywords![0].term).toBe('marketing automation')
  })

  it('brandVoice is passed through when present', () => {
    const project = {
      ...baseProject,
      brand_voice: { tone: 'professional', dos: ['Be clear'], donts: ['Jargon'] },
    }
    const context = buildProjectContext(project)
    expect(context.brandVoice).toBeDefined()
    expect(context.brandVoice?.tone).toBe('professional')
  })
})
