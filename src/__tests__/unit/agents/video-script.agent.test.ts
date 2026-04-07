import { describe, it, expect } from 'vitest'
import { videoScriptAgent } from '@/src/lib/ai/agents/video-script'
import {
  mockProjectContext,
  minimalProjectContext,
  rawJsonResponse,
  wrappedJsonResponse,
} from '../../helpers/agent-test-helper'

const mockVideoScriptResponse = {
  script: 'Full narration text for the presenter...',
  voiceover_script: 'Tired of spending 20 hours a week on marketing? TestCo automates it for you.',
  scenes: [
    {
      duration: '4s',
      visual: 'Abstract motion graphic — text appearing: "20 hours/week wasted on marketing?"',
      text_overlay: '20 hours/week',
      voiceover: 'Tired of spending 20 hours a week on marketing?',
    },
    {
      duration: '6s',
      visual: 'Product UI animation showing the dashboard',
      text_overlay: 'Meet TestCo',
      voiceover: 'TestCo automates your entire marketing stack.',
    },
    {
      duration: '3s',
      visual: 'Clean CTA card with branded background',
      text_overlay: 'Start free at testco.com',
      voiceover: 'Start free at testco.com',
    },
  ],
  hook: 'Tired of spending 20 hours a week on marketing?',
  cta: 'Start free at testco.com',
  style: 'Minimal, professional, dark background with amber accents',
  platforms: ['linkedin', 'youtube_shorts'],
}

describe('Video Script Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes the scene consistency warning (no recurring human characters)', () => {
      const prompt = videoScriptAgent.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('consistent human characters')
    })

    it('includes project name and website URL', () => {
      const prompt = videoScriptAgent.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('TestCo')
      expect(prompt).toContain('https://testco.com')
    })

    it('includes performance context when available', () => {
      const prompt = videoScriptAgent.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('dark mode')
    })

    it('does not include performance section when not available', () => {
      const prompt = videoScriptAgent.buildSystemPrompt(minimalProjectContext)
      expect(prompt).not.toContain('Performance Data')
    })

    it('instructs AI to output voiceover_script as a separate field from scenes', () => {
      const prompt = videoScriptAgent.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('voiceover_script')
    })
  })

  describe('buildUserPrompt', () => {
    it('includes topic/brief from input', () => {
      const prompt = videoScriptAgent.buildUserPrompt({ topic: 'Product launch video' })
      expect(prompt).toContain('Product launch video')
    })

    it('adjusts word count instruction based on adLength: short = 80-100 words', () => {
      const prompt = videoScriptAgent.buildUserPrompt({ topic: 'Test', adLength: 'short' })
      expect(prompt).toContain('80-100')
    })

    it('adjusts word count instruction based on adLength: standard = 150-180 words', () => {
      const prompt = videoScriptAgent.buildUserPrompt({ topic: 'Test', adLength: 'standard' })
      expect(prompt).toContain('150-180')
    })

    it('adjusts word count instruction based on adLength: long = 220-260 words', () => {
      const prompt = videoScriptAgent.buildUserPrompt({ topic: 'Test', adLength: 'long' })
      expect(prompt).toContain('220-260')
    })

    it('includes source content when provided', () => {
      const prompt = videoScriptAgent.buildUserPrompt({ topic: 'Test', sourceContent: 'Here is some existing blog content to adapt' })
      expect(prompt).toContain('existing blog content')
    })

    it('uses brief as fallback when topic is not provided', () => {
      const prompt = videoScriptAgent.buildUserPrompt({ brief: 'Quick product demo' })
      expect(prompt).toContain('Quick product demo')
    })
  })

  describe('parseResponse', () => {
    it('parses voiceover_script as a non-empty string', () => {
      const result = videoScriptAgent.parseResponse(rawJsonResponse(mockVideoScriptResponse))
      const vs = (result.data as any).voiceover_script
      expect(vs).toBeTruthy()
      expect(typeof vs).toBe('string')
    })

    it('parses scenes array with at least 2 scenes', () => {
      const result = videoScriptAgent.parseResponse(rawJsonResponse(mockVideoScriptResponse))
      expect((result.data as any).scenes.length).toBeGreaterThanOrEqual(2)
    })

    it('each scene has: duration, visual, text_overlay, voiceover fields', () => {
      const result = videoScriptAgent.parseResponse(rawJsonResponse(mockVideoScriptResponse))
      const scenes = (result.data as any).scenes
      scenes.forEach((s: any) => {
        expect(s).toHaveProperty('duration')
        expect(s).toHaveProperty('visual')
        expect(s).toHaveProperty('text_overlay')
        expect(s).toHaveProperty('voiceover')
      })
    })

    it('duration field is a string with time unit (e.g. "4s", "10s")', () => {
      const result = videoScriptAgent.parseResponse(rawJsonResponse(mockVideoScriptResponse))
      const scenes = (result.data as any).scenes
      scenes.forEach((s: any) => {
        expect(s.duration).toMatch(/\d+s/)
      })
    })

    it('parses hook as non-empty string', () => {
      const result = videoScriptAgent.parseResponse(rawJsonResponse(mockVideoScriptResponse))
      expect((result.data as any).hook).toBeTruthy()
    })

    it('parses cta as non-empty string', () => {
      const result = videoScriptAgent.parseResponse(rawJsonResponse(mockVideoScriptResponse))
      expect((result.data as any).cta).toBeTruthy()
    })

    it('parses platforms array', () => {
      const result = videoScriptAgent.parseResponse(rawJsonResponse(mockVideoScriptResponse))
      expect(Array.isArray((result.data as any).platforms)).toBe(true)
      expect((result.data as any).platforms.length).toBeGreaterThan(0)
    })

    it('visual descriptions do NOT reference a recurring named character across scenes', () => {
      const result = videoScriptAgent.parseResponse(rawJsonResponse(mockVideoScriptResponse))
      const scenes = (result.data as any).scenes
      scenes.forEach((s: any) => {
        const visual = s.visual.toLowerCase()
        expect(visual).not.toContain('same person')
        expect(visual).not.toContain('same woman')
        expect(visual).not.toContain('same man')
      })
    })

    it('handles missing platforms (response still parses)', () => {
      const noPlatforms = { ...mockVideoScriptResponse, platforms: undefined }
      const result = videoScriptAgent.parseResponse(rawJsonResponse(noPlatforms))
      expect(result.data).toBeDefined()
    })

    it('throws when response has no valid JSON', () => {
      expect(() => videoScriptAgent.parseResponse('not json')).toThrow()
    })

    it('handles wrapped JSON response (strips markdown fences)', () => {
      const result = videoScriptAgent.parseResponse(wrappedJsonResponse(mockVideoScriptResponse))
      expect(result.type).toBe('video-script')
    })
  })

  describe('Scene consistency validation', () => {
    it('no scene visual description contains "same person" or "same woman" or "same man"', () => {
      const scenes = mockVideoScriptResponse.scenes
      scenes.forEach((s) => {
        const visual = s.visual.toLowerCase()
        expect(visual).not.toMatch(/same\s+(person|woman|man)/)
      })
    })

    it('scenes with type hook use abstract or text-based visuals, not live actors', () => {
      // First scene is the hook — its visual should be abstract
      const hookScene = mockVideoScriptResponse.scenes[0]
      const visual = hookScene.visual.toLowerCase()
      const hasAbstract = visual.includes('abstract') || visual.includes('motion graphic') || visual.includes('text')
      expect(hasAbstract).toBe(true)
    })
  })
})
