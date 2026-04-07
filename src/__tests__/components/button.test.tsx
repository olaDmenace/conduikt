import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/src/components/ui/button'

describe('Button Component', () => {
  it('renders with default variant (primary)', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button.className).toContain('bg-gradient-to-br')
  })

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button', { name: 'Secondary' })
    expect(button.className).toContain('border')
    expect(button.className).toContain('bg-transparent')
  })

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button', { name: 'Ghost' })
    expect(button.className).toContain('bg-transparent')
  })

  it('renders danger variant', () => {
    render(<Button variant="danger">Danger</Button>)
    const button = screen.getByRole('button', { name: 'Danger' })
    expect(button.className).toContain('error')
  })

  it('renders with sm size', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button', { name: 'Small' })
    expect(button.className).toContain('px-3')
  })

  it('renders with lg size', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole('button', { name: 'Large' })
    expect(button.className).toContain('px-8')
  })

  it('renders with icon size', () => {
    render(<Button size="icon">X</Button>)
    const button = screen.getByRole('button', { name: 'X' })
    expect(button.className).toContain('p-2.5')
  })

  it('applies disabled styling', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button', { name: 'Disabled' })
    expect(button).toBeDisabled()
    expect(button.className).toContain('disabled:opacity-50')
  })

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button', { name: 'Custom' })
    expect(button.className).toContain('custom-class')
  })

  it('has displayName set', () => {
    expect(Button.displayName).toBe('Button')
  })
})
