import { vi } from 'vitest'

export const mockUser = {
  id: 'test-user-id',
  email: 'test@conduikt.com',
  created_at: new Date().toISOString(),
}

export const mockProfile = {
  id: 'test-user-id',
  email: 'test@conduikt.com',
  full_name: 'Test User',
  plan: 'pro',
  generation_count: 0,
  generation_reset_at: null,
  created_at: new Date().toISOString(),
}

export const mockProject = {
  id: 'test-project-id',
  user_id: 'test-user-id',
  name: 'Test Project',
  website_url: 'https://example.com',
  description: 'Test description',
  target_audience: null,
  value_proposition: 'Makes testing easy',
  brand_voice: null,
  competitors: null,
  keywords: null,
  onboarding_answers: null,
  created_at: new Date().toISOString(),
}

export const mockAudit = {
  id: 'test-audit-id',
  project_id: 'test-project-id',
  score: 72,
  type: 'seo',
  url: 'https://example.com',
  findings: [{ title: 'Missing meta description', severity: 'high' }],
  created_at: new Date().toISOString(),
}

export const mockGeneration = {
  id: 'test-gen-id',
  user_id: 'test-user-id',
  project_id: 'test-project-id',
  agent_used: 'copywriting',
  prompt: 'Write a headline',
  output: 'The best headline ever',
  input_tokens: 100,
  output_tokens: 50,
  created_at: new Date().toISOString(),
}

// Creates a chainable Supabase mock
export function createSupabaseMock(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: mockUser, access_token: 'test-token' } },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser, session: {} }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://oauth.example.com' }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn().mockReturnValue(chain),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path.mp4' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/test.mp4' },
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  }

  return { supabase, chain }
}

// Creates a mock for authenticated API route context
export function mockAuthenticatedRequest(body?: unknown, params?: Record<string, string>) {
  const request = new Request('http://localhost:3000/api/test', {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Cookie: 'sb-access-token=mock-token' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { request, params: params ?? {} }
}
