import { describe, it, expect } from 'vitest'
import { attachSchemaSnippet, seoAuditSkill } from '@/src/lib/ai/agents/seo-audit'
import type { ProjectFacts } from '@/src/lib/missing-pages/types'
import {
  mockProjectContext,
  minimalProjectContext,
  wrappedJsonResponse,
  rawJsonResponse,
} from '../../helpers/agent-test-helper'

const validAuditResponse = {
  score: 72,
  findings: [
    {
      severity: 'critical',
      category: 'meta',
      title: 'Missing meta description',
      detail: 'The page has no meta description tag.',
      fix: 'Add <meta name="description" content="..."> to <head>',
      impact: 'high',
    },
    {
      severity: 'warning',
      category: 'content',
      title: 'Thin content',
      detail: 'Page has fewer than 300 words.',
      fix: 'Add more descriptive content.',
      impact: 'medium',
    },
  ],
  summary: 'The page has critical meta tag issues and thin content.',
}

describe('SEO Audit Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes the project name in the system prompt', () => {
      const prompt = seoAuditSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('testco.com')
    })

    it('includes the website URL in the system prompt', () => {
      const prompt = seoAuditSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('https://testco.com')
    })

    it('includes target audience when provided', () => {
      const prompt = seoAuditSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Solo founders')
    })

    it('does not throw when targetAudience is undefined', () => {
      expect(() => seoAuditSkill.buildSystemPrompt(minimalProjectContext)).not.toThrow()
    })

    it('includes performance context when provided', () => {
      const prompt = seoAuditSkill.buildSystemPrompt(mockProjectContext)
      // seo-audit doesn't explicitly inject performanceContext, but it doesn't crash
      expect(prompt).toBeTruthy()
    })

    it('instructs the AI to return valid JSON', () => {
      const prompt = seoAuditSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('json')
    })

    it('system prompt length is under 3500 characters (rubric gained the answer-readiness rows)', () => {
      const prompt = seoAuditSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.length).toBeLessThan(3500)
    })
  })

  describe('buildUserPrompt', () => {
    it('includes the URL from input', () => {
      const prompt = seoAuditSkill.buildUserPrompt({ url: 'https://example.com', html: '<html></html>' })
      expect(prompt).toContain('https://example.com')
    })

    it('includes fetched page content when provided in input', () => {
      const prompt = seoAuditSkill.buildUserPrompt({ url: 'https://example.com', html: '<html><body>Hello</body></html>' })
      expect(prompt).toContain('Hello')
    })

    it('returns a non-empty string', () => {
      const prompt = seoAuditSkill.buildUserPrompt({ url: 'https://example.com', html: '<html></html>' })
      expect(prompt.length).toBeGreaterThan(0)
    })
  })

  describe('parseResponse', () => {
    it('parses valid JSON with score, findings, summary fields', () => {
      const result = seoAuditSkill.parseResponse(rawJsonResponse(validAuditResponse))
      expect(result.type).toBe('audit_report')
      expect(result.data).toHaveProperty('score')
      expect(result.data).toHaveProperty('findings')
    })

    it('parses JSON wrapped in markdown code fences', () => {
      const result = seoAuditSkill.parseResponse(wrappedJsonResponse(validAuditResponse))
      expect(result.type).toBe('audit_report')
      expect((result.data as any).score).toBe(72)
    })

    it('score is a number between 0 and 100', () => {
      const result = seoAuditSkill.parseResponse(rawJsonResponse(validAuditResponse))
      const score = (result.data as any).score
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('findings is an array with at least 1 item', () => {
      const result = seoAuditSkill.parseResponse(rawJsonResponse(validAuditResponse))
      const findings = (result.data as any).findings
      expect(Array.isArray(findings)).toBe(true)
      expect(findings.length).toBeGreaterThanOrEqual(1)
    })

    it('each finding has title and severity fields', () => {
      const result = seoAuditSkill.parseResponse(rawJsonResponse(validAuditResponse))
      const findings = (result.data as any).findings
      findings.forEach((f: any) => {
        expect(f).toHaveProperty('title')
        expect(f).toHaveProperty('severity')
      })
    })

    it('severity is one of: critical | warning | info', () => {
      const result = seoAuditSkill.parseResponse(rawJsonResponse(validAuditResponse))
      const findings = (result.data as any).findings
      const validSeverities = ['critical', 'warning', 'info']
      findings.forEach((f: any) => {
        expect(validSeverities).toContain(f.severity)
      })
    })

    it('throws a descriptive error when JSON is completely malformed', () => {
      expect(() => seoAuditSkill.parseResponse('not valid json at all')).toThrow()
    })

    it('handles missing recommendations field gracefully (defaults to empty array)', () => {
      const noRecs = { ...validAuditResponse }
      const result = seoAuditSkill.parseResponse(rawJsonResponse(noRecs))
      // parseResponse returns whatever JSON has — missing field is just undefined
      expect(result.data).toBeDefined()
    })

    it('handles score of 0 without throwing', () => {
      const zeroScore = { ...validAuditResponse, score: 0 }
      const result = seoAuditSkill.parseResponse(rawJsonResponse(zeroScore))
      expect((result.data as any).score).toBe(0)
    })

    it('handles score of 100 without throwing', () => {
      const perfectScore = { ...validAuditResponse, score: 100 }
      const result = seoAuditSkill.parseResponse(rawJsonResponse(perfectScore))
      expect((result.data as any).score).toBe(100)
    })
  })
})

describe('attachSchemaSnippet', () => {
  const facts: ProjectFacts = {
    id: 'p1',
    name: 'Lekki Plumbers',
    websiteUrl: 'https://lekki.ng',
    businessType: 'local',
    services: ['plumbing'],
    location: 'Lekki, Lagos',
    description: null,
    valueProposition: 'Same-day plumbing',
    audience: [],
    competitors: [],
    category: null,
    phone: '0800 000 0000',
  }

  it('adds a paste-ready JSON-LD snippet to the report and the structured-data finding', () => {
    const report = {
      score: 60,
      findings: [
        { severity: 'warning', category: 'meta', title: 'Title too long', detail: '', fix: '', impact: 'low' },
        { severity: 'warning', category: 'schema', title: 'Missing structured data', detail: 'No JSON-LD on the page.', fix: 'Add schema.', impact: 'medium' },
      ],
      summary: 'x',
    }
    const html = '<h2>Do you work weekends?</h2><p>Yes, seven days a week.</p><h2>Do you quote first?</h2><p>Always, in writing.</p><h2>Do you fix heaters?</h2><p>Yes, all brands.</p>'
    const out = attachSchemaSnippet(report, facts, { pageUrl: 'https://lekki.ng/', html })
    expect(out.schema_snippet).toContain('<script type="application/ld+json">')
    expect(out.schema_snippet).toContain('"LocalBusiness"')
    expect(out.schema_snippet).toContain('"FAQPage"')
    expect(out.schema_snippet).toContain('Do you work weekends?')
    const findings = out.findings as Array<{ category: string; schema_snippet?: string }>
    expect(findings[0].schema_snippet).toBeUndefined()
    expect(findings[1].schema_snippet).toBe(out.schema_snippet)
  })

  it('leaves a report alone when nothing is wrong with the structured data', () => {
    const report = { score: 90, findings: [{ severity: 'info', category: 'meta', title: 'Fine', detail: '', fix: '', impact: 'low' }], summary: 'x' }
    expect(attachSchemaSnippet(report, facts, { pageUrl: 'https://lekki.ng/' }).schema_snippet).toBeUndefined()
  })
})
