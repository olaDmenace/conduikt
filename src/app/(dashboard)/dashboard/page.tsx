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
} from "lucide-react";
import Link from "next/link";
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
}

const quickActions = [
  {
    title: "Run SEO Audit",
    description: "Analyze your site for technical and on-page SEO issues",
    icon: BarChart3,
    href: "/projects/new",
    color: "text-accent",
  },
  {
    title: "Generate Social Posts",
    description: "Create a week of content for X and LinkedIn",
    icon: Twitter,
    href: "/playground",
    color: "text-info",
  },
  {
    title: "Create Email Sequence",
    description: "Build an automated email flow for your audience",
    icon: Mail,
    href: "/playground",
    color: "text-success",
  },
  {
    title: "Optimize Landing Page",
    description: "Get CRO recommendations to improve conversions",
    icon: ArrowUpRight,
    href: "/playground",
    color: "text-warning",
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

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

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your AI marketing command center"
      >
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </Button>
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
            <Button variant="secondary" size="sm" className="ml-auto" asChild>
              <Link href="/projects">View Projects</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-h2 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quickActions.map((action, i) => (
            <Link key={action.title} href={action.href}>
              <Card
                hover
                className="animate-in"
                style={{ animationDelay: `${(i + 4) * 60}ms` }}
              >
                <CardContent className="flex items-start gap-4">
                  <div className="rounded-lg bg-surface-2 p-3">
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <div>
                    <h3 className="text-h3 text-text-primary">{action.title}</h3>
                    <p className="mt-1 text-small text-text-secondary">
                      {action.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Empty State — only show if no projects */}
      {stats && stats.projectCount === 0 && (
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
              content generation, and multi-channel publishing.
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
