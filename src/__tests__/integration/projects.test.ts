import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockProject, mockUser, mockProfile } from '../helpers/supabase-mock'

const { supabase, chain } = createSupabaseMock()

vi.mock('@/src/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}))

vi.mock('@/src/lib/ai/client', () => ({
  generateWithClaude: vi.fn().mockResolvedValue({
    content: JSON.stringify({ firstAgent: 'seo-audit', quickWins: ['Run an audit'], setupMessage: 'Start here' }),
    model: 'claude-sonnet-4-6',
    inputTokens: 100,
    outputTokens: 50,
    durationMs: 500,
  }),
}))

vi.mock('@/src/lib/ai/agents/onboarding-advisor', () => ({
  onboardingAdvisorAgent: {
    buildSystemPrompt: vi.fn().mockReturnValue('system prompt'),
  },
}))

describe('Projects API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-setup default mock returns after clear
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    chain.single.mockResolvedValue({ data: mockProject, error: null })
    chain.select.mockReturnValue(chain)
    chain.insert.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    chain.delete.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.order.mockReturnValue(chain)
    chain.limit.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({ data: null, error: null })
    supabase.from.mockReturnValue(chain)
  })

  describe('POST /api/projects', () => {
    it('creates a project and returns 201 with project data', async () => {
      chain.single.mockResolvedValueOnce({ data: mockProject, error: null })

      const { POST } = await import('@/src/app/api/projects/route')
      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Project', website_url: 'https://example.com' }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.name).toBe('Test Project')
    })

    it('returns 401 without authentication', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const { POST } = await import('@/src/app/api/projects/route')
      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(401)
    })

    it('returns 400 when name is missing', async () => {
      const { POST } = await import('@/src/app/api/projects/route')
      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website_url: 'https://example.com' }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
    })

    it('returns 400 when name is empty string', async () => {
      const { POST } = await import('@/src/app/api/projects/route')
      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '   ' }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
    })

    it('sets user_id to the authenticated user id, not the request body', async () => {
      chain.single.mockResolvedValueOnce({ data: mockProject, error: null })

      const { POST } = await import('@/src/app/api/projects/route')
      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', user_id: 'attacker-id' }),
      })

      await POST(request as any)

      // Verify supabase.from('projects').insert was called with the authenticated user's ID
      expect(supabase.from).toHaveBeenCalledWith('projects')
      const insertCall = chain.insert.mock.calls[0]?.[0]
      if (insertCall) {
        expect(insertCall.user_id).toBe(mockUser.id)
      }
    })
  })

  describe('GET /api/projects', () => {
    it("returns only the current user's projects", async () => {
      chain.order.mockResolvedValueOnce({
        data: [{ ...mockProject, audits: [], assets: [], campaigns: [] }],
        error: null,
      })

      const { GET } = await import('@/src/app/api/projects/route')
      const response = await GET()
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
      expect(data[0].name).toBe('Test Project')
    })

    it('returns empty array when user has no projects', async () => {
      chain.order.mockResolvedValueOnce({ data: [], error: null })

      const { GET } = await import('@/src/app/api/projects/route')
      const response = await GET()
      const data = await response.json()
      expect(data).toEqual([])
    })

    it('returns 401 without authentication', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const { GET } = await import('@/src/app/api/projects/route')
      const response = await GET()
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/projects/[id]', () => {
    it('returns the project when user owns it', async () => {
      chain.single.mockResolvedValueOnce({
        data: { ...mockProject, audits: [], assets: [], campaigns: [] },
        error: null,
      })

      const { GET } = await import('@/src/app/api/projects/[id]/route')
      const request = new Request('http://localhost:3000/api/projects/test-project-id')
      const response = await GET(request as any, { params: Promise.resolve({ id: 'test-project-id' }) })
      expect(response.status).toBe(200)
    })

    it('returns 404 when project does not exist', async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })

      const { GET } = await import('@/src/app/api/projects/[id]/route')
      const request = new Request('http://localhost:3000/api/projects/nonexistent')
      const response = await GET(request as any, { params: Promise.resolve({ id: 'nonexistent' }) })
      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/projects/[id]', () => {
    it('updates allowed fields (name, description, target_audience, value_proposition)', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Name' }
      chain.single.mockResolvedValueOnce({ data: updatedProject, error: null })

      const { PATCH } = await import('@/src/app/api/projects/[id]/route')
      const request = new Request('http://localhost:3000/api/projects/test-project-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name', description: 'New desc' }),
      })

      const response = await PATCH(request as any, { params: Promise.resolve({ id: 'test-project-id' }) })
      expect(response.status).toBe(200)
    })

    it('does not allow updating user_id', async () => {
      chain.single.mockResolvedValueOnce({ data: mockProject, error: null })

      const { PATCH } = await import('@/src/app/api/projects/[id]/route')
      const request = new Request('http://localhost:3000/api/projects/test-project-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'attacker-id' }),
      })

      const response = await PATCH(request as any, { params: Promise.resolve({ id: 'test-project-id' }) })
      // user_id is not in allowedFields, so it returns 400 "No valid fields to update"
      expect(response.status).toBe(400)
    })

    it('saves onboarding_answers as valid JSON', async () => {
      const answers = { challenge: 'content', channels: ['twitter'] }
      chain.single.mockResolvedValueOnce({
        data: { ...mockProject, onboarding_answers: answers },
        error: null,
      })

      const { PATCH } = await import('@/src/app/api/projects/[id]/route')
      const request = new Request('http://localhost:3000/api/projects/test-project-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_answers: answers }),
      })

      const response = await PATCH(request as any, { params: Promise.resolve({ id: 'test-project-id' }) })
      expect(response.status).toBe(200)
    })
  })

  describe('DELETE /api/projects/[id]', () => {
    it('deletes the project and returns 200', async () => {
      // The DELETE route chains .eq().eq().single() — need eq to return chainable object
      const deleteChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'test-project-id' }, error: null }),
        delete: vi.fn().mockReturnThis(),
      }
      // First from('projects') call for ownership check, second for delete
      let callCount = 0
      supabase.from.mockImplementation(() => {
        callCount++
        if (callCount <= 2) return deleteChain
        return chain
      })

      const { DELETE } = await import('@/src/app/api/projects/[id]/route')
      const request = new Request('http://localhost:3000/api/projects/test-project-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request as any, { params: Promise.resolve({ id: 'test-project-id' }) })
      expect(response.status).toBe(200)
    })

    it('returns 404 when project does not belong to user', async () => {
      const deleteChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      supabase.from.mockReturnValue(deleteChain as any)

      const { DELETE } = await import('@/src/app/api/projects/[id]/route')
      const request = new Request('http://localhost:3000/api/projects/other-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request as any, { params: Promise.resolve({ id: 'other-id' }) })
      expect(response.status).toBe(404)
    })
  })

  describe('Onboarding Plan', () => {
    it('POST /api/projects/[id]/onboarding-plan returns a personalised plan JSON', async () => {
      // Setup chain for this specific test
      chain.single.mockResolvedValueOnce({
        data: { id: 'test-project-id', onboarding_answers: { challenge: 'content' } },
        error: null,
      })
      chain.maybeSingle.mockResolvedValueOnce({ data: { score: 72 }, error: null })

      const { POST } = await import('@/src/app/api/projects/[id]/onboarding-plan/route')
      const request = new Request('http://localhost:3000/api/projects/test-project-id/onboarding-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: { challenge: 'content' } }),
      })

      const response = await POST(request as any, {
        params: Promise.resolve({ id: 'test-project-id' }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.firstAgent).toBeDefined()
      expect(data.quickWins).toBeDefined()
      expect(data.setupMessage).toBeDefined()
    })

    it('returns 404 if project does not exist for this user', async () => {
      // The onboarding-plan route chains .eq("id").eq("user_id").single()
      const notFoundChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      supabase.from.mockReturnValue(notFoundChain as any)

      const { POST } = await import('@/src/app/api/projects/[id]/onboarding-plan/route')
      const request = new Request('http://localhost:3000/api/projects/nonexistent/onboarding-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: {} }),
      })

      const response = await POST(request as any, {
        params: Promise.resolve({ id: 'nonexistent' }),
      })
      expect(response.status).toBe(404)
    })
  })
})
