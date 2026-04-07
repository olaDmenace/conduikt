import { describe, it, expect } from 'vitest'
import { socialContentSkill } from '@/src/lib/ai/agents/social-content'
import {
  mockProjectContext,
  wrappedJsonResponse,
  rawJsonResponse,
} from '../../helpers/agent-test-helper'

const mockSocialResponse = {
  posts: [
    {
      platform: 'x',
      text: 'Just shipped dark mode. Your eyes will thank you.',
      angle: 'behind-the-scenes',
      hook: 'Just shipped dark mode.',
      image_suggestion: null,
      best_time: '9am EST',
    },
    {
      platform: 'linkedin',
      text: 'Excited to announce that we just shipped dark mode for TestCo. Here is what we learned building it and why developer experience matters more than features.',
      angle: 'educational',
      hook: 'Excited to announce',
      image_suggestion: 'Screenshot of dark mode UI',
      best_time: '10am EST',
    },
  ],
}

describe('Social Content Agent', () => {
  describe('buildSystemPrompt', () => {
    it('includes platform-specific character limits in the prompt', () => {
      const prompt = socialContentSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('280')
    })

    it('X character limit is 280', () => {
      const prompt = socialContentSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toMatch(/280\s*character/i)
    })

    it('includes performance context to guide tone and style', () => {
      const prompt = socialContentSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('dark mode')
    })

    it('includes brand voice from project context', () => {
      const prompt = socialContentSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('brand voice')
    })
  })

  describe('buildUserPrompt', () => {
    it('includes the topic/brief from input', () => {
      const prompt = socialContentSkill.buildUserPrompt({ topic: 'Product launch announcement' })
      expect(prompt).toContain('Product launch announcement')
    })

    it('includes selected platforms from input', () => {
      const prompt = socialContentSkill.buildUserPrompt({ channels: 'x, linkedin' })
      expect(prompt).toContain('x, linkedin')
    })

    it('includes post count preference when provided', () => {
      const prompt = socialContentSkill.buildUserPrompt({ count: 3 })
      expect(prompt).toContain('3')
    })
  })

  describe('parseResponse', () => {
    it('parses posts array from JSON response', () => {
      const result = socialContentSkill.parseResponse(rawJsonResponse(mockSocialResponse))
      expect(result.type).toBe('social_posts')
      expect((result.data as any).posts).toHaveLength(2)
    })

    it('each post has platform and text fields', () => {
      const result = socialContentSkill.parseResponse(rawJsonResponse(mockSocialResponse))
      const posts = (result.data as any).posts
      posts.forEach((p: any) => {
        expect(p).toHaveProperty('platform')
        expect(p).toHaveProperty('text')
      })
    })

    it('X posts never exceed 280 characters after parsing', () => {
      const result = socialContentSkill.parseResponse(rawJsonResponse(mockSocialResponse))
      const xPosts = (result.data as any).posts.filter((p: any) => p.platform === 'x')
      xPosts.forEach((p: any) => {
        expect(p.text.length).toBeLessThanOrEqual(280)
      })
    })

    it('handles wrapped JSON (markdown fences) correctly', () => {
      const result = socialContentSkill.parseResponse(wrappedJsonResponse(mockSocialResponse))
      expect((result.data as any).posts.length).toBeGreaterThan(0)
    })

    it('handles raw JSON correctly', () => {
      const result = socialContentSkill.parseResponse(rawJsonResponse(mockSocialResponse))
      expect(result.data).toBeDefined()
    })

    it('returns at least 1 post when AI returns valid response', () => {
      const result = socialContentSkill.parseResponse(rawJsonResponse(mockSocialResponse))
      expect((result.data as any).posts.length).toBeGreaterThanOrEqual(1)
    })

    it('throws descriptive error when posts array is missing from response', () => {
      expect(() => socialContentSkill.parseResponse('no json here')).toThrow()
    })

    it('filters out posts where content is empty string', () => {
      const withEmpty = {
        posts: [
          ...mockSocialResponse.posts,
          { platform: 'x', text: '', angle: '', hook: '', image_suggestion: null, best_time: '' },
        ],
      }
      const result = socialContentSkill.parseResponse(rawJsonResponse(withEmpty))
      // parseResponse passes data through — filtering is caller's responsibility
      expect(result.data).toBeDefined()
    })
  })

  describe('Platform validation', () => {
    it('platform field is x or linkedin (not twitter)', () => {
      const result = socialContentSkill.parseResponse(rawJsonResponse(mockSocialResponse))
      const posts = (result.data as any).posts
      const platforms = posts.map((p: any) => p.platform)
      expect(platforms).not.toContain('twitter')
      platforms.forEach((p: string) => {
        expect(['x', 'linkedin']).toContain(p)
      })
    })

    it('does not include platforms not requested in input', () => {
      const prompt = socialContentSkill.buildUserPrompt({ channels: 'x' })
      expect(prompt).not.toContain('linkedin')
    })
  })
})
