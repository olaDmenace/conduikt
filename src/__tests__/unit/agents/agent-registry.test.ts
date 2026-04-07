import { describe, it, expect } from 'vitest'
import {
  AGENT_REGISTRY,
  getAgentDefinition,
  getActiveAgents,
  getAgentsByCategory,
  getAgentsForTier,
} from '@/src/lib/ai/agents/registry'

describe('Agent Registry', () => {
  describe('Registry completeness', () => {
    const expectedActiveAgents = [
      'seo-audit', 'page-cro', 'copywriting', 'social-content',
      'email-sequence', 'content-strategy', 'competitor-analysis',
      'blog-post', 'keyword-research', 'growth-playbook', 'video-ad',
      'campaigns', 'calendar',
    ]

    expectedActiveAgents.forEach((agentId) => {
      it(`${agentId} exists in the registry`, () => {
        const agent = getAgentDefinition(agentId)
        expect(agent).toBeDefined()
      })

      it(`${agentId} has status active`, () => {
        const agent = getAgentDefinition(agentId)!
        expect(agent.status).toBe('active')
      })

      it(`${agentId} has a non-empty name`, () => {
        const agent = getAgentDefinition(agentId)!
        expect(agent.name).toBeTruthy()
        expect(agent.name.length).toBeGreaterThan(0)
      })

      it(`${agentId} has a non-empty description`, () => {
        const agent = getAgentDefinition(agentId)!
        expect(agent.description).toBeTruthy()
        expect(agent.description.length).toBeGreaterThan(0)
      })

      it(`${agentId} has a valid route (non-empty string)`, () => {
        const agent = getAgentDefinition(agentId)!
        expect(agent.route).toBeTruthy()
        expect(typeof agent.route).toBe('string')
      })

      it(`${agentId} has a valid tier`, () => {
        const agent = getAgentDefinition(agentId)!
        expect(['free', 'pro', 'growth', 'agency']).toContain(agent.tier)
      })

      it(`${agentId} has a valid category`, () => {
        const agent = getAgentDefinition(agentId)!
        expect(['creation', 'strategy', 'analysis', 'distribution']).toContain(agent.category)
      })
    })
  })

  describe('getAgentDefinition', () => {
    it('returns the correct agent for a valid id', () => {
      const agent = getAgentDefinition('copywriting')
      expect(agent).toBeDefined()
      expect(agent!.id).toBe('copywriting')
      expect(agent!.name).toContain('Copywriting')
    })

    it('returns undefined for an unknown id', () => {
      const agent = getAgentDefinition('nonexistent-agent-xyz')
      expect(agent).toBeUndefined()
    })

    it('is case-sensitive (seo-AUDIT returns undefined)', () => {
      const agent = getAgentDefinition('seo-AUDIT')
      expect(agent).toBeUndefined()
    })
  })

  describe('getActiveAgents', () => {
    it('returns only agents with status: active', () => {
      const active = getActiveAgents()
      active.forEach((agent) => {
        expect(agent.status).toBe('active')
      })
    })

    it('does not include coming_soon agents', () => {
      const active = getActiveAgents()
      const comingSoon = active.filter((a) => a.status === 'coming_soon')
      expect(comingSoon).toHaveLength(0)
    })

    it('video-ad is included (status was changed from coming_soon to active)', () => {
      const active = getActiveAgents()
      const videoAd = active.find((a) => a.id === 'video-ad')
      expect(videoAd).toBeDefined()
      expect(videoAd!.status).toBe('active')
    })
  })

  describe('getAgentsForTier', () => {
    it('free tier returns only agents with tier: free', () => {
      const freeAgents = getAgentsForTier('free')
      freeAgents.forEach((agent) => {
        expect(agent.tier).toBe('free')
      })
    })

    it('pro tier returns free + pro agents', () => {
      const proAgents = getAgentsForTier('pro')
      const freeAgents = getAgentsForTier('free')
      expect(proAgents.length).toBeGreaterThan(freeAgents.length)
      proAgents.forEach((agent) => {
        expect(['free', 'pro']).toContain(agent.tier)
      })
    })

    it('growth tier returns free + pro + growth agents', () => {
      const growthAgents = getAgentsForTier('growth')
      const proAgents = getAgentsForTier('pro')
      expect(growthAgents.length).toBeGreaterThan(proAgents.length)
      growthAgents.forEach((agent) => {
        expect(['free', 'pro', 'growth']).toContain(agent.tier)
      })
    })

    it('agency tier returns all agents', () => {
      const agencyAgents = getAgentsForTier('agency')
      expect(agencyAgents.length).toBe(AGENT_REGISTRY.length)
    })

    it('video-ad is only available for growth and agency', () => {
      const videoAd = getAgentDefinition('video-ad')!
      expect(videoAd.tier).toBe('growth')

      const freeAgents = getAgentsForTier('free')
      const proAgents = getAgentsForTier('pro')
      const growthAgents = getAgentsForTier('growth')

      expect(freeAgents.find((a) => a.id === 'video-ad')).toBeUndefined()
      expect(proAgents.find((a) => a.id === 'video-ad')).toBeUndefined()
      expect(growthAgents.find((a) => a.id === 'video-ad')).toBeDefined()
    })

    it('keyword-research is available on free tier', () => {
      const freeAgents = getAgentsForTier('free')
      expect(freeAgents.find((a) => a.id === 'keyword-research')).toBeDefined()
    })
  })

  describe('getAgentsByCategory', () => {
    it('returns only agents matching the requested category', () => {
      const analysisAgents = getAgentsByCategory('analysis')
      analysisAgents.forEach((agent) => {
        expect(agent.category).toBe('analysis')
      })
    })

    it('creation category has multiple agents', () => {
      const creationAgents = getAgentsByCategory('creation')
      expect(creationAgents.length).toBeGreaterThan(1)
    })
  })

  describe('Registry invariants', () => {
    it('no two agents have the same id', () => {
      const ids = AGENT_REGISTRY.map((a) => a.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    })

    it('no two agents have the same route', () => {
      const routes = AGENT_REGISTRY.map((a) => a.route)
      const unique = new Set(routes)
      expect(unique.size).toBe(routes.length)
    })

    it('all icon values are non-empty strings', () => {
      AGENT_REGISTRY.forEach((agent) => {
        expect(agent.icon).toBeTruthy()
        expect(typeof agent.icon).toBe('string')
      })
    })

    it('ctaLabel is a non-empty string for every agent', () => {
      AGENT_REGISTRY.forEach((agent) => {
        expect(agent.ctaLabel).toBeTruthy()
        expect(typeof agent.ctaLabel).toBe('string')
        expect(agent.ctaLabel.length).toBeGreaterThan(0)
      })
    })
  })
})
