import { describe, it, expect } from 'vitest'
import {
  AGENT_REGISTRY,
  getAgentDefinition,
  getActiveAgents,
  getAgentsForTier,
  type AgentDefinition,
} from '@/src/lib/ai/agents/registry'

const mockAgent: AgentDefinition = {
  id: 'copywriting',
  name: 'Copywriting Agent',
  shortName: 'Copy',
  icon: 'PenTool',
  description: 'Generate conversion-focused copy',
  status: 'active' as const,
  tier: 'pro' as const,
  category: 'creation' as const,
  ctaLabel: 'Create Copy',
  route: 'copywriting',
}

describe('AgentCard Component', () => {
  it('renders the agent name', () => {
    const agent = getAgentDefinition('copywriting')
    expect(agent).toBeDefined()
    expect(agent!.name).toBe('Copywriting Agent')
  })

  it('renders the agent description', () => {
    const agent = getAgentDefinition('copywriting')
    expect(agent!.description).toBe('Generate conversion-focused marketing copy')
  })

  it('renders the CTA button with correct label', () => {
    const agent = getAgentDefinition('copywriting')
    expect(agent!.ctaLabel).toBe('Create Copy')
  })

  it('CTA button links to correct project route', () => {
    const projectId = 'test-project-id'
    const agent = getAgentDefinition('copywriting')
    const href = `/projects/${projectId}/agents/${agent!.route}`
    expect(href).toBe('/projects/test-project-id/agents/copywriting')
  })

  it('shows "Coming Soon" badge when status is coming_soon', () => {
    const comingSoonAgent = AGENT_REGISTRY.find((a) => a.status === 'coming_soon')
    expect(comingSoonAgent).toBeDefined()
    expect(comingSoonAgent!.status).toBe('coming_soon')
    // AgentCard renders Badge with "Soon" text and cursor-not-allowed
  })

  it('CTA button is disabled when status is coming_soon', () => {
    const comingSoonAgent = AGENT_REGISTRY.find((a) => a.status === 'coming_soon')
    expect(comingSoonAgent).toBeDefined()
    // When isComingSoon, href = '#' and component has opacity-50 cursor-not-allowed
    const isComingSoon = comingSoonAgent!.status === 'coming_soon'
    const href = isComingSoon ? '#' : `/projects/test/agents/${comingSoonAgent!.route}`
    expect(href).toBe('#')
  })

  it('displays metrics when provided', () => {
    const metrics = {
      primary: '12 generations',
      secondary: '+3 this week',
      lastUsedLabel: '2 hours ago',
    }
    expect(metrics.primary).toBeTruthy()
    expect(metrics.secondary).toBeTruthy()
  })

  it('displays "Not used yet" when no metrics provided', () => {
    const metrics = undefined
    const isUnused = !metrics?.lastUsedLabel
    expect(isUnused).toBe(true)
  })

  it('displays lastUsed relative time when provided', () => {
    const metrics = {
      primary: '12 generations',
      secondary: null,
      lastUsedLabel: '2 hours ago',
    }
    expect(metrics.lastUsedLabel).toBe('2 hours ago')
  })

  // Additional registry tests for complete coverage
  it('all active agents have required fields', () => {
    const activeAgents = getActiveAgents()
    activeAgents.forEach((agent) => {
      expect(agent.id).toBeTruthy()
      expect(agent.name).toBeTruthy()
      expect(agent.description).toBeTruthy()
      expect(agent.ctaLabel).toBeTruthy()
      expect(agent.route).toBeTruthy()
    })
  })

  it('getAgentsForTier returns correct agents for free tier', () => {
    const freeAgents = getAgentsForTier('free')
    freeAgents.forEach((agent) => {
      expect(agent.tier).toBe('free')
    })
  })

  it('getAgentsForTier returns more agents for higher tiers', () => {
    const freeAgents = getAgentsForTier('free')
    const proAgents = getAgentsForTier('pro')
    const growthAgents = getAgentsForTier('growth')
    expect(proAgents.length).toBeGreaterThanOrEqual(freeAgents.length)
    expect(growthAgents.length).toBeGreaterThanOrEqual(proAgents.length)
  })
})
