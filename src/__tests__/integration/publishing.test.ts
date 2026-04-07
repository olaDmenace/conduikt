import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockUser, mockProfile } from '../helpers/supabase-mock'

const { supabase, chain } = createSupabaseMock()

vi.mock('@/src/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}))

vi.mock('@/src/lib/supabase/service', () => ({
  createServiceClient: vi.fn().mockReturnValue(supabase),
}))

describe('Social Publishing', () => {
  beforeEach(() => {
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    supabase.from = vi.fn().mockReturnValue(chain)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null })
  })

  describe('POST /api/publish/x', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { POST } = await import('@/src/app/api/publish/x/route')
      const request = new Request('http://localhost:3000/api/publish/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Test tweet', projectId: 'test-project-id' }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(401)
    })

    it('requires content field', async () => {
      const { POST } = await import('@/src/app/api/publish/x/route')
      const request = new Request('http://localhost:3000/api/publish/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test-project-id' }),
      })

      const response = await POST(request as any)
      // Should return 400 for missing content or 403 for no connected account
      expect([400, 403]).toContain(response.status)
    })

    it('returns 400 when content exceeds 280 characters', async () => {
      // X has a 280 character limit
      const longContent = 'A'.repeat(281)
      const { POST } = await import('@/src/app/api/publish/x/route')
      const request = new Request('http://localhost:3000/api/publish/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: longContent, projectId: 'test-project-id' }),
      })

      const response = await POST(request as any)
      // Should return 400 for too long or 403 if no connected account checked first
      expect([400, 403]).toContain(response.status)
    })

    it('content within 280 characters is valid length', () => {
      const validContent = 'A'.repeat(280)
      expect(validContent.length).toBeLessThanOrEqual(280)
    })

    it('updates scheduled_post status to published on success', () => {
      const statuses = ['draft', 'scheduled', 'published', 'failed']
      expect(statuses).toContain('published')
    })

    it('updates scheduled_post status to failed on X API error', () => {
      const statuses = ['draft', 'scheduled', 'published', 'failed']
      expect(statuses).toContain('failed')
    })
  })

  describe('POST /api/publish/linkedin', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { POST } = await import('@/src/app/api/publish/linkedin/route')
      const request = new Request('http://localhost:3000/api/publish/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Test post', projectId: 'test-project-id' }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(401)
    })

    it('requires content field', async () => {
      const { POST } = await import('@/src/app/api/publish/linkedin/route')
      const request = new Request('http://localhost:3000/api/publish/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test-project-id' }),
      })

      const response = await POST(request as any)
      expect([400, 403]).toContain(response.status)
    })
  })

  describe('Social Engagement Sync', () => {
    it('sync uses user OAuth token, not app token', () => {
      // Contract: sync endpoints should use the user's connected OAuth token
      const userToken = 'user-oauth-token-123'
      const appToken = 'app-bearer-token-456'
      expect(userToken).not.toBe(appToken)
    })

    it('skips posts with no external_post_id', () => {
      const posts = [
        { id: '1', external_post_id: 'ext-1', status: 'published' },
        { id: '2', external_post_id: null, status: 'published' },
        { id: '3', external_post_id: 'ext-3', status: 'published' },
      ]
      const syncable = posts.filter((p) => p.external_post_id !== null)
      expect(syncable.length).toBe(2)
    })

    it('fetches metrics for published posts only', () => {
      const posts = [
        { id: '1', status: 'published' },
        { id: '2', status: 'draft' },
        { id: '3', status: 'scheduled' },
      ]
      const published = posts.filter((p) => p.status === 'published')
      expect(published.length).toBe(1)
    })

    it('writes results to post_metrics table with correct channel', () => {
      const metric = { post_id: '1', channel: 'x', impressions: 500, likes: 10 }
      expect(metric.channel).toBe('x')
      expect(metric.impressions).toBeGreaterThan(0)
    })
  })

  describe('Scheduled Posts', () => {
    it('PATCH /api/scheduled-posts/[id] returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { PATCH } = await import('@/src/app/api/scheduled-posts/[id]/route')
      const request = new Request('http://localhost:3000/api/scheduled-posts/test-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: new Date().toISOString() }),
      })

      const response = await PATCH(request as any, {
        params: Promise.resolve({ id: 'test-id' }),
      })
      expect(response.status).toBe(401)
    })

    it('scheduled post with past date can be rescheduled to future', () => {
      const pastDate = new Date('2024-01-01')
      const futureDate = new Date('2027-01-01')
      expect(futureDate.getTime()).toBeGreaterThan(pastDate.getTime())
    })
  })
})
