import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { AuditReportDocument } from "@/src/lib/pdf/audit-report";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; auditId: string }> }
) {
  const { id, auditId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch audit
  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("*")
    .eq("id", auditId)
    .eq("project_id", id)
    .single();

  if (auditError || !audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  // Fetch project name
  const { data: project } = await supabase
    .from("projects")
    .select("name, website_url")
    .eq("id", id)
    .single();

  const doc = React.createElement(AuditReportDocument, {
    projectName: project?.name || "Project",
    url: audit.url || project?.website_url || "",
    date: new Date(audit.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    score: audit.score ?? 0,
    findings: audit.findings ?? [],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(doc as any);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="conduikt-audit-${auditId.slice(0, 8)}.pdf"`,
    },
  });
}
