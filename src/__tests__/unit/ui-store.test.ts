import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/src/stores/ui-store'

describe('UI Store (Zustand)', () => {
  beforeEach(() => {
    // Reset store state
    useUIStore.setState({
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      expandedProjectIds: [],
      theme: 'dark',
    })
  })

  describe('Sidebar', () => {
    it('starts with sidebar not collapsed', () => {
      const state = useUIStore.getState()
      expect(state.sidebarCollapsed).toBe(false)
    })

    it('toggleSidebar flips sidebarCollapsed', () => {
      useUIStore.getState().toggleSidebar()
      expect(useUIStore.getState().sidebarCollapsed).toBe(true)

      useUIStore.getState().toggleSidebar()
      expect(useUIStore.getState().sidebarCollapsed).toBe(false)
    })

    it('setSidebarCollapsed sets the value directly', () => {
      useUIStore.getState().setSidebarCollapsed(true)
      expect(useUIStore.getState().sidebarCollapsed).toBe(true)
    })
  })

  describe('Mobile Menu', () => {
    it('starts with mobile menu closed', () => {
      expect(useUIStore.getState().mobileMenuOpen).toBe(false)
    })

    it('toggleMobileMenu flips mobileMenuOpen', () => {
      useUIStore.getState().toggleMobileMenu()
      expect(useUIStore.getState().mobileMenuOpen).toBe(true)
    })

    it('setMobileMenuOpen sets the value', () => {
      useUIStore.getState().setMobileMenuOpen(true)
      expect(useUIStore.getState().mobileMenuOpen).toBe(true)
    })
  })

  describe('Project Expansion', () => {
    it('starts with no expanded projects', () => {
      expect(useUIStore.getState().expandedProjectIds).toEqual([])
    })

    it('toggleProjectExpanded adds project id', () => {
      useUIStore.getState().toggleProjectExpanded('proj-1')
      expect(useUIStore.getState().expandedProjectIds).toContain('proj-1')
    })

    it('toggleProjectExpanded removes project id when already expanded', () => {
      useUIStore.getState().toggleProjectExpanded('proj-1')
      useUIStore.getState().toggleProjectExpanded('proj-1')
      expect(useUIStore.getState().expandedProjectIds).not.toContain('proj-1')
    })

    it('setProjectExpanded adds or removes correctly', () => {
      useUIStore.getState().setProjectExpanded('proj-2', true)
      expect(useUIStore.getState().expandedProjectIds).toContain('proj-2')

      useUIStore.getState().setProjectExpanded('proj-2', false)
      expect(useUIStore.getState().expandedProjectIds).not.toContain('proj-2')
    })

    it('does not duplicate project ids', () => {
      useUIStore.getState().setProjectExpanded('proj-1', true)
      useUIStore.getState().setProjectExpanded('proj-1', true)
      const ids = useUIStore.getState().expandedProjectIds.filter((id) => id === 'proj-1')
      expect(ids).toHaveLength(1)
    })
  })

  describe('Theme', () => {
    it('starts with dark theme', () => {
      expect(useUIStore.getState().theme).toBe('dark')
    })

    it('toggleTheme switches from dark to light', () => {
      useUIStore.getState().toggleTheme()
      expect(useUIStore.getState().theme).toBe('light')
    })

    it('toggleTheme switches back from light to dark', () => {
      useUIStore.getState().toggleTheme()
      useUIStore.getState().toggleTheme()
      expect(useUIStore.getState().theme).toBe('dark')
    })

    it('setTheme sets the value directly', () => {
      useUIStore.getState().setTheme('light')
      expect(useUIStore.getState().theme).toBe('light')
    })
  })
})
