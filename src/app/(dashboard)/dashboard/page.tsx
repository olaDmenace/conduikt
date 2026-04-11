"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Zap,
  FileText,
  ArrowUpRight,
  Plus,
  Globe,
  Mail,
  Twitter,
  Loader2,
  Search,
  PenLine,
  Rocket,
  Sparkles,
  Video,
  Target,
  Flag,
  Calendar,
  GitBranch,
  User,
} from "lucide-react";
import Link from "next/link";
import { OnboardingTour } from "@/src/components/onboarding/onboarding-tour";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";

interface DashboardStats {
  projectCount: number;
  assetCount: number;
  publishedCount: number;
  generationsLeft: number;
  generationCount: number;
  generationLimit: number;
  latestAuditScore: number | null;
  plan: string;
  latestProjectId: string | null;
  onboardingCompleted: boolean;
  userEmail: string;
  userName: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (!data.onboardingCompleted) {
          setShowOnboarding(true);
        }
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  const pid = stats?.latestProjectId;

  const statCards = [
    {
      label: "Active Projects",
      value: stats?.projectCount ?? "—",
      icon: Globe,
    },
    {
      label: "Content Generated",
      value: stats?.assetCount ?? "—",
      icon: FileText,
    },
    {
      label: "AI Generations Used",
      value:
        stats != null
          ? `${stats.generationCount}/${stats.generationLimit}`
          : "—",
      icon: TrendingUp,
    },
    {
      label: "Generations Left",
      value: stats?.generationsLeft ?? "—",
      badge:
        stats && stats.generationsLeft <= 1
          ? { text: "Upgrade", variant: "warning" as const }
          : stats && stats.plan !== "free"
          ? { text: stats.plan, variant: "success" as const }
          : null,
      icon: Zap,
    },
  ];

  // Quick actions — project-aware when a project exists
  const quickActions = pid
    ? [
        {
          title: "Blog Post Generator",
          description: "Write SEO-optimized long-form posts with meta tags and social snippets",
          icon: PenLine,
          href: `/projects/${pid}/blog`,
          color: "text-accent",
        },
        {
          title: "Keyword Research",
          description: "Discover keyword clusters, long-tail opportunities, and content gaps",
          icon: Search,
          href: `/projects/${pid}/keywords`,
          color: "text-info",
        },
        {
          title: "Growth Playbook",
          description: "Generate your 90-day AI-powered growth plan with prioritised actions",
          icon: Rocket,
          href: `/projects/${pid}/growth`,
          color: "text-success",
        },
        {
          title: "Content Studio",
          description: "Create social posts, emails, copy, and more with 10 AI skills",
          icon: Sparkles,
          href: `/projects/${pid}/content`,
          color: "text-warning",
        },
      ]
    : [
        {
          title: "Create a Project",
          description: "Connect your first website to unlock all AI marketing tools",
          icon: Plus,
          href: "/projects/new",
          color: "text-accent",
        },
        {
          title: "AI Playground",
          description: "Try all AI skills without a project context",
          icon: Sparkles,
          href: "/playground",
          color: "text-info",
        },
        {
          title: "View Pricing",
          description: "Upgrade your plan to unlock unlimited AI generations",
          icon: Zap,
          href: "/pricing",
          color: "text-warning",
        },
        {
          title: "Connect Integrations",
          description: "Link X, LinkedIn, and Google Search Console",
          icon: Globe,
          href: "/settings/integrations",
          color: "text-success",
        },
      ];

  // All platform tools — shown as a reference grid when projects exist
  const allTools = pid
    ? [
        { name: "SEO Audit",         href: `/projects/${pid}/audit`,       icon: BarChart3,  desc: "Technical & on-page analysis"           },
        { name: "CRO Analysis",     href: `/projects/${pid}/content?skill=page-cro`, icon: Target, desc: "Conversion rate optimization"     },
        { name: "Content Studio",    href: `/projects/${pid}/content`,   icon: Sparkles,   desc: "10 AI skills for all channels"           },
        { name: "Blog Generator",    href: `/projects/${pid}/blog`,      icon: PenLine,    desc: "SEO posts with meta & social snippets"   },
        { name: "Keyword Research",  href: `/projects/${pid}/keywords`,  icon: Search,     desc: "Clusters, long-tail & question keywords" },
        { name: "Growth Playbook",   href: `/projects/${pid}/growth`,    icon: Rocket,     desc: "90-day AI-powered growth plan"           },
        { name: "Competitors",       href: `/projects/${pid}/competitors`, icon: Flag,     desc: "Analyze positioning & gaps"              },
        { name: "Campaigns",         href: `/projects/${pid}/campaigns`, icon: Zap,        desc: "Multi-step marketing automation"         },
        { name: "Calendar",          href: `/projects/${pid}/calendar`,  icon: Calendar,   desc: "Schedule & manage publishing"            },
        { name: "Analytics",         href: `/projects/${pid}/analytics`, icon: TrendingUp, desc: "Impact dashboard & skill usage"          },
        { name: "Email Sequence",    href: `/projects/${pid}/content?skill=email-sequence`, icon: Mail, desc: "AI-written drip campaigns"  },
        { name: "Social Content",    href: `/projects/${pid}/content?skill=social-content`, icon: Twitter, desc: "X and LinkedIn post generation" },
        { name: "Video Ads",         href: `/projects/${pid}/video`,     icon: Video,      desc: "AI presenter video ads via HeyGen"       },
        { name: "A/B Tests",         href: `/projects/${pid}/ab-test`,   icon: GitBranch,  desc: "Compare content variants"                },
      ]
    : [];

  return (
    <div>
      {showOnboarding && (
        <OnboardingTour onComplete={() => setShowOnboarding(false)} />
      )}
      <PageHeader
        title={stats?.userName ? `Welcome, ${stats.userName.split(" ")[0]}` : "Dashboard"}
        description="Your AI marketing command center"
      >
        <div className="flex items-center gap-3">
          {stats && (
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5">
              <User className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-small text-text-secondary">{stats.userEmail}</span>
              <Badge variant={stats.plan === "free" ? "secondary" : "success"} className="ml-1">
                {stats.plan}
              </Badge>
            </div>
          )}
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat, i) => (
          <Card
            key={stat.label}
            className="animate-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CardContent className="flex items-start justify-between">
              <div>
                <p className="text-caption text-text-tertiary">{stat.label}</p>
                {loading ? (
                  <div className="mt-2">
                    <div className="h-7 w-12 rounded bg-surface-2 animate-pulse" />
                  </div>
                ) : (
                  <p className="mt-1 text-2xl font-semibold text-text-primary font-mono">
                    {stat.value}
                  </p>
                )}
                {stat.badge && (
                  <Badge variant={stat.badge.variant} className="mt-2">
                    {stat.badge.text}
                  </Badge>
                )}
              </div>
              <div className="rounded-lg bg-surface-2 p-2">
                <stat.icon className="h-5 w-5 text-accent" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Latest Audit Score */}
      {stats?.latestAuditScore != null && (
        <Card className="mb-8 animate-in" style={{ animationDelay: "240ms" }}>
          <CardContent className="flex items-center gap-6 py-6">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${
                stats.latestAuditScore >= 80
                  ? "bg-success/10 border-success/30"
                  : stats.latestAuditScore >= 50
                  ? "bg-warning/10 border-warning/30"
                  : "bg-error/10 border-error/30"
              }`}
            >
              <span
                className={`text-xl font-mono font-bold ${
                  stats.latestAuditScore >= 80
                    ? "text-success"
                    : stats.latestAuditScore >= 50
                    ? "text-warning"
                    : "text-error"
                }`}
              >
                {stats.latestAuditScore}
              </span>
            </div>
            <div>
              <p className="text-body font-medium text-text-primary">
                Latest SEO Audit Score
              </p>
              <p className="text-small text-text-secondary">
                {stats.latestAuditScore >= 80
                  ? "Great job! Your site is well optimized."
                  : stats.latestAuditScore >= 50
                  ? "Room for improvement — check your audit for details."
                  : "Needs attention — several critical issues found."}
              </p>
            </div>
            {pid && (
              <Button variant="secondary" size="sm" className="ml-auto" asChild>
                <Link href={`/projects/${pid}/audit`}>View Audit</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-h2 mb-4">
          {loading ? "Quick Actions" : pid ? "Jump Back In" : "Get Started"}
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-surface-2 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {quickActions.map((action, i) => (
              <Link key={action.title} href={action.href}>
                <Card
                  hover
                  className="animate-in"
                  style={{ animationDelay: `${(i + 4) * 60}ms` }}
                >
                  <CardContent className="flex items-start gap-4">
                    <div className="rounded-lg bg-surface-2 p-3 shrink-0">
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-h3 text-text-primary">{action.title}</h3>
                      <p className="mt-1 text-small text-text-secondary">
                        {action.description}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-text-tertiary shrink-0 mt-1 ml-auto" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* All Tools grid — only when a project exists */}
      {!loading && allTools.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h2">All Tools</h2>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/projects">
                All Projects <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {allTools.map((tool, i) => (
              <Link key={tool.name} href={tool.href}>
                <Card
                  hover
                  className="animate-in h-full"
                  style={{ animationDelay: `${(i + 8) * 40}ms` }}
                >
                  <CardContent className="py-4 flex flex-col items-start gap-2">
                    <div className="rounded-lg bg-surface-2 p-2">
                      <tool.icon className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-small font-medium text-text-primary leading-tight">{tool.name}</p>
                      <p className="text-caption text-text-tertiary mt-0.5 leading-snug">{tool.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State — only show if no projects */}
      {!loading && stats && stats.projectCount === 0 && (
        <Card
          className="animate-in border-dashed border-border-strong"
          style={{ animationDelay: "480ms" }}
        >
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 rounded-xl bg-accent-muted p-4">
              <Zap className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-h2 text-text-primary">
              Get started with Conduikt
            </h3>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              Connect your first website to unlock AI-powered SEO audits,
              blog generation, keyword research, growth playbooks, and multi-channel publishing.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Create Your First Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
