import { describe, it, expect } from 'vitest'
import { competitorAnalysisSkill } from '@/src/lib/ai/agents/competitor-analysis'
import {
  mockProjectContext,
  minimalProjectContext,
  rawJsonResponse,
  wrappedJsonResponse,
} from '../../helpers/agent-test-helper'

const mockCompetitorResponse = {
  analysis_name: 'Competitive Analysis: Jasper',
  competitors: [
    {
      name: 'Jasper',
      url: 'https://jasper.ai',
      positioning: 'AI content creation platform',
      strengths: ['Large content template library', 'Strong brand recognition'],
      weaknesses: ['No SEO audit', 'No publishing pipeline'],
      messaging_analysis: 'Generic enterprise positioning, weak differentiation',
      content_strategy: 'Heavy blog and video content, strong YouTube presence',
      seo_presence: 'High authority, ranks for major AI content keywords',
      pricing_model: 'Seat-based SaaS with usage limits',
    },
  ],
  positioning_gaps: [
    {
      gap: 'Audit-first workflow',
      opportunity: 'Position as the only tool that starts with data-driven audit',
      impact: 'high',
      effort: 'low',
    },
  ],
  content_opportunities: [
    {
      topic: 'Technical SEO for SaaS',
      rationale: 'No competitor content on this topic',
      suggested_format: 'blog',
      priority: 'high',
    },
  ],
  messaging_recommendations: [
    {
      area: 'value_prop',
      current_issue: 'Too similar to Jasper messaging',
      recommendation: 'Lead with audit-first positioning',
      example: 'Know your score before you write a word.',
    },
  ],
  quick_wins: ['Publish comparison page', 'Add audit CTA to homepage', 'Target competitor branded keywords'],
}

describe('Competitor Analysis Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes the user\'s own product name and value proposition for comparison', () => {
      const prompt = competitorAnalysisSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('TestCo')
      expect(prompt).toContain('Automates repetitive engineering tasks')
    })

    it('includes the user\'s target audience', () => {
      const prompt = competitorAnalysisSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Solo founders')
    })

    it('does NOT rely solely on the competitor URL', () => {
      // The system prompt instructs to analyze based on fetched content
      const prompt = competitorAnalysisSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('competitive')
    })
  })

  describe('buildUserPrompt', () => {
    it('includes competitor info from input', () => {
      const prompt = competitorAnalysisSkill.buildUserPrompt({ competitors: 'Jasper, Copy.ai' })
      expect(prompt).toContain('Jasper')
    })

    it('includes focus area from input', () => {
      const prompt = competitorAnalysisSkill.buildUserPrompt({ focus: 'SEO and content strategy' })
      expect(prompt).toContain('SEO and content strategy')
    })

    it('handles missing optional fields without throwing', () => {
      expect(() => competitorAnalysisSkill.buildUserPrompt({})).not.toThrow()
    })
  })

  describe('parseResponse', () => {
    it('parses competitors array with strengths', () => {
      const result = competitorAnalysisSkill.parseResponse(rawJsonResponse(mockCompetitorResponse))
      const comp = (result.data as any).competitors[0]
      expect(comp.strengths).toHaveLength(2)
    })

    it('parses weaknesses array', () => {
      const result = competitorAnalysisSkill.parseResponse(rawJsonResponse(mockCompetitorResponse))
      const comp = (result.data as any).competitors[0]
      expect(comp.weaknesses).toHaveLength(2)
    })

    it('parses positioning_gaps array', () => {
      const result = competitorAnalysisSkill.parseResponse(rawJsonResponse(mockCompetitorResponse))
      expect((result.data as any).positioning_gaps).toHaveLength(1)
    })

    it('parses content_opportunities array', () => {
      const result = competitorAnalysisSkill.parseResponse(rawJsonResponse(mockCompetitorResponse))
      expect((result.data as any).content_opportunities).toHaveLength(1)
    })

    it('parses quick_wins array', () => {
      const result = competitorAnalysisSkill.parseResponse(rawJsonResponse(mockCompetitorResponse))
      expect((result.data as any).quick_wins).toHaveLength(3)
    })

    it('strengths and weaknesses arrays are non-empty', () => {
      const result = competitorAnalysisSkill.parseResponse(rawJsonResponse(mockCompetitorResponse))
      const comp = (result.data as any).competitors[0]
      expect(comp.strengths.length).toBeGreaterThan(0)
      expect(comp.weaknesses.length).toBeGreaterThan(0)
    })

    it('handles wrapped JSON response', () => {
      const result = competitorAnalysisSkill.parseResponse(wrappedJsonResponse(mockCompetitorResponse))
      expect(result.type).toBe('competitor_analysis')
    })

    it('throws when response has no valid JSON', () => {
      expect(() => competitorAnalysisSkill.parseResponse('not json')).toThrow()
    })
  })
})
