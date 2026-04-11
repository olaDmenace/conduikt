export interface AgentDefinition {
  id: string;
  name: string;       // Full name: "SEO Audit Agent"
  shortName: string;  // Sidebar label: "SEO Audit"
  icon: string;       // Lucide icon component name
  description: string;
  status: "active" | "coming_soon";
  tier: "free" | "pro" | "growth" | "agency";
  category: "analysis" | "creation" | "strategy" | "distribution";
  ctaLabel: string;   // Button text: "Run Audit"
  route: string;      // Global URL slug: /agents/{route}
  // In-project path suffix, appended to /projects/{id}/. May include query strings
  // (e.g. "content?skill=copywriting"). Defaults to `route` when omitted.
  projectPath?: string;
}

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: "seo-audit",
    name: "SEO Audit Agent",
    shortName: "SEO Audit",
    icon: "Search",
    description: "Audit your site and get actionable SEO fixes",
    status: "active",
    tier: "free",
    category: "analysis",
    ctaLabel: "Run Audit",
    route: "seo-audit",
    projectPath: "audit",
  },
  {
    id: "page-cro",
    name: "CRO Agent",
    shortName: "CRO",
    icon: "Target",
    description: "Optimize landing pages for higher conversion",
    status: "active",
    tier: "free",
    category: "analysis",
    ctaLabel: "Analyze Page",
    route: "cro",
    projectPath: "content?skill=page-cro",
  },
  {
    id: "copywriting",
    name: "Copywriting Agent",
    shortName: "Copywriting",
    icon: "PenTool",
    description: "Generate conversion-focused marketing copy",
    status: "active",
    tier: "free",
    category: "creation",
    ctaLabel: "Create Copy",
    route: "copywriting",
    projectPath: "content?skill=copywriting",
  },
  {
    id: "social-content",
    name: "Social Agent",
    shortName: "Social",
    icon: "Smartphone",
    description: "Create platform-optimized social posts",
    status: "active",
    tier: "free",
    category: "creation",
    ctaLabel: "Create Post",
    route: "social",
    projectPath: "content?skill=social-content",
  },
  {
    id: "email-sequence",
    name: "Email Agent",
    shortName: "Email",
    icon: "Mail",
    description: "Build automated email sequences",
    status: "active",
    tier: "pro",
    category: "creation",
    ctaLabel: "Build Sequence",
    route: "email",
    projectPath: "content?skill=email-sequence",
  },
  {
    id: "content-strategy",
    name: "Strategy Agent",
    shortName: "Strategy",
    icon: "Map",
    description: "Plan your content calendar and topics",
    status: "active",
    tier: "pro",
    category: "strategy",
    ctaLabel: "Plan Content",
    route: "strategy",
    projectPath: "content?skill=content-strategy",
  },
  {
    id: "competitor-analysis",
    name: "Competitor Intel Agent",
    shortName: "Competitor Intel",
    icon: "Flag",
    description: "One-shot AI analysis of competitor positioning and content gaps",
    status: "active",
    tier: "pro",
    category: "analysis",
    ctaLabel: "Analyze",
    route: "competitor",
    projectPath: "content?skill=competitor-analysis",
  },
  {
    id: "blog-post",
    name: "Blog Agent",
    shortName: "Blog",
    icon: "FileText",
    description: "Write SEO-optimized long-form blog posts",
    status: "active",
    tier: "pro",
    category: "creation",
    ctaLabel: "Write Post",
    route: "blog",
  },
  {
    id: "keyword-research",
    name: "Keyword Agent",
    shortName: "Keywords",
    icon: "Key",
    description: "Discover and score keyword opportunities",
    status: "active",
    tier: "free",
    category: "strategy",
    ctaLabel: "Research",
    route: "keywords",
  },
  {
    id: "growth-playbook",
    name: "Growth Agent",
    shortName: "Growth",
    icon: "TrendingUp",
    description: "Get a prioritized, data-driven marketing plan",
    status: "active",
    tier: "growth",
    category: "strategy",
    ctaLabel: "View Playbook",
    route: "growth",
  },
  {
    id: "campaigns",
    name: "Campaign Agent",
    shortName: "Campaigns",
    icon: "Zap",
    description: "Orchestrate multi-step marketing campaigns",
    status: "active",
    tier: "pro",
    category: "distribution",
    ctaLabel: "Build Campaign",
    route: "campaigns",
  },
  {
    id: "calendar",
    name: "Calendar Agent",
    shortName: "Calendar",
    icon: "Calendar",
    description: "Schedule and manage content publishing",
    status: "active",
    tier: "pro",
    category: "distribution",
    ctaLabel: "View Calendar",
    route: "calendar",
  },
  {
    id: "video-ad",
    name: "Video Ad Agent",
    shortName: "Video Ads",
    icon: "Video",
    description: "Generate short-form video ads with an AI presenter",
    status: "active",
    tier: "growth",
    category: "creation",
    ctaLabel: "Create Video",
    route: "video",
  },
  {
    id: "ab-test-setup",
    name: "A/B Test Agent",
    shortName: "A/B Tests",
    icon: "GitBranch",
    description: "Generate and compare content variants to find what resonates with your audience",
    status: "active",
    tier: "growth",
    category: "analysis",
    ctaLabel: "Create Test",
    route: "ab-test",
    projectPath: "agents/ab-test",
  },
];

export function getAgentDefinition(id: string): AgentDefinition | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}

export function getActiveAgents(): AgentDefinition[] {
  return AGENT_REGISTRY.filter((a) => a.status === "active");
}

export function getAgentsByCategory(
  category: AgentDefinition["category"]
): AgentDefinition[] {
  return AGENT_REGISTRY.filter((a) => a.category === category);
}

export function getAgentsForTier(tier: string): AgentDefinition[] {
  const tierOrder = ["free", "pro", "growth", "agency"];
  const tierIndex = tierOrder.indexOf(tier);
  return AGENT_REGISTRY.filter(
    (a) => tierOrder.indexOf(a.tier) <= tierIndex
  );
}
