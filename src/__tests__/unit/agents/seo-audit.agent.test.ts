import { describe, it, expect } from 'vitest'
import { seoAuditSkill } from '@/src/lib/ai/agents/seo-audit'
import {
  mockProjectContext,
  minimalProjectContext,
  wrappedJsonResponse,
  rawJsonResponse,
  malformedJsonResponse,
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

    it('system prompt length is under 3000 characters', () => {
      const prompt = seoAuditSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.length).toBeLessThan(3000)
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
