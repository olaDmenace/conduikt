import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/src/components/ui/badge'

describe('Badge Component', () => {
  it('renders with default variant', () => {
    render(<Badge>Default</Badge>)
    const badge = screen.getByText('Default')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-accent-muted')
  })

  it('renders secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    const badge = screen.getByText('Secondary')
    expect(badge.className).toContain('bg-surface-2')
  })

  it('renders success variant', () => {
    render(<Badge variant="success">Success</Badge>)
    const badge = screen.getByText('Success')
    expect(badge.className).toContain('text-success')
  })

  it('renders warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>)
    const badge = screen.getByText('Warning')
    expect(badge.className).toContain('text-warning')
  })

  it('renders error variant', () => {
    render(<Badge variant="error">Error</Badge>)
    const badge = screen.getByText('Error')
    expect(badge.className).toContain('text-error')
  })

  it('renders info variant', () => {
    render(<Badge variant="info">Info</Badge>)
    const badge = screen.getByText('Info')
    expect(badge.className).toContain('text-info')
  })

  it('renders as a span element', () => {
    render(<Badge>Span</Badge>)
    const badge = screen.getByText('Span')
    expect(badge.tagName.toLowerCase()).toBe('span')
  })

  it('has inline-flex display', () => {
    render(<Badge>Flex</Badge>)
    const badge = screen.getByText('Flex')
    expect(badge.className).toContain('inline-flex')
  })

  it('has rounded border', () => {
    render(<Badge>Rounded</Badge>)
    const badge = screen.getByText('Rounded')
    expect(badge.className).toContain('rounded-md')
    expect(badge.className).toContain('border')
  })

  it('accepts custom className', () => {
    render(<Badge className="extra-class">Custom</Badge>)
    const badge = screen.getByText('Custom')
    expect(badge.className).toContain('extra-class')
  })
})
