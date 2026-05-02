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
})
