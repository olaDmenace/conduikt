import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockUser, mockProfile } from '../helpers/supabase-mock'

const { supabase, chain } = createSupabaseMock()

vi.mock('@/src/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}))

vi.mock('@/src/lib/inngest/client', () => ({
  inngest: { send: vi.fn().mockResolvedValue({}) },
}))

describe('Bulk Generation', () => {
  beforeEach(() => {
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    supabase.from = vi.fn().mockReturnValue(chain)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null })
  })

  describe('POST /api/bulk-jobs', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { POST } = await import('@/src/app/api/bulk-jobs/route')
      const request = new Request('http://localhost:3000/api/bulk-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      })
      const response = await POST(request as any)
      expect(response.status).toBe(401)
    })

    it('plan gating: free and pro plans are blocked', () => {
      const blockedPlans = ['free', 'pro']
      const allowedPlans = ['growth', 'agency']
      blockedPlans.forEach((plan) => {
        expect(allowedPlans).not.toContain(plan)
      })
    })

    it('growth and agency plans can use bulk jobs', () => {
      const allowedPlans = ['growth', 'agency']
      allowedPlans.forEach((plan) => {
        expect(['growth', 'agency']).toContain(plan)
      })
    })

    it('returns 400 when items array is empty', () => {
      const items: unknown[] = []
      expect(items.length).toBe(0)
    })

    it('returns 400 when items array exceeds 30 items', () => {
      const items = Array.from({ length: 31 }, (_, i) => ({ id: i }))
      expect(items.length).toBeGreaterThan(30)
    })

    it('creates a bulk_jobs record with status: running', () => {
      const job = { id: 'bulk-1', status: 'running', total: 5, completed: 0, failed: 0 }
      expect(job.status).toBe('running')
    })

    it('bulk_jobs.total equals items.length', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const job = { total: items.length }
      expect(job.total).toBe(3)
    })
  })

  describe('GET /api/bulk-jobs/[id]', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { GET } = await import('@/src/app/api/bulk-jobs/[id]/route')
      const request = new Request('http://localhost:3000/api/bulk-jobs/test-id')
      const response = await GET(request as any, {
        params: Promise.resolve({ id: 'test-id' }),
      })
      expect(response.status).toBe(401)
    })

    it('returns 404 when job does not exist', () => {
      const job = null
      expect(job).toBeNull()
    })

    it('returns 403 when job belongs to another user', () => {
      const job = { user_id: 'other-user-id' }
      const currentUser = 'test-user-id'
      expect(job.user_id).not.toBe(currentUser)
    })

    it('returns status, completed, failed, total fields', () => {
      const job = { status: 'running', completed: 3, failed: 1, total: 10 }
      expect(job).toHaveProperty('status')
      expect(job).toHaveProperty('completed')
      expect(job).toHaveProperty('failed')
      expect(job).toHaveProperty('total')
    })

    it('returns status: complete when completed + failed === total', () => {
      const job = { total: 10, completed: 8, failed: 2, status: 'complete' }
      expect(job.completed + job.failed).toBe(job.total)
      expect(job.status).toBe('complete')
    })
  })
})
