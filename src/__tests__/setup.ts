import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Global mocks applied to every test file

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'test-project-id' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
  redirect: vi.fn(),
}))

// Mock Next.js headers (used in server components and API routes)
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  }),
  headers: () => new Headers(),
}))

// Silence console.error in tests unless explicitly needed
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return
    originalError(...args)
  }
})

afterAll(() => {
  console.error = originalError
})
