import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, Chip } from '@/src/components/ui/badge'

// docs/DESIGN.md §Components · Chip: 22px, mono 11px, 4px radius.
describe('Badge / Chip Component', () => {
  it('renders the default (running / needs you) chip in accent-soft', () => {
    render(<Badge>Running</Badge>)
    const badge = screen.getByText('Running')
    expect(badge.className).toContain('bg-accent-soft')
    expect(badge.className).toContain('text-accent-hover')
  })

  it('renders secondary (queued) in surface-2', () => {
    render(<Badge variant="secondary">Queued</Badge>)
    expect(screen.getByText('Queued').className).toContain('bg-surface-2')
  })

  it('renders success (done, connected) in teal', () => {
    render(<Badge variant="success">Done</Badge>)
    const badge = screen.getByText('Done')
    expect(badge.className).toContain('bg-teal-soft')
    expect(badge.className).toContain('text-teal')
  })

  it('renders warning with the warning token', () => {
    render(<Badge variant="warning">Waiting</Badge>)
    expect(screen.getByText('Waiting').className).toContain('text-warning')
  })

  it('renders error with the danger token', () => {
    render(<Badge variant="error">Failed</Badge>)
    expect(screen.getByText('Failed').className).toContain('text-danger')
  })

  it('renders info in text-2', () => {
    render(<Badge variant="info">Note</Badge>)
    expect(screen.getByText('Note').className).toContain('text-text-2')
  })

  it('renders tier chips per spec', () => {
    render(
      <>
        <Badge variant="free">Free</Badge>
        <Badge variant="pro">Pro</Badge>
        <Badge variant="agency">Agency</Badge>
      </>
    )
    expect(screen.getByText('Free').className).toContain('bg-teal-soft')
    expect(screen.getByText('Pro').className).toContain('bg-accent-soft')
    expect(screen.getByText('Agency').className).toContain('bg-ink')
  })

  it('renders as a span element', () => {
    render(<Badge>Span</Badge>)
    expect(screen.getByText('Span').tagName.toLowerCase()).toBe('span')
  })

  it('is 22px tall, mono, 11px, 4px radius — never below 11px', () => {
    render(<Badge>Shape</Badge>)
    const badge = screen.getByText('Shape')
    expect(badge.className).toContain('h-[22px]')
    expect(badge.className).toContain('font-mono')
    expect(badge.className).toContain('text-[11px]')
    expect(badge.className).toContain('rounded-sm')
  })

  it('exports Chip as the v2 name for the same component', () => {
    expect(Chip).toBe(Badge)
  })

  it('accepts custom className', () => {
    render(<Badge className="extra-class">Custom</Badge>)
    expect(screen.getByText('Custom').className).toContain('extra-class')
  })
})
