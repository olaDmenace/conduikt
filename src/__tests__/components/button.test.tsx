import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button, IconButton } from '@/src/components/ui/button'

// docs/DESIGN.md §Components · Button: square (6px), flat, no gradient.
describe('Button Component', () => {
  it('renders primary as a flat accent fill with white text', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button.className).toContain('bg-accent')
    expect(button.className).toContain('text-white')
    expect(button.className).not.toContain('gradient')
    expect(button.className).not.toContain('shadow')
    expect(button.className).not.toContain('scale')
  })

  it('uses the 6px radius, never a pill', () => {
    render(<Button>Square</Button>)
    const button = screen.getByRole('button', { name: 'Square' })
    expect(button.className).toContain('rounded-md')
    expect(button.className).not.toContain('rounded-full')
  })

  it('renders outline with the ink border', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button', { name: 'Outline' })
    expect(button.className).toContain('border-line-strong')
    expect(button.className).toContain('bg-transparent')
  })

  it('keeps "secondary" as a legacy alias of outline', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button', { name: 'Secondary' })
    expect(button.className).toContain('border-line-strong')
  })

  it('renders quiet with the line border and surface fill', () => {
    render(<Button variant="quiet">Quiet</Button>)
    const button = screen.getByRole('button', { name: 'Quiet' })
    expect(button.className).toContain('border-line')
    expect(button.className).toContain('bg-surface')
  })

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button', { name: 'Ghost' }).className).toContain('bg-transparent')
  })

  it('renders danger with the danger token', () => {
    render(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button', { name: 'Danger' }).className).toContain('text-danger')
  })

  it('sizes: md is 36px (app), lg is 48px (marketing)', () => {
    render(
      <>
        <Button>App</Button>
        <Button size="lg">Marketing</Button>
        <Button size="icon">X</Button>
      </>
    )
    expect(screen.getByRole('button', { name: 'App' }).className).toContain('h-9')
    expect(screen.getByRole('button', { name: 'Marketing' }).className).toContain('h-12')
    expect(screen.getByRole('button', { name: 'X' }).className).toContain('w-9')
  })

  it('applies disabled styling', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button', { name: 'Disabled' })
    expect(button).toBeDisabled()
    expect(button.className).toContain('disabled:opacity-50')
  })

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button', { name: 'Custom' }).className).toContain('custom-class')
  })

  it('has displayName set', () => {
    expect(Button.displayName).toBe('Button')
  })
})

describe('IconButton', () => {
  it('requires a label and exposes it as the accessible name', () => {
    render(<IconButton label="Close drawer"><span aria-hidden>x</span></IconButton>)
    const button = screen.getByRole('button', { name: 'Close drawer' })
    expect(button).toHaveAttribute('aria-label', 'Close drawer')
    expect(button).toHaveAttribute('type', 'button')
  })
})
