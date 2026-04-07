import { describe, it, expect } from 'vitest'
import { canManageTeam, canEdit, canView, type TeamRole } from '@/src/lib/auth/roles'

describe('Role-Based Access Control', () => {
  describe('canManageTeam', () => {
    it('returns true for owner', () => {
      expect(canManageTeam('owner')).toBe(true)
    })

    it('returns true for admin', () => {
      expect(canManageTeam('admin')).toBe(true)
    })

    it('returns false for member', () => {
      expect(canManageTeam('member')).toBe(false)
    })

    it('returns false for viewer', () => {
      expect(canManageTeam('viewer')).toBe(false)
    })

    it('returns false for null (no role)', () => {
      expect(canManageTeam(null)).toBe(false)
    })
  })

  describe('canEdit', () => {
    it('returns true for owner', () => {
      expect(canEdit('owner')).toBe(true)
    })

    it('returns true for admin', () => {
      expect(canEdit('admin')).toBe(true)
    })

    it('returns true for member', () => {
      expect(canEdit('member')).toBe(true)
    })

    it('returns false for viewer', () => {
      expect(canEdit('viewer')).toBe(false)
    })

    it('returns false for null', () => {
      expect(canEdit(null)).toBe(false)
    })
  })

  describe('canView', () => {
    const roles: TeamRole[] = ['owner', 'admin', 'member', 'viewer']
    roles.forEach((role) => {
      it(`returns true for ${role}`, () => {
        expect(canView(role)).toBe(true)
      })
    })

    it('returns false for null', () => {
      expect(canView(null)).toBe(false)
    })
  })
})
