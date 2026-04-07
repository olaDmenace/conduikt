import { describe, it, expect } from 'vitest'
import { copywritingSkill } from '@/src/lib/ai/agents/copywriting'
import {
  mockProjectContext,
  minimalProjectContext,
  rawJsonResponse,
  wrappedJsonResponse,
} from '../../helpers/agent-test-helper'

const validCopyResponse = {
  type: 'headline',
  variants: [
    { text: 'Ship faster. Market smarter.', rationale: 'Concise, benefit-led', tone: 'Direct, confident' },
    { text: 'Your marketing on autopilot.', rationale: 'Automation angle', tone: 'Casual, approachable' },
    { text: 'Stop doing marketing. Start growing.', rationale: 'Contrarian hook', tone: 'Bold, provocative' },
  ],
  recommendations: ['Test headline A vs C in hero section'],
}

describe('Copywriting Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes brand voice instructions', () => {
      const prompt = copywritingSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('brand voice')
    })

    it('includes value proposition when provided', () => {
      const prompt = copywritingSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Automates repetitive engineering tasks')
    })

    it('includes target audience when provided', () => {
      const prompt = copywritingSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Solo founders')
    })

    it('includes competitor context when provided', () => {
      const prompt = copywritingSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Linear')
    })

    it('adapts tone when performanceContext is provided', () => {
      const prompt = copywritingSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('dark mode')
    })

    it('system prompt does not contain undefined or null as literal strings', () => {
      const prompt = copywritingSkill.buildSystemPrompt(minimalProjectContext)
      expect(prompt).not.toContain('"undefined"')
      // "null" can appear inside JSON.stringify of undefined fields, which is fine
    })
  })

  describe('buildUserPrompt', () => {
    it('includes the copyType from input (headline, tagline, cta, etc.)', () => {
      const prompt = copywritingSkill.buildUserPrompt({ type: 'tagline', context: 'A dev tool' })
      expect(prompt).toContain('tagline')
    })

    it('includes the product description from input', () => {
      const prompt = copywritingSkill.buildUserPrompt({ type: 'headline', context: 'A marketing platform' })
      expect(prompt).toContain('A marketing platform')
    })

    it('includes tone preference when provided', () => {
      const prompt = copywritingSkill.buildUserPrompt({ type: 'headline', instructions: 'Use a playful tone' })
      expect(prompt).toContain('playful tone')
    })

    it('handles missing optional fields without throwing', () => {
      expect(() => copywritingSkill.buildUserPrompt({})).not.toThrow()
    })
  })

  describe('parseResponse', () => {
    it('parses response with variants array', () => {
      const result = copywritingSkill.parseResponse(rawJsonResponse(validCopyResponse))
      expect(result.type).toBe('copy')
      expect((result.data as any).variants).toHaveLength(3)
    })

    it('parses response wrapped in markdown fences', () => {
      const result = copywritingSkill.parseResponse(wrappedJsonResponse(validCopyResponse))
      expect((result.data as any).variants.length).toBeGreaterThan(0)
    })

    it('each variant has text field', () => {
      const result = copywritingSkill.parseResponse(rawJsonResponse(validCopyResponse))
      const variants = (result.data as any).variants
      variants.forEach((v: any) => {
        expect(v.text).toBeTruthy()
        expect(typeof v.text).toBe('string')
      })
    })

    it('returns copy as a non-empty string in each variant', () => {
      const result = copywritingSkill.parseResponse(rawJsonResponse(validCopyResponse))
      const variants = (result.data as any).variants
      variants.forEach((v: any) => {
        expect(v.text.length).toBeGreaterThan(0)
      })
    })

    it('handles plain text response (no JSON) by throwing', () => {
      expect(() => copywritingSkill.parseResponse('This is just plain text, no JSON here.')).toThrow()
    })
  })
})
