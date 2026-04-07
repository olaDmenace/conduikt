import { describe, it, expect } from 'vitest'
import { pageCroSkill } from '@/src/lib/ai/agents/page-cro'
import {
  mockProjectContext,
  minimalProjectContext,
  rawJsonResponse,
  wrappedJsonResponse,
} from '../../helpers/agent-test-helper'

const mockCroResponse = {
  score: 58,
  findings: [
    {
      severity: 'critical',
      category: 'cta',
      title: 'CTA button is below the fold on mobile',
      detail: 'The primary CTA is not visible without scrolling on mobile devices.',
      recommendation: 'Move the primary CTA above the fold on all breakpoints.',
      impact: 'high',
    },
    {
      severity: 'warning',
      category: 'trust',
      title: 'No social proof visible',
      detail: 'No testimonials, customer counts, or logos above the fold.',
      recommendation: 'Add a customer count or logo bar near the CTA.',
      impact: 'medium',
    },
  ],
  quick_wins: ['Add social proof count near CTA', 'Increase CTA button contrast ratio'],
  summary: 'The page has conversion issues primarily around CTA placement and lack of trust signals.',
}

describe('Page CRO Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes value proposition from project context', () => {
      const prompt = pageCroSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Automates repetitive engineering tasks')
    })

    it('includes target audience from project context', () => {
      const prompt = pageCroSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Solo founders')
    })

    it('does not throw with minimal context', () => {
      expect(() => pageCroSkill.buildSystemPrompt(minimalProjectContext)).not.toThrow()
    })

    it('instructs AI to return JSON', () => {
      const prompt = pageCroSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('json')
    })
  })

  describe('buildUserPrompt', () => {
    it('includes URL from input', () => {
      const prompt = pageCroSkill.buildUserPrompt({ url: 'https://example.com', html: '<html></html>' })
      expect(prompt).toContain('https://example.com')
    })

    it('includes HTML content from input', () => {
      const prompt = pageCroSkill.buildUserPrompt({ url: 'https://example.com', html: '<html><body>Test</body></html>' })
      expect(prompt).toContain('Test')
    })
  })

  describe('parseResponse', () => {
    it('parses score as integer 0-100', () => {
      const result = pageCroSkill.parseResponse(rawJsonResponse(mockCroResponse))
      const score = (result.data as any).score
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('parses findings array', () => {
      const result = pageCroSkill.parseResponse(rawJsonResponse(mockCroResponse))
      expect((result.data as any).findings).toHaveLength(2)
    })

    it('each finding has: severity, category, title, recommendation fields', () => {
      const result = pageCroSkill.parseResponse(rawJsonResponse(mockCroResponse))
      const findings = (result.data as any).findings
      findings.forEach((f: any) => {
        expect(f).toHaveProperty('severity')
        expect(f).toHaveProperty('category')
        expect(f).toHaveProperty('title')
        expect(f).toHaveProperty('recommendation')
      })
    })

    it('severity is one of: critical | warning | info', () => {
      const result = pageCroSkill.parseResponse(rawJsonResponse(mockCroResponse))
      const findings = (result.data as any).findings
      findings.forEach((f: any) => {
        expect(['critical', 'warning', 'info']).toContain(f.severity)
      })
    })

    it('parses quick_wins array of strings', () => {
      const result = pageCroSkill.parseResponse(rawJsonResponse(mockCroResponse))
      const wins = (result.data as any).quick_wins
      expect(Array.isArray(wins)).toBe(true)
      wins.forEach((w: any) => expect(typeof w).toBe('string'))
    })

    it('handles missing quick_wins', () => {
      const noWins = { ...mockCroResponse, quick_wins: undefined }
      const result = pageCroSkill.parseResponse(rawJsonResponse(noWins))
      expect(result.data).toBeDefined()
    })

    it('handles wrapped JSON response', () => {
      const result = pageCroSkill.parseResponse(wrappedJsonResponse(mockCroResponse))
      expect(result.type).toBe('cro_report')
    })

    it('throws when response has no valid JSON', () => {
      expect(() => pageCroSkill.parseResponse('not json')).toThrow()
    })
  })
})
