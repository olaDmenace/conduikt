"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  FileBarChart,
  Download,
  AlertTriangle,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/src/components/ui/skeleton";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

interface AuditSummary {
  id: string;
  score: number | null;
  type: string;
  url: string;
  created_at: string;
}

export default function ClientReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/projects/${projectId}/audits`);
      if (res.ok) setAudits(await res.json());
      setLoading(false);
    }
    load();
  }, [projectId]);

  async function handleDownload(auditId: string) {
    setDownloading(auditId);
    const res = await fetch(
      `/api/projects/${projectId}/audits/${auditId}/pdf`
    );
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `client-report-${auditId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast("Couldn't make the report. Try again.", "error");
    }
    setDownloading(null);
  }

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Client Reports"
        description="Reports you can send to clients, with your branding instead of ours."
      />

      {audits.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Nothing to report on yet. Check your client's site first, then come back to download a report."
          action={
            <Button asChild>
              <Link href={`/projects/${projectId}/audit`}>Check the site</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="mb-4 text-body-s text-text-2">
            Pick a site check to download as a PDF with your branding. To change the
            client name, logo or colour, update your{" "}
            <Link
              href={`/projects/${projectId}/settings`}
              className="hover-link text-accent transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:text-accent-hover"
            >
              project settings
            </Link>
            .
          </p>
          {audits.map((audit, i) => {
            const scoreColor =
              (audit.score ?? 0) >= 80
                ? "text-teal"
                : (audit.score ?? 0) >= 50
                  ? "text-accent"
                  : "text-danger";
            return (
              <Card
                key={audit.id}
                className="animate-in flex flex-wrap items-center justify-between gap-3"
                style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}
              >
                  <div className="flex min-w-0 items-center gap-4">
                    <FileBarChart className="h-5 w-5 shrink-0 text-text-3" />
                    <div className="min-w-0">
                      <p className="text-title text-text">
                        Site check ·{" "}
                        {audit.score != null ? (
                          <span className={scoreColor}>
                            {audit.score} out of 100
                          </span>
                        ) : (
                          <span className="text-text-3">No score</span>
                        )}
                      </p>
                      <p className="truncate text-body-s text-text-3">
                        {new Date(audit.created_at).toLocaleDateString()} · {audit.url}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={downloading === audit.id}
                    onClick={() => handleDownload(audit.id)}
                  >
                    {downloading !== audit.id && <Download className="h-4 w-4" />}
                    {downloading === audit.id ? "Preparing…" : "Download PDF"}
                  </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
