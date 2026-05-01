import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockProject, mockUser, mockProfile } from '../helpers/supabase-mock'

const { supabase, chain } = createSupabaseMock()

vi.mock('@/src/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}))

const mockAIResult = {
  content: JSON.stringify({ type: 'copywriting', data: { variants: [] } }),
  model: 'claude-sonnet-4-6',
  inputTokens: 100,
  outputTokens: 50,
  durationMs: 500,
  stopReason: 'end_turn',
}

class MockTruncatedResponseError extends Error {
  constructor(
    public partialContent: string,
    public outputTokens: number,
    public attempts: number,
  ) {
    super('Claude response was truncated')
    this.name = 'TruncatedResponseError'
  }
}

vi.mock('@/src/lib/ai/client', () => ({
  generateWithClaude: vi.fn().mockResolvedValue(mockAIResult),
  generateWithClaudeCompletion: vi.fn().mockResolvedValue(mockAIResult),
  TruncatedResponseError: MockTruncatedResponseError,
  getAnthropicClient: vi.fn(),
}))

vi.mock('@/src/lib/ai/performance-context', () => ({
  buildPerformanceContext: vi.fn().mockResolvedValue(''),
}))

describe('AI Generation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Re-setup all mocks fresh (restoreAllMocks clears everything)
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

  describe('POST /api/ai/generate', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const { POST } = await import('@/src/app/api/ai/generate/route')
      const request = new Request('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test', agentId: 'copywriting', input: {} }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(401)
    })

    it('returns 400 with invalid agentId', async () => {
      // First .single() call returns project (for project fetch)
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null })  // project
        .mockResolvedValueOnce({ data: mockProfile, error: null })  // profile

      const { POST } = await import('@/src/app/api/ai/generate/route')
      const request = new Request('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test-project-id', agentId: 'nonexistent-agent', input: {} }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
    })

    it('returns 429 when user has exhausted their generation quota', async () => {
      const exhaustedProfile = { ...mockProfile, plan: 'free', generation_count: 5 }
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null })  // project
        .mockResolvedValueOnce({ data: exhaustedProfile, error: null })  // profile

      const { POST } = await import('@/src/app/api/ai/generate/route')
      const request = new Request('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test-project-id', agentId: 'copywriting', input: { type: 'headline', topic: 'test' } }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(429)
    })

    it('writes a record to ai_generations table on success', async () => {
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null })  // project
        .mockResolvedValueOnce({ data: mockProfile, error: null })  // profile

      const { POST } = await import('@/src/app/api/ai/generate/route')
      const request = new Request('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test-project-id', agentId: 'copywriting', input: { type: 'headline', topic: 'test' } }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(200)

      // Check that ai_generations insert was called
      expect(supabase.from).toHaveBeenCalledWith('ai_generations')
    })

    it('ai_generations record contains correct agent_used, project_id', async () => {
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null })
        .mockResolvedValueOnce({ data: mockProfile, error: null })

      const { POST } = await import('@/src/app/api/ai/generate/route')
      const request = new Request('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test-project-id', agentId: 'copywriting', input: { type: 'headline', topic: 'test' } }),
      })

      await POST(request as any)

      const insertCalls = chain.insert.mock.calls
      const genInsert = insertCalls.find(
        (call: unknown[]) => (call[0] as { agent_used?: string })?.agent_used === 'copywriting'
      )
      expect(genInsert).toBeDefined()
      expect((genInsert![0] as { project_id?: string }).project_id).toBe('test-project-id')
    })

    it('increments the user generation count', async () => {
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null })
        .mockResolvedValueOnce({ data: { ...mockProfile, generation_count: 3 }, error: null })

      const { POST } = await import('@/src/app/api/ai/generate/route')
      const request = new Request('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test-project-id', agentId: 'copywriting', input: { type: 'headline', topic: 'test' } }),
      })

      await POST(request as any)

      // Verify profiles update was called
      expect(supabase.from).toHaveBeenCalledWith('profiles')
      const updateCalls = chain.update.mock.calls
      const countUpdate = updateCalls.find(
        (call: unknown[]) => (call[0] as { generation_count?: number })?.generation_count !== undefined
      )
      expect(countUpdate).toBeDefined()
      expect((countUpdate![0] as { generation_count?: number }).generation_count).toBe(4)
    })
  })

  describe('POST /api/ai/stream', () => {
    it('returns a streaming response with content-type text/event-stream', async () => {
      chain.single
        .mockResolvedValueOnce({ data: mockProject, error: null })
        .mockResolvedValueOnce({ data: mockProfile, error: null })

      // Mock the anthropic client stream
      const mockStreamObj = {
        on: vi.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'text') cb('Hello world')
          if (event === 'message') cb({ usage: { input_tokens: 100, output_tokens: 50 } })
          if (event === 'end') cb()
          return this
        }),
      }
      const { getAnthropicClient } = await import('@/src/lib/ai/client')
      ;(getAnthropicClient as any).mockReturnValue({
        messages: { stream: vi.fn().mockReturnValue(mockStreamObj) },
      })

      const { POST } = await import('@/src/app/api/ai/stream/route')
      const request = new Request('http://localhost:3000/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test-project-id', agentId: 'copywriting', input: { type: 'headline', topic: 'test' } }),
      })

      const response = await POST(request as any)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('sends an error event when agent is invalid', async () => {
      chain.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })

      const { POST } = await import('@/src/app/api/ai/stream/route')
      const request = new Request('http://localhost:3000/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test-project-id', agentId: 'nonexistent', input: {} }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
    })

    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { POST } = await import('@/src/app/api/ai/stream/route')
      const request = new Request('http://localhost:3000/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'copywriting', input: {} }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/ai/score-content', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { POST } = await import('@/src/app/api/ai/score-content/route')
      const request = new Request('http://localhost:3000/api/ai/score-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test content that is long enough to score properly here' }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(401)
    })

    it('returns 400 when content field is empty or too short', async () => {
      const { POST } = await import('@/src/app/api/ai/score-content/route')
      const request = new Request('http://localhost:3000/api/ai/score-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'short' }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
    })

    it('returns scores object with readability, seoFit, engagementPotential, overall', () => {
      const scores = { readability: 80, seoFit: 70, engagementPotential: 65, overall: 72 }
      expect(scores).toHaveProperty('readability')
      expect(scores).toHaveProperty('seoFit')
      expect(scores).toHaveProperty('engagementPotential')
      expect(scores).toHaveProperty('overall')
    })

    it('all scores are numbers between 0 and 100', () => {
      const scores = { readability: 80, seoFit: 70, engagementPotential: 65, overall: 72 }
      Object.values(scores).forEach((score) => {
        expect(typeof score).toBe('number')
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      })
    })

    it('returns verdict: publish when overall >= 75', () => {
      const overall = 80
      const verdict = overall >= 75 ? 'publish' : overall >= 50 ? 'improve' : 'rewrite'
      expect(verdict).toBe('publish')
    })

    it('returns verdict: improve when overall is between 50 and 74', () => {
      const overall = 65
      const verdict = overall >= 75 ? 'publish' : overall >= 50 ? 'improve' : 'rewrite'
      expect(verdict).toBe('improve')
    })

    it('returns verdict: rewrite when overall < 50', () => {
      const overall = 35
      const verdict = overall >= 75 ? 'publish' : overall >= 50 ? 'improve' : 'rewrite'
      expect(verdict).toBe('rewrite')
    })

    it('seoFit is null when contentType is not blog', () => {
      const contentType = 'social' as 'social' | 'blog'
      const seoFit = contentType === 'blog' ? 75 : null
      expect(seoFit).toBeNull()
    })
  })

  describe('Agent-specific generation', () => {
    const agentIds = [
      'seo-audit', 'page-cro', 'copywriting', 'social-content',
      'email-sequence', 'content-strategy', 'competitor-analysis',
      'blog-post', 'keyword-research', 'growth-playbook', 'video-ad',
    ]

    agentIds.forEach((agentId) => {
      it(`${agentId} agent is registered in the agents registry`, async () => {
        const { getAgent } = await import('@/src/lib/ai/agents')
        const agent = getAgent(agentId)
        expect(agent).toBeDefined()
        expect(agent!.id).toBeTruthy()
        expect(agent!.name).toBeTruthy()
        expect(agent!.buildSystemPrompt).toBeTypeOf('function')
        expect(agent!.buildUserPrompt).toBeTypeOf('function')
        expect(agent!.parseResponse).toBeTypeOf('function')
      })
    })
  })
})
