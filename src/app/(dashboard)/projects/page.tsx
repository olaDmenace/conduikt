"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Globe,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "@/src/components/ui/lucide-icons";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
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
            New project
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-label="Loading projects"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
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
                      <Globe className="h-5 w-5 text-text-3" />
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
                          Site score {project.lastAuditScore}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-title text-text">{project.name}</h3>
                    <p className="mt-1 text-body-s text-text-2 truncate">
                      {project.website_url || "No website connected"}
                    </p>
                    {project.description && (
                      <p className="mt-1 text-body-s text-text-3 truncate">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-caption text-text-3">
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
              <p className="text-body-s text-text-3">
                Showing {pageStart + 1}–{pageEnd} of {projects.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-3 text-body-s text-text transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <span className="text-body-s text-text-3 font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-3 text-body-s text-text transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Globe className="h-8 w-8" />}
          title="No projects yet. Add your website and we'll check it and plan your marketing."
          action={
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Create project
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
