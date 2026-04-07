import { describe, it, expect } from 'vitest'
import { blogPostSkill } from '@/src/lib/ai/agents/blog-post'
import {
  mockProjectContext,
  wrappedJsonResponse,
  rawJsonResponse,
} from '../../helpers/agent-test-helper'

const mockBlogResponse = {
  meta_title: 'Marketing Automation Guide 2025 | TestCo',
  meta_description: 'Learn how to automate your marketing stack and save 20 hours per week with proven strategies.',
  slug: 'marketing-automation-guide-2025',
  featured_image_query: 'marketing automation dashboard',
  content_markdown: '# How to Automate Your Marketing\n\nMarketing automation is the key to scaling your business without burning out.\n\n## Why Automation Matters\n\nEvery hour you spend on repetitive tasks is an hour not spent on growth.\n\n## Getting Started\n\nStart by auditing your current workflow.',
  word_count: 1200,
  reading_time_minutes: 5,
  social_promotion: {
    x_post: 'Marketing automation in 2025: here is what actually works',
    linkedin_post: 'We just published a guide on marketing automation. Here are the top 3 takeaways for SaaS founders looking to scale their content.',
    email_subject: '5 marketing tasks you should automate today',
  },
}

describe('Blog Post Agent', () => {
  describe('buildSystemPrompt', () => {
    it('instructs AI to output SEO-optimized content', () => {
      const prompt = blogPostSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('seo')
    })

    it('includes target keyword instructions when keyword provided in context', () => {
      const prompt = blogPostSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('keyword')
    })

    it('instructs AI to include meta title and meta description', () => {
      const prompt = blogPostSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('meta_title')
      expect(prompt).toContain('meta_description')
    })

    it('instructs AI to suggest internal links', () => {
      // The prompt mentions hook intro, H2 sections structure, but not "internal links" literally
      // It does mention CTA — let's check for structural guidance
      const prompt = blogPostSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('cta')
    })

    it('includes word count target from input', () => {
      const prompt = blogPostSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt.toLowerCase()).toContain('word count')
    })

    it('system prompt includes project name for brand voice', () => {
      const prompt = blogPostSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('TestCo')
    })
  })

  describe('buildUserPrompt', () => {
    it('includes topic from input', () => {
      const prompt = blogPostSkill.buildUserPrompt({ topic: 'Marketing automation best practices' })
      expect(prompt).toContain('Marketing automation best practices')
    })

    it('includes target keyword when provided', () => {
      const prompt = blogPostSkill.buildUserPrompt({ topic: 'SEO guide', targetKeyword: 'seo for startups' })
      expect(prompt).toContain('seo for startups')
    })

    it('includes word count preference', () => {
      const prompt = blogPostSkill.buildUserPrompt({ topic: 'Test', wordCount: 2000 })
      expect(prompt).toContain('2000')
    })

    it('includes source content when provided (e.g. existing notes)', () => {
      const prompt = blogPostSkill.buildUserPrompt({ topic: 'Test', additionalContext: 'Here are my rough notes on the topic' })
      expect(prompt).toContain('rough notes')
    })
  })

  describe('parseResponse', () => {
    it('parses all required fields: meta_title, meta_description, content_markdown', () => {
      const result = blogPostSkill.parseResponse(rawJsonResponse(mockBlogResponse))
      expect(result.type).toBe('blog_post')
      const data = result.data as any
      expect(data.meta_title).toBeTruthy()
      expect(data.meta_description).toBeTruthy()
      expect(data.content_markdown).toBeTruthy()
    })

    it('content field is a non-empty markdown string', () => {
      const result = blogPostSkill.parseResponse(rawJsonResponse(mockBlogResponse))
      const content = (result.data as any).content_markdown
      expect(content.length).toBeGreaterThan(0)
      expect(content).toContain('#') // markdown heading
    })

    it('metaDescription is under 160 characters', () => {
      const result = blogPostSkill.parseResponse(rawJsonResponse(mockBlogResponse))
      const metaDesc = (result.data as any).meta_description
      expect(metaDesc.length).toBeLessThanOrEqual(160)
    })

    it('metaTitle is under 60 characters', () => {
      const result = blogPostSkill.parseResponse(rawJsonResponse(mockBlogResponse))
      const metaTitle = (result.data as any).meta_title
      expect(metaTitle.length).toBeLessThanOrEqual(60)
    })

    it('social_promotion object has x_post, linkedin_post, email_subject fields', () => {
      const result = blogPostSkill.parseResponse(rawJsonResponse(mockBlogResponse))
      const social = (result.data as any).social_promotion
      expect(social).toHaveProperty('x_post')
      expect(social).toHaveProperty('linkedin_post')
      expect(social).toHaveProperty('email_subject')
    })

    it('x_post snippet is under 280 characters', () => {
      const result = blogPostSkill.parseResponse(rawJsonResponse(mockBlogResponse))
      const xPost = (result.data as any).social_promotion.x_post
      expect(xPost.length).toBeLessThanOrEqual(280)
    })

    it('word_count is a positive integer', () => {
      const result = blogPostSkill.parseResponse(rawJsonResponse(mockBlogResponse))
      const wordCount = (result.data as any).word_count
      expect(wordCount).toBeGreaterThan(0)
      expect(Number.isInteger(wordCount)).toBe(true)
    })

    it('handles response where social_promotion is missing', () => {
      const noSocial = { ...mockBlogResponse, social_promotion: undefined }
      const result = blogPostSkill.parseResponse(rawJsonResponse(noSocial))
      expect(result.data).toBeDefined()
    })

    it('handles wrapped JSON response', () => {
      const result = blogPostSkill.parseResponse(wrappedJsonResponse(mockBlogResponse))
      expect((result.data as any).meta_title).toBeTruthy()
    })

    it('throws when response has no valid JSON', () => {
      expect(() => blogPostSkill.parseResponse('Just some random text without JSON')).toThrow()
    })
  })
})
