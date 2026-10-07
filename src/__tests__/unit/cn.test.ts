import { describe, it, expect } from 'vitest'
import { cn } from '@/src/lib/utils/cn'

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })

  it('resolves conflicting Tailwind utilities (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('bg-accent', 'bg-surface')).toBe('bg-surface')
  })

  // Regression: tailwind-merge used to read custom type roles as colours
  // and silently drop them when a colour class followed, so headings
  // rendered at body size.
  it('keeps a type-role class next to a colour class', () => {
    expect(cn('text-display-xl', 'text-on-photo')).toBe('text-display-xl text-on-photo')
    expect(cn('text-label', 'text-text-3')).toBe('text-label text-text-3')
    expect(cn('text-h3', 'text-text-primary')).toBe('text-h3 text-text-primary')
  })

  it('lets an explicit size override a type role', () => {
    expect(cn('text-caption', 'text-[13px]')).toBe('text-[13px]')
  })

  it('keeps text-numeric beside an explicit size and a colour', () => {
    expect(cn('text-numeric', 'text-[2.75rem]', 'text-text')).toBe('text-numeric text-[2.75rem] text-text')
  })
})
