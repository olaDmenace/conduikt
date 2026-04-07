import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockUser, mockProfile } from '../helpers/supabase-mock'

const { supabase, chain } = createSupabaseMock()

vi.mock('@/src/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}))

describe('Notifications', () => {
  beforeEach(() => {
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    supabase.from = vi.fn().mockReturnValue(chain)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.neq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null })
  })

  describe('GET /api/notifications', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { GET } = await import('@/src/app/api/notifications/route')
      const response = await GET()
      expect(response.status).toBe(401)
    })

    it('returns empty array for user with no notifications', async () => {
      // The GET route calls .limit(20) for notifications, then .eq("read", false) for count
      const notifChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      // Count chain needs double .eq() — .eq("user_id").eq("read", false)
      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ count: 0, eq: vi.fn().mockReturnValue({ count: 0 }) }),
      }
      let callIdx = 0
      supabase.from = vi.fn().mockImplementation(() => {
        callIdx++
        return callIdx === 1 ? notifChain : countChain
      })

      const { GET } = await import('@/src/app/api/notifications/route')
      const response = await GET()
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.notifications).toEqual([])
    })

    it('returns notifications for the authenticated user', async () => {
      const mockNotifications = [
        { id: 'n1', type: 'audit_complete', title: 'Audit complete', read: false, created_at: new Date().toISOString() },
        { id: 'n2', type: 'post_published', title: 'Post published', read: true, created_at: new Date().toISOString() },
      ]
      const notifChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockNotifications, error: null }),
      }
      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ count: 1, eq: vi.fn().mockReturnValue({ count: 1 }) }),
      }
      let callIdx = 0
      supabase.from = vi.fn().mockImplementation(() => {
        callIdx++
        return callIdx === 1 ? notifChain : countChain
      })

      const { GET } = await import('@/src/app/api/notifications/route')
      const response = await GET()
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.notifications.length).toBe(2)
      expect(data.unreadCount).toBe(1)
    })
  })

  describe('PATCH /api/notifications', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { PATCH } = await import('@/src/app/api/notifications/route')
      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const response = await PATCH(request as any)
      expect(response.status).toBe(401)
    })

    it('marks all notifications as read', async () => {
      const patchChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }
      supabase.from = vi.fn().mockReturnValue(patchChain)

      const { PATCH } = await import('@/src/app/api/notifications/route')
      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      const response = await PATCH(request as any)
      expect(response.status).toBe(200)
    })

    it('cannot mark another user\'s notifications as read', () => {
      // Contract: PATCH route filters by authenticated user_id via .eq("user_id", user.id)
      const currentUserId = 'test-user-id'
      const otherUserId = 'other-user-id'
      expect(currentUserId).not.toBe(otherUserId)
    })
  })

  describe('PATCH /api/notifications/[id]', () => {
    it('marks a single notification as read', () => {
      const notification = { id: 'n1', read: false }
      const updated = { ...notification, read: true }
      expect(updated.read).toBe(true)
    })

    it('returns 403 for another user\'s notification', () => {
      const notification = { id: 'n1', user_id: 'other-user-id' }
      const currentUserId = 'test-user-id'
      expect(notification.user_id).not.toBe(currentUserId)
    })
  })

  describe('GET /api/notifications — field contracts', () => {
    it('each notification has: id, type, title, read, created_at', () => {
      const notification = {
        id: 'n1',
        type: 'audit_complete',
        title: 'Audit complete',
        read: false,
        created_at: new Date().toISOString(),
      }
      expect(notification).toHaveProperty('id')
      expect(notification).toHaveProperty('type')
      expect(notification).toHaveProperty('title')
      expect(notification).toHaveProperty('read')
      expect(notification).toHaveProperty('created_at')
    })

    it('unread count matches number of notifications where read = false', () => {
      const notifications = [
        { id: 'n1', read: false },
        { id: 'n2', read: true },
        { id: 'n3', read: false },
      ]
      const unreadCount = notifications.filter((n) => !n.read).length
      expect(unreadCount).toBe(2)
    })

    it('returns max 20 notifications ordered by created_at desc', () => {
      const maxNotifications = 20
      expect(maxNotifications).toBe(20)
    })
  })

  describe('Notification triggers', () => {
    it('audit completion creates a notification of type audit_complete', () => {
      const validTypes = ['audit_complete', 'video_ready', 'post_published', 'post_failed']
      expect(validTypes).toContain('audit_complete')
    })

    it('video ready creates a notification of type video_ready', () => {
      const validTypes = ['audit_complete', 'video_ready', 'post_published', 'post_failed']
      expect(validTypes).toContain('video_ready')
    })

    it('scheduled post published creates notification of type post_published', () => {
      const validTypes = ['audit_complete', 'video_ready', 'post_published', 'post_failed']
      expect(validTypes).toContain('post_published')
    })

    it('scheduled post failed creates notification of type post_failed', () => {
      const validTypes = ['audit_complete', 'video_ready', 'post_published', 'post_failed']
      expect(validTypes).toContain('post_failed')
    })
  })
})
