import { describe, it, expect } from 'vitest'
import { emailSequenceSkill } from '@/src/lib/ai/agents/email-sequence'
import {
  mockProjectContext,
  rawJsonResponse,
  wrappedJsonResponse,
} from '../../helpers/agent-test-helper'

const mockEmailResponse = {
  sequence_name: 'Welcome Series',
  type: 'welcome',
  trigger: 'User signs up',
  emails: [
    {
      step: 1,
      delay_hours: 0,
      subject_line: 'Welcome to TestCo — here is what to do first',
      preview_text: 'You just made a great decision...',
      body_html: '<h1>Welcome!</h1><p>Thanks for joining...</p>',
      cta_text: 'Get Started',
      cta_url: 'https://testco.com/dashboard',
      goal: 'Activate new user',
    },
    {
      step: 2,
      delay_hours: 48,
      subject_line: 'Your first win with TestCo',
      preview_text: 'Quick tip to get started...',
      body_html: '<h1>Quick tip</h1><p>Here is how to...</p>',
      cta_text: 'Try it now',
      cta_url: 'https://testco.com/features',
      goal: 'Drive first action',
    },
  ],
  exit_conditions: ['User completes onboarding', 'User unsubscribes'],
}

describe('Email Sequence Agent', () => {
  describe('parseResponse', () => {
    it('parses sequence_name field', () => {
      const result = emailSequenceSkill.parseResponse(rawJsonResponse(mockEmailResponse))
      expect((result.data as any).sequence_name).toBe('Welcome Series')
    })

    it('parses emails array with correct structure', () => {
      const result = emailSequenceSkill.parseResponse(rawJsonResponse(mockEmailResponse))
      expect((result.data as any).emails).toHaveLength(2)
    })

    it('each email has: step, subject_line, body_html, delay_hours', () => {
      const result = emailSequenceSkill.parseResponse(rawJsonResponse(mockEmailResponse))
      const emails = (result.data as any).emails
      emails.forEach((email: any) => {
        expect(email).toHaveProperty('step')
        expect(email).toHaveProperty('subject_line')
        expect(email).toHaveProperty('body_html')
        expect(email).toHaveProperty('delay_hours')
      })
    })

    it('step values are sequential integers starting at 1', () => {
      const result = emailSequenceSkill.parseResponse(rawJsonResponse(mockEmailResponse))
      const emails = (result.data as any).emails
      emails.forEach((email: any, i: number) => {
        expect(email.step).toBe(i + 1)
      })
    })

    it('delay_hours is a non-negative number', () => {
      const result = emailSequenceSkill.parseResponse(rawJsonResponse(mockEmailResponse))
      const emails = (result.data as any).emails
      emails.forEach((email: any) => {
        expect(email.delay_hours).toBeGreaterThanOrEqual(0)
      })
    })

    it('subject_line is a non-empty string', () => {
      const result = emailSequenceSkill.parseResponse(rawJsonResponse(mockEmailResponse))
      const emails = (result.data as any).emails
      emails.forEach((email: any) => {
        expect(email.subject_line).toBeTruthy()
        expect(typeof email.subject_line).toBe('string')
      })
    })

    it('body_html is a non-empty string', () => {
      const result = emailSequenceSkill.parseResponse(rawJsonResponse(mockEmailResponse))
      const emails = (result.data as any).emails
      emails.forEach((email: any) => {
        expect(email.body_html).toBeTruthy()
      })
    })

    it('handles sequence with 1 email', () => {
      const oneEmail = { ...mockEmailResponse, emails: [mockEmailResponse.emails[0]] }
      const result = emailSequenceSkill.parseResponse(rawJsonResponse(oneEmail))
      expect((result.data as any).emails).toHaveLength(1)
    })

    it('handles sequence with 7 emails', () => {
      const sevenEmails = {
        ...mockEmailResponse,
        emails: Array.from({ length: 7 }, (_, i) => ({
          ...mockEmailResponse.emails[0],
          step: i + 1,
          delay_hours: i * 24,
        })),
      }
      const result = emailSequenceSkill.parseResponse(rawJsonResponse(sevenEmails))
      expect((result.data as any).emails).toHaveLength(7)
    })

    it('throws when response has no valid JSON', () => {
      expect(() => emailSequenceSkill.parseResponse('not json')).toThrow()
    })

    it('handles wrapped JSON response', () => {
      const result = emailSequenceSkill.parseResponse(wrappedJsonResponse(mockEmailResponse))
      expect(result.type).toBe('email_sequence')
    })
  })

  describe('buildUserPrompt', () => {
    it('includes sequenceType from input', () => {
      const prompt = emailSequenceSkill.buildUserPrompt({ type: 'nurture' })
      expect(prompt).toContain('nurture')
    })

    it('includes email count from input', () => {
      const prompt = emailSequenceSkill.buildUserPrompt({ count: 7 })
      expect(prompt).toContain('7')
    })

    it('includes goal from input', () => {
      const prompt = emailSequenceSkill.buildUserPrompt({ goal: 'Drive feature adoption' })
      expect(prompt).toContain('Drive feature adoption')
    })
  })

  describe('buildSystemPrompt', () => {
    it('includes value proposition when provided', () => {
      const prompt = emailSequenceSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('Automates repetitive engineering tasks')
    })

    it('includes performance context when provided', () => {
      const prompt = emailSequenceSkill.buildSystemPrompt(mockProjectContext)
      expect(prompt).toContain('dark mode')
    })
  })
})
