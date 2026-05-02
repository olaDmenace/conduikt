import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockProject, mockUser, mockProfile } from '../helpers/supabase-mock'

const { supabase, chain } = createSupabaseMock()

vi.mock('@/src/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}))

// Webhook dispatch is fire-and-forget — stub it so tests don't hit a real
// network path.
vi.mock('@/src/lib/integrations/webhook-dispatch', () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}))

const SAMPLE_PLAN_CONTENT = {
  plan: {
    title: 'Q3 Launch',
    weeks: [
      { week: 1, theme: 'Tease', tasks: ['Email teaser', 'X poll'] },
      { week: 2, theme: 'Reveal', tasks: ['Landing page live', 'Press kit'] },
    ],
  },
}

describe('Launch Plan flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    chain.single.mockResolvedValue({ data: mockProject, error: null })
    chain.select.mockReturnValue(chain)
    chain.insert.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    chain.delete.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.neq.mockReturnValue(chain)
    chain.order.mockReturnValue(chain)
    chain.limit.mockReturnValue(chain)
    supabase.from.mockReturnValue(chain)
  })

  describe('POST /api/projects/[id]/assets — save launch_plan', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const { POST } = await import('@/src/app/api/projects/[id]/assets/route')
      const request = new Request('http://localhost/api/projects/test/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'launch_plan', content: SAMPLE_PLAN_CONTENT }),
      })
      const response = await POST(request as never, { params: Promise.resolve({ id: 'test-project-id' }) })
      expect(response.status).toBe(401)
    })

    it('returns 400 for unknown asset type', async () => {
      // Type validation runs after plan-gating, so the user must be on a
      // paid plan to reach the type check.
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null })
        .mockResolvedValueOnce({ data: { ...mockProfile, plan: 'pro' }, error: null })

      const { POST } = await import('@/src/app/api/projects/[id]/assets/route')
      const request = new Request('http://localhost/api/projects/test/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'not_a_real_type', content: {} }),
      })
      const response = await POST(request as never, { params: Promise.resolve({ id: 'test-project-id' }) })
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toMatch(/Invalid asset type/i)
    })

    it('blocks free-tier users with 403 PLAN_GATED', async () => {
      // verifyProjectOwnership single() then profile single()
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null })
        .mockResolvedValueOnce({ data: { ...mockProfile, plan: 'free' }, error: null })

      const { POST } = await import('@/src/app/api/projects/[id]/assets/route')
      const request = new Request('http://localhost/api/projects/test/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'launch_plan', content: SAMPLE_PLAN_CONTENT }),
      })
      const response = await POST(request as never, { params: Promise.resolve({ id: 'test-project-id' }) })
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.code).toBe('PLAN_GATED')
    })

    it('saves a launch_plan asset for a paid user (201)', async () => {
      const savedAsset = {
        id: 'asset-launch-1',
        project_id: 'test-project-id',
        type: 'launch_plan',
        channel: null,
        title: 'Q3 Launch',
        content: SAMPLE_PLAN_CONTENT,
        status: 'draft',
      }
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null }) // verifyProjectOwnership
        .mockResolvedValueOnce({ data: { ...mockProfile, plan: 'pro' }, error: null }) // profile
        .mockResolvedValueOnce({ data: savedAsset, error: null }) // insert().select().single()

      const { POST } = await import('@/src/app/api/projects/[id]/assets/route')
      const request = new Request('http://localhost/api/projects/test/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'launch_plan',
          title: 'Q3 Launch',
          content: SAMPLE_PLAN_CONTENT,
        }),
      })
      const response = await POST(request as never, { params: Promise.resolve({ id: 'test-project-id' }) })
      expect(response.status).toBe(201)

      // Confirm we INSERT with type=launch_plan and the plan content intact
      const insertCalls = chain.insert.mock.calls
      const launchInsert = insertCalls.find(
        (call: unknown[]) => (call[0] as { type?: string })?.type === 'launch_plan'
      )
      expect(launchInsert).toBeDefined()
      const inserted = launchInsert![0] as Record<string, unknown>
      expect(inserted.project_id).toBe('test-project-id')
      expect(inserted.status).toBe('draft')
      expect(inserted.content).toEqual(SAMPLE_PLAN_CONTENT)
    })

    it('rejects an invalid channel even with a valid type', async () => {
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null })
        .mockResolvedValueOnce({ data: { ...mockProfile, plan: 'pro' }, error: null })

      const { POST } = await import('@/src/app/api/projects/[id]/assets/route')
      const request = new Request('http://localhost/api/projects/test/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'launch_plan',
          channel: 'tiktok', // not in validChannels
          content: SAMPLE_PLAN_CONTENT,
        }),
      })
      const response = await POST(request as never, { params: Promise.resolve({ id: 'test-project-id' }) })
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/projects/[id]/assets/[assetId] — reload', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const { GET } = await import('@/src/app/api/projects/[id]/assets/[assetId]/route')
      const response = await GET(new Request('http://localhost/foo') as never, {
        params: Promise.resolve({ id: 'test-project-id', assetId: 'asset-1' }),
      })
      expect(response.status).toBe(401)
    })

    it('returns the saved launch plan content for the owner', async () => {
      const savedAsset = {
        id: 'asset-launch-1',
        project_id: 'test-project-id',
        type: 'launch_plan',
        channel: null,
        title: 'Q3 Launch',
        content: SAMPLE_PLAN_CONTENT,
        status: 'draft',
      }
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null }) // verifyProjectOwnership
        .mockResolvedValueOnce({ data: savedAsset, error: null }) // asset fetch

      const { GET } = await import('@/src/app/api/projects/[id]/assets/[assetId]/route')
      const response = await GET(new Request('http://localhost/foo') as never, {
        params: Promise.resolve({ id: 'test-project-id', assetId: 'asset-launch-1' }),
      })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.type).toBe('launch_plan')
      expect(body.content).toEqual(SAMPLE_PLAN_CONTENT)
      // The reload path on the page reads from content.plan — confirm it's there
      expect((body.content as Record<string, unknown>).plan).toBeDefined()
    })

    it('returns 404 when asset is not found', async () => {
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'No rows', code: 'PGRST116' } })

      const { GET } = await import('@/src/app/api/projects/[id]/assets/[assetId]/route')
      const response = await GET(new Request('http://localhost/foo') as never, {
        params: Promise.resolve({ id: 'test-project-id', assetId: 'missing' }),
      })
      expect(response.status).toBe(404)
    })
  })
})
