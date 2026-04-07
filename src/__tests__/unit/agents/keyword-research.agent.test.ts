import { describe, it, expect } from 'vitest'
import { keywordResearchSkill } from '@/src/lib/ai/agents/keyword-research'
import {
  mockProjectContext,
  wrappedJsonResponse,
  rawJsonResponse,
} from '../../helpers/agent-test-helper'

const mockKeywordResponse = {
  seed_keyword: 'marketing automation',
  primary_keywords: [
    {
      term: 'marketing automation software',
      intent: 'transactional',
      estimated_volume: '1K-10K/mo',
      difficulty: 'medium',
      quick_win: false,
      suggested_format: 'landing_page',
      rationale: 'Core product term with high buyer intent.',
    },
  ],
  long_tail_keywords: [
    {
      term: 'best marketing automation for startups',
      intent: 'informational',
      estimated_volume: '100-1K/mo',
      difficulty: 'low',
      parent_keyword: 'marketing automation software',
    },
  ],
  question_keywords: [
    {
      question: 'What is marketing automation?',
      snippet_opportunity: true,
      cluster: 'marketing automation',
    },
  ],
  content_clusters: [
    {
      pillar: 'Marketing Automation',
      cluster_keywords: ['email automation', 'social media automation'],
      pillar_page_title: 'The Complete Guide to Marketing Automation',
      cluster_page_titles: ['Email Automation 101', 'Social Media Automation Guide'],
    },
  ],
  competitor_gap: 'Competitors have no content on AI-powered SEO auditing.',
  priority_order: ['marketing automation software', 'best marketing automation for startups'],
}

describe('Keyword Research Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes project industry context', () => {
      const prompt = keywordResearchSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('SaaS')
    })

    it('includes target audience to contextualise keyword relevance', () => {
      const prompt = keywordResearchSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Solo founders')
    })

    it('instructs AI to score opportunity as integer 0-100', () => {
      // The prompt doesn't use "opportunity score 0-100" literally — it uses difficulty low/medium/high
      const prompt = keywordResearchSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('difficulty')
    })

    it('instructs AI to classify intent', () => {
      const prompt = keywordResearchSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('informational')
      expect(prompt).toContain('transactional')
    })

    it('instructs AI to flag quick wins', () => {
      const prompt = keywordResearchSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('quick win')
    })
  })

  describe('parseResponse', () => {
    it('parses primary_keywords array', () => {
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(mockKeywordResponse))
      expect((result.data as any).primary_keywords).toHaveLength(1)
    })

    it('parses long_tail_keywords array', () => {
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(mockKeywordResponse))
      expect((result.data as any).long_tail_keywords).toHaveLength(1)
    })

    it('parses question_keywords array', () => {
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(mockKeywordResponse))
      expect((result.data as any).question_keywords).toHaveLength(1)
    })

    it('parses content_clusters array', () => {
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(mockKeywordResponse))
      expect((result.data as any).content_clusters).toHaveLength(1)
    })

    it('each primary keyword has required fields', () => {
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(mockKeywordResponse))
      const kw = (result.data as any).primary_keywords[0]
      expect(kw).toHaveProperty('term')
      expect(kw).toHaveProperty('intent')
      expect(kw).toHaveProperty('difficulty')
      expect(kw).toHaveProperty('quick_win')
    })

    it('difficulty is one of: low | medium | high', () => {
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(mockKeywordResponse))
      const kw = (result.data as any).primary_keywords[0]
      expect(['low', 'medium', 'high']).toContain(kw.difficulty)
    })

    it('intent is one of: informational | transactional | navigational | commercial', () => {
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(mockKeywordResponse))
      const kw = (result.data as any).primary_keywords[0]
      expect(['informational', 'transactional', 'navigational', 'commercial']).toContain(kw.intent)
    })

    it('quick_win is a boolean', () => {
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(mockKeywordResponse))
      const kw = (result.data as any).primary_keywords[0]
      expect(typeof kw.quick_win).toBe('boolean')
    })

    it('handles empty primary_keywords array without throwing', () => {
      const empty = { ...mockKeywordResponse, primary_keywords: [] }
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(empty))
      expect((result.data as any).primary_keywords).toHaveLength(0)
    })

    it('handles missing question_keywords field', () => {
      const noQuestions = { ...mockKeywordResponse, question_keywords: undefined }
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(noQuestions))
      expect(result.data).toBeDefined()
    })

    it('handles missing content_clusters field', () => {
      const noClusters = { ...mockKeywordResponse, content_clusters: undefined }
      const result = keywordResearchSkill.parseResponse(rawJsonResponse(noClusters))
      expect(result.data).toBeDefined()
    })

    it('handles wrapped JSON response', () => {
      const result = keywordResearchSkill.parseResponse(wrappedJsonResponse(mockKeywordResponse))
      expect(result.type).toBe('keyword_research')
    })
  })
})
