"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Globe,
  BarChart3,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";

const PAGE_SIZE = 12;

interface Project {
  id: string;
  name: string;
  website_url: string | null;
  description: string | null;
  created_at: string;
  lastAuditScore: number | null;
  assetsCount: number;
  campaignsCount: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchProjects() {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
      setLoading(false);
    }
    fetchProjects();
  }, []);

  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, projects.length);
  const pageProjects = projects.slice(pageStart, pageEnd);

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage your marketing projects"
      >
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : projects.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageProjects.map((project, i) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card
                  hover
                  className="animate-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <CardContent>
                    <div className="flex items-start justify-between mb-3">
                      <div className="rounded-lg bg-surface-2 p-2">
                        <Globe className="h-5 w-5 text-accent" />
                      </div>
                      {project.lastAuditScore !== null && (
                        <Badge
                          variant={
                            project.lastAuditScore >= 80
                              ? "success"
                              : project.lastAuditScore >= 50
                              ? "warning"
                              : "error"
                          }
                        >
                          SEO: {project.lastAuditScore}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-h3 text-text-primary">{project.name}</h3>
                    <p className="mt-1 text-small text-text-secondary truncate">
                      {project.website_url || "No website connected"}
                    </p>
                    {project.description && (
                      <p className="mt-1 text-small text-text-tertiary truncate">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-small text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3.5 w-3.5" />
                        {project.assetsCount} assets
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {project.campaignsCount} campaigns
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {projects.length > PAGE_SIZE && (
            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-small text-text-tertiary">
                Showing {pageStart + 1}–{pageEnd} of {projects.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-surface-2 px-3 py-1.5 text-small text-text-primary hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <span className="text-small text-text-tertiary font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-surface-2 px-3 py-1.5 text-small text-text-primary hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="border-dashed border-border-strong">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 rounded-xl bg-accent-muted p-4">
              <Globe className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-h2 text-text-primary">No projects yet</h3>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              Create your first project by connecting a website. We&apos;ll
              analyze it and generate your marketing strategy.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Create Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
