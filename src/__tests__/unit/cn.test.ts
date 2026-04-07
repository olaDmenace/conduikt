import { describe, it, expect } from 'vitest'
import { cn } from '@/src/lib/utils/cn'

describe('cn utility', () => {
  it('merges class strings', () => {
    const result = cn('px-4', 'py-2')
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const result = cn('base', isActive && 'active')
    expect(result).toContain('active')
  })

  it('handles false conditionals', () => {
    const isActive = false
    const result = cn('base', isActive && 'active')
    expect(result).not.toContain('active')
  })

  it('resolves Tailwind conflicts (last wins)', () => {
    const result = cn('px-4', 'px-6')
    expect(result).toBe('px-6')
  })

  it('handles undefined and null inputs', () => {
    const result = cn('base', undefined, null, 'extra')
    expect(result).toContain('base')
    expect(result).toContain('extra')
  })

  it('handles empty string', () => {
    const result = cn('')
    expect(result).toBe('')
  })

  it('merges arrays of classes', () => {
    const result = cn(['px-4', 'py-2'])
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
  })
})
