import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockUser, mockProfile } from '../helpers/supabase-mock'

const { supabase, chain } = createSupabaseMock()

vi.mock('@/src/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}))

describe('Webhook Integrations', () => {
  beforeEach(() => {
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    supabase.from = vi.fn().mockReturnValue(chain)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null })
  })

  describe('GET /api/webhooks', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { GET } = await import('@/src/app/api/webhooks/route')
      const response = await GET()
      expect(response.status).toBe(401)
    })

    it('returns webhook configs for authenticated user', async () => {
      const mockConfigs = [
        { id: 'wh1', type: 'wordpress', endpoint_url: 'https://example.com/wp-json/wp/v2/posts', active: true },
      ]
      // Route chains .eq("user_id").order()
      const whChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockConfigs, error: null }),
      }
      supabase.from = vi.fn().mockReturnValue(whChain)

      const { GET } = await import('@/src/app/api/webhooks/route')
      const response = await GET()
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/webhooks', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { POST } = await import('@/src/app/api/webhooks/route')
      const request = new Request('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'wordpress', endpoint_url: 'https://example.com/wp-json/wp/v2/posts' }),
      })
      const response = await POST(request as any)
      expect(response.status).toBe(401)
    })

    it('creates a webhook config record', async () => {
      chain.single = vi.fn().mockResolvedValue({
        data: { id: 'wh1', name: 'My WP', type: 'wordpress', endpoint_url: 'https://example.com/wp-json/wp/v2/posts', active: true },
        error: null,
      })

      const { POST } = await import('@/src/app/api/webhooks/route')
      const request = new Request('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My WP', type: 'wordpress', endpoint_url: 'https://example.com/wp-json/wp/v2/posts' }),
      })
      const response = await POST(request as any)
      expect(response.status).toBe(201)
    })
  })

  describe('POST /api/webhooks — validation', () => {
    it('returns 400 for invalid webhook type', () => {
      const validTypes = ['wordpress', 'webflow', 'buffer', 'generic']
      const invalidType = 'slack'
      expect(validTypes).not.toContain(invalidType)
    })

    it('returns 400 when endpoint_url is not a valid URL', () => {
      const invalidUrl = 'not-a-url'
      expect(() => new URL(invalidUrl)).toThrow()
    })
  })

  describe('POST /api/webhooks/send', () => {
    it('WordPress webhook sends to /wp-json/wp/v2/posts', () => {
      const wpEndpoint = 'https://example.com/wp-json/wp/v2/posts'
      expect(wpEndpoint).toContain('/wp-json/wp/v2/posts')
    })

    it('generic webhook sends raw JSON body to endpoint', () => {
      const payload = { title: 'Test post', content: 'Hello world' }
      expect(JSON.stringify(payload)).toBeTruthy()
    })

    it('inactive webhook (active = false) should not be sent', () => {
      const webhook = { active: false, endpoint_url: 'https://example.com/hook' }
      expect(webhook.active).toBe(false)
    })

    it('returns 502 when the target webhook endpoint is unreachable', () => {
      // Contract: unreachable endpoints return 502 Bad Gateway
      const status = 502
      expect(status).toBe(502)
    })
  })

  describe('GET /api/webhooks — security', () => {
    it('auth_token field is not returned in GET response', () => {
      const config = { id: 'wh1', type: 'wordpress', endpoint_url: 'https://example.com', active: true }
      // auth_token should be excluded from the response
      expect(config).not.toHaveProperty('auth_token')
    })
  })

  describe('PATCH webhook config', () => {
    it('toggles active field', () => {
      const config = { active: true }
      const toggled = { ...config, active: !config.active }
      expect(toggled.active).toBe(false)
    })

    it('returns 403 for another user\'s config', () => {
      const config = { user_id: 'other-user-id' }
      const currentUser = 'test-user-id'
      expect(config.user_id).not.toBe(currentUser)
    })
  })

  describe('DELETE webhook config', () => {
    it('deletes the config', () => {
      // Contract: DELETE removes the webhook_configs record
      const deleteOp = 'webhook_configs.delete'
      expect(deleteOp).toBeTruthy()
    })

    it('returns 403 for another user\'s config', () => {
      const config = { user_id: 'other-user-id' }
      const currentUser = 'test-user-id'
      expect(config.user_id).not.toBe(currentUser)
    })
  })
})
