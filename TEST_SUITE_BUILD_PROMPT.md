# Conduikt — Full Test Suite Build Prompt
**For:** Claude Code  
**Project:** Conduikt (`https://conduikt.vercel.app`)  
**Stack:** Next.js 15 App Router, TypeScript, Supabase, Anthropic SDK, Lemon Squeezy, Inngest  
**Reference docs:** `SYSTEM_ARCHITECTURE_v2.md`, `ARCHITECTURE_ADDENDUM_v2.1.md`, `PROGRESS_REPORT.md`

---

## Overview

This prompt covers two things in sequence:
1. **Infrastructure setup** — install and configure the test tooling
2. **Test implementation** — write tests for every feature in the platform

Work through them in strict order. Do not write any test files until infrastructure is confirmed working. Do not move to the next test file until the current one passes. After all tests pass, run coverage and report.

---

## PART 1 — Test Infrastructure Setup

### Install Dependencies

```bash
npm install --save-dev vitest @vitejs/plugin-react @vitest/coverage-v8 @vitest/ui
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install --save-dev vitest-mock-extended
npm install --save-dev @playwright/test
npx playwright install chromium
```

### `vitest.config.ts` (root)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '.next/',
        'src/__tests__/',
        'e2e/',
        '**/*.config.*',
        '**/types.ts',
        '**/registry.ts',
      ],
    },
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### `playwright.config.ts` (root)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

### `src/__tests__/setup.ts`

```typescript
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
```

### `src/__tests__/helpers/supabase-mock.ts`

```typescript
// Reusable Supabase mock factory — import this in every integration test
import { vi } from 'vitest'

export const mockUser = {
  id: 'test-user-id',
  email: 'test@conduikt.com',
  created_at: new Date().toISOString(),
}

export const mockProfile = {
  id: 'test-user-id',
  email: 'test@conduikt.com',
  full_name: 'Test User',
  plan: 'pro',
  created_at: new Date().toISOString(),
}

export const mockProject = {
  id: 'test-project-id',
  user_id: 'test-user-id',
  name: 'Test Project',
  website_url: 'https://example.com',
  description: 'Test description',
  target_audience: 'Developers',
  value_proposition: 'Makes testing easy',
  onboarding_answers: null,
  created_at: new Date().toISOString(),
}

export const mockAudit = {
  id: 'test-audit-id',
  project_id: 'test-project-id',
  score: 72,
  findings: [{ title: 'Missing meta description', severity: 'high' }],
  created_at: new Date().toISOString(),
}

export const mockGeneration = {
  id: 'test-gen-id',
  user_id: 'test-user-id',
  project_id: 'test-project-id',
  agent_used: 'copywriting',
  prompt: 'Write a headline',
  output: 'The best headline ever',
  input_tokens: 100,
  output_tokens: 50,
  created_at: new Date().toISOString(),
}

// Creates a chainable Supabase mock
// Usage: const { supabase, fromSpy } = createSupabaseMock()
export function createSupabaseMock(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser, access_token: 'test-token' } }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser, session: {} }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://oauth.example.com' }, error: null }),
    },
    from: vi.fn().mockReturnValue(chain),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path.mp4' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/test.mp4' } }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  }

  return { supabase, chain }
}

// Creates a mock for authenticated API route context
export function mockAuthenticatedRequest(body?: unknown, params?: Record<string, string>) {
  const request = new Request('http://localhost:3000/api/test', {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Cookie: 'sb-access-token=mock-token' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { request, params: params ?? {} }
}
```

### `src/__tests__/helpers/anthropic-mock.ts`

```typescript
// Reusable Anthropic SDK mock
import { vi } from 'vitest'

export function createAnthropicMock(responseText = 'Mock AI response') {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: responseText } }
      yield { type: 'message_stop' }
    },
    finalMessage: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: responseText }],
      usage: { input_tokens: 100, output_tokens: 50 },
    }),
  }

  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
      stream: vi.fn().mockReturnValue(mockStream),
    },
  }
}
```

### Update `package.json` scripts

Add these to the `scripts` section:
```json
"test": "vitest",
"test:run": "vitest run",
"test:ui": "vitest --ui",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```

### Create folder structure

```
src/__tests__/
  setup.ts
  helpers/
    supabase-mock.ts
    anthropic-mock.ts
  unit/
  integration/
  components/
e2e/
```

### Confirm infrastructure works

Run `npm run test:run` — it should output "No test files found" with exit code 0. If it errors, fix before proceeding.

---

## PART 2 — Test Implementation

Work through each file in order. Every test must pass before writing the next file.

---

### FILE 1: `src/__tests__/integration/auth.test.ts`

Test all authentication flows. Mock `@supabase/ssr` and `next/headers`.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockUser } from '../helpers/supabase-mock'

// Mock the Supabase server client
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

describe('Authentication', () => {
  describe('Email/Password Signup', () => {
    it('creates a new user and returns 201')
    it('returns 400 when email is already registered')
    it('returns 400 when password is less than 8 characters')
    it('automatically creates a profile row on signup (via trigger)')
  })

  describe('Email/Password Login', () => {
    it('returns session with valid credentials')
    it('returns 401 with wrong password')
    it('returns 401 with non-existent email')
    it('sets auth cookies on successful login')
  })

  describe('Password Reset', () => {
    it('calls resetPasswordForEmail with correct email')
    it('returns 200 even when email does not exist (security — no enumeration)')
  })

  describe('OAuth — X (Twitter)', () => {
    it('POST /api/auth/x returns a redirect URL')
    it('callback route exchanges code for session')
    it('callback route redirects to /dashboard on success')
    it('callback route redirects to /login?error=... on failure')
  })

  describe('OAuth — LinkedIn', () => {
    it('POST /api/auth/linkedin returns a redirect URL')
    it('callback route exchanges code for session')
    it('callback route redirects to /dashboard on success')
  })

  describe('Route Protection', () => {
    it('unauthenticated request to /dashboard redirects to /login')
    it('unauthenticated request to /api/dashboard/stats returns 401')
    it('unauthenticated request to /api/notifications returns 401')
    it('authenticated request to /login redirects to /dashboard')
    it('authenticated request to /api/dashboard/stats returns 200')
  })

  describe('Sign Out', () => {
    it('clears the session cookie')
    it('redirects to /login after signout')
  })
})
```

---

### FILE 2: `src/__tests__/integration/projects.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockProject, mockUser } from '../helpers/supabase-mock'

describe('Projects API', () => {
  describe('POST /api/projects', () => {
    it('creates a project and returns 201 with project data')
    it('returns 401 without authentication')
    it('returns 400 when name is missing')
    it('returns 400 when website_url is not a valid URL')
    it('sets user_id to the authenticated user id, not the request body')
    it('enforces project limit for free tier (max 1 project)')
  })

  describe('GET /api/projects', () => {
    it('returns only the current user\'s projects')
    it('does not return other users\' projects')
    it('returns empty array when user has no projects')
    it('returns 401 without authentication')
  })

  describe('GET /api/projects/[id]', () => {
    it('returns the project when user owns it')
    it('returns 404 when project does not exist')
    it('returns 403 when project belongs to another user')
  })

  describe('PATCH /api/projects/[id]', () => {
    it('updates allowed fields (name, description, target_audience, value_proposition)')
    it('does not allow updating user_id')
    it('returns 403 when project belongs to another user')
    it('saves onboarding_answers as valid JSON')
  })

  describe('DELETE /api/projects/[id]', () => {
    it('deletes the project and returns 200')
    it('returns 403 when project belongs to another user')
    it('cascades deletion to associated audits and assets')
  })

  describe('Onboarding Plan', () => {
    it('POST /api/projects/[id]/onboarding-plan returns a personalised plan JSON')
    it('plan includes firstAgent, quickWins, and setupMessage fields')
    it('returns 404 if project does not exist for this user')
  })
})
```

---

### FILE 3: `src/__tests__/integration/ai-generate.test.ts`

Mock the Anthropic SDK using `../helpers/anthropic-mock.ts`.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAnthropicMock } from '../helpers/anthropic-mock'
import { createSupabaseMock, mockProject } from '../helpers/supabase-mock'

vi.mock('@anthropic-ai/sdk', () => ({ default: vi.fn() }))

describe('AI Generation', () => {
  describe('POST /api/ai/generate', () => {
    it('returns 401 without authentication')
    it('returns 400 with invalid agentId')
    it('returns 400 when required input fields are missing')
    it('returns 402 when free user requests a pro-gated agent')
    it('returns 402 when pro user requests a growth-gated agent (e.g. growth-playbook)')
    it('writes a record to ai_generations table on success')
    it('ai_generations record contains correct agent_used, project_id, user_id')
    it('decrements the user\'s generation count')
    it('returns 429 when user has exhausted their generation quota')
  })

  describe('POST /api/ai/stream', () => {
    it('returns a streaming response with content-type text/event-stream')
    it('streams text delta events correctly')
    it('sends a done event with usage data at the end')
    it('sends an error event when agent fails')
  })

  describe('POST /api/ai/score-content', () => {
    it('returns scores object with readability, seoFit, engagementPotential, overall')
    it('all scores are numbers between 0 and 100')
    it('returns verdict: publish when overall >= 75')
    it('returns verdict: improve when overall is between 50 and 74')
    it('returns verdict: rewrite when overall < 50')
    it('returns suggestions array with 1-4 items')
    it('seoFit is null when contentType is not blog')
    it('returns 400 when content field is empty')
  })

  describe('Agent-specific generation', () => {
    const agentIds = [
      'seo-audit', 'page-cro', 'copywriting', 'social-content',
      'email-sequence', 'content-strategy', 'competitor-analysis',
      'blog-post', 'keyword-research', 'growth-playbook', 'video-ad'
    ]

    agentIds.forEach(agentId => {
      it(`${agentId} agent generates without throwing`)
    })
  })
})
```

---

### FILE 4: `src/__tests__/integration/audit.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for URL fetching
global.fetch = vi.fn()

describe('SEO Audit', () => {
  describe('POST /api/ai/audit', () => {
    it('returns 401 without authentication')
    it('returns 400 when url is missing or invalid')
    it('fetches the target URL and returns 400 if unreachable')
    it('returns audit object with score (0-100), findings array, and metadata')
    it('saves result to audits table with correct project_id and user_id')
    it('score field is an integer between 0 and 100')
    it('findings array has severity field: high | medium | low for each item')
  })

  describe('Audit history and score tracking', () => {
    it('running audit twice creates two separate audit records (no overwrite)')
    it('GET /api/projects/[id]/agent-metrics returns seo-audit metrics from latest audit')
    it('score delta is positive when latest score > first score')
    it('score delta is negative when latest score < first score')
    it('score delta is null when only one audit exists')
  })

  describe('Analytics data', () => {
    it('GET /api/projects/[id]/analytics returns audits array sorted by created_at asc')
    it('auditTrendData maps correctly to { date, score } objects')
  })
})
```

---

### FILE 5: `src/__tests__/integration/publishing.test.ts`

Mock the X API and LinkedIn API calls using `vi.fn()`.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Social Publishing', () => {
  describe('POST /api/publish/x', () => {
    it('returns 401 without authentication')
    it('returns 400 when content is empty')
    it('returns 400 when content exceeds 280 characters')
    it('returns 403 when user has not connected X account')
    it('calls X API v2 /tweets endpoint with correct auth header')
    it('stores external_post_id in scheduled_posts after successful publish')
    it('updates scheduled_post status to published on success')
    it('updates scheduled_post status to failed on X API error')
  })

  describe('POST /api/publish/linkedin', () => {
    it('returns 401 without authentication')
    it('returns 400 when content is empty')
    it('returns 403 when user has not connected LinkedIn account')
    it('calls LinkedIn UGC Posts API with correct auth header')
    it('stores external_post_id in scheduled_posts after publish')
  })

  describe('Social Engagement Sync', () => {
    it('POST /api/integrations/x/sync-metrics uses user OAuth token, not app token')
    it('fetches metrics for published posts only (status = published)')
    it('skips posts with no external_post_id')
    it('writes results to post_metrics table with correct channel')
    it('POST /api/integrations/linkedin/sync-metrics writes to post_metrics')
    it('sync returns count of posts updated')
  })

  describe('Scheduled Posts', () => {
    it('PATCH /api/scheduled-posts/[id] updates scheduled_at timestamp')
    it('PATCH returns 403 when post belongs to another user')
    it('scheduled post with past scheduled_at can be rescheduled to future')
  })
})
```

---

### FILE 6: `src/__tests__/integration/video.test.ts`

Mock HeyGen, ElevenLabs, and Inngest. This is the most important test file.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock external integrations
vi.mock('@/lib/integrations/heygen', () => ({
  createHeyGenVideo: vi.fn().mockResolvedValue({ jobId: 'heygen-test-job-123' }),
  pollHeyGenVideo: vi.fn().mockResolvedValue({
    jobId: 'heygen-test-job-123',
    status: 'completed',
    videoUrl: 'https://heygen.example.com/video.mp4?expires=soon',
    duration: 62,
  }),
  listHeyGenAvatars: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/integrations/elevenlabs', () => ({
  generateVoiceover: vi.fn().mockResolvedValue(Buffer.from('mock-audio-data')),
  listVoices: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: vi.fn().mockResolvedValue({}),
  },
}))

describe('Video Ad Agent', () => {
  describe('POST /api/video/generate', () => {
    it('returns 401 without authentication')
    it('returns 402 for free tier users with upgradeUrl in response')
    it('returns 402 for pro tier users')
    it('returns 201 for growth tier users with valid brief')
    it('returns 201 for agency tier users')
    it('returns 400 when brief is empty')
    it('returns 400 when brief is less than 50 characters')
    it('creates a video_jobs record in database')
    it('video_jobs record has status: pending initially')
    it('triggers Inngest video/job.created event with jobId')
    it('records generation in ai_generations table with agent_used: video-ad')
  })

  describe('GET /api/video/[jobId]/status', () => {
    it('returns 401 without authentication')
    it('returns 404 when jobId does not exist')
    it('returns 403 when job belongs to another user')
    it('returns status, progressMessage fields')
    it('calls pollHeyGenVideo when status is generating_video')
    it('updates video_jobs record when HeyGen reports completed')
    it('returns videoUrl when status is ready')
    it('videoUrl points to Supabase Storage, NOT the HeyGen URL directly')
  })

  describe('Storage — Critical Check', () => {
    it('HeyGen URL is downloaded and re-uploaded to Supabase Storage')
    it('video_jobs.video_url contains a supabase storage URL, not a heygen.com URL')
    it('Supabase Storage path follows pattern: videos/{jobId}/final.mp4')
    it('ElevenLabs voiceover is stored at: videos/{jobId}/voiceover.mp3')
  })

  describe('DELETE /api/video/[jobId]', () => {
    it('deletes the video_jobs record')
    it('removes files from Supabase Storage')
    it('returns 403 when job belongs to another user')
  })

  describe('GET /api/video/history', () => {
    it('returns 401 without authentication')
    it('requires projectId query param')
    it('returns max 20 records ordered by created_at desc')
    it('does not return jobs from other users\' projects')
  })

  describe('Plan gating', () => {
    const plans = ['free', 'pro']
    plans.forEach(plan => {
      it(`${plan} plan returns 402 with upgradeUrl`)
    })

    const allowedPlans = ['growth', 'agency']
    allowedPlans.forEach(plan => {
      it(`${plan} plan can generate videos`)
    })
  })

  describe('Inngest Pipeline Steps', () => {
    it('pipeline transitions through all status values in order')
    it('pipeline sets progress_message at each step')
    it('pipeline creates notification when status becomes ready')
    it('failed HeyGen response sets status to failed with error_message')
    it('pipeline retries on transient HeyGen error')
  })
})
```

---

### FILE 7: `src/__tests__/integration/notifications.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Notifications', () => {
  describe('GET /api/notifications', () => {
    it('returns 401 without authentication')
    it('returns empty array for user with no notifications')
    it('returns max 20 notifications ordered by created_at desc')
    it('only returns notifications for the authenticated user')
    it('each notification has: id, type, title, read, created_at')
    it('unread count matches number of notifications where read = false')
  })

  describe('PATCH /api/notifications', () => {
    it('marks all notifications as read for the user')
    it('returns 401 without authentication')
    it('cannot mark another user\'s notifications as read')
  })

  describe('PATCH /api/notifications/[id]', () => {
    it('marks a single notification as read')
    it('returns 403 for another user\'s notification')
  })

  describe('Notification triggers', () => {
    it('audit completion creates a notification of type audit_complete')
    it('video ready creates a notification of type video_ready')
    it('scheduled post published creates notification of type post_published')
    it('scheduled post failed creates notification of type post_failed')
  })
})
```

---

### FILE 8: `src/__tests__/integration/analytics.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Analytics', () => {
  describe('GET /api/projects/[id]/analytics', () => {
    it('returns 401 without authentication')
    it('returns 403 for another user\'s project')
    it('returns generations, audits, assets, gscKeywords, gscConnected fields')
    it('generations are sorted by created_at desc')
    it('audits are sorted by created_at asc (for trend line)')
    it('gscConnected is false when no connected_account for gsc exists')
    it('gscConnected is true when connected_account for gsc exists')
  })

  describe('Audit score trend computation', () => {
    it('scoreDelta is latestScore minus firstScore')
    it('scoreDelta is null when only one audit exists')
    it('scoreDelta is negative when score decreased')
  })

  describe('Generation cost tracker', () => {
    it('cost is calculated as (inputTokens * 0.000003) + (outputTokens * 0.000015)')
    it('cost displays as formatted currency string')
  })

  describe('Social performance (post_metrics)', () => {
    it('analytics endpoint returns post_metrics when they exist')
    it('total impressions sums across all post_metrics for the project')
    it('best performing post is the one with highest impressions')
  })
})
```

---

### FILE 9: `src/__tests__/integration/webhooks.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

global.fetch = vi.fn()

describe('Webhook Integrations', () => {
  describe('GET /settings/integrations/webhooks API', () => {
    it('returns webhook_configs for the authenticated user only')
    it('auth_token field is not returned in GET response (security)')
  })

  describe('POST webhook config', () => {
    it('creates a webhook_config record')
    it('auth_token is stored (check it is not plain text — must be encrypted or hashed)')
    it('returns 400 for invalid webhook type')
    it('returns 400 when endpoint_url is not a valid URL')
  })

  describe('POST /api/webhooks/send', () => {
    it('returns 401 without authentication')
    it('returns 404 when webhook_config does not belong to user')
    it('calls the configured endpoint_url with POST')
    it('WordPress webhook sends to /wp-json/wp/v2/posts')
    it('generic webhook sends raw JSON body to endpoint')
    it('returns 502 when the target webhook endpoint is unreachable')
    it('inactive webhook (active = false) returns 400 before sending')
  })

  describe('PATCH webhook config', () => {
    it('toggles active field')
    it('returns 403 for another user\'s config')
  })

  describe('DELETE webhook config', () => {
    it('deletes the config')
    it('returns 403 for another user\'s config')
  })
})
```

---

### FILE 10: `src/__tests__/integration/bulk-jobs.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: vi.fn().mockResolvedValue({}) },
}))

describe('Bulk Generation', () => {
  describe('POST /api/bulk-jobs', () => {
    it('returns 401 without authentication')
    it('returns 402 for free tier users')
    it('returns 402 for pro tier users')
    it('accepts valid request from growth tier user')
    it('returns 400 when items array is empty')
    it('returns 400 when items array exceeds 30 items')
    it('creates a bulk_jobs record with status: running')
    it('triggers one Inngest event per item in the items array')
    it('bulk_jobs.total equals items.length')
  })

  describe('GET /api/bulk-jobs/[id]', () => {
    it('returns 401 without authentication')
    it('returns 404 when job does not exist')
    it('returns 403 when job belongs to another user')
    it('returns status, completed, failed, total fields')
    it('returns status: complete when completed + failed === total')
  })
})
```

---

### FILE 11: `src/__tests__/integration/competitors.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

global.fetch = vi.fn()

describe('Competitor Tracking', () => {
  describe('POST competitor tracker', () => {
    it('creates a competitor_trackers record')
    it('returns 400 when competitor_url is not valid')
    it('returns 400 when user already tracks 5 competitors on growth plan')
    it('agency plan allows unlimited competitors')
  })

  describe('POST competitor analysis', () => {
    it('fetches the competitor URL before calling AI (must not hallucinate from URL alone)')
    it('fetch is called with the competitor_url')
    it('creates a competitor_snapshots record')
    it('snapshot includes keyword_overlap, content_gaps, top_keywords fields')
    it('updates last_checked_at on the tracker')
  })

  describe('GET competitor trackers', () => {
    it('returns only trackers for the specified project')
    it('includes latest snapshot data')
    it('returns 403 for another user\'s project')
  })

  describe('DELETE competitor tracker', () => {
    it('deletes tracker and cascades to snapshots')
    it('returns 403 for another user\'s tracker')
  })
})
```

---

### FILE 12: `src/__tests__/unit/content-scoring.test.ts`

Pure unit tests — no mocks needed for external services.

```typescript
import { describe, it, expect } from 'vitest'
// Import the scoring logic directly — adjust path to match actual file
// import { scoreContent, calculateVerdict } from '@/lib/ai/scoring'

describe('Content Scoring Logic', () => {
  describe('SEO scoring', () => {
    it('blog with target keyword in H1 scores higher on seoFit than blog without it')
    it('blog with meta description scores higher than blog without')
    it('blog under 300 words scores seoFit below 50')
    it('blog over 800 words with keyword density 1-3% scores seoFit above 70')
    it('seoFit returns null for non-blog content types')
  })

  describe('Readability scoring', () => {
    it('content with short sentences scores higher than content with long sentences')
    it('content under 100 words scores readability below 40')
    it('content with clear paragraph breaks scores above 60')
  })

  describe('Verdict calculation', () => {
    it('overall score >= 75 returns verdict: publish')
    it('overall score 50-74 returns verdict: improve')
    it('overall score < 50 returns verdict: rewrite')
    it('overall score is weighted average of readability + seoFit + engagementPotential')
  })

  describe('Suggestions', () => {
    it('suggestions array always has at least 1 item')
    it('suggestions array never has more than 4 items')
    it('each suggestion is a string with at least 10 characters')
  })
})
```

---

### FILE 13: `src/__tests__/unit/context-builder.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
// import { buildProjectContext } from '@/lib/ai/context-builder'
// or wherever the context building function lives

describe('AI Context Builder', () => {
  it('builds context string without throwing when project has no audits')
  it('injects audit score when latest audit exists')
  it('injects score delta when multiple audits exist')
  it('injects top performing posts when post_metrics exist')
  it('injects onboarding_answers when present on project')
  it('injects target_audience and value_proposition when present')
  it('does NOT inject undefined or null values into context string')
  it('context string does not exceed 4000 characters')
  it('context string does not exceed 4000 characters even with large post_metrics data')
  it('performance context includes post text and impression count')
})
```

---

### FILE 14: `src/__tests__/components/content-score-panel.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
// import { ContentScorePanel } from '@/components/content/content-score-panel'

const mockScores = {
  scores: { readability: 82, seoFit: 71, engagementPotential: 65, overall: 74 },
  suggestions: ['Add more subheadings', 'Include a stronger CTA'],
  verdict: 'improve' as const,
}

describe('ContentScorePanel Component', () => {
  it('renders without crashing')
  it('renders three score gauge elements')
  it('displays the readability score value')
  it('displays the seoFit score value')
  it('displays the engagementPotential score value')
  it('shows amber colour class when overall score is 74')
  it('shows green colour class when overall score is 80')
  it('shows red colour class when overall score is 45')
  it('renders verdict badge text: "Could be Stronger" when verdict is improve')
  it('renders verdict badge text: "Ready to Publish" when verdict is publish')
  it('renders verdict badge text: "Needs Rework" when verdict is rewrite')
  it('suggestions list is initially visible')
  it('clicking the collapse toggle hides the suggestions list')
  it('shows correct count of suggestions (2)')
  it('"Improve with AI" button calls onImprove callback when clicked')
  it('does not render "Improve with AI" button when onImprove prop is not provided')
})
```

---

### FILE 15: `src/__tests__/components/agent-card.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
// import { AgentCard } from '@/components/dashboard/agent-card'

const mockAgent = {
  id: 'copywriting',
  name: 'Copywriting Agent',
  shortName: 'Copy',
  icon: 'PenTool',
  description: 'Generate conversion-focused copy',
  status: 'active' as const,
  tier: 'pro' as const,
  category: 'creation' as const,
  ctaLabel: 'Generate Copy',
  route: 'content',
}

describe('AgentCard Component', () => {
  it('renders the agent name')
  it('renders the agent description')
  it('renders the CTA button with correct label')
  it('CTA button links to correct project route')
  it('shows "Coming Soon" badge when status is coming_soon')
  it('CTA button is disabled when status is coming_soon')
  it('displays metrics when provided')
  it('displays "Not used yet" when no metrics provided')
  it('displays lastUsed relative time when provided')
})
```

---

### FILE 16: `e2e/auth.spec.ts`

Full browser flows. These require a running dev server.

```typescript
import { test, expect } from '@playwright/test'

// Use a unique test email per run to avoid conflicts
const testEmail = `test-${Date.now()}@conduikt-test.com`
const testPassword = 'TestPassword123!'

test.describe('Authentication E2E', () => {
  test('user can sign up with email and password', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('[name="email"]', testEmail)
    await page.fill('[name="password"]', testPassword)
    await page.click('[type="submit"]')
    // Should land on dashboard or email confirmation page
    await expect(page).toHaveURL(/\/(dashboard|confirm)/)
  })

  test('user can log in with email and password', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', testEmail)
    await page.fill('[name="password"]', testPassword)
    await page.click('[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', testEmail)
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('[type="submit"]')
    await expect(page.locator('[role="alert"]')).toBeVisible()
  })

  test('unauthenticated user is redirected from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })
})
```

---

### FILE 17: `e2e/onboarding.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Project Onboarding E2E', () => {
  // Assumes user is authenticated — use storageState for session
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('user can create a new project through the full wizard', async ({ page }) => {
    await page.goto('/projects/new')

    // Step 1: URL
    await expect(page.getByText('Step 1')).toBeVisible()
    await page.fill('[placeholder*="https://"]', 'https://example.com')
    await page.fill('[placeholder*="Project name"]', 'E2E Test Project')
    await page.click('button:has-text("Continue")')

    // Step 2: Setup questionnaire
    await expect(page.getByText('Step 2')).toBeVisible()
    // Select first option in each question tile group
    await page.locator('[data-question="content-tools"] [data-option]:first-child').click()
    await page.locator('[data-question="active-channels"] [data-option]:first-child').click()
    await page.locator('[data-question="challenge"] [data-option]:first-child').click()
    await page.locator('[data-question="gsc-status"] [data-option]:first-child').click()
    await page.locator('[data-question="content-output"] [data-option]:first-child').click()
    await page.locator('[data-question="project-type"] [data-option]:first-child').click()
    await page.click('button:has-text("Continue")')

    // Step 3: Context
    await expect(page.getByText('Step 3')).toBeVisible()
    await page.fill('[name="targetAudience"]', 'Developers building SaaS products')
    await page.fill('[name="valueProposition"]', 'Automates marketing so founders can focus on product')
    await page.click('button:has-text("Create Project")')

    // Should land on project overview
    await expect(page).toHaveURL(/\/projects\/[\w-]+$/)
    await expect(page.getByText('E2E Test Project')).toBeVisible()
  })

  test('personalised setup card appears on project overview after onboarding', async ({ page }) => {
    // Navigate to a project that was created with onboarding answers
    await page.goto('/projects/new')
    // Complete wizard...
    // Then check the overview for the setup card
    await expect(page.locator('[data-testid="personalised-setup-card"]')).toBeVisible()
  })
})
```

---

### FILE 18: `e2e/content-generation.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Content Generation E2E', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('user can generate content with copywriting agent', async ({ page }) => {
    // Navigate to a project's content page
    await page.goto('/projects/test-project-id/content')
    
    // Should see agent selection
    await expect(page.getByText('Copywriting Agent')).toBeVisible()
    
    // Fill in prompt
    await page.fill('textarea', 'Write a hero headline for a marketing automation SaaS')
    await page.click('button:has-text("Generate")')
    
    // AI response should stream in
    await expect(page.locator('[data-testid="generation-output"]')).not.toBeEmpty({ timeout: 30000 })
    
    // Save the output
    await page.click('button:has-text("Save")')
    await expect(page.getByText('Saved')).toBeVisible()
  })

  test('content score panel appears after generation', async ({ page }) => {
    await page.goto('/projects/test-project-id/content')
    await page.fill('textarea', 'Write a hero headline for a marketing automation SaaS')
    await page.click('button:has-text("Generate")')
    await page.waitForSelector('[data-testid="generation-output"]:not(:empty)', { timeout: 30000 })
    
    // Score panel should auto-appear
    await expect(page.locator('[data-testid="content-score-panel"]')).toBeVisible({ timeout: 15000 })
  })

  test('Cmd+K command palette opens and closes correctly', async ({ page }) => {
    await page.goto('/dashboard')
    await page.keyboard.press('Meta+k')
    await expect(page.locator('[role="dialog"][data-testid="command-palette"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"][data-testid="command-palette"]')).not.toBeVisible()
  })
})
```

---

### FILE 19: `e2e/video-agent.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Video Ad Agent E2E', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('video agent page renders with style selector', async ({ page }) => {
    await page.goto('/projects/test-project-id/video')
    await expect(page.getByText('Presenter Ad')).toBeVisible()
    await expect(page.getByText('Cinematic Ad')).toBeVisible()
    await expect(page.locator('[data-testid="cinematic-coming-soon"]')).toBeVisible()
  })

  test('free/pro user sees upgrade prompt instead of form', async ({ page }) => {
    // This test requires a free/pro tier test account
    await page.goto('/projects/test-project-id/video')
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible()
    await expect(page.locator('[data-testid="video-brief-form"]')).not.toBeVisible()
  })

  test('video agent appears in project nav', async ({ page }) => {
    await page.goto('/projects/test-project-id/overview')
    await expect(page.locator('nav').getByText('Video')).toBeVisible()
  })
})
```

---

## PART 3 — E2E Auth Setup Helper

Before E2E tests can use `storageState`, create an auth setup file:

### `e2e/global-setup.ts`

```typescript
import { chromium, FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Sign in with test credentials
  await page.goto('http://localhost:3000/login')
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL ?? 'test@conduikt.com')
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD ?? 'TestPassword123!')
  await page.click('[type="submit"]')
  await page.waitForURL('**/dashboard')

  // Save auth state
  const authDir = path.join(__dirname, '.auth')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir)
  await page.context().storageState({ path: path.join(authDir, 'user.json') })

  await browser.close()
}

export default globalSetup
```

Add to `playwright.config.ts`:
```typescript
globalSetup: './e2e/global-setup.ts'
```

Add to `.env.local`:
```env
TEST_USER_EMAIL=your-test-account@example.com
TEST_USER_PASSWORD=your-test-password
```

---

## PART 4 — Final Coverage Run

After ALL test files are written and passing:

```bash
npm run test:coverage
```

Report the coverage table. Target thresholds:
- API routes (`src/app/api/`): > 80% line coverage
- Integration helpers (`src/lib/`): > 70% line coverage
- Components: > 60% line coverage

If any critical path is below threshold (auth, video pipeline, AI generate), write additional tests until it meets the bar.

---

## Session Protocol

1. Set up infrastructure first — confirm `npm run test:run` exits cleanly before writing tests
2. Write one test file at a time, in the order listed above
3. Run `npm run test:run` after each file — all previous tests must still pass
4. Do not skip a test with `.skip` unless it requires a running external service (mark it with a comment explaining why)
5. After all unit and integration tests pass, run E2E tests separately with `npm run test:e2e`
6. Final step: run `npm run test:coverage` and include the output in the session summary
7. Run `npm run build` at the very end — zero TypeScript errors required

---

*This is the complete test suite for Conduikt. Feed this alongside `SYSTEM_ARCHITECTURE_v2.md` to Claude Code. Work through it in order — infrastructure first, then test files 1–19.*
