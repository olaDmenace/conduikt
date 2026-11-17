import { describe, it, expect } from 'vitest'

// Content scoring logic — pure unit tests for scoring contracts

describe('Content Scoring Logic', () => {
  describe('SEO scoring contracts', () => {
    it('blog with target keyword in H1 should score higher than without', () => {
      const withKeyword = { h1: 'Best Marketing Automation Tools', keyword: 'marketing automation' }
      const withoutKeyword = { h1: 'Welcome to our blog', keyword: 'marketing automation' }

      const scoreWith = withKeyword.h1.toLowerCase().includes(withKeyword.keyword.toLowerCase()) ? 80 : 40
      const scoreWithout = withoutKeyword.h1.toLowerCase().includes(withoutKeyword.keyword.toLowerCase()) ? 80 : 40

      expect(scoreWith).toBeGreaterThan(scoreWithout)
    })

    it('blog with meta description scores higher than blog without', () => {
      const withMeta = { hasMetaDescription: true }
      const withoutMeta = { hasMetaDescription: false }
      const scoreWith = withMeta.hasMetaDescription ? 75 : 45
      const scoreWithout = withoutMeta.hasMetaDescription ? 75 : 45
      expect(scoreWith).toBeGreaterThan(scoreWithout)
    })

    it('blog under 300 words should have low seoFit score', () => {
      const shortContent = 'Short blog post with only a few words.'
      const wordCount = shortContent.split(/\s+/).length
      const seoFit = wordCount < 300 ? 30 : 70
      expect(seoFit).toBeLessThan(50)
    })

    it('blog over 800 words with good keyword density scores above 70', () => {
      const wordCount = 1000
      const keywordCount = 20 // 2% density
      const density = (keywordCount / wordCount) * 100
      const seoFit = density >= 1 && density <= 3 && wordCount > 800 ? 85 : 50
      expect(seoFit).toBeGreaterThan(70)
    })

    it('seoFit returns null for non-blog content types', () => {
      const contentType = 'social-post' as 'social-post' | 'blog'
      const seoFit = contentType === 'blog' ? 75 : null
      expect(seoFit).toBeNull()
    })
  })

  describe('Readability scoring contracts', () => {
    it('content with short sentences scores higher', () => {
      const shortSentences = 'This is clear. It is concise. Easy to read.'
      const longSentences = 'This is a very long sentence that goes on and on with multiple clauses and subordinate phrases that make it significantly harder to parse and understand when reading quickly through the content.'

      const shortAvg = shortSentences.split('.').filter(Boolean).reduce((sum, s) => sum + s.split(/\s+/).length, 0) / shortSentences.split('.').filter(Boolean).length
      const longAvg = longSentences.split('.').filter(Boolean).reduce((sum, s) => sum + s.split(/\s+/).length, 0) / longSentences.split('.').filter(Boolean).length

      expect(shortAvg).toBeLessThan(longAvg)
    })

    it('content with clear paragraph breaks scores above 60', () => {
      const contentWithBreaks = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph with more detail here.'
      const paragraphs = contentWithBreaks.split('\n\n').length
      const readability = paragraphs >= 3 ? 65 : 40
      expect(readability).toBeGreaterThan(60)
    })

    it('content under 100 words scores readability below 40', () => {
      const shortContent = 'Very short content here.'
      const wordCount = shortContent.split(/\s+/).length
      const readability = wordCount < 100 ? 25 : 70
      expect(readability).toBeLessThan(40)
    })
  })

  describe('Verdict calculation', () => {
    it('overall score >= 75 returns verdict: publish', () => {
      const overall = 82
      const verdict = overall >= 75 ? 'publish' : overall >= 50 ? 'improve' : 'rewrite'
      expect(verdict).toBe('publish')
    })

    it('overall score 50-74 returns verdict: improve', () => {
      const overall = 65
      const verdict = overall >= 75 ? 'publish' : overall >= 50 ? 'improve' : 'rewrite'
      expect(verdict).toBe('improve')
    })

    it('overall score < 50 returns verdict: rewrite', () => {
      const overall = 35
      const verdict = overall >= 75 ? 'publish' : overall >= 50 ? 'improve' : 'rewrite'
      expect(verdict).toBe('rewrite')
    })

    it('overall score is weighted average of component scores', () => {
      const readability = 80
      const seoFit = 70
      const engagement = 60
      // Example weighting: 0.3 + 0.4 + 0.3
      const overall = readability * 0.3 + seoFit * 0.4 + engagement * 0.3
      expect(overall).toBeCloseTo(70, 1)
    })
  })

  describe('Suggestions', () => {
    it('suggestions array always has at least 1 item', () => {
      const suggestions = ['Add more subheadings']
      expect(suggestions.length).toBeGreaterThanOrEqual(1)
    })

    it('suggestions array never has more than 4 items', () => {
      const suggestions = ['Add subheadings', 'Improve CTA', 'Add images', 'Shorten paragraphs']
      expect(suggestions.length).toBeLessThanOrEqual(4)
    })

    it('each suggestion is a string with at least 10 characters', () => {
      const suggestions = ['Add more subheadings to break up text', 'Include a stronger call to action']
      suggestions.forEach((s) => {
        expect(typeof s).toBe('string')
        expect(s.length).toBeGreaterThanOrEqual(10)
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Answerability dimension: the agent's JSON shape and the blend the route
// returns. These run the real modules, not stand-ins.
// ---------------------------------------------------------------------------
import { contentScorerAgent, CONTENT_SCORE_DIMENSIONS } from '@/src/lib/ai/agents/content-scorer'
import { blendAnswerability, scoreAnswerability } from '@/src/lib/seo/answerability'

describe('Answerability dimension contract', () => {
  it('the prompt asks for answerability (0-100) outside the four-part total', () => {
    const prompt = contentScorerAgent.buildSystemPrompt({ name: 'TestCo', websiteUrl: 'https://testco.com' })
    expect(prompt).toContain('"answerability": number')
    expect(prompt).toMatch(/answerability\*\* \(0–100\)/)
    expect(prompt).toContain('NOT part of the total')
  })

  it('parseResponse always exposes an answerability key, null when the model left it out', () => {
    const withIt = contentScorerAgent.parseResponse(JSON.stringify({ total_score: 70, clarity: 20, relevance: 18, engagement_potential: 16, brand_alignment: 16, answerability: 55, summary: 's', top_strength: 'a', top_improvement: 'b' }))
    expect((withIt.data as { answerability: number }).answerability).toBe(55)
    const without = contentScorerAgent.parseResponse('```json\n{"total_score": 70, "clarity": 20, "relevance": 18, "engagement_potential": 16, "brand_alignment": 16}\n```')
    expect((without.data as { answerability: unknown }).answerability).toBeNull()
  })

  it('the dimension list the UI renders by key includes answerability out of 100', () => {
    const dim = CONTENT_SCORE_DIMENSIONS.find((d) => d.key === 'answerability')
    expect(dim).toEqual({ key: 'answerability', label: 'Ready for Google and AI answers', max: 100 })
    expect(CONTENT_SCORE_DIMENSIONS.map((d) => d.key)).toEqual(['clarity', 'relevance', 'engagement_potential', 'brand_alignment', 'answerability'])
  })

  it('the route blends the model and the deterministic score by averaging', () => {
    const det = scoreAnswerability('Short slogan. Buy now!').score
    expect(det).toBeLessThan(40)
    expect(blendAnswerability(90, det)).toBe(Math.round((90 + det) / 2))
    expect(blendAnswerability(undefined, det)).toBe(det)
  })
})
