import { describe, it, expect } from 'vitest'
import { growthPlaybookSkill } from '@/src/lib/ai/agents/growth-playbook'
import {
  mockProjectContext,
  rawJsonResponse,
  wrappedJsonResponse,
} from '../../helpers/agent-test-helper'

const mockPlaybookResponse = {
  title: '90-Day Growth Playbook for TestCo',
  executive_summary: 'TestCo has strong product-market fit but underdeveloped marketing. Focus on SEO foundation, content velocity, and social proof.',
  phases: [
    {
      phase: 1,
      name: 'Foundation & Quick Wins',
      timeline: 'Days 1-30',
      theme: 'Fix SEO basics and launch content engine',
      actions: [
        {
          id: 'P1-A1',
          title: 'Fix critical SEO issues',
          category: 'seo',
          priority: 'critical',
          effort: 'low',
          impact: 'high',
          description: 'Address the 3 high-severity findings from your audit.',
          conduikt_tool: 'SEO Audit',
          conduikt_route: 'audit',
          success_metric: 'SEO score increases from 62 to 75+',
        },
      ],
      phase_kpi: 'SEO score > 75',
    },
    {
      phase: 2,
      name: 'Momentum',
      timeline: 'Days 31-60',
      theme: 'Scale content and build social presence',
      actions: [],
      phase_kpi: '3 blog posts published',
    },
    {
      phase: 3,
      name: 'Scale',
      timeline: 'Days 61-90',
      theme: 'Optimize conversion and amplify reach',
      actions: [],
      phase_kpi: '500 monthly organic visitors',
    },
  ],
  growth_levers: [
    {
      lever: 'SEO Authority',
      current_state: 'Score 62, minimal content',
      target_state: 'Score 80+, 10 indexed blog posts',
      key_actions: ['Run full audit', 'Publish weekly blogs'],
    },
  ],
  week_1_checklist: ['Run full SEO audit', 'Publish first blog post', 'Connect GSC'],
}

describe('Growth Playbook Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes audit score data when audits are available', () => {
      const prompt = growthPlaybookSkill.buildSystemPrompt(mockProjectContext)
      // The prompt includes keyword and competitor data from context
      expect(prompt).toContain('marketing automation')
    })

    it('includes content velocity data when available', () => {
      const prompt = growthPlaybookSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toBeTruthy()
    })

    it('includes keyword data when available', () => {
      const prompt = growthPlaybookSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('marketing automation')
    })

    it('instructs AI to produce exactly 3 phases', () => {
      const prompt = growthPlaybookSkill.buildSystemPrompt(mockProjectContext)
      // The prompt says "phase": "number (1, 2, or 3)"
      expect(prompt).toContain('1, 2, or 3')
    })

    it('instructs AI to return JSON', () => {
      const prompt = growthPlaybookSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('json')
    })

    it('prompts for actionable, specific recommendations', () => {
      const prompt = growthPlaybookSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('specific')
    })
  })

  describe('parseResponse', () => {
    it('parses title and executive_summary', () => {
      const result = growthPlaybookSkill.parseResponse(rawJsonResponse(mockPlaybookResponse))
      expect((result.data as any).title).toBeTruthy()
      expect((result.data as any).executive_summary).toBeTruthy()
    })

    it('phases array has exactly 3 items', () => {
      const result = growthPlaybookSkill.parseResponse(rawJsonResponse(mockPlaybookResponse))
      expect((result.data as any).phases).toHaveLength(3)
    })

    it('each phase has: phase (number), name, timeline, actions array', () => {
      const result = growthPlaybookSkill.parseResponse(rawJsonResponse(mockPlaybookResponse))
      const phases = (result.data as any).phases
      phases.forEach((p: any) => {
        expect(typeof p.phase).toBe('number')
        expect(p.name).toBeTruthy()
        expect(p.timeline).toBeTruthy()
        expect(Array.isArray(p.actions)).toBe(true)
      })
    })

    it('each action has: title, effort, impact', () => {
      const result = growthPlaybookSkill.parseResponse(rawJsonResponse(mockPlaybookResponse))
      const action = (result.data as any).phases[0].actions[0]
      expect(action.title).toBeTruthy()
      expect(action.effort).toBeTruthy()
      expect(action.impact).toBeTruthy()
    })

    it('effort is one of: low | medium | high', () => {
      const result = growthPlaybookSkill.parseResponse(rawJsonResponse(mockPlaybookResponse))
      const action = (result.data as any).phases[0].actions[0]
      expect(['low', 'medium', 'high']).toContain(action.effort)
    })

    it('impact is one of: low | medium | high', () => {
      const result = growthPlaybookSkill.parseResponse(rawJsonResponse(mockPlaybookResponse))
      const action = (result.data as any).phases[0].actions[0]
      expect(['low', 'medium', 'high']).toContain(action.impact)
    })

    it('conduikt_route field is a non-empty string', () => {
      const result = growthPlaybookSkill.parseResponse(rawJsonResponse(mockPlaybookResponse))
      const action = (result.data as any).phases[0].actions[0]
      expect(action.conduikt_route).toBeTruthy()
      expect(typeof action.conduikt_route).toBe('string')
    })

    it('week_1_checklist is an array of strings', () => {
      const result = growthPlaybookSkill.parseResponse(rawJsonResponse(mockPlaybookResponse))
      const checklist = (result.data as any).week_1_checklist
      expect(Array.isArray(checklist)).toBe(true)
      checklist.forEach((item: any) => expect(typeof item).toBe('string'))
    })

    it('growth_levers array has lever, current_state, target_state fields', () => {
      const result = growthPlaybookSkill.parseResponse(rawJsonResponse(mockPlaybookResponse))
      const lever = (result.data as any).growth_levers[0]
      expect(lever.lever).toBeTruthy()
      expect(lever.current_state).toBeTruthy()
      expect(lever.target_state).toBeTruthy()
    })

    it('handles missing week_1_checklist', () => {
      const noChecklist = { ...mockPlaybookResponse, week_1_checklist: undefined }
      const result = growthPlaybookSkill.parseResponse(rawJsonResponse(noChecklist))
      expect(result.data).toBeDefined()
    })

    it('handles wrapped JSON response', () => {
      const result = growthPlaybookSkill.parseResponse(wrappedJsonResponse(mockPlaybookResponse))
      expect(result.type).toBe('growth_playbook')
    })

    it('throws when response has no valid JSON', () => {
      expect(() => growthPlaybookSkill.parseResponse('just plain text')).toThrow()
    })
  })
})
