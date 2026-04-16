import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";
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

  const ownedProject = await verifyProjectOwnership(supabase, id, user.id);
  if (!ownedProject) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  // Fetch project with branding fields
  const { data: project } = await supabase
    .from("projects")
    .select("name, website_url, client_name, client_logo_url, report_accent_color")
    .eq("id", id)
    .single();

  // Fetch agency name from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, plan")
    .eq("id", user.id)
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
    branding: profile?.plan === "agency" ? {
      clientName: project?.client_name,
      clientLogoUrl: project?.client_logo_url,
      reportAccentColor: project?.report_accent_color,
      agencyName: profile?.full_name,
    } : undefined,
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
