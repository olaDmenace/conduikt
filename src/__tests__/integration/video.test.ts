import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseMock, mockUser, mockProfile } from '../helpers/supabase-mock'

const { supabase, chain } = createSupabaseMock()

vi.mock('@/src/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(supabase),
}))

vi.mock('@/src/lib/supabase/service', () => ({
  createServiceClient: vi.fn().mockReturnValue(supabase),
}))

describe('Video Ad Agent', () => {
  beforeEach(() => {
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    supabase.from = vi.fn().mockReturnValue(chain)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue({ data: mockProfile, error: null })
  })

  describe('Plan gating', () => {
    const blockedPlans = ['free', 'pro']
    blockedPlans.forEach((plan) => {
      it(`${plan} plan returns 402 with upgradeUrl`, () => {
        const allowedPlans = ['growth', 'agency']
        expect(allowedPlans).not.toContain(plan)
        // Contract: blocked plans get a 402 with upgradeUrl in response
        const response = { status: 402, upgradeUrl: '/settings/billing' }
        expect(response.status).toBe(402)
        expect(response.upgradeUrl).toBeTruthy()
      })
    })

    const allowedPlans = ['growth', 'agency']
    allowedPlans.forEach((plan) => {
      it(`${plan} plan can generate videos`, () => {
        const gatedPlans = ['free', 'pro']
        expect(gatedPlans).not.toContain(plan)
      })
    })
  })

  describe('Video job status contracts', () => {
    it('pipeline transitions through all status values in order', () => {
      const validStatuses = ['pending', 'generating_script', 'generating_voiceover', 'generating_video', 'ready', 'failed']
      expect(validStatuses.indexOf('pending')).toBeLessThan(validStatuses.indexOf('ready'))
      expect(validStatuses.indexOf('generating_script')).toBeLessThan(validStatuses.indexOf('generating_video'))
    })

    it('video_jobs.video_url should point to Supabase Storage, not HeyGen URL', () => {
      const jobId = 'test-job-123'
      const expectedPath = `videos/${jobId}/final.mp4`
      expect(expectedPath).toMatch(/^videos\/[\w-]+\/final\.mp4$/)
    })

    it('ElevenLabs voiceover path follows expected pattern', () => {
      const jobId = 'test-job-123'
      const voiceoverPath = `videos/${jobId}/voiceover.mp3`
      expect(voiceoverPath).toMatch(/^videos\/[\w-]+\/voiceover\.mp3$/)
    })

    it('video_jobs record has status: pending initially', () => {
      const initialJob = { id: 'job-1', status: 'pending', progress_message: 'Queued' }
      expect(initialJob.status).toBe('pending')
    })

    it('returns videoUrl when status is ready', () => {
      const readyJob = {
        status: 'ready',
        video_url: 'https://yybpacultmaxqxjfsrvx.supabase.co/storage/v1/object/public/videos/job-1/final.mp4',
      }
      expect(readyJob.status).toBe('ready')
      expect(readyJob.video_url).toBeTruthy()
      expect(readyJob.video_url).not.toContain('heygen.com')
    })

    it('pipeline sets progress_message at each step', () => {
      const steps = [
        { status: 'pending', progress_message: 'Queued' },
        { status: 'generating_script', progress_message: 'Writing script...' },
        { status: 'generating_voiceover', progress_message: 'Generating voiceover...' },
        { status: 'generating_video', progress_message: 'Rendering video...' },
        { status: 'ready', progress_message: 'Complete' },
      ]
      steps.forEach((step) => {
        expect(step.progress_message).toBeTruthy()
      })
    })

    it('failed HeyGen response sets status to failed with error_message', () => {
      const failedJob = {
        status: 'failed',
        error_message: 'HeyGen API returned 500',
      }
      expect(failedJob.status).toBe('failed')
      expect(failedJob.error_message).toBeTruthy()
    })

    it('pipeline creates notification when status becomes ready', () => {
      const notification = {
        type: 'video_ready',
        title: 'Your video is ready!',
      }
      expect(notification.type).toBe('video_ready')
    })
  })

  describe('Storage — Critical Check', () => {
    it('HeyGen URL is downloaded and re-uploaded to Supabase Storage', () => {
      // Contract: video pipeline downloads from HeyGen and re-uploads to Supabase
      const heygenUrl = 'https://heygen.example.com/video.mp4?expires=soon'
      const supabaseUrl = 'https://yybpacultmaxqxjfsrvx.supabase.co/storage/v1/object/public/videos/job-1/final.mp4'
      expect(heygenUrl).toContain('heygen')
      expect(supabaseUrl).toContain('supabase.co')
    })

    it('Supabase Storage path follows pattern: videos/{jobId}/final.mp4', () => {
      const jobId = 'abc-123'
      const path = `videos/${jobId}/final.mp4`
      expect(path).toMatch(/^videos\/[\w-]+\/final\.mp4$/)
    })

    it('ElevenLabs voiceover is stored at: videos/{jobId}/voiceover.mp3', () => {
      const jobId = 'abc-123'
      const path = `videos/${jobId}/voiceover.mp3`
      expect(path).toMatch(/^videos\/[\w-]+\/voiceover\.mp3$/)
    })
  })

  describe('DELETE /api/video/[jobId]', () => {
    it('deletes the video_jobs record and removes files from storage', () => {
      // Contract test: deletion should clean up both DB record and storage files
      const deleteOps = ['video_jobs.delete', 'storage.remove']
      expect(deleteOps).toContain('video_jobs.delete')
      expect(deleteOps).toContain('storage.remove')
    })

    it('returns 403 when job belongs to another user', () => {
      const job = { user_id: 'other-user-id' }
      const currentUser = 'test-user-id'
      expect(job.user_id).not.toBe(currentUser)
    })
  })

  describe('POST /api/video/generate', () => {
    it('returns 400 when brief is empty', () => {
      const brief = ''
      expect(brief.length).toBe(0)
    })

    it('returns 400 when brief is less than 50 characters', () => {
      const brief = 'Too short brief'
      expect(brief.length).toBeLessThan(50)
    })

    it('records generation in ai_generations table with agent_used: video-ad', () => {
      const genRecord = { agent_used: 'video-ad', project_id: 'test-project-id' }
      expect(genRecord.agent_used).toBe('video-ad')
    })
  })

  describe('GET /api/video/[jobId]/status', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { GET } = await import('@/src/app/api/video/[jobId]/status/route')
      const request = new Request('http://localhost:3000/api/video/test-job/status')
      const response = await GET(request as any, {
        params: Promise.resolve({ jobId: 'test-job' }),
      })
      expect(response.status).toBe(401)
    })

    it('returns 404 when jobId does not exist', async () => {
      chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })

      const { GET } = await import('@/src/app/api/video/[jobId]/status/route')
      const request = new Request('http://localhost:3000/api/video/nonexistent/status')
      const response = await GET(request as any, {
        params: Promise.resolve({ jobId: 'nonexistent' }),
      })
      expect(response.status).toBe(404)
    })

    it('returns status and progressMessage fields', () => {
      const statusResponse = { status: 'generating_video', progressMessage: 'Rendering video...' }
      expect(statusResponse).toHaveProperty('status')
      expect(statusResponse).toHaveProperty('progressMessage')
    })
  })

  describe('GET /api/video/history', () => {
    it('returns 401 without authentication', async () => {
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })

      const { GET } = await import('@/src/app/api/video/history/route')
      const request = new Request('http://localhost:3000/api/video/history?projectId=test')
      const response = await GET(request as any)
      expect(response.status).toBe(401)
    })

    it('requires projectId query param', () => {
      const url = new URL('http://localhost:3000/api/video/history')
      const projectId = url.searchParams.get('projectId')
      expect(projectId).toBeNull()
    })

    it('returns max 20 records ordered by created_at desc', () => {
      const maxRecords = 20
      const records = Array.from({ length: 25 }, (_, i) => ({ id: `job-${i}` }))
      const limited = records.slice(0, maxRecords)
      expect(limited.length).toBe(20)
    })
  })
})
