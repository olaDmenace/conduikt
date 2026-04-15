"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  FileBarChart,
  Loader2,
  Download,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
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
      toast("Failed to generate report", "error");
    }
    setDownloading(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Client Reports"
        description="Generate white-label PDF reports for your clients"
      />

      {audits.length === 0 ? (
        <Card className="border-dashed border-border-strong">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-text-tertiary mb-4" />
            <h3 className="text-h2 text-text-primary">No audits to report on</h3>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              Run an SEO audit first, then come back here to generate a
              white-label PDF report for your client.
            </p>
            <Button className="mt-6" asChild>
              <Link href={`/projects/${projectId}/audit`}>Go to Audit</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-small text-text-secondary mb-4">
            Select an audit to download as a white-label PDF. To customise branding
            (client name, logo, accent colour), update your{" "}
            <Link
              href={`/projects/${projectId}/settings`}
              className="text-accent hover:text-accent-hover transition-colors"
            >
              project settings
            </Link>
            .
          </p>
          {audits.map((audit, i) => {
            const scoreColor =
              (audit.score ?? 0) >= 80
                ? "text-success"
                : (audit.score ?? 0) >= 50
                  ? "text-warning"
                  : "text-error";
            return (
              <Card
                key={audit.id}
                className="animate-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <FileBarChart className="h-5 w-5 text-accent shrink-0" />
                    <div>
                      <p className="text-body font-medium text-text-primary">
                        {audit.type.toUpperCase()} Audit —{" "}
                        <span className={scoreColor}>
                          {audit.score ?? "N/A"}
                        </span>
                      </p>
                      <p className="text-small text-text-tertiary">
                        {new Date(audit.created_at).toLocaleDateString()} — {audit.url}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={downloading === audit.id}
                    onClick={() => handleDownload(audit.id)}
                  >
                    {downloading === audit.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
