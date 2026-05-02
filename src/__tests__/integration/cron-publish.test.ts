import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the service-role client since the cron route uses it. Each test sets
// up the chain output it expects (empty queue is the default — exercise the
// happy "0 pending" path that production hits 99% of the time).
const fromMock = vi.fn()
const supabase = {
  from: fromMock,
}

vi.mock('@/src/lib/supabase/service', () => ({
  createServiceClient: () => supabase,
}))

// Mock the token helpers — they normally read from the DB and call platform
// refresh APIs. For the publish-loop tests we just want them to return a
// usable bearer.
vi.mock('@/src/lib/integrations/x-token', () => ({
  ensureValidXToken: vi.fn().mockResolvedValue('fresh-x-token'),
}))
vi.mock('@/src/lib/integrations/linkedin-token', () => ({
  ensureValidLinkedInToken: vi.fn().mockResolvedValue('fresh-li-token'),
}))

// decryptToken is called on Facebook tokens (X/LinkedIn flow through helpers).
// Stub to identity so the test doesn't depend on TOKEN_ENCRYPTION_KEY.
vi.mock('@/src/lib/crypto/tokens', () => ({
  decryptToken: <T,>(v: T) => v,
  encryptToken: <T,>(v: T) => v,
  isEncryptionConfigured: () => false,
}))

vi.mock('@/src/lib/integrations/media-upload', () => ({
  uploadMediaToX: vi.fn(),
  uploadMediaToLinkedIn: vi.fn(),
}))

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

function emptyQueueChain() {
  // Mirrors the route's nested select, then .eq().lte().limit() returning [].
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  return chain
}

describe('Cron Publish Route', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  afterEach(() => {
    if (ORIGINAL_NODE_ENV === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV
    } else {
      // @ts-expect-error - NODE_ENV is readonly in process.env types but mutable at runtime
      process.env.NODE_ENV = ORIGINAL_NODE_ENV
    }
    if (ORIGINAL_CRON_SECRET === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = ORIGINAL_CRON_SECRET
    }
  })

  describe('auth', () => {
    it('returns 500 when CRON_SECRET is missing in production', async () => {
      // @ts-expect-error - NODE_ENV is readonly in process.env types but mutable at runtime
      process.env.NODE_ENV = 'production'
      delete process.env.CRON_SECRET

      const { GET } = await import('@/src/app/api/cron/publish/route')
      const response = await GET(new NextRequest('http://localhost/api/cron/publish'))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toMatch(/cron secret/i)
      // DB should never be touched when auth is misconfigured
      expect(fromMock).not.toHaveBeenCalled()
    })

    it('returns 401 when bearer token does not match', async () => {
      // @ts-expect-error - NODE_ENV is readonly in process.env types but mutable at runtime
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'real-secret'

      const { GET } = await import('@/src/app/api/cron/publish/route')
      const request = new NextRequest('http://localhost/api/cron/publish', {
        headers: { Authorization: 'Bearer wrong-secret' },
      })
      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(fromMock).not.toHaveBeenCalled()
    })

    it('accepts secret via Authorization header', async () => {
      // @ts-expect-error - NODE_ENV is readonly in process.env types but mutable at runtime
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'real-secret'
      fromMock.mockReturnValue(emptyQueueChain())

      const { GET } = await import('@/src/app/api/cron/publish/route')
      const request = new NextRequest('http://localhost/api/cron/publish', {
        headers: { Authorization: 'Bearer real-secret' },
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('accepts secret via ?secret= query param (pg_cron alt form)', async () => {
      // @ts-expect-error - NODE_ENV is readonly in process.env types but mutable at runtime
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'real-secret'
      fromMock.mockReturnValue(emptyQueueChain())

      const { GET } = await import('@/src/app/api/cron/publish/route')
      const request = new NextRequest('http://localhost/api/cron/publish?secret=real-secret')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('happy path', () => {
    it('returns published:0 when there are no pending posts', async () => {
      // @ts-expect-error - NODE_ENV is readonly in process.env types but mutable at runtime
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'real-secret'
      fromMock.mockReturnValue(emptyQueueChain())

      const { GET } = await import('@/src/app/api/cron/publish/route')
      const request = new NextRequest('http://localhost/api/cron/publish', {
        headers: { Authorization: 'Bearer real-secret' },
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.published).toBe(0)
      // Should query scheduled_posts but never reach connected_accounts
      // when the queue is empty.
      expect(fromMock).toHaveBeenCalledWith('scheduled_posts')
      expect(fromMock).not.toHaveBeenCalledWith('connected_accounts')
    })
  })

  describe('publish loop', () => {
    // Build a routing mock for fromMock that responds differently per table.
    // Each test wires `scheduledPostsRow`, optional accounts, and an updateSpy.
    function setupRouter({
      posts,
      accounts,
      updateSpy,
    }: {
      posts: unknown[]
      accounts: unknown[]
      updateSpy: (payload: unknown) => void
    }) {
      fromMock.mockImplementation((table: string) => {
        if (table === 'scheduled_posts') {
          // Two distinct call shapes:
          // 1) the initial queue read: select().eq().lte().limit() → posts
          // 2) per-post update: update().eq() → ack
          // We dispatch by checking which method gets called first.
          const chain: Record<string, ReturnType<typeof vi.fn>> = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: posts, error: null }),
            update: vi.fn((payload: unknown) => {
              updateSpy(payload)
              return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) }
            }),
          }
          return chain
        }
        if (table === 'connected_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: accounts, error: null }),
          }
        }
        if (table === 'assets') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })
    }

    beforeEach(() => {
      // @ts-expect-error - NODE_ENV is readonly in process.env types but mutable at runtime
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'real-secret'
      vi.unstubAllGlobals()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('marks post failed with helpful message when no connected account exists for the user', async () => {
      const updateSpy = vi.fn()
      setupRouter({
        posts: [
          {
            id: 'post-1',
            channel: 'x',
            project_id: 'proj-1',
            asset_id: 'asset-1',
            assets: { id: 'asset-1', content: { scheduled_text: 'hello' }, title: 't' },
            projects: { user_id: 'user-with-no-account' },
          },
        ],
        accounts: [], // no rows match the user_id
        updateSpy,
      })

      const { GET } = await import('@/src/app/api/cron/publish/route')
      const request = new NextRequest('http://localhost/api/cron/publish', {
        headers: { Authorization: 'Bearer real-secret' },
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
      // The post should be flipped to failed with a reconnect-style message
      expect(updateSpy).toHaveBeenCalled()
      const failedUpdate = updateSpy.mock.calls.find(
        (call: unknown[]) => (call[0] as { status?: string })?.status === 'failed'
      )
      expect(failedUpdate).toBeDefined()
      expect((failedUpdate![0] as { error_message?: string }).error_message).toMatch(
        /no connected x account/i
      )
    })

    it('marks post failed when scheduled_text is empty', async () => {
      const updateSpy = vi.fn()
      setupRouter({
        posts: [
          {
            id: 'post-2',
            channel: 'x',
            project_id: 'proj-1',
            asset_id: 'asset-1',
            assets: { id: 'asset-1', content: {}, title: 't' },
            projects: { user_id: 'user-1' },
          },
        ],
        accounts: [
          {
            id: 'acc-1',
            user_id: 'user-1',
            platform: 'x',
            access_token: 'tok',
            refresh_token: 'rtok',
            token_expires_at: null,
            platform_user_id: 'pid',
            platform_username: 'u',
          },
        ],
        updateSpy,
      })

      const { GET } = await import('@/src/app/api/cron/publish/route')
      const request = new NextRequest('http://localhost/api/cron/publish', {
        headers: { Authorization: 'Bearer real-secret' },
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
      const failedUpdate = updateSpy.mock.calls.find(
        (call: unknown[]) => (call[0] as { status?: string })?.status === 'failed'
      )
      expect(failedUpdate).toBeDefined()
      expect((failedUpdate![0] as { error_message?: string }).error_message).toMatch(
        /missing post text/i
      )
    })

    it('captures external_post_id from X tweet response on success', async () => {
      const updateSpy = vi.fn()
      setupRouter({
        posts: [
          {
            id: 'post-ok',
            channel: 'x',
            project_id: 'proj-1',
            asset_id: 'asset-1',
            assets: { id: 'asset-1', content: { scheduled_text: 'ship it' }, title: 't' },
            projects: { user_id: 'user-1' },
          },
        ],
        accounts: [
          {
            id: 'acc-1',
            user_id: 'user-1',
            platform: 'x',
            access_token: 'tok',
            refresh_token: 'rtok',
            token_expires_at: null,
            platform_user_id: 'pid',
            platform_username: 'u',
          },
        ],
        updateSpy,
      })

      // Stub fetch so the X API "responds" with a tweet id. The route should
      // surface that id back into the row via external_post_id.
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ data: { id: 'tweet-1234567890' } }),
        })
      )

      const { GET } = await import('@/src/app/api/cron/publish/route')
      const request = new NextRequest('http://localhost/api/cron/publish', {
        headers: { Authorization: 'Bearer real-secret' },
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
      const postedUpdate = updateSpy.mock.calls.find(
        (call: unknown[]) => (call[0] as { status?: string })?.status === 'posted'
      )
      expect(postedUpdate).toBeDefined()
      expect((postedUpdate![0] as { external_post_id?: string }).external_post_id).toBe(
        'tweet-1234567890'
      )
    })
  })
})
