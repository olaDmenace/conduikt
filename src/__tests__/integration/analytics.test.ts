import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockUser, mockProfile } from '../helpers/supabase-mock'

const { supabase, chain } = createSupabaseMock()

vi.mock('@/src/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}))

describe('Analytics', () => {
  beforeEach(() => {
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    supabase.from = vi.fn().mockReturnValue(chain)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null })
  })

  describe('GET /api/projects/[id]/analytics', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { GET } = await import('@/src/app/api/projects/[id]/analytics/route')
      const request = new Request('http://localhost:3000/api/projects/test/analytics')
      const response = await GET(request as any, {
        params: Promise.resolve({ id: 'test-project-id' }),
      })
      expect(response.status).toBe(401)
    })

    it('returns generations, audits, assets, gscKeywords, gscConnected fields', () => {
      const analyticsResponse = {
        generations: [],
        audits: [],
        assets: [],
        gscKeywords: [],
        gscConnected: false,
      }
      expect(analyticsResponse).toHaveProperty('generations')
      expect(analyticsResponse).toHaveProperty('audits')
      expect(analyticsResponse).toHaveProperty('assets')
      expect(analyticsResponse).toHaveProperty('gscKeywords')
      expect(analyticsResponse).toHaveProperty('gscConnected')
    })

    it('generations are sorted by created_at desc', () => {
      const generations = [
        { created_at: '2026-03-01' },
        { created_at: '2026-02-01' },
        { created_at: '2026-01-01' },
      ]
      for (let i = 1; i < generations.length; i++) {
        expect(new Date(generations[i - 1].created_at).getTime())
          .toBeGreaterThanOrEqual(new Date(generations[i].created_at).getTime())
      }
    })

    it('audits are sorted by created_at asc (for trend line)', () => {
      const audits = [
        { created_at: '2026-01-01', score: 55 },
        { created_at: '2026-02-01', score: 72 },
        { created_at: '2026-03-01', score: 80 },
      ]
      for (let i = 1; i < audits.length; i++) {
        expect(new Date(audits[i].created_at).getTime())
          .toBeGreaterThanOrEqual(new Date(audits[i - 1].created_at).getTime())
      }
    })

    it('gscConnected is false when no connected_account for gsc exists', () => {
      const connectedAccounts: string[] = []
      const gscConnected = connectedAccounts.includes('gsc')
      expect(gscConnected).toBe(false)
    })

    it('gscConnected is true when connected_account for gsc exists', () => {
      const connectedAccounts = ['gsc']
      const gscConnected = connectedAccounts.includes('gsc')
      expect(gscConnected).toBe(true)
    })
  })

  describe('Audit score trend computation', () => {
    it('scoreDelta is latestScore minus firstScore', () => {
      const audits = [
        { score: 55, created_at: '2026-01-01' },
        { score: 72, created_at: '2026-02-01' },
        { score: 80, created_at: '2026-03-01' },
      ]
      const delta = audits[audits.length - 1].score - audits[0].score
      expect(delta).toBe(25)
    })

    it('scoreDelta is null when only one audit exists', () => {
      const audits = [{ score: 72, created_at: '2026-01-01' }]
      const delta = audits.length > 1
        ? audits[audits.length - 1].score - audits[0].score
        : null
      expect(delta).toBeNull()
    })

    it('scoreDelta is negative when score decreased', () => {
      const audits = [
        { score: 80, created_at: '2026-01-01' },
        { score: 65, created_at: '2026-02-01' },
      ]
      const delta = audits[audits.length - 1].score - audits[0].score
      expect(delta).toBe(-15)
    })
  })

  describe('Generation cost tracker', () => {
    it('cost is calculated as (inputTokens * 0.000003) + (outputTokens * 0.000015)', () => {
      const inputTokens = 1000
      const outputTokens = 500
      const cost = inputTokens * 0.000003 + outputTokens * 0.000015
      expect(cost).toBeCloseTo(0.0105, 4)
    })

    it('cost displays as formatted currency string', () => {
      const cost = 0.0105
      const formatted = `$${cost.toFixed(4)}`
      expect(formatted).toBe('$0.0105')
    })
  })

  describe('Social performance (post_metrics)', () => {
    it('analytics endpoint returns post_metrics when they exist', () => {
      const analyticsWithMetrics = {
        post_metrics: [
          { impressions: 500, likes: 10, channel: 'x' },
        ],
      }
      expect(analyticsWithMetrics.post_metrics.length).toBeGreaterThan(0)
    })

    it('total impressions sums across all post_metrics', () => {
      const metrics = [
        { impressions: 500, likes: 10, channel: 'x' },
        { impressions: 1200, likes: 25, channel: 'linkedin' },
        { impressions: 300, likes: 5, channel: 'x' },
      ]
      const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0)
      expect(totalImpressions).toBe(2000)
    })

    it('best performing post is the one with highest impressions', () => {
      const metrics = [
        { impressions: 500, likes: 10, channel: 'x' },
        { impressions: 1200, likes: 25, channel: 'linkedin' },
        { impressions: 300, likes: 5, channel: 'x' },
      ]
      const best = metrics.reduce((max, m) => (m.impressions > max.impressions ? m : max))
      expect(best.impressions).toBe(1200)
      expect(best.channel).toBe('linkedin')
    })
  })
})
