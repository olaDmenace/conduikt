import { describe, it, expect } from 'vitest'
import { contentStrategySkill } from '@/src/lib/ai/agents/content-strategy'
import {
  mockProjectContext,
  rawJsonResponse,
  wrappedJsonResponse,
} from '../../helpers/agent-test-helper'

const mockStrategyResponse = {
  strategy_name: '30-Day Content Strategy for TestCo',
  time_horizon: '30 days',
  pillars: [
    {
      topic: 'Marketing Automation',
      intent: 'awareness',
      search_opportunity: 'high',
      content_pieces: [
        {
          title: 'How to automate your first marketing task',
          format: 'blog',
          channel: 'website',
          priority: 'high',
          brief: 'A beginner guide targeting founders who have never used marketing automation.',
          target_keyword: 'marketing automation for startups',
          estimated_impact: 'High — targets a low-competition keyword with strong buyer intent',
        },
        {
          title: '3 things I wish I knew about marketing',
          format: 'social',
          channel: 'x',
          priority: 'medium',
          brief: 'Thread-style post sharing personal learnings about marketing as a founder.',
          target_keyword: null,
          estimated_impact: 'Medium — good for engagement and brand building',
        },
      ],
    },
    {
      topic: 'Founder Stories',
      intent: 'awareness',
      search_opportunity: 'medium',
      content_pieces: [],
    },
  ],
  content_calendar: [
    {
      week: 1,
      pieces: ['How to automate your first marketing task', '3 things I wish I knew about marketing'],
      theme: 'Launch week — establish thought leadership',
    },
  ],
  kpis: ['Organic traffic +30% in 30 days', '100 newsletter subscribers'],
  quick_wins: ['Publish first blog post', 'Schedule 5 social posts', 'Set up email capture'],
}

describe('Content Strategy Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes project name and context', () => {
      const prompt = contentStrategySkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('TestCo')
    })

    it('includes keywords from project context', () => {
      const prompt = contentStrategySkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('marketing automation')
    })

    it('includes target audience', () => {
      const prompt = contentStrategySkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Solo founders')
    })

    it('includes competitor context', () => {
      const prompt = contentStrategySkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Linear')
    })

    it('instructs AI to return JSON', () => {
      const prompt = contentStrategySkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('json')
    })
  })

  describe('buildUserPrompt', () => {
    it('includes goal from input', () => {
      const prompt = contentStrategySkill.buildUserPrompt({ goal: 'Drive organic traffic' })
      expect(prompt).toContain('Drive organic traffic')
    })

    it('includes time horizon from input', () => {
      const prompt = contentStrategySkill.buildUserPrompt({ timeHorizon: '90 days' })
      expect(prompt).toContain('90 days')
    })

    it('handles missing optional fields without throwing', () => {
      expect(() => contentStrategySkill.buildUserPrompt({})).not.toThrow()
    })
  })

  describe('parseResponse', () => {
    it('parses pillars array with topic and content_pieces fields', () => {
      const result = contentStrategySkill.parseResponse(rawJsonResponse(mockStrategyResponse))
      const pillars = (result.data as any).pillars
      expect(pillars.length).toBeGreaterThanOrEqual(1)
      expect(pillars[0]).toHaveProperty('topic')
      expect(pillars[0]).toHaveProperty('content_pieces')
    })

    it('parses content_calendar array with week and pieces fields', () => {
      const result = contentStrategySkill.parseResponse(rawJsonResponse(mockStrategyResponse))
      const calendar = (result.data as any).content_calendar
      expect(calendar[0]).toHaveProperty('week')
      expect(calendar[0]).toHaveProperty('pieces')
    })

    it('each calendar item has pieces as an array', () => {
      const result = contentStrategySkill.parseResponse(rawJsonResponse(mockStrategyResponse))
      const calendar = (result.data as any).content_calendar
      calendar.forEach((item: any) => {
        expect(Array.isArray(item.pieces)).toBe(true)
      })
    })

    it('each content piece has: title, format, channel, priority fields', () => {
      const result = contentStrategySkill.parseResponse(rawJsonResponse(mockStrategyResponse))
      const piece = (result.data as any).pillars[0].content_pieces[0]
      expect(piece).toHaveProperty('title')
      expect(piece).toHaveProperty('format')
      expect(piece).toHaveProperty('channel')
      expect(piece).toHaveProperty('priority')
    })

    it('parses kpis array of strings', () => {
      const result = contentStrategySkill.parseResponse(rawJsonResponse(mockStrategyResponse))
      const kpis = (result.data as any).kpis
      expect(Array.isArray(kpis)).toBe(true)
      kpis.forEach((kpi: any) => expect(typeof kpi).toBe('string'))
    })

    it('handles missing kpis field', () => {
      const noKpis = { ...mockStrategyResponse, kpis: undefined }
      const result = contentStrategySkill.parseResponse(rawJsonResponse(noKpis))
      expect(result.data).toBeDefined()
    })

    it('pillars array has at least 1 item', () => {
      const result = contentStrategySkill.parseResponse(rawJsonResponse(mockStrategyResponse))
      expect((result.data as any).pillars.length).toBeGreaterThanOrEqual(1)
    })

    it('handles wrapped JSON response', () => {
      const result = contentStrategySkill.parseResponse(wrappedJsonResponse(mockStrategyResponse))
      expect(result.type).toBe('content_strategy')
    })

    it('throws when response has no valid JSON', () => {
      expect(() => contentStrategySkill.parseResponse('just text')).toThrow()
    })
  })
})
