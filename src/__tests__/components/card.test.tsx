import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/src/components/ui/card'

describe('Card Component', () => {
  it('renders Card with children', () => {
    render(<Card data-testid="card">Card content</Card>)
    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders with hover state when hover prop is true', () => {
    render(<Card hover data-testid="card">Hover card</Card>)
    const card = screen.getByTestId('card')
    expect(card.className).toContain('hover:border-border-strong')
    expect(card.className).toContain('cursor-pointer')
  })

  it('does not have hover classes when hover is false', () => {
    render(<Card data-testid="card">No hover</Card>)
    const card = screen.getByTestId('card')
    expect(card.className).not.toContain('cursor-pointer')
  })

  it('renders CardHeader', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>)
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('renders CardTitle as h3', () => {
    render(<CardTitle>My Title</CardTitle>)
    const title = screen.getByText('My Title')
    expect(title.tagName.toLowerCase()).toBe('h3')
  })

  it('renders CardDescription as p', () => {
    render(<CardDescription>Description text</CardDescription>)
    const desc = screen.getByText('Description text')
    expect(desc.tagName.toLowerCase()).toBe('p')
  })

  it('renders CardContent', () => {
    render(<CardContent data-testid="content">Content here</CardContent>)
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('renders CardFooter with border-t', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>)
    const footer = screen.getByTestId('footer')
    expect(footer.className).toContain('border-t')
  })

  it('all subcomponents have displayName', () => {
    expect(Card.displayName).toBe('Card')
    expect(CardHeader.displayName).toBe('CardHeader')
    expect(CardTitle.displayName).toBe('CardTitle')
    expect(CardDescription.displayName).toBe('CardDescription')
    expect(CardContent.displayName).toBe('CardContent')
    expect(CardFooter.displayName).toBe('CardFooter')
  })

  it('accepts custom className on Card', () => {
    render(<Card className="my-custom" data-testid="card">Test</Card>)
    expect(screen.getByTestId('card').className).toContain('my-custom')
  })
})
