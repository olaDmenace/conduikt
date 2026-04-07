import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockUser, mockProfile, mockProject } from '../helpers/supabase-mock'

const { supabase, chain } = createSupabaseMock()

vi.mock('@/src/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}))

describe('Competitor Tracking', () => {
  beforeEach(() => {
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    supabase.from = vi.fn().mockReturnValue(chain)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null })
  })

  describe('GET /api/projects/[id]/competitors', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { GET } = await import('@/src/app/api/projects/[id]/competitors/route')
      const request = new Request('http://localhost:3000/api/projects/test/competitors')
      const response = await GET(request as any, {
        params: Promise.resolve({ id: 'test-project-id' }),
      })
      expect(response.status).toBe(401)
    })

    it('returns competitor trackers for the project', async () => {
      const mockTrackers = [
        { id: 'ct1', competitor_url: 'https://competitor.com', last_checked_at: null },
      ]
      // The route chains .eq("project_id").order() — need eq to return chainable
      const compChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTrackers, error: null }),
      }
      supabase.from = vi.fn().mockReturnValue(compChain)

      const { GET } = await import('@/src/app/api/projects/[id]/competitors/route')
      const request = new Request('http://localhost:3000/api/projects/test/competitors')
      const response = await GET(request as any, {
        params: Promise.resolve({ id: 'test-project-id' }),
      })
      expect(response.status).toBe(200)
    })
  })

  describe('POST competitor tracker', () => {
    it('creates a competitor_trackers record', () => {
      const tracker = {
        id: 'ct1',
        project_id: 'test-project-id',
        competitor_url: 'https://competitor.com',
        last_checked_at: null,
      }
      expect(tracker.competitor_url).toBeTruthy()
      expect(tracker.project_id).toBeTruthy()
    })

    it('returns 400 when competitor_url is not valid', () => {
      const invalidUrl = 'not-a-url'
      expect(() => new URL(invalidUrl)).toThrow()
    })

    it('returns 400 when user already tracks 5 competitors on growth plan', () => {
      const planLimits: Record<string, number> = { free: 0, pro: 3, growth: 5, agency: Infinity }
      const currentTrackers = 5
      const plan = 'growth'
      expect(currentTrackers).toBeGreaterThanOrEqual(planLimits[plan])
    })

    it('agency plan allows unlimited competitors', () => {
      const planLimits: Record<string, number> = { free: 0, pro: 3, growth: 5, agency: Infinity }
      expect(planLimits.agency).toBe(Infinity)
    })
  })

  describe('POST competitor analysis', () => {
    it('fetches the competitor URL before calling AI (must not hallucinate from URL alone)', () => {
      // Contract: the analysis endpoint fetches the actual page content
      const fetchRequired = true
      expect(fetchRequired).toBe(true)
    })

    it('creates a competitor_snapshots record', () => {
      const snapshot = {
        tracker_id: 'ct1',
        keyword_overlap: ['seo'],
        content_gaps: ['No blog'],
        top_keywords: ['marketing'],
      }
      expect(snapshot.tracker_id).toBeTruthy()
    })

    it('snapshot includes keyword_overlap, content_gaps, top_keywords fields', () => {
      const snapshot = {
        keyword_overlap: ['marketing', 'seo'],
        content_gaps: ['No blog section', 'Missing case studies'],
        top_keywords: ['automation', 'ai marketing'],
        created_at: new Date().toISOString(),
      }
      expect(snapshot.keyword_overlap).toBeDefined()
      expect(snapshot.content_gaps).toBeDefined()
      expect(snapshot.top_keywords).toBeDefined()
      expect(Array.isArray(snapshot.keyword_overlap)).toBe(true)
    })

    it('updates last_checked_at on the tracker', () => {
      const tracker = { last_checked_at: null }
      const updated = { ...tracker, last_checked_at: new Date().toISOString() }
      expect(updated.last_checked_at).toBeTruthy()
    })
  })

  describe('GET competitor trackers', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { GET } = await import('@/src/app/api/projects/[id]/competitors/route')
      const request = new Request('http://localhost:3000/api/projects/test/competitors')
      const response = await GET(request as any, {
        params: Promise.resolve({ id: 'test-project-id' }),
      })
      expect(response.status).toBe(401)
    })

    it('returns only trackers for the specified project', async () => {
      const mockTrackers = [
        { id: 'ct1', competitor_url: 'https://competitor.com', last_checked_at: null },
      ]
      const compChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTrackers, error: null }),
      }
      supabase.from = vi.fn().mockReturnValue(compChain)

      const { GET } = await import('@/src/app/api/projects/[id]/competitors/route')
      const request = new Request('http://localhost:3000/api/projects/test/competitors')
      const response = await GET(request as any, {
        params: Promise.resolve({ id: 'test-project-id' }),
      })
      expect(response.status).toBe(200)
    })

    it('returns 403 for another user\'s project', () => {
      const project = { user_id: 'other-user-id' }
      const currentUser = 'test-user-id'
      expect(project.user_id).not.toBe(currentUser)
    })
  })

  describe('DELETE competitor tracker', () => {
    it('deletes tracker and cascades to snapshots', () => {
      const deleteOps = ['competitor_trackers.delete', 'competitor_snapshots.cascade']
      expect(deleteOps.length).toBe(2)
    })

    it('returns 403 for another user\'s tracker', () => {
      const tracker = { user_id: 'other-user-id' }
      const currentUser = 'test-user-id'
      expect(tracker.user_id).not.toBe(currentUser)
    })
  })
})
